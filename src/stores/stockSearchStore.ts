import { create } from 'zustand';
import type { StockQuote, AnalystRating, NewsItem, ChartDataPoint } from '@/types/models';
import {
  searchStocks,
  getStockQuote,
  getAnalystRatings,
  getStockNews,
  getChartData,
} from '@/services/api/yahooFinance';

type ChartRange = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y' | 'max';

interface StockSearchState {
  query: string;
  searchResults: StockQuote[];
  isSearching: boolean;

  selectedSymbol: string | null;
  selectedQuote: StockQuote | null;
  analystRatings: AnalystRating | null;
  news: NewsItem[];
  chartData: ChartDataPoint[];
  chartRange: ChartRange;

  isLoadingDetails: boolean;
  error: string | null;

  setQuery: (query: string) => void;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;

  selectStock: (symbol: string) => Promise<void>;
  clearSelection: () => void;
  setChartRange: (range: ChartRange) => Promise<void>;
  refreshQuote: () => Promise<void>;
}

export const useStockSearchStore = create<StockSearchState>((set, get) => ({
  query: '',
  searchResults: [],
  isSearching: false,

  selectedSymbol: null,
  selectedQuote: null,
  analystRatings: null,
  news: [],
  chartData: [],
  chartRange: '1y',

  isLoadingDetails: false,
  error: null,

  setQuery: (query) => set({ query }),

  search: async (query) => {
    if (!query.trim()) {
      set({ searchResults: [], isSearching: false });
      return;
    }

    set({ isSearching: true, error: null });

    try {
      const results = await searchStocks(query);
      set({ searchResults: results, isSearching: false });
    } catch (error) {
      set({ error: (error as Error).message, isSearching: false });
    }
  },

  clearSearch: () => set({ query: '', searchResults: [] }),

  selectStock: async (symbol) => {
    set({ isLoadingDetails: true, error: null, selectedSymbol: symbol });

    try {
      const { chartRange } = get();

      // Fetch all data in parallel
      const [quote, ratings, newsItems, chart] = await Promise.all([
        getStockQuote(symbol),
        getAnalystRatings(symbol),
        getStockNews(symbol),
        getChartData(symbol, chartRange),
      ]);

      set({
        selectedQuote: quote,
        analystRatings: ratings,
        news: newsItems,
        chartData: chart,
        isLoadingDetails: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoadingDetails: false });
    }
  },

  clearSelection: () =>
    set({
      selectedSymbol: null,
      selectedQuote: null,
      analystRatings: null,
      news: [],
      chartData: [],
    }),

  setChartRange: async (range) => {
    const { selectedSymbol } = get();
    if (!selectedSymbol) return;

    set({ chartRange: range });

    try {
      const chart = await getChartData(selectedSymbol, range);
      set({ chartData: chart });
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
    }
  },

  refreshQuote: async () => {
    const { selectedSymbol } = get();
    if (!selectedSymbol) return;

    try {
      const quote = await getStockQuote(selectedSymbol);
      set({ selectedQuote: quote });
    } catch (error) {
      console.error('Failed to refresh quote:', error);
    }
  },
}));
