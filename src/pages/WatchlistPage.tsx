import { useEffect, useState, useCallback } from 'react';
import { Plus, RefreshCw, Search, Star, Trash2, Loader2 } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { SparkLine } from '@/components/charts/SparkLine';
import { useWatchlistStore } from '@/stores/watchlistStore';
import { searchStocks, getChartData, getStockQuote } from '@/services/api/yahooFinance';
import { formatCurrency, formatSignedPercent, formatMarketCap, formatVolume } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import type { WatchlistItem } from '@/types/models';

interface PerformanceData {
  fiveDay:   number;
  oneMonth:  number;
  sixMonth:  number;
  marketCap?: number;
  volume?:   number;
  sparkline: number[];
}

function PctCell({ value }: { value: number }) {
  return (
    <span className={cn('text-sm font-medium tabular-nums', value >= 0 ? 'text-success' : 'text-danger')}>
      {formatSignedPercent(value)}
    </span>
  );
}

export default function WatchlistPage() {
  const { items, isLoading, fetchWatchlist, refreshQuotes, addItem, removeItem } = useWatchlistStore();

  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<Array<{ symbol: string; name: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [perf, setPerf]         = useState<Record<string, PerformanceData>>({});
  const [perfLoading, setPerfLoading] = useState(false);
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);

  useEffect(() => { fetchWatchlist(); }, [fetchWatchlist]);

  const loadPerf = useCallback(async (watchItems: WatchlistItem[]) => {
    if (watchItems.length === 0) return;
    setPerfLoading(true);

    const results: Record<string, PerformanceData> = {};

    await Promise.all(watchItems.map(async item => {
      try {
        const [chartSixMo, quote] = await Promise.all([
          getChartData(item.symbol, '6mo'),
          getStockQuote(item.symbol),
        ]);

        if (chartSixMo.length === 0) return;

        const prices = chartSixMo.map(p => p.value);
        const now    = prices[prices.length - 1] || item.price;
        const oneMonthIdx  = Math.max(0, prices.length - 22);
        const fiveDayIdx   = Math.max(0, prices.length - 5);

        const fiveDay  = prices[fiveDayIdx]  > 0 ? ((now - prices[fiveDayIdx])  / prices[fiveDayIdx])  * 100 : 0;
        const oneMonth = prices[oneMonthIdx] > 0 ? ((now - prices[oneMonthIdx]) / prices[oneMonthIdx]) * 100 : 0;
        const sixMonth = prices[0]           > 0 ? ((now - prices[0])           / prices[0])           * 100 : 0;

        results[item.symbol] = {
          fiveDay,
          oneMonth,
          sixMonth,
          marketCap: quote?.marketCap,
          volume:    quote?.volume,
          sparkline: prices.slice(-30),
        };
      } catch {
        /* skip on error */
      }
    }));

    setPerf(results);
    setPerfLoading(false);
  }, []);

  useEffect(() => { if (items.length > 0) loadPerf(items); }, [items, loadPerf]);

  // Debounced search
  useEffect(() => {
    if (query.length < 1) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await searchStocks(query);
      setResults(res.filter(r => !items.some(i => i.symbol === r.symbol)).slice(0, 7));
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [query, items]);

  async function handleAdd(symbol: string, name: string) {
    setAddingSymbol(symbol);
    addItem(symbol, name);
    setQuery('');
    setResults([]);
    setAddingSymbol(null);
  }

  const HEADERS = ['Stock', 'Price', 'Day', '5D', '1M', '6M', 'Mkt Cap', 'Volume', '30D Chart', ''];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-text">Watchlist</h1>
          <p className="text-dark-text-secondary text-sm mt-0.5">{items.length} stocks · auto-refreshes every 5 minutes</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => { refreshQuotes(); loadPerf(items); }}>
          <RefreshCw className="w-4 h-4 mr-2" />Refresh
        </Button>
      </div>

      {/* Add stock */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="w-4 h-4" />Add to Watchlist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-text-secondary" />
            <input
              type="text"
              placeholder="Search ticker or company name (e.g. AAPL, Apple)…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-dark-surface border border-dark-border rounded-lg text-sm text-dark-text placeholder:text-dark-text-secondary/50 focus:border-primary focus:outline-none"
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-text-secondary animate-spin" />}

            {results.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-dark-card border border-dark-border rounded-xl shadow-xl overflow-hidden">
                {results.map(r => (
                  <button
                    key={r.symbol}
                    onClick={() => handleAdd(r.symbol, r.name)}
                    disabled={addingSymbol === r.symbol}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-dark-surface transition-colors border-b border-dark-border/50 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">{r.symbol.slice(0, 2)}</span>
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-dark-text text-sm">{r.symbol}</p>
                        <p className="text-xs text-dark-text-secondary">{r.name}</p>
                      </div>
                    </div>
                    {addingSymbol === r.symbol
                      ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      : <Plus className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="w-4 h-4" />Watchlist
          </CardTitle>
          {perfLoading && (
            <span className="flex items-center gap-1.5 text-xs text-dark-text-secondary">
              <Loader2 className="w-3 h-3 animate-spin" />Loading performance…
            </span>
          )}
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-surface/50">
                {HEADERS.map(h => (
                  <th key={h} className={cn(
                    'px-4 py-3 text-xs font-medium text-dark-text-secondary uppercase tracking-wider whitespace-nowrap',
                    h === 'Stock' || h === '' ? 'text-left' : 'text-right'
                  )}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-dark-text-secondary text-sm">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <Star className="w-10 h-10 mx-auto text-dark-text-secondary/20 mb-3" />
                    <p className="text-dark-text-secondary text-sm">Your watchlist is empty</p>
                    <p className="text-xs text-dark-text-secondary/60 mt-1">Search for stocks above to add them</p>
                  </td>
                </tr>
              ) : items.map(item => {
                const p = perf[item.symbol];
                return (
                  <tr key={item.symbol} className="border-b border-dark-border last:border-b-0 hover:bg-dark-surface/40 transition-colors group">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary">{item.symbol.slice(0, 2)}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-dark-text text-sm">{item.symbol}</p>
                          <p className="text-xs text-dark-text-secondary truncate max-w-[140px]">{item.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-semibold text-dark-text text-sm">{item.price > 0 ? formatCurrency(item.price) : '—'}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <PctCell value={item.changePercent} />
                    </td>
                    <td className="px-4 py-4 text-right">
                      {p ? <PctCell value={p.fiveDay} /> : <span className="text-dark-text-secondary text-sm">—</span>}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {p ? <PctCell value={p.oneMonth} /> : <span className="text-dark-text-secondary text-sm">—</span>}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {p ? <PctCell value={p.sixMonth} /> : <span className="text-dark-text-secondary text-sm">—</span>}
                    </td>
                    <td className="px-4 py-4 text-right text-dark-text-secondary text-sm">
                      {p?.marketCap ? formatMarketCap(p.marketCap) : '—'}
                    </td>
                    <td className="px-4 py-4 text-right text-dark-text-secondary text-sm">
                      {p?.volume ? formatVolume(p.volume) : '—'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center w-24">
                        {p?.sparkline.length ? (
                          <SparkLine data={p.sparkline} positive={(p.oneMonth ?? 0) >= 0} />
                        ) : (
                          <span className="text-dark-text-secondary text-sm">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => removeItem(item.symbol)}
                        className="p-1.5 rounded-lg text-dark-text-secondary hover:text-danger hover:bg-danger/10 transition-colors"
                        title="Remove from watchlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
