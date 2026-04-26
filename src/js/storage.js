const SESSION_KEY = 'wordglow:session_id';
const PROGRESS_KEY = 'wordglow:progress';
const LANG_KEY = 'wordglow:language';

export const Storage = {
  getSessionId() {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  },

  getLanguage() { return localStorage.getItem(LANG_KEY); },
  setLanguage(lang) { localStorage.setItem(LANG_KEY, lang); },

  saveProgress(p) { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); },
  getProgress() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || null; }
    catch { return null; }
  },

  clear() {
    localStorage.removeItem(PROGRESS_KEY);
    localStorage.removeItem(LANG_KEY);
  }
};
