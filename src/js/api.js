const BASE = '/api';

export const API = {
  async getWords({ language, difficulty = 1, limit = 6 }) {
    const r = await fetch(`${BASE}/words?language=${language}&difficulty=${difficulty}&limit=${limit}`);
    if (!r.ok) throw new Error('words fetch failed: ' + r.status);
    return r.json();
  },

  async getProgress(sessionId) {
    const r = await fetch(`${BASE}/progress?session_id=${encodeURIComponent(sessionId)}`);
    if (!r.ok) throw new Error('progress fetch failed: ' + r.status);
    return r.json();
  },

  async saveProgress(sessionId, data) {
    const r = await fetch(`${BASE}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, ...data })
    });
    if (!r.ok) throw new Error('progress save failed: ' + r.status);
    return r.json();
  },

  async health() {
    const r = await fetch(`${BASE}/health`);
    return r.ok ? r.json() : null;
  }
};
