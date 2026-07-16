// auth.js — parent email OTP login (Phase 1).
// Bearer-token sessions (no cookies): cross-site pages.dev <-> workers.dev would
// make a session cookie a third-party cookie that iOS Safari blocks. The raw
// token is returned to the client, stored in localStorage, and sent back as
// Authorization: Bearer on protected calls.

import { json } from '../utils/cors.js';
import { sendGmail } from '../utils/gmail.js';

const OTP_TTL_SEC       = 10 * 60;        // code valid for 10 minutes
const OTP_COOLDOWN_SEC  = 45;             // min gap between code requests per email
const OTP_MAX_PER_HOUR  = 5;              // request cap per email per hour
const OTP_MAX_ATTEMPTS  = 5;              // verify attempts before a code is burned
const SESSION_TTL_SEC   = 90 * 24 * 60 * 60; // 90-day rolling session

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function now() { return Math.floor(Date.now() / 1000); }

async function sha256hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

function sixDigitCode() {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1000000).padStart(6, '0');
}

function normEmail(e) { return String(e || '').trim().toLowerCase(); }

function getBearer(request) {
  const h = request.headers.get('Authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

async function readJson(request) {
  try { return await request.json(); } catch { return {}; }
}

function otpEmail(code) {
  const subject = `Your PlayGlow code: ${code}`;
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:460px;margin:0 auto;padding:24px;color:#1f2430">
    <div style="font-size:30px;font-weight:800;color:#6b3fd4">PlayGlow</div>
    <p style="font-size:16px;margin:18px 0 8px">Here is your sign-in code:</p>
    <div style="font-size:40px;font-weight:800;letter-spacing:8px;background:#f2effb;color:#6b3fd4;border-radius:14px;text-align:center;padding:18px 0;margin:8px 0 18px">${code}</div>
    <p style="font-size:14px;color:#5a6072;margin:0 0 6px">Enter this code in PlayGlow to sign in. It expires in 10 minutes.</p>
    <p style="font-size:13px;color:#8a90a2;margin:14px 0 0">If you did not request this, you can safely ignore this email.</p>
    <hr style="border:none;border-top:1px solid #ece9f6;margin:20px 0 12px" />
    <p style="font-size:12px;color:#a0a4b4;margin:0;text-align:center">PlayGlow is a free game by KreativeMinds.ae</p>
  </div>`;
  const text = `Your PlayGlow sign-in code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.\n\nPlayGlow is a free game by KreativeMinds.ae`;
  return { subject, html, text };
}

// POST /api/auth/request-otp  { email }
export async function handleRequestOtp(request, env) {
  const body = await readJson(request);
  const email = normEmail(body.email);
  if (!EMAIL_RE.test(email)) {
    return json({ error: 'invalid_email' }, { status: 400 }, request);
  }

  const t = now();

  // Rate limits based on existing codes for this email.
  const recent = await env.DB.prepare(
    `SELECT created_at FROM otp_codes WHERE email = ? ORDER BY created_at DESC LIMIT ?`
  ).bind(email, OTP_MAX_PER_HOUR).all();
  const rows = recent.results || [];
  if (rows.length && (t - rows[0].created_at) < OTP_COOLDOWN_SEC) {
    return json({ error: 'too_soon', retry_after: OTP_COOLDOWN_SEC - (t - rows[0].created_at) }, { status: 429 }, request);
  }
  if (rows.length >= OTP_MAX_PER_HOUR && (t - rows[rows.length - 1].created_at) < 3600) {
    return json({ error: 'rate_limited' }, { status: 429 }, request);
  }

  const code = sixDigitCode();
  const codeHash = await sha256hex(email + ':' + code);

  // One live code per email: clear previous, insert fresh.
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM otp_codes WHERE email = ?`).bind(email),
    env.DB.prepare(
      `INSERT INTO otp_codes (email, code_hash, expires_at, attempts, created_at) VALUES (?, ?, ?, 0, ?)`
    ).bind(email, codeHash, t + OTP_TTL_SEC, t),
  ]);

  const mail = otpEmail(code);
  try {
    await sendGmail(env, { to: email, subject: mail.subject, html: mail.html, text: mail.text, fromName: 'PlayGlow' });
  } catch (err) {
    console.error('otp send failed', err.message);
    return json({ error: 'send_failed' }, { status: 502 }, request);
  }

  return json({ ok: true }, {}, request);
}

// POST /api/auth/verify-otp  { email, code }  ->  { ok, token, email }
export async function handleVerifyOtp(request, env) {
  const body = await readJson(request);
  const email = normEmail(body.email);
  const code = String(body.code || '').trim();
  if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) {
    return json({ error: 'invalid_input' }, { status: 400 }, request);
  }

  const t = now();
  const row = await env.DB.prepare(
    `SELECT id, code_hash, expires_at, attempts FROM otp_codes WHERE email = ? ORDER BY created_at DESC LIMIT 1`
  ).bind(email).first();

  if (!row || row.expires_at < t) {
    return json({ error: 'code_expired' }, { status: 400 }, request);
  }
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    await env.DB.prepare(`DELETE FROM otp_codes WHERE email = ?`).bind(email).run();
    return json({ error: 'too_many_attempts' }, { status: 429 }, request);
  }

  const codeHash = await sha256hex(email + ':' + code);
  if (codeHash !== row.code_hash) {
    await env.DB.prepare(`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?`).bind(row.id).run();
    return json({ error: 'code_incorrect' }, { status: 400 }, request);
  }

  // Success: burn the code, upsert the account, issue a session.
  await env.DB.prepare(`DELETE FROM otp_codes WHERE email = ?`).bind(email).run();

  let account = await env.DB.prepare(`SELECT id FROM accounts WHERE email = ?`).bind(email).first();
  if (!account) {
    const ins = await env.DB.prepare(
      `INSERT INTO accounts (email, created_at, last_login_at) VALUES (?, ?, ?)`
    ).bind(email, t, t).run();
    account = { id: ins.meta.last_row_id };
  } else {
    await env.DB.prepare(`UPDATE accounts SET last_login_at = ? WHERE id = ?`).bind(t, account.id).run();
  }

  const token = randomToken();
  const tokenHash = await sha256hex(token);
  await env.DB.prepare(
    `INSERT INTO sessions (token_hash, account_id, email, created_at, expires_at) VALUES (?, ?, ?, ?, ?)`
  ).bind(tokenHash, account.id, email, t, t + SESSION_TTL_SEC).run();

  return json({ ok: true, token, email }, {}, request);
}

// Resolve a bearer token to a live session, or null.
async function sessionFor(request, env) {
  const token = getBearer(request);
  if (!token) return null;
  const tokenHash = await sha256hex(token);
  const row = await env.DB.prepare(
    `SELECT account_id, email, expires_at FROM sessions WHERE token_hash = ?`
  ).bind(tokenHash).first();
  if (!row || row.expires_at < now()) return null;
  return { accountId: row.account_id, email: row.email };
}

// GET /api/auth/me  ->  { email, account_id } | 401
export async function handleMe(request, env) {
  const sess = await sessionFor(request, env);
  if (!sess) return json({ error: 'unauthorized' }, { status: 401 }, request);
  return json({ email: sess.email, account_id: sess.accountId }, {}, request);
}

// POST /api/auth/logout  ->  { ok }
export async function handleLogout(request, env) {
  const token = getBearer(request);
  if (token) {
    const tokenHash = await sha256hex(token);
    await env.DB.prepare(`DELETE FROM sessions WHERE token_hash = ?`).bind(tokenHash).run();
  }
  return json({ ok: true }, {}, request);
}
