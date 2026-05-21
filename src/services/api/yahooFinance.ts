// All market data flows through the local proxy server (/api → localhost:3001)
// This avoids CORS issues and keeps any future API keys server-side.

import type { StockQuote, ChartDataPoint, AnalystRating, NewsItem } from '@/types/models';

const CACHE_TTL = 60_000;
const cache = new Map<string, { data: unknown; ts: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data as T;
  return null;
}
function setCached(key: string, data: unknown, ttl = CACHE_TTL): void {
  cache.set(key, { data, ts: Date.now() - (CACHE_TTL - ttl) });
}

export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  const sym = symbol.toUpperCase();
  const cached = getCached<StockQuote>(`q:${sym}`);
  if (cached) return cached;

  try {
    const res = await fetch(`/api/quote/${sym}`);
    if (!res.ok) return null;
    const data = await res.json();
    setCached(`q:${sym}`, data);
    return data as StockQuote;
  } catch {
    return null;
  }
}

export async function getMultipleQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
  const result = new Map<string, StockQuote>();
  const toFetch: string[] = [];

  symbols.forEach(s => {
    const sym = s.toUpperCase();
    const cached = getCached<StockQuote>(`q:${sym}`);
    if (cached) result.set(sym, cached);
    else toFetch.push(sym);
  });

  if (toFetch.length === 0) return result;

  try {
    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols: toFetch }),
    });
    if (!res.ok) return result;
    const data: Record<string, StockQuote> = await res.json();
    Object.entries(data).forEach(([sym, q]) => {
      result.set(sym, q);
      setCached(`q:${sym}`, q);
    });
  } catch {
    /* return partial results */
  }

  return result;
}

export async function getChartData(
  symbol: string,
  range: '1d' | '5d' | '1mo' | '3mo' | '6mo' | 'ytd' | '1y' | '2y' | '5y' | 'max' = '1y',
  interval?: string
): Promise<ChartDataPoint[]> {
  const sym = symbol.toUpperCase();
  const iv = interval || defaultInterval(range);
  const cacheKey = `chart:${sym}:${range}:${iv}`;
  const cached = getCached<ChartDataPoint[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`/api/chart/${sym}?range=${range}&interval=${iv}`);
    if (!res.ok) return [];
    const raw = await res.json();

    const points: ChartDataPoint[] = (raw.dates as string[])
      .map((d, i) => ({
        date: d.includes('T') ? new Date(d) : new Date(d + 'T16:00:00'),
        value: raw.prices[i] as number,
        open:   raw.opens?.[i],
        high:   raw.highs?.[i],
        low:    raw.lows?.[i],
        close:  raw.prices[i],
        volume: raw.volumes?.[i],
      }))
      .filter(p => p.value > 0);

    setCached(cacheKey, points, range === '1d' ? 30_000 : CACHE_TTL * 5);
    return points;
  } catch {
    return [];
  }
}

function defaultInterval(range: string): string {
  const map: Record<string, string> = {
    '1d': '5m', '5d': '15m', '1mo': '1d', '3mo': '1d',
    '6mo': '1d', 'ytd': '1d', '1y': '1d', '2y': '1wk',
    '5y': '1wk', 'max': '1mo',
  };
  return map[range] ?? '1d';
}

export async function searchStocks(query: string): Promise<StockQuote[]> {
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((r: { symbol: string; name: string }) => ({
      symbol: r.symbol,
      name: r.name,
      price: 0,
      change: 0,
      changePercent: 0,
    }));
  } catch {
    return [];
  }
}

export function clearQuoteCache(): void {
  cache.clear();
}

export function isMarketOpen(): boolean {
  const now = new Date();
  const day = now.getDay();
  if (day === 0 || day === 6) return false;
  const utcH = now.getUTCHours() + now.getUTCMinutes() / 60;
  const etH = (utcH - 4 + 24) % 24; // EDT offset (adjust for EST in winter)
  return etH >= 9.5 && etH < 16;
}

// Aliases kept for backward compatibility with existing stores
export const getQuote = getStockQuote;

// Stub — analyst ratings not supported by free Yahoo Finance proxy
export async function getAnalystRatings(_symbol: string): Promise<AnalystRating | null> {
  return null;
}

// Stub — news not supported by free Yahoo Finance proxy
export async function getStockNews(_symbol: string): Promise<NewsItem[]> {
  return [];
}

export async function getStockDetails(symbol: string) {
  const quote = await getStockQuote(symbol);
  return { quote, ratings: null, news: [] };
}
