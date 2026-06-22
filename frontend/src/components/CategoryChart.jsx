import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#f97316','#14b8a6','#ec4899','#3b82f6'];

const fmt = (v) => `₹${Number(v).toLocaleString('en-IN')}`;

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-xl shadow-lg">
      <p className="font-semibold">{payload[0].payload.category}</p>
      <p className="text-slate-300 mt-0.5">{fmt(payload[0].value)}</p>
    </div>
  );
}

export default function CategoryChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-slate-400 text-sm text-center py-8">No category data.</p>;
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-5">Spend by Category</h3>
      <ResponsiveContainer width="100%" height={Math.max(220, data.length * 44)}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 56, top: 0, bottom: 0 }}>
          <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="category" tick={{ fontSize: 13, fill: '#475569' }} width={128} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
          <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={32}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
