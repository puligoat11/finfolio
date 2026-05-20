import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Upload, RefreshCw } from 'lucide-react';
import { useIncomeStore, useMonthlyIncomeTrend } from '@/stores/incomeStore';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge } from '@/components/ui';
import { INCOME_TYPES, type IncomeType } from '@/types/models';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '@/utils/formatters';

const TYPE_COLORS: Record<IncomeType, string> = {
  Salary:     '#1a73e8',
  Bonus:      '#00C853',
  Freelance:  '#FFB300',
  Investment: '#9c27b0',
  RSU:        '#e91e63',
  Other:      '#8B949E',
};

const SELECT_CLASS = 'w-full bg-dark-surface text-dark-text border border-dark-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none';

export function IncomePage() {
  const {
    entries, recurring, rsuEntries, isLoading,
    fetchIncome, addEntry, deleteEntry,
    addRecurring, deleteRecurring, generateRecurringEntries,
    addRSU, deleteRSU, getRSUValue,
  } = useIncomeStore();

  const monthlyTrend = useMonthlyIncomeTrend();
  const [activeTab, setActiveTab] = useState<'add' | 'recurring' | 'rsu'>('add');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterType, setFilterType]   = useState('');
  const [rsuPrices, setRsuPrices]     = useState<Record<string, number>>({});

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    source: '', amount: '', type: 'Salary' as IncomeType,
  });
  const [recurringForm, setRecurringForm] = useState({
    source: '', amount: '', type: 'Salary' as IncomeType,
    frequencyWeeks: '2', startDate: new Date().toISOString().split('T')[0],
  });
  const [rsuForm, setRsuForm] = useState({
    symbol: '', shares: '', vestDate: new Date().toISOString().split('T')[0], grantPrice: '',
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const { importCSV } = useIncomeStore();

  useEffect(() => { fetchIncome(); }, [fetchIncome]);

  useEffect(() => {
    if (rsuEntries.length === 0) return;
    const syms = [...new Set(rsuEntries.map(r => r.symbol))];
    Promise.all(syms.map(s => getRSUValue(s))).then(prices => {
      const map: Record<string, number> = {};
      syms.forEach((s, i) => { map[s] = prices[i]; });
      setRsuPrices(map);
    });
  }, [rsuEntries, getRSUValue]);

  const currentMonth     = new Date().toISOString().slice(0, 7);
  const availableMonths  = useMemo(() => [...new Set(entries.map(e => e.date.substring(0, 7)))].sort().reverse(), [entries]);
  const thisMonthTotal   = useMemo(() => entries.filter(e => e.date.startsWith(currentMonth)).reduce((s, e) => s + e.amount, 0), [entries, currentMonth]);
  const yearToDate       = useMemo(() => entries.filter(e => e.date.startsWith(new Date().getFullYear().toString())).reduce((s, e) => s + e.amount, 0), [entries]);
  const rsuTotal         = useMemo(() => rsuEntries.reduce((s, r) => s + r.shares * (rsuPrices[r.symbol] || 0), 0), [rsuEntries, rsuPrices]);

  const incomeByType = useMemo(() => {
    const target = filterMonth || currentMonth;
    const filtered = entries.filter(e => e.date.startsWith(target));
    const map: Record<string, number> = {};
    filtered.forEach(e => { map[e.type] = (map[e.type] || 0) + e.amount; });
    return Object.entries(map).map(([type, amount]) => ({ type, amount }));
  }, [entries, filterMonth, currentMonth]);

  const filteredEntries = useMemo(() => entries.filter(e => {
    if (filterMonth && !e.date.startsWith(filterMonth)) return false;
    if (filterType && e.type !== filterType) return false;
    return true;
  }), [entries, filterMonth, filterType]);

  function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!form.source || !form.amount) return;
    addEntry({ date: form.date, source: form.source, amount: parseFloat(form.amount), type: form.type });
    setForm({ ...form, source: '', amount: '' });
  }

  function handleAddRecurring(e: React.FormEvent) {
    e.preventDefault();
    if (!recurringForm.source || !recurringForm.amount) return;
    addRecurring({
      source: recurringForm.source, amount: parseFloat(recurringForm.amount),
      type: recurringForm.type, frequencyWeeks: parseInt(recurringForm.frequencyWeeks),
      startDate: recurringForm.startDate, isActive: true,
    });
    setRecurringForm({ ...recurringForm, source: '', amount: '' });
  }

  function handleAddRSU(e: React.FormEvent) {
    e.preventDefault();
    if (!rsuForm.symbol || !rsuForm.shares || !rsuForm.grantPrice) return;
    addRSU({
      symbol: rsuForm.symbol.toUpperCase(),
      shares: parseFloat(rsuForm.shares),
      vestDate: rsuForm.vestDate,
      grantPrice: parseFloat(rsuForm.grantPrice),
    });
    setRsuForm({ symbol: '', shares: '', vestDate: new Date().toISOString().split('T')[0], grantPrice: '' });
  }

  function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = importCSV(ev.target?.result as string);
      alert(`Imported ${result.imported} entries, skipped ${result.duplicates} duplicates.`);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const TABS = [
    { id: 'add' as const, label: '+ Manual Entry' },
    { id: 'recurring' as const, label: 'Recurring' },
    { id: 'rsu' as const, label: 'RSU / Equity' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-text">Income</h1>
          <p className="text-dark-text-secondary text-sm mt-0.5">Track all income sources and equity compensation</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />Import CSV
          </Button>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} className="hidden" />
          <Button variant="secondary" size="sm" onClick={generateRecurringEntries}>
            <RefreshCw className="w-4 h-4 mr-2" />Generate Recurring
          </Button>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'This Month', value: formatCurrency(thisMonthTotal), color: 'text-success' },
          { label: 'Year to Date', value: formatCurrency(yearToDate), color: 'text-primary' },
          { label: 'RSU Portfolio', value: formatCurrency(rsuTotal), color: 'text-[#e91e63]' },
          { label: 'Total Entries', value: String(entries.length), color: 'text-dark-text' },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-dark-text-secondary uppercase tracking-wide">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Income by Type</CardTitle></CardHeader>
          <CardContent>
            {incomeByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={incomeByType} layout="vertical">
                  <XAxis type="number" tick={{ fill: '#8B949E', fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="type" tick={{ fill: '#8B949E', fontSize: 11 }} width={75} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: '#21262D', border: '1px solid #30363D', borderRadius: 8 }} />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {incomeByType.map(e => <Cell key={e.type} fill={TYPE_COLORS[e.type as IncomeType] || '#8B949E'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-dark-text-secondary text-sm">No income data</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Monthly Trend</CardTitle></CardHeader>
          <CardContent>
            {monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyTrend.slice(-12)}>
                  <XAxis dataKey="month" tick={{ fill: '#8B949E', fontSize: 11 }} tickFormatter={v => v.substring(5)} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8B949E', fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: '#21262D', border: '1px solid #30363D', borderRadius: 8 }} />
                  <Bar dataKey="total" fill="#00C853" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-dark-text-secondary text-sm">No trend data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Input tabs */}
      <Card>
        <div className="border-b border-dark-border px-6 flex gap-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === t.id ? 'border-primary text-primary' : 'border-transparent text-dark-text-secondary hover:text-dark-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'add' && (
            <form onSubmit={handleAddEntry} className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[130px]">
                <label className="block text-xs text-dark-text-secondary mb-1">Date</label>
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="flex-1 min-w-[110px]">
                <label className="block text-xs text-dark-text-secondary mb-1">Type</label>
                <select className={SELECT_CLASS} value={form.type} onChange={e => setForm({ ...form, type: e.target.value as IncomeType })}>
                  {INCOME_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex-[2] min-w-[180px]">
                <label className="block text-xs text-dark-text-secondary mb-1">Source</label>
                <Input placeholder="e.g. Acme Corp" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} />
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="block text-xs text-dark-text-secondary mb-1">Amount ($)</label>
                <Input type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
              </div>
              <Button type="submit">Add Entry</Button>
            </form>
          )}

          {activeTab === 'recurring' && (
            <div className="space-y-6">
              <form onSubmit={handleAddRecurring} className="flex flex-wrap items-end gap-4">
                <div className="flex-[2] min-w-[180px]">
                  <label className="block text-xs text-dark-text-secondary mb-1">Description</label>
                  <Input placeholder="e.g. Employer Paycheck" value={recurringForm.source} onChange={e => setRecurringForm({ ...recurringForm, source: e.target.value })} />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-xs text-dark-text-secondary mb-1">Amount ($)</label>
                  <Input type="number" step="0.01" placeholder="0.00" value={recurringForm.amount} onChange={e => setRecurringForm({ ...recurringForm, amount: e.target.value })} />
                </div>
                <div className="flex-1 min-w-[110px]">
                  <label className="block text-xs text-dark-text-secondary mb-1">Frequency</label>
                  <select className={SELECT_CLASS} value={recurringForm.frequencyWeeks} onChange={e => setRecurringForm({ ...recurringForm, frequencyWeeks: e.target.value })}>
                    <option value="1">Weekly</option>
                    <option value="2">Bi-weekly</option>
                    <option value="4">Monthly</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[130px]">
                  <label className="block text-xs text-dark-text-secondary mb-1">Start Date</label>
                  <Input type="date" value={recurringForm.startDate} onChange={e => setRecurringForm({ ...recurringForm, startDate: e.target.value })} />
                </div>
                <Button type="submit">Add</Button>
              </form>

              {recurring.length > 0 ? (
                <div className="space-y-2">
                  {recurring.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-3 bg-dark-surface rounded-lg border border-dark-border">
                      <div className="flex items-center gap-3">
                        <Badge variant={r.isActive ? 'success' : 'neutral'}>{r.isActive ? 'Active' : 'Paused'}</Badge>
                        <div>
                          <p className="text-sm font-medium text-dark-text">{r.source}</p>
                          <p className="text-xs text-dark-text-secondary">{formatCurrency(r.amount)} · every {r.frequencyWeeks === 1 ? 'week' : r.frequencyWeeks === 2 ? '2 weeks' : 'month'}</p>
                        </div>
                      </div>
                      <button onClick={() => deleteRecurring(r.id)} className="text-danger hover:bg-danger/10 p-1.5 rounded transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-dark-text-secondary text-sm py-4">No recurring income set up</p>
              )}
            </div>
          )}

          {activeTab === 'rsu' && (
            <div className="space-y-6">
              <form onSubmit={handleAddRSU} className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[100px]">
                  <label className="block text-xs text-dark-text-secondary mb-1">Symbol</label>
                  <Input placeholder="AAPL" value={rsuForm.symbol} onChange={e => setRsuForm({ ...rsuForm, symbol: e.target.value.toUpperCase() })} />
                </div>
                <div className="flex-1 min-w-[100px]">
                  <label className="block text-xs text-dark-text-secondary mb-1">Shares</label>
                  <Input type="number" step="0.001" placeholder="0" value={rsuForm.shares} onChange={e => setRsuForm({ ...rsuForm, shares: e.target.value })} />
                </div>
                <div className="flex-1 min-w-[130px]">
                  <label className="block text-xs text-dark-text-secondary mb-1">Vest Date</label>
                  <Input type="date" value={rsuForm.vestDate} onChange={e => setRsuForm({ ...rsuForm, vestDate: e.target.value })} />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-xs text-dark-text-secondary mb-1">Grant Price ($)</label>
                  <Input type="number" step="0.01" placeholder="0.00" value={rsuForm.grantPrice} onChange={e => setRsuForm({ ...rsuForm, grantPrice: e.target.value })} />
                </div>
                <Button type="submit">Add RSU</Button>
              </form>

              {rsuEntries.length > 0 ? (
                <div className="space-y-2">
                  {rsuEntries.map(rsu => {
                    const cur = rsuPrices[rsu.symbol] || 0;
                    const val = rsu.shares * cur;
                    const gain = cur > 0 ? ((cur - rsu.grantPrice) / rsu.grantPrice) * 100 : 0;
                    return (
                      <div key={rsu.id} className="flex items-center justify-between p-3 bg-dark-surface rounded-lg border border-dark-border">
                        <div className="flex items-center gap-3">
                          <Badge variant="default">{rsu.symbol}</Badge>
                          <div>
                            <p className="text-sm font-medium text-dark-text">{rsu.shares.toLocaleString()} shares @ {formatCurrency(rsu.grantPrice)}</p>
                            <p className="text-xs text-dark-text-secondary">Vested {new Date(rsu.vestDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-dark-text">{formatCurrency(val)}</p>
                          <p className={`text-xs ${gain >= 0 ? 'text-success' : 'text-danger'}`}>{gain >= 0 ? '+' : ''}{gain.toFixed(1)}%</p>
                        </div>
                        <button onClick={() => deleteRSU(rsu.id)} className="ml-3 text-danger hover:bg-danger/10 p-1.5 rounded transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-dark-text-secondary text-sm py-4">No RSU holdings recorded</p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* History table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Income History</CardTitle>
          <div className="flex items-center gap-3">
            <select className={`${SELECT_CLASS} w-auto`} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
              <option value="">All Months</option>
              {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select className={`${SELECT_CLASS} w-auto`} value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              {INCOME_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-surface/50">
                {['Date', 'Source', 'Type', 'Amount', ''].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs font-medium text-dark-text-secondary uppercase tracking-wider ${h === 'Amount' || h === '' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-dark-text-secondary text-sm">No entries found</td></tr>
              ) : filteredEntries.slice(0, 100).map(entry => (
                <tr key={entry.id} className="border-b border-dark-border last:border-b-0 hover:bg-dark-surface/40 transition-colors group">
                  <td className="px-4 py-3 text-sm text-dark-text-secondary whitespace-nowrap">
                    {new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-sm text-dark-text">{entry.source}</td>
                  <td className="px-4 py-3">
                    <Badge style={{ backgroundColor: `${TYPE_COLORS[entry.type]}20`, color: TYPE_COLORS[entry.type] }}>
                      {entry.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-success font-semibold text-sm">{formatCurrency(entry.amount)}</td>
                  <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => deleteEntry(entry.id)} className="text-danger hover:bg-danger/10 p-1 rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
