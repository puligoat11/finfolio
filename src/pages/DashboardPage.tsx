import { useEffect } from 'react';
import { RefreshCw, DollarSign, TrendingUp, BarChart3, Layers } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent, SkeletonCard } from '@/components/ui';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { PositionsTable } from '@/components/dashboard/PositionsTable';
import { PortfolioChart } from '@/components/portfolio/PortfolioChart';
import { WatchlistWidget } from '@/components/watchlist/WatchlistWidget';
import { RecentTrades } from '@/components/trades/RecentTrades';
import { TradeModal } from '@/components/trades/TradeModal';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { useUIStore } from '@/stores/uiStore';
import { formatCurrency, formatSignedCurrency } from '@/utils/formatters';

export default function DashboardPage() {
  const { summary, isLoading, positions, fetchPositions, refreshQuotes } = usePortfolioStore();
  const { isAddTradeOpen, openAddTrade, closeAddTrade } = useUIStore();

  useEffect(() => { fetchPositions(); }, [fetchPositions]);

  if (isLoading && !summary) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const dayPos  = (summary?.dayChange ?? 0) >= 0;
  const totalPos = (summary?.totalGain ?? 0) >= 0;

  return (
    <div className="p-6 space-y-6">
      <TradeModal open={isAddTradeOpen} onClose={closeAddTrade} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-text">Dashboard</h1>
          <p className="text-dark-text-secondary text-sm mt-0.5">Portfolio overview · live market data</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => refreshQuotes()} variant="secondary" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={openAddTrade} size="sm">
            + Add Trade
          </Button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Portfolio Value"
          value={formatCurrency(summary?.totalValue ?? 0)}
          change={formatSignedCurrency(summary?.dayChange ?? 0)}
          changePercent={summary?.dayChangePercent ?? 0}
          isPositive={dayPos}
          icon={<DollarSign className="w-5 h-5" />}
        />
        <MetricCard
          title="Day Change"
          value={formatSignedCurrency(summary?.dayChange ?? 0)}
          change={`${dayPos ? '+' : ''}${(summary?.dayChangePercent ?? 0).toFixed(2)}%`}
          isPositive={dayPos}
          showPercentage={false}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <MetricCard
          title="Total Gain"
          value={formatSignedCurrency(summary?.totalGain ?? 0)}
          change={`${totalPos ? '+' : ''}${(summary?.totalGainPercent ?? 0).toFixed(2)}%`}
          isPositive={totalPos}
          showPercentage={false}
          icon={<BarChart3 className="w-5 h-5" />}
        />
        <MetricCard
          title="Positions"
          value={String(summary?.positionsCount ?? 0)}
          change="Active holdings"
          isPositive={true}
          showPercentage={false}
          icon={<Layers className="w-5 h-5" />}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <PortfolioChart positions={positions} />
            </CardContent>
          </Card>
          <PositionsTable />
        </div>

        <div className="col-span-4 space-y-6">
          <WatchlistWidget />
          <RecentTrades />
        </div>
      </div>
    </div>
  );
}
