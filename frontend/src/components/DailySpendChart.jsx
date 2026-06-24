import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import TransactionList from './TransactionList';

const fmt = (v) => `₹${Number(v).toLocaleString('en-IN')}`;

function formatTick(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { date, total } = payload[0].payload;
  return (
    <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-xl shadow-lg">
      <p className="font-semibold">{formatTick(date)}</p>
      <p className="text-slate-300 mt-0.5">{fmt(total)}</p>
      <p className="text-slate-500 mt-0.5 text-[10px]">Click to see transactions</p>
    </div>
  );
}

export default function DailySpendChart({ data, expenses = [] }) {
  const [selectedDate, setSelectedDate] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-5">Daily Spend</h3>
        <p className="text-slate-400 text-sm">No daily data.</p>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.total));

  function handleClick(chartData) {
    if (!chartData?.activePayload?.length) return;
    const date = chartData.activePayload[0].payload.date;
    setSelectedDate((prev) => (prev === date ? null : date));
  }

  const dayExpenses = selectedDate ? expenses.filter((e) => e.date === selectedDate) : [];

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-5">Daily Spend</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }} onClick={handleClick} style={{ cursor: 'pointer' }}>
          <XAxis
            dataKey="date"
            tickFormatter={formatTick}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
          <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={28}>
            {data.map((entry, i) => {
              const isSelected = entry.date === selectedDate;
              const isMax = entry.total === max && !selectedDate;
              const fill = isSelected ? '#f59e0b' : isMax ? '#ec4899' : '#6366f1';
              const opacity = selectedDate && !isSelected ? 0.35 : isMax || isSelected ? 1 : 0.75;
              return <Cell key={i} fill={fill} fillOpacity={opacity} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {!selectedDate && (
        <p className="text-xs text-slate-400 mt-3">Click a bar to see transactions</p>
      )}

      {selectedDate && (
        <div className="mt-5 border-t border-slate-100 pt-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              {formatTick(selectedDate)}
            </p>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              ✕ Clear
            </button>
          </div>
          <TransactionList expenses={dayExpenses} />
        </div>
      )}
    </div>
  );
}
