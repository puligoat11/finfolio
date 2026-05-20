import { memo, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

interface SparkLineProps {
  data: number[];
  width?: number;
  height?: number;
  positive?: boolean;
}

export const SparkLine = memo(function SparkLine({
  data,
  width = 80,
  height = 32,
  positive = true,
}: SparkLineProps) {
  const chartData = useMemo(() => {
    return data.map((value, index) => ({ index, value }));
  }, [data]);

  const color = positive ? '#00C853' : '#FF5252';

  if (data.length < 2) {
    return <div style={{ width, height }} />;
  }

  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});
