import { setCors, yfFetch, KNOWN_SYMBOLS } from './_lib.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const q = (req.query.q || '').trim();
  if (!q) return res.json({ results: [] });

  const qUpper = q.toUpperCase();
  const local = KNOWN_SYMBOLS.filter(
    (s) => s.symbol.startsWith(qUpper) || s.name.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 8);

  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0`;
    const data = await yfFetch(url, 60_000);
    const results = (data.quotes ?? [])
      .filter((r) => r.quoteType === 'EQUITY' && r.symbol)
      .map((r) => ({ symbol: r.symbol, name: r.shortname || r.longname || r.symbol }));
    res.json({ results: results.length ? results : local });
  } catch {
    res.json({ results: local });
  }
}
