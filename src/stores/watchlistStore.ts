import { create } from 'zustand';
import type { WatchlistItem } from '@/types/models';
import { queryAll, upsert, remove } from '@/services/db/database';
import { getMultipleQuotes } from '@/services/api/yahooFinance';

interface DbWatchlistItem {
  symbol: string;
  name: string;
  added_at: string;
}

interface WatchlistState {
  items: WatchlistItem[];
  isLoading: boolean;
  error: string | null;

  fetchWatchlist: () => Promise<void>;
  refreshQuotes: () => Promise<void>;
  addItem: (symbol: string, name: string) => void;
  removeItem: (symbol: string) => void;
  isInWatchlist: (symbol: string) => boolean;
}

export const useWatchlistStore = create<WatchlistState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchWatchlist: async () => {
    set({ isLoading: true, error: null });

    try {
      const dbItems = queryAll<DbWatchlistItem>('watchlist');
      const symbols = dbItems.map((item) => item.symbol);

      let quotes = new Map();
      if (symbols.length > 0) {
        quotes = await getMultipleQuotes(symbols);
      }

      const items: WatchlistItem[] = dbItems.map((item) => {
        const quote = quotes.get(item.symbol);
        return {
          symbol: item.symbol,
          name: item.name,
          price: quote?.price || 0,
          change: quote?.change || 0,
          changePercent: quote?.changePercent || 0,
          addedAt: new Date(item.added_at),
        };
      });

      set({ items, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  refreshQuotes: async () => {
    const { items } = get();
    if (items.length === 0) return;

    try {
      const symbols = items.map((item) => item.symbol);
      const quotes = await getMultipleQuotes(symbols);

      const updatedItems = items.map((item) => {
        const quote = quotes.get(item.symbol);
        if (!quote) return item;
        return {
          ...item,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
        };
      });

      set({ items: updatedItems });
    } catch (error) {
      console.error('Failed to refresh watchlist quotes:', error);
    }
  },

  addItem: (symbol, name) => {
    upsert('watchlist', 'symbol', symbol.toUpperCase(), {
      symbol: symbol.toUpperCase(),
      name,
      added_at: new Date().toISOString(),
    });
    get().fetchWatchlist();
  },

  removeItem: (symbol) => {
    remove('watchlist', (item) => item.symbol === symbol.toUpperCase());
    set((state) => ({
      items: state.items.filter((item) => item.symbol !== symbol.toUpperCase()),
    }));
  },

  isInWatchlist: (symbol) => {
    return get().items.some((item) => item.symbol === symbol.toUpperCase());
  },
}));
