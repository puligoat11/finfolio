import { Suspense, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Skeleton } from '@/components/ui';

interface MainShellProps {
  children: ReactNode;
}

function PageLoader() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}

export function MainShell({ children }: MainShellProps) {
  return (
    <div className="flex h-screen bg-dark-bg text-dark-text overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Suspense fallback={<PageLoader />}>{children}</Suspense>
      </main>
    </div>
  );
}
