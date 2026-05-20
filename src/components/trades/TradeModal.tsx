import { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Search, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/cn';
import { useTradesStore } from '@/stores/tradesStore';
import { searchStocks, getStockQuote } from '@/services/api/yahooFinance';
import { formatCurrency } from '@/utils/formatters';
import type { TradeType } from '@/types/models';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

const TYPE_LABELS: Record<TradeType, string> = {
  buy:      'Buy',
  sell:     'Sell',
  dividend: 'Dividend',
};

export function TradeModal({ open, onClose }: Props) {
  const { addTrade } = useTradesStore();

  const [type, setType]           = useState<TradeType>('buy');
  const [symbol, setSymbol]       = useState('');
  const [name, setName]           = useState('');
  const [shares, setShares]       = useState('');
  const [price, setPrice]         = useState('');
  const [date, setDate]           = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes]         = useState('');
  const [status, setStatus]       = useState<Status>('idle');
  const [error, setError]         = useState('');

  // Symbol search
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<Array<{ symbol: string; name: string }>>([]);
  const [searching, setSearching] = useState(false);
  const searchRef                 = useRef<ReturnType<typeof setTimeout>>();

  const total = (parseFloat(shares) || 0) * (parseFloat(price) || 0);

  // Debounced symbol search
  useEffect(() => {
    if (query.length < 1) { setResults([]); return; }
    clearTimeout(searchRef.current);
    setSearching(true);
    searchRef.current = setTimeout(async () => {
      const res = await searchStocks(query);
      setResults(res.slice(0, 6));
      setSearching(false);
    }, 350);
    return () => clearTimeout(searchRef.current);
  }, [query]);

  async function handleSelectStock(sym: string, n: string) {
    setSymbol(sym);
    setName(n);
    setQuery('');
    setResults([]);
    // Auto-fetch current price
    const quote = await getStockQuote(sym);
    if (quote?.price) setPrice(quote.price.toFixed(2));
  }

  function reset() {
    setType('buy'); setSymbol(''); setName(''); setShares('');
    setPrice(''); setNotes(''); setQuery(''); setResults([]);
    setStatus('idle'); setError('');
    setDate(new Date().toISOString().split('T')[0]);
  }

  function handleClose() { reset(); onClose(); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!symbol || !shares || !price) {
      setError('Symbol, shares, and price are required.');
      return;
    }
    setStatus('loading');
    try {
      addTrade({
        symbol: symbol.toUpperCase(),
        name: name || symbol.toUpperCase(),
        type,
        shares: parseFloat(shares),
        price: parseFloat(price),
        total,
        date: new Date(date + 'T12:00:00'),
        notes: notes || undefined,
      });
      setStatus('success');
      setTimeout(() => { handleClose(); }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add trade');
      setStatus('error');
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-dark-card border border-dark-border rounded-2xl shadow-2xl p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-semibold text-dark-text">Add Trade</Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-dark-text-secondary hover:text-dark-text p-1 rounded-lg hover:bg-dark-surface transition-colors">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {status === 'success' ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <CheckCircle2 className="w-12 h-12 text-success" />
              <p className="text-dark-text font-medium">Trade Added</p>
              <p className="text-sm text-dark-text-secondary">
                {type.toUpperCase()} {shares} {symbol} @ {formatCurrency(parseFloat(price))}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Trade type */}
              <div>
                <label className="block text-xs font-medium text-dark-text-secondary uppercase tracking-wide mb-2">
                  Trade Type
                </label>
                <div className="flex gap-2">
                  {(['buy', 'sell', 'dividend'] as TradeType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={cn(
                        'flex-1 py-2 text-sm font-medium rounded-lg border transition-all',
                        type === t
                          ? t === 'buy'
                            ? 'bg-success/15 border-success text-success'
                            : t === 'sell'
                            ? 'bg-danger/15 border-danger text-danger'
                            : 'bg-primary/15 border-primary text-primary'
                          : 'border-dark-border text-dark-text-secondary hover:border-dark-text hover:text-dark-text'
                      )}
                    >
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Symbol search */}
              <div className="relative">
                <label className="block text-xs font-medium text-dark-text-secondary uppercase tracking-wide mb-2">
                  Stock Symbol
                </label>
                {symbol ? (
                  <div className="flex items-center gap-3 p-3 bg-dark-surface border border-dark-border rounded-lg">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">{symbol.slice(0, 2)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-dark-text text-sm">{symbol}</p>
                      <p className="text-xs text-dark-text-secondary truncate">{name}</p>
                    </div>
                    <button type="button" onClick={() => { setSymbol(''); setName(''); setPrice(''); }}
                      className="text-dark-text-secondary hover:text-dark-text text-xs underline">
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-text-secondary" />
                      <input
                        type="text"
                        placeholder="Search ticker or company name…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-dark-surface border border-dark-border rounded-lg text-sm text-dark-text placeholder:text-dark-text-secondary/50 focus:border-primary focus:outline-none"
                        autoFocus
                      />
                      {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-text-secondary animate-spin" />}
                    </div>
                    {results.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-dark-card border border-dark-border rounded-xl shadow-xl overflow-hidden">
                        {results.map(r => (
                          <button
                            key={r.symbol}
                            type="button"
                            onClick={() => handleSelectStock(r.symbol, r.name)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-dark-surface text-left transition-colors border-b border-dark-border/50 last:border-b-0"
                          >
                            <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-bold text-primary">{r.symbol.slice(0, 2)}</span>
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-dark-text text-sm">{r.symbol}</span>
                              <span className="text-dark-text-secondary text-xs ml-2 truncate">{r.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Shares, Price, Date */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-dark-text-secondary uppercase tracking-wide mb-2">
                    Shares
                  </label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    placeholder="0"
                    value={shares}
                    onChange={e => setShares(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-dark-text-secondary uppercase tracking-wide mb-2">
                    Price / Share
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-dark-text-secondary uppercase tracking-wide mb-2">
                    Date
                  </label>
                  <Input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-dark-text-secondary uppercase tracking-wide mb-2">
                  Notes <span className="normal-case font-normal">(optional)</span>
                </label>
                <textarea
                  placeholder="Add context, thesis, or reminders…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 bg-dark-surface border border-dark-border rounded-lg text-sm text-dark-text placeholder:text-dark-text-secondary/50 focus:border-primary focus:outline-none resize-none"
                />
              </div>

              {/* Total */}
              {total > 0 && (
                <div className="flex items-center justify-between px-4 py-3 bg-dark-surface rounded-lg border border-dark-border">
                  <span className="text-sm text-dark-text-secondary">
                    {type === 'buy' ? 'Total Cost' : type === 'sell' ? 'Total Proceeds' : 'Dividend Total'}
                  </span>
                  <span className="font-semibold text-dark-text">{formatCurrency(total)}</span>
                </div>
              )}

              {/* Error */}
              {(status === 'error' || error) && (
                <div className="flex items-center gap-2 text-danger text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error || 'Something went wrong.'}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="secondary" className="flex-1" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding…</>
                  ) : (
                    `Add ${TYPE_LABELS[type]}`
                  )}
                </Button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
