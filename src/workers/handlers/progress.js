import { json } from '../utils/cors.js';
import { getProgress, upsertProgress, logGameplay } from '../utils/db.js';

export async function handleGetProgress(request, env, url) {
  const sessionId = url.searchParams.get('session_id');
  if (!sessionId) return json({ error: 'session_id required' }, { status: 400 }, request);

  const p = await getProgress(env, sessionId);
  return json(p ?? { session_id: sessionId, current_level: 1, stars_earned: 0, language_learning: 'en', words_completed: [] }, {}, request);
}

export async function handlePostProgress(request, env) {
  const body = await readJSON(request);
  if (!body?.session_id) return json({ error: 'session_id required' }, { status: 400 }, request);

  const updated = await upsertProgress(env, body.session_id, {
    language_learning: body.language,
    current_level: body.current_level,
    stars_earned: body.stars_earned,
    words_completed: body.words_completed
  });

  if (body.gameplay) {
    await logGameplay(env, { session_id: body.session_id, ...body.gameplay });
  }

  return json({ success: true, progress: updated }, {}, request);
}

async function readJSON(request) {
  try { return await request.json(); } catch { return null; }
}
