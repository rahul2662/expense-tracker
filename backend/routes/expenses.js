const { Router } = require('express');
const {
  addExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
  getCategories,
  addCategory,
  getMerchants,
  addMerchant,
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

async function validateExpenseBody(body) {
  const { date, amount, category, paymentMode, merchant, remarks } = body;

  if (!date || amount == null || !category) {
    return 'date, amount, and category are required';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return 'date must be YYYY-MM-DD';
  }
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return 'amount must be a positive number';
  }
  if (!paymentMode || !VALID_PAYMENT_MODES.includes(paymentMode)) {
    return `paymentMode must be one of: ${VALID_PAYMENT_MODES.join(', ')}`;
  }

  const known = await getCategories();
  if (!known.some((k) => k.toLowerCase() === category.trim().toLowerCase())) {
    return `Unknown category: ${category}`;
  }

  return null;
}

router.post('/expenses', async (req, res, next) => {
  try {
    const validationError = await validateExpenseBody(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const { date, amount, category, paymentMode, merchant, remarks } = req.body;
    const expense = await addExpense({
      date,
      amount: parseFloat(amount),
      category: category.trim(),
      paymentMode,
      merchant: merchant ? merchant.trim() : '',
      remarks,
    });
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

    const validationError = await validateExpenseBody(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const { date, amount, category, paymentMode, merchant, remarks } = req.body;
    const expense = await updateExpense(rowIndex, {
      date,
      amount: parseFloat(amount),
      category: category.trim(),
      paymentMode,
      merchant: merchant ? merchant.trim() : '',
      remarks,
    });
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

router.get('/merchants', async (req, res, next) => {
  try {
    const merchants = await getMerchants();
    res.json(merchants);
  } catch (err) {
    next(err);
  }
});

router.post('/merchants', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const merchants = await addMerchant(name);
    res.status(201).json(merchants);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
