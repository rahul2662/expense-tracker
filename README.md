# CashFlow.sh

> Personal finance tracking, powered by Google Sheets.

A self-hosted expense tracker built for one — fast to use, zero database overhead, and your data lives exactly where you can see it: a Google Sheet you own.

![Stack](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)
![Stack](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white)
![Stack](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Stack](https://img.shields.io/badge/Google_Sheets-API-34A853?style=flat-square&logo=googlesheets&logoColor=white)

---

## Features

- **Log expenses** with date, amount, payment mode, category (multi-tag), and optional merchant
- **Merchant tracking** — record where you spent (Zomato, Blinkit) separately from what you spent on (Food Delivery, Groceries)
- **Multi-category tagging** — a single expense can have multiple categories (e.g. a Blinkit order tagged as Groceries + Baby)
- **Payment mode tracking** — Cash, UPI, Credit Card, Debit Card, Net Banking
- **Inline editing** — edit any expense without deleting and re-adding
- **ICICI bank statement import** — upload XLS statement, preview transactions, import individually or in bulk
- **Bank reconciliation** — opening/closing balance, unaccounted outflow callout, salary reference date
- **Interactive analysis dashboard**:
  - Spend by Category — click any category to see merchant breakdown, click merchant to see transactions
  - Daily Spend — click any bar to see that day's transactions inline
  - Top Merchants by Frequency — click merchant to see category breakdown, click category to see transactions
  - Monthly Trend and Payment Mode charts
- **Category & merchant management** — add from the UI; comma-separated batch add
- **Expenses list** — sort by date, filter by payment mode and merchant
- **Google Sheets as the database** — open, inspect, and edit raw data anytime

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Recharts, Lucide React |
| Backend | Node.js, Express |
| Storage | Google Sheets (via `googleapis@173`) |
| Auth | Google Service Account (no OAuth flow) |

---

## Project Structure

```
cashflow.sh/
├── backend/
│   ├── server.js
│   ├── routes/
│   │   ├── expenses.js        # expenses, categories, merchants endpoints
│   │   ├── analysis.js        # aggregation endpoint
│   │   └── import.js          # ICICI statement import
│   ├── services/
│   │   ├── SheetsClient.js    # all Sheets API calls
│   │   ├── analysis.js        # computeAnalysis() aggregation logic
│   │   └── iciciParser.js     # ICICI XLS statement parser
│   ├── tests/
│   │   └── analysis.test.js   # Jest unit tests (18 tests)
│   └── config/
│       └── credentials.json   # gitignored — service account key
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ExpenseForm.jsx
│       │   ├── ExpenseTable.jsx
│       │   ├── CategoryManager.jsx
│       │   ├── MerchantManager.jsx
│       │   ├── ImportStatement.jsx
│       │   ├── CategoryChart.jsx      # drill-down: category → merchant → transactions
│       │   ├── DailySpendChart.jsx    # click bar → transactions below
│       │   ├── RecurringChart.jsx     # drill-down: merchant → category → transactions
│       │   ├── TransactionList.jsx    # shared read-only transaction table
│       │   ├── TrendChart.jsx
│       │   └── PaymentModeChart.jsx
│       ├── App.jsx
│       ├── api.js
│       └── utils.js
└── scripts/
    └── smoke-test.sh          # live API smoke tests (read-only, 26 checks)
```

---

## Setup

### Prerequisites

- Node.js 18+
- A Google Cloud project with the **Google Sheets API** enabled
- A service account with a downloaded JSON key
- A Google Sheet shared with the service account (Editor access)

### 1. Clone

```bash
git clone git@github.com:rahul2662/expense-tracker.git cashflow-sh
cd cashflow-sh
```

### 2. Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
PORT=3001
SHEET_ID=your_google_sheet_id_here
GOOGLE_APPLICATION_CREDENTIALS=./config/credentials.json
ALLOWED_ORIGINS=http://localhost:5173
```

Place your service account JSON key at `backend/config/credentials.json`.

```bash
npm install
npm run dev
```

On first start, the backend creates the `Expenses`, `Categories`, and `Merchants` tabs and seeds defaults.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Data Model

Three tabs in one Google Sheet:

**Expenses** — one row per expense

| Column | Field | Notes |
|---|---|---|
| A | Date | `YYYY-MM-DD` |
| B | Amount | number |
| C | Category | comma-separated — e.g. `Groceries, Baby` |
| D | Remarks | optional free text |
| E | Timestamp | ISO string, set on insert |
| F | PaymentMode | Cash / UPI / Credit Card / Debit Card / Net Banking |
| G | Merchant | optional — e.g. `Zomato`, `Blinkit` |

**Categories** and **Merchants** — one name per row, drive the pickers in the UI.

---

## API Reference

All routes are under `/api`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/expenses?from=&to=` | List expenses in date range |
| `POST` | `/expenses` | Add an expense |
| `PUT` | `/expenses/:rowIndex` | Edit an expense in-place |
| `DELETE` | `/expenses/:rowIndex` | Delete an expense |
| `GET` | `/categories` | List all categories |
| `POST` | `/categories` | Add a category |
| `GET` | `/merchants` | List all merchants |
| `POST` | `/merchants` | Add a merchant |
| `GET` | `/analysis?from=&to=` | Aggregations (see below) |
| `POST` | `/import/preview` | Parse ICICI XLS statement |
| `POST` | `/import/confirm` | Import selected rows |

**Analysis response:**
```json
{
  "total": 18420,
  "byCategory":          [{ "category": "Groceries", "total": 6200 }],
  "byCategoryMerchant":  { "Groceries": [{ "merchant": "Blinkit", "total": 6200 }] },
  "byMonth":             [{ "month": "2026-06", "total": 18420 }],
  "byPaymentMode":       [{ "paymentMode": "UPI", "total": 12000 }],
  "byMerchant":          [{ "merchant": "Zomato", "total": 3200 }],
  "byDay":               [{ "date": "2026-06-01", "total": 1450 }],
  "recurring":           [{ "merchant": "Blinkit", "count": 12, "total": 8400 }]
}
```

---

## Testing

### Unit tests — no Sheet writes, safe to run anytime

```bash
cd backend && npm test
```

18 Jest tests covering all `computeAnalysis` aggregations with a mocked SheetsClient.

### Smoke tests — read-only against the live API

```bash
cd backend && npm run test:smoke
```

26 checks: reachability, GET endpoints, validation rejection (400s), analysis response shape. Automatically cleans up any stale test data from previous runs before starting.

### Pre-commit hook

The repo includes a git pre-commit hook that runs unit tests before every commit. Installed automatically — no setup needed.

### Claude Code agent

A `test-runner` agent is defined in `.claude/agents/test-runner.md`. In any Claude Code session on this project, ask Claude to "run tests" and it will spawn the agent — unit tests always, smoke tests if the backend is up — and return a clean pass/fail summary without flooding the conversation context.

### Backfill lookup tabs

If the Categories or Merchants tabs are out of sync with your expense data:

```bash
cd backend && npm run sync-lookups
```

---

## Why Google Sheets?

No database to provision or back up. The sheet is always open in a browser tab — you can correct a wrong amount, fix a typo, or bulk-import past expenses directly. The backend treats it as an append-only log with indexed deletes.

---

## License

MIT
