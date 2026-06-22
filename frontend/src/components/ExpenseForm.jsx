import { useState, useEffect } from 'react';
import { CheckCircle2, Banknote, CreditCard, Smartphone, Globe, Wallet } from 'lucide-react';
import { addExpense, getCategories } from '../api';
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
  const [form, setForm] = useState({ date: today(), amount: '', remarks: '' });
  const [selected, setSelected] = useState([]);
  const [paymentMode, setPaymentMode] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCategories().then(setAllCategories).catch(() => {});
  }, []);

  function toggleCategory(cat) {
    setSelected((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (selected.length === 0) {
      setStatus({ type: 'error', message: 'Select at least one category.' });
      return;
    }
    if (!paymentMode) {
      setStatus({ type: 'error', message: 'Select a payment mode.' });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      await addExpense({ ...form, amount: parseFloat(form.amount), categories: selected, paymentMode });
      setStatus({ type: 'success', message: 'Expense saved successfully.' });
      setForm({ date: today(), amount: '', remarks: '' });
      setSelected([]);
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
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">Categories</label>
              {selected.length > 0 && (
                <span className="text-xs font-medium text-indigo-600">{selected.length} selected</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 p-3 border border-slate-200 rounded-xl bg-slate-50 min-h-[52px]">
              {allCategories.map((cat) => {
                const active = selected.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      active
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : `${categoryColor(cat)} hover:opacity-80`
                    }`}
                  >
                    {active && <CheckCircle2 className="w-3 h-3" />}
                    {cat}
                  </button>
                );
              })}
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
