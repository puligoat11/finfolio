import { useEffect } from 'react';
import { upsert, insert, getSetting, setSetting } from '@/services/db/database';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function monthsAgo(n: number, day = 15): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(day);
  return d.toISOString().split('T')[0];
}

const demoPositions = [
  { symbol: 'AAPL',  name: 'Apple Inc.',               shares: 150, avg_cost: 142.35 },
  { symbol: 'MSFT',  name: 'Microsoft Corporation',    shares: 75,  avg_cost: 285.20 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.',             shares: 50,  avg_cost: 118.45 },
  { symbol: 'NVDA',  name: 'NVIDIA Corporation',        shares: 40,  avg_cost: 450.00 },
  { symbol: 'AMZN',  name: 'Amazon.com Inc.',           shares: 100, avg_cost: 145.80 },
  { symbol: 'TSLA',  name: 'Tesla, Inc.',               shares: 30,  avg_cost: 225.50 },
  { symbol: 'META',  name: 'Meta Platforms Inc.',       shares: 45,  avg_cost: 298.75 },
  { symbol: 'V',     name: 'Visa Inc.',                 shares: 60,  avg_cost: 228.40 },
];

const demoTrades = [
  { id: 'demo-t1',  symbol: 'AAPL',  name: 'Apple Inc.',            type: 'buy',      shares: 50,  price: 138.20, daysBack: 540 },
  { id: 'demo-t2',  symbol: 'MSFT',  name: 'Microsoft Corporation', type: 'buy',      shares: 25,  price: 275.50, daysBack: 510 },
  { id: 'demo-t3',  symbol: 'GOOGL', name: 'Alphabet Inc.',         type: 'buy',      shares: 30,  price: 115.00, daysBack: 480 },
  { id: 'demo-t4',  symbol: 'NVDA',  name: 'NVIDIA Corporation',    type: 'buy',      shares: 20,  price: 420.00, daysBack: 450 },
  { id: 'demo-t5',  symbol: 'AAPL',  name: 'Apple Inc.',            type: 'buy',      shares: 100, price: 145.80, daysBack: 420 },
  { id: 'demo-t6',  symbol: 'AMZN',  name: 'Amazon.com Inc.',       type: 'buy',      shares: 75,  price: 140.20, daysBack: 390 },
  { id: 'demo-t7',  symbol: 'TSLA',  name: 'Tesla, Inc.',           type: 'buy',      shares: 30,  price: 225.50, daysBack: 360 },
  { id: 'demo-t8',  symbol: 'MSFT',  name: 'Microsoft Corporation', type: 'dividend', shares: 50,  price: 0.75,   daysBack: 330 },
  { id: 'demo-t9',  symbol: 'META',  name: 'Meta Platforms Inc.',   type: 'buy',      shares: 30,  price: 290.00, daysBack: 300 },
  { id: 'demo-t10', symbol: 'AAPL',  name: 'Apple Inc.',            type: 'dividend', shares: 150, price: 0.24,   daysBack: 270 },
  { id: 'demo-t11', symbol: 'NVDA',  name: 'NVIDIA Corporation',    type: 'buy',      shares: 20,  price: 480.00, daysBack: 240 },
  { id: 'demo-t12', symbol: 'V',     name: 'Visa Inc.',             type: 'buy',      shares: 60,  price: 228.40, daysBack: 210 },
  { id: 'demo-t13', symbol: 'GOOGL', name: 'Alphabet Inc.',         type: 'buy',      shares: 20,  price: 122.50, daysBack: 180 },
  { id: 'demo-t14', symbol: 'META',  name: 'Meta Platforms Inc.',   type: 'buy',      shares: 15,  price: 310.00, daysBack: 150 },
  { id: 'demo-t15', symbol: 'MSFT',  name: 'Microsoft Corporation', type: 'buy',      shares: 50,  price: 295.00, daysBack: 120 },
  { id: 'demo-t16', symbol: 'AAPL',  name: 'Apple Inc.',            type: 'dividend', shares: 150, price: 0.25,   daysBack: 90  },
  { id: 'demo-t17', symbol: 'AMZN',  name: 'Amazon.com Inc.',       type: 'buy',      shares: 25,  price: 150.00, daysBack: 60  },
  { id: 'demo-t18', symbol: 'NVDA',  name: 'NVIDIA Corporation',    type: 'sell',     shares: 5,   price: 875.00, daysBack: 30  },
  { id: 'demo-t19', symbol: 'MSFT',  name: 'Microsoft Corporation', type: 'dividend', shares: 75,  price: 0.75,   daysBack: 15  },
  { id: 'demo-t20', symbol: 'GOOGL', name: 'Alphabet Inc.',         type: 'buy',      shares: 5,   price: 175.00, daysBack: 7   },
];

const demoWatchlist = [
  { symbol: 'AMD',  name: 'Advanced Micro Devices' },
  { symbol: 'CRM',  name: 'Salesforce Inc.' },
  { symbol: 'NFLX', name: 'Netflix Inc.' },
  { symbol: 'PLTR', name: 'Palantir Technologies' },
  { symbol: 'SNOW', name: 'Snowflake Inc.' },
  { symbol: 'COIN', name: 'Coinbase Global' },
  { symbol: 'UBER', name: 'Uber Technologies' },
];

function demoIncomeEntries(): Array<{id: string; date: string; source: string; amount: number; type: string; recurring?: boolean}> {
  const entries: Array<{id: string; date: string; source: string; amount: number; type: string; recurring?: boolean}> = [];
  for (let m = 11; m >= 0; m--) {
    entries.push({
      id: `demo-inc-sal-${m}`,
      date: monthsAgo(m, 1),
      source: 'Acme Corp',
      amount: 12500,
      type: 'Salary',
    });
    entries.push({
      id: `demo-inc-sal2-${m}`,
      date: monthsAgo(m, 15),
      source: 'Acme Corp',
      amount: 12500,
      type: 'Salary',
    });
  }
  entries.push({ id: 'demo-inc-bonus-1', date: monthsAgo(11, 20), source: 'Year-End Bonus', amount: 18000, type: 'Bonus' });
  entries.push({ id: 'demo-inc-bonus-2', date: monthsAgo(5, 10),  source: 'Mid-Year Bonus',  amount: 8000,  type: 'Bonus' });
  entries.push({ id: 'demo-inc-rsu-1',   date: monthsAgo(9, 1),   source: 'NVDA RSU Vest',   amount: 21000, type: 'RSU' });
  entries.push({ id: 'demo-inc-rsu-2',   date: monthsAgo(6, 1),   source: 'NVDA RSU Vest',   amount: 22500, type: 'RSU' });
  entries.push({ id: 'demo-inc-rsu-3',   date: monthsAgo(3, 1),   source: 'NVDA RSU Vest',   amount: 24000, type: 'RSU' });
  entries.push({ id: 'demo-inc-inv-1',   date: monthsAgo(2, 5),   source: 'Dividend Income', amount: 640,   type: 'Investment' });
  entries.push({ id: 'demo-inc-inv-2',   date: monthsAgo(5, 5),   source: 'Dividend Income', amount: 590,   type: 'Investment' });
  return entries;
}

const EXPENSE_TEMPLATES = [
  { description: 'Whole Foods Market',    amount: 182,  category: 'Shopping' },
  { description: 'Netflix',               amount: 22.99, category: 'Subscriptions' },
  { description: 'Spotify',               amount: 10.99, category: 'Subscriptions' },
  { description: 'PG&E Electric',         amount: 95,   category: 'Bills' },
  { description: 'Comcast Internet',      amount: 79.99, category: 'Bills' },
  { description: 'Chipotle Mexican Grill',amount: 18.45, category: 'Dining' },
  { description: 'Starbucks',             amount: 7.85,  category: 'Dining' },
  { description: 'DoorDash Order',        amount: 42.30, category: 'Dining' },
  { description: 'Shell Gas Station',     amount: 68.20, category: 'Gas' },
  { description: 'Amazon Purchase',       amount: 94.50, category: 'Shopping' },
  { description: 'United Airlines',       amount: 420,  category: 'Travel' },
  { description: 'Gym Membership',        amount: 55,   category: 'Subscriptions' },
  { description: 'Apple One',             amount: 29.95, category: 'Subscriptions' },
  { description: 'Rent Payment',          amount: 2800, category: 'Bills' },
  { description: 'Uber Ride',             amount: 24.50, category: 'Travel' },
];

function demoExpenses(): Array<{id: string; date: string; description: string; amount: number; category: string; hash: string}> {
  const items: Array<{id: string; date: string; description: string; amount: number; category: string; hash: string}> = [];
  for (let m = 11; m >= 0; m--) {
    EXPENSE_TEMPLATES.forEach((tmpl, i) => {
      const noise = 1 + (Math.random() * 0.2 - 0.1);
      const amount = Math.round(tmpl.amount * noise * 100) / 100;
      const day = ((i * 2) % 27) + 1;
      const date = monthsAgo(m, day);
      const hash = btoa(`${date}-${tmpl.description}-${amount}`).replace(/=/g, '');
      items.push({
        id: `demo-exp-${m}-${i}`,
        date,
        description: tmpl.description,
        amount,
        category: tmpl.category,
        hash,
      });
    });
  }
  return items;
}

export function useDemoData() {
  useEffect(() => {
    if (getSetting('demo_loaded_v2')) return;

    demoPositions.forEach(pos => upsert('positions', 'symbol', pos.symbol, pos));

    demoTrades.forEach(t => {
      insert('trades', {
        id: t.id,
        symbol: t.symbol,
        name: t.name,
        type: t.type,
        shares: t.shares,
        price: t.price,
        total: t.shares * t.price,
        date: daysAgo(t.daysBack),
        notes: '',
      });
    });

    demoWatchlist.forEach(item => upsert('watchlist', 'symbol', item.symbol, {
      symbol: item.symbol,
      name: item.name,
      added_at: new Date().toISOString(),
    }));

    demoIncomeEntries().forEach(e => {
      insert('income', { ...e, recurring: e.type === 'Salary' });
    });

    demoExpenses().forEach(e => insert('expenses', e));

    setSetting('demo_loaded_v2', 'true');
  }, []);
}
