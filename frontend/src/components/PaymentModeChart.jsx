import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const MODE_COLORS = {
  'UPI':         '#6366f1',
  'Credit Card': '#3b82f6',
  'Debit Card':  '#06b6d4',
  'Cash':        '#10b981',
  'Net Banking': '#f59e0b',
  'Unknown':     '#94a3b8',
};

const fmt = (v) => `₹${Number(v).toLocaleString('en-IN')}`;

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-xl shadow-lg">
      <p className="font-semibold">{payload[0].payload.paymentMode}</p>
      <p className="text-slate-300 mt-0.5">{fmt(payload[0].value)}</p>
    </div>
  );
}

export default function PaymentModeChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-slate-400 text-sm text-center py-8">No payment mode data.</p>;
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-5">Spend by Payment Mode</h3>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 52)}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 64, top: 0, bottom: 0 }}>
          <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="paymentMode" tick={{ fontSize: 13, fill: '#475569' }} width={104} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
          <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={36}>
            {data.map((d) => (
              <Cell key={d.paymentMode} fill={MODE_COLORS[d.paymentMode] || MODE_COLORS.Unknown} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
