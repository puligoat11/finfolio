import { memo, useEffect } from 'react';
import { ArrowDownLeft, ArrowUpRight, CircleDollarSign } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card, CardHeader, CardTitle, CardContent, Badge, Skeleton } from '@/components/ui';
import { useTradesStore } from '@/stores/tradesStore';
import { formatCurrency, formatRelativeTime } from '@/utils/formatters';
import type { Trade } from '@/types/models';

const TradeIcon = memo(function TradeIcon({ type }: { type: Trade['type'] }) {
  const iconMap = {
    buy: <ArrowDownLeft className="w-4 h-4" />,
    sell: <ArrowUpRight className="w-4 h-4" />,
    dividend: <CircleDollarSign className="w-4 h-4" />,
  };

  const colorMap = {
    buy: 'bg-success/10 text-success',
    sell: 'bg-danger/10 text-danger',
    dividend: 'bg-primary/10 text-primary',
  };

  return (
    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colorMap[type])}>
      {iconMap[type]}
    </div>
  );
});

const TradeRow = memo(function TradeRow({ trade }: { trade: Trade }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-dark-border last:border-b-0">
      <div className="flex items-center gap-3">
        <TradeIcon type={trade.type} />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-dark-text text-sm">{trade.symbol}</span>
            <Badge
              variant={
                trade.type === 'buy'
                  ? 'success'
                  : trade.type === 'sell'
                  ? 'danger'
                  : 'default'
              }
            >
              {trade.type.toUpperCase()}
            </Badge>
          </div>
          <p className="text-xs text-dark-text-secondary">
            {trade.shares} shares @ {formatCurrency(trade.price)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p
          className={cn(
            'font-medium text-sm',
            trade.type === 'sell' ? 'text-success' : 'text-dark-text'
          )}
        >
          {trade.type === 'sell' ? '+' : trade.type === 'buy' ? '-' : '+'}
          {formatCurrency(trade.total)}
        </p>
        <p className="text-xs text-dark-text-secondary">
          {formatRelativeTime(trade.date)}
        </p>
      </div>
    </div>
  );
});

export const RecentTrades = memo(function RecentTrades() {
  const { trades, isLoading, fetchTrades } = useTradesStore();

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  if (isLoading && trades.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="space-y-1">
                <Skeleton className="h-4 w-20 ml-auto" />
                <Skeleton className="h-3 w-16 ml-auto" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {trades.length === 0 ? (
          <div className="text-center py-6 text-dark-text-secondary">
            <p className="text-sm">No trades yet</p>
          </div>
        ) : (
          <div>
            {trades.slice(0, 5).map((trade) => (
              <TradeRow key={trade.id} trade={trade} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
