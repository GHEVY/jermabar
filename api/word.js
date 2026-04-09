// Vercel Serverless Function: GET /api/word?q=կракар
// Returns score for a single word
// Android & Web can call: https://your-app.vercel.app/api/word?q=կrak

import words from '../../words.json' assert { type: 'json' };

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const q = (req.query.q || '').toLowerCase().trim();

  if (!q) {
    return res.status(400).json({ error: 'Missing query param: q' });
  }

  if (Object.prototype.hasOwnProperty.call(words, q)) {
    return res.status(200).json({ word: q, score: words[q], found: true });
  }

  // Deterministic pseudo-random for unknown words (max 30%)
  let h = 0;
  for (let i = 0; i < q.length; i++) {
    h = (q.charCodeAt(i) + ((h << 5) - h)) | 0;
  }
  const score = parseFloat(((Math.abs(Math.sin(h)) * 28) + 0.5).toFixed(1));

  return res.status(200).json({ word: q, score, found: false });
}
