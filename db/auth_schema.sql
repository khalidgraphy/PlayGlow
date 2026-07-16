-- PlayGlow auth schema — parent email OTP login (Phase 1)
-- Run: npm run db:auth (local) or npm run db:auth:remote (prod)
-- Verify: wrangler d1 execute wordglow --remote --command "PRAGMA table_info(accounts)"
--
-- All timestamps are unix epoch seconds (INTEGER), not ISO strings.

-- Parent accounts (one per email). Kids remain client-side profiles in Phase 1;
-- Phase 2 will attach profiles + progress to account_id.
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER
);

-- Short-lived one-time codes. Code is stored hashed (SHA-256 hex), never plaintext.
CREATE TABLE IF NOT EXISTS otp_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes(email);

-- Bearer sessions. Token is stored hashed (SHA-256 hex); raw token lives only on the client.
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  account_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions(account_id);
