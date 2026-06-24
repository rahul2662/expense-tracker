import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import TransactionList, { Breadcrumb } from './TransactionList';

const COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#f97316','#14b8a6','#ec4899','#3b82f6'];
const fmt = (v) => `₹${Number(v).toLocaleString('en-IN')}`;

function parseCats(str) {
  return (str || '').split(',').map((c) => c.trim()).filter(Boolean);
}

function ChartTooltip({ active, payload, labelKey }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-xl shadow-lg">
      <p className="font-semibold">{payload[0].payload[labelKey]}</p>
      <p className="text-slate-300 mt-0.5">{fmt(payload[0].value)}</p>
    </div>
  );
}

function HBarChart({ data, dataKey, labelKey, onClick, hint }) {
  return (
    <>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 44)}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 56, top: 0, bottom: 0 }} onClick={onClick} style={{ cursor: 'pointer' }}>
          <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey={labelKey} tick={{ fontSize: 13, fill: '#475569' }} width={128} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip labelKey={labelKey} />} cursor={{ fill: '#f8fafc' }} />
          <Bar dataKey={dataKey} radius={[0, 6, 6, 0]} maxBarSize={32}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {hint && <p className="text-xs text-slate-400 mt-3">{hint}</p>}
    </>
  );
}

export default function CategoryChart({ data, byCategoryMerchant = {}, expenses = [] }) {
  const [drillCategory, setDrillCategory] = useState(null);
  const [drillMerchant, setDrillMerchant] = useState(null);

  if (!data || data.length === 0) {
    return <p className="text-slate-400 text-sm text-center py-8">No category data.</p>;
  }

  // Level 2: transactions for category + merchant
  if (drillCategory && drillMerchant) {
    const filtered = expenses.filter((e) => {
      const cats = parseCats(e.category);
      const merchantMatch = drillMerchant === '(No merchant)' ? !e.merchant : e.merchant === drillMerchant;
      return cats.includes(drillCategory) && merchantMatch;
    });
    return (
      <div>
        <Breadcrumb crumbs={['Categories', drillCategory, drillMerchant]} onBack={() => setDrillMerchant(null)} />
        <TransactionList expenses={filtered} />
      </div>
    );
  }

  // Level 1: merchants for category
  if (drillCategory) {
    const merchantData = byCategoryMerchant[drillCategory] || [];
    return (
      <div>
        <Breadcrumb crumbs={['Categories', drillCategory]} onBack={() => setDrillCategory(null)} />
        {merchantData.length === 0 ? (
          <p className="text-slate-400 text-sm">No merchant data for this category.</p>
        ) : (
          <HBarChart
            data={merchantData}
            dataKey="total"
            labelKey="merchant"
            onClick={(cd) => { if (cd?.activePayload?.length) setDrillMerchant(cd.activePayload[0].payload.merchant); }}
            hint="Click a merchant to see transactions"
          />
        )}
      </div>
    );
  }

  // Level 0: categories
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-5">Spend by Category</h3>
      <HBarChart
        data={data}
        dataKey="total"
        labelKey="category"
        onClick={(cd) => { if (cd?.activePayload?.length) setDrillCategory(cd.activePayload[0].payload.category); }}
        hint="Click a category to see merchant breakdown"
      />
    </div>
  );
}
