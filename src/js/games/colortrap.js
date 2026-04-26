// Activity 2: Color Trap (Stroop test)
// Big colored circle. Options below are color NAMES whose ink is intentionally
// mismatched. Tap the option whose WORD matches the circle's color.
// 16-color pool; difficulty picks how many colors + how many options + timer.
// 3 lives, max 20 questions per round.

import { Audio } from '../audio.js';
import { Storage } from '../storage.js';

const COLORS = [
  { name: 'Red',     hex: '#E63946' },
  { name: 'Blue',    hex: '#3B82F6' },
  { name: 'Yellow',  hex: '#FBBF24' },
  { name: 'Green',   hex: '#22C55E' },
  { name: 'Orange',  hex: '#FB923C' },
  { name: 'Purple',  hex: '#A855F7' },
  { name: 'Pink',    hex: '#EC4899' },
  { name: 'Black',   hex: '#1F2937' },
  { name: 'Brown',   hex: '#92400E' },
  { name: 'Cyan',    hex: '#06B6D4' },
  { name: 'Magenta', hex: '#D946EF' },
  { name: 'Lime',    hex: '#84CC16' },
  { name: 'Teal',    hex: '#14B8A6' },
  { name: 'Indigo',  hex: '#4F46E5' },
  { name: 'Coral',   hex: '#FF6B6B' },
  { name: 'Maroon',  hex: '#7F1D1D' }
];

const DIFFICULTY = {
  practice: { label: 'Practice',  options: 3, time: 0,  count: 6,  desc: 'No timer' },
  easy:     { label: 'Easy',      options: 3, time: 8,  count: 6,  desc: '3 options · 8s · 6 colors' },
  medium:   { label: 'Medium',    options: 3, time: 6,  count: 10, desc: '3 options · 6s · 10 colors' },
  hard:     { label: 'Hard',      options: 4, time: 5,  count: 16, desc: '4 options · 5s · 16 colors' },
  expert:   { label: 'Expert',    options: 4, time: 4,  count: 16, desc: '4 options · 4s · all colors' }
};
const DEFAULT_DIFF = 'medium';
const MAX_QUESTIONS = 20;
const MAX_LIVES = 3;
const STREAK_BONUS_AT = 5;
const STREAK_BONUS = 20;

let abortPrev = null;

export const colorTrap = {
  id: 2,
  name: 'Color Trap',
  emoji: '🎯',
  desc: 'Tap the word that matches the circle',
  ageHint: 'Age 6+',
  guide: 'A colored circle appears. Below it are color names written in MIXED-UP ink colors. Tap the word that names the circle\'s color, ignore the ink. Quick thinking under time pressure!',
  custom: true,

  start(stage, { onExit, showDone }) {
    abortPrev?.();
    let cancelled = false;
    abortPrev = () => { cancelled = true; };
    showDifficultyPicker();

    function showDifficultyPicker() {
      stage.innerHTML = `
        <div class="ct-root">
          <div class="ct-pick-title">Pick a Difficulty</div>
          <div class="ct-difficulty-grid">
            ${Object.entries(DIFFICULTY).map(([key, d]) => `
              <button class="ct-diff-card${key === DEFAULT_DIFF ? ' recommended' : ''}" data-diff="${key}">
                <div class="ct-diff-name">${d.label}</div>
                <div class="ct-diff-desc">${d.desc}</div>
              </button>
            `).join('')}
          </div>
          <p class="muted" style="text-align:center;font-size:12px;margin-top:6px">
            Best score: ${Storage.getScores()[2]?.high || 0}
          </p>
        </div>
      `;
      stage.querySelectorAll('.ct-diff-card').forEach(b => {
        b.onclick = () => {
          if (cancelled) return;
          startRound(b.dataset.diff);
        };
      });
    }

    function startRound(diffKey) {
      const D = DIFFICULTY[diffKey];
      const palette = shuffle(COLORS).slice(0, D.count);
      let lives = MAX_LIVES;
      let score = 0;
      let streak = 0;
      let qIdx = 0;
      let timerLeft = D.time;
      let timerId = null;
      let questionLocked = false;

      stage.innerHTML = `
        <div class="ct-root">
          <div class="ct-hud">
            <div class="hud-pill"><span class="hud-label">SCORE</span><span class="hud-value" id="ct-score">0</span></div>
            <div class="hud-pill"><span class="hud-label">LIVES</span><span class="hud-value" id="ct-lives">❤️❤️❤️</span></div>
            <div class="hud-pill"><span class="hud-label">Q</span><span class="hud-value" id="ct-q">1/${MAX_QUESTIONS}</span></div>
          </div>
          <div class="ct-circle" id="ct-circle"></div>
          ${D.time > 0 ? `<div class="ct-timer-track"><div class="ct-timer-fill" id="ct-timer"></div></div>` : ''}
          <div class="ct-options" id="ct-options"></div>
          <div style="text-align:center;font-size:12px;color:var(--ink-soft)">
            Tap the WORD that matches the circle's color. Ignore the ink color!
          </div>
        </div>
      `;

      const circleEl = stage.querySelector('#ct-circle');
      const scoreEl  = stage.querySelector('#ct-score');
      const livesEl  = stage.querySelector('#ct-lives');
      const qEl      = stage.querySelector('#ct-q');
      const timerEl  = stage.querySelector('#ct-timer');
      const optsEl   = stage.querySelector('#ct-options');

      function render(question) {
        circleEl.style.background = question.correct.hex;
        optsEl.className = 'ct-options' + (D.options === 4 ? ' four' : '');
        optsEl.innerHTML = question.options.map((opt, i) => `
          <button class="ct-option" data-i="${i}" style="color:${opt.inkHex}">${opt.color.name}</button>
        `).join('');
        optsEl.querySelectorAll('.ct-option').forEach(b => {
          b.onclick = () => onAnswer(parseInt(b.dataset.i, 10), b);
        });
      }

      function nextQ() {
        if (cancelled) return;
        if (qIdx >= MAX_QUESTIONS) return endGame(true);
        qIdx += 1;
        qEl.textContent = `${qIdx}/${MAX_QUESTIONS}`;
        questionLocked = false;
        const correct = palette[Math.floor(Math.random() * palette.length)];
        // Distractors: from same palette, different from correct
        const others = palette.filter(c => c.name !== correct.name);
        const distractors = shuffle(others).slice(0, D.options - 1);
        const opts = shuffle([correct, ...distractors]).map(color => {
          // Ink color: any color from FULL pool, different from this option's word.
          // Note: it's OK if a distractor's ink matches the correct circle hex —
          // that adds challenge. Only restriction: ink !== own word.
          let ink;
          do { ink = COLORS[Math.floor(Math.random() * COLORS.length)]; }
          while (ink.name === color.name);
          return { color, inkHex: ink.hex };
        });
        const question = { correct, options: opts };
        render(question);
        startTimer();
      }

      function startTimer() {
        if (timerId) clearInterval(timerId);
        if (D.time === 0) { timerEl && (timerEl.style.width = '100%'); return; }
        timerLeft = D.time;
        if (timerEl) {
          timerEl.style.transition = 'none';
          timerEl.style.width = '100%';
          timerEl.classList.remove('warn');
          // force reflow then animate to 0
          requestAnimationFrame(() => {
            timerEl.style.transition = `width ${D.time}s linear`;
            timerEl.style.width = '0%';
          });
        }
        const tick = 100; // ms per micro-step
        const start = performance.now();
        timerId = setInterval(() => {
          if (cancelled) { clearInterval(timerId); return; }
          const elapsed = (performance.now() - start) / 1000;
          timerLeft = Math.max(0, D.time - elapsed);
          if (timerEl && D.time - elapsed <= 2) timerEl.classList.add('warn');
          if (elapsed >= D.time) {
            clearInterval(timerId);
            onTimeout();
          }
        }, tick);
      }

      function onAnswer(idx, btn) {
        if (questionLocked) return;
        questionLocked = true;
        if (timerId) clearInterval(timerId);
        const opts = stage.querySelectorAll('.ct-option');
        // Find the option that matches the circle color
        const isRight = btn.textContent.trim() === circleEl.style.background ? false : false; // placeholder
        // Better: compare option text to correct color name from question — pull from data
        const picked = opts[idx]?.textContent.trim();
        const circleHex = circleEl.style.background; // browser may rgb() this
        // Resolve the correct color name by matching hex (lookup in COLORS)
        const correctColor = palette.find(c => normalizeColor(c.hex) === normalizeColor(circleHex));
        const correctName = correctColor?.name;
        const correctIdx = [...opts].findIndex(o => o.textContent.trim() === correctName);

        if (picked === correctName) {
          btn.classList.add('right');
          const bonus = D.time > 0 ? Math.round(timerLeft * 2) : 0;
          score += 10 + bonus;
          streak += 1;
          if (streak > 0 && streak % STREAK_BONUS_AT === 0) {
            score += STREAK_BONUS;
            toast(stage, `🔥 Streak +${STREAK_BONUS}`);
          }
          scoreEl.textContent = score;
          Audio.correct();
          setTimeout(nextQ, 600);
        } else {
          if (idx >= 0) btn.classList.add('wrong');
          if (correctIdx >= 0) opts[correctIdx].classList.add('right');
          streak = 0;
          lives -= 1;
          livesEl.textContent = lives > 0 ? '❤️'.repeat(lives) : '💔';
          Audio.wrong();
          if (lives <= 0) {
            setTimeout(() => endGame(false), 900);
          } else {
            setTimeout(nextQ, 900);
          }
        }
      }

      function onTimeout() {
        if (questionLocked) return;
        questionLocked = true;
        const opts = stage.querySelectorAll('.ct-option');
        const circleHex = circleEl.style.background;
        const correctColor = palette.find(c => normalizeColor(c.hex) === normalizeColor(circleHex));
        const correctName = correctColor?.name;
        const correctIdx = [...opts].findIndex(o => o.textContent.trim() === correctName);
        if (correctIdx >= 0) opts[correctIdx].classList.add('right');
        streak = 0;
        lives -= 1;
        livesEl.textContent = lives > 0 ? '❤️'.repeat(lives) : '💔';
        Audio.wrong();
        if (lives <= 0) setTimeout(() => endGame(false), 900);
        else setTimeout(nextQ, 900);
      }

      function endGame(won) {
        if (cancelled) return;
        if (timerId) clearInterval(timerId);
        const stars = won ? 3 : score >= 100 ? 2 : score >= 30 ? 1 : 0;
        Storage.addStars(stars);
        Storage.setLevelScore(2, score);
        if (won) Audio.win();
        showDone({
          title: won ? 'Round Cleared!' : 'Out of Lives',
          stars,
          summary: `Score ${score} · ${qIdx}/${MAX_QUESTIONS} questions · Lifetime ⭐ ${Storage.getStars()}`,
          onAgain: () => colorTrap.start(stage, { onExit, showDone }),
          onNext: () => onExit({ next: true }),
          onHome: () => onExit({ home: true })
        });
      }

      nextQ();
    }
  }
};

// helpers
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Browser may serialize background as rgb(...) — normalize for compare
function normalizeColor(c) {
  if (!c) return '';
  if (c.startsWith('#')) return hexToRgb(c);
  return c.replace(/\s+/g, '').toLowerCase();
}
function hexToRgb(hex) {
  const m = hex.replace('#', '').match(/.{2}/g);
  if (!m || m.length !== 3) return hex.toLowerCase();
  return `rgb(${parseInt(m[0],16)},${parseInt(m[1],16)},${parseInt(m[2],16)})`;
}

function toast(stage, msg) {
  const el = document.createElement('div');
  el.className = 'toast good';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}
