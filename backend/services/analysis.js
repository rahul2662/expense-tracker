const { getExpenses } = require('./SheetsClient');

async function computeAnalysis({ from, to } = {}) {
  const expenses = await getExpenses({ from, to });

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  const byCategoryMap = {};
  const byCategoryMerchantMap = {};

  for (const e of expenses) {
    const cats = e.category
      ? e.category.split(',').map((c) => c.trim()).filter(Boolean)
      : ['Uncategorized'];
    const merchant = e.merchant || '(No merchant)';

    for (const cat of cats) {
      byCategoryMap[cat] = (byCategoryMap[cat] || 0) + e.amount;
      if (!byCategoryMerchantMap[cat]) byCategoryMerchantMap[cat] = {};
      byCategoryMerchantMap[cat][merchant] = (byCategoryMerchantMap[cat][merchant] || 0) + e.amount;
    }
  }

  const byCategory = Object.entries(byCategoryMap)
    .map(([category, amount]) => ({ category, total: amount }))
    .sort((a, b) => b.total - a.total);

  const byCategoryMerchant = {};
  for (const [cat, merchantMap] of Object.entries(byCategoryMerchantMap)) {
    byCategoryMerchant[cat] = Object.entries(merchantMap)
      .map(([merchant, total]) => ({ merchant, total }))
      .sort((a, b) => b.total - a.total);
  }

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

  const byMerchantMap = {};
  for (const e of expenses) {
    if (!e.merchant) continue;
    byMerchantMap[e.merchant] = (byMerchantMap[e.merchant] || 0) + e.amount;
  }
  const byMerchant = Object.entries(byMerchantMap)
    .map(([merchant, amount]) => ({ merchant, total: amount }))
    .sort((a, b) => b.total - a.total);

  const byDayMap = {};
  for (const e of expenses) {
    byDayMap[e.date] = (byDayMap[e.date] || 0) + e.amount;
  }
  const byDay = Object.entries(byDayMap)
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const byMerchantFreqMap = {};
  for (const e of expenses) {
    if (!e.merchant) continue;
    if (!byMerchantFreqMap[e.merchant]) byMerchantFreqMap[e.merchant] = { count: 0, total: 0 };
    byMerchantFreqMap[e.merchant].count++;
    byMerchantFreqMap[e.merchant].total += e.amount;
  }
  const recurring = Object.entries(byMerchantFreqMap)
    .map(([merchant, { count, total }]) => ({ merchant, count, total }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { total, byCategory, byCategoryMerchant, byMonth, byPaymentMode, byMerchant, byDay, recurring };
}

module.exports = { computeAnalysis };
