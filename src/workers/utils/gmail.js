// gmail.js — Gmail API send via Workspace service account with domain-wide delegation.
// Ported from the MyKard implementation; PlayGlow-specific (no email-log table).
// Uses Web Crypto for RS256 JWT signing (Workers don't ship Node crypto).
//
// Required secrets (set via `wrangler secret put`):
//   GMAIL_SA_CLIENT_EMAIL  — service account email (xxx@project.iam.gserviceaccount.com)
//   GMAIL_SA_PRIVATE_KEY   — PEM private key, or the whole SA JSON blob (private_key is extracted)
//   GMAIL_IMPERSONATE      — workspace user to send as (playglow@kmmpr.com)
//
// Flow: sign JWT (sub=impersonate, scope=gmail.send) -> exchange for access_token
//       -> gmail.users.messages.send with a base64url MIME body.

// In-memory per-isolate token cache, keyed by impersonate address.
const _tokenCache = new Map();  // impersonate-email -> { token, exp }

function _b64url(buf) {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function _b64urlText(text) {
  return _b64url(new TextEncoder().encode(text));
}

function _pemToArrayBuffer(pem) {
  // Accepts a bare PEM, PEM with escaped \n, or the full service-account JSON.
  const raw = String(pem || '');
  let body = raw;

  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(trimmed);
      if (obj.private_key && typeof obj.private_key === 'string') body = obj.private_key;
    } catch (e) { /* fall through to regex extraction */ }
  }

  body = body.replace(/\\n/g, '\n');

  const m = body.match(/-----BEGIN [A-Z0-9 ]+-----([\s\S]*?)-----END [A-Z0-9 ]+-----/);
  if (m) body = m[1];

  let cleaned = body.replace(/[^A-Za-z0-9+/=]/g, '').replace(/=+$/, '');
  while (cleaned.length % 4 !== 0) cleaned += '=';

  let decoded;
  try {
    decoded = atob(cleaned);
  } catch (e) {
    throw new Error('PEM atob failed (cleanedLen=' + cleaned.length + '): ' + e.message);
  }
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
  return bytes.buffer;
}

async function _signJwt(env, impersonate) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: env.GMAIL_SA_CLIENT_EMAIL,
    sub: impersonate || env.GMAIL_IMPERSONATE,
    scope: 'https://www.googleapis.com/auth/gmail.send',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${_b64urlText(JSON.stringify(header))}.${_b64urlText(JSON.stringify(payload))}`;

  const keyData = _pemToArrayBuffer(env.GMAIL_SA_PRIVATE_KEY);
  const key = await crypto.subtle.importKey(
    'pkcs8', keyData, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' }, key, new TextEncoder().encode(signingInput)
  );
  return `${signingInput}.${_b64url(sig)}`;
}

async function _getAccessToken(env, impersonate) {
  const sub = impersonate || env.GMAIL_IMPERSONATE;
  const now = Math.floor(Date.now() / 1000);
  const cached = _tokenCache.get(sub);
  if (cached && cached.exp > now + 60) return cached.token;

  const jwt = await _signJwt(env, sub);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Google token exchange failed (${res.status}): ${txt.slice(0, 400)}`);
  }
  const data = await res.json();
  _tokenCache.set(sub, { token: data.access_token, exp: now + (data.expires_in || 3500) });
  return data.access_token;
}

function _stripHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function _buildMime({ from, to, subject, html, text, replyTo }) {
  const boundary = 'boundary_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return [
    `From: ${from}`,
    `To: ${to}`,
    ...(replyTo ? [`Reply-To: ${replyTo}`] : []),
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    text,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    html,
    ``,
    `--${boundary}--`,
    ``,
  ].join('\r\n');
}

/**
 * Send an email as the impersonated Workspace user. Returns { ok, id }; throws on failure.
 * @param {object} env  worker env (must have GMAIL_* secrets bound)
 * @param {object} msg  { to, subject, html, text?, fromName?, replyTo?, impersonate? }
 */
export async function sendGmail(env, { to, subject, html, text, fromName, replyTo, impersonate }) {
  if (!env.GMAIL_SA_CLIENT_EMAIL || !env.GMAIL_SA_PRIVATE_KEY || !env.GMAIL_IMPERSONATE) {
    throw new Error('Gmail SA secrets not configured');
  }
  const fromAddr = impersonate || env.GMAIL_IMPERSONATE;
  const token = await _getAccessToken(env, fromAddr);
  const from = fromName ? `${fromName} <${fromAddr}>` : fromAddr;
  const mime = _buildMime({ from, to, subject, html, text: text || _stripHtml(html), replyTo });
  const raw = _b64url(new TextEncoder().encode(mime));

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gmail send failed (${res.status}): ${txt.slice(0, 600)}`);
  }
  const data = await res.json();
  return { ok: true, id: data.id };
}
