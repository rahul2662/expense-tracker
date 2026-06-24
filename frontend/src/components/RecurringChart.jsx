import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import TransactionList, { Breadcrumb } from './TransactionList';

const COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f97316','#eab308',
  '#22c55e','#14b8a6','#0ea5e9','#f43f5e','#a3e635',
];

const fmt = (v) => `₹${Number(v).toLocaleString('en-IN')}`;

function parseCats(str) {
  return (str || '').split(',').map((c) => c.trim()).filter(Boolean);
}

function getMerchantCategories(expenses, merchant) {
  const catMap = {};
  for (const e of expenses) {
    if (e.merchant !== merchant) continue;
    const cats = parseCats(e.category);
    for (const cat of cats.length ? cats : ['Uncategorized']) {
      catMap[cat] = (catMap[cat] || 0) + e.amount;
    }
  }
  return Object.entries(catMap)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

function FreqTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { merchant, count, total } = payload[0].payload;
  return (
    <div className="bg-slate-900 text-white text-xs px-3 py-2.5 rounded-xl shadow-lg">
      <p className="font-semibold mb-1">{merchant}</p>
      <p className="text-slate-300">{count} transaction{count !== 1 ? 's' : ''}</p>
      <p className="text-slate-400 mt-0.5">{fmt(total)} total</p>
    </div>
  );
}

function CatTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-xl shadow-lg">
      <p className="font-semibold">{payload[0].payload.category}</p>
      <p className="text-slate-300 mt-0.5">{fmt(payload[0].value)}</p>
    </div>
  );
}

export default function RecurringChart({ data, expenses = [] }) {
  const [drillMerchant, setDrillMerchant] = useState(null);
  const [drillCategory, setDrillCategory] = useState(null);

  if (!data || data.length === 0) return null;

  // Level 2: transactions for merchant + category
  if (drillMerchant && drillCategory) {
    const filtered = expenses.filter((e) => {
      const cats = parseCats(e.category);
      return e.merchant === drillMerchant && cats.includes(drillCategory);
    });
    return (
      <div>
        <Breadcrumb crumbs={['Frequency', drillMerchant, drillCategory]} onBack={() => setDrillCategory(null)} />
        <TransactionList expenses={filtered} />
      </div>
    );
  }

  // Level 1: category breakdown for merchant
  if (drillMerchant) {
    const catData = getMerchantCategories(expenses, drillMerchant);
    return (
      <div>
        <Breadcrumb crumbs={['Frequency', drillMerchant]} onBack={() => setDrillMerchant(null)} />
        {catData.length === 0 ? (
          <p className="text-slate-400 text-sm">No category data.</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(180, catData.length * 44)}>
              <BarChart
                data={catData}
                layout="vertical"
                margin={{ left: 0, right: 56, top: 0, bottom: 0 }}
                onClick={(cd) => { if (cd?.activePayload?.length) setDrillCategory(cd.activePayload[0].payload.category); }}
                style={{ cursor: 'pointer' }}
              >
                <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 13, fill: '#475569' }} width={128} axisLine={false} tickLine={false} />
                <Tooltip content={<CatTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={32}>
                  {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-slate-400 mt-3">Click a category to see transactions</p>
          </>
        )}
      </div>
    );
  }

  // Level 0: merchant frequency
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-1">Top Merchants by Frequency</h3>
      <p className="text-xs text-slate-400 mb-5">Number of transactions in selected period</p>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 40)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 0, right: 56, top: 0, bottom: 0 }}
          onClick={(cd) => { if (cd?.activePayload?.length) setDrillMerchant(cd.activePayload[0].payload.merchant); }}
          style={{ cursor: 'pointer' }}
        >
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="merchant" tick={{ fontSize: 13, fill: '#475569' }} width={128} axisLine={false} tickLine={false} />
          <Tooltip content={<FreqTooltip />} cursor={{ fill: '#f8fafc' }} />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={32}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-400 mt-3">Click a merchant to see category breakdown</p>
    </div>
  );
}
