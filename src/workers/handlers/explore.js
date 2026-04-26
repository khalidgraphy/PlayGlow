import { json } from '../utils/cors.js';
import { getWordsByLetter, getAvailableLetters } from '../utils/db.js';

export async function handleByLetter(request, env, url) {
  const letter = url.searchParams.get('letter');
  const lang = (url.searchParams.get('lang') || 'en').toLowerCase();
  const limit = clampInt(url.searchParams.get('limit'), 1, 10, 3);

  if (!letter) return json({ error: 'letter required' }, { status: 400 }, request);
  if (!['en', 'ar', 'ur'].includes(lang)) {
    return json({ error: 'invalid lang' }, { status: 400 }, request);
  }

  const rows = await getWordsByLetter(env, { letter, lang, limit });
  return json({
    letter, lang, count: rows.length,
    words: rows.map(r => ({
      id: r.id, en: r.word_en, ar: r.word_ar, ur: r.word_ur,
      emoji: r.emoji, category: r.category
    }))
  }, {}, request);
}

export async function handleLetters(request, env, url) {
  const lang = (url.searchParams.get('lang') || 'en').toLowerCase();
  if (!['en', 'ar', 'ur'].includes(lang)) {
    return json({ error: 'invalid lang' }, { status: 400 }, request);
  }
  const rows = await getAvailableLetters(env, { lang });
  return json({ lang, letters: rows }, {}, request);
}

function clampInt(v, min, max, dflt) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}
