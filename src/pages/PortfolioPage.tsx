import { useEffect, useMemo } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, ChevronUp, ChevronDown } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';
import { Button, Card, CardHeader, CardTitle, CardContent, SkeletonCard } from '@/components/ui';
import { PortfolioChart } from '@/components/portfolio/PortfolioChart';
import { usePortfolioStore, useSortedPositions, type SortField } from '@/stores/portfolioStore';
import { formatCurrency, formatSignedCurrency, formatSignedPercent } from '@/utils/formatters';
import { cn } from '@/utils/cn';

const ALLOCATION_COLORS = [
  '#1a73e8', '#00C853', '#FFB300', '#FF5252', '#e91e63',
  '#9c27b0', '#00bcd4', '#ff9800',
];

function SortIcon({ field, sortField, dir }: { field: SortField; sortField: SortField; dir: 'asc' | 'desc' }) {
  if (field !== sortField) return <span className="w-4 inline-block" />;
  return dir === 'asc' ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />;
}

export default function PortfolioPage() {
  const { summary, isLoading, fetchPositions, refreshQuotes, setSort, sortField, sortDirection } = usePortfolioStore();
  const positions = useSortedPositions();

  useEffect(() => { fetchPositions(); }, [fetchPositions]);

  const allocationData = useMemo(() => {
    const total = positions.reduce((s, p) => s + p.marketValue, 0);
    return positions.map((p, i) => ({
      name: p.symbol,
      value: p.marketValue,
      pct: total > 0 ? (p.marketValue / total) * 100 : 0,
      color: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length],
    }));
  }, [positions]);

  const cols: { label: string; field: SortField; align: 'left' | 'right' }[] = [
    { label: 'Symbol',        field: 'symbol',      align: 'left'  },
    { label: 'Shares',        field: 'shares',      align: 'right' },
    { label: 'Avg Cost',      field: 'symbol',      align: 'right' },
    { label: 'Current',       field: 'marketValue', align: 'right' },
    { label: 'Market Value',  field: 'marketValue', align: 'right' },
    { label: 'Day P&L',       field: 'dayGain',     align: 'right' },
    { label: 'Total P&L',     field: 'totalGain',   align: 'right' },
    { label: 'Weight',        field: 'marketValue', align: 'right' },
  ];

  if (isLoading && !summary) {
    return <div className="p-6 grid grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>;
  }

  const totalValue = summary?.totalValue ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-text">Portfolio</h1>
          <p className="text-dark-text-secondary text-sm mt-0.5">{positions.length} holdings · {formatCurrency(totalValue)}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => refreshQuotes()}>
          <RefreshCw className="w-4 h-4 mr-2" />Refresh Quotes
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Value', value: formatCurrency(totalValue),                              sub: `${positions.length} positions`,                        pos: true },
          { label: 'Day P&L',     value: formatSignedCurrency(summary?.dayChange ?? 0),           sub: formatSignedPercent(summary?.dayChangePercent ?? 0),   pos: (summary?.dayChange  ?? 0) >= 0 },
          { label: 'Total P&L',   value: formatSignedCurrency(summary?.totalGain ?? 0),           sub: formatSignedPercent(summary?.totalGainPercent ?? 0),   pos: (summary?.totalGain  ?? 0) >= 0 },
          { label: 'Cost Basis',  value: formatCurrency(totalValue - (summary?.totalGain ?? 0)),  sub: 'Amount invested',                                     pos: true },
        ].map(c => (
          <Card key={c.label} className="p-4">
            <p className="text-xs text-dark-text-secondary uppercase tracking-wide">{c.label}</p>
            <p className="text-xl font-bold text-dark-text mt-1">{c.value}</p>
            <p className={cn('text-sm mt-0.5', c.pos ? 'text-success' : 'text-danger')}>{c.sub}</p>
          </Card>
        ))}
      </div>

      {/* Performance chart */}
      <Card>
        <CardHeader><CardTitle>Performance vs. Benchmarks</CardTitle></CardHeader>
        <CardContent><PortfolioChart positions={positions} /></CardContent>
      </Card>

      {/* Allocation + Holdings */}
      <div className="grid grid-cols-12 gap-6">
        {/* Allocation pie */}
        <div className="col-span-4">
          <Card>
            <CardHeader><CardTitle>Allocation</CardTitle></CardHeader>
            <CardContent className="pb-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={allocationData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                    {allocationData.map((entry, i) => (
                      <Cell key={entry.name} fill={ALLOCATION_COLORS[i % ALLOCATION_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(v: number, _n: string, props) => [`${formatCurrency(v)} (${props.payload.pct.toFixed(1)}%)`, props.payload.name]}
                    contentStyle={{ background: '#21262D', border: '1px solid #30363D', borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {allocationData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }} />
                      <span className="text-dark-text font-medium">{d.name}</span>
                    </div>
                    <span className="text-dark-text-secondary">{d.pct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Holdings table */}
        <div className="col-span-8">
          <Card>
            <CardHeader><CardTitle>Holdings</CardTitle></CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-dark-surface/50">
                    {cols.map(c => (
                      <th
                        key={c.label}
                        onClick={() => setSort(c.field)}
                        className={cn(
                          'px-4 py-3 text-xs font-medium text-dark-text-secondary uppercase tracking-wider cursor-pointer hover:text-dark-text transition-colors select-none',
                          c.align === 'right' ? 'text-right' : 'text-left'
                        )}
                      >
                        {c.label} <SortIcon field={c.field} sortField={sortField} dir={sortDirection} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {positions.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-16 text-center text-dark-text-secondary">No positions yet</td></tr>
                  ) : positions.map(p => {
                    const weight = totalValue > 0 ? (p.marketValue / totalValue) * 100 : 0;
                    return (
                      <tr key={p.symbol} className="border-b border-dark-border last:border-b-0 hover:bg-dark-surface/40 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-dark-text text-sm">{p.symbol}</p>
                          <p className="text-xs text-dark-text-secondary truncate max-w-[110px]">{p.name}</p>
                        </td>
                        <td className="px-4 py-3.5 text-right text-dark-text text-sm">{p.shares.toLocaleString()}</td>
                        <td className="px-4 py-3.5 text-right text-dark-text-secondary text-sm">{formatCurrency(p.avgCost)}</td>
                        <td className="px-4 py-3.5 text-right text-dark-text text-sm font-medium">{formatCurrency(p.currentPrice)}</td>
                        <td className="px-4 py-3.5 text-right text-dark-text text-sm font-semibold">{formatCurrency(p.marketValue)}</td>
                        <td className="px-4 py-3.5 text-right">
                          <div className={cn('text-sm font-medium flex flex-col items-end', p.dayGain >= 0 ? 'text-success' : 'text-danger')}>
                            <div className="flex items-center gap-1">
                              {p.dayGain >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {formatSignedCurrency(p.dayGain)}
                            </div>
                            <span className="text-xs">{formatSignedPercent(p.dayGainPercent)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className={cn('text-sm font-medium flex flex-col items-end', p.totalGain >= 0 ? 'text-success' : 'text-danger')}>
                            {formatSignedCurrency(p.totalGain)}
                            <span className="text-xs">{formatSignedPercent(p.totalGainPercent)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-14 h-1 bg-dark-surface rounded-full overflow-hidden">
                              <div className="h-full bg-primary/70 rounded-full" style={{ width: `${Math.min(weight * 2, 100)}%` }} />
                            </div>
                            <span className="text-xs text-dark-text-secondary tabular-nums w-9 text-right">{weight.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
