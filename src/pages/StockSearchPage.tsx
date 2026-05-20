import { useState, useEffect, useCallback } from 'react';
import { useStockSearchStore } from '@/stores/stockSearchStore';
import { useWatchlistStore } from '@/stores/watchlistStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { LineChart } from '@/components/charts/LineChart';
import { computeAnalystConsensus, computeUpside } from '@/types/models';

const CHART_RANGES = [
  { label: '1D', value: '1d' as const },
  { label: '1W', value: '5d' as const },
  { label: '1M', value: '1mo' as const },
  { label: '3M', value: '3mo' as const },
  { label: '1Y', value: '1y' as const },
  { label: '5Y', value: '5y' as const },
];

export function StockSearchPage() {
  const {
    query,
    searchResults,
    isSearching,
    selectedSymbol,
    selectedQuote,
    analystRatings,
    news,
    chartData,
    chartRange,
    isLoadingDetails,
    setQuery,
    search,
    selectStock,
    clearSelection,
    setChartRange,
  } = useStockSearchStore();

  const { addItem, removeItem, isInWatchlist } = useWatchlistStore();
  const [searchInput, setSearchInput] = useState('');

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.trim()) {
        search(searchInput);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, search]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      search(searchInput);
    }
  }, [searchInput, search]);

  const handleSelectStock = useCallback((symbol: string) => {
    setSearchInput('');
    setQuery('');
    selectStock(symbol);
  }, [selectStock, setQuery]);

  const handleToggleWatchlist = useCallback(() => {
    if (!selectedQuote) return;
    if (isInWatchlist(selectedQuote.symbol)) {
      removeItem(selectedQuote.symbol);
    } else {
      addItem(selectedQuote.symbol, selectedQuote.name);
    }
  }, [selectedQuote, isInWatchlist, addItem, removeItem]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const formatPercent = (value: number) =>
    `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toString();
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex gap-4">
          <Input
            placeholder="Search stocks by symbol or name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={isSearching}>
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </form>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && searchInput && (
          <div className="mt-2 border border-zinc-800 rounded-lg overflow-hidden">
            {searchResults.map((result) => (
              <button
                key={result.symbol}
                onClick={() => handleSelectStock(result.symbol)}
                className="w-full px-4 py-3 text-left hover:bg-zinc-800 flex justify-between items-center border-b border-zinc-800 last:border-b-0"
              >
                <div>
                  <span className="font-medium text-white">{result.symbol}</span>
                  <span className="text-zinc-400 ml-2">{result.name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Stock Details */}
      {selectedSymbol && (
        <>
          {isLoadingDetails ? (
            <Card className="p-6">
              <Skeleton className="h-8 w-32 mb-4" />
              <Skeleton className="h-12 w-48 mb-2" />
              <Skeleton className="h-6 w-24" />
            </Card>
          ) : selectedQuote ? (
            <>
              {/* Quote Header */}
              <Card className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-2xl font-bold text-white">{selectedQuote.symbol}</h1>
                      <Button
                        variant={isInWatchlist(selectedQuote.symbol) ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={handleToggleWatchlist}
                      >
                        {isInWatchlist(selectedQuote.symbol) ? 'In Watchlist' : 'Add to Watchlist'}
                      </Button>
                    </div>
                    <p className="text-zinc-400 mb-4">{selectedQuote.name}</p>
                    <div className="flex items-baseline gap-4">
                      <span className="text-4xl font-bold text-white">
                        {formatCurrency(selectedQuote.price)}
                      </span>
                      <span
                        className={`text-xl font-medium ${
                          selectedQuote.change >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}
                      >
                        {formatCurrency(selectedQuote.change)} ({formatPercent(selectedQuote.changePercent)})
                      </span>
                    </div>
                  </div>

                  <div className="text-right space-y-1 text-sm">
                    <div className="text-zinc-400">
                      Open: <span className="text-white">{formatCurrency(selectedQuote.open || 0)}</span>
                    </div>
                    <div className="text-zinc-400">
                      High: <span className="text-white">{formatCurrency(selectedQuote.high || 0)}</span>
                    </div>
                    <div className="text-zinc-400">
                      Low: <span className="text-white">{formatCurrency(selectedQuote.low || 0)}</span>
                    </div>
                    <div className="text-zinc-400">
                      Volume: <span className="text-white">{formatVolume(selectedQuote.volume || 0)}</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Chart */}
              <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-white">Price Chart</h2>
                  <div className="flex gap-1">
                    {CHART_RANGES.map((range) => (
                      <Button
                        key={range.value}
                        variant={chartRange === range.value ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setChartRange(range.value)}
                      >
                        {range.label}
                      </Button>
                    ))}
                  </div>
                </div>
                {chartData.length > 0 ? (
                  <LineChart
                    data={chartData}
                    height={300}
                    color={selectedQuote.change >= 0 ? 'green' : 'red'}
                  />
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-zinc-500">
                    No chart data available
                  </div>
                )}
              </Card>

              {/* Analyst Ratings */}
              {analystRatings && (
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Analyst Ratings</h2>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Badge
                          variant={
                            computeAnalystConsensus(analystRatings) === 'Buy'
                              ? 'success'
                              : computeAnalystConsensus(analystRatings) === 'Sell'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {computeAnalystConsensus(analystRatings)}
                        </Badge>
                        <span className="text-zinc-400">Consensus</span>
                      </div>

                      {/* Rating Bar */}
                      <div className="space-y-2">
                        <RatingBar label="Strong Buy" value={analystRatings.strongBuy} color="bg-green-600" />
                        <RatingBar label="Buy" value={analystRatings.buy} color="bg-green-500" />
                        <RatingBar label="Hold" value={analystRatings.hold} color="bg-yellow-500" />
                        <RatingBar label="Sell" value={analystRatings.sell} color="bg-red-500" />
                        <RatingBar label="Strong Sell" value={analystRatings.strongSell} color="bg-red-600" />
                      </div>
                    </div>

                    {analystRatings.targetPrice && (
                      <div>
                        <h3 className="text-zinc-400 mb-2">Price Target</h3>
                        <div className="text-3xl font-bold text-white mb-2">
                          {formatCurrency(analystRatings.targetPrice)}
                        </div>
                        {analystRatings.currentPrice && (
                          <div
                            className={`text-lg ${
                              computeUpside(analystRatings.targetPrice, analystRatings.currentPrice) >= 0
                                ? 'text-green-500'
                                : 'text-red-500'
                            }`}
                          >
                            {formatPercent(computeUpside(analystRatings.targetPrice, analystRatings.currentPrice))} upside
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* News */}
              {news.length > 0 && (
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Recent News</h2>
                  <div className="space-y-4">
                    {news.slice(0, 5).map((item) => (
                      <a
                        key={item.id}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-4 border border-zinc-800 rounded-lg hover:bg-zinc-800/50 transition-colors"
                      >
                        <div className="flex gap-4">
                          {item.imageUrl && (
                            <img
                              src={item.imageUrl}
                              alt=""
                              className="w-20 h-20 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <h3 className="font-medium text-white mb-1 line-clamp-2">{item.title}</h3>
                            <div className="flex items-center gap-2 text-sm text-zinc-400">
                              <span>{item.source}</span>
                              <span>-</span>
                              <span>{formatTimeAgo(item.publishedAt)}</span>
                            </div>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </Card>
              )}
            </>
          ) : (
            <Card className="p-6 text-center text-zinc-500">
              Failed to load stock data. Please try again.
            </Card>
          )}
        </>
      )}

      {/* Empty State */}
      {!selectedSymbol && !searchInput && (
        <Card className="p-12 text-center">
          <div className="text-zinc-500 mb-4">
            <svg
              className="w-16 h-16 mx-auto mb-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h3 className="text-lg font-medium text-white mb-2">Search for a stock</h3>
            <p>Enter a symbol or company name to get started</p>
          </div>
        </Card>
      )}
    </div>
  );
}

// Helper component for rating bars
function RatingBar({ label, value, color }: { label: string; value: number; color: string }) {
  const maxValue = 30; // Scale factor for display
  const width = Math.min((value / maxValue) * 100, 100);

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-zinc-400 w-24">{label}</span>
      <div className="flex-1 h-4 bg-zinc-800 rounded overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${width}%` }} />
      </div>
      <span className="text-sm text-white w-8 text-right">{value}</span>
    </div>
  );
}

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
