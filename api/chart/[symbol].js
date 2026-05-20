import { setCors, getLiveChart } from '../_lib.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sym   = (req.query.symbol || '').toUpperCase();
  const range = req.query.range || '1y';
  if (!sym) return res.status(400).json({ error: 'symbol required' });

  try {
    res.json(await getLiveChart(sym, range));
  } catch {
    res.json({ dates: [], prices: [], volumes: [], opens: [], highs: [], lows: [] });
  }
}
