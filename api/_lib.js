// Shared utilities for Vercel serverless API functions.
// Module-level state persists across warm invocations of the same function instance.

export const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

export const FINNHUB_KEY = process.env.FINNHUB_API_KEY || '';

// ── In-memory cache ──────────────────────────────────────────────────────────
const cache = new Map();
function cached(key, ttl) {
  const hit = cache.get(key);
  return hit && Date.now() - hit.ts < ttl ? hit.data : null;
}
function setCache(key, data) { cache.set(key, { data, ts: Date.now() }); }

// ── Finnhub ───────────────────────────────────────────────────────────────────
export async function finnhubGet(path, ttl = 60_000) {
  if (!FINNHUB_KEY) throw new Error('no_key');
  const url = `https://finnhub.io/api/v1${path}`;
  const hit = cached(url, ttl);
  if (hit) return hit;
  const res = await fetch(url, { headers: { 'X-Finnhub-Token': FINNHUB_KEY, 'User-Agent': UA } });
  if (res.status === 429) throw new Error('rate_limit');
  if (!res.ok) throw new Error(`http_${res.status}`);
  const data = await res.json();
  setCache(url, data);
  return data;
}

export function fhToQuote(sym, d) {
  if (!d.c || d.c === 0) throw new Error('empty_quote');
  const price = d.c, prev = d.pc || price;
  return {
    symbol: sym.toUpperCase(), name: sym, price,
    change: d.d ?? (price - prev),
    changePercent: d.dp ?? 0,
    previousClose: prev, open: d.o, high: d.h, low: d.l,
    timestamp: Date.now(),
  };
}

// ── Yahoo Finance session ─────────────────────────────────────────────────────
let session = null, sessionPromise = null;

async function refreshSession() {
  const homeRes = await fetch('https://finance.yahoo.com', {
    headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow',
  });
  const cookies = (homeRes.headers.getSetCookie?.() ?? []).map(c => c.split(';')[0]).join('; ');
  const crumbRes = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': UA, Cookie: cookies, Accept: '*/*' },
  });
  const crumb = crumbRes.ok ? (await crumbRes.text()).trim() : '';
  session = { cookies, crumb };
  setTimeout(() => { session = null; sessionPromise = null; }, 25 * 60 * 1000);
  return session;
}

function getYfSession() {
  if (session) return Promise.resolve(session);
  if (!sessionPromise) sessionPromise = refreshSession().catch(e => { sessionPromise = null; throw e; });
  return sessionPromise;
}

export async function yfFetch(url, ttl = 60_000) {
  const hit = cached(url, ttl);
  if (hit) return hit;
  const { cookies, crumb } = await getYfSession();
  const fullUrl = crumb ? `${url}${url.includes('?') ? '&' : '?'}crumb=${encodeURIComponent(crumb)}` : url;
  const res = await fetch(fullUrl, {
    headers: { 'User-Agent': UA, Cookie: cookies, Accept: 'application/json' },
  });
  if (res.status === 401 || res.status === 403) { session = null; sessionPromise = null; throw new Error(`auth_${res.status}`); }
  if (res.status === 429) throw new Error('rate_limit');
  if (!res.ok) throw new Error(`http_${res.status}`);
  const data = await res.json();
  setCache(url, data);
  return data;
}

export function parseQuoteMeta(meta, symbol) {
  const price = meta.regularMarketPrice ?? 0;
  const prev  = meta.regularMarketPreviousClose ?? price;
  return {
    symbol:           (meta.symbol || symbol).toUpperCase(),
    name:             meta.longName || meta.shortName || symbol,
    price, change: price - prev,
    changePercent:    meta.regularMarketChangePercent ?? (prev > 0 ? ((price - prev) / prev) * 100 : 0),
    previousClose:    prev, open: meta.regularMarketOpen,
    high:             meta.regularMarketDayHigh, low: meta.regularMarketDayLow,
    volume:           meta.regularMarketVolume, marketCap: meta.marketCap,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh, fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
    peRatio:          meta.trailingPE, timestamp: Date.now(),
  };
}

// ── Mock fallback (only used when no API key is set) ──────────────────────────
export const MOCK_PRICES = {
  AAPL:195.7, MSFT:378.8, GOOGL:175.9, NVDA:870.4, AMZN:185.5,
  TSLA:177.9, META:490.3, V:278.1,     SPY:527.2,  QQQ:450.8,
  AMD:159.2,  CRM:299.4,  NFLX:620.5,  PLTR:22.4,  SNOW:138.7,
  COIN:231.1, UBER:80.4,  DIS:112.5,   JPM:198.3,  BAC:38.4,
};

export function mockQuote(symbol) {
  const price = MOCK_PRICES[symbol.toUpperCase()] ?? 100 + Math.random() * 200;
  const changePct = Math.random() * 4 - 2;
  const change = (price * changePct) / 100;
  return { symbol, name: symbol, price, change, changePercent: changePct,
    previousClose: price - change, volume: Math.floor(Math.random() * 50_000_000),
    marketCap: price * 1_000_000_000, timestamp: Date.now() };
}

export function mockChart(symbol, range) {
  const basePrice = MOCK_PRICES[symbol.toUpperCase()] ?? 150;
  const days = { '5d':5,'1mo':22,'3mo':66,'6mo':132,'ytd':140,'1y':252 }[range] ?? 500;
  let price = basePrice * 0.75;
  const now = Date.now(), dayMs = 86_400_000;
  const dates = [], prices = [], volumes = [];
  for (let i = days; i >= 0; i--) {
    const d = new Date(now - i * dayMs);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    price *= 1 + (Math.random() * 0.04 - 0.018);
    dates.push(d.toISOString().split('T')[0]);
    prices.push(Math.round(price * 100) / 100);
    volumes.push(Math.floor(Math.random() * 30_000_000 + 5_000_000));
  }
  return { dates, prices, volumes, opens: prices, highs: prices.map(p => p * 1.01), lows: prices.map(p => p * 0.99) };
}

// ── Date/interval helpers ─────────────────────────────────────────────────────
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

export const YF_INTERVAL   = { '1d':'5m','5d':'15m','1mo':'1d','3mo':'1d','6mo':'1d','ytd':'1d','1y':'1d','2y':'1wk','5y':'1wk','max':'1mo' };
export const FH_RESOLUTION = { '1d':'D','5d':'D','1mo':'D','3mo':'D','6mo':'D','ytd':'D','1y':'D','2y':'W','5y':'W','max':'M' };

// ── Unified quote/chart (Finnhub → Yahoo → mock) ─────────────────────────────
export async function getLiveQuote(sym) {
  try {
    const d = await finnhubGet(`/quote?symbol=${sym}`, 30_000);
    return fhToQuote(sym, d);
  } catch (e) { if (e.message !== 'no_key') console.warn(`[fh/q/${sym}]`, e.message); }

  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`;
    const data = await yfFetch(url, 30_000);
    const result = data.chart?.result?.[0];
    if (result) return parseQuoteMeta(result.meta, sym);
  } catch (e) { console.warn(`[yf/q/${sym}]`, e.message); }

  if (FINNHUB_KEY) throw new Error('no_live_data');
  return mockQuote(sym);
}

export async function getLiveChart(sym, range) {
  const interval = YF_INTERVAL[range] || '1d';
  const ttl = range === '1d' ? 30_000 : 5 * 60_000;

  // Yahoo Finance chart works without auth for historical data — try this first
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=${interval}&range=${range}`;
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      const result = data.chart?.result?.[0];
      if (result?.timestamp) {
        const q = result.indicators?.quote?.[0] || {};
        const valid = result.timestamp.map((t, i) => ({
          date: new Date(t * 1000).toISOString().split('T')[0],
          price: q.close?.[i], volume: q.volume?.[i] ?? 0,
          open: q.open?.[i], high: q.high?.[i], low: q.low?.[i],
        })).filter(p => p.price != null && p.price > 0);
        if (valid.length) return {
          dates: valid.map(p => p.date), prices: valid.map(p => p.price),
          volumes: valid.map(p => p.volume), opens: valid.map(p => p.open ?? p.price),
          highs: valid.map(p => p.high ?? p.price), lows: valid.map(p => p.low ?? p.price),
        };
      }
    }
  } catch (e) { console.warn(`[yf-noauth/chart/${sym}]`, e.message); }

  // Fallback: Yahoo Finance with crumb session
  try {
    const from = Math.floor(getStartDate(range).getTime() / 1000);
    const to   = Math.floor(Date.now() / 1000);
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${sym}?interval=${interval}&period1=${from}&period2=${to}`;
    const data = await yfFetch(url, ttl);
    const result = data.chart?.result?.[0];
    if (result?.timestamp) {
      const q = result.indicators?.quote?.[0] || {};
      const valid = result.timestamp.map((t, i) => ({
        date: new Date(t * 1000).toISOString().split('T')[0],
        price: q.close?.[i], volume: q.volume?.[i] ?? 0,
        open: q.open?.[i], high: q.high?.[i], low: q.low?.[i],
      })).filter(p => p.price != null && p.price > 0);
      if (valid.length) return {
        dates: valid.map(p => p.date), prices: valid.map(p => p.price),
        volumes: valid.map(p => p.volume), opens: valid.map(p => p.open ?? p.price),
        highs: valid.map(p => p.high ?? p.price), lows: valid.map(p => p.low ?? p.price),
      };
    }
  } catch (e) { console.warn(`[yf/chart/${sym}]`, e.message); }

  if (FINNHUB_KEY) return { dates: [], prices: [], volumes: [], opens: [], highs: [], lows: [] };
  return mockChart(sym, range);
}

// ── CORS ──────────────────────────────────────────────────────────────────────
export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ── Known symbols for local search fallback ───────────────────────────────────
export const KNOWN_SYMBOLS = [
  { symbol:'AAPL', name:'Apple Inc.' },        { symbol:'MSFT', name:'Microsoft Corporation' },
  { symbol:'GOOGL',name:'Alphabet Inc.' },      { symbol:'NVDA', name:'NVIDIA Corporation' },
  { symbol:'AMZN', name:'Amazon.com Inc.' },    { symbol:'TSLA', name:'Tesla, Inc.' },
  { symbol:'META', name:'Meta Platforms Inc.' },{ symbol:'V',    name:'Visa Inc.' },
  { symbol:'AMD',  name:'Advanced Micro Devices' },{ symbol:'CRM', name:'Salesforce Inc.' },
  { symbol:'NFLX', name:'Netflix Inc.' },       { symbol:'PLTR', name:'Palantir Technologies' },
  { symbol:'SNOW', name:'Snowflake Inc.' },     { symbol:'COIN', name:'Coinbase Global' },
  { symbol:'UBER', name:'Uber Technologies' },  { symbol:'DIS',  name:'Walt Disney Co.' },
  { symbol:'JPM',  name:'JPMorgan Chase & Co.' },{ symbol:'BAC', name:'Bank of America' },
  { symbol:'LLY',  name:'Eli Lilly and Company' },{ symbol:'UNH', name:'UnitedHealth Group' },
  { symbol:'JNJ',  name:'Johnson & Johnson' },  { symbol:'XOM',  name:'Exxon Mobil' },
  { symbol:'AVGO', name:'Broadcom Inc.' },      { symbol:'PG',   name:'Procter & Gamble' },
  { symbol:'MA',   name:'Mastercard Inc.' },    { symbol:'HD',   name:'The Home Depot Inc.' },
  { symbol:'ORCL', name:'Oracle Corporation' }, { symbol:'ADBE', name:'Adobe Inc.' },
  { symbol:'QCOM', name:'QUALCOMM Inc.' },      { symbol:'PYPL', name:'PayPal Holdings' },
  { symbol:'SHOP', name:'Shopify Inc.' },       { symbol:'SQ',   name:'Block Inc.' },
  { symbol:'SPY',  name:'SPDR S&P 500 ETF' },  { symbol:'QQQ',  name:'Invesco QQQ Trust' },
];
