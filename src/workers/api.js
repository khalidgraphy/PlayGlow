import { preflight, json } from './utils/cors.js';
import { handleWords } from './handlers/words.js';
import { handleRound } from './handlers/round.js';
import { handleByLetter, handleLetters } from './handlers/explore.js';
import { handleGetProgress, handlePostProgress } from './handlers/progress.js';
import { handleRequestOtp, handleVerifyOtp, handleMe, handleLogout } from './handlers/auth.js';

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
      if (path === '/api/round' && request.method === 'GET') {
        return handleRound(request, env, url);
      }
      if (path === '/api/by-letter' && request.method === 'GET') {
        return handleByLetter(request, env, url);
      }
      if (path === '/api/letters' && request.method === 'GET') {
        return handleLetters(request, env, url);
      }
      if (path === '/api/progress' && request.method === 'GET') {
        return handleGetProgress(request, env, url);
      }
      if (path === '/api/progress' && request.method === 'POST') {
        return handlePostProgress(request, env);
      }
      if (path === '/api/auth/request-otp' && request.method === 'POST') {
        return handleRequestOtp(request, env);
      }
      if (path === '/api/auth/verify-otp' && request.method === 'POST') {
        return handleVerifyOtp(request, env);
      }
      if (path === '/api/auth/me' && request.method === 'GET') {
        return handleMe(request, env);
      }
      if (path === '/api/auth/logout' && request.method === 'POST') {
        return handleLogout(request, env);
      }
      return json({ error: 'not found', path }, { status: 404 }, request);
    } catch (err) {
      console.error('api error', err);
      return json({ error: 'internal', message: err.message }, { status: 500 }, request);
    }
  }
};
