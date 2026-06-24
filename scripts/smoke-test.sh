#!/usr/bin/env bash
# Smoke tests for the CashFlow.sh API.
# Read-only: only tests GET endpoints and validation-failing POSTs.
# No data is written to the sheet. Safe to run against your live sheet.
#
# Also cleans up any leftover test data from previous smoke test runs.
#
# Usage: ./scripts/smoke-test.sh
# Requires the backend running on localhost:3001 and python3 on PATH.

BASE="http://localhost:3001/api"
PASS=0
FAIL=0

green() { printf "\033[0;32m✓ %s\033[0m\n" "$1"; }
red()   { printf "\033[0;31m✗ %s\033[0m\n" "$1"; }

check() {
  local label="$1" actual="$2" expected="$3"
  if echo "$actual" | grep -q "$expected"; then
    green "$label"; ((PASS++))
  else
    red "$label (got: ${actual:0:120})"; ((FAIL++))
  fi
}

check_status() {
  local label="$1" status="$2" want="$3"
  if [ "$status" -eq "$want" ]; then
    green "$label"; ((PASS++))
  else
    red "$label (HTTP $status, expected $want)"; ((FAIL++))
  fi
}

TODAY=$(date +%Y-%m-%d)
YEAR_AGO=$(date -v-1y +%Y-%m-%d 2>/dev/null || date -d "1 year ago" +%Y-%m-%d)

echo ""
echo "── CashFlow.sh API Smoke Tests ────────────────────────"
echo ""

# ── reachability ─────────────────────────────────────────────────────────────

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/categories")
if [ "$STATUS" -ne 200 ]; then
  red "backend not reachable at $BASE (HTTP $STATUS)"
  echo ""
  echo "Start the backend first:  cd backend && npm run dev"
  echo ""
  exit 1
fi
green "backend is reachable"
((PASS++))

# ── cleanup: remove leftover test data from previous runs ─────────────────────

echo ""
echo "── Cleanup ─────────────────────────────────────────────"
echo ""

ALL_EXPENSES=$(curl -s "$BASE/expenses?from=$YEAR_AGO&to=$TODAY")

STALE_ROWS=$(echo "$ALL_EXPENSES" | python3 -c "
import sys, json
rows = json.load(sys.stdin)
matches = [str(r['rowIndex']) for r in rows if 'smoke test' in (r.get('remarks') or '')]
print(' '.join(matches))
" 2>/dev/null)

if [ -n "$STALE_ROWS" ]; then
  for ROW in $STALE_ROWS; do
    DEL=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/expenses/$ROW")
    if [ "$DEL" -eq 204 ]; then
      green "deleted stale smoke-test expense (row $ROW)"
      ((PASS++))
    else
      red "failed to delete stale row $ROW (HTTP $DEL)"
      ((FAIL++))
    fi
  done
else
  green "no stale test data found"
  ((PASS++))
fi

# ── categories (read-only) ────────────────────────────────────────────────────

echo ""
echo "── Categories ──────────────────────────────────────────"
echo ""

CATS=$(curl -s "$BASE/categories")
check "GET /categories returns array"    "$CATS" '\['
check "default categories seeded"        "$CATS" 'Groceries'
check "Subscriptions category present"   "$CATS" 'Subscriptions'

BAD_CAT=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/categories" \
  -H "Content-Type: application/json" -d '{}')
check_status "POST /categories rejects missing name (400)" "$BAD_CAT" 400

# ── merchants (read-only) ─────────────────────────────────────────────────────

echo ""
echo "── Merchants ───────────────────────────────────────────"
echo ""

MERCHANTS=$(curl -s "$BASE/merchants")
check "GET /merchants returns array"  "$MERCHANTS" '\['
check "Zomato seeded"                 "$MERCHANTS" 'Zomato'
check "Blinkit seeded"                "$MERCHANTS" 'Blinkit'

# ── expenses (read-only) ──────────────────────────────────────────────────────

echo ""
echo "── Expenses ────────────────────────────────────────────"
echo ""

EXPENSES=$(curl -s "$BASE/expenses?from=$TODAY&to=$TODAY")
check "GET /expenses returns array"         "$EXPENSES" '\['

EXPENSES_RANGE=$(curl -s "$BASE/expenses?from=$YEAR_AGO&to=$TODAY")
check "GET /expenses with range returns array" "$EXPENSES_RANGE" '\['

# Validation-failing POSTs — these are rejected before any Sheet write

BAD_DATE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/expenses" \
  -H "Content-Type: application/json" \
  -d "{\"date\":\"not-a-date\",\"amount\":100,\"category\":\"Groceries\",\"paymentMode\":\"UPI\"}")
check_status "POST /expenses rejects invalid date format (400)" "$BAD_DATE_STATUS" 400

BAD_AMOUNT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/expenses" \
  -H "Content-Type: application/json" \
  -d "{\"date\":\"$TODAY\",\"amount\":-5,\"category\":\"Groceries\",\"paymentMode\":\"UPI\"}")
check_status "POST /expenses rejects negative amount (400)" "$BAD_AMOUNT_STATUS" 400

ZERO_AMOUNT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/expenses" \
  -H "Content-Type: application/json" \
  -d "{\"date\":\"$TODAY\",\"amount\":0,\"category\":\"Groceries\",\"paymentMode\":\"UPI\"}")
check_status "POST /expenses rejects zero amount (400)" "$ZERO_AMOUNT_STATUS" 400

BAD_MODE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/expenses" \
  -H "Content-Type: application/json" \
  -d "{\"date\":\"$TODAY\",\"amount\":100,\"category\":\"Groceries\",\"paymentMode\":\"Cheque\"}")
check_status "POST /expenses rejects unknown paymentMode (400)" "$BAD_MODE_STATUS" 400

MISSING_FIELDS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/expenses" \
  -H "Content-Type: application/json" -d '{}')
check_status "POST /expenses rejects missing required fields (400)" "$MISSING_FIELDS_STATUS" 400

BAD_ROW_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/expenses/1")
check_status "DELETE /expenses/1 rejects invalid rowIndex (400)" "$BAD_ROW_STATUS" 400

# ── analysis (read-only) ──────────────────────────────────────────────────────

echo ""
echo "── Analysis ────────────────────────────────────────────"
echo ""

ANALYSIS=$(curl -s "$BASE/analysis?from=$YEAR_AGO&to=$TODAY")
check "GET /analysis returns total"              "$ANALYSIS" '"total"'
check "GET /analysis returns byCategory"         "$ANALYSIS" '"byCategory"'
check "GET /analysis returns byCategoryMerchant" "$ANALYSIS" '"byCategoryMerchant"'
check "GET /analysis returns byDay"              "$ANALYSIS" '"byDay"'
check "GET /analysis returns byMerchant"         "$ANALYSIS" '"byMerchant"'
check "GET /analysis returns byMonth"            "$ANALYSIS" '"byMonth"'
check "GET /analysis returns byPaymentMode"      "$ANALYSIS" '"byPaymentMode"'
check "GET /analysis returns recurring"          "$ANALYSIS" '"recurring"'

ANALYSIS_EMPTY=$(curl -s "$BASE/analysis?from=2000-01-01&to=2000-01-02")
check "GET /analysis with empty range returns total:0" "$ANALYSIS_EMPTY" '"total":0'

# ── summary ───────────────────────────────────────────────────────────────────

echo ""
echo "────────────────────────────────────────────────────────"
printf "  Passed: \033[0;32m%s\033[0m  |  Failed: \033[0;31m%s\033[0m\n" "$PASS" "$FAIL"
echo "────────────────────────────────────────────────────────"
echo ""

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
