-- WordGlow schema v1
-- Run: npm run db:schema (local) or npm run db:schema:remote (prod)
-- After remote run, ALWAYS verify with: wrangler d1 execute wordglow --remote --command "PRAGMA table_info(words)"

CREATE TABLE IF NOT EXISTS words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word_en TEXT NOT NULL,
  word_ar TEXT NOT NULL,
  word_ur TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 1,
  image_filename TEXT NOT NULL,
  emoji TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_words_category ON words(category);
CREATE INDEX IF NOT EXISTS idx_words_difficulty ON words(difficulty);

CREATE TABLE IF NOT EXISTS progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL UNIQUE,
  language_learning TEXT NOT NULL DEFAULT 'en',
  words_completed TEXT NOT NULL DEFAULT '[]',
  current_level INTEGER NOT NULL DEFAULT 1,
  stars_earned INTEGER NOT NULL DEFAULT 0,
  last_played DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_progress_session ON progress(session_id);

CREATE TABLE IF NOT EXISTS gameplay (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  level INTEGER,
  language TEXT,
  word_id INTEGER,
  was_correct INTEGER NOT NULL DEFAULT 0,
  time_played_seconds INTEGER,
  stars_earned INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gameplay_session ON gameplay(session_id);
CREATE INDEX IF NOT EXISTS idx_gameplay_word ON gameplay(word_id);
