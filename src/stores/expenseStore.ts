import { create } from 'zustand';
import type { Expense, Budget } from '@/types/models';
import {
  generateExpenseHash,
  autoCategorizeExpense,
  CAPITAL_ONE_CATEGORY_MAP,
  DEFAULT_EXPENSE_CATEGORIES,
} from '@/types/models';
import {
  queryAll,
  insert,
  update,
  remove,
  getBudgets,
  setBudget,
  getExpenseCategories,
  addExpenseCategory,
} from '@/services/db/database';

interface ExpenseState {
  expenses: Expense[];
  budgets: Budget;
  categories: string[];
  isLoading: boolean;
  error: string | null;
  selectedMonth: string | null;

  fetchExpenses: () => void;
  addExpense: (expense: Omit<Expense, 'id' | 'hash'>) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;

  setBudgetAmount: (month: string, category: string, amount: number) => void;
  getBudgetForCategory: (month: string, category: string) => number;

  addCategory: (category: string) => void;
  setSelectedMonth: (month: string | null) => void;

  getMonthlyTotal: (month: string) => number;
  getCategoryTotals: () => Record<string, number>;
  getBudgetProgress: (month: string) => { category: string; spent: number; budget: number; percent: number }[];

  importCSV: (csvContent: string, fileName?: string) => { imported: number; duplicates: number };
}

interface DbExpense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  hash: string;
  imported_from?: string;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  budgets: {},
  categories: DEFAULT_EXPENSE_CATEGORIES,
  isLoading: false,
  error: null,
  selectedMonth: null,

  fetchExpenses: () => {
    console.log('fetchExpenses called');
    set({ isLoading: true, error: null });

    try {
      const dbExpenses = queryAll<DbExpense>('expenses');
      console.log('Fetched expenses from DB:', dbExpenses.length);
      const expenses: Expense[] = dbExpenses
        .map((e) => ({
          id: e.id,
          date: e.date,
          description: e.description,
          amount: e.amount,
          category: e.category,
          hash: e.hash,
          imported_from: e.imported_from,
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const budgets = getBudgets();
      const categories = getExpenseCategories();

      set({ expenses, budgets, categories, isLoading: false });
      console.log('Expenses state updated, count:', expenses.length);
    } catch (error) {
      console.error('Error in fetchExpenses:', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addExpense: (expense) => {
    console.log('addExpense called with:', expense);
    const id = crypto.randomUUID();
    const hash = generateExpenseHash(expense.date, expense.description, expense.amount);

    console.log('Inserting expense with id:', id, 'hash:', hash);
    insert('expenses', {
      id,
      date: expense.date,
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      hash,
      imported_from: expense.imported_from,
    });
    console.log('Expense inserted, fetching expenses...');
    get().fetchExpenses();
    console.log('Expenses after insert:', get().expenses.length);
  },

  updateExpense: (id, updates) => {
    const dbUpdates: Record<string, unknown> = { ...updates };
    if (updates.date || updates.description || updates.amount) {
      const expense = get().expenses.find((e) => e.id === id);
      if (expense) {
        dbUpdates.hash = generateExpenseHash(
          updates.date || expense.date,
          updates.description || expense.description,
          updates.amount || expense.amount
        );
      }
    }
    update('expenses', (item) => item.id === id, dbUpdates);
    get().fetchExpenses();
  },

  deleteExpense: (id) => {
    remove('expenses', (item) => item.id === id);
    get().fetchExpenses();
  },

  setBudgetAmount: (month, category, amount) => {
    setBudget(month, category, amount);
    set((state) => ({
      budgets: {
        ...state.budgets,
        [month]: {
          ...state.budgets[month],
          [category]: amount,
        },
      },
    }));
  },

  getBudgetForCategory: (month, category) => {
    const { budgets } = get();
    return budgets[month]?.[category] || 0;
  },

  addCategory: (category) => {
    addExpenseCategory(category);
    set((state) => ({
      categories: [...state.categories, category],
    }));
  },

  setSelectedMonth: (month) => set({ selectedMonth: month }),

  getMonthlyTotal: (month) => {
    const { expenses } = get();
    return expenses
      .filter((e) => e.date.startsWith(month))
      .reduce((sum, e) => sum + e.amount, 0);
  },

  getCategoryTotals: () => {
    const { expenses, selectedMonth } = get();
    const filtered = selectedMonth
      ? expenses.filter((e) => e.date.startsWith(selectedMonth))
      : expenses;

    return filtered.reduce(
      (acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
      },
      {} as Record<string, number>
    );
  },

  getBudgetProgress: (month) => {
    const { expenses, budgets, categories } = get();
    const monthExpenses = expenses.filter((e) => e.date.startsWith(month));

    const categorySpending: Record<string, number> = {};
    monthExpenses.forEach((e) => {
      categorySpending[e.category] = (categorySpending[e.category] || 0) + e.amount;
    });

    return categories.map((category) => {
      const spent = categorySpending[category] || 0;
      const budget = budgets[month]?.[category] || 0;
      const percent = budget > 0 ? (spent / budget) * 100 : 0;
      return { category, spent, budget, percent };
    });
  },

  importCSV: (csvContent, fileName) => {
    console.log('importCSV called, file:', fileName);
    const { expenses } = get();
    const existingHashes = new Set(expenses.map((e) => e.hash));

    const lines = csvContent.trim().split('\n');
    console.log('CSV lines:', lines.length);
    if (lines.length < 2) {
      console.log('CSV has less than 2 lines, aborting');
      return { imported: 0, duplicates: 0 };
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
    console.log('CSV headers:', headers);

    // Detect Capital One format
    const isCapitalOne =
      headers.includes('transaction date') &&
      headers.includes('posted date') &&
      (headers.includes('debit') || headers.includes('credit'));

    console.log('Is Capital One format:', isCapitalOne);

    let imported = 0;
    let duplicates = 0;

    if (isCapitalOne) {
      console.log('Processing as Capital One CSV');
      // Capital One CSV format
      const dateIdx = headers.indexOf('transaction date');
      const descIdx = headers.indexOf('description');
      const debitIdx = headers.indexOf('debit');
      const categoryIdx = headers.indexOf('category');

      for (let i = 1; i < lines.length; i++) {
        // Handle quoted fields properly
        const cols = parseCSVLine(lines[i]);
        if (cols.length <= Math.max(dateIdx, descIdx, debitIdx)) continue;

        const dateStr = cols[dateIdx]?.trim();
        const description = cols[descIdx]?.trim() || '';
        const debitStr = cols[debitIdx]?.trim();
        const bankCategory = cols[categoryIdx]?.trim() || '';

        // Skip if no debit amount (credits/payments)
        if (!debitStr || debitStr === '') continue;

        const amount = parseFloat(debitStr.replace(/[$,]/g, ''));
        if (isNaN(amount) || amount <= 0) continue;

        // Parse date (MM/DD/YYYY or YYYY-MM-DD)
        let date = dateStr;
        if (dateStr.includes('/')) {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            date = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
          }
        }

        const hash = generateExpenseHash(date, description, amount);
        if (existingHashes.has(hash)) {
          duplicates++;
          continue;
        }

        // Map category - skip if mapped to 'SKIP' (e.g., Payment/Credit rows)
        const mappedCategory = CAPITAL_ONE_CATEGORY_MAP[bankCategory];
        if (mappedCategory === 'SKIP') {
          continue;
        }
        const category = mappedCategory || autoCategorizeExpense(description);

        const id = crypto.randomUUID();
        insert('expenses', {
          id,
          date,
          description,
          amount,
          category,
          hash,
          imported_from: fileName,
        });

        existingHashes.add(hash);
        imported++;
      }
    } else {
      // Generic CSV format
      const dateIdx = headers.findIndex((h) => h.includes('date'));
      const descIdx = headers.findIndex((h) => h.includes('description') || h.includes('merchant'));
      const amountIdx = headers.findIndex((h) => h.includes('amount') || h.includes('debit'));
      const categoryIdx = headers.findIndex((h) => h.includes('category'));

      if (dateIdx === -1 || amountIdx === -1) {
        return { imported: 0, duplicates: 0 };
      }

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        if (cols.length <= Math.max(dateIdx, amountIdx)) continue;

        let date = cols[dateIdx]?.trim();
        const description = descIdx !== -1 ? cols[descIdx]?.trim() : 'Imported';
        const amountStr = cols[amountIdx]?.trim();

        if (!amountStr) continue;
        const amount = Math.abs(parseFloat(amountStr.replace(/[$,]/g, '')));
        if (isNaN(amount) || amount <= 0) continue;

        // Parse date
        if (date.includes('/')) {
          const parts = date.split('/');
          if (parts.length === 3) {
            date = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
          }
        }

        const hash = generateExpenseHash(date, description, amount);
        if (existingHashes.has(hash)) {
          duplicates++;
          continue;
        }

        const category =
          categoryIdx !== -1 && cols[categoryIdx]
            ? cols[categoryIdx].trim()
            : autoCategorizeExpense(description);

        const id = crypto.randomUUID();
        insert('expenses', {
          id,
          date,
          description,
          amount,
          category,
          hash,
          imported_from: fileName,
        });

        existingHashes.add(hash);
        imported++;
      }
    }

    console.log('Import complete. Imported:', imported, 'Duplicates:', duplicates);
    get().fetchExpenses();
    return { imported, duplicates };
  },
}));

// Helper to parse CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.replace(/"/g, '').trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.replace(/"/g, '').trim());

  return result;
}

// Selector for filtered expenses
export function useFilteredExpenses(): Expense[] {
  const { expenses, selectedMonth } = useExpenseStore();
  if (!selectedMonth) return expenses;
  return expenses.filter((e) => e.date.startsWith(selectedMonth));
}

// Selector for monthly trend data
export function useMonthlyExpenseTrend(): { month: string; total: number }[] {
  const { expenses } = useExpenseStore();
  const monthlyTotals: Record<string, number> = {};

  expenses.forEach((e) => {
    const month = e.date.substring(0, 7);
    monthlyTotals[month] = (monthlyTotals[month] || 0) + e.amount;
  });

  return Object.entries(monthlyTotals)
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

// Selector for available months
export function useAvailableMonths(): string[] {
  const { expenses } = useExpenseStore();
  const months = new Set(expenses.map((e) => e.date.substring(0, 7)));
  return Array.from(months).sort().reverse();
}
