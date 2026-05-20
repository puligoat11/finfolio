// Simple localStorage-based database (no external dependencies)
import { migrations } from './migrations';

const DB_KEY = 'stock_portfolio_data';

type DbRecord = Record<string, unknown>;

interface DbData {
  positions: DbRecord[];
  trades: DbRecord[];
  watchlist: DbRecord[];
  accounts: DbRecord[];
  income: DbRecord[];
  recurring_income: DbRecord[];
  rsu_entries: DbRecord[];
  expenses: DbRecord[];
  budgets: Record<string, Record<string, number>>;
  expense_categories: string[];
  settings: Record<string, string>;
  _migrations: string[];
}

let data: DbData | null = null;

function getDefaultData(): DbData {
  return {
    positions: [],
    trades: [],
    watchlist: [],
    accounts: [],
    income: [],
    recurring_income: [],
    rsu_entries: [],
    expenses: [],
    budgets: {},
    expense_categories: ['Dining', 'Shopping', 'Gas', 'Entertainment', 'Bills', 'Travel', 'Subscriptions', 'Other'],
    settings: {},
    _migrations: [],
  };
}

export async function initDatabase(): Promise<void> {
  console.log('Initializing database...');

  const saved = localStorage.getItem(DB_KEY);
  if (saved) {
    try {
      data = JSON.parse(saved);
      console.log('Database loaded from localStorage');
    } catch {
      console.warn('Failed to parse saved data, starting fresh');
      data = getDefaultData();
    }
  } else {
    data = getDefaultData();
    console.log('Created new database');
  }

  runMigrations();
  window.addEventListener('beforeunload', saveDatabase);
  console.log('Database ready');
}

function runMigrations(): void {
  if (!data) return;
  for (const migration of migrations) {
    if (!data._migrations.includes(migration.name)) {
      console.log(`Migration: ${migration.name}`);
      data._migrations.push(migration.name);
    }
  }
  saveDatabase();
}

export function saveDatabase(): void {
  if (!data) return;
  localStorage.setItem(DB_KEY, JSON.stringify(data));
}

function getData(): DbData {
  if (!data) throw new Error('Database not initialized');
  return data;
}

function getTable(table: string): DbRecord[] {
  const db = getData();
  if (table === 'positions') return db.positions;
  if (table === 'trades') return db.trades;
  if (table === 'watchlist') return db.watchlist;
  if (table === 'accounts') return db.accounts;
  if (table === 'income') return db.income;
  if (table === 'recurring_income') return db.recurring_income;
  if (table === 'rsu_entries') return db.rsu_entries;
  if (table === 'expenses') return db.expenses;
  return [];
}

export function queryAll<T>(table: string): T[] {
  return getTable(table) as T[];
}

export function queryOne<T>(table: string, predicate: (item: T) => boolean): T | null {
  const items = queryAll<T>(table);
  return items.find(predicate) || null;
}

export function insert(table: string, record: DbRecord): void {
  const tableData = getTable(table);
  tableData.push(record);
  saveDatabase();
}

export function update(table: string, predicate: (item: DbRecord) => boolean, updates: DbRecord): void {
  const tableData = getTable(table);
  const index = tableData.findIndex(predicate);
  if (index !== -1) {
    tableData[index] = { ...tableData[index], ...updates };
    saveDatabase();
  }
}

export function upsert(table: string, key: string, keyValue: unknown, record: DbRecord): void {
  const tableData = getTable(table);
  const index = tableData.findIndex((item) => item[key] === keyValue);
  if (index !== -1) {
    tableData[index] = { ...tableData[index], ...record };
  } else {
    tableData.push(record);
  }
  saveDatabase();
}

export function remove(table: string, predicate: (item: DbRecord) => boolean): void {
  const tableData = getTable(table);
  const index = tableData.findIndex(predicate);
  if (index !== -1) {
    tableData.splice(index, 1);
    saveDatabase();
  }
}

export function getSetting(key: string): string | null {
  const db = getData();
  return db.settings[key] || null;
}

export function setSetting(key: string, value: string): void {
  const db = getData();
  db.settings[key] = value;
  saveDatabase();
}

// Budget operations
export function getBudgets(): Record<string, Record<string, number>> {
  const db = getData();
  return db.budgets || {};
}

export function setBudget(month: string, category: string, amount: number): void {
  const db = getData();
  if (!db.budgets) db.budgets = {};
  if (!db.budgets[month]) db.budgets[month] = {};
  db.budgets[month][category] = amount;
  saveDatabase();
}

export function getBudgetForMonth(month: string): Record<string, number> {
  const db = getData();
  return db.budgets?.[month] || {};
}

// Expense categories
export function getExpenseCategories(): string[] {
  const db = getData();
  return db.expense_categories || ['Dining', 'Shopping', 'Gas', 'Entertainment', 'Bills', 'Travel', 'Subscriptions', 'Other'];
}

export function addExpenseCategory(category: string): void {
  const db = getData();
  if (!db.expense_categories.includes(category)) {
    db.expense_categories.push(category);
    saveDatabase();
  }
}
