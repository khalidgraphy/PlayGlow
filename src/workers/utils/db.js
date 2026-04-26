export async function getRandomWords(env, { language, difficulty = 1, limit = 6 }) {
  const lang = language === 'ar' ? 'word_ar' : language === 'ur' ? 'word_ur' : 'word_en';
  const stmt = env.DB.prepare(
    `SELECT id, ${lang} AS word, image_filename, emoji, category
     FROM words
     WHERE difficulty <= ?
     ORDER BY RANDOM()
     LIMIT ?`
  );
  const { results } = await stmt.bind(difficulty, limit).all();
  return results || [];
}

export async function getProgress(env, sessionId) {
  const row = await env.DB.prepare(
    `SELECT session_id, language_learning, words_completed, current_level, stars_earned, last_played
     FROM progress WHERE session_id = ?`
  ).bind(sessionId).first();
  if (!row) return null;
  return {
    ...row,
    words_completed: safeJSON(row.words_completed, [])
  };
}

export async function upsertProgress(env, sessionId, patch) {
  const existing = await getProgress(env, sessionId);
  const now = new Date().toISOString();

  if (!existing) {
    await env.DB.prepare(
      `INSERT INTO progress
         (session_id, language_learning, words_completed, current_level, stars_earned, last_played, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      sessionId,
      patch.language_learning ?? 'en',
      JSON.stringify(patch.words_completed ?? []),
      patch.current_level ?? 1,
      patch.stars_earned ?? 0,
      now, now
    ).run();
    return getProgress(env, sessionId);
  }

  const merged = {
    language_learning: patch.language_learning ?? existing.language_learning,
    words_completed: JSON.stringify(patch.words_completed ?? existing.words_completed),
    current_level: patch.current_level ?? existing.current_level,
    stars_earned: patch.stars_earned ?? existing.stars_earned
  };

  await env.DB.prepare(
    `UPDATE progress
       SET language_learning = ?, words_completed = ?, current_level = ?, stars_earned = ?,
           last_played = ?, updated_at = ?
     WHERE session_id = ?`
  ).bind(
    merged.language_learning, merged.words_completed,
    merged.current_level, merged.stars_earned,
    now, now, sessionId
  ).run();

  return getProgress(env, sessionId);
}

export async function logGameplay(env, row) {
  await env.DB.prepare(
    `INSERT INTO gameplay
       (session_id, level, language, word_id, was_correct, time_played_seconds, stars_earned)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    row.session_id, row.level ?? null, row.language ?? null,
    row.word_id ?? null, row.was_correct ? 1 : 0,
    row.time_played_seconds ?? null, row.stars_earned ?? null
  ).run();
}

function safeJSON(s, fallback) {
  try { return JSON.parse(s); } catch { return fallback; }
}
