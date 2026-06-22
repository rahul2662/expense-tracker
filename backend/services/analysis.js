const { getExpenses } = require('./SheetsClient');

async function computeAnalysis({ from, to } = {}) {
  const expenses = await getExpenses({ from, to });

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  const byCategoryMap = {};
  for (const e of expenses) {
    for (const cat of e.categories) {
      byCategoryMap[cat] = (byCategoryMap[cat] || 0) + e.amount;
    }
  }
  const byCategory = Object.entries(byCategoryMap)
    .map(([category, amount]) => ({ category, total: amount }))
    .sort((a, b) => b.total - a.total);

  const byMonthMap = {};
  for (const e of expenses) {
    const month = e.date.slice(0, 7);
    byMonthMap[month] = (byMonthMap[month] || 0) + e.amount;
  }
  const byMonth = Object.entries(byMonthMap)
    .map(([month, amount]) => ({ month, total: amount }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const byPaymentModeMap = {};
  for (const e of expenses) {
    const mode = e.paymentMode || 'Unknown';
    byPaymentModeMap[mode] = (byPaymentModeMap[mode] || 0) + e.amount;
  }
  const byPaymentMode = Object.entries(byPaymentModeMap)
    .map(([paymentMode, amount]) => ({ paymentMode, total: amount }))
    .sort((a, b) => b.total - a.total);

  return { total, byCategory, byMonth, byPaymentMode };
}

module.exports = { computeAnalysis };
