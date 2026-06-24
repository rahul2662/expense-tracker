import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { getMerchants, addMerchant } from '../api';

export default function MerchantManager() {
  const [merchants, setMerchants] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    getMerchants().then(setMerchants).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const names = name.split(',').map((s) => s.trim()).filter(Boolean);
    if (names.length === 0) return;
    setLoading(true);
    setStatus(null);
    const added = [], skipped = [], errors = [];
    let latest = merchants;
    for (const n of names) {
      try {
        latest = await addMerchant(n);
        if (latest.includes(n)) added.push(n); else skipped.push(n);
      } catch {
        errors.push(n);
      }
    }
    setMerchants(latest);
    setName('');
    setLoading(false);
    if (errors.length > 0) {
      setStatus({ type: 'error', message: `Failed: ${errors.join(', ')}` });
    } else if (skipped.length > 0) {
      setStatus({ type: 'success', message: `Added: ${added.join(', ')}. Already existed: ${skipped.join(', ')}.` });
    } else {
      setStatus({ type: 'success', message: `Added: ${added.join(', ')}.` });
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700">All Merchants</h3>
          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {merchants.length}
          </span>
        </div>
        {merchants.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">No merchants yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {merchants.map((m) => (
              <span key={m} className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                {m}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Add Merchants</h3>
        <p className="text-xs text-slate-400 mb-3">Separate multiple names with commas — e.g. <span className="text-slate-500 font-medium">Zepto, D-Mart</span></p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Merchant name(s)"
            required
            className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            {loading ? 'Adding…' : 'Add'}
          </button>
        </form>
        {status && (
          <div className={`mt-3 text-xs rounded-xl px-4 py-2.5 ${
            status.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
          }`}>
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
}
