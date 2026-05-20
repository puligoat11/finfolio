import { create } from 'zustand';
import type { IncomeEntry, RecurringIncome, RSUEntry, IncomeType } from '@/types/models';
import { queryAll, insert, update, remove, upsert } from '@/services/db/database';
import { getQuote } from '@/services/api/yahooFinance';

interface IncomeState {
  entries: IncomeEntry[];
  recurring: RecurringIncome[];
  rsuEntries: RSUEntry[];
  isLoading: boolean;
  error: string | null;
  selectedMonth: string | null;

  fetchIncome: () => void;
  addEntry: (entry: Omit<IncomeEntry, 'id'>) => void;
  updateEntry: (id: string, updates: Partial<IncomeEntry>) => void;
  deleteEntry: (id: string) => void;

  addRecurring: (recurring: Omit<RecurringIncome, 'id'>) => void;
  updateRecurring: (id: string, updates: Partial<RecurringIncome>) => void;
  deleteRecurring: (id: string) => void;
  generateRecurringEntries: () => void;

  addRSU: (rsu: Omit<RSUEntry, 'id'>) => void;
  deleteRSU: (id: string) => void;
  getRSUValue: (symbol: string) => Promise<number>;

  setSelectedMonth: (month: string | null) => void;
  getMonthlyTotal: (month: string) => number;
  getIncomeByType: () => Record<IncomeType, number>;
  importCSV: (csvContent: string) => { imported: number; duplicates: number };
}

interface DbIncomeEntry {
  id: string;
  date: string;
  source: string;
  amount: number;
  type: IncomeType;
  recurring?: boolean;
  notes?: string;
}

interface DbRecurringIncome {
  id: string;
  source: string;
  amount: number;
  type: IncomeType;
  frequency_weeks: number;
  start_date: string;
  is_active: boolean;
}

interface DbRSUEntry {
  id: string;
  symbol: string;
  shares: number;
  vest_date: string;
  grant_price: number;
}

export const useIncomeStore = create<IncomeState>((set, get) => ({
  entries: [],
  recurring: [],
  rsuEntries: [],
  isLoading: false,
  error: null,
  selectedMonth: null,

  fetchIncome: () => {
    set({ isLoading: true, error: null });

    try {
      const dbEntries = queryAll<DbIncomeEntry>('income');
      const entries: IncomeEntry[] = dbEntries
        .map((e) => ({
          id: e.id,
          date: e.date,
          source: e.source,
          amount: e.amount,
          type: e.type,
          recurring: e.recurring,
          notes: e.notes,
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const dbRecurring = queryAll<DbRecurringIncome>('recurring_income');
      const recurring: RecurringIncome[] = dbRecurring.map((r) => ({
        id: r.id,
        source: r.source,
        amount: r.amount,
        type: r.type,
        frequencyWeeks: r.frequency_weeks,
        startDate: r.start_date,
        isActive: r.is_active,
      }));

      const dbRSU = queryAll<DbRSUEntry>('rsu_entries');
      const rsuEntries: RSUEntry[] = dbRSU.map((r) => ({
        id: r.id,
        symbol: r.symbol,
        shares: r.shares,
        vestDate: r.vest_date,
        grantPrice: r.grant_price,
      }));

      set({ entries, recurring, rsuEntries, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addEntry: (entry) => {
    const id = crypto.randomUUID();
    insert('income', {
      id,
      date: entry.date,
      source: entry.source,
      amount: entry.amount,
      type: entry.type,
      recurring: entry.recurring,
      notes: entry.notes,
    });
    get().fetchIncome();
  },

  updateEntry: (id, updates) => {
    update('income', (item) => item.id === id, updates as Record<string, unknown>);
    get().fetchIncome();
  },

  deleteEntry: (id) => {
    remove('income', (item) => item.id === id);
    get().fetchIncome();
  },

  addRecurring: (recurring) => {
    const id = crypto.randomUUID();
    insert('recurring_income', {
      id,
      source: recurring.source,
      amount: recurring.amount,
      type: recurring.type,
      frequency_weeks: recurring.frequencyWeeks,
      start_date: recurring.startDate,
      is_active: recurring.isActive,
    });
    get().fetchIncome();
  },

  updateRecurring: (id, updates) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.source !== undefined) dbUpdates.source = updates.source;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.frequencyWeeks !== undefined) dbUpdates.frequency_weeks = updates.frequencyWeeks;
    if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    update('recurring_income', (item) => item.id === id, dbUpdates);
    get().fetchIncome();
  },

  deleteRecurring: (id) => {
    remove('recurring_income', (item) => item.id === id);
    get().fetchIncome();
  },

  generateRecurringEntries: () => {
    const { recurring, entries } = get();
    const today = new Date();
    const existingDates = new Set(entries.filter((e) => e.recurring).map((e) => `${e.source}-${e.date}`));

    recurring.forEach((r) => {
      if (!r.isActive) return;

      let currentDate = new Date(r.startDate);
      while (currentDate <= today) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const key = `${r.source}-${dateStr}`;

        if (!existingDates.has(key)) {
          const id = crypto.randomUUID();
          insert('income', {
            id,
            date: dateStr,
            source: r.source,
            amount: r.amount,
            type: r.type,
            recurring: true,
          });
        }

        currentDate.setDate(currentDate.getDate() + r.frequencyWeeks * 7);
      }
    });

    get().fetchIncome();
  },

  addRSU: (rsu) => {
    const id = crypto.randomUUID();
    insert('rsu_entries', {
      id,
      symbol: rsu.symbol.toUpperCase(),
      shares: rsu.shares,
      vest_date: rsu.vestDate,
      grant_price: rsu.grantPrice,
    });
    get().fetchIncome();
  },

  deleteRSU: (id) => {
    remove('rsu_entries', (item) => item.id === id);
    get().fetchIncome();
  },

  getRSUValue: async (symbol) => {
    try {
      const quote = await getQuote(symbol);
      return quote?.price || 0;
    } catch {
      return 0;
    }
  },

  setSelectedMonth: (month) => set({ selectedMonth: month }),

  getMonthlyTotal: (month) => {
    const { entries } = get();
    return entries
      .filter((e) => e.date.startsWith(month))
      .reduce((sum, e) => sum + e.amount, 0);
  },

  getIncomeByType: () => {
    const { entries, selectedMonth } = get();
    const filtered = selectedMonth
      ? entries.filter((e) => e.date.startsWith(selectedMonth))
      : entries;

    return filtered.reduce(
      (acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + e.amount;
        return acc;
      },
      {} as Record<IncomeType, number>
    );
  },

  importCSV: (csvContent) => {
    const { entries } = get();
    const existingKeys = new Set(entries.map((e) => `${e.date}-${e.source}-${e.amount}`));

    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return { imported: 0, duplicates: 0 };

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
    const dateIdx = headers.findIndex((h) => h.includes('date'));
    const sourceIdx = headers.findIndex((h) => h.includes('source') || h.includes('description'));
    const amountIdx = headers.findIndex((h) => h.includes('amount'));
    const typeIdx = headers.findIndex((h) => h.includes('type') || h.includes('category'));

    if (dateIdx === -1 || amountIdx === -1) {
      return { imported: 0, duplicates: 0 };
    }

    let imported = 0;
    let duplicates = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/"/g, ''));
      if (cols.length <= Math.max(dateIdx, amountIdx)) continue;

      const date = cols[dateIdx];
      const source = sourceIdx !== -1 ? cols[sourceIdx] : 'Imported';
      const amount = parseFloat(cols[amountIdx].replace(/[$,]/g, ''));
      const type = (typeIdx !== -1 ? cols[typeIdx] : 'Other') as IncomeType;

      if (isNaN(amount) || amount <= 0) continue;

      const key = `${date}-${source}-${amount}`;
      if (existingKeys.has(key)) {
        duplicates++;
        continue;
      }

      const id = crypto.randomUUID();
      insert('income', { id, date, source, amount, type });
      existingKeys.add(key);
      imported++;
    }

    get().fetchIncome();
    return { imported, duplicates };
  },
}));

// Selector for filtered entries
export function useFilteredIncome(): IncomeEntry[] {
  const { entries, selectedMonth } = useIncomeStore();
  if (!selectedMonth) return entries;
  return entries.filter((e) => e.date.startsWith(selectedMonth));
}

// Selector for monthly trend data
export function useMonthlyIncomeTrend(): { month: string; total: number }[] {
  const { entries } = useIncomeStore();
  const monthlyTotals: Record<string, number> = {};

  entries.forEach((e) => {
    const month = e.date.substring(0, 7);
    monthlyTotals[month] = (monthlyTotals[month] || 0) + e.amount;
  });

  return Object.entries(monthlyTotals)
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
