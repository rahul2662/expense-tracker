require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ensureSheetStructure } = require('./services/SheetsClient');
const expensesRouter = require('./routes/expenses');
const analysisRouter = require('./routes/analysis');
const importRouter   = require('./routes/import');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use('/api', expensesRouter);
app.use('/api', analysisRouter);
app.use('/api', importRouter);

// Central error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

ensureSheetStructure()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Expense tracker backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize sheet structure:', err);
    process.exit(1);
  });
