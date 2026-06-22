# CashFlow.sh

> Personal finance tracking, powered by Google Sheets.

A self-hosted expense tracker built for one — fast to use, zero database overhead, and your data lives exactly where you can see it: a Google Sheet you own.

![Stack](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)
![Stack](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white)
![Stack](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Stack](https://img.shields.io/badge/Google_Sheets-API-34A853?style=flat-square&logo=googlesheets&logoColor=white)

---

## Features

- **Log expenses** with date, amount, payment mode, and one or more categories
- **Multi-category tagging** — a single Blinkit order can be tagged as both Groceries and Pet
- **Payment mode tracking** — Cash, UPI, Credit Card, Debit Card, Net Banking
- **Inline editing** — edit any expense without deleting and re-adding
- **Analysis dashboard** — spend by category, monthly trend, and payment mode breakdown
- **Category management** — add categories from the UI; batch-add with comma separation
- **Google Sheets as the database** — open, inspect, and edit raw data anytime
- **Premium UI** — dark sidebar, Inter font, indigo accent, animated charts

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Recharts, Lucide React |
| Backend | Node.js, Express |
| Storage | Google Sheets (via `googleapis`) |
| Auth | Google Service Account (no OAuth flow) |

---

## Project Structure

```
cashflow.sh/
├── backend/
│   ├── server.js
│   ├── routes/
│   │   ├── expenses.js        # expenses + categories endpoints
│   │   └── analysis.js        # aggregation endpoint
│   ├── services/
│   │   ├── SheetsClient.js    # all Sheets API calls
│   │   └── analysis.js        # aggregation logic
│   ├── config/
│   │   └── credentials.json   # gitignored — service account key
│   └── .env                   # gitignored — SHEET_ID etc.
└── frontend/
    └── src/
        ├── components/
        │   ├── ExpenseForm.jsx
        │   ├── ExpenseTable.jsx
        │   ├── CategoryManager.jsx
        │   ├── CategoryChart.jsx
        │   ├── TrendChart.jsx
        │   └── PaymentModeChart.jsx
        ├── App.jsx
        ├── api.js
        └── utils.js
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
SHEET_ID=your_google_sheet_id_here        # from the sheet URL
GOOGLE_APPLICATION_CREDENTIALS=./config/credentials.json
ALLOWED_ORIGINS=http://localhost:5173
```

Place your service account JSON key at `backend/config/credentials.json`.

```bash
npm install
npm run dev
```

On first start, the backend creates the `Expenses` and `Categories` tabs in your sheet and seeds 10 default categories.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Data Model

The sheet has two tabs:

**Expenses** — one row per expense

| Column | Field | Notes |
|---|---|---|
| A | Date | `YYYY-MM-DD` |
| B | Amount | number |
| C | Category | comma-separated — e.g. `Blinkit, Groceries` |
| D | Remarks | optional free text |
| E | Timestamp | ISO string, set on insert, never edited |
| F | PaymentMode | Cash / UPI / Credit Card / Debit Card / Net Banking |

**Categories** — one name per row, drives the category picker in the UI.

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
| `POST` | `/categories` | Add a category (or batch-add via name containing commas) |
| `GET` | `/analysis?from=&to=` | Aggregations: total, byCategory, byMonth, byPaymentMode |

**POST / PUT body:**
```json
{
  "date": "2026-06-21",
  "amount": 850,
  "categories": ["Blinkit", "Groceries"],
  "paymentMode": "UPI",
  "remarks": "Weekly order"
}
```

---

## Why Google Sheets?

No database to provision or back up. The sheet is always open in a browser tab — you can correct a wrong amount, fix a typo, or bulk-import past expenses directly. The backend treats it as an append-only log with indexed deletes; it doesn't care how you got the data in there.

---

## License

MIT
