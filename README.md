# WordGlow

Mobile-first PWA language game for kids. English / Arabic / Urdu.

**Stack:** Vite + vanilla JS frontend, Cloudflare Workers API, D1 (SQLite), R2 (assets).

> Phase status: local + GitHub scaffolded. Cloudflare deploy is the next phase (D1 binding, R2 bucket, secrets, GH Actions deploy jobs).

---

## Quick start (local)

```bash
npm install

# 1) start the Worker on :8787 (uses local D1)
npm run worker:dev

# 2) in a second terminal: start the frontend on :5173 (proxies /api -> :8787)
npm run dev
```

Open http://localhost:5173 on your laptop, or your laptop's LAN IP on iPhone Safari.

### Seed the local D1

The first time, create + seed the local D1 instance:

```bash
npx wrangler d1 create wordglow              # one-time, copy the database_id into wrangler.toml
npm run db:schema                             # local
npm run db:seed                               # local
```

Verify the seed landed (hard rule — don't trust silent migrations):

```bash
npx wrangler d1 execute wordglow --command "SELECT COUNT(*) FROM words"
```

---

## Project layout

```
src/
  index.html
  css/style.css
  js/
    app.js           entry — wires UI events
    game.js          game loop, board, scoring
    api.js           fetch wrapper for /api
    storage.js       localStorage (session id, progress, language)
    audio.js         Web Audio beeps + word TTS playback
  workers/
    api.js           Worker entry, routes
    handlers/
      words.js       GET /api/words
      progress.js    GET/POST /api/progress
    utils/
      cors.js        CORS + JSON helpers
      db.js          D1 queries
      r2.js          asset URL helpers (CDN base TBD)
db/
  schema.sql         tables + indexes
  seed.sql           50 starter words
public/
  manifest.json      PWA manifest
  sw.js              service worker
  icons/             icon-192.png, icon-512.png (TODO)
.github/workflows/
  ci.yml             build on push; deploy jobs commented until CF wired
wrangler.toml        Worker + D1 binding (id TBD)
vite.config.js       dev proxy /api -> :8787
```

---

## Endpoints

| Method | Path             | Purpose                                 |
|--------|------------------|-----------------------------------------|
| GET    | /api/health      | sanity check                            |
| GET    | /api/words       | random tile set + target_id for a level |
| GET    | /api/progress    | load saved progress for session         |
| POST   | /api/progress    | save level/stars/words_completed        |

`/api/words` query: `language=en|ar|ur`, `difficulty=1..5`, `limit=2..12`.
Response includes `target_id` (match by id, not index — frontend reshuffles).

---

## Next phase (Cloudflare)

1. `wrangler login`, then `wrangler d1 create wordglow` and paste the `database_id` into `wrangler.toml`.
2. `npm run db:schema:remote && npm run db:seed:remote`. Verify with `--remote ... PRAGMA table_info(words)`.
3. Create R2 bucket `wordglow-assets`, attach a custom domain, set `CDN_BASE` in `src/workers/utils/r2.js`.
4. Add GH secrets `CF_API_TOKEN` + `CF_ACCOUNT_ID`, uncomment the deploy jobs in `.github/workflows/ci.yml`.
5. First deploy: do a regression audit (what's working, what could break, rollback) and verify the schema landed before pointing the frontend at prod.
