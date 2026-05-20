import { memo, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Card } from '@/components/ui';

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changePercent?: number;
  isPositive?: boolean;
  showPercentage?: boolean;
  icon?: ReactNode;
}

export const MetricCard = memo(function MetricCard({
  title,
  value,
  change,
  changePercent,
  isPositive = true,
  showPercentage = true,
  icon,
}: MetricCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-dark-text-secondary">{title}</p>
          <p className="text-2xl font-semibold text-dark-text">{value}</p>
          {change && (
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'text-sm font-medium',
                  isPositive ? 'text-success' : 'text-danger'
                )}
              >
                {change}
              </span>
              {showPercentage && changePercent !== undefined && (
                <span
                  className={cn(
                    'text-xs px-1.5 py-0.5 rounded',
                    isPositive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                  )}
                >
                  {changePercent >= 0 ? '+' : ''}
                  {changePercent.toFixed(2)}%
                </span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              'p-2.5 rounded-lg',
              isPositive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
});
