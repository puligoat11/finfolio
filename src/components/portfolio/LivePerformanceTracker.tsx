import { useEffect, useState, useCallback, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { getChartData, isMarketOpen } from '@/services/api/yahooFinance';
import { formatCurrency, formatSignedCurrency, formatSignedPercent } from '@/utils/formatters';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import type { Position } from '@/types/models';

interface DayPoint {
  time: string;
  value: number;
  ts: number;
}

function buildDayPortfolio(
  positions: Position[],
  charts: Map<string, Array<{ date: Date; value: number }>>
): DayPoint[] {
  const timeMap = new Map<string, { ts: number; prices: Map<string, number> }>();

  charts.forEach((pts, symbol) => {
    pts.forEach(pt => {
      const time = pt.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      if (!timeMap.has(time)) {
        timeMap.set(time, { ts: pt.date.getTime(), prices: new Map() });
      }
      timeMap.get(time)!.prices.set(symbol, pt.value);
    });
  });

  if (timeMap.size === 0) return [];

  return Array.from(timeMap.entries())
    .sort(([, a], [, b]) => a.ts - b.ts)
    .map(([time, { ts, prices }]) => ({
      time,
      ts,
      value: positions.reduce((sum, p) => sum + p.shares * (prices.get(p.symbol) ?? p.currentPrice), 0),
    }));
}

export function LivePerformanceTracker() {
  const { positions, summary, refreshQuotes } = usePortfolioStore();
  const [data, setData] = useState<DayPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const live = isMarketOpen();

  const dayChange = summary?.dayChange ?? 0;
  const dayChangePct = summary?.dayChangePercent ?? 0;
  const totalValue = summary?.totalValue ?? 0;
  const baselineValue = totalValue - dayChange;
  const positive = dayChange >= 0;

  const loadChart = useCallback(async () => {
    if (positions.length === 0) return;
    setLoading(true);
    try {
      const results = await Promise.all(
        positions.map(p => getChartData(p.symbol, '1d').then(pts => [p.symbol, pts] as const))
      );
      const chartMap = new Map(results);
      setData(buildDayPortfolio(positions, chartMap));
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, [positions]);

  const refresh = useCallback(async () => {
    await refreshQuotes();
    await loadChart();
  }, [refreshQuotes, loadChart]);

  useEffect(() => { loadChart(); }, [loadChart]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (live) {
      intervalRef.current = setInterval(refresh, 60_000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [live, refresh]);

  if (positions.length === 0) return null;

  const TrendIcon = positive ? TrendingUp : TrendingDown;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Live Performance</CardTitle>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs text-dark-text-secondary">
                Updated {lastRefresh.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
            {live ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-success">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                </span>
                LIVE
              </span>
            ) : (
              <span className="text-xs text-dark-text-secondary px-2 py-0.5 bg-dark-surface rounded-full border border-dark-border">
                Market closed
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats + chart */}
        <div className="grid grid-cols-12 gap-4 items-center">
          {/* Stats */}
          <div className="col-span-3 space-y-3">
            <div>
              <p className="text-xs text-dark-text-secondary mb-0.5">Portfolio Value</p>
              <p className="text-2xl font-bold text-dark-text">{formatCurrency(totalValue)}</p>
            </div>
            <div>
              <p className="text-xs text-dark-text-secondary mb-0.5">Today's P&L</p>
              <p className={cn('text-lg font-bold', positive ? 'text-success' : 'text-danger')}>
                {formatSignedCurrency(dayChange)}
              </p>
            </div>
            <div>
              <p className="text-xs text-dark-text-secondary mb-0.5">Return</p>
              <div className={cn('flex items-center gap-1 text-lg font-bold', positive ? 'text-success' : 'text-danger')}>
                <TrendIcon className="w-4 h-4" />
                {formatSignedPercent(dayChangePct)}
              </div>
            </div>
          </div>

          {/* Intraday chart */}
          <div className="col-span-9 h-[140px]">
            {loading && data.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-dark-text-secondary" />
              </div>
            ) : data.length === 0 ? (
              <div className="h-full flex items-center justify-center text-dark-text-secondary text-sm">
                No intraday data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="liveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={positive ? '#00C853' : '#FF5252'} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={positive ? '#00C853' : '#FF5252'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="time"
                    tick={{ fill: '#8B949E', fontSize: 10 }}
                    tickLine={false} axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fill: '#8B949E', fontSize: 10 }}
                    tickLine={false} axisLine={false}
                    tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                    width={48}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const val = payload[0].value as number;
                      const chg = val - baselineValue;
                      return (
                        <div className="bg-dark-card border border-dark-border rounded-xl px-3 py-2 shadow-xl text-left">
                          <p className="text-xs text-dark-text-secondary mb-1">{label}</p>
                          <p className="text-sm font-bold text-dark-text">{formatCurrency(val)}</p>
                          <p className={cn('text-xs font-semibold', chg >= 0 ? 'text-success' : 'text-danger')}>
                            {formatSignedCurrency(chg)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  {baselineValue > 0 && (
                    <ReferenceLine y={baselineValue} stroke="#444c56" strokeDasharray="3 3" strokeWidth={1} />
                  )}
                  <Area
                    type="monotone" dataKey="value" name="Portfolio"
                    stroke={positive ? '#00C853' : '#FF5252'} strokeWidth={2}
                    fill="url(#liveGrad)" dot={false}
                    activeDot={{ r: 3, fill: positive ? '#00C853' : '#FF5252' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Position breakdown */}
        <div>
          <p className="text-xs text-dark-text-secondary uppercase tracking-wider mb-2">Position Breakdown</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[...positions]
              .sort((a, b) => Math.abs(b.dayGain) - Math.abs(a.dayGain))
              .map(p => {
                const pos = p.dayGain >= 0;
                return (
                  <div
                    key={p.symbol}
                    className="flex-shrink-0 flex items-center justify-between gap-4 bg-dark-surface rounded-lg px-3 py-2 border border-dark-border"
                  >
                    <div>
                      <p className="text-xs font-semibold text-dark-text">{p.symbol}</p>
                      <p className="text-[10px] text-dark-text-secondary">{formatCurrency(p.currentPrice)}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn('text-xs font-semibold', pos ? 'text-success' : 'text-danger')}>
                        {formatSignedCurrency(p.dayGain)}
                      </p>
                      <p className={cn('text-[10px]', pos ? 'text-success/70' : 'text-danger/70')}>
                        {formatSignedPercent(p.dayGainPercent)}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
