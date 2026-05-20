// Shared utilities for Vercel serverless API functions.
// Module-level state persists across warm invocations of the same function instance.

export const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

// ── Session (cookies + crumb) ────────────────────────────────────────────────
let session = null;
let sessionPromise = null;

async function refreshSession() {
  const homeRes = await fetch('https://finance.yahoo.com', {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    redirect: 'follow',
  });
  const setCookies = homeRes.headers.getSetCookie?.() ?? [];
  const cookies = setCookies.map((c) => c.split(';')[0]).join('; ');

  const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': UA, Cookie: cookies, Accept: '*/*' },
  });
  const crumb = crumbRes.ok ? (await crumbRes.text()).trim() : '';

  session = { cookies, crumb };
  setTimeout(() => { session = null; sessionPromise = null; }, 25 * 60 * 1000);
  return session;
}

export function getSession() {
  if (session) return Promise.resolve(session);
  if (!sessionPromise)
    sessionPromise = refreshSession().catch((e) => { sessionPromise = null; throw e; });
  return sessionPromise;
}

// ── In-memory cache ──────────────────────────────────────────────────────────
const cache = new Map();

export async function yfFetch(url, ttl = 60_000) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.ts < ttl) return hit.data;

  const { cookies, crumb } = await getSession();
  const fullUrl = crumb
    ? `${url}${url.includes('?') ? '&' : '?'}crumb=${encodeURIComponent(crumb)}`
    : url;

  const res = await fetch(fullUrl, {
    headers: { 'User-Agent': UA, Cookie: cookies, Accept: 'application/json' },
  });

  if (res.status === 401 || res.status === 403) {
    session = null;
    sessionPromise = null;
    throw new Error(`Auth error (${res.status})`);
  }
  if (res.status === 429) throw new Error('rate_limit');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  cache.set(url, { data, ts: Date.now() });
  return data;
}

// ── Mock data ────────────────────────────────────────────────────────────────
export const MOCK_PRICES = {
  AAPL: 195.7,  MSFT: 378.8,  GOOGL: 175.9, NVDA: 870.4,  AMZN: 185.5,
  TSLA: 177.9,  META: 490.3,  V: 278.1,     SPY: 527.2,   QQQ: 450.8,
  AMD:  159.2,  CRM: 299.4,   NFLX: 620.5,  PLTR: 22.4,   SNOW: 138.7,
  COIN: 231.1,  UBER: 80.4,   DIS: 112.5,   JPM: 198.3,   BAC: 38.4,
  INTC: 43.2,   ORCL: 118.6,  ADBE: 495.0,  PYPL: 63.1,   SHOP: 72.4,
};

export function mockQuote(symbol) {
  const price = MOCK_PRICES[symbol.toUpperCase()] ?? 100 + Math.random() * 200;
  const changePct = Math.random() * 4 - 2;
  const change = (price * changePct) / 100;
  return {
    symbol,
    name: symbol,
    price,
    change,
    changePercent: changePct,
    previousClose: price - change,
    volume: Math.floor(Math.random() * 50_000_000),
    marketCap: price * 1_000_000_000,
    timestamp: Date.now(),
  };
}

export function mockChart(symbol, range) {
  const basePrice = MOCK_PRICES[symbol.toUpperCase()] ?? 150;
  const days =
    range === '5d' ? 5 :
    range === '1mo' ? 22 :
    range === '3mo' ? 66 :
    range === '6mo' ? 132 :
    range === 'ytd' ? 140 :
    range === '1y' ? 252 : 500;
  const now = Date.now();
  const dayMs = 86_400_000;
  const dates = [], prices = [], volumes = [];
  let price = basePrice * 0.75;
  for (let i = days; i >= 0; i--) {
    const d = new Date(now - i * dayMs);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    price *= 1 + (Math.random() * 0.04 - 0.018);
    dates.push(d.toISOString().split('T')[0]);
    prices.push(Math.round(price * 100) / 100);
    volumes.push(Math.floor(Math.random() * 30_000_000 + 5_000_000));
  }
  return {
    dates,
    prices,
    volumes,
    opens: prices,
    highs: prices.map((p) => p * 1.01),
    lows:  prices.map((p) => p * 0.99),
  };
}

export function parseQuoteMeta(meta, symbol) {
  const price = meta.regularMarketPrice ?? 0;
  const prev  = meta.regularMarketPreviousClose ?? price;
  return {
    symbol:           (meta.symbol || symbol).toUpperCase(),
    name:             meta.longName || meta.shortName || symbol,
    price,
    change:           price - prev,
    changePercent:    meta.regularMarketChangePercent ?? (prev > 0 ? ((price - prev) / prev) * 100 : 0),
    previousClose:    prev,
    open:             meta.regularMarketOpen,
    high:             meta.regularMarketDayHigh,
    low:              meta.regularMarketDayLow,
    volume:           meta.regularMarketVolume,
    marketCap:        meta.marketCap,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
    fiftyTwoWeekLow:  meta.fiftyTwoWeekLow,
    peRatio:          meta.trailingPE,
    timestamp:        Date.now(),
  };
}

export function getStartDate(range) {
  const now = new Date();
  switch (range) {
    case '1d':  return new Date(now - 86_400_000);
    case '5d':  return new Date(now - 5 * 86_400_000);
    case '1mo': { const d = new Date(now); d.setMonth(d.getMonth() - 1); return d; }
    case '3mo': { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d; }
    case '6mo': { const d = new Date(now); d.setMonth(d.getMonth() - 6); return d; }
    case 'ytd': return new Date(now.getFullYear(), 0, 1);
    case '1y':  { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d; }
    case '2y':  { const d = new Date(now); d.setFullYear(d.getFullYear() - 2); return d; }
    case '5y':  { const d = new Date(now); d.setFullYear(d.getFullYear() - 5); return d; }
    case 'max': return new Date('2015-01-01');
    default:    { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d; }
  }
}

export function defaultInterval(range) {
  const map = {
    '1d': '5m', '5d': '15m', '1mo': '1d', '3mo': '1d',
    '6mo': '1d', 'ytd': '1d', '1y': '1d', '2y': '1wk',
    '5y': '1wk', 'max': '1mo',
  };
  return map[range] ?? '1d';
}

// ── CORS headers ─────────────────────────────────────────────────────────────
export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ── Known symbols for local search fallback ───────────────────────────────────
export const KNOWN_SYMBOLS = [
  { symbol: 'AAPL',  name: 'Apple Inc.' },
  { symbol: 'MSFT',  name: 'Microsoft Corporation' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'NVDA',  name: 'NVIDIA Corporation' },
  { symbol: 'AMZN',  name: 'Amazon.com Inc.' },
  { symbol: 'TSLA',  name: 'Tesla, Inc.' },
  { symbol: 'META',  name: 'Meta Platforms Inc.' },
  { symbol: 'V',     name: 'Visa Inc.' },
  { symbol: 'AMD',   name: 'Advanced Micro Devices' },
  { symbol: 'CRM',   name: 'Salesforce Inc.' },
  { symbol: 'NFLX',  name: 'Netflix Inc.' },
  { symbol: 'PLTR',  name: 'Palantir Technologies' },
  { symbol: 'SNOW',  name: 'Snowflake Inc.' },
  { symbol: 'COIN',  name: 'Coinbase Global' },
  { symbol: 'UBER',  name: 'Uber Technologies' },
  { symbol: 'DIS',   name: 'Walt Disney Co.' },
  { symbol: 'JPM',   name: 'JPMorgan Chase & Co.' },
  { symbol: 'BAC',   name: 'Bank of America Corporation' },
  { symbol: 'INTC',  name: 'Intel Corporation' },
  { symbol: 'ORCL',  name: 'Oracle Corporation' },
  { symbol: 'ADBE',  name: 'Adobe Inc.' },
  { symbol: 'PYPL',  name: 'PayPal Holdings Inc.' },
  { symbol: 'SHOP',  name: 'Shopify Inc.' },
  { symbol: 'SQ',    name: 'Block Inc.' },
  { symbol: 'AVGO',  name: 'Broadcom Inc.' },
  { symbol: 'LLY',   name: 'Eli Lilly and Company' },
  { symbol: 'UNH',   name: 'UnitedHealth Group' },
  { symbol: 'JNJ',   name: 'Johnson & Johnson' },
  { symbol: 'XOM',   name: 'Exxon Mobil Corporation' },
  { symbol: 'PG',    name: 'Procter & Gamble Co.' },
  { symbol: 'MA',    name: 'Mastercard Incorporated' },
  { symbol: 'HD',    name: 'The Home Depot Inc.' },
  { symbol: 'CVX',   name: 'Chevron Corporation' },
  { symbol: 'MRK',   name: 'Merck & Co. Inc.' },
  { symbol: 'ABBV',  name: 'AbbVie Inc.' },
  { symbol: 'KO',    name: 'The Coca-Cola Company' },
  { symbol: 'COST',  name: 'Costco Wholesale Corporation' },
  { symbol: 'WMT',   name: 'Walmart Inc.' },
  { symbol: 'CSCO',  name: 'Cisco Systems Inc.' },
  { symbol: 'NOW',   name: 'ServiceNow Inc.' },
  { symbol: 'INTU',  name: 'Intuit Inc.' },
  { symbol: 'QCOM',  name: 'QUALCOMM Incorporated' },
  { symbol: 'SPY',   name: 'SPDR S&P 500 ETF Trust' },
  { symbol: 'QQQ',   name: 'Invesco QQQ Trust' },
];
