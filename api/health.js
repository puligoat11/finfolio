import { setCors, FINNHUB_KEY } from './_lib.js';

export default function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.json({ status: 'ok', ts: Date.now(), dataSource: FINNHUB_KEY ? 'finnhub-live' : 'yahoo-with-mock-fallback' });
}
