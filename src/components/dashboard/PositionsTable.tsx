import { memo, useCallback } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { usePortfolioStore, useSortedPositions, type SortField } from '@/stores/portfolioStore';
import { useUIStore } from '@/stores/uiStore';
import { formatCurrency, formatSignedCurrency, formatSignedPercent } from '@/utils/formatters';
import type { Position } from '@/types/models';

interface ColumnConfig {
  key: SortField;
  label: string;
  align?: 'left' | 'right';
  width?: string;
}

const columns: ColumnConfig[] = [
  { key: 'symbol', label: 'Symbol', align: 'left', width: 'w-24' },
  { key: 'name', label: 'Name', align: 'left' },
  { key: 'shares', label: 'Shares', align: 'right', width: 'w-20' },
  { key: 'marketValue', label: 'Value', align: 'right', width: 'w-28' },
  { key: 'totalGain', label: 'Total Gain', align: 'right', width: 'w-32' },
  { key: 'dayGain', label: 'Day Gain', align: 'right', width: 'w-32' },
];

const PositionRow = memo(function PositionRow({ position }: { position: Position }) {
  const openStockDetail = useUIStore((s) => s.openStockDetail);

  return (
    <tr
      onClick={() => openStockDetail(position.symbol)}
      className="border-b border-dark-border last:border-b-0 hover:bg-dark-surface/50 cursor-pointer transition-colors"
    >
      <td className="px-4 py-3">
        <span className="font-semibold text-dark-text">{position.symbol}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-dark-text-secondary text-sm truncate max-w-[200px] block">
          {position.name}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-dark-text">{position.shares}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-dark-text font-medium">
          {formatCurrency(position.marketValue)}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex flex-col items-end">
          <span
            className={cn(
              'font-medium',
              position.totalGain >= 0 ? 'text-success' : 'text-danger'
            )}
          >
            {formatSignedCurrency(position.totalGain)}
          </span>
          <span
            className={cn(
              'text-xs',
              position.totalGainPercent >= 0 ? 'text-success/80' : 'text-danger/80'
            )}
          >
            {formatSignedPercent(position.totalGainPercent)}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex flex-col items-end">
          <span
            className={cn(
              'font-medium',
              position.dayGain >= 0 ? 'text-success' : 'text-danger'
            )}
          >
            {formatSignedCurrency(position.dayGain)}
          </span>
          <span
            className={cn(
              'text-xs',
              position.dayGainPercent >= 0 ? 'text-success/80' : 'text-danger/80'
            )}
          >
            {formatSignedPercent(position.dayGainPercent)}
          </span>
        </div>
      </td>
    </tr>
  );
});

export const PositionsTable = memo(function PositionsTable() {
  const positions = useSortedPositions();
  const { sortField, sortDirection, setSort } = usePortfolioStore();

  const handleSort = useCallback(
    (field: SortField) => {
      setSort(field);
    },
    [setSort]
  );

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-dark-text-secondary/50" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-primary" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-primary" />
    );
  };

  if (positions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-dark-text-secondary">
            <p>No positions yet.</p>
            <p className="text-sm mt-1">Add a trade to get started.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Holdings</CardTitle>
        <span className="text-sm text-dark-text-secondary">
          {positions.length} position{positions.length !== 1 ? 's' : ''}
        </span>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-dark-surface/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={cn(
                    'px-4 py-3 text-xs font-medium text-dark-text-secondary uppercase tracking-wider cursor-pointer hover:text-dark-text transition-colors',
                    col.align === 'right' ? 'text-right' : 'text-left',
                    col.width
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center gap-1',
                      col.align === 'right' && 'justify-end'
                    )}
                  >
                    {col.label}
                    {getSortIcon(col.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => (
              <PositionRow key={position.symbol} position={position} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
});
