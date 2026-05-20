import { type HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'neutral';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        {
          'bg-primary/20 text-primary': variant === 'default',
          'bg-success/20 text-success': variant === 'success',
          'bg-danger/20 text-danger': variant === 'danger',
          'bg-warning/20 text-warning': variant === 'warning',
          'bg-neutral/20 text-neutral': variant === 'neutral',
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
