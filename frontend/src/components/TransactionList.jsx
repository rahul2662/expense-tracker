import { ChevronLeft } from 'lucide-react';

const fmt = (v) => `₹${Number(v).toLocaleString('en-IN')}`;

function formatDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function Breadcrumb({ crumbs, onBack }) {
  return (
    <div className="flex items-center gap-2 mb-5 flex-wrap">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        {crumbs[0]}
      </button>
      {crumbs.slice(1).map((c, i) => (
        <span key={i} className="flex items-center gap-2">
          <span className="text-slate-300">/</span>
          <span className="text-sm font-semibold text-slate-700">{c}</span>
        </span>
      ))}
    </div>
  );
}

export default function TransactionList({ expenses }) {
  if (!expenses || expenses.length === 0) {
    return <p className="text-slate-400 text-sm py-4 text-center">No transactions found.</p>;
  }

  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500">{expenses.length} transaction{expenses.length !== 1 ? 's' : ''}</p>
        <p className="text-sm font-bold text-slate-800">{fmt(total)}</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
              <th className="text-left px-3 py-2.5 font-medium whitespace-nowrap">Date</th>
              <th className="text-right px-3 py-2.5 font-medium whitespace-nowrap">Amount</th>
              <th className="text-left px-3 py-2.5 font-medium">Categories</th>
              <th className="text-left px-3 py-2.5 font-medium whitespace-nowrap">Mode</th>
              <th className="text-left px-3 py-2.5 font-medium whitespace-nowrap">Merchant</th>
              <th className="text-left px-3 py-2.5 font-medium">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sorted.map((e) => (
              <tr key={e.rowIndex} className="hover:bg-slate-50 transition-colors">
                <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{formatDate(e.date)}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-slate-800 whitespace-nowrap">{fmt(e.amount)}</td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {(e.category || '').split(',').map((c) => c.trim()).filter(Boolean).map((cat) => (
                      <span key={cat} className="inline-block bg-indigo-50 text-indigo-700 text-xs px-1.5 py-0.5 rounded-md">
                        {cat}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{e.paymentMode || '—'}</td>
                <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{e.merchant || '—'}</td>
                <td className="px-3 py-2.5 text-slate-400 max-w-xs truncate">{e.remarks || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
