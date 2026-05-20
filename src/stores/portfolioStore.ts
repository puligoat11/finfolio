import { create } from 'zustand';
import type { Position, PortfolioSummary, Account } from '@/types/models';
import { queryAll, upsert, remove } from '@/services/db/database';
import { getMultipleQuotes } from '@/services/api/yahooFinance';

export type SortField = 'symbol' | 'name' | 'shares' | 'marketValue' | 'totalGain' | 'totalGainPercent' | 'dayGain' | 'dayGainPercent';
export type SortDirection = 'asc' | 'desc';

interface DbPosition {
  symbol: string;
  name: string;
  shares: number;
  avg_cost: number;
  account_id?: string;
}

interface PortfolioState {
  positions: Position[];
  accounts: Account[];
  summary: PortfolioSummary | null;
  isLoading: boolean;
  error: string | null;
  sortField: SortField;
  sortDirection: SortDirection;
  filterAccountId: string | null;

  fetchPositions: () => Promise<void>;
  refreshQuotes: () => Promise<void>;
  addPosition: (symbol: string, name: string, shares: number, avgCost: number, accountId?: string) => void;
  updatePosition: (symbol: string, shares: number, avgCost: number) => void;
  deletePosition: (symbol: string) => void;
  setSort: (field: SortField, direction?: SortDirection) => void;
  setFilterAccount: (accountId: string | null) => void;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  positions: [],
  accounts: [],
  summary: null,
  isLoading: false,
  error: null,
  sortField: 'marketValue',
  sortDirection: 'desc',
  filterAccountId: null,

  fetchPositions: async () => {
    set({ isLoading: true, error: null });

    try {
      const dbPositions = queryAll<DbPosition>('positions');
      const symbols = dbPositions.map((p) => p.symbol);

      let quotes = new Map();
      if (symbols.length > 0) {
        quotes = await getMultipleQuotes(symbols);
      }

      const positions: Position[] = dbPositions.map((p) => {
        const quote = quotes.get(p.symbol);
        const currentPrice = quote?.price || p.avg_cost;
        const previousClose = quote?.previousClose || currentPrice;
        const marketValue = p.shares * currentPrice;
        const costBasis = p.shares * p.avg_cost;
        const totalGain = marketValue - costBasis;
        const totalGainPercent = costBasis > 0 ? (totalGain / costBasis) * 100 : 0;
        const dayGain = p.shares * (currentPrice - previousClose);
        const dayGainPercent = previousClose > 0 ? ((currentPrice - previousClose) / previousClose) * 100 : 0;

        return {
          symbol: p.symbol,
          name: p.name,
          shares: p.shares,
          avgCost: p.avg_cost,
          currentPrice,
          marketValue,
          totalGain,
          totalGainPercent,
          dayGain,
          dayGainPercent,
          accountId: p.account_id,
        };
      });

      const totalValue = positions.reduce((sum, p) => sum + p.marketValue, 0);
      const totalCost = positions.reduce((sum, p) => sum + (p.shares * p.avgCost), 0);
      const dayChange = positions.reduce((sum, p) => sum + p.dayGain, 0);
      const totalGain = totalValue - totalCost;

      const summary: PortfolioSummary = {
        totalValue,
        dayChange,
        dayChangePercent: totalValue > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0,
        totalGain,
        totalGainPercent: totalCost > 0 ? (totalGain / totalCost) * 100 : 0,
        cashBalance: 0,
        positionsCount: positions.length,
        accounts: [],
      };

      set({ positions, summary, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  refreshQuotes: async () => {
    const { positions } = get();
    if (positions.length === 0) return;

    try {
      const symbols = positions.map((p) => p.symbol);
      const quotes = await getMultipleQuotes(symbols);

      const updatedPositions = positions.map((p) => {
        const quote = quotes.get(p.symbol);
        if (!quote) return p;

        const currentPrice = quote.price;
        const previousClose = quote.previousClose || currentPrice;
        const marketValue = p.shares * currentPrice;
        const costBasis = p.shares * p.avgCost;
        const totalGain = marketValue - costBasis;
        const totalGainPercent = costBasis > 0 ? (totalGain / costBasis) * 100 : 0;
        const dayGain = p.shares * (currentPrice - previousClose);
        const dayGainPercent = previousClose > 0 ? ((currentPrice - previousClose) / previousClose) * 100 : 0;

        return { ...p, currentPrice, marketValue, totalGain, totalGainPercent, dayGain, dayGainPercent };
      });

      const totalValue = updatedPositions.reduce((sum, p) => sum + p.marketValue, 0);
      const totalCost = updatedPositions.reduce((sum, p) => sum + (p.shares * p.avgCost), 0);
      const dayChange = updatedPositions.reduce((sum, p) => sum + p.dayGain, 0);
      const totalGain = totalValue - totalCost;

      const summary: PortfolioSummary = {
        totalValue,
        dayChange,
        dayChangePercent: totalValue > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0,
        totalGain,
        totalGainPercent: totalCost > 0 ? (totalGain / totalCost) * 100 : 0,
        cashBalance: 0,
        positionsCount: updatedPositions.length,
        accounts: [],
      };

      set({ positions: updatedPositions, summary });
    } catch (error) {
      console.error('Failed to refresh quotes:', error);
    }
  },

  addPosition: (symbol, name, shares, avgCost, accountId) => {
    const existing = queryAll<DbPosition>('positions').find((p) => p.symbol === symbol.toUpperCase());

    if (existing) {
      const newShares = existing.shares + shares;
      const newAvgCost = (existing.avg_cost * existing.shares + avgCost * shares) / newShares;
      upsert('positions', 'symbol', symbol.toUpperCase(), {
        symbol: symbol.toUpperCase(),
        name,
        shares: newShares,
        avg_cost: newAvgCost,
        account_id: accountId,
      });
    } else {
      upsert('positions', 'symbol', symbol.toUpperCase(), {
        symbol: symbol.toUpperCase(),
        name,
        shares,
        avg_cost: avgCost,
        account_id: accountId,
      });
    }
    get().fetchPositions();
  },

  updatePosition: (symbol, shares, avgCost) => {
    upsert('positions', 'symbol', symbol.toUpperCase(), {
      symbol: symbol.toUpperCase(),
      shares,
      avg_cost: avgCost,
    });
    get().fetchPositions();
  },

  deletePosition: (symbol) => {
    remove('positions', (p) => p.symbol === symbol.toUpperCase());
    get().fetchPositions();
  },

  setSort: (field, direction) => {
    const { sortField, sortDirection } = get();
    const newDirection = direction || (sortField === field && sortDirection === 'desc' ? 'asc' : 'desc');
    set({ sortField: field, sortDirection: newDirection });
  },

  setFilterAccount: (accountId) => {
    set({ filterAccountId: accountId });
  },
}));

export function useSortedPositions(): Position[] {
  const { positions, sortField, sortDirection, filterAccountId } = usePortfolioStore();

  let filtered = positions;
  if (filterAccountId) {
    filtered = positions.filter((p) => p.accountId === filterAccountId);
  }

  return [...filtered].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }

    const aNum = Number(aValue) || 0;
    const bNum = Number(bValue) || 0;
    return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
  });
}
