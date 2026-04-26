import { json } from '../utils/cors.js';
import { getRandomWords } from '../utils/db.js';
import { getImageUrl, getFallbackTTS } from '../utils/r2.js';

export async function handleWords(request, env, url) {
  const language = (url.searchParams.get('language') || 'en').toLowerCase();
  const difficulty = clampInt(url.searchParams.get('difficulty'), 1, 5, 1);
  const limit = clampInt(url.searchParams.get('limit'), 2, 12, 6);

  if (!['en', 'ar', 'ur'].includes(language)) {
    return json({ error: 'invalid language' }, { status: 400 }, request);
  }

  const rows = await getRandomWords(env, { language, difficulty, limit });
  if (rows.length < limit) {
    return json({ error: 'not enough words seeded' }, { status: 500 }, request);
  }

  const tiles = rows.map(r => ({
    id: r.id,
    word: r.word,
    emoji: r.emoji,
    image_url: getImageUrl(r.image_filename),
    audio_url: getFallbackTTS(language, r.word)
  }));

  // Pick the target by ID, not index. Frontend re-shuffles tile order;
  // matching by id stays correct regardless of display order.
  const target = tiles[Math.floor(Math.random() * tiles.length)];

  return json({
    language,
    difficulty,
    target_id: target.id,
    target: { word: target.word, emoji: target.emoji, image_url: target.image_url, audio_url: target.audio_url },
    tiles
  }, {}, request);
}

function clampInt(v, min, max, dflt) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}
