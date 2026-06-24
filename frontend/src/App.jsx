import { useState } from 'react';
import { PlusCircle, ReceiptText, BarChart3, Tags, Wallet, Store, Upload } from 'lucide-react';
import ExpenseForm from './components/ExpenseForm';
import ExpenseTable from './components/ExpenseTable';
import CategoryManager from './components/CategoryManager';
import MerchantManager from './components/MerchantManager';
import ImportStatement from './components/ImportStatement';
import CategoryChart from './components/CategoryChart';
import TrendChart from './components/TrendChart';
import PaymentModeChart from './components/PaymentModeChart';
import DailySpendChart from './components/DailySpendChart';
import RecurringChart from './components/RecurringChart';
import { getAnalysis, getExpenses } from './api';

const NAV = [
  { id: 'add',        label: 'Add Expense', Icon: PlusCircle  },
  { id: 'expenses',   label: 'Expenses',    Icon: ReceiptText },
  { id: 'analysis',   label: 'Analysis',    Icon: BarChart3   },
  { id: 'categories', label: 'Categories',  Icon: Tags        },
  { id: 'merchants',  label: 'Merchants',   Icon: Store       },
  { id: 'import',     label: 'Import',      Icon: Upload      },
];

const PAGE_TITLES = {
  add: 'Add Expense',
  expenses: 'Expenses',
  analysis: 'Analysis',
  categories: 'Categories',
  merchants: 'Merchants',
  import:    'Import Statement',
};

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function today() { return new Date().toISOString().slice(0, 10); }

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1.5">{sub}</p>}
    </div>
  );
}

function AnalysisView() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [analysis, setAnalysis] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [analysisData, expenseData] = await Promise.all([
        getAnalysis({ from, to }),
        getExpenses({ from, to }),
      ]);
      setAnalysis(analysisData);
      setExpenses(expenseData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const topCat = analysis?.byCategory[0];
  const topMode = analysis?.byPaymentMode[0];
  const topMerchant = analysis?.byMerchant?.[0];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50" />
          </div>
          <button onClick={load} disabled={loading}
            className="bg-indigo-600 text-white rounded-xl px-5 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {loading ? 'Loading…' : 'Load'}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>

      {analysis && !loading && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Total Spend"
              value={`₹${analysis.total.toLocaleString('en-IN')}`}
              sub={`${analysis.byMonth.length} month${analysis.byMonth.length !== 1 ? 's' : ''}`}
            />
            <StatCard
              label="Top Category"
              value={topCat?.category ?? '—'}
              sub={topCat ? `₹${topCat.total.toLocaleString('en-IN')}` : 'no data'}
            />
            <StatCard
              label="Top Payment Mode"
              value={topMode?.paymentMode ?? '—'}
              sub={topMode ? `₹${topMode.total.toLocaleString('en-IN')}` : 'no data'}
            />
            <StatCard
              label="Top Merchant"
              value={topMerchant?.merchant ?? '—'}
              sub={topMerchant ? `₹${topMerchant.total.toLocaleString('en-IN')}` : 'no data'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <CategoryChart data={analysis.byCategory} byCategoryMerchant={analysis.byCategoryMerchant} expenses={expenses} />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <DailySpendChart data={analysis.byDay} expenses={expenses} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <PaymentModeChart data={analysis.byPaymentMode} />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <TrendChart data={analysis.byMonth} />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <RecurringChart data={analysis.recurring} expenses={expenses} />
          </div>
        </>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('add');

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-60 bg-slate-900 flex flex-col z-10">
        <div className="px-4 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">CashFlow.sh</p>
              <p className="text-slate-500 text-xs mt-0.5">Personal Finance</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-slate-800">
          <p className="text-slate-600 text-xs">
            {new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-60 flex-1 min-h-screen px-8 py-8">
        <div className={tab === 'import' ? 'w-full' : tab === 'analysis' ? 'max-w-6xl' : 'max-w-4xl'}>
          <h1 className="text-2xl font-bold text-slate-900 mb-6">{PAGE_TITLES[tab]}</h1>
          {tab === 'add'        && <ExpenseForm />}
          {tab === 'expenses'   && <ExpenseTable />}
          {tab === 'analysis'   && <AnalysisView />}
          {tab === 'categories' && <CategoryManager />}
          {tab === 'merchants'  && <MerchantManager />}
          {tab === 'import'     && <ImportStatement />}
        </div>
      </main>
    </div>
  );
}
