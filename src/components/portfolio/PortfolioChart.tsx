import { useEffect, useState, useCallback } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { getChartData } from '@/services/api/yahooFinance';
import { formatCurrency, formatSignedPercent } from '@/utils/formatters';
import type { Position } from '@/types/models';

type Period = '5D' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'MAX';

const periodToRange: Record<Period, string> = {
  '5D': '5d', '1M': '1mo', '3M': '3mo',
  '6M': '6mo', 'YTD': 'ytd', '1Y': '1y', 'MAX': 'max',
};

interface ChartPoint {
  date: string;
  portfolio: number;
  sp500: number;
  nasdaq: number;
}

interface Props {
  positions: Position[];
}

const PERIODS: Period[] = ['5D', '1M', '3M', '6M', 'YTD', '1Y', 'MAX'];

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-card border border-dark-border rounded-xl px-4 py-3 shadow-xl min-w-[180px]">
      <p className="text-xs text-dark-text-secondary mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center justify-between gap-6 mb-1">
          <span className="text-xs text-dark-text-secondary" style={{ color: p.color }}>{p.name}</span>
          <span className="text-sm font-semibold text-dark-text">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function PortfolioChart({ positions }: Props) {
  const [period, setPeriod] = useState<Period>('1Y');
  const [data, setData]     = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSpy, setShowSpy]     = useState(true);
  const [showQqq, setShowQqq]     = useState(false);

  const load = useCallback(async () => {
    if (positions.length === 0) return;
    setLoading(true);

    const range = periodToRange[period] as '5d' | '1mo' | '3mo' | '6mo' | 'ytd' | '1y' | 'max';

    const [spyData, qqqData, ...positionCharts] = await Promise.all([
      getChartData('SPY', range),
      getChartData('QQQ', range),
      ...positions.map(p => getChartData(p.symbol, range)),
    ]);

    if (!spyData.length) { setLoading(false); return; }

    // Build date-keyed price maps for each position
    const priceMaps = positions.map((pos, i) => {
      const m = new Map<string, number>();
      positionCharts[i].forEach(pt => {
        m.set(pt.date.toISOString().split('T')[0], pt.value);
      });
      return { pos, map: m };
    });

    const spyMap = new Map(spyData.map(pt => [pt.date.toISOString().split('T')[0], pt.value]));
    const qqqMap = new Map(qqqData.map(pt => [pt.date.toISOString().split('T')[0], pt.value]));

    const dates = spyData.map(pt => pt.date.toISOString().split('T')[0]);

    // Calculate portfolio value at each date
    const portfolioSeries = dates.map(date => {
      return priceMaps.reduce((sum, { pos, map }) => {
        const price = map.get(date) ?? pos.currentPrice;
        return sum + pos.shares * price;
      }, 0);
    });

    const startPortfolio = portfolioSeries[0] || 1;
    const startSpy = spyData[0]?.value || 1;
    const startQqq = qqqData[0]?.value || 1;

    const points: ChartPoint[] = dates.map((date, i) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      portfolio: portfolioSeries[i],
      sp500: (spyMap.get(date) ?? startSpy) / startSpy * startPortfolio,
      nasdaq: (qqqMap.get(date) ?? startQqq) / startQqq * startPortfolio,
    }));

    setData(points);
    setLoading(false);
  }, [positions, period]);

  useEffect(() => { load(); }, [load]);

  const start = data[0]?.portfolio ?? 0;
  const end   = data[data.length - 1]?.portfolio ?? 0;
  const gain  = end - start;
  const gainPct = start > 0 ? (gain / start) * 100 : 0;
  const positive = gain >= 0;

  return (
    <div className="space-y-4">
      {/* Period selector + gain summary */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          {!loading && data.length > 0 && (
            <div className="flex items-center gap-2">
              <span className={cn('text-lg font-bold', positive ? 'text-success' : 'text-danger')}>
                {positive ? '+' : ''}{formatCurrency(gain)}
              </span>
              <span className={cn('text-sm', positive ? 'text-success' : 'text-danger')}>
                ({formatSignedPercent(gainPct)})
              </span>
              <span className="text-xs text-dark-text-secondary">this period</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Benchmark toggles */}
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setShowSpy(v => !v)}
              className={cn('flex items-center gap-1.5 px-2 py-1 rounded border transition-colors', showSpy ? 'border-[#94a3b8] text-[#94a3b8]' : 'border-dark-border text-dark-text-secondary')}
            >
              <span className="w-3 h-0.5 bg-[#94a3b8]" />S&P 500
            </button>
            <button
              onClick={() => setShowQqq(v => !v)}
              className={cn('flex items-center gap-1.5 px-2 py-1 rounded border transition-colors', showQqq ? 'border-[#64748b] text-[#64748b]' : 'border-dark-border text-dark-text-secondary')}
            >
              <span className="w-3 h-0.5 bg-[#64748b]" />Nasdaq
            </button>
          </div>

          {/* Period buttons */}
          <div className="flex items-center gap-1 bg-dark-surface rounded-lg p-1">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded transition-colors',
                  period === p ? 'bg-primary text-white' : 'text-dark-text-secondary hover:text-dark-text'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[280px]">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-dark-text-secondary" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-dark-text-secondary text-sm">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={positive ? '#00C853' : '#FF5252'} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={positive ? '#00C853' : '#FF5252'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363D" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#8B949E', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#8B949E', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} />
              {showSpy && (
                <Line
                  type="monotone"
                  dataKey="sp500"
                  name="S&P 500"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="4 2"
                />
              )}
              {showQqq && (
                <Line
                  type="monotone"
                  dataKey="nasdaq"
                  name="Nasdaq"
                  stroke="#64748b"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="6 3"
                />
              )}
              <Line
                type="monotone"
                dataKey="portfolio"
                name="Portfolio"
                stroke={positive ? '#00C853' : '#FF5252'}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: positive ? '#00C853' : '#FF5252' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
