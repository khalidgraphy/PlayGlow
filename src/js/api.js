// Local dev: vite proxies /api -> http://localhost:8787 (see vite.config.js)
// Prod: hit the deployed Worker (CORS allows *.pages.dev)
const BASE = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  ? '/api'
  : 'https://wordglow-api.khalidgraphy.workers.dev/api';

export const API = {
  async getRound(altCount = 5) {
    const r = await fetch(`${BASE}/round?alts=${altCount}`);
    if (!r.ok) throw new Error('round fetch failed: ' + r.status);
    return r.json();
  },

  async getLetters(lang = 'en') {
    const r = await fetch(`${BASE}/letters?lang=${lang}`);
    if (!r.ok) throw new Error('letters fetch failed: ' + r.status);
    return r.json();
  },

  async getByLetter(letter, lang = 'en', limit = 3) {
    const r = await fetch(`${BASE}/by-letter?letter=${encodeURIComponent(letter)}&lang=${lang}&limit=${limit}`);
    if (!r.ok) throw new Error('by-letter fetch failed: ' + r.status);
    return r.json();
  },

  async health() {
    try { const r = await fetch(`${BASE}/health`); return r.ok ? r.json() : null; }
    catch { return null; }
  }
};
