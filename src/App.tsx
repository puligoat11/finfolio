import { lazy, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainShell } from '@/components/layout/MainShell';
import { useUIStore } from '@/stores/uiStore';
import { initDatabase } from '@/services/db/database';
import { useDemoData, useQuoteRefresh } from '@/hooks';

const DashboardPage  = lazy(() => import('@/pages/DashboardPage'));
const PortfolioPage  = lazy(() => import('@/pages/PortfolioPage'));
const TradesPage     = lazy(() => import('@/pages/TradesPage'));
const WatchlistPage  = lazy(() => import('@/pages/WatchlistPage'));
const IncomePage     = lazy(() => import('@/pages/IncomePage').then(m => ({ default: m.IncomePage })));
const ExpensesPage   = lazy(() => import('@/pages/ExpensesPage').then(m => ({ default: m.ExpensesPage })));
const SettingsPage   = lazy(() => import('@/pages/SettingsPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  useDemoData();
  useQuoteRefresh();

  const currentNav = useUIStore((s) => s.currentNav);

  const page = {
    dashboard: <DashboardPage />,
    portfolio: <PortfolioPage />,
    trades:    <TradesPage />,
    watchlist: <WatchlistPage />,
    income:    <IncomePage />,
    expenses:  <ExpensesPage />,
    settings:  <SettingsPage />,
  }[currentNav] ?? <DashboardPage />;

  return <MainShell>{page}</MainShell>;
}

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initDatabase()
      .then(() => setIsDbReady(true))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-dark-bg text-danger gap-4">
        <p>Failed to initialize: {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-white rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!isDbReady) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-dark-bg gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-dark-text-secondary text-sm">Initializing…</p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
