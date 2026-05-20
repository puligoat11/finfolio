import { setCors, yfFetch, parseQuoteMeta, mockQuote } from './_lib.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { symbols = [] } = req.body ?? {};
  if (!Array.isArray(symbols)) return res.status(400).json({ error: 'symbols must be an array' });

  const quotes = {};
  await Promise.allSettled(
    symbols.map(async (s) => {
      const sym = s.toUpperCase();
      try {
        const url = `https://query2.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`;
        const data = await yfFetch(url, 30_000);
        const result = data.chart?.result?.[0];
        quotes[sym] = result ? parseQuoteMeta(result.meta, sym) : mockQuote(sym);
      } catch {
        quotes[sym] = mockQuote(sym);
      }
    })
  );

  res.json(quotes);
}
