import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Upload, Plus, Trash2, Search, ChevronDown, Check, X } from 'lucide-react';
import { useExpenseStore, useMonthlyExpenseTrend, useAvailableMonths } from '@/stores/expenseStore';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge } from '@/components/ui';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import { CAPITAL_ONE_CATEGORY_MAP } from '@/types/models';

const CAT_COLORS: Record<string, string> = {
  Dining:        '#ef4444',
  Shopping:      '#f97316',
  Gas:           '#14b8a6',
  Entertainment: '#00C853',
  Bills:         '#e91e63',
  Travel:        '#06b6d4',
  Subscriptions: '#9c27b0',
  Other:         '#8B949E',
};

const SELECT_CLASS = 'w-full bg-dark-surface text-dark-text border border-dark-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none';

interface CSVPreviewRow { date: string; description: string; amount: number; category: string; }
interface ImportResult { imported: number; duplicates: number; }

export function ExpensesPage() {
  const {
    expenses, budgets, categories, isLoading,
    fetchExpenses, addExpense, deleteExpense,
    setBudgetAmount, getBudgetProgress, importCSV,
  } = useExpenseStore();

  const monthlyTrend    = useMonthlyExpenseTrend();
  const availableMonths = useAvailableMonths();

  const [activeTab, setActiveTab]         = useState<'add' | 'import' | 'budget'>('add');
  const [filterMonth, setFilterMonth]     = useState('');
  const [filterCat, setFilterCat]         = useState('');
  const [search, setSearch]               = useState('');
  const [budgetMonth, setBudgetMonth]     = useState(() => new Date().toISOString().slice(0, 7));
  const [editBudgets, setEditBudgets]     = useState<Record<string, string>>({});
  const [csvPreview, setCsvPreview]       = useState<CSVPreviewRow[] | null>(null);
  const [csvRaw, setCsvRaw]               = useState('');
  const [csvFileName, setCsvFileName]     = useState('');
  const [importResult, setImportResult]   = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging]       = useState(false);
  const fileRef                           = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '', amount: '', category: 'Other',
  });

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  useEffect(() => {
    const mb = budgets[budgetMonth] || {};
    const vals: Record<string, string> = {};
    categories.forEach(c => { vals[c] = mb[c]?.toString() || ''; });
    setEditBudgets(vals);
  }, [budgetMonth, budgets, categories]);

  const currentMonth = new Date().toISOString().slice(0, 7);

  const thisMonthTotal = useMemo(() =>
    expenses.filter(e => e.date.startsWith(currentMonth)).reduce((s, e) => s + e.amount, 0),
    [expenses, currentMonth]);

  const lastMonthTotal = useMemo(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    const lm = d.toISOString().slice(0, 7);
    return expenses.filter(e => e.date.startsWith(lm)).reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const catTotals = useMemo(() => {
    const target = filterMonth || currentMonth;
    const map: Record<string, number> = {};
    expenses.filter(e => e.date.startsWith(target)).forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => ({ cat, amt }));
  }, [expenses, filterMonth, currentMonth]);

  const filteredExpenses = useMemo(() => expenses.filter(e => {
    if (filterMonth && !e.date.startsWith(filterMonth)) return false;
    if (filterCat  && e.category !== filterCat) return false;
    if (search && !e.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [expenses, filterMonth, filterCat, search]);

  const budgetProgressArr = useMemo(() => getBudgetProgress(budgetMonth), [budgetMonth, getBudgetProgress, expenses]);
  const budgetProgress = useMemo(() => {
    const map: Record<string, { spent: number; budget: number; percent: number }> = {};
    budgetProgressArr.forEach(p => { map[p.category] = p; });
    return map;
  }, [budgetProgressArr]);

  function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description || !form.amount) return;
    addExpense({ date: form.date, description: form.description, amount: parseFloat(form.amount), category: form.category });
    setForm({ ...form, description: '', amount: '' });
  }

  function parsePreviewLine(line: string): string[] {
    const result: string[] = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    result.push(cur.trim());
    return result;
  }

  function handleFileRead(content: string, fileName = '') {
    setCsvRaw(content);
    setCsvFileName(fileName);
    setImportResult(null);
    const lines = content.trim().split('\n');
    if (lines.length < 2) { setCsvPreview([]); return; }

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
    const isCapOne = headers.includes('transaction date') && (headers.includes('debit') || headers.includes('credit'));

    const preview: CSVPreviewRow[] = [];

    if (isCapOne) {
      const dateIdx = headers.indexOf('transaction date');
      const descIdx = headers.indexOf('description');
      const debitIdx = headers.indexOf('debit');
      const catIdx  = headers.indexOf('category');
      for (let i = 1; i < lines.length && preview.length < 5; i++) {
        const cols = parsePreviewLine(lines[i]);
        const debitStr = cols[debitIdx]?.trim();
        if (!debitStr) continue;
        const amount = parseFloat(debitStr.replace(/[$,]/g, ''));
        if (isNaN(amount) || amount <= 0) continue;
        const bankCat = cols[catIdx]?.trim() || '';
        if (CAPITAL_ONE_CATEGORY_MAP[bankCat] === 'SKIP') continue;
        preview.push({
          date: cols[dateIdx]?.trim() || '',
          description: cols[descIdx]?.trim() || '',
          amount,
          category: CAPITAL_ONE_CATEGORY_MAP[bankCat] || 'Other',
        });
      }
    } else {
      const dateIdx   = headers.findIndex(h => h.includes('date'));
      const descIdx   = headers.findIndex(h => h.includes('description') || h.includes('merchant'));
      const amountIdx = headers.findIndex(h => h.includes('amount') || h.includes('debit'));
      const catIdx    = headers.findIndex(h => h.includes('category'));
      for (let i = 1; i < lines.length && preview.length < 5; i++) {
        const cols = parsePreviewLine(lines[i]);
        const amtStr = amountIdx !== -1 ? cols[amountIdx]?.trim() : '';
        if (!amtStr) continue;
        const amount = Math.abs(parseFloat(amtStr.replace(/[$,]/g, '')));
        if (isNaN(amount) || amount <= 0) continue;
        preview.push({
          date: dateIdx !== -1 ? cols[dateIdx]?.trim() : '',
          description: descIdx !== -1 ? cols[descIdx]?.trim() : 'Imported',
          amount,
          category: catIdx !== -1 && cols[catIdx] ? cols[catIdx].trim() : 'Other',
        });
      }
    }

    setCsvPreview(preview);
  }

  function handleCSVInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => handleFileRead(ev.target?.result as string, file.name);
    reader.readAsText(file);
    e.target.value = '';
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file || !file.name.endsWith('.csv')) return;
    const reader = new FileReader();
    reader.onload = ev => handleFileRead(ev.target?.result as string, file.name);
    reader.readAsText(file);
  }, []);

  function confirmImport() {
    if (!csvRaw) return;
    const result = importCSV(csvRaw, csvFileName);
    setImportResult(result);
    setCsvPreview(null);
    setCsvRaw('');
    setCsvFileName('');
    fetchExpenses();
  }

  function saveBudget(cat: string) {
    const val = parseFloat(editBudgets[cat] || '0');
    setBudgetAmount(budgetMonth, cat, val);
  }

  const TABS = [
    { id: 'add' as const, label: '+ Manual Entry' },
    { id: 'import' as const, label: 'Import CSV' },
    { id: 'budget' as const, label: 'Budgets' },
  ];

  const vsLastMonth = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-text">Expenses</h1>
          <p className="text-dark-text-secondary text-sm mt-0.5">Track, categorize, and budget personal spending</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'This Month',    value: formatCurrency(thisMonthTotal), color: 'text-danger' },
          { label: 'Last Month',    value: formatCurrency(lastMonthTotal), color: 'text-dark-text' },
          { label: 'vs Last Month', value: `${vsLastMonth >= 0 ? '+' : ''}${vsLastMonth.toFixed(1)}%`, color: vsLastMonth > 0 ? 'text-danger' : 'text-success' },
          { label: 'Total Entries', value: String(expenses.length), color: 'text-dark-text' },
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
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Spending by Category</CardTitle>
              <select className={`${SELECT_CLASS} w-auto text-xs`} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                <option value="">This Month</option>
                {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {catTotals.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={catTotals} dataKey="amt" nameKey="cat" cx="50%" cy="50%" outerRadius={85} paddingAngle={2}>
                    {catTotals.map(e => <Cell key={e.cat} fill={CAT_COLORS[e.cat] || '#8B949E'} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: '#21262D', border: '1px solid #30363D', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-dark-text-secondary text-sm">No data</div>
            )}
            <div className="grid grid-cols-2 gap-1 mt-2">
              {catTotals.slice(0, 6).map(e => (
                <div key={e.cat} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CAT_COLORS[e.cat] || '#8B949E' }} />
                  <span className="text-dark-text-secondary">{e.cat}</span>
                  <span className="text-dark-text ml-auto">{formatCurrency(e.amt)}</span>
                </div>
              ))}
            </div>
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
                  <Bar dataKey="total" fill="#FF5252" radius={[4, 4, 0, 0]} />
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
            <form onSubmit={handleAddExpense} className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[130px]">
                <label className="block text-xs text-dark-text-secondary mb-1">Date</label>
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="flex-[2] min-w-[180px]">
                <label className="block text-xs text-dark-text-secondary mb-1">Description</label>
                <Input placeholder="e.g. Whole Foods" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="block text-xs text-dark-text-secondary mb-1">Amount ($)</label>
                <Input type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="flex-1 min-w-[130px]">
                <label className="block text-xs text-dark-text-secondary mb-1">Category</label>
                <select className={SELECT_CLASS} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <Button type="submit">Add Expense</Button>
            </form>
          )}

          {activeTab === 'import' && (
            <div className="space-y-4">
              {/* Drag-and-drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
                  isDragging ? 'border-primary bg-primary/5' : 'border-dark-border hover:border-dark-text-secondary'
                )}
              >
                <Upload className="w-8 h-8 mx-auto mb-3 text-dark-text-secondary" />
                <p className="text-dark-text font-medium">Drop your CSV file here</p>
                <p className="text-dark-text-secondary text-sm mt-1">or click to browse · Capital One, Chase, or generic bank CSV</p>
                <input ref={fileRef} type="file" accept=".csv" onChange={handleCSVInput} className="hidden" />
              </div>

              {/* Preview */}
              {csvPreview && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-dark-text">Preview (first 5 rows)</p>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => { setCsvPreview(null); setCsvRaw(''); }}>
                        <X className="w-4 h-4 mr-1" />Cancel
                      </Button>
                      <Button size="sm" onClick={confirmImport}>
                        <Check className="w-4 h-4 mr-1" />Confirm Import
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-dark-surface/50">
                          {['Date', 'Description', 'Amount', 'Category'].map(h => (
                            <th key={h} className="px-4 py-2 text-left text-xs text-dark-text-secondary">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.map((row, i) => (
                          <tr key={i} className="border-t border-dark-border">
                            <td className="px-4 py-2 text-dark-text-secondary">{row.date}</td>
                            <td className="px-4 py-2 text-dark-text">{row.description}</td>
                            <td className="px-4 py-2 text-danger font-medium">-{formatCurrency(row.amount)}</td>
                            <td className="px-4 py-2">
                              <Badge variant="neutral">{row.category}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importResult && (
                <div className="flex items-center gap-3 p-4 bg-success/10 border border-success/20 rounded-lg">
                  <Check className="w-5 h-5 text-success flex-shrink-0" />
                  <p className="text-sm text-dark-text">
                    Imported <strong>{importResult.imported}</strong> transactions
                    {importResult.duplicates > 0 && ` · skipped ${importResult.duplicates} duplicates`}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'budget' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-sm text-dark-text-secondary">Month</label>
                <select className={`${SELECT_CLASS} w-auto`} value={budgetMonth} onChange={e => setBudgetMonth(e.target.value)}>
                  {availableMonths.concat([currentMonth]).filter((v, i, a) => a.indexOf(v) === i).sort().reverse().map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {categories.map(cat => {
                  const prog = budgetProgress[cat];
                  const budget = parseFloat(editBudgets[cat] || '0');
                  const spent  = prog?.spent || 0;
                  const pct    = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
                  const over   = spent > budget && budget > 0;
                  return (
                    <div key={cat} className="p-4 bg-dark-surface rounded-lg border border-dark-border space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: CAT_COLORS[cat] || '#8B949E' }} />
                          <span className="text-sm font-medium text-dark-text">{cat}</span>
                        </div>
                        <span className={cn('text-xs font-medium', over ? 'text-danger' : 'text-dark-text-secondary')}>
                          {formatCurrency(spent)}{budget > 0 && ` / ${formatCurrency(budget)}`}
                        </span>
                      </div>
                      {budget > 0 && (
                        <div className="h-1.5 bg-dark-card rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', over ? 'bg-danger' : 'bg-success')}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="10"
                          placeholder="Set budget…"
                          value={editBudgets[cat] || ''}
                          onChange={e => setEditBudgets(prev => ({ ...prev, [cat]: e.target.value }))}
                          onBlur={() => saveBudget(cat)}
                          className="flex-1 bg-dark-card border border-dark-border rounded px-2 py-1 text-xs text-dark-text focus:border-primary focus:outline-none"
                        />
                        <span className="text-xs text-dark-text-secondary">/mo</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Expense history */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Expense History</CardTitle>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-text-secondary" />
              <input
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-sm text-dark-text placeholder:text-dark-text-secondary/50 focus:border-primary focus:outline-none w-44"
              />
            </div>
            <select className={`${SELECT_CLASS} w-auto`} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
              <option value="">All Months</option>
              {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select className={`${SELECT_CLASS} w-auto`} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-surface/50">
                {['Date', 'Description', 'Category', 'Amount', ''].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs font-medium text-dark-text-secondary uppercase tracking-wider ${h === 'Amount' ? 'text-right' : h === '' ? 'w-10' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-16 text-center text-dark-text-secondary text-sm">
                  {expenses.length === 0 ? 'No expenses yet. Add one above or import a CSV.' : 'No results match your filters.'}
                </td></tr>
              ) : filteredExpenses.slice(0, 100).map(exp => (
                <tr key={exp.id} className="border-b border-dark-border last:border-b-0 hover:bg-dark-surface/40 transition-colors group">
                  <td className="px-4 py-3 text-sm text-dark-text-secondary whitespace-nowrap">
                    {new Date(exp.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-sm text-dark-text">{exp.description}</td>
                  <td className="px-4 py-3">
                    <Badge style={{ backgroundColor: `${CAT_COLORS[exp.category] || '#8B949E'}20`, color: CAT_COLORS[exp.category] || '#8B949E' }}>
                      {exp.category}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-danger font-semibold text-sm">
                    -{formatCurrency(exp.amount)}
                  </td>
                  <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => deleteExpense(exp.id)}
                      className="text-danger hover:bg-danger/10 p-1 rounded transition-colors"
                    >
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
