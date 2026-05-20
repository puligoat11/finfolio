import { setCors, getLiveQuote, mockQuote, FINNHUB_KEY } from './_lib.js';

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
        quotes[sym] = await getLiveQuote(sym);
      } catch {
        if (!FINNHUB_KEY) quotes[sym] = mockQuote(sym);
      }
    })
  );

  res.json(quotes);
}
