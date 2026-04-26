# Language Learning Game - Development Plan

## Project Overview
Mobile-first PWA language learning game for 5-year-old (English, Arabic, Urdu).
**Stack:** Cloudflare Pages, Workers, D1, R2, GitHub
**Timeline:** 2 weeks to MVP
**Target:** iOS/Android PWA on iPhone

---

## Phase 1: Setup & Data (Days 1-2)

### 1.1 GitHub & CI/CD
- [ ] Create repo: `language-game` (or similar)
- [ ] Setup GitHub Actions workflow
  - Trigger: Push to `main`
  - Build: `npm run build` (Vite or vanilla JS bundler)
  - Deploy Pages: Cloudflare Pages integration
  - Deploy Workers: `wrangler deploy` for API
- [ ] Create `.gitignore` (node_modules, .env, dist)
- [ ] Setup `wrangler.toml` for Workers + D1 + R2

### 1.2 D1 Database Schema
**File:** `db/schema.sql`

```sql
-- Words table
CREATE TABLE words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word_en TEXT NOT NULL,
  word_ar TEXT NOT NULL,
  word_ur TEXT NOT NULL,
  category TEXT NOT NULL, -- 'color', 'animal', 'food', 'body', 'action'
  difficulty INTEGER DEFAULT 1, -- 1-5 scale
  image_filename TEXT NOT NULL, -- 'apple.jpg' (path in R2)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Progress tracking
CREATE TABLE progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL UNIQUE, -- browser session token
  language_learning TEXT DEFAULT 'en', -- current language focus
  words_completed TEXT DEFAULT '[]', -- JSON array of word IDs
  current_level INTEGER DEFAULT 1,
  stars_earned INTEGER DEFAULT 0,
  last_played DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Simple analytics (optional, Phase 2)
CREATE TABLE gameplay (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  level INTEGER,
  language TEXT,
  tiles_matched INTEGER,
  time_played_seconds INTEGER,
  stars_earned INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Seed data file:** `db/seed.sql`
- Start with 50 words across 3 categories (animals, colors, food)
- Each word: English, Arabic, Urdu translations
- Images: Use emoji or placeholder URLs initially

```sql
INSERT INTO words (word_en, word_ar, word_ur, category, difficulty, image_filename) VALUES
('apple', 'تفاحة', 'سیب', 'food', 1, 'apple.jpg'),
('banana', 'موز', 'کیلا', 'food', 1, 'banana.jpg'),
('red', 'أحمر', 'سرخ', 'color', 1, 'red.jpg'),
-- ... 47 more
```

**Command to run:**
```bash
npx wrangler d1 execute language-game --file db/schema.sql
npx wrangler d1 execute language-game --file db/seed.sql
```

### 1.3 R2 Asset Structure
- [ ] Create R2 bucket: `language-game-assets`
- [ ] Create folders:
  ```
  /images/
    apple.jpg
    banana.jpg
    ... (50 images, 200x200px)
  /audio/
    en/
      apple.mp3
      banana.mp3
    ar/
      apple.mp3
      banana.mp3
    ur/
      apple.mp3
      banana.mp3
  ```
- **Placeholder audio:** Use Google Translate API (free, temporary)
  - Endpoint: `https://translate.google.com/translate_tts?client=tw-ob&q={word}&tl={lang}`
  - Later: Replace with native speaker recordings

**Script to test R2 upload:**
```bash
aws s3 cp images/ s3://language-game-assets/images/ --recursive --endpoint-url https://{account}.r2.cloudflarestorage.com
```

**Access in Workers:**
```javascript
const imageUrl = `https://cdn.example.com/images/apple.jpg`; // via Cloudflare custom domain
```

---

## Phase 2: Workers API (Days 2-3)

### 2.1 File Structure
```
src/
  workers/
    api.js           (main Worker entry point)
    handlers/
      words.js       (GET /api/words)
      progress.js    (POST/GET /api/progress)
    utils/
      db.js          (D1 queries)
      r2.js          (R2 asset URLs)
      cors.js        (CORS headers)
```

### 2.2 Database Utilities (`src/workers/utils/db.js`)

**Functions needed:**
```javascript
// Get random words for a level
async function getWordsForLevel(env, language, limit = 6, difficulty = 1) {
  // Query D1, return words + R2 URLs
}

// Save progress
async function saveProgress(env, sessionId, levelData) {
  // Upsert into progress table
}

// Get user progress
async function getUserProgress(env, sessionId) {
  // Query progress table
}
```

### 2.3 API Endpoints

**Endpoint 1: GET /api/words**
```
Query params:
  - language: 'en' | 'ar' | 'ur' (primary language for this round)
  - difficulty: 1-5 (default 1)
  - limit: number of tiles (default 6)

Response:
{
  "tiles": [
    {
      "id": 1,
      "word": "apple",
      "image_url": "https://cdn.r2.../images/apple.jpg",
      "audio_url": "https://cdn.r2.../audio/en/apple.mp3"
    },
    ...
  ],
  "answer": 2 // index of word to match against (frontend shuffles display)
}
```

**Endpoint 2: POST /api/progress**
```
Body:
{
  "session_id": "uuid-xxx",
  "language": "en",
  "level_completed": 3,
  "stars_earned": 2
}

Response:
{
  "success": true,
  "current_level": 4,
  "total_stars": 35
}
```

**Endpoint 3: GET /api/progress**
```
Query params:
  - session_id: xxx

Response:
{
  "session_id": "uuid-xxx",
  "current_level": 3,
  "stars_earned": 25,
  "language_learning": "en",
  "words_completed": [1, 2, 3, 5, 7, ...]
}
```

**CORS + Error Handling:**
- All endpoints allow requests from `*.pages.dev` + localhost
- Return proper HTTP status codes (400, 404, 500)
- Log errors to Cloudflare logs (console.error)

### 2.4 R2 Helper (`src/workers/utils/r2.js`)

```javascript
export function getImageUrl(filename) {
  // Return signed or public URL from R2
  return `https://cdn-r2.example.com/images/${filename}`;
}

export function getAudioUrl(language, word) {
  // Return audio URL
  return `https://cdn-r2.example.com/audio/${language}/${word}.mp3`;
}
```

---

## Phase 3: Frontend PWA (Days 3-5)

### 3.1 Project Structure
```
src/
  index.html         (single page)
  css/
    style.css        (all styling)
  js/
    app.js           (main app logic)
    game.js          (game board + mechanics)
    api.js           (API client wrapper)
    storage.js       (localStorage progress)
    audio.js         (sound management)
  manifest.json      (PWA manifest)
  sw.js              (service worker for offline)
```

### 3.2 index.html Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#FF6B6B">
  <title>Language Learn Game</title>
  <link rel="manifest" href="manifest.json">
  <link rel="apple-touch-icon" href="icon.png">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <!-- Main game container -->
  <div id="app">
    <!-- Language selector (hidden after start) -->
    <div id="language-select" class="screen">
      <h1>Learn a Language!</h1>
      <div class="language-buttons">
        <button class="lang-btn" data-lang="en">English 🇬🇧</button>
        <button class="lang-btn" data-lang="ar">العربية 🇸🇦</button>
        <button class="lang-btn" data-lang="ur">اردو 🇵🇰</button>
      </div>
    </div>

    <!-- Game board -->
    <div id="game-screen" class="screen hidden">
      <div class="header">
        <div class="level">Level <span id="current-level">1</span></div>
        <div class="stars">⭐ <span id="stars">0</span></div>
      </div>

      <!-- Word to match (large, top) -->
      <div id="word-display" class="word-display">
        <div id="target-image" class="target-image"></div>
        <button id="play-audio" class="play-button">🔊</button>
        <div id="target-word" class="target-word">apple</div>
      </div>

      <!-- Game grid (6 tiles) -->
      <div id="game-board" class="game-board">
        <!-- Tiles generated by JS -->
      </div>

      <!-- Progress indicator -->
      <div class="progress-bar">
        <div id="progress-fill" class="progress-fill"></div>
      </div>
    </div>

    <!-- Level complete screen -->
    <div id="complete-screen" class="screen hidden">
      <h2>Level Complete! 🎉</h2>
      <div id="stars-earned" class="stars-display">⭐⭐</div>
      <button id="next-btn" class="button">Next Level</button>
    </div>
  </div>

  <script src="js/app.js"></script>
</body>
</html>
```

### 3.3 Game Logic (`src/js/game.js`)

**Core game flow:**
1. Load words from API
2. Display target word + image + audio button
3. Show 6 tiles (1 correct, 5 random)
4. Player taps a tile
5. If correct → stars + progress
6. If wrong → highlight red, play error sound, reset
7. 3 correct matches = level complete

```javascript
class GameBoard {
  constructor(apiClient, audioManager) {
    this.api = apiClient;
    this.audio = audioManager;
    this.currentTiles = [];
    this.correctCount = 0;
    this.lives = 3; // optional: 3 wrong answers per level
  }

  async loadLevel(language, difficulty) {
    // Get tiles from /api/words
    const response = await this.api.getWords(language, difficulty, 6);
    this.currentTiles = response.tiles;
    this.correctAnswer = response.tiles[response.answer];
    this.renderBoard();
  }

  renderBoard() {
    const board = document.getElementById('game-board');
    board.innerHTML = '';

    // Shuffle tiles
    const shuffled = this.shuffle(this.currentTiles);

    shuffled.forEach((tile, index) => {
      const tileEl = document.createElement('div');
      tileEl.className = 'tile';
      tileEl.innerHTML = `
        <img src="${tile.image_url}" alt="${tile.word}">
        <div class="tile-label">${tile.word}</div>
      `;
      tileEl.addEventListener('click', () => this.checkTile(tile, tileEl));
      board.appendChild(tileEl);
    });
  }

  checkTile(tile, tileEl) {
    if (tile.id === this.correctAnswer.id) {
      // Correct!
      tileEl.classList.add('correct');
      this.audio.playCorrect();
      this.correctCount++;

      if (this.correctCount === 3) {
        this.levelComplete();
      } else {
        setTimeout(() => this.loadLevel(), 1500);
      }
    } else {
      // Wrong
      tileEl.classList.add('wrong');
      this.audio.playWrong();
      this.lives--;
      if (this.lives === 0) {
        this.levelFailed();
      } else {
        setTimeout(() => this.resetTile(tileEl), 500);
      }
    }
  }

  shuffle(array) {
    // Fisher-Yates shuffle
    let arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  levelComplete() {
    // Calculate stars: 3 = 3 stars, 2 = 2 stars, etc.
    const stars = Math.max(1, this.lives);
    this.showCompleteScreen(stars);
  }
}
```

### 3.4 API Client (`src/js/api.js`)

```javascript
class APIClient {
  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
  }

  async getWords(language, difficulty = 1, limit = 6) {
    const res = await fetch(
      `${this.baseURL}/words?language=${language}&difficulty=${difficulty}&limit=${limit}`
    );
    if (!res.ok) throw new Error('Failed to fetch words');
    return res.json();
  }

  async saveProgress(sessionId, levelData) {
    const res = await fetch(`${this.baseURL}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, ...levelData })
    });
    if (!res.ok) throw new Error('Failed to save progress');
    return res.json();
  }

  async getProgress(sessionId) {
    const res = await fetch(`${this.baseURL}/progress?session_id=${sessionId}`);
    if (!res.ok) throw new Error('Failed to fetch progress');
    return res.json();
  }
}
```

### 3.5 Storage (`src/js/storage.js`)

```javascript
class LocalStorage {
  static getSessionId() {
    let id = localStorage.getItem('session_id');
    if (!id) {
      id = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('session_id', id);
    }
    return id;
  }

  static saveProgress(progress) {
    localStorage.setItem('progress', JSON.stringify(progress));
  }

  static getProgress() {
    const stored = localStorage.getItem('progress');
    return stored ? JSON.parse(stored) : null;
  }
}
```

### 3.6 Audio Manager (`src/js/audio.js`)

```javascript
class AudioManager {
  async playWord(audioUrl) {
    const audio = new Audio(audioUrl);
    audio.playbackRate = 0.9; // Slow down for clarity
    await audio.play();
  }

  playCorrect() {
    // Use Web Audio API or simple beep sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  }

  playWrong() {
    // Lower frequency beep
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 300;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  }
}
```

### 3.7 CSS (`src/css/style.css`)

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

#app {
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  min-height: 500px;
}

.screen {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 20px;
}

.screen.hidden {
  display: none;
}

#language-select h1 {
  font-size: 28px;
  color: #333;
  text-align: center;
}

.language-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.lang-btn {
  padding: 15px 20px;
  font-size: 18px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transition: transform 0.2s;
}

.lang-btn:active {
  transform: scale(0.95);
}

/* Game board */
.game-board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  width: 100%;
  margin: 20px 0;
}

.tile {
  aspect-ratio: 1;
  border-radius: 15px;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  background: #f0f0f0;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.tile img {
  width: 100%;
  height: 70%;
  object-fit: cover;
}

.tile-label {
  font-size: 12px;
  font-weight: bold;
  text-align: center;
}

.tile:active {
  transform: scale(0.95);
}

.tile.correct {
  background: #4CAF50;
  color: white;
  border-color: #2E7D32;
}

.tile.wrong {
  background: #FF5252;
  border-color: #C62828;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  width: 100%;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
}

/* Word display */
.word-display {
  text-align: center;
  margin: 20px 0;
}

.target-image {
  width: 150px;
  height: 150px;
  background: #f0f0f0;
  border-radius: 15px;
  margin: 0 auto 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 80px;
}

.target-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 15px;
}

.play-button {
  background: #FF6B6B;
  border: none;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  font-size: 24px;
  cursor: pointer;
  margin: 10px 0;
  transition: transform 0.2s;
}

.play-button:active {
  transform: scale(0.9);
}

.target-word {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

/* Progress bar */
.progress-bar {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
  margin-top: 20px;
}

.progress-fill {
  height: 100%;
  background: #4CAF50;
  transition: width 0.3s;
}

/* Complete screen */
#complete-screen {
  gap: 30px;
}

.stars-display {
  font-size: 60px;
  letter-spacing: 10px;
}

.button {
  padding: 15px 30px;
  font-size: 18px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  width: 100%;
  margin-top: 20px;
}

@media (max-width: 480px) {
  body {
    padding: 10px;
  }
  
  #app {
    border-radius: 15px;
    padding: 15px;
  }
  
  .game-board {
    gap: 8px;
  }
}
```

### 3.8 PWA Manifest (`src/manifest.json`)

```json
{
  "name": "Language Learn Game",
  "short_name": "Learn Languages",
  "description": "Learn English, Arabic, and Urdu through fun games",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "theme_color": "#667eea",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    }
  ]
}
```

### 3.9 Service Worker (`src/sw.js`)

```javascript
const CACHE_NAME = 'language-game-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/game.js',
  '/js/api.js',
  '/js/storage.js',
  '/js/audio.js',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // API calls: network-first
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
  } else {
    // Static assets: cache-first
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
```

---

## Phase 4: Testing & Deployment (Days 5-6)

### 4.1 Local Testing
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Test on mobile: http://localhost:5173
# Open on iPhone Safari -> Add to Home Screen
```

### 4.2 Cloudflare Deployment
```bash
# Deploy Workers API
wrangler deploy

# Deploy Pages
npm run build
# (Pages auto-deploys via GitHub Actions)
```

### 4.3 Testing Checklist
- [ ] Words load from D1
- [ ] Images display from R2
- [ ] Audio plays (all 3 languages)
- [ ] Tiles shuffle correctly
- [ ] Progress saves to D1
- [ ] Progress loads on refresh
- [ ] Works offline (service worker)
- [ ] Responsive on iPhone (375px width)
- [ ] No console errors
- [ ] Add to Home Screen works

### 4.4 Performance Targets
- First paint: < 2s
- TTI (Time to Interactive): < 3s
- Tile tap response: < 100ms
- Audio latency: < 500ms

---

## Phase 5: Iteration (Week 2)

### 5.1 Content Expansion
- [ ] Add 50 more words (different categories)
- [ ] Increase difficulty levels (2-5)
- [ ] Record native speaker audio (hire on Fiverr, ~$30-50)

### 5.2 Features (if time permits)
- [ ] Daily challenges (reset at midnight)
- [ ] Leaderboard (store high scores in D1)
- [ ] Sound toggle (some kids find noise distracting)
- [ ] Language mix mode (all 3 languages in one level)

### 5.3 Analytics (optional Phase 2)
- [ ] Log gameplay events to D1
- [ ] Dashboard: which words kid struggles with
- [ ] Recommendation: "Practice this word more"

---

## Git Workflow

```bash
# Feature branch
git checkout -b feature/game-board
git add .
git commit -m "Add game board UI and click logic"
git push origin feature/game-board

# Create PR, merge to main
# GitHub Actions auto-deploys to Pages + Workers

# Never commit:
# - .env (use Cloudflare Secrets)
# - wrangler.toml secrets
# - node_modules/
```

---

## Environment Variables

**In `wrangler.toml`:**
```toml
[env.production]
vars = { API_URL = "https://api.language-game.pages.dev" }

[[d1_databases]]
binding = "DB"
database_name = "language-game"

[[r2_buckets]]
binding = "R2"
bucket_name = "language-game-assets"
```

**In Workers code:**
```javascript
export default {
  async fetch(request, env) {
    const db = env.DB;
    const r2 = env.R2;
    // Use env variables
  }
};
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| D1 query slow | Add indexes on `category`, `difficulty` |
| R2 CORS errors | Set CORS headers in Worker response |
| Audio won't play on iOS | Ensure `User interaction required` handled (tap button first) |
| Service Worker not caching | Clear browser cache, check Cache-Control headers |
| Build fails on push | Check `npm run build` locally first |

---

## Success Metrics

- [ ] MVP deploys without errors
- [ ] Kid plays for 5+ minutes first session
- [ ] Audio is clear enough to understand
- [ ] Learns 3-5 new words in first session
- [ ] No crashes or bugs in 1-hour gameplay

---

## Questions for Khalid Before Starting

1. **Audio:** Use Google Translate initially, or find native speakers first?
2. **Images:** Use free emoji/icons, or hire designer for illustrations?
3. **Difficulty curve:** 3 matches per level, or different targets per difficulty?
4. **Multi-language mixing:** Start English only, then Arabic, then Urdu? Or mix from the start?
5. **Reward system:** Stars only, or unlock special badges/characters?

---

**Estimated Dev Hours:** 30-40 hours (MVP)
**Go-live target:** End of Week 2
**Post-launch:** Content expansion based on kid's performance
