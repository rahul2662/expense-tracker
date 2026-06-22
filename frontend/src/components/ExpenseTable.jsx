import { useState, useEffect, useCallback } from 'react';
import { Trash2, RefreshCw, Pencil, X, CheckCircle2, Banknote, CreditCard, Smartphone, Globe, Wallet } from 'lucide-react';
import { getExpenses, updateExpense, deleteExpense, getCategories } from '../api';
import { categoryColor } from '../utils';

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function today() { return new Date().toISOString().slice(0, 10); }

const PAYMENT_MODES = [
  { id: 'UPI',         Icon: Smartphone },
  { id: 'Credit Card', Icon: CreditCard  },
  { id: 'Debit Card',  Icon: Wallet      },
  { id: 'Cash',        Icon: Banknote    },
  { id: 'Net Banking', Icon: Globe       },
];

const MODE_COLORS = {
  'UPI':         'bg-indigo-100 text-indigo-700',
  'Credit Card': 'bg-blue-100 text-blue-700',
  'Debit Card':  'bg-sky-100 text-sky-700',
  'Cash':        'bg-emerald-100 text-emerald-700',
  'Net Banking': 'bg-amber-100 text-amber-700',
};

function EditModal({ expense, allCategories, onSave, onClose }) {
  const [form, setForm] = useState({
    date: expense.date,
    amount: expense.amount,
    remarks: expense.remarks,
  });
  const [selected, setSelected] = useState([...expense.categories]);
  const [paymentMode, setPaymentMode] = useState(expense.paymentMode || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function toggleCat(cat) {
    setSelected((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  }

  async function handleSave() {
    if (selected.length === 0) { setError('Select at least one category.'); return; }
    if (!paymentMode) { setError('Select a payment mode.'); return; }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateExpense(expense.rowIndex, {
        ...form,
        amount: parseFloat(form.amount),
        categories: selected,
        paymentMode,
      });
      onSave(updated);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">Edit Expense</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Amount (₹)</label>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                min="0.01" step="0.01"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Payment Mode</label>
            <div className="grid grid-cols-5 gap-1.5">
              {PAYMENT_MODES.map(({ id, Icon }) => (
                <button key={id} type="button" onClick={() => setPaymentMode(id)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                    paymentMode === id
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-slate-200 text-slate-500 hover:border-indigo-300 bg-slate-50'
                  }`}>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="leading-tight text-center" style={{ fontSize: '10px' }}>{id}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">
              Categories {selected.length > 0 && <span className="text-indigo-600 normal-case font-normal ml-1">{selected.length} selected</span>}
            </label>
            <div className="flex flex-wrap gap-1.5 p-2.5 border border-slate-200 rounded-xl bg-slate-50 min-h-[44px]">
              {allCategories.map((cat) => {
                const active = selected.includes(cat);
                return (
                  <button key={cat} type="button" onClick={() => toggleCat(cat)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      active ? 'bg-indigo-600 text-white' : `${categoryColor(cat)} hover:opacity-80`
                    }`}>
                    {active && <CheckCircle2 className="w-2.5 h-2.5" />}
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Remarks</label>
            <input type="text" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="Optional"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white" />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>}
        </div>
        <div className="px-6 pb-5 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExpenseTable() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [expenses, setExpenses] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [editing, setEditing] = useState(null);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, cats] = await Promise.all([getExpenses({ from, to }), getCategories()]);
      setExpenses(data);
      setAllCategories(cats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  async function handleDelete(rowIndex) {
    if (!confirm('Delete this expense?')) return;
    setDeleting(rowIndex);
    try {
      await deleteExpense(rowIndex);
      setExpenses((prev) => prev.filter((e) => e.rowIndex !== rowIndex));
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  }

  function handleSaved(updated) {
    setExpenses((prev) => prev.map((e) => e.rowIndex === updated.rowIndex ? updated : e));
    setEditing(null);
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <>
      {editing && (
        <EditModal
          expense={editing}
          allCategories={allCategories}
          onSave={handleSaved}
          onClose={() => setEditing(null)}
        />
      )}

      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">From</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">To</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors" />
            </div>
            <button onClick={fetchExpenses} disabled={loading}
              className="flex items-center gap-2 bg-indigo-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {expenses.length > 0 && (
              <div className="ml-auto text-right">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Total</p>
                <p className="text-lg font-bold text-slate-900">₹{total.toLocaleString('en-IN')}</p>
              </div>
            )}
          </div>
          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="px-6 py-12 text-center text-slate-400 text-sm">Loading…</div>
          ) : expenses.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-slate-400 text-sm">No expenses in this range.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Mode</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Categories</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Remarks</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {expenses.map((e) => (
                  <tr key={e.rowIndex} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-5 py-3.5 text-slate-500 font-medium tabular-nums">{e.date}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-900 tabular-nums">
                      ₹{e.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-3.5">
                      {e.paymentMode ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${MODE_COLORS[e.paymentMode] || 'bg-slate-100 text-slate-600'}`}>
                          {e.paymentMode}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {e.categories.map((cat) => (
                          <span key={cat} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColor(cat)}`}>
                            {cat}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 max-w-[160px] truncate">{e.remarks}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => setEditing(e)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(e.rowIndex)} disabled={deleting === e.rowIndex}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
