import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

const fmt = (v) => `₹${Number(v).toLocaleString('en-IN')}`;

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-xl shadow-lg">
      <p className="font-semibold">{label}</p>
      <p className="text-slate-300 mt-0.5">{fmt(payload[0].value)}</p>
    </div>
  );
}

export default function TrendChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-slate-400 text-sm text-center py-8">No monthly data.</p>;
  }

  const max = Math.max(...data.map((d) => d.total));

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-5">Monthly Trend</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
          <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.total === max ? '#6366f1' : '#c7d2fe'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
