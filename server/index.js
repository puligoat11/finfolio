import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env') });

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000'] }));
app.use(express.json());

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

// ── Cookie/Crumb session ─────────────────────────────────────────────────────
let session = null; // { cookies, crumb }
let sessionPromise = null;

async function refreshSession() {
  // Step 1: Hit Yahoo Finance to collect cookies
  const homeRes = await fetch('https://finance.yahoo.com', {
    headers: { 'User-Agent': UA, 'Accept': 'text/html' },
    redirect: 'follow',
  });
  const setCookies = homeRes.headers.getSetCookie?.() ?? [];
  const cookies = setCookies.map(c => c.split(';')[0]).join('; ');

  // Step 2: Fetch crumb using those cookies
  const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': UA, 'Cookie': cookies, 'Accept': '*/*' },
  });
  const crumb = crumbRes.ok ? (await crumbRes.text()).trim() : '';

  session = { cookies, crumb };
  setTimeout(() => { session = null; sessionPromise = null; }, 25 * 60 * 1000);
  return session;
}

function getSession() {
  if (session) return Promise.resolve(session);
  if (!sessionPromise) sessionPromise = refreshSession().catch(e => { sessionPromise = null; throw e; });
  return sessionPromise;
}

// ── Fetch with session ───────────────────────────────────────────────────────
const cache = new Map();

async function yfFetch(url, ttl = 60_000) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.ts < ttl) return hit.data;

  const { cookies, crumb } = await getSession();
  const fullUrl = crumb ? `${url}${url.includes('?') ? '&' : '?'}crumb=${encodeURIComponent(crumb)}` : url;

  const res = await fetch(fullUrl, {
    headers: { 'User-Agent': UA, 'Cookie': cookies, 'Accept': 'application/json' },
  });

  if (res.status === 401 || res.status === 403) {
    session = null; sessionPromise = null;
    throw new Error(`Auth error (${res.status}) — retrying next request`);
  }
  if (res.status === 429) throw new Error('rate_limit');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  cache.set(url, { data, ts: Date.now() });
  return data;
}

// ── Parsers ──────────────────────────────────────────────────────────────────
function parseQuoteMeta(meta, symbol) {
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

function getStartDate(range) {
  const now = new Date();
  switch (range) {
    case '1d':  return new Date(now - 86400000);
    case '5d':  return new Date(now - 5 * 86400000);
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

function defaultInterval(range) {
  const map = { '1d':'5m','5d':'15m','1mo':'1d','3mo':'1d','6mo':'1d','ytd':'1d','1y':'1d','2y':'1wk','5y':'1wk','max':'1mo' };
  return map[range] || '1d';
}

// ── Mock data fallback ───────────────────────────────────────────────────────
const MOCK_PRICES = {
  AAPL:195.7, MSFT:378.8, GOOGL:175.9, NVDA:870.4, AMZN:185.5,
  TSLA:177.9, META:490.3, V:278.1, SPY:527.2, QQQ:450.8,
  AMD:159.2, CRM:299.4, NFLX:620.5, PLTR:22.4, SNOW:138.7,
  COIN:231.1, UBER:80.4,
};

function mockQuote(symbol) {
  const price = MOCK_PRICES[symbol.toUpperCase()] || 100 + Math.random() * 200;
  const changePct = (Math.random() * 4 - 2);
  const change = price * changePct / 100;
  return {
    symbol, name: symbol, price, change, changePercent: changePct,
    previousClose: price - change, volume: Math.floor(Math.random() * 50_000_000),
    marketCap: price * 1_000_000_000, timestamp: Date.now(),
  };
}

function mockChart(symbol, range) {
  const basePrice = MOCK_PRICES[symbol.toUpperCase()] || 150;
  const days = range === '5d' ? 5 : range === '1mo' ? 22 : range === '3mo' ? 66 : range === '6mo' ? 132 : range === 'ytd' ? 140 : range === '1y' ? 252 : 500;
  const now = Date.now();
  const dayMs = 86400000;
  const dates = [], prices = [], volumes = [];
  let price = basePrice * 0.75;
  for (let i = days; i >= 0; i--) {
    const d = new Date(now - i * dayMs);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    price = price * (1 + (Math.random() * 0.04 - 0.018));
    dates.push(d.toISOString().split('T')[0]);
    prices.push(Math.round(price * 100) / 100);
    volumes.push(Math.floor(Math.random() * 30_000_000 + 5_000_000));
  }
  return { dates, prices, volumes, opens: prices, highs: prices.map(p => p * 1.01), lows: prices.map(p => p * 0.99) };
}

// ── Routes ───────────────────────────────────────────────────────────────────

app.get('/api/quote/:symbol', async (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  try {
    const url  = `https://query2.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`;
    const data = await yfFetch(url, 30_000);
    const result = data.chart?.result?.[0];
    if (!result) return res.json(mockQuote(sym));
    res.json(parseQuoteMeta(result.meta, sym));
  } catch (err) {
    console.warn(`[quote/${sym}] ${err.message} — serving mock`);
    res.json(mockQuote(sym));
  }
});

app.post('/api/quotes', async (req, res) => {
  const { symbols = [] } = req.body;
  if (!Array.isArray(symbols)) return res.status(400).json({ error: 'symbols required' });

  const quotes = {};
  await Promise.allSettled(symbols.map(async s => {
    const sym = s.toUpperCase();
    try {
      const url  = `https://query2.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`;
      const data = await yfFetch(url, 30_000);
      const result = data.chart?.result?.[0];
      quotes[sym] = result ? parseQuoteMeta(result.meta, sym) : mockQuote(sym);
    } catch {
      quotes[sym] = mockQuote(sym);
    }
  }));

  res.json(quotes);
});

app.get('/api/chart/:symbol', async (req, res) => {
  const sym      = req.params.symbol.toUpperCase();
  const range    = req.query.range || '1y';
  const interval = req.query.interval || defaultInterval(range);
  const period1  = Math.floor(getStartDate(range).getTime() / 1000);
  const period2  = Math.floor(Date.now() / 1000);

  try {
    const url  = `https://query2.finance.yahoo.com/v8/finance/chart/${sym}?interval=${interval}&period1=${period1}&period2=${period2}`;
    const data = await yfFetch(url, range === '1d' ? 30_000 : 5 * 60_000);

    const result = data.chart?.result?.[0];
    if (!result?.timestamp) return res.json(mockChart(sym, range));

    const ts = result.timestamp;
    const q  = result.indicators?.quote?.[0] || {};

    const valid = ts
      .map((t, i) => ({ date: new Date(t * 1000).toISOString().split('T')[0], price: q.close?.[i], volume: q.volume?.[i] ?? 0, open: q.open?.[i], high: q.high?.[i], low: q.low?.[i] }))
      .filter(p => p.price != null && p.price > 0);

    if (!valid.length) return res.json(mockChart(sym, range));

    res.json({ dates: valid.map(p => p.date), prices: valid.map(p => p.price), volumes: valid.map(p => p.volume), opens: valid.map(p => p.open ?? p.price), highs: valid.map(p => p.high ?? p.price), lows: valid.map(p => p.low ?? p.price) });
  } catch (err) {
    console.warn(`[chart/${sym}] ${err.message} — serving mock`);
    res.json(mockChart(sym, range));
  }
});

app.get('/api/search', async (req, res) => {
  const q = req.query.q || '';
  if (!q) return res.json({ results: [] });

  const KNOWN = [
    { symbol: 'AAPL', name: 'Apple Inc.' }, { symbol: 'MSFT', name: 'Microsoft Corporation' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' }, { symbol: 'NVDA', name: 'NVIDIA Corporation' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' }, { symbol: 'TSLA', name: 'Tesla, Inc.' },
    { symbol: 'META', name: 'Meta Platforms Inc.' }, { symbol: 'V', name: 'Visa Inc.' },
    { symbol: 'AMD', name: 'Advanced Micro Devices' }, { symbol: 'CRM', name: 'Salesforce Inc.' },
    { symbol: 'NFLX', name: 'Netflix Inc.' }, { symbol: 'PLTR', name: 'Palantir Technologies' },
    { symbol: 'SNOW', name: 'Snowflake Inc.' }, { symbol: 'COIN', name: 'Coinbase Global' },
    { symbol: 'UBER', name: 'Uber Technologies' }, { symbol: 'DIS', name: 'Walt Disney Co.' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.' }, { symbol: 'BRK-B', name: 'Berkshire Hathaway' },
    { symbol: 'LLY', name: 'Eli Lilly and Company' }, { symbol: 'UNH', name: 'UnitedHealth Group' },
    { symbol: 'JNJ', name: 'Johnson & Johnson' }, { symbol: 'XOM', name: 'Exxon Mobil Corporation' },
    { symbol: 'AVGO', name: 'Broadcom Inc.' }, { symbol: 'PG', name: 'Procter & Gamble Co.' },
    { symbol: 'MA', name: 'Mastercard Incorporated' }, { symbol: 'HD', name: 'The Home Depot Inc.' },
    { symbol: 'CVX', name: 'Chevron Corporation' }, { symbol: 'MRK', name: 'Merck & Co. Inc.' },
    { symbol: 'ABBV', name: 'AbbVie Inc.' }, { symbol: 'KO', name: 'The Coca-Cola Company' },
    { symbol: 'BAC', name: 'Bank of America Corporation' }, { symbol: 'ORCL', name: 'Oracle Corporation' },
    { symbol: 'COST', name: 'Costco Wholesale Corporation' }, { symbol: 'MCD', name: "McDonald's Corporation" },
    { symbol: 'WMT', name: 'Walmart Inc.' }, { symbol: 'CSCO', name: 'Cisco Systems Inc.' },
    { symbol: 'ACN', name: 'Accenture plc' }, { symbol: 'INTC', name: 'Intel Corporation' },
    { symbol: 'NOW', name: 'ServiceNow Inc.' }, { symbol: 'INTU', name: 'Intuit Inc.' },
    { symbol: 'ADBE', name: 'Adobe Inc.' }, { symbol: 'QCOM', name: 'QUALCOMM Incorporated' },
    { symbol: 'PYPL', name: 'PayPal Holdings Inc.' }, { symbol: 'SHOP', name: 'Shopify Inc.' },
    { symbol: 'SQ', name: 'Block Inc.' }, { symbol: 'TWLO', name: 'Twilio Inc.' },
    { symbol: 'ZM', name: 'Zoom Video Communications' }, { symbol: 'OKTA', name: 'Okta Inc.' },
  ];

  const qUpper = q.toUpperCase();
  const local = KNOWN.filter(s =>
    s.symbol.startsWith(qUpper) || s.name.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 8);

  try {
    const url  = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0`;
    const data = await yfFetch(url, 60_000);
    const results = (data.quotes || [])
      .filter(r => r.quoteType === 'EQUITY' && r.symbol)
      .map(r => ({ symbol: r.symbol, name: r.shortname || r.longname || r.symbol }));
    res.json({ results: results.length ? results : local });
  } catch {
    res.json({ results: local });
  }
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

app.listen(PORT, () => {
  console.log(`📈  Market data server → http://localhost:${PORT}`);
  getSession()
    .then(() => console.log('✅  Yahoo Finance session ready'))
    .catch(e => console.warn('⚠️  Session warm-up failed (will retry on first request):', e.message));
});
