import { create } from 'zustand';
import type { Trade, TradeType } from '@/types/models';
import { queryAll, insert, remove } from '@/services/db/database';
import { usePortfolioStore } from './portfolioStore';

interface DbTrade {
  id: string;
  symbol: string;
  name: string;
  type: TradeType;
  shares: number;
  price: number;
  total: number;
  date: string;
  account_id?: string;
  notes?: string;
}

interface TradesState {
  trades: Trade[];
  isLoading: boolean;
  error: string | null;
  filterSymbol: string | null;
  filterType: TradeType | null;
  filterAccountId: string | null;

  fetchTrades: () => void;
  addTrade: (trade: Omit<Trade, 'id'>) => void;
  deleteTrade: (id: string) => void;
  setFilterSymbol: (symbol: string | null) => void;
  setFilterType: (type: TradeType | null) => void;
  setFilterAccount: (accountId: string | null) => void;
}

export const useTradesStore = create<TradesState>((set, get) => ({
  trades: [],
  isLoading: false,
  error: null,
  filterSymbol: null,
  filterType: null,
  filterAccountId: null,

  fetchTrades: () => {
    set({ isLoading: true, error: null });

    try {
      const dbTrades = queryAll<DbTrade>('trades');
      const trades: Trade[] = dbTrades
        .map((t) => ({
          id: t.id,
          symbol: t.symbol,
          name: t.name,
          type: t.type,
          shares: t.shares,
          price: t.price,
          total: t.total,
          date: new Date(t.date),
          accountId: t.account_id,
          notes: t.notes,
        }))
        .sort((a, b) => b.date.getTime() - a.date.getTime());

      set({ trades, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addTrade: (trade) => {
    const id = crypto.randomUUID();

    insert('trades', {
      id,
      symbol: trade.symbol.toUpperCase(),
      name: trade.name,
      type: trade.type,
      shares: trade.shares,
      price: trade.price,
      total: trade.total,
      date: trade.date.toISOString(),
      account_id: trade.accountId,
      notes: trade.notes,
    });

    const portfolioStore = usePortfolioStore.getState();
    if (trade.type === 'buy') {
      portfolioStore.addPosition(trade.symbol, trade.name, trade.shares, trade.price, trade.accountId);
    } else if (trade.type === 'sell') {
      const existingPosition = portfolioStore.positions.find(
        (p) => p.symbol === trade.symbol.toUpperCase()
      );
      if (existingPosition) {
        const newShares = existingPosition.shares - trade.shares;
        if (newShares <= 0) {
          portfolioStore.deletePosition(trade.symbol);
        } else {
          portfolioStore.updatePosition(trade.symbol, newShares, existingPosition.avgCost);
        }
      }
    }

    get().fetchTrades();
  },

  deleteTrade: (id) => {
    remove('trades', (t) => t.id === id);
    get().fetchTrades();
  },

  setFilterSymbol: (symbol) => set({ filterSymbol: symbol }),
  setFilterType: (type) => set({ filterType: type }),
  setFilterAccount: (accountId) => set({ filterAccountId: accountId }),
}));

export function useFilteredTrades(): Trade[] {
  const { trades, filterSymbol, filterType, filterAccountId } = useTradesStore();

  return trades.filter((trade) => {
    if (filterSymbol && trade.symbol !== filterSymbol.toUpperCase()) return false;
    if (filterType && trade.type !== filterType) return false;
    if (filterAccountId && trade.accountId !== filterAccountId) return false;
    return true;
  });
}
