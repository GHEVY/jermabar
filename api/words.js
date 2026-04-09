// Vercel Serverless Function: GET /api/words
// Returns the full word database as JSON
// Android & Web can call: https://your-app.vercel.app/api/words

import words from '../../words.json' assert { type: 'json' };

export default function handler(req, res) {
  // Allow CORS for Android and any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate'); // cache 24h on CDN

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json(words);
}
