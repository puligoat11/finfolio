import { setCors, yfFetch, parseQuoteMeta, mockQuote } from '../_lib.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sym = (req.query.symbol || '').toUpperCase();
  if (!sym) return res.status(400).json({ error: 'symbol required' });

  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`;
    const data = await yfFetch(url, 30_000);
    const result = data.chart?.result?.[0];
    if (!result) return res.json(mockQuote(sym));
    res.json(parseQuoteMeta(result.meta, sym));
  } catch {
    res.json(mockQuote(sym));
  }
}
