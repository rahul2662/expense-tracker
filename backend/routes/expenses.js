const { Router } = require('express');
const {
  addExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
  getCategories,
  addCategory,
} = require('../services/SheetsClient');

const VALID_PAYMENT_MODES = ['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Net Banking'];

const router = Router();

router.get('/expenses', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const expenses = await getExpenses({ from, to });
    res.json(expenses);
  } catch (err) {
    next(err);
  }
});

router.post('/expenses', async (req, res, next) => {
  try {
    const { date, amount, categories, paymentMode, remarks } = req.body;

    if (!date || amount == null || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ error: 'date, amount, and at least one category are required' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }
    if (!paymentMode || !VALID_PAYMENT_MODES.includes(paymentMode)) {
      return res.status(400).json({ error: `paymentMode must be one of: ${VALID_PAYMENT_MODES.join(', ')}` });
    }

    const known = await getCategories();
    const unknown = categories.filter((c) => !known.some((k) => k.toLowerCase() === c.toLowerCase()));
    if (unknown.length > 0) {
      return res.status(400).json({ error: `Unknown categories: ${unknown.join(', ')}` });
    }

    const expense = await addExpense({ date, amount: parsedAmount, categories, paymentMode, remarks });
    res.status(201).json(expense);
  } catch (err) {
    next(err);
  }
});

router.put('/expenses/:rowIndex', async (req, res, next) => {
  try {
    const rowIndex = parseInt(req.params.rowIndex, 10);
    if (isNaN(rowIndex) || rowIndex < 2) {
      return res.status(400).json({ error: 'Invalid rowIndex' });
    }

    const { date, amount, categories, paymentMode, remarks } = req.body;

    if (!date || amount == null || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ error: 'date, amount, and at least one category are required' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }
    if (!paymentMode || !VALID_PAYMENT_MODES.includes(paymentMode)) {
      return res.status(400).json({ error: `paymentMode must be one of: ${VALID_PAYMENT_MODES.join(', ')}` });
    }

    const known = await getCategories();
    const unknown = categories.filter((c) => !known.some((k) => k.toLowerCase() === c.toLowerCase()));
    if (unknown.length > 0) {
      return res.status(400).json({ error: `Unknown categories: ${unknown.join(', ')}` });
    }

    const expense = await updateExpense(rowIndex, { date, amount: parsedAmount, categories, paymentMode, remarks });
    res.json(expense);
  } catch (err) {
    next(err);
  }
});

router.delete('/expenses/:rowIndex', async (req, res, next) => {
  try {
    const rowIndex = parseInt(req.params.rowIndex, 10);
    if (isNaN(rowIndex) || rowIndex < 2) {
      return res.status(400).json({ error: 'Invalid rowIndex' });
    }
    await deleteExpense(rowIndex);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get('/categories', async (req, res, next) => {
  try {
    const categories = await getCategories();
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

router.post('/categories', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const categories = await addCategory(name);
    res.status(201).json(categories);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
