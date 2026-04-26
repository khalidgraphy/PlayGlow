const SESSION_KEY = 'wordglow:session_id';
const LANG_KEY = 'wordglow:language';
const STARS_KEY = 'wordglow:stars';        // lifetime, never decreases
const SCORES_KEY = 'wordglow:scores';      // per-level: { "1": {high, last}, ... }
const LEVEL_KEY = 'wordglow:last_level';

// Profiles — multi-profile-ready schema even though Phase 1 ships single profile.
// Phase 2 will reuse this shape to add a picker + per-profile progress.
const PROFILES_KEY = 'playglow:profiles';      // array of { id, name, age, gender, avatar, createdAt }
const ACTIVE_KEY   = 'playglow:activeProfile'; // id of currently active profile

export const Storage = {
  getSessionId() {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  },

  getLanguage() { return localStorage.getItem(LANG_KEY) || 'en'; },
  setLanguage(lang) { localStorage.setItem(LANG_KEY, lang); },

  getLastLevel() { return parseInt(localStorage.getItem(LEVEL_KEY) || '1', 10); },
  setLastLevel(n) { localStorage.setItem(LEVEL_KEY, String(n)); },

  getStars() { return parseInt(localStorage.getItem(STARS_KEY) || '0', 10); },
  addStars(n) {
    const next = Math.max(0, this.getStars() + n);
    localStorage.setItem(STARS_KEY, String(next));
    return next;
  },

  getScores() {
    try { return JSON.parse(localStorage.getItem(SCORES_KEY) || '{}'); }
    catch { return {}; }
  },
  setLevelScore(level, score) {
    const all = this.getScores();
    const cur = all[level] || { high: 0, last: 0 };
    all[level] = { high: Math.max(cur.high, score), last: score };
    localStorage.setItem(SCORES_KEY, JSON.stringify(all));
    return all[level];
  },

  // ---- Profile (Phase 1: single profile; schema is multi-ready) ----
  getProfiles() {
    try { return JSON.parse(localStorage.getItem(PROFILES_KEY) || '[]'); }
    catch { return []; }
  },
  getActiveProfile() {
    const all = this.getProfiles();
    if (!all.length) return null;
    const id = localStorage.getItem(ACTIVE_KEY);
    return all.find(p => p.id === id) || all[0];
  },
  saveProfile({ name, age, gender, avatar }) {
    const all = this.getProfiles();
    const id = 'p_' + Date.now().toString(36);
    const p = { id, name, age, gender: gender || '', avatar, createdAt: new Date().toISOString() };
    all.push(p);
    localStorage.setItem(PROFILES_KEY, JSON.stringify(all));
    localStorage.setItem(ACTIVE_KEY, id);
    return p;
  },

  clear() {
    [LANG_KEY, STARS_KEY, SCORES_KEY, LEVEL_KEY].forEach(k => localStorage.removeItem(k));
  }
};
