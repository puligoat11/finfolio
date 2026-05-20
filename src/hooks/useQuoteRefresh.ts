import { useEffect } from 'react';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { useWatchlistStore } from '@/stores/watchlistStore';
import { isMarketOpen } from '@/services/api/yahooFinance';

const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

export function useQuoteRefresh() {
  const refreshPortfolioQuotes = usePortfolioStore((s) => s.refreshQuotes);
  const refreshWatchlistQuotes = useWatchlistStore((s) => s.refreshQuotes);

  useEffect(() => {
    // Initial refresh
    refreshPortfolioQuotes();
    refreshWatchlistQuotes();

    // Set up interval for market hours
    const interval = setInterval(() => {
      if (isMarketOpen()) {
        refreshPortfolioQuotes();
        refreshWatchlistQuotes();
      }
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [refreshPortfolioQuotes, refreshWatchlistQuotes]);
}
