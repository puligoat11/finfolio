import { useEffect } from 'react';
import { upsert, insert, getSetting, setSetting, clearTable } from '@/services/db/database';

function monthsAgo(n: number, day = 15): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(day);
  return d.toISOString().split('T')[0];
}

const demoWatchlist = [
  { symbol: 'AAPL',  name: 'Apple Inc.' },
  { symbol: 'NVDA',  name: 'NVIDIA Corporation' },
  { symbol: 'MSFT',  name: 'Microsoft Corporation' },
  { symbol: 'META',  name: 'Meta Platforms Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMD',   name: 'Advanced Micro Devices' },
  { symbol: 'TSLA',  name: 'Tesla, Inc.' },
];

function demoIncomeEntries(): Array<{id: string; date: string; source: string; amount: number; type: string; recurring?: boolean}> {
  const entries: Array<{id: string; date: string; source: string; amount: number; type: string; recurring?: boolean}> = [];
  for (let m = 11; m >= 0; m--) {
    entries.push({ id: `demo-inc-sal-${m}`,  date: monthsAgo(m, 1),  source: 'Employer', amount: 12500, type: 'Salary' });
    entries.push({ id: `demo-inc-sal2-${m}`, date: monthsAgo(m, 15), source: 'Employer', amount: 12500, type: 'Salary' });
  }
  entries.push({ id: 'demo-inc-bonus-1', date: monthsAgo(11, 20), source: 'Year-End Bonus',  amount: 18000, type: 'Bonus' });
  entries.push({ id: 'demo-inc-bonus-2', date: monthsAgo(5,  10), source: 'Mid-Year Bonus',   amount: 8000,  type: 'Bonus' });
  entries.push({ id: 'demo-inc-rsu-1',   date: monthsAgo(9,  1),  source: 'RSU Vest Q1',      amount: 21000, type: 'RSU'   });
  entries.push({ id: 'demo-inc-rsu-2',   date: monthsAgo(6,  1),  source: 'RSU Vest Q2',      amount: 22500, type: 'RSU'   });
  entries.push({ id: 'demo-inc-rsu-3',   date: monthsAgo(3,  1),  source: 'RSU Vest Q3',      amount: 24000, type: 'RSU'   });
  entries.push({ id: 'demo-inc-inv-1',   date: monthsAgo(2,  5),  source: 'Dividend Income',  amount: 640,   type: 'Investment' });
  entries.push({ id: 'demo-inc-inv-2',   date: monthsAgo(5,  5),  source: 'Dividend Income',  amount: 590,   type: 'Investment' });
  return entries;
}

const EXPENSE_TEMPLATES = [
  { description: 'Whole Foods Market',     amount: 182,   category: 'Shopping'       },
  { description: 'Netflix',                amount: 22.99, category: 'Subscriptions'  },
  { description: 'Spotify',                amount: 10.99, category: 'Subscriptions'  },
  { description: 'PG&E Electric',          amount: 95,    category: 'Bills'          },
  { description: 'Comcast Internet',        amount: 79.99, category: 'Bills'          },
  { description: 'Chipotle Mexican Grill',  amount: 18.45, category: 'Dining'         },
  { description: 'Starbucks',              amount: 7.85,  category: 'Dining'         },
  { description: 'DoorDash Order',         amount: 42.30, category: 'Dining'         },
  { description: 'Shell Gas Station',      amount: 68.20, category: 'Gas'            },
  { description: 'Amazon Purchase',        amount: 94.50, category: 'Shopping'       },
  { description: 'United Airlines',        amount: 420,   category: 'Travel'         },
  { description: 'Gym Membership',         amount: 55,    category: 'Subscriptions'  },
  { description: 'Apple One',              amount: 29.95, category: 'Subscriptions'  },
  { description: 'Rent Payment',           amount: 2800,  category: 'Bills'          },
  { description: 'Uber Ride',              amount: 24.50, category: 'Travel'         },
];

function demoExpenses(): Array<{id: string; date: string; description: string; amount: number; category: string; hash: string}> {
  const items: Array<{id: string; date: string; description: string; amount: number; category: string; hash: string}> = [];
  for (let m = 11; m >= 0; m--) {
    EXPENSE_TEMPLATES.forEach((tmpl, i) => {
      const noise  = 1 + (Math.random() * 0.2 - 0.1);
      const amount = Math.round(tmpl.amount * noise * 100) / 100;
      const day    = ((i * 2) % 27) + 1;
      const date   = monthsAgo(m, day);
      const hash   = btoa(`${date}-${tmpl.description}-${amount}`).replace(/=/g, '');
      items.push({ id: `demo-exp-${m}-${i}`, date, description: tmpl.description, amount, category: tmpl.category, hash });
    });
  }
  return items;
}

export function useDemoData() {
  useEffect(() => {
    if (getSetting('demo_loaded_v4')) return;

    // Clear all demo data — user will input their own
    clearTable('positions');
    clearTable('trades');
    clearTable('income');
    clearTable('expenses');

    // Seed watchlist only
    demoWatchlist.forEach(item =>
      upsert('watchlist', 'symbol', item.symbol, {
        symbol: item.symbol,
        name:   item.name,
        added_at: new Date().toISOString(),
      })
    );

    setSetting('demo_loaded_v4', 'true');
  }, []);
}
