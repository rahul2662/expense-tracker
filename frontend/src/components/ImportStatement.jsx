import { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, RefreshCw, ArrowRight, X, Trash2 } from 'lucide-react';
import { previewImport, confirmImport, getCategories } from '../api';

const STATUS_META = {
  expense:    { label: 'New',        color: 'bg-emerald-100 text-emerald-700' },
  cash:       { label: 'Cash',       color: 'bg-sky-100 text-sky-700' },
  duplicate:  { label: 'Duplicate',  color: 'bg-amber-100 text-amber-700' },
  refund:     { label: 'Refund',     color: 'bg-blue-100 text-blue-700' },
  credit:     { label: 'Credit',     color: 'bg-slate-100 text-slate-500' },
  investment: { label: 'Investment', color: 'bg-purple-100 text-purple-600' },
  transfer:   { label: 'Transfer',   color: 'bg-slate-100 text-slate-500' },
};

const FILTER_TABS = [
  { id: 'all',       label: 'All' },
  { id: 'expense',   label: 'New' },
  { id: 'duplicate', label: 'Duplicates' },
  { id: 'refund',    label: 'Refunds' },
  { id: 'credit',    label: 'Credits' },
];

const CC_BILL_RE = /(CC BillPay|credit card bill|BIL\/INFT)/i;

function truncate(str, n) {
  return str && str.length > n ? str.slice(0, n) + '…' : str;
}

export default function ImportStatement() {
  const [step, setStep]             = useState('upload');
  const [dragging, setDragging]     = useState(false);
  const [parsing, setParsing]       = useState(false);
  const [parseError, setParseError] = useState(null);
  const [rows, setRows]             = useState([]);
  const [dateRange, setDateRange]   = useState(null);
  const [categories, setCategories] = useState([]);
  const [filter, setFilter]         = useState('expense');

  const [importing, setImporting] = useState(new Set());
  const [imported,  setImported]  = useState(new Set());
  const [rowErrors, setRowErrors] = useState({});

  const [dismissed,   setDismissed]   = useState(new Set());

  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError,   setBulkError]   = useState(null);

  const fileRef = useRef();

  async function handleFile(file) {
    if (!file) return;
    setParsing(true);
    setParseError(null);
    try {
      const [data, cats] = await Promise.all([previewImport(file), getCategories()]);
      setCategories(cats);
      setRows(data.rows.map((r, i) => ({ ...r, _id: i })));
      setDateRange(data.dateRange);
      setImporting(new Set());
      setImported(new Set());
      setDismissed(new Set());
      setRowErrors({});
      setStep('preview');
    } catch (err) {
      setParseError(err.message);
    } finally {
      setParsing(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function toggleRow(id) {
    setRows(prev => prev.map(r => r._id === id ? { ...r, selected: !r.selected } : r));
  }

  function toggleAll(checked) {
    const visibleIds = new Set(filteredRows.map(r => r._id));
    setRows(prev => prev.map(r => visibleIds.has(r._id) ? { ...r, selected: checked } : r));
  }

  function dismissRow(id) {
    setDismissed(prev => new Set([...prev, id]));
  }

  function updateRow(id, field, value) {
    setRows(prev => prev.map(r => r._id === id ? { ...r, [field]: value } : r));
  }

  async function handleImportRow(row) {
    setImporting(prev => new Set([...prev, row._id]));
    setRowErrors(prev => { const n = { ...prev }; delete n[row._id]; return n; });
    try {
      await confirmImport([row]);
      setImported(prev => new Set([...prev, row._id]));
    } catch (err) {
      setRowErrors(prev => ({ ...prev, [row._id]: err.message }));
    } finally {
      setImporting(prev => { const s = new Set(prev); s.delete(row._id); return s; });
    }
  }

  async function handleBulkImport() {
    const toImport = rows.filter(r => r.selected && !imported.has(r._id) && r.status !== 'credit');
    if (toImport.length === 0) return;
    setBulkLoading(true);
    setBulkError(null);
    for (const row of toImport) {
      setImporting(prev => new Set([...prev, row._id]));
      try {
        await confirmImport([row]);
        setImported(prev => new Set([...prev, row._id]));
      } catch (err) {
        setRowErrors(prev => ({ ...prev, [row._id]: err.message }));
      } finally {
        setImporting(prev => { const s = new Set(prev); s.delete(row._id); return s; });
      }
    }
    setBulkLoading(false);
  }

  // Imported and dismissed rows disappear from the table
  const visibleRows = rows.filter(r => !imported.has(r._id) && !dismissed.has(r._id));

  const filteredRows = visibleRows.filter(r => {
    if (filter === 'all')       return true;
    if (filter === 'expense')   return ['expense', 'cash', 'transfer', 'investment'].includes(r.status);
    if (filter === 'duplicate') return r.status === 'duplicate';
    if (filter === 'refund')    return r.status === 'refund';
    if (filter === 'credit')    return r.status === 'credit';
    return true;
  });

  const counts = {
    all:       visibleRows.length,
    expense:   visibleRows.filter(r => ['expense', 'cash', 'transfer', 'investment'].includes(r.status)).length,
    duplicate: visibleRows.filter(r => r.status === 'duplicate').length,
    refund:    visibleRows.filter(r => r.status === 'refund').length,
    credit:    visibleRows.filter(r => r.status === 'credit').length,
  };

  const selectedPending = visibleRows.filter(r => r.selected).length;
  const importedCount   = imported.size;

  function inr(n) { return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  // Right panel data — pending importable rows only
  const importableRows    = rows.filter(r => ['expense', 'cash', 'transfer', 'investment'].includes(r.status) && !dismissed.has(r._id));
  const totalImportable   = importableRows.length;
  const importedAmt       = importableRows.filter(r => imported.has(r._id)).reduce((s, r) => s + r.withdrawal, 0);
  const pendingAmt        = importableRows.filter(r => !imported.has(r._id)).reduce((s, r) => s + r.withdrawal, 0);
  const pendingImportable = importableRows.filter(r => !imported.has(r._id));

  const catMap    = pendingImportable.reduce((acc, r) => { const k = r.category || 'Other'; acc[k] = (acc[k] || 0) + r.withdrawal; return acc; }, {});
  const topCats   = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxCatAmt = topCats[0]?.[1] || 1;

  const modeMap    = pendingImportable.reduce((acc, r) => { const k = r.paymentMode || 'UPI'; acc[k] = (acc[k] || 0) + r.withdrawal; return acc; }, {});
  const topModes   = Object.entries(modeMap).sort((a, b) => b[1] - a[1]);
  const maxModeAmt = topModes[0]?.[1] || 1;

  // --- Upload step ---
  if (step === 'upload') {
    return (
      <div className="max-w-lg">
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4 transition-all ${
            dragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <Upload className="w-7 h-7 text-indigo-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">Drop your ICICI statement here</p>
            <p className="text-xs text-slate-400 mt-1">or click to browse — .xls / .xlsx supported</p>
          </div>
          {parsing && <p className="text-xs text-indigo-600 font-medium animate-pulse">Parsing statement…</p>}
        </div>
        <input ref={fileRef} type="file" accept=".xls,.xlsx" className="hidden"
          onChange={e => { const f = e.target.files[0]; if (f) handleFile(f); }} />
        {parseError && (
          <div className="mt-4 bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {parseError}
          </div>
        )}
        <div className="mt-5 bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <p className="text-xs font-semibold text-slate-600 mb-2">How to download your ICICI statement</p>
          <ol className="text-xs text-slate-500 space-y-1 list-decimal list-inside">
            <li>Login to iMobile Pay or ICICI Net Banking</li>
            <li>Go to <span className="font-medium">Account Statement → Detailed Statement</span></li>
            <li>Select date range and download as <span className="font-medium">XLS</span></li>
          </ol>
        </div>
      </div>
    );
  }

  // --- Preview step ---
  const allVisibleChecked = filteredRows.length > 0 && filteredRows.every(r => r.selected);

  return (
    <div className="space-y-4">

      {/* Summary bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-500">{dateRange?.from} → {dateRange?.to}</span>
          <span className="font-semibold text-slate-800">{rows.length} transactions</span>
          {importedCount > 0 && (
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              {importedCount} imported
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setStep('upload'); setRows([]); }}
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Change file
          </button>
          <button
            onClick={handleBulkImport}
            disabled={selectedPending === 0 || bulkLoading}
            className="flex items-center gap-2 bg-indigo-600 text-white rounded-xl px-5 py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {bulkLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
            Import {selectedPending} selected
          </button>
        </div>
      </div>

      {bulkError && (
        <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm">{bulkError}</div>
      )}

      {/* Two-column layout */}
      <div className="flex gap-6 items-start">

        {/* Left: filter tabs + table */}
        <div className="flex-1 min-w-0 space-y-4">

          <div className="flex gap-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5 w-fit">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  filter === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 text-xs ${filter === tab.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {counts[tab.id]}
                </span>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-4 py-3 w-8">
                    <input type="checkbox" checked={allVisibleChecked}
                      onChange={e => toggleAll(e.target.checked)} className="rounded" />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Remarks</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Merchant</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Mode</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredRows.map(row => {
                  const meta        = STATUS_META[row.status] || STATUS_META.expense;
                  const isDebit     = row.withdrawal > 0;
                  const isImporting = importing.has(row._id);
                  const rowError    = rowErrors[row._id];

                  return (
                    <tr key={row._id} className={`transition-colors ${row.selected ? 'bg-white' : 'bg-slate-50/60'}`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={!!row.selected}
                          onChange={() => toggleRow(row._id)} className="rounded" />
                      </td>
                      <td className="px-3 py-3 text-slate-500 text-xs tabular-nums whitespace-nowrap">{row.date}</td>
                      <td className={`px-3 py-3 text-right font-semibold tabular-nums whitespace-nowrap ${isDebit ? 'text-slate-900' : 'text-emerald-600'}`}>
                        {isDebit ? '' : '+'} ₹{row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3 text-slate-400 text-xs max-w-[200px]">
                        <span title={row.remarks}>{truncate(row.remarks, 45)}</span>
                      </td>
                      <td className="px-3 py-3">
                        <input type="text" value={row.merchant}
                          onChange={e => updateRow(row._id, 'merchant', e.target.value)}
                          placeholder="—"
                          className="w-28 text-xs border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:bg-white" />
                      </td>
                      <td className="px-3 py-3">
                        <select value={row.category}
                          onChange={e => updateRow(row._id, 'category', e.target.value)}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:bg-white">
                          {categories.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <select value={row.paymentMode || 'UPI'}
                          onChange={e => updateRow(row._id, 'paymentMode', e.target.value)}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:bg-white">
                          {['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Net Banking'].map(m => (
                            <option key={m}>{m}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
                          {meta.label}
                        </span>
                        {row.status === 'transfer' && !CC_BILL_RE.test(row.remarks) && (
                          <button type="button" onClick={() => updateRow(row._id, 'status', 'expense')}
                            className="ml-1.5 text-xs text-slate-400 hover:text-emerald-500 underline">
                            expense?
                          </button>
                        )}
                        {rowError && <p className="text-red-500 text-xs mt-0.5" title={rowError}>Failed</p>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {isImporting ? (
                            <span className="inline-flex items-center justify-center w-7 h-7">
                              <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                            </span>
                          ) : row.status === 'credit' ? (
                            <span className="w-7 h-7 inline-flex" />
                          ) : (
                            <button onClick={() => handleImportRow(row)} title="Import this row"
                              className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                          <button onClick={() => dismissRow(row._id)} title="Dismiss"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-slate-200 text-slate-300 hover:border-red-300 hover:text-red-400 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredRows.length === 0 && (
              <div className="py-10 text-center text-slate-400 text-sm">No transactions in this filter.</div>
            )}
          </div>
        </div>

        {/* Right: info panel */}
        <div className="w-72 shrink-0 space-y-4">

          {/* Import progress */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Import Progress</p>
            {totalImportable > 0 ? (
              <>
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>{importedCount} of {totalImportable} done</span>
                  <span className="font-medium">{Math.round((importedCount / totalImportable) * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full">
                  <div className="h-2 bg-emerald-400 rounded-full transition-all"
                    style={{ width: `${Math.round((importedCount / totalImportable) * 100)}%` }} />
                </div>
                <div className="mt-3 flex justify-between text-sm">
                  <span className="text-emerald-600 font-medium">{inr(importedAmt)}</span>
                  <span className="text-amber-500 font-semibold">{inr(pendingAmt)} left</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400">No importable rows</p>
            )}
          </div>

          {/* Pending by category */}
          {topCats.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Pending by Category</p>
              <div className="space-y-3">
                {topCats.map(([cat, amt]) => (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-700 font-medium truncate">{cat}</span>
                      <span className="text-slate-500 tabular-nums ml-2 shrink-0">{inr(amt)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full">
                      <div className="h-1.5 bg-indigo-400 rounded-full"
                        style={{ width: `${(amt / maxCatAmt) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending by payment mode */}
          {topModes.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Pending by Mode</p>
              <div className="space-y-3">
                {topModes.map(([mode, amt]) => (
                  <div key={mode}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-700 font-medium">{mode}</span>
                      <span className="text-slate-500 tabular-nums">{inr(amt)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full">
                      <div className="h-1.5 bg-sky-400 rounded-full"
                        style={{ width: `${(amt / maxModeAmt) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
