const { google } = require('googleapis');
const path = require('path');

const SHEET_ID = process.env.SHEET_ID;
const EXPENSES_TAB = 'Expenses';
const CATEGORIES_TAB = 'Categories';
const MERCHANTS_TAB = 'Merchants';

const EXPENSE_COLUMNS = ['Date', 'Amount', 'Category', 'Remarks', 'Timestamp', 'PaymentMode', 'Merchant'];
const CATEGORY_COLUMNS = ['Name'];
const MERCHANT_COLUMNS = ['Name'];

let sheetsClientPromise = null;

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

async function ensureSheetStructure() {
  const sheets = await getSheetsClient();

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const existingTitles = meta.data.sheets.map((s) => s.properties.title);

  const tabsToCreate = [];
  if (!existingTitles.includes(EXPENSES_TAB)) tabsToCreate.push(EXPENSES_TAB);
  if (!existingTitles.includes(CATEGORIES_TAB)) tabsToCreate.push(CATEGORIES_TAB);
  if (!existingTitles.includes(MERCHANTS_TAB)) tabsToCreate.push(MERCHANTS_TAB);

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
    { tab: MERCHANTS_TAB, headers: MERCHANT_COLUMNS },
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

  // Seed default categories if empty.
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

  // Seed default merchants if empty.
  const merchantRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${MERCHANTS_TAB}!A2:A`,
  });
  if (!merchantRes.data.values || merchantRes.data.values.length === 0) {
    const defaultMerchants = [
      'Zomato', 'Swiggy', 'Blinkit', 'Amazon', 'Flipkart',
      'BigBasket', 'Zepto', 'Instamart', 'Myntra', 'PharmEasy',
      'IRCTC', 'Rapido', 'Ola', 'Uber', 'Netflix',
      'Hotstar', 'Spotify', 'Offline Store', 'Other',
    ];
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${MERCHANTS_TAB}!A2`,
      valueInputOption: 'RAW',
      requestBody: { values: defaultMerchants.map((name) => [name]) },
    });
  }

  // Migrate: add PaymentMode header (F1) if absent.
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

  // Migrate: add Merchant header (G1) if absent.
  const mHeader = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${EXPENSES_TAB}!G1`,
  });
  if (!mHeader.data.values) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${EXPENSES_TAB}!G1`,
      valueInputOption: 'RAW',
      requestBody: { values: [['Merchant']] },
    });
  }
}

async function addExpense({ date, amount, category, paymentMode, merchant, remarks }) {
  const sheets = await getSheetsClient();
  const timestamp = new Date().toISOString();
  const row = [date, amount, category, remarks || '', timestamp, paymentMode || '', merchant || ''];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${EXPENSES_TAB}!A:G`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });

  return { date, amount, category, paymentMode: paymentMode || '', merchant: merchant || '', remarks: remarks || '', timestamp };
}

async function getExpenses({ from, to } = {}) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${EXPENSES_TAB}!A2:G`,
  });

  const rows = res.data.values || [];
  let expenses = rows.map((r, idx) => ({
    rowIndex: idx + 2,
    date: r[0] || '',
    amount: parseFloat(r[1]) || 0,
    category: r[2] || '',
    remarks: r[3] || '',
    timestamp: r[4] || '',
    paymentMode: r[5] || '',
    merchant: r[6] || '',
  }));

  if (from) expenses = expenses.filter((e) => e.date >= from);
  if (to) expenses = expenses.filter((e) => e.date <= to);

  return expenses.sort((a, b) => (a.date < b.date ? 1 : -1));
}

async function updateExpense(rowIndex, { date, amount, category, paymentMode, merchant, remarks }) {
  const sheets = await getSheetsClient();

  // Preserve the original timestamp.
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${EXPENSES_TAB}!E${rowIndex}`,
  });
  const timestamp = existing.data.values?.[0]?.[0] || new Date().toISOString();

  const row = [date, amount, category, remarks || '', timestamp, paymentMode || '', merchant || ''];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${EXPENSES_TAB}!A${rowIndex}:G${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });

  return { rowIndex, date, amount, category, paymentMode: paymentMode || '', merchant: merchant || '', remarks: remarks || '', timestamp };
}

async function deleteExpense(rowIndex) {
  const sheets = await getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const sheet = meta.data.sheets.find((s) => s.properties.title === EXPENSES_TAB);
  const sheetId = sheet.properties.sheetId;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: rowIndex - 1, endIndex: rowIndex },
        },
      }],
    },
  });
}

async function getCategories() {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${CATEGORIES_TAB}!A2:A`,
  });
  return (res.data.values || []).map((r) => r[0]).filter(Boolean);
}

async function addCategory(name) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Category name cannot be empty');

  const existing = await getCategories();
  if (existing.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
    return existing;
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

async function getMerchants() {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${MERCHANTS_TAB}!A2:A`,
  });
  return (res.data.values || []).map((r) => r[0]).filter(Boolean);
}

async function addMerchant(name) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Merchant name cannot be empty');

  const existing = await getMerchants();
  if (existing.some((m) => m.toLowerCase() === trimmed.toLowerCase())) {
    return existing;
  }

  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${MERCHANTS_TAB}!A:A`,
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
  getMerchants,
  addMerchant,
};
