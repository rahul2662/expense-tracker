const { Router } = require('express');
const multer = require('multer');
const { parseICICIStatement } = require('../services/iciciParser');
const { getExpenses, addExpense, getCategories, addCategory, addMerchant } = require('../services/SheetsClient');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const router = Router();

// Extract the numeric transaction reference embedded in ICICI remark strings.
// e.g. "UPI/.../614870044614/ICI9cb79..." → "614870044614"
// This is more reliable than date+amount alone (catches same-day same-amount edge cases).
function extractTxRef(remarks) {
  const m = String(remarks).match(/\/(\d{10,15})\//);
  return m ? m[1] : null;
}

router.post('/import/preview', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    let parsed;
    try {
      parsed = parseICICIStatement(req.file.buffer);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const { transactions, openingBalance, closingBalance } = parsed;
    const dates = transactions.map(t => t.date).filter(Boolean);
    if (dates.length === 0) return res.status(400).json({ error: 'No transactions found' });

    const from = dates.reduce((a, b) => (a < b ? a : b));
    const to   = dates.reduce((a, b) => (a > b ? a : b));

    const existing = await getExpenses({ from, to });

    const rows = transactions.map(t => {
      let status = t.type;
      let duplicateOf = null;

      if (t.withdrawal > 0) {
        const txRef = extractTxRef(t.remarks);
        const match = existing.find(e => {
          if (txRef && e.remarks && e.remarks.includes(txRef)) return true;
          if (e.date === t.date && Math.abs(Number(e.amount) - t.withdrawal) < 0.02) return true;
          return false;
        });
        if (match) {
          status = 'duplicate';
          duplicateOf = match.rowIndex;
        }
      }

      const selected = (status === 'expense' || status === 'cash');

      return {
        sno:         t.sno,
        date:        t.date,
        amount:      t.amount,
        withdrawal:  t.withdrawal,
        deposit:     t.deposit,
        balance:     t.balance,
        remarks:     t.remarks,
        merchant:    t.detectedMerchant,
        category:    t.detectedCategory,
        paymentMode: t.detectedPaymentMode,
        status,
        duplicateOf,
        selected,
      };
    });

    res.json({ rows, dateRange: { from, to }, openingBalance, closingBalance });
  } catch (err) {
    next(err);
  }
});

router.post('/import/confirm', async (req, res, next) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No rows provided' });
    }

    const categories = await getCategories();
    let imported = 0;
    const errors = [];

    for (const row of rows) {
      try {
        const category = categories.includes(row.category) ? row.category : 'Other';
        await addExpense({
          date:        row.date,
          amount:      row.amount,
          category,
          paymentMode: row.paymentMode || 'UPI',
          merchant:    row.merchant || '',
          remarks:     row.remarks || '',
        });
        await addCategory(category);
        if (row.merchant) await addMerchant(row.merchant);
        imported++;
      } catch (err) {
        errors.push({ sno: row.sno, error: err.message });
      }
    }

    res.json({ imported, errors });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
