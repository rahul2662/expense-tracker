import { useState, useEffect } from 'react';
import { Banknote, CreditCard, Smartphone, Globe, Wallet, Plus } from 'lucide-react';
import { addExpense, getCategories, getMerchants, addMerchant } from '../api';
import { categoryColor } from '../utils';

function today() { return new Date().toISOString().slice(0, 10); }

const PAYMENT_MODES = [
  { id: 'UPI',         label: 'UPI',         Icon: Smartphone  },
  { id: 'Credit Card', label: 'Credit Card',  Icon: CreditCard  },
  { id: 'Debit Card',  label: 'Debit Card',   Icon: Wallet      },
  { id: 'Cash',        label: 'Cash',         Icon: Banknote    },
  { id: 'Net Banking', label: 'Net Banking',  Icon: Globe       },
];

export default function ExpenseForm() {
  const [allCategories, setAllCategories] = useState([]);
  const [allMerchants, setAllMerchants] = useState([]);
  const [form, setForm] = useState({ date: today(), amount: '', remarks: '' });
  const [category, setCategory] = useState('');
  const [merchant, setMerchant] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [newMerchant, setNewMerchant] = useState('');
  const [addingMerchant, setAddingMerchant] = useState(false);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCategories().then(setAllCategories).catch(() => {});
    getMerchants().then(setAllMerchants).catch(() => {});
  }, []);

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

  async function handleSubmit(e) {
    e.preventDefault();
    if (!category) {
      setStatus({ type: 'error', message: 'Select a category.' });
      return;
    }
    if (!paymentMode) {
      setStatus({ type: 'error', message: 'Select a payment mode.' });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      await addExpense({ ...form, amount: parseFloat(form.amount), category, paymentMode, merchant });
      setStatus({ type: 'success', message: 'Expense saved successfully.' });
      setForm({ date: today(), amount: '', remarks: '' });
      setCategory('');
      setMerchant('');
      setPaymentMode('');
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Amount (₹)</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
                min="0.01"
                step="0.01"
                placeholder="0.00"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Payment Mode</label>
            <div className="grid grid-cols-5 gap-2">
              {PAYMENT_MODES.map(({ id, label, Icon }) => {
                const active = paymentMode === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPaymentMode(id)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border text-xs font-medium transition-all ${
                      active
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                        : 'border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="leading-tight text-center">{label}</span>
                  </button>
                );
              })}
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
            <div className="flex flex-wrap gap-2 p-3 border border-slate-200 rounded-xl bg-slate-50 min-h-[52px]">
              {allCategories.map((cat) => {
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(active ? '' : cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      active
                        ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-200'
                        : `${categoryColor(cat)} hover:opacity-80`
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                Merchant
                <span className="normal-case font-normal text-slate-400 ml-1">(optional)</span>
              </label>
              {merchant && (
                <button type="button" onClick={() => setMerchant('')}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 p-3 border border-slate-200 rounded-xl bg-slate-50 min-h-[52px]">
              {allMerchants.map((m) => {
                const active = merchant === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMerchant(active ? '' : m)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      active
                        ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-200'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                    }`}
                  >
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
                  className="w-24 border border-dashed border-slate-300 rounded-full px-2.5 py-1 text-xs bg-transparent focus:outline-none focus:border-indigo-400 text-slate-500 placeholder-slate-300"
                />
                <button
                  type="button"
                  onClick={handleAddMerchant}
                  disabled={addingMerchant || !newMerchant.trim()}
                  className="p-1 rounded-full text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Remarks</label>
            <input
              type="text"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="Optional note"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
            />
          </div>

          {status && (
            <div className={`text-sm rounded-xl px-4 py-3 ${
              status.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}>
              {status.message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white rounded-xl px-4 py-3 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? 'Saving…' : 'Add Expense'}
          </button>
        </form>
      </div>
    </div>
  );
}
