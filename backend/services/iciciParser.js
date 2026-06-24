const XLSX = require('xlsx');

const MERCHANT_PATTERNS = [
  [/zomato/i,                        'Zomato'],
  [/swiggy/i,                        'Swiggy'],
  [/blinkit/i,                       'Blinkit'],
  [/(amazon|amzn)/i,                 'Amazon'],
  [/flipkart/i,                      'Flipkart'],
  [/(bigbasket|bbnow)/i,             'BigBasket'],
  [/zepto/i,                         'Zepto'],
  [/instamart/i,                     'Instamart'],
  [/myntra/i,                        'Myntra'],
  [/(pharmeasy|1mg|apollo pha)/i,    'PharmEasy'],
  [/netflix/i,                       'Netflix'],
  [/(hotstar|jiohotstar)/i,          'Hotstar'],
  [/spotify/i,                       'Spotify'],
  [/\bola\b/i,                       'Ola'],
  [/\buber\b/i,                      'Uber'],
  [/rapido/i,                        'Rapido'],
  [/snabbit/i,                       'Snabbit'],
  [/meesho/i,                        'Meesho'],
  [/(prime vide|prime video)/i,      'Amazon'],
  [/zee5/i,                          'Zee5'],
  [/(bharat petr|bpcl|hpcl|iocl)/i, 'Offline Store'],
  [/rentomojo/i,                     'Offline Store'],
  [/nobroker/i,                      'Offline Store'],
];

const CATEGORY_MAP = [
  [/zomato|swiggy/i,                          'Food Delivery'],
  [/(blinkit|bigbasket|zepto|instamart)/i,    'Groceries'],
  [/(netflix|hotstar|spotify|zee5|apple med|prime vide)/i, 'Subscriptions'],
  [/(pharmeasy|1mg|apollo pha)/i,             'Pharmacy'],
  [/(rapido|uber|\bola\b)/i,                  'Transport'],
  [/(bharat petr|bpcl|hpcl|mps\/)/i,         'Transport'],
  [/(groww|mutual fun|nse clearing|icici pru)/i, 'Investments'],
];

function detectMerchant(remarks) {
  for (const [re, name] of MERCHANT_PATTERNS) {
    if (re.test(remarks)) return name;
  }
  return '';
}

function detectCategory(remarks) {
  for (const [re, cat] of CATEGORY_MAP) {
    if (re.test(remarks)) return cat;
  }
  return 'Other';
}

function detectPaymentMode(remarks) {
  if (/^UPI\//i.test(remarks))                return 'UPI';
  if (/^NFS\//i.test(remarks))                return 'Cash';
  if (/^MPS\//i.test(remarks))                return 'Debit Card';
  if (/^(ACH|NEFT|MMT|BIL|INF|CMS)/i.test(remarks)) return 'Net Banking';
  return 'UPI';
}

// Returns: 'expense' | 'cash' | 'refund' | 'credit' | 'investment' | 'transfer'
function detectType(remarks, deposit) {
  if (deposit > 0) {
    if (/RFND|refund|gpayrefund/i.test(remarks)) return 'refund';
    return 'credit';
  }
  if (/(groww|mutual fun|nse clearing|icici pru)/i.test(remarks)) return 'investment';
  if (/(CC BillPay|credit card bill)/i.test(remarks))              return 'transfer';
  if (/^NFS\/CASH WDL/i.test(remarks))                             return 'cash';
  if (/^(MMT\/IMPS|BIL\/INFT|INF\/INFT|NEFT-)/i.test(remarks))   return 'transfer';
  return 'expense';
}

function convertDate(raw) {
  // DD/MM/YYYY → YYYY-MM-DD
  const s = String(raw).trim();
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return '';
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function toFloat(val) {
  return parseFloat(String(val).replace(/,/g, '')) || 0;
}

function parseICICIStatement(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Find header row — must contain both "S No." and "Withdrawal"
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].map(c => String(c).trim());
    if (cells.includes('S No.') && cells.some(c => c.includes('Withdrawal'))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) throw new Error('Unrecognised format — could not find transaction header row');

  const header = rows[headerIdx].map(c => String(c).trim());
  const idx = {
    sno:        header.findIndex(h => h === 'S No.'),
    txDate:     header.findIndex(h => h === 'Transaction Date'),
    valueDate:  header.findIndex(h => h === 'Value Date'),
    remarks:    header.findIndex(h => h.includes('Transaction Remarks')),
    withdrawal: header.findIndex(h => h.includes('Withdrawal')),
    deposit:    header.findIndex(h => h.includes('Deposit')),
    balance:    header.findIndex(h => h.includes('Balance')),
  };

  const transactions = [];
  let current = null;
  let firstBalance = null; // closing balance of the first transaction row
  let firstWithdrawal = 0;
  let firstDeposit = 0;
  let lastBalance = null;  // closing balance of the last transaction row

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const sno     = String(row[idx.sno]     || '').trim();
    const remarks = String(row[idx.remarks] || '').trim();

    if (remarks.includes('Legends Used') || sno.includes('Legends Used')) break;

    if (sno) {
      if (current) transactions.push(current);

      const withdrawal = toFloat(row[idx.withdrawal]);
      const deposit    = toFloat(row[idx.deposit]);
      const balance    = toFloat(row[idx.balance]);
      const rawDate    = String(row[idx.txDate] || row[idx.valueDate] || '').trim();
      const type       = detectType(remarks, deposit);

      if (firstBalance === null) {
        firstBalance    = balance;
        firstWithdrawal = withdrawal;
        firstDeposit    = deposit;
      }
      lastBalance = balance;

      current = {
        sno,
        date:        convertDate(rawDate),
        amount:      withdrawal > 0 ? withdrawal : deposit,
        withdrawal,
        deposit,
        balance,
        remarks,
        detectedMerchant:    detectMerchant(remarks),
        detectedCategory:    detectCategory(remarks),
        detectedPaymentMode: detectPaymentMode(remarks),
        type,
      };
    } else if (remarks && current) {
      // Continuation row — append remarks
      current.remarks += remarks;
      current.detectedMerchant    = detectMerchant(current.remarks);
      current.detectedCategory    = detectCategory(current.remarks);
      current.detectedPaymentMode = detectPaymentMode(current.remarks);
      current.type                = detectType(current.remarks, current.deposit);
    }
  }
  if (current) transactions.push(current);

  // Opening balance = balance before the first transaction
  // balance_after = opening - withdrawal + deposit → opening = balance_after + withdrawal - deposit
  const openingBalance = firstBalance !== null
    ? Math.round((firstBalance + firstWithdrawal - firstDeposit) * 100) / 100
    : null;
  const closingBalance = lastBalance !== null
    ? Math.round(lastBalance * 100) / 100
    : null;

  return { transactions, openingBalance, closingBalance };
}

module.exports = { parseICICIStatement };
