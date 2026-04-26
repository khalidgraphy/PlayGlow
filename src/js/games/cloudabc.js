// Activity 2: Cloud ABC
// Letters fall from clouds. Tap them before they hit the ground.
// 3 lives, 30-second round. Tap mode (no keyboard) for ages 4-6.
// Reuses ABC Crush COLOR_MAP so colors stay consistent across the app.

import { Audio } from '../audio.js';
import { Storage } from '../storage.js';
import { COLOR_MAP } from './crush.js';

const POOL = ['A','B','C','D','E','F','G','H','I','J']; // start easy; expand later
const ROUND_SECONDS = 30;
const START_LIVES = 3;
const SPAWN_MS = 1500;       // new letter every 1.5s
const FALL_PX_PER_S = 70;    // gentle, kid-reachable

let abortPrev = null;        // cancels any in-flight run on re-entry

export const cloudABC = {
  id: 2,
  name: 'Cloud ABC',
  emoji: '☁️',
  desc: 'Catch falling letters',
  ageHint: 'Age 4+',
  guide: 'Letters fall from clouds. Tap them before they hit the ground. 3 lives — see how many you can catch in 30 seconds!',
  custom: true,

  start(stage, { onExit, showDone }) {
    // Cancel any previous run (e.g. user replayed)
    abortPrev?.();
    let cancelled = false;
    abortPrev = () => { cancelled = true; };

    let lives = START_LIVES;
    let score = 0;
    let timeLeft = ROUND_SECONDS;
    let lastTs = performance.now();
    let lastSpawn = 0;
    let nextLetterId = 0;
    const letters = []; // { id, char, x, y, el }

    stage.innerHTML = `
      <div class="cloudabc-root">
        <div class="cloudabc-hud">
          <div class="hud-pill"><span class="hud-label">LIVES</span><span class="hud-value" id="ca-lives">${'❤️'.repeat(lives)}</span></div>
          <div class="hud-pill"><span class="hud-label">TIME</span><span class="hud-value" id="ca-time">${timeLeft}</span></div>
          <div class="hud-pill"><span class="hud-label">SCORE</span><span class="hud-value" id="ca-score">0</span></div>
        </div>
        <div class="cloudabc-stage" id="ca-stage">
          <div class="ca-cloud ca-cloud-1">☁️</div>
          <div class="ca-cloud ca-cloud-2">☁️</div>
          <div class="ca-cloud ca-cloud-3">☁️</div>
          <div class="ca-ground"></div>
        </div>
        <div style="text-align:center;font-size:12px;color:var(--ink-soft)">Tap each letter before it lands!</div>
      </div>
    `;

    const root = stage.querySelector('.cloudabc-root');
    const sky = stage.querySelector('#ca-stage');
    const livesEl = stage.querySelector('#ca-lives');
    const timeEl = stage.querySelector('#ca-time');
    const scoreEl = stage.querySelector('#ca-score');

    function spawn() {
      if (sky.clientWidth === 0) return; // not laid out yet
      const char = POOL[Math.floor(Math.random() * POOL.length)];
      const col = COLOR_MAP[char];
      const padding = 30;
      const x = padding + Math.random() * (sky.clientWidth - padding * 2 - 50);
      const id = ++nextLetterId;
      const el = document.createElement('button');
      el.className = 'ca-letter';
      el.dataset.id = id;
      el.textContent = char;
      el.style.background = col.bg;
      el.style.color = col.text;
      if (char === 'W') el.style.border = '2px solid #d8d8e8';
      el.style.transform = `translate(${x}px, -50px)`;
      el.onclick = () => catchLetter(id);
      sky.appendChild(el);
      letters.push({ id, char, x, y: -50, el });
    }

    function catchLetter(id) {
      const idx = letters.findIndex(l => l.id === id);
      if (idx < 0) return;
      const l = letters[idx];
      l.el.classList.add('caught');
      Audio.speak(l.char, 'en');
      score += 1;
      scoreEl.textContent = score;
      setTimeout(() => l.el.remove(), 280);
      letters.splice(idx, 1);
    }

    function loseLife() {
      lives -= 1;
      livesEl.textContent = lives > 0 ? '❤️'.repeat(lives) : '💔';
      livesEl.classList.add('flash-bad');
      setTimeout(() => livesEl.classList.remove('flash-bad'), 400);
      Audio.wrong();
      if (lives <= 0) endGame(false);
    }

    function tick(ts) {
      if (cancelled) return;
      // Stop if our DOM was replaced (user navigated away)
      if (!document.body.contains(root)) { cancelled = true; return; }

      const dt = Math.min(0.05, (ts - lastTs) / 1000); // cap dt at 50ms (tab background)
      lastTs = ts;

      // Spawn timer
      lastSpawn += dt * 1000;
      if (lastSpawn >= SPAWN_MS) {
        spawn();
        lastSpawn = 0;
      }

      // Move letters
      const skyH = sky.clientHeight;
      for (let i = letters.length - 1; i >= 0; i--) {
        const l = letters[i];
        l.y += FALL_PX_PER_S * dt;
        if (l.y >= skyH - 60) {
          // Hit ground — life lost, remove
          l.el.classList.add('missed');
          setTimeout(() => l.el.remove(), 320);
          letters.splice(i, 1);
          loseLife();
        } else {
          l.el.style.transform = `translate(${l.x}px, ${l.y}px)`;
        }
      }

      requestAnimationFrame(tick);
    }

    // 1-second timer for the countdown
    const timerId = setInterval(() => {
      if (cancelled) { clearInterval(timerId); return; }
      timeLeft -= 1;
      timeEl.textContent = Math.max(0, timeLeft);
      if (timeLeft <= 0) {
        clearInterval(timerId);
        endGame(true);
      }
    }, 1000);

    function endGame(survived) {
      if (cancelled) return;
      cancelled = true;
      clearInterval(timerId);
      const stars = score >= 15 ? 3 : score >= 8 ? 2 : score >= 1 ? 1 : 0;
      Storage.addStars(stars);
      Storage.setLevelScore(2, score);
      if (survived) Audio.win();
      showDone({
        title: survived ? 'Time Up — Nice!' : 'Out of Lives',
        stars,
        summary: `Caught ${score} letters · Lifetime ⭐ ${Storage.getStars()}`,
        onAgain: () => cloudABC.start(stage, { onExit, showDone }),
        onNext: () => onExit({ next: true }),
        onHome: () => onExit({ home: true })
      });
    }

    requestAnimationFrame((ts) => { lastTs = ts; tick(ts); });
  }
};
