import { useEffect, useState } from 'react';
import {
  Plus, Download, Search, ArrowDownLeft, ArrowUpRight,
  CircleDollarSign, Trash2,
} from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, Badge, Input } from '@/components/ui';
import { TradeModal } from '@/components/trades/TradeModal';
import { useTradesStore, useFilteredTrades } from '@/stores/tradesStore';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import type { Trade, TradeType } from '@/types/models';

const TYPE_ICON: Record<TradeType, JSX.Element> = {
  buy:      <ArrowDownLeft className="w-4 h-4" />,
  sell:     <ArrowUpRight className="w-4 h-4" />,
  dividend: <CircleDollarSign className="w-4 h-4" />,
};
const TYPE_COLOR: Record<TradeType, string> = {
  buy:      'bg-success/10 text-success',
  sell:     'bg-danger/10 text-danger',
  dividend: 'bg-primary/10 text-primary',
};
const BADGE_VARIANT: Record<TradeType, 'success' | 'danger' | 'default'> = {
  buy: 'success', sell: 'danger', dividend: 'default',
};

function exportCSV(trades: Trade[]) {
  const header = 'Date,Symbol,Name,Type,Shares,Price,Total,Notes';
  const rows = trades.map(t =>
    [formatDate(t.date), t.symbol, `"${t.name}"`, t.type, t.shares, t.price, t.total, t.notes || ''].join(',')
  );
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `trades-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

export default function TradesPage() {
  const { fetchTrades, deleteTrade, setFilterType, filterType } = useTradesStore();
  const trades = useFilteredTrades();
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch]       = useState('');

  useEffect(() => { fetchTrades(); }, [fetchTrades]);

  const visible = trades.filter(t =>
    t.symbol.toLowerCase().includes(search.toLowerCase()) ||
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalBuys      = trades.filter(t => t.type === 'buy').reduce((s, t) => s + t.total, 0);
  const totalSells     = trades.filter(t => t.type === 'sell').reduce((s, t) => s + t.total, 0);
  const totalDividends = trades.filter(t => t.type === 'dividend').reduce((s, t) => s + t.total, 0);

  return (
    <div className="p-6 space-y-6">
      <TradeModal open={modalOpen} onClose={() => { setModalOpen(false); fetchTrades(); }} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-text">Trade History</h1>
          <p className="text-dark-text-secondary text-sm mt-0.5">All executions · {trades.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => exportCSV(trades)}>
            <Download className="w-4 h-4 mr-2" />Export
          </Button>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />Add Trade
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Trades', value: String(trades.length), color: 'text-dark-text' },
          { label: 'Total Bought',    value: `-${formatCurrency(totalBuys)}`,     color: 'text-danger'  },
          { label: 'Total Sold',      value: `+${formatCurrency(totalSells)}`,    color: 'text-success' },
          { label: 'Dividends',       value: `+${formatCurrency(totalDividends)}`,color: 'text-primary' },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-dark-text-secondary uppercase tracking-wide">{s.label}</p>
            <p className={cn('text-xl font-semibold mt-1', s.color)}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>All Trades</CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-text-secondary" />
              <input
                type="text"
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-dark-surface border border-dark-border rounded-lg text-sm text-dark-text placeholder:text-dark-text-secondary/50 focus:border-primary focus:outline-none w-52"
              />
            </div>
            <div className="flex items-center gap-1 bg-dark-surface rounded-lg p-1">
              {(['all', 'buy', 'sell', 'dividend'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t === 'all' ? null : t)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded transition-colors capitalize',
                    (filterType === null && t === 'all') || filterType === t
                      ? 'bg-primary text-white'
                      : 'text-dark-text-secondary hover:text-dark-text'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-surface/50">
                {['Stock', 'Type', 'Shares', 'Price', 'Total', 'Date', 'Notes', ''].map(h => (
                  <th key={h} className={cn(
                    'px-4 py-3 text-xs font-medium text-dark-text-secondary uppercase tracking-wider',
                    h === '' || h === 'Notes' ? 'text-left' : h === 'Stock' || h === 'Type' ? 'text-left' : 'text-right'
                  )}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-dark-text-secondary">
                    {trades.length === 0 ? 'No trades yet. Click "Add Trade" to get started.' : 'No results match your search.'}
                  </td>
                </tr>
              ) : visible.map(trade => (
                <tr key={trade.id} className="border-b border-dark-border last:border-b-0 hover:bg-dark-surface/40 transition-colors group">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', TYPE_COLOR[trade.type])}>
                        {TYPE_ICON[trade.type]}
                      </div>
                      <div>
                        <p className="font-semibold text-dark-text text-sm">{trade.symbol}</p>
                        <p className="text-xs text-dark-text-secondary truncate max-w-[120px]">{trade.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant={BADGE_VARIANT[trade.type]}>{trade.type.toUpperCase()}</Badge>
                  </td>
                  <td className="px-4 py-4 text-right text-dark-text text-sm">{trade.shares.toLocaleString()}</td>
                  <td className="px-4 py-4 text-right text-dark-text text-sm">{formatCurrency(trade.price)}</td>
                  <td className="px-4 py-4 text-right">
                    <span className={cn('font-medium text-sm', trade.type === 'sell' ? 'text-success' : 'text-dark-text')}>
                      {trade.type === 'sell' ? '+' : trade.type === 'buy' ? '-' : '+'}{formatCurrency(trade.total)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right text-dark-text-secondary text-sm whitespace-nowrap">
                    {formatDate(trade.date)}
                  </td>
                  <td className="px-4 py-4 text-left">
                    <span className="text-xs text-dark-text-secondary truncate max-w-[150px] block">{trade.notes || '—'}</span>
                  </td>
                  <td className="px-4 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { if (confirm(`Delete this ${trade.type} trade for ${trade.symbol}?`)) deleteTrade(trade.id); }}
                      className="p-1.5 rounded-lg text-dark-text-secondary hover:text-danger hover:bg-danger/10 transition-colors"
                      title="Delete trade"
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
