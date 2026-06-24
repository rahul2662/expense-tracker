jest.mock('../services/SheetsClient', () => ({
  getExpenses: jest.fn(),
}));

const { getExpenses } = require('../services/SheetsClient');
const { computeAnalysis } = require('../services/analysis');

const SAMPLE = [
  { rowIndex: 2, date: '2026-06-01', amount: 500,  category: 'Groceries',         merchant: 'Blinkit', paymentMode: 'UPI' },
  { rowIndex: 3, date: '2026-06-01', amount: 299,  category: 'Subscriptions',      merchant: 'Netflix', paymentMode: 'Credit Card' },
  { rowIndex: 4, date: '2026-06-02', amount: 150,  category: 'Groceries, Baby',    merchant: 'Blinkit', paymentMode: 'UPI' },
  { rowIndex: 5, date: '2026-06-05', amount: 800,  category: 'Food Delivery',      merchant: 'Zomato',  paymentMode: 'UPI' },
  { rowIndex: 6, date: '2026-06-05', amount: 350,  category: 'Groceries',          merchant: 'Blinkit', paymentMode: 'UPI' },
  { rowIndex: 7, date: '2026-06-10', amount: 200,  category: 'Other',              merchant: '',        paymentMode: 'Cash' },
];

beforeEach(() => {
  getExpenses.mockResolvedValue(SAMPLE);
});

afterEach(() => {
  jest.clearAllMocks();
});

// ── total ───────────────────────────────────────────────────────────────────

test('total is sum of all expense amounts', async () => {
  const { total } = await computeAnalysis({});
  expect(total).toBe(500 + 299 + 150 + 800 + 350 + 200);
});

// ── byCategory ──────────────────────────────────────────────────────────────

test('byCategory splits comma-separated categories and counts full amount under each', async () => {
  const { byCategory } = await computeAnalysis({});
  const map = Object.fromEntries(byCategory.map((c) => [c.category, c.total]));
  expect(map['Groceries']).toBe(500 + 150 + 350);  // 1000
  expect(map['Baby']).toBe(150);                    // multi-tag expense also counted here
  expect(map['Subscriptions']).toBe(299);
  expect(map['Food Delivery']).toBe(800);
  expect(map['Other']).toBe(200);
});

test('byCategory is sorted by total descending', async () => {
  const { byCategory } = await computeAnalysis({});
  for (let i = 0; i < byCategory.length - 1; i++) {
    expect(byCategory[i].total).toBeGreaterThanOrEqual(byCategory[i + 1].total);
  }
});

test('byCategory uses Uncategorized for expenses with no category', async () => {
  getExpenses.mockResolvedValue([
    { rowIndex: 2, date: '2026-06-01', amount: 100, category: '', merchant: '', paymentMode: 'Cash' },
  ]);
  const { byCategory } = await computeAnalysis({});
  expect(byCategory[0].category).toBe('Uncategorized');
});

// ── byCategoryMerchant ──────────────────────────────────────────────────────

test('byCategoryMerchant nests merchants under each category', async () => {
  const { byCategoryMerchant } = await computeAnalysis({});
  const groceryMerchants = byCategoryMerchant['Groceries'];
  expect(groceryMerchants).toBeDefined();
  const blinkit = groceryMerchants.find((m) => m.merchant === 'Blinkit');
  expect(blinkit.total).toBe(500 + 150 + 350);
});

test('byCategoryMerchant labels expenses without merchant as (No merchant)', async () => {
  const { byCategoryMerchant } = await computeAnalysis({});
  const otherMerchants = byCategoryMerchant['Other'];
  expect(otherMerchants[0].merchant).toBe('(No merchant)');
  expect(otherMerchants[0].total).toBe(200);
});

test('byCategoryMerchant merchants are sorted by total descending', async () => {
  getExpenses.mockResolvedValue([
    { rowIndex: 2, date: '2026-06-01', amount: 100, category: 'Groceries', merchant: 'Zepto',   paymentMode: 'UPI' },
    { rowIndex: 3, date: '2026-06-01', amount: 500, category: 'Groceries', merchant: 'Blinkit', paymentMode: 'UPI' },
    { rowIndex: 4, date: '2026-06-01', amount: 300, category: 'Groceries', merchant: 'Amazon',  paymentMode: 'UPI' },
  ]);
  const { byCategoryMerchant } = await computeAnalysis({});
  const totals = byCategoryMerchant['Groceries'].map((m) => m.total);
  expect(totals).toEqual([...totals].sort((a, b) => b - a));
});

// ── byDay ───────────────────────────────────────────────────────────────────

test('byDay aggregates spend per date', async () => {
  const { byDay } = await computeAnalysis({});
  const map = Object.fromEntries(byDay.map((d) => [d.date, d.total]));
  expect(map['2026-06-01']).toBe(500 + 299);
  expect(map['2026-06-02']).toBe(150);
  expect(map['2026-06-05']).toBe(800 + 350);
  expect(map['2026-06-10']).toBe(200);
});

test('byDay is sorted ascending by date', async () => {
  const { byDay } = await computeAnalysis({});
  for (let i = 0; i < byDay.length - 1; i++) {
    expect(byDay[i].date <= byDay[i + 1].date).toBe(true);
  }
});

// ── byMonth ─────────────────────────────────────────────────────────────────

test('byMonth aggregates spend per YYYY-MM', async () => {
  getExpenses.mockResolvedValue([
    { rowIndex: 2, date: '2026-05-15', amount: 400, category: 'Other', merchant: '', paymentMode: 'UPI' },
    { rowIndex: 3, date: '2026-06-01', amount: 600, category: 'Other', merchant: '', paymentMode: 'UPI' },
    { rowIndex: 4, date: '2026-06-20', amount: 200, category: 'Other', merchant: '', paymentMode: 'UPI' },
  ]);
  const { byMonth } = await computeAnalysis({});
  const map = Object.fromEntries(byMonth.map((m) => [m.month, m.total]));
  expect(map['2026-05']).toBe(400);
  expect(map['2026-06']).toBe(800);
});

test('byMonth is sorted ascending by month', async () => {
  const { byMonth } = await computeAnalysis({});
  for (let i = 0; i < byMonth.length - 1; i++) {
    expect(byMonth[i].month <= byMonth[i + 1].month).toBe(true);
  }
});

// ── byPaymentMode ────────────────────────────────────────────────────────────

test('byPaymentMode totals by payment mode', async () => {
  const { byPaymentMode } = await computeAnalysis({});
  const map = Object.fromEntries(byPaymentMode.map((p) => [p.paymentMode, p.total]));
  expect(map['UPI']).toBe(500 + 150 + 800 + 350);
  expect(map['Credit Card']).toBe(299);
  expect(map['Cash']).toBe(200);
});

// ── byMerchant ───────────────────────────────────────────────────────────────

test('byMerchant excludes expenses with no merchant', async () => {
  const { byMerchant } = await computeAnalysis({});
  expect(byMerchant.every((m) => m.merchant)).toBe(true);
  const map = Object.fromEntries(byMerchant.map((m) => [m.merchant, m.total]));
  expect(map['Blinkit']).toBe(500 + 150 + 350);
  expect(map['Netflix']).toBe(299);
  expect(map['Zomato']).toBe(800);
  expect(map['']).toBeUndefined();
});

test('byMerchant is sorted by total descending', async () => {
  const { byMerchant } = await computeAnalysis({});
  for (let i = 0; i < byMerchant.length - 1; i++) {
    expect(byMerchant[i].total).toBeGreaterThanOrEqual(byMerchant[i + 1].total);
  }
});

// ── recurring ────────────────────────────────────────────────────────────────

test('recurring counts transactions per merchant', async () => {
  const { recurring } = await computeAnalysis({});
  const blinkit = recurring.find((r) => r.merchant === 'Blinkit');
  expect(blinkit.count).toBe(3);
  expect(blinkit.total).toBe(500 + 150 + 350);
});

test('recurring is sorted by count descending', async () => {
  const { recurring } = await computeAnalysis({});
  for (let i = 0; i < recurring.length - 1; i++) {
    expect(recurring[i].count).toBeGreaterThanOrEqual(recurring[i + 1].count);
  }
});

test('recurring is capped at 10 merchants', async () => {
  const many = Array.from({ length: 15 }, (_, i) => ({
    rowIndex: i + 2,
    date: '2026-06-01',
    amount: 100,
    category: 'Other',
    merchant: `Merchant${i}`,
    paymentMode: 'UPI',
  }));
  getExpenses.mockResolvedValue(many);
  const { recurring } = await computeAnalysis({});
  expect(recurring.length).toBeLessThanOrEqual(10);
});

test('recurring excludes expenses with no merchant', async () => {
  const { recurring } = await computeAnalysis({});
  expect(recurring.every((r) => r.merchant)).toBe(true);
});
