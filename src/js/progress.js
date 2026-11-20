// Per-profile progress that keeps the app feeling new:
//   - Sticker Book: every photo word a kid gets right becomes a sticker.
//   - Word decks: shuffled no-repeat decks, so a word only comes back once
//     every other word in that deck has been seen.
//   - Daily state: Today's Surprise + Daily Mix, reset each local calendar day.
// Everything lives in localStorage (same as stars), keyed by the active profile
// so Phase 2 multi-profile gets separate books for free.

import { Storage } from './storage.js';
import { STICKER_WORDS, STICKER_BY_SLUG } from './stickerWords.js';

function pid() {
  return Storage.getActiveProfile()?.id || 'anon';
}
function readJSON(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || 'null');
    return v ?? fallback;
  } catch { return fallback; }
}
function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full/blocked */ }
}

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function slugOf(word) {
  return String(word || '').toLowerCase().replace(/[^a-z]/g, '');
}

// ---------------- Stickers ----------------
const stickerKey = () => `playglow:stickers:${pid()}`;

export const Stickers = {
  // { slug: firstCollectedISO }
  all() { return readJSON(stickerKey(), {}); },
  has(slug) { return !!this.all()[slug]; },
  count() { return Object.keys(this.all()).filter(s => STICKER_BY_SLUG.has(s)).length; },
  total() { return STICKER_WORDS.length; },

  // Returns the sticker word if it is NEW for this kid, else null.
  collect(wordOrSlug) {
    const slug = slugOf(typeof wordOrSlug === 'string' ? wordOrSlug : wordOrSlug?.en);
    const w = STICKER_BY_SLUG.get(slug);
    if (!w) return null;
    const all = this.all();
    if (all[slug]) return null;
    all[slug] = new Date().toISOString();
    writeJSON(stickerKey(), all);
    return w;
  },

  // A random sticker the kid does not have yet (for daily bonuses). null if complete.
  randomMissing() {
    const have = this.all();
    const missing = STICKER_WORDS.filter(w => !have[w.slug]);
    return missing.length ? missing[Math.floor(Math.random() * missing.length)] : null;
  }
};

// ---------------- No-repeat decks ----------------
// A deck is the list of item keys still to deal. When empty it reshuffles,
// making sure the first card of the new deck is not the one just dealt.
const deckKey = (name) => `playglow:deck:${pid()}:${name}`;

export function drawFromDeck(name, keys) {
  const valid = new Set(keys);
  let st = readJSON(deckKey(name), null);
  let left = Array.isArray(st?.left) ? st.left.filter(k => valid.has(k)) : [];
  const last = st?.last;
  if (!left.length) {
    left = shuffled(keys);
    if (left.length > 1 && left[left.length - 1] === last) {
      [left[0], left[left.length - 1]] = [left[left.length - 1], left[0]];
    }
  }
  const next = left.pop();
  writeJSON(deckKey(name), { left, last: next });
  return next;
}

// Local round builder for the engine word activities (replaces the old
// /api/round random pick, which repeated words within a session).
// Shape matches the old API: { target: {id,en,ar,ur,emoji,category}, alts: [...] }
export function buildRound(altCount = 5) {
  const slug = drawFromDeck('words', STICKER_WORDS.map(w => w.slug));
  const target = STICKER_BY_SLUG.get(slug);
  const alts = [];
  const seen = { en: new Set([target.en]), ur: new Set([target.ur]), ar: new Set([target.ar]), emoji: new Set([target.emoji]) };
  for (const w of shuffled(STICKER_WORDS)) {
    if (alts.length >= altCount) break;
    // Every option must look and read different from the others in all languages.
    if (seen.en.has(w.en) || seen.ur.has(w.ur) || seen.ar.has(w.ar) || seen.emoji.has(w.emoji)) continue;
    ['en', 'ur', 'ar', 'emoji'].forEach(k => seen[k].add(w[k]));
    alts.push(w);
  }
  const shape = (w) => ({ id: w.id, en: w.en, ar: w.ar, ur: w.ur, emoji: w.emoji, category: w.cat });
  return { target: shape(target), alts: alts.map(shape) };
}

// ---------------- Daily (Today's Surprise + Daily Mix) ----------------
export function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
// Small stable hash so the daily picks are fixed for the whole day.
export function daySeed(extra = '') {
  const s = todayKey() + '|' + pid() + '|' + extra;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const dailyKey = () => `playglow:daily:${pid()}`;
export const Daily = {
  get() {
    const st = readJSON(dailyKey(), {});
    // New day: start fresh, but remember yesterday's surprise so it isn't repeated.
    if (st.date !== todayKey()) return { date: todayKey(), prevSurpriseId: st.surpriseId ?? st.prevSurpriseId ?? null };
    return st;
  },
  set(patch) {
    const st = { ...this.get(), ...patch, date: todayKey() };
    writeJSON(dailyKey(), st);
    return st;
  }
};
