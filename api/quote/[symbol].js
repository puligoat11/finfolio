import { setCors, getLiveQuote, FINNHUB_KEY } from '../_lib.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sym = (req.query.symbol || '').toUpperCase();
  if (!sym) return res.status(400).json({ error: 'symbol required' });

  try {
    res.json(await getLiveQuote(sym));
  } catch {
    res.status(503).json({ error: 'Market data temporarily unavailable', symbol: sym, needsKey: !FINNHUB_KEY });
  }
}
