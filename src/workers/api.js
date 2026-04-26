import { preflight, json } from './utils/cors.js';
import { handleWords } from './handlers/words.js';
import { handleGetProgress, handlePostProgress } from './handlers/progress.js';

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return preflight(request);

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/api/health') {
        return json({ ok: true, env: env.ENV ?? 'unknown' }, {}, request);
      }
      if (path === '/api/words' && request.method === 'GET') {
        return handleWords(request, env, url);
      }
      if (path === '/api/progress' && request.method === 'GET') {
        return handleGetProgress(request, env, url);
      }
      if (path === '/api/progress' && request.method === 'POST') {
        return handlePostProgress(request, env);
      }
      return json({ error: 'not found', path }, { status: 404 }, request);
    } catch (err) {
      console.error('api error', err);
      return json({ error: 'internal', message: err.message }, { status: 500 }, request);
    }
  }
};
