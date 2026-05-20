import { setCors, yfFetch, mockChart, getStartDate, defaultInterval } from '../_lib.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sym      = (req.query.symbol || '').toUpperCase();
  const range    = req.query.range    || '1y';
  const interval = req.query.interval || defaultInterval(range);
  const period1  = Math.floor(getStartDate(range).getTime() / 1000);
  const period2  = Math.floor(Date.now() / 1000);

  if (!sym) return res.status(400).json({ error: 'symbol required' });

  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${sym}?interval=${interval}&period1=${period1}&period2=${period2}`;
    const data = await yfFetch(url, range === '1d' ? 30_000 : 5 * 60_000);

    const result = data.chart?.result?.[0];
    if (!result?.timestamp) return res.json(mockChart(sym, range));

    const ts = result.timestamp;
    const q  = result.indicators?.quote?.[0] ?? {};

    const valid = ts
      .map((t, i) => ({
        date:   new Date(t * 1000).toISOString().split('T')[0],
        price:  q.close?.[i],
        volume: q.volume?.[i] ?? 0,
        open:   q.open?.[i],
        high:   q.high?.[i],
        low:    q.low?.[i],
      }))
      .filter((p) => p.price != null && p.price > 0);

    if (!valid.length) return res.json(mockChart(sym, range));

    res.json({
      dates:   valid.map((p) => p.date),
      prices:  valid.map((p) => p.price),
      volumes: valid.map((p) => p.volume),
      opens:   valid.map((p) => p.open  ?? p.price),
      highs:   valid.map((p) => p.high  ?? p.price),
      lows:    valid.map((p) => p.low   ?? p.price),
    });
  } catch {
    res.json(mockChart(sym, range));
  }
}
