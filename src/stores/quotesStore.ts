import { create } from 'zustand';
import type { StockQuote } from '@/types/models';
import { getStockQuote, getMultipleQuotes, isMarketOpen, clearQuoteCache } from '@/services/api/yahooFinance';

interface QuotesState {
  quotes: Map<string, StockQuote>;
  isRefreshing: boolean;
  lastRefresh: number | null;
  refreshInterval: number; // milliseconds
  autoRefreshEnabled: boolean;

  // Actions
  fetchQuote: (symbol: string) => Promise<StockQuote | null>;
  fetchQuotes: (symbols: string[]) => Promise<void>;
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (interval: number) => void;
  forceRefresh: () => Promise<void>;
  getQuote: (symbol: string) => StockQuote | undefined;
}

let refreshTimer: ReturnType<typeof setInterval> | null = null;

export const useQuotesStore = create<QuotesState>((set, get) => ({
  quotes: new Map(),
  isRefreshing: false,
  lastRefresh: null,
  refreshInterval: 600000, // 10 minutes
  autoRefreshEnabled: true,

  fetchQuote: async (symbol) => {
    const quote = await getStockQuote(symbol);
    if (quote) {
      set((state) => {
        const newQuotes = new Map(state.quotes);
        newQuotes.set(symbol.toUpperCase(), quote);
        return { quotes: newQuotes };
      });
    }
    return quote;
  },

  fetchQuotes: async (symbols) => {
    if (symbols.length === 0) return;

    set({ isRefreshing: true });
    try {
      const quotes = await getMultipleQuotes(symbols);
      set((state) => {
        const newQuotes = new Map(state.quotes);
        quotes.forEach((quote, symbol) => {
          newQuotes.set(symbol, quote);
        });
        return {
          quotes: newQuotes,
          lastRefresh: Date.now(),
          isRefreshing: false,
        };
      });
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
      set({ isRefreshing: false });
    }
  },

  setAutoRefresh: (enabled) => {
    set({ autoRefreshEnabled: enabled });

    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }

    if (enabled) {
      const { refreshInterval } = get();
      refreshTimer = setInterval(() => {
        // Only refresh during market hours
        if (isMarketOpen()) {
          get().forceRefresh();
        }
      }, refreshInterval);
    }
  },

  setRefreshInterval: (interval) => {
    set({ refreshInterval: interval });

    // Restart timer with new interval if auto-refresh is enabled
    const { autoRefreshEnabled } = get();
    if (autoRefreshEnabled) {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
      refreshTimer = setInterval(() => {
        if (isMarketOpen()) {
          get().forceRefresh();
        }
      }, interval);
    }
  },

  forceRefresh: async () => {
    const { quotes } = get();
    const symbols = Array.from(quotes.keys());
    if (symbols.length > 0) {
      clearQuoteCache();
      await get().fetchQuotes(symbols);
    }
  },

  getQuote: (symbol) => {
    return get().quotes.get(symbol.toUpperCase());
  },
}));

// Initialize auto-refresh on store creation
if (typeof window !== 'undefined') {
  const { autoRefreshEnabled, refreshInterval } = useQuotesStore.getState();
  if (autoRefreshEnabled) {
    refreshTimer = setInterval(() => {
      if (isMarketOpen()) {
        useQuotesStore.getState().forceRefresh();
      }
    }, refreshInterval);
  }
}
