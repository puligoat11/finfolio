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

// ── Production-only demo data (Vercel / recruiter version) ───────────────────

const demoProdPositions = [
  { symbol: 'AAPL',  name: 'Apple Inc.',           shares: 12, avg_cost: 148.50 },
  { symbol: 'MSFT',  name: 'Microsoft Corporation', shares: 10, avg_cost: 292.00 },
  { symbol: 'NVDA',  name: 'NVIDIA Corporation',    shares: 5,  avg_cost: 462.00 },
  { symbol: 'META',  name: 'Meta Platforms Inc.',   shares: 8,  avg_cost: 318.00 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.',         shares: 6,  avg_cost: 131.00 },
  { symbol: 'SPY',   name: 'SPDR S&P 500 ETF',     shares: 4,  avg_cost: 488.00 },
];

function demoProdTrades() {
  const trades: Array<{id:string;symbol:string;name:string;type:string;shares:number;price:number;total:number;date:string;notes?:string}> = [];
  const add = (id:string, symbol:string, name:string, shares:number, price:number, monthsBack:number, day:number, notes?:string) => {
    trades.push({ id, symbol, name, type:'buy', shares, price, total: shares * price,
      date: new Date(new Date().setMonth(new Date().getMonth() - monthsBack, day)).toISOString(), notes });
  };
  add('dt-aapl-1', 'AAPL', 'Apple Inc.',           8,  144.00, 22, 5,  'Initial position');
  add('dt-aapl-2', 'AAPL', 'Apple Inc.',           4,  157.50, 8,  12, 'Added on dip');
  add('dt-msft-1', 'MSFT', 'Microsoft Corporation',10, 292.00, 18, 20, 'Strong AI fundamentals');
  add('dt-nvda-1', 'NVDA', 'NVIDIA Corporation',   3,  445.00, 14, 8);
  add('dt-nvda-2', 'NVDA', 'NVIDIA Corporation',   2,  485.00, 6,  15, 'Added after earnings');
  add('dt-meta-1', 'META', 'Meta Platforms Inc.',  8,  318.00, 16, 3,  'Year of efficiency');
  add('dt-googl-1','GOOGL','Alphabet Inc.',         6,  131.00, 20, 10);
  add('dt-spy-1',  'SPY',  'SPDR S&P 500 ETF',    4,  488.00, 24, 1,  'Core index holding');
  return trades;
}

function demoProdIncome() {
  const entries: Array<{id:string;date:string;source:string;amount:number;type:string;recurring?:boolean}> = [];
  for (let m = 11; m >= 0; m--) {
    entries.push({ id:`pi-sal-${m}-a`, date:monthsAgo(m,1),  source:'Employer', amount:10417, type:'Salary', recurring:true });
    entries.push({ id:`pi-sal-${m}-b`, date:monthsAgo(m,15), source:'Employer', amount:10417, type:'Salary', recurring:true });
  }
  entries.push({ id:'pi-bonus-1',  date:monthsAgo(11,20), source:'Annual Bonus',    amount:30000, type:'Bonus' });
  entries.push({ id:'pi-rsu-1',    date:monthsAgo(9,1),   source:'RSU Vest Q1',     amount:18500, type:'RSU' });
  entries.push({ id:'pi-rsu-2',    date:monthsAgo(6,1),   source:'RSU Vest Q2',     amount:19200, type:'RSU' });
  entries.push({ id:'pi-rsu-3',    date:monthsAgo(3,1),   source:'RSU Vest Q3',     amount:20100, type:'RSU' });
  entries.push({ id:'pi-div-1',    date:monthsAgo(2,5),   source:'Dividend Income', amount:380,   type:'Investment' });
  entries.push({ id:'pi-div-2',    date:monthsAgo(5,5),   source:'Dividend Income', amount:340,   type:'Investment' });
  return entries;
}

const PROD_EXPENSE_TEMPLATES = [
  { description: 'Trader Joe\'s',           amount: 92,    category: 'Shopping'      },
  { description: 'Whole Foods Market',      amount: 78,    category: 'Shopping'      },
  { description: 'Netflix',                 amount: 22.99, category: 'Subscriptions' },
  { description: 'Spotify',                 amount: 10.99, category: 'Subscriptions' },
  { description: 'PG&E Electric',           amount: 88,    category: 'Bills'         },
  { description: 'Comcast Internet',        amount: 79.99, category: 'Bills'         },
  { description: 'Chipotle',               amount: 14.50, category: 'Dining'        },
  { description: 'Starbucks',              amount: 7.25,  category: 'Dining'        },
  { description: 'DoorDash',               amount: 38.40, category: 'Dining'        },
  { description: 'Shell Gas Station',      amount: 58.20, category: 'Gas'           },
  { description: 'Amazon',                 amount: 64.50, category: 'Shopping'      },
  { description: 'Gym Membership',         amount: 55.00, category: 'Subscriptions' },
  { description: 'Rent Payment',           amount: 2400,  category: 'Bills'         },
  { description: 'Uber Ride',              amount: 22.50, category: 'Travel'        },
  { description: 'Apple One',              amount: 29.95, category: 'Subscriptions' },
];

function demoProdExpenses() {
  const items: Array<{id:string;date:string;description:string;amount:number;category:string;hash:string}> = [];
  for (let m = 11; m >= 0; m--) {
    PROD_EXPENSE_TEMPLATES.forEach((tmpl, i) => {
      const noise  = 1 + (Math.random() * 0.16 - 0.08);
      const amount = Math.round(tmpl.amount * noise * 100) / 100;
      const day    = ((i * 2) % 27) + 1;
      const date   = monthsAgo(m, day);
      const hash   = btoa(`${date}-${tmpl.description}-${amount}`).replace(/=/g, '');
      items.push({ id:`pe-${m}-${i}`, date, description:tmpl.description, amount, category:tmpl.category, hash });
    });
  }
  return items;
}

export function useDemoData() {
  useEffect(() => {
    const isProd = import.meta.env.PROD;
    const flagKey = isProd ? 'demo_loaded_prod_v1' : 'demo_loaded_v4';

    if (getSetting(flagKey)) return;

    // Always clear everything
    clearTable('positions');
    clearTable('trades');
    clearTable('income');
    clearTable('expenses');

    // Seed watchlist for everyone
    demoWatchlist.forEach(item =>
      upsert('watchlist', 'symbol', item.symbol, {
        symbol: item.symbol, name: item.name, added_at: new Date().toISOString(),
      })
    );

    if (isProd) {
      // Vercel / recruiter version: seed realistic demo portfolio
      demoProdPositions.forEach(p =>
        insert('positions', { symbol: p.symbol, name: p.name, shares: p.shares, avg_cost: p.avg_cost })
      );
      demoProdTrades().forEach(t => insert('trades', t));
      demoProdIncome().forEach(e => insert('income', { ...e, recurring: e.recurring ?? false }));
      demoProdExpenses().forEach(e => insert('expenses', e));
    }

    setSetting(flagKey, 'true');
  }, []);
}
