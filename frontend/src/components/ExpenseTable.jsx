import { useState, useEffect, useCallback, useMemo } from 'react';
import { Trash2, RefreshCw, Pencil, X, Banknote, CreditCard, Smartphone, Globe, Wallet, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { getExpenses, updateExpense, deleteExpense, getCategories, getMerchants, addMerchant } from '../api';
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

function EditModal({ expense, allCategories, allMerchants: initialMerchants, onSave, onClose }) {
  const [form, setForm] = useState({
    date: expense.date,
    amount: expense.amount,
    remarks: expense.remarks,
  });
  const [category, setCategory] = useState(expense.category || '');
  const [merchant, setMerchant] = useState(expense.merchant || '');
  const [paymentMode, setPaymentMode] = useState(expense.paymentMode || '');
  const [allMerchants, setAllMerchants] = useState(initialMerchants || []);
  const [newMerchant, setNewMerchant] = useState('');
  const [addingMerchant, setAddingMerchant] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleAddMerchant() {
    const trimmed = newMerchant.trim();
    if (!trimmed) return;
    setAddingMerchant(true);
    try {
      const updated = await addMerchant(trimmed);
      setAllMerchants(updated);
      setMerchant(trimmed);
      setNewMerchant('');
    } catch {
      // silently ignore duplicate
    } finally {
      setAddingMerchant(false);
    }
  }

  async function handleSave() {
    if (!category) { setError('Select a category.'); return; }
    if (!paymentMode) { setError('Select a payment mode.'); return; }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateExpense(expense.rowIndex, {
        ...form,
        amount: parseFloat(form.amount),
        category,
        paymentMode,
        merchant,
      });
      onSave(updated);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">Category</label>
              {category && (
                <button type="button" onClick={() => setCategory('')}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 p-2.5 border border-slate-200 rounded-xl bg-slate-50 min-h-[44px]">
              {allCategories.map((cat) => {
                const active = category === cat;
                return (
                  <button key={cat} type="button" onClick={() => setCategory(active ? '' : cat)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      active
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-200'
                        : `${categoryColor(cat)} hover:opacity-80`
                    }`}>
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                Merchant <span className="normal-case font-normal text-slate-400">(optional)</span>
              </label>
              {merchant && (
                <button type="button" onClick={() => setMerchant('')}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 p-2.5 border border-slate-200 rounded-xl bg-slate-50 min-h-[44px]">
              {allMerchants.map((m) => {
                const active = merchant === m;
                return (
                  <button key={m} type="button" onClick={() => setMerchant(active ? '' : m)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      active
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-200'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                    }`}>
                    {m}
                  </button>
                );
              })}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newMerchant}
                  onChange={(e) => setNewMerchant(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddMerchant(); } }}
                  placeholder="Add new…"
                  className="w-20 border border-dashed border-slate-300 rounded-full px-2 py-0.5 text-xs bg-transparent focus:outline-none focus:border-indigo-400 text-slate-500 placeholder-slate-300"
                />
                <button
                  type="button"
                  onClick={handleAddMerchant}
                  disabled={addingMerchant || !newMerchant.trim()}
                  className="p-0.5 rounded-full text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
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
  const [allMerchants, setAllMerchants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [editing, setEditing] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterMode, setFilterMode] = useState('');
  const [filterMerchant, setFilterMerchant] = useState('');

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, cats, merchants] = await Promise.all([getExpenses({ from, to }), getCategories(), getMerchants()]);
      setExpenses(data);
      setAllCategories(cats);
      setAllMerchants(merchants);
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

  // Client-side sort + filter
  const displayed = useMemo(() => {
    let result = [...expenses];
    if (filterMode)     result = result.filter(e => e.paymentMode === filterMode);
    if (filterMerchant) result = result.filter(e => e.merchant === filterMerchant);
    result.sort((a, b) => sortOrder === 'asc'
      ? a.date.localeCompare(b.date)
      : b.date.localeCompare(a.date));
    return result;
  }, [expenses, filterMode, filterMerchant, sortOrder]);

  // Options built from loaded data only
  const modesInData    = useMemo(() => [...new Set(expenses.map(e => e.paymentMode).filter(Boolean))], [expenses]);
  const merchantsInData = useMemo(() => [...new Set(expenses.map(e => e.merchant).filter(Boolean))].sort(), [expenses]);

  const total         = expenses.reduce((s, e) => s + e.amount, 0);
  const filteredTotal = displayed.reduce((s, e) => s + e.amount, 0);
  const filtersActive = !!(filterMode || filterMerchant);

  function clearFilters() { setFilterMode(''); setFilterMerchant(''); }

  return (
    <>
      {editing && (
        <EditModal
          expense={editing}
          allCategories={allCategories}
          allMerchants={allMerchants}
          onSave={handleSaved}
          onClose={() => setEditing(null)}
        />
      )}

      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          {/* Date range + refresh + total */}
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
                <p className="text-xs text-slate-400 uppercase tracking-wider">
                  {filtersActive ? `${displayed.length} of ${expenses.length}` : `${expenses.length} expenses`}
                </p>
                <p className="text-lg font-bold text-slate-900">
                  ₹{(filtersActive ? filteredTotal : total).toLocaleString('en-IN')}
                  {filtersActive && <span className="text-xs font-normal text-slate-400 ml-1">filtered</span>}
                </p>
              </div>
            )}
          </div>

          {/* Filters row — only shown when data is loaded */}
          {expenses.length > 0 && (
            <div className="flex flex-wrap gap-x-5 gap-y-2 items-center pt-1 border-t border-slate-100">
              {/* Payment mode pills */}
              {modesInData.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider shrink-0">Mode</span>
                  <div className="flex flex-wrap gap-1.5">
                    {modesInData.map(mode => (
                      <button
                        key={mode}
                        onClick={() => setFilterMode(filterMode === mode ? '' : mode)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                          filterMode === mode
                            ? `${MODE_COLORS[mode] || 'bg-slate-200 text-slate-700'} ring-2 ring-offset-1 ring-current`
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Merchant dropdown */}
              {merchantsInData.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider shrink-0">Merchant</span>
                  <select
                    value={filterMerchant}
                    onChange={e => setFilterMerchant(e.target.value)}
                    className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                  >
                    <option value="">All</option>
                    {merchantsInData.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              )}

              {/* Clear */}
              {filtersActive && (
                <button onClick={clearFilters} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium ml-auto">
                  Clear filters
                </button>
              )}
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}
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
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <button
                      onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
                      className="flex items-center gap-1 hover:text-slate-700 transition-colors"
                    >
                      Date
                      {sortOrder === 'desc'
                        ? <ArrowDown className="w-3 h-3" />
                        : <ArrowUp className="w-3 h-3" />}
                    </button>
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Mode</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Merchant</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Remarks</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayed.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-400 text-sm">
                      No expenses match the current filters.{' '}
                      <button onClick={clearFilters} className="text-indigo-600 hover:underline">Clear filters</button>
                    </td>
                  </tr>
                ) : displayed.map((e) => (
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
                      {e.category ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColor(e.category)}`}>
                          {e.category}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">
                      {e.merchant || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 max-w-[140px] truncate">{e.remarks}</td>
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
