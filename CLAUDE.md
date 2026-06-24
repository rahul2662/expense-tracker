# CashFlow.sh — Project Context for Claude Code

## What this is
A personal daily expense tracker for a single user (me), branded **CashFlow.sh**.
Phase 1 (built) covers manual expense entry, multi-category tagging, payment mode
tracking, merchant tracking, spend analysis/charts, inline expense editing, ICICI
bank statement import with deduplication, and bank reconciliation.
Phase 2 (future, not in scope yet) will add invoice upload + parsing to auto-split
recurring vs. discretionary spend within a single merchant (e.g. a ₹1000 Blinkit
order that's part groceries, part snacks).

Do not build Phase 2 features (invoice upload, OCR, auto-categorization) unless
explicitly asked.

## Architecture (locked in — do not change without asking)

```
React frontend (Tailwind CSS)  →  Node/Express backend  →  Google Sheets API
```

- **Frontend**: React + Tailwind CSS + Recharts + Lucide React icons. No other CSS framework.
- **Backend**: Node.js + Express. Holds the Google service-account credentials.
  The frontend never talks to Google Sheets directly — always through this backend.
- **Storage**: Google Sheets, via `googleapis@173` npm package, using a service
  account (not OAuth user login — this is a single-user personal tool).
- **Hosting**: I (the user) handle deployment myself — I'm a DevOps engineer.
  Don't make hosting assumptions or suggest specific hosting providers unless asked.

## Why these choices (context, don't relitigate)
- Sheets was chosen deliberately over a real database — it's visual, I can open
  and inspect/edit raw data directly, and there's no DB to provision for a solo project.
- A self-hosted Express backend (not Google Apps Script) was chosen deliberately,
  because Phase 2 will need real file-upload handling, which Apps Script handles
  awkwardly. Don't suggest switching to Apps Script.
- Tailwind was chosen over plain CSS because the UI is dashboard/chart/form heavy,
  and utility classes are faster to iterate on solo than maintaining separate CSS files.
- `googleapis@173` (not 140) — v140 used node-fetch v2 which breaks on Node 18+.
  Do not downgrade.

## Data model

### Google Sheet: three tabs in one spreadsheet

**Tab: `Expenses`**
| Column | Header | Type | Notes |
|---|---|---|---|
| A | Date | string `YYYY-MM-DD` | User-editable, defaults to today in UI, can be backdated |
| B | Amount | number | |
| C | Category | string | Comma-separated list — e.g. `"Blinkit, Groceries"` |
| D | Remarks | string | Optional, free text. Import stores full ICICI remark string here (used for dedup). |
| E | Timestamp | ISO string | Auto-set by backend on insert; never shown in UI |
| F | PaymentMode | string | One of: Cash, UPI, Credit Card, Debit Card, Net Banking |
| G | Merchant | string | Optional, free text |

**Tab: `Categories`**
| Column | Type | Notes |
|---|---|---|
| Name | string | One category per row |

**Tab: `Merchants`**
| Column | Type | Notes |
|---|---|---|
| Name | string | One merchant per row |

- Categories and merchants are **user-editable from the UI** — not hardcoded in code.
- An expense can have **multiple categories** (stored comma-separated in column C,
  returned as an array by the API).
- Default seed categories (only inserted if tab is empty on first run):
  Food Delivery, Groceries, Subscriptions, Pharmacy, Pet, Baby, Transport,
  Utilities, Investments, Other.
- Default seed merchants (19): Zomato, Swiggy, Blinkit, Amazon, Flipkart, BigBasket,
  Zepto, Instamart, Myntra, PharmEasy, Netflix, Hotstar, Spotify, Ola, Uber, Rapido,
  Snabbit, Meesho, Zee5.
- `ensureSheetStructure()` creates all three tabs, writes headers, seeds defaults,
  and migrates existing sheets (adds PaymentMode and Merchant headers if missing).
  Safe to call on every startup.

## Backend API contract

Base path: `/api`

- `POST /api/expenses`
  Body: `{ "date": "2026-06-21", "amount": 450, "categories": ["Food Delivery"], "paymentMode": "UPI", "merchant": "Zomato", "remarks": "Zomato lunch" }`
  Validates: date format, positive amount, all categories exist, paymentMode is valid.
  Appends a row to `Expenses`. Backend sets `Timestamp` server-side.

- `GET /api/expenses?from=YYYY-MM-DD&to=YYYY-MM-DD`
  Returns all expense rows in range (inclusive), most recent first.
  Each row: `{ rowIndex, date, amount, categories[], paymentMode, merchant, remarks, timestamp }`.
  `rowIndex` is the sheet row number — needed for PUT and DELETE.

- `PUT /api/expenses/:rowIndex`
  Body: same shape as POST. Updates the row in-place; preserves original Timestamp.

- `DELETE /api/expenses/:rowIndex`
  Deletes that row from the `Expenses` tab.

- `GET /api/categories`
  Returns the flat list of category names.

- `POST /api/categories`
  Body: `{ "name": "New Category" }`
  Adds a new category if it doesn't already exist (case-insensitive). No-op if it does.

- `GET /api/merchants`
  Returns the flat list of merchant names.

- `POST /api/merchants`
  Body: `{ "name": "New Merchant" }`
  Adds a new merchant if it doesn't already exist (case-insensitive). No-op if it does.

- `GET /api/analysis?from=YYYY-MM-DD&to=YYYY-MM-DD`
  Returns server-computed aggregations:
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
  - `byCategory` splits comma-separated multi-tag expenses; each tagged category gets the full amount (no splitting).
  - `byCategoryMerchant` nests merchants under each category for drill-down.
  - `byDay` is sorted ascending by date.
  - `recurring` is top 10 merchants by transaction count, sorted by count descending.

- `POST /api/import/preview`
  Multipart form upload (`file` field). Parses ICICI XLS statement.
  Returns `{ rows, dateRange: { from, to }, openingBalance, closingBalance }`.
  Each row: `{ sno, date, amount, withdrawal, deposit, balance, remarks, merchant, category, paymentMode, status, duplicateOf, selected }`.
  `status` is one of: `expense | cash | duplicate | refund | credit | investment | transfer`.
  Dedup: primary = UPI tx ref (10-15 digit number in remarks, pattern `/\/(\d{10,15})\//`);
  fallback = same date + amount within 0.02.

- `POST /api/import/confirm`
  Body: `{ rows: [...] }`. Imports each row via `addExpense`. Returns `{ imported, errors }`.

Valid `paymentMode` values: `Cash`, `UPI`, `Credit Card`, `Debit Card`, `Net Banking`.

## Project structure

```
cashflow.sh/
├── backend/
│   ├── server.js                   # Express entry point; calls ensureSheetStructure on startup
│   ├── routes/
│   │   ├── expenses.js             # GET/POST/PUT/DELETE /expenses + GET/POST /categories + GET/POST /merchants
│   │   ├── analysis.js             # GET /analysis
│   │   └── import.js               # POST /import/preview + POST /import/confirm
│   ├── services/
│   │   ├── SheetsClient.js         # All Sheets API calls; exports ensureSheetStructure,
│   │   │                           #   addExpense, getExpenses, updateExpense, deleteExpense,
│   │   │                           #   getCategories, addCategory, getMerchants, addMerchant
│   │   ├── analysis.js             # computeAnalysis() — aggregation logic
│   │   └── iciciParser.js          # parseICICIStatement(buffer) — parses ICICI XLS bank statement
│   ├── tests/
│   │   └── analysis.test.js        # Jest unit tests for computeAnalysis (18 tests, mocks SheetsClient)
│   ├── scripts/
│   │   └── sync-lookups.js         # One-time backfill: registers all categories/merchants from existing expenses
│   ├── config/
│   │   └── credentials.json        # gitignored — service account key (user provides)
│   ├── .env                        # gitignored — PORT, SHEET_ID, GOOGLE_APPLICATION_CREDENTIALS
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ExpenseForm.jsx      # Add expense: date, amount, payment mode pills, category pills, merchant pills
│   │   │   ├── ExpenseTable.jsx     # List expenses with sort/filter + inline edit modal + delete
│   │   │   ├── CategoryManager.jsx  # Add/list categories (supports comma-separated batch add)
│   │   │   ├── MerchantManager.jsx  # Add/list merchants (supports comma-separated batch add)
│   │   │   ├── ImportStatement.jsx  # ICICI statement upload, preview table, per-row/bulk import, reconciliation card
│   │   │   ├── CategoryChart.jsx    # Spend by category — click → merchant drill-down → transaction list
│   │   │   ├── DailySpendChart.jsx  # Daily spend bar chart — click bar → transaction list below
│   │   │   ├── RecurringChart.jsx   # Top 10 merchants by frequency — click → category breakdown → transaction list
│   │   │   ├── TransactionList.jsx  # Shared read-only transaction table + Breadcrumb component
│   │   │   ├── TrendChart.jsx       # Vertical bar chart — monthly trend (Recharts)
│   │   │   └── PaymentModeChart.jsx # Horizontal bar chart — spend by payment mode (Recharts)
│   │   ├── App.jsx                  # Sidebar layout + AnalysisView (stat cards + 4 charts + recurring)
│   │   ├── api.js                   # Fetch wrappers for all backend endpoints
│   │   └── utils.js                 # categoryColor() — deterministic color per category name
│   ├── index.html
│   ├── vite.config.js               # Proxies /api → localhost:3001 in dev
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
├── scripts/
│   └── smoke-test.sh               # Live API smoke tests (read-only, cleans up stale test data)
├── .claude/
│   └── agents/
│       └── test-runner.md          # Custom Claude Code agent: runs unit + smoke tests, reports clean summary
└── README.md
```

## ICICI parser notes (`backend/services/iciciParser.js`)
- Header row detected by checking for BOTH `'S No.'` AND `'Withdrawal'` in the same row
  (row 4 contains "Transaction Date from" which is a false positive if only checking one field).
- Continuation rows: empty sno + non-empty remarks → append to current transaction's remarks.
- Break condition checks BOTH sno and remarks columns for "Legends Used" — it appears in
  the sno column (col index 1) in the actual ICICI file, not the remarks column.
- Each transaction includes `balance` (per-row closing balance from the sheet).
- Opening balance: `firstBalance + firstWithdrawal - firstDeposit`.

## Import dedup logic (`backend/routes/import.js`)
- Primary dedup key: UPI transaction reference number (10-15 digit numeric ID extracted
  from remarks via `/\/(\d{10,15})\//`). The full ICICI remark string is stored in
  `Remarks` column on import, so re-uploads can find the ref in existing expenses.
- Fallback: same date + amount within 0.02 tolerance.
- After each successful `addExpense`, `import/confirm` calls `addCategory` and `addMerchant`
  for that row's values — both are no-ops if the name already exists. This ensures every
  imported merchant/category is registered in the lookup tabs and appears in the UI pickers.

## Lookup sync (`backend/scripts/sync-lookups.js`)
One-time backfill for existing data. Reads all expenses, compares against Categories and
Merchants tabs, and registers anything missing. Run after initial data import or if the
lookup tabs get out of sync:
```bash
cd backend && npm run sync-lookups
```

## Reconciliation card (`frontend/src/components/ImportStatement.jsx`)
- Reference date picker: user picks a date to define the reconciliation period start.
- Opening balance = balance of last transaction with `date < refDate` (end of previous day).
- reconRows = all rows with `date >= refDate` (inclusive — salary + same-day expenses both included).
- "From salary" button: auto-detects first `credit` type transaction; toggles its date as reference.
- Outflow breakdown: In tracker (duplicate) / Not yet imported (expense+cash) / Transfers+Investments.
- Unaccounted outflow (amber callout) = pending expense+cash rows not yet imported.

## Expenses list sort & filter
- Client-side only (no backend changes) — operates on the loaded date range.
- Sort by date: toggle asc/desc via clickable column header.
- Filter by payment mode: pill buttons (only modes present in loaded data shown).
- Filter by merchant: dropdown (only merchants present in loaded data shown).

## Analysis dashboard drill-downs
All charts are interactive. `AnalysisView` fetches both `getAnalysis` and `getExpenses` in parallel on Load, so drill-downs have no extra latency.

- **Spend by Category** (CategoryChart): click category → merchant breakdown bar chart → click merchant → TransactionList filtered by category + merchant.
- **Daily Spend** (DailySpendChart): click a bar → transaction list appears below the chart; selected bar turns amber, others fade. Click again or "✕ Clear" to dismiss. Highest-spend day highlighted in pink when no bar selected.
- **Top Merchants by Frequency** (RecurringChart): click merchant → category breakdown bar chart (computed client-side from expenses) → click category → TransactionList filtered by merchant + category.
- **TransactionList**: shared read-only component. Shows date, amount, category pills, payment mode, merchant, remarks. Sorted most-recent-first with total at top.
- **Breadcrumb**: shared `Breadcrumb` component (exported from TransactionList.jsx) used in CategoryChart and RecurringChart for back-navigation.

## Testing

### Unit tests (safe — mocks SheetsClient, no Sheet writes)
```bash
cd backend && npm test
```
18 Jest tests in `backend/tests/analysis.test.js` covering all `computeAnalysis` aggregations.

### Smoke tests (read-only against live API)
```bash
cd backend && npm run test:smoke
# or directly:
bash scripts/smoke-test.sh
```
26 checks: reachability, GET endpoints, validation-failing POSTs (rejected before any Sheet write), analysis response shape. Cleans up any stale test rows from previous runs before testing.

## Current build status
Everything is built and running end-to-end.

- `backend/` — fully implemented
- `frontend/` — fully implemented
- Google Sheets integration — live (credentials + SHEET_ID configured)
- Tests — 18 unit tests + 26 smoke tests, all passing

## What's needed before this runs (user-provided)
1. A Google Cloud project with the Sheets API enabled
2. A service account + downloaded JSON key → `backend/config/credentials.json`
3. A Google Sheet created, shared with the service account's email (edit access)
4. The Sheet ID (from its URL) → `backend/.env` as `SHEET_ID`

## Conventions to follow
- Keep backend route handlers thin — business logic belongs in `services/`, not routes.
- Date strings are always `YYYY-MM-DD` — never introduce a different format.
- `categories` is always an array in the API (even single-category expenses).
  Stored as comma-separated in the sheet; split back to array on read.
- Validate categories against the `Categories` tab before saving an expense.
- Validate `paymentMode` against the `VALID_PAYMENT_MODES` constant in `routes/expenses.js`.
- `ensureSheetStructure()` is the single place that sets up sheet tabs, headers, seeds,
  and migrations. Keep all structural sheet changes there.
- Inline "add item" inputs inside existing forms must use `<div>` (not `<form>`) +
  `type="button"` + `onKeyDown` for Enter, to avoid nested form HTML invalidity.
- No invoice upload, OCR, file parsing, or "recurring vs discretionary" auto-tagging
  in Phase 1. Flag it as Phase 2 if asked.
