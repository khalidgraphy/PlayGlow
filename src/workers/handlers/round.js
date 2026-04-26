import { json } from '../utils/cors.js';
import { getRandomRound } from '../utils/db.js';

export async function handleRound(request, env, url) {
  const altCount = clampInt(url.searchParams.get('alts'), 3, 8, 5);

  try {
    const { target, alts } = await getRandomRound(env, { altCount });
    return json({
      target: shape(target),
      alts: alts.map(shape)
    }, {}, request);
  } catch (err) {
    return json({ error: err.message }, { status: 500 }, request);
  }
}

function shape(row) {
  return {
    id: row.id,
    en: row.word_en,
    ar: row.word_ar,
    ur: row.word_ur,
    emoji: row.emoji,
    category: row.category
  };
}

function clampInt(v, min, max, dflt) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}
