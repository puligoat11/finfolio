import { memo, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { ChartDataPoint } from '@/types/models';
import { formatCurrency, formatCompactCurrency } from '@/utils/formatters';

interface LineChartProps {
  data: ChartDataPoint[];
  height?: number;
  showGrid?: boolean;
  showAxes?: boolean;
  color?: 'blue' | 'green' | 'red';
}

const colorMap = {
  blue: { stroke: '#4285f4', fill: 'rgba(66, 133, 244, 0.1)' },
  green: { stroke: '#00C853', fill: 'rgba(0, 200, 83, 0.1)' },
  red: { stroke: '#FF5252', fill: 'rgba(255, 82, 82, 0.1)' },
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

const CustomTooltip = memo(function CustomTooltip({
  active,
  payload,
  label,
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-dark-surface border border-dark-border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-dark-text-secondary">{label}</p>
      <p className="text-sm font-semibold text-dark-text">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
});

export const LineChart = memo(function LineChart({
  data,
  height = 300,
  showGrid = true,
  showAxes = true,
  color = 'blue',
}: LineChartProps) {
  const chartData = useMemo(() => {
    return data.map((point) => ({
      date: point.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: point.value,
    }));
  }, [data]);

  const colors = colorMap[color];

  // Calculate min/max for better Y axis
  const values = data.map((d) => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const padding = (maxValue - minValue) * 0.1;

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-dark-text-secondary"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#30363D"
            strokeOpacity={0.5}
            vertical={false}
          />
        )}
        {showAxes && (
          <>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#8B949E', fontSize: 11 }}
              dy={10}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#8B949E', fontSize: 11 }}
              tickFormatter={(value) => formatCompactCurrency(value)}
              domain={[minValue - padding, maxValue + padding]}
              dx={-10}
              width={60}
            />
          </>
        )}
        <Tooltip content={<CustomTooltip />} />
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.stroke} stopOpacity={0.3} />
            <stop offset="100%" stopColor={colors.stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={colors.stroke}
          strokeWidth={2}
          fill={`url(#gradient-${color})`}
          dot={false}
          activeDot={{
            r: 4,
            fill: colors.stroke,
            stroke: '#161B22',
            strokeWidth: 2,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});
