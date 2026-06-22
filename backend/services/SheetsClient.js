const { google } = require('googleapis');
const path = require('path');

const SHEET_ID = process.env.SHEET_ID;
const EXPENSES_TAB = 'Expenses';
const CATEGORIES_TAB = 'Categories';

// Columns in the Expenses tab, in order. Keeping this as a single source of
// truth so range strings and row-building stay in sync.
const EXPENSE_COLUMNS = ['Date', 'Amount', 'Category', 'Remarks', 'Timestamp', 'PaymentMode'];
const CATEGORY_COLUMNS = ['Name'];

let sheetsClientPromise = null;

/**
 * Lazily creates and caches an authenticated Sheets API client.
 * Uses a service account key file referenced by GOOGLE_APPLICATION_CREDENTIALS.
 */
function getSheetsClient() {
  if (!sheetsClientPromise) {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS || './config/credentials.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    sheetsClientPromise = auth.getClient().then((authClient) =>
      google.sheets({ version: 'v4', auth: authClient })
    );
  }
  return sheetsClientPromise;
}

/**
 * Ensures the Expenses and Categories tabs exist with header rows.
 * Safe to call on every server start - it only creates what's missing.
 */
async function ensureSheetStructure() {
  const sheets = await getSheetsClient();

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const existingTitles = meta.data.sheets.map((s) => s.properties.title);

  const tabsToCreate = [];
  if (!existingTitles.includes(EXPENSES_TAB)) tabsToCreate.push(EXPENSES_TAB);
  if (!existingTitles.includes(CATEGORIES_TAB)) tabsToCreate.push(CATEGORIES_TAB);

  if (tabsToCreate.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: tabsToCreate.map((title) => ({ addSheet: { properties: { title } } })),
      },
    });
  }

  // Write headers if the first row is empty for either tab.
  const checks = [
    { tab: EXPENSES_TAB, headers: EXPENSE_COLUMNS },
    { tab: CATEGORIES_TAB, headers: CATEGORY_COLUMNS },
  ];

  for (const { tab, headers } of checks) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${tab}!A1:${String.fromCharCode(64 + headers.length)}1`,
    });
    if (!res.data.values || res.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${tab}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] },
      });
    }
  }

  // Seed default categories if the Categories tab has no data rows yet.
  const catRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${CATEGORIES_TAB}!A2:A`,
  });
  if (!catRes.data.values || catRes.data.values.length === 0) {
    const defaults = [
      'Food Delivery', 'Groceries', 'Subscriptions', 'Pharmacy',
      'Pet', 'Baby', 'Transport', 'Utilities', 'Investments', 'Other',
    ];
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${CATEGORIES_TAB}!A2`,
      valueInputOption: 'RAW',
      requestBody: { values: defaults.map((name) => [name]) },
    });
  }

  // Migrate existing Expenses tab: add PaymentMode header in F1 if absent.
  const pmHeader = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${EXPENSES_TAB}!F1`,
  });
  if (!pmHeader.data.values) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${EXPENSES_TAB}!F1`,
      valueInputOption: 'RAW',
      requestBody: { values: [['PaymentMode']] },
    });
  }
}

/**
 * Appends one expense row. Returns the row that was written.
 */
async function addExpense({ date, amount, categories, paymentMode, remarks }) {
  const sheets = await getSheetsClient();
  const timestamp = new Date().toISOString();
  const categoryStr = Array.isArray(categories) ? categories.join(', ') : categories;
  const row = [date, amount, categoryStr, remarks || '', timestamp, paymentMode || ''];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${EXPENSES_TAB}!A:F`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });

  return {
    date, amount,
    categories: Array.isArray(categories) ? categories : [categories],
    paymentMode: paymentMode || '',
    remarks: remarks || '',
    timestamp,
  };
}

/**
 * Reads all expense rows, optionally filtered to a date range (inclusive).
 * Dates are compared as ISO strings (YYYY-MM-DD), which sort correctly.
 */
async function getExpenses({ from, to } = {}) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${EXPENSES_TAB}!A2:F`,
  });

  const rows = res.data.values || [];
  let expenses = rows.map((r, idx) => ({
    rowIndex: idx + 2, // +2 because data starts at row 2 (row 1 is header)
    date: r[0] || '',
    amount: parseFloat(r[1]) || 0,
    categories: (r[2] || '').split(',').map((s) => s.trim()).filter(Boolean),
    remarks: r[3] || '',
    timestamp: r[4] || '',
    paymentMode: r[5] || '',
  }));

  if (from) expenses = expenses.filter((e) => e.date >= from);
  if (to) expenses = expenses.filter((e) => e.date <= to);

  return expenses.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/**
 * Deletes an expense by its row index in the sheet.
 */
async function deleteExpense(rowIndex) {
  const sheets = await getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const sheet = meta.data.sheets.find((s) => s.properties.title === EXPENSES_TAB);
  const sheetId = sheet.properties.sheetId;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1, // API is 0-indexed
              endIndex: rowIndex,
            },
          },
        },
      ],
    },
  });
}

/**
 * Updates an existing expense row in-place.
 */
async function updateExpense(rowIndex, { date, amount, categories, paymentMode, remarks }) {
  const sheets = await getSheetsClient();
  const categoryStr = Array.isArray(categories) ? categories.join(', ') : categories;
  const row = [date, amount, categoryStr, remarks || '', '', paymentMode || ''];
  // Leave Timestamp (column E) blank in the update values so we preserve the original via keep-existing logic.
  // Instead fetch the original timestamp first, then write all 6 columns.
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${EXPENSES_TAB}!E${rowIndex}`,
  });
  const timestamp = existing.data.values?.[0]?.[0] || new Date().toISOString();
  row[4] = timestamp;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${EXPENSES_TAB}!A${rowIndex}:F${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });

  return {
    rowIndex, date, amount,
    categories: Array.isArray(categories) ? categories : [categories],
    paymentMode: paymentMode || '',
    remarks: remarks || '',
    timestamp,
  };
}

/**
 * Returns the list of category names.
 */
async function getCategories() {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${CATEGORIES_TAB}!A2:A`,
  });
  const rows = res.data.values || [];
  return rows.map((r) => r[0]).filter(Boolean);
}

/**
 * Adds a new category if it doesn't already exist (case-insensitive check).
 */
async function addCategory(name) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Category name cannot be empty');

  const existing = await getCategories();
  if (existing.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
    return existing; // no-op, already present
  }

  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${CATEGORIES_TAB}!A:A`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[trimmed]] },
  });

  return [...existing, trimmed];
}

module.exports = {
  ensureSheetStructure,
  addExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
  getCategories,
  addCategory,
};