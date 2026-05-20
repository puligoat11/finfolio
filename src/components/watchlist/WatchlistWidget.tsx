import { memo, useEffect } from 'react';
import { Star, Plus, RefreshCw } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card, CardHeader, CardTitle, CardContent, Button, Skeleton } from '@/components/ui';
import { useWatchlistStore } from '@/stores/watchlistStore';
import { useUIStore } from '@/stores/uiStore';
import { formatCurrency, formatSignedPercent } from '@/utils/formatters';
import type { WatchlistItem } from '@/types/models';

const WatchlistItemRow = memo(function WatchlistItemRow({
  item,
}: {
  item: WatchlistItem;
}) {
  const openStockDetail = useUIStore((s) => s.openStockDetail);

  return (
    <div
      onClick={() => openStockDetail(item.symbol)}
      className="flex items-center justify-between py-3 px-1 border-b border-dark-border last:border-b-0 cursor-pointer hover:bg-dark-surface/30 transition-colors -mx-1 rounded"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <span className="text-xs font-semibold text-primary">
            {item.symbol.slice(0, 2)}
          </span>
        </div>
        <div>
          <p className="font-medium text-dark-text text-sm">{item.symbol}</p>
          <p className="text-xs text-dark-text-secondary truncate max-w-[120px]">
            {item.name}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-medium text-dark-text text-sm">
          {formatCurrency(item.price)}
        </p>
        <p
          className={cn(
            'text-xs font-medium',
            item.change >= 0 ? 'text-success' : 'text-danger'
          )}
        >
          {formatSignedPercent(item.changePercent)}
        </p>
      </div>
    </div>
  );
});

export const WatchlistWidget = memo(function WatchlistWidget() {
  const { items, isLoading, fetchWatchlist, refreshQuotes } = useWatchlistStore();

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  if (isLoading && items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            Watchlist
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <div className="space-y-1">
                <Skeleton className="h-4 w-16 ml-auto" />
                <Skeleton className="h-3 w-12 ml-auto" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Star className="w-4 h-4" />
          Watchlist
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refreshQuotes()}
            className="p-1.5 h-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="p-1.5 h-auto">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-6 text-dark-text-secondary">
            <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No items in watchlist</p>
          </div>
        ) : (
          <div>
            {items.slice(0, 5).map((item) => (
              <WatchlistItemRow key={item.symbol} item={item} />
            ))}
            {items.length > 5 && (
              <button className="w-full text-center text-sm text-primary hover:text-primary-light py-2 mt-2">
                View all {items.length} items
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
