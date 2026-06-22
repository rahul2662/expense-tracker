# CashFlow.sh — Project Context for Claude Code

## What this is
A personal daily expense tracker for a single user (me), branded **CashFlow.sh**.
Phase 1 (built) covers manual expense entry, multi-category tagging, payment mode
tracking, spend analysis/charts, and inline expense editing. Phase 2 (future, not
in scope yet) will add invoice upload + parsing to auto-split recurring vs.
discretionary spend within a single merchant (e.g. a ₹1000 Blinkit order that's
part groceries, part snacks).

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

### Google Sheet: two tabs in one spreadsheet

**Tab: `Expenses`**
| Column | Header | Type | Notes |
|---|---|---|---|
| A | Date | string `YYYY-MM-DD` | User-editable, defaults to today in UI, can be backdated |
| B | Amount | number | |
| C | Category | string | Comma-separated list — e.g. `"Blinkit, Groceries"` |
| D | Remarks | string | Optional, free text |
| E | Timestamp | ISO string | Auto-set by backend on insert; never shown in UI |
| F | PaymentMode | string | One of: Cash, UPI, Credit Card, Debit Card, Net Banking |

**Tab: `Categories`**
| Column | Type | Notes |
|---|---|---|
| Name | string | One category per row |

- Categories are **user-editable from the UI** — not hardcoded in code.
- An expense can have **multiple categories** (stored comma-separated in column C,
  returned as an array by the API).
- Default seed categories (only inserted if tab is empty on first run):
  Food Delivery, Groceries, Subscriptions, Pharmacy, Pet, Baby, Transport,
  Utilities, Investments, Other.
- `ensureSheetStructure()` also migrates existing sheets to add the PaymentMode
  header (F1) if it doesn't exist yet — safe to call on every startup.

## Backend API contract

Base path: `/api`

- `POST /api/expenses`
  Body: `{ "date": "2026-06-21", "amount": 450, "categories": ["Food Delivery"], "paymentMode": "UPI", "remarks": "Zomato lunch" }`
  Validates: date format, positive amount, all categories exist, paymentMode is valid.
  Appends a row to `Expenses`. Backend sets `Timestamp` server-side.

- `GET /api/expenses?from=YYYY-MM-DD&to=YYYY-MM-DD`
  Returns all expense rows in range (inclusive), most recent first.
  Each row: `{ rowIndex, date, amount, categories[], paymentMode, remarks, timestamp }`.
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

- `GET /api/analysis?from=YYYY-MM-DD&to=YYYY-MM-DD`
  Returns server-computed aggregations:
  ```json
  {
    "total": 18420,
    "byCategory":    [{ "category": "Blinkit",  "total": 6200 }],
    "byMonth":       [{ "month": "2026-06",      "total": 18420 }],
    "byPaymentMode": [{ "paymentMode": "UPI",    "total": 12000 }]
  }
  ```
  `byCategory` counts the full amount for each tagged category (no splitting).

Valid `paymentMode` values: `Cash`, `UPI`, `Credit Card`, `Debit Card`, `Net Banking`.

## Project structure

```
cashflow.sh/
├── backend/
│   ├── server.js                   # Express entry point; calls ensureSheetStructure on startup
│   ├── routes/
│   │   ├── expenses.js             # GET/POST/PUT/DELETE /expenses + GET/POST /categories
│   │   └── analysis.js             # GET /analysis
│   ├── services/
│   │   ├── SheetsClient.js         # All Sheets API calls; exports ensureSheetStructure,
│   │   │                           #   addExpense, getExpenses, updateExpense, deleteExpense,
│   │   │                           #   getCategories, addCategory
│   │   └── analysis.js             # computeAnalysis() — aggregation logic
│   ├── config/
│   │   └── credentials.json        # gitignored — service account key (user provides)
│   ├── .env                        # gitignored — PORT, SHEET_ID, GOOGLE_APPLICATION_CREDENTIALS
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ExpenseForm.jsx      # Add expense: date, amount, payment mode pills, category pills
│   │   │   ├── ExpenseTable.jsx     # List expenses with inline edit modal + delete
│   │   │   ├── CategoryManager.jsx  # Add/list categories (supports comma-separated batch add)
│   │   │   ├── CategoryChart.jsx    # Horizontal bar chart — spend by category (Recharts)
│   │   │   ├── TrendChart.jsx       # Vertical bar chart — monthly trend (Recharts)
│   │   │   └── PaymentModeChart.jsx # Horizontal bar chart — spend by payment mode (Recharts)
│   │   ├── App.jsx                  # Sidebar layout + AnalysisView (stat cards + all 3 charts)
│   │   ├── api.js                   # Fetch wrappers for all backend endpoints
│   │   └── utils.js                 # categoryColor() — deterministic color per category name
│   ├── index.html
│   ├── vite.config.js               # Proxies /api → localhost:3001 in dev
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
└── README.md
```

## Current build status
Everything is built and running end-to-end.

- `backend/` — fully implemented
- `frontend/` — fully implemented
- Google Sheets integration — live (credentials + SHEET_ID configured)

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
- No invoice upload, OCR, file parsing, or "recurring vs discretionary" auto-tagging
  in Phase 1. Flag it as Phase 2 if asked.
