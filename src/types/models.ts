// Core data models ported from Flutter app

export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose?: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  marketCap?: number;
  peRatio?: number;
  dividend?: number;
  eps?: number;
  sector?: string;
}

export interface Position {
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  totalGain: number;
  totalGainPercent: number;
  dayGain: number;
  dayGainPercent: number;
  accountId?: string;
}

export type TradeType = 'buy' | 'sell' | 'dividend';

export interface Trade {
  id: string;
  symbol: string;
  name: string;
  type: TradeType;
  shares: number;
  price: number;
  total: number;
  date: Date;
  accountId?: string;
  notes?: string;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  totalGain: number;
  totalGainPercent: number;
  cashBalance: number;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  addedAt?: Date;
}

export interface AnalystRating {
  symbol: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  targetPrice?: number;
  currentPrice?: number;
}

export interface NewsItem {
  id: string;
  title: string;
  summary?: string;
  source: string;
  url: string;
  publishedAt: Date;
  relatedSymbols?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  imageUrl?: string;
}

export interface PortfolioSummary {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  totalGain: number;
  totalGainPercent: number;
  cashBalance: number;
  positionsCount: number;
  accounts: Account[];
}

export interface ChartDataPoint {
  date: Date;
  value: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

export interface EarningsEvent {
  symbol: string;
  date: Date;
  time?: 'BMO' | 'AMC'; // Before Market Open / After Market Close
  estimatedEps?: number;
  actualEps?: number;
  surprise?: number;
}

// Utility types
export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  name: string;
  previousClose?: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  marketCap?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  peRatio?: number;
  timestamp?: number;
}

export interface QuoteCache {
  symbol: string;
  quote: StockQuote;
  cachedAt: number;
}

// Computed helpers
export function isPositive(value: number): boolean {
  return value >= 0;
}

export function computeCostBasis(shares: number, avgCost: number): number {
  return shares * avgCost;
}

export function computeAnalystConsensus(rating: AnalystRating): 'Buy' | 'Sell' | 'Hold' {
  const buyCount = rating.strongBuy + rating.buy;
  const sellCount = rating.sell + rating.strongSell;
  const holdCount = rating.hold;

  if (buyCount > holdCount && buyCount > sellCount) return 'Buy';
  if (sellCount > holdCount && sellCount > buyCount) return 'Sell';
  return 'Hold';
}

export function computeUpside(targetPrice: number, currentPrice: number): number {
  return ((targetPrice - currentPrice) / currentPrice) * 100;
}

// =====================
// Finance Tracking Types
// =====================

export type IncomeType = 'Salary' | 'Bonus' | 'Freelance' | 'Investment' | 'RSU' | 'Other';

export interface IncomeEntry {
  id: string;
  date: string;
  source: string;
  amount: number;
  type: IncomeType;
  recurring?: boolean;
  notes?: string;
}

export interface RecurringIncome {
  id: string;
  source: string;
  amount: number;
  type: IncomeType;
  frequencyWeeks: number;
  startDate: string;
  isActive: boolean;
}

export interface RSUEntry {
  id: string;
  symbol: string;
  shares: number;
  vestDate: string;
  grantPrice: number;
}

export interface IncomeData {
  entries: IncomeEntry[];
  recurring: RecurringIncome[];
  rsuEntries: RSUEntry[];
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  hash: string; // For duplicate detection
  imported_from?: string;
}

export interface Budget {
  [month: string]: {
    [category: string]: number;
  };
}

export interface ExpenseData {
  expenses: Expense[];
  budgets: Budget;
  categories: string[];
}

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Dining',
  'Shopping',
  'Gas',
  'Entertainment',
  'Bills',
  'Travel',
  'Subscriptions',
  'Other',
];

export const INCOME_TYPES: IncomeType[] = [
  'Salary',
  'Bonus',
  'Freelance',
  'Investment',
  'RSU',
  'Other',
];

// Category mapping for Capital One CSV import
export const CAPITAL_ONE_CATEGORY_MAP: { [key: string]: string } = {
  'Dining': 'Dining',
  'Merchandise': 'Shopping',
  'Gas/Automotive': 'Gas',
  'Entertainment': 'Entertainment',
  'Phone/Cable': 'Bills',
  'Professional Services': 'Bills',
  'Travel': 'Travel',
  'Other Travel': 'Travel',
  'Airfare': 'Travel',
  'Lodging': 'Travel',
  'Internet': 'Bills',
  'Fees/Adjustments': 'Other',
  'Other Services': 'Other',
  'Other': 'Other',
  'Payment/Credit': 'SKIP',
};

// Helper to generate expense hash for duplicate detection
export function generateExpenseHash(date: string, description: string, amount: number): string {
  const str = `${date}-${description.substring(0, 50)}-${amount}`;
  return btoa(str);
}

// Auto-categorize expense based on description keywords
export function autoCategorizeExpense(description: string): string {
  const desc = description.toLowerCase();

  // Dining keywords
  if (/restaurant|cafe|coffee|doordash|starbucks|chipotle|mcdonalds|pizza|sushi|thai|chinese|mexican|grubhub|ubereats|postmates/i.test(desc)) {
    return 'Dining';
  }

  // Shopping keywords
  if (/amazon|ebay|walmart|target|costco|safeway|grocery|trader joe|whole foods|kroger|publix|cvs|walgreens/i.test(desc)) {
    return 'Shopping';
  }

  // Gas keywords
  if (/shell|exxon|chevron|mobil|gas|fuel|bp\s|arco|76\s/i.test(desc)) {
    return 'Gas';
  }

  // Entertainment keywords
  if (/netflix|spotify|hulu|disney|hbo|movie|cinema|game|steam|playstation|xbox|apple music/i.test(desc)) {
    return 'Entertainment';
  }

  // Bills keywords
  if (/utility|electric|water|pg&e|comcast|at&t|verizon|t-mobile|insurance|rent|mortgage/i.test(desc)) {
    return 'Bills';
  }

  // Travel keywords
  if (/airline|hotel|airbnb|uber|lyft|united|delta|american|southwest|marriott|hilton/i.test(desc)) {
    return 'Travel';
  }

  // Subscriptions keywords
  if (/membership|annual|monthly|subscription|prime|gym|fitness/i.test(desc)) {
    return 'Subscriptions';
  }

  return 'Other';
}
