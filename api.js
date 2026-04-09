/**
 * api.js — Ջermabarr Frontend API Client
 *
 * Automatically detects environment:
 *   - Production (Vercel): calls /api/words and /api/word
 *   - Local file (file://): falls back to words.json directly
 *
 * Android app should call:
 *   GET https://your-app.vercel.app/api/words          → full DB
 *   GET https://your-app.vercel.app/api/word?q=կракar  → single word
 */

const API_CONFIG = {
  // Auto-detect: use same origin in production, empty for local file://
  BASE_URL: (function () {
    const proto = window.location.protocol;
    if (proto === 'file:') return ''; // local — use words.json fallback
    return window.location.origin;    // e.g. https://jermabar.vercel.app
  })(),

  ENDPOINTS: {
    WORDS: '/api/words',       // GET → { word: score, ... }
    WORD:  '/api/word',        // GET ?q=<word> → { word, score, found }
  },

  TIMEOUT_MS: 5000,
};

// ── Internal state ────────────────────────────────────────────────────────────
let _wordDb = null;
let _useRemoteApi = false;

// ── Init ──────────────────────────────────────────────────────────────────────
/**
 * loadWords()
 * Call once on startup. Tries /api/words first, then falls back to words.json.
 */
async function loadWords() {
  if (_wordDb) return _wordDb;

  if (API_CONFIG.BASE_URL) {
    try {
      const db = await _fetchWithTimeout(API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.WORDS);
      if (db && typeof db === 'object' && Object.keys(db).length > 0) {
        _wordDb = db;
        _useRemoteApi = true;
        console.info('[API] Remote word list loaded:', Object.keys(db).length, 'words from', API_CONFIG.BASE_URL);
        return _wordDb;
      }
    } catch (err) {
      console.warn('[API] Remote /api/words failed, falling back to words.json:', err.message);
    }
  }

  // Fallback — local words.json
  try {
    const res = await fetch('words.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _wordDb = await res.json();
    _useRemoteApi = false;
    console.info('[API] Local words.json loaded:', Object.keys(_wordDb).length, 'words');
  } catch (err) {
    console.error('[API] Could not load words.json:', err.message);
    _wordDb = {};
  }

  return _wordDb;
}

// ── Score Lookup ──────────────────────────────────────────────────────────────
/**
 * getScore(word)
 * Returns { score: number, source: "db" | "api" | "random" }
 */
async function getScore(word) {
  const w = word.toLowerCase().trim();

  // 1. Already cached locally
  if (_wordDb && Object.prototype.hasOwnProperty.call(_wordDb, w)) {
    return { score: _wordDb[w], source: 'db' };
  }

  // 2. Ask /api/word for unknown word
  if (API_CONFIG.BASE_URL) {
    try {
      const url  = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.WORD}?q=${encodeURIComponent(w)}`;
      const data = await _fetchWithTimeout(url);
      if (data && typeof data.score === 'number') {
        if (_wordDb) _wordDb[w] = data.score; // cache it
        return { score: data.score, source: data.found ? 'api' : 'random' };
      }
    } catch (err) {
      console.warn('[API] /api/word lookup failed:', err.message);
    }
  }

  // 3. Deterministic pseudo-random fallback (max 30%)
  return { score: _pseudoRandom(w), source: 'random' };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function _fetchWithTimeout(url) {
  const ctrl = new AbortController();
  const id   = setTimeout(() => ctrl.abort(), API_CONFIG.TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(id);
  }
}

function _pseudoRandom(word) {
  let h = 0;
  for (let i = 0; i < word.length; i++) {
    h = (word.charCodeAt(i) + ((h << 5) - h)) | 0;
  }
  return parseFloat(((Math.abs(Math.sin(h)) * 28) + 0.5).toFixed(1));
}

// ── Public helpers ────────────────────────────────────────────────────────────
function isRemoteActive() { return _useRemoteApi; }
function getWordDb()      { return _wordDb || {}; }
