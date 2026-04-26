// Activity 2: Color Trap (Stroop test) — TWO modes mixed:
//   Mode A: big colored circle → 4 color-name buttons (mismatched ink).
//           Tap the WORD that matches the circle's color.
//   Mode B: a color-name word in mismatched ink → 4 color circles.
//           Tap the CIRCLE whose color matches the WORD (read it, ignore ink).
// 12-color kid-friendly palette. 3 lives, 20 questions per round.

import { Audio } from '../audio.js';
import { Storage } from '../storage.js';

const COLORS = [
  { name: 'Red',    hex: '#E63946' },
  { name: 'Blue',   hex: '#3B82F6' },
  { name: 'Yellow', hex: '#FBBF24' },
  { name: 'Green',  hex: '#22C55E' },
  { name: 'Orange', hex: '#FB923C' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Pink',   hex: '#EC4899' },
  { name: 'Brown',  hex: '#92400E' },
  { name: 'Black',  hex: '#1F2937' },
  { name: 'White',  hex: '#F8FAFC' },
  { name: 'Gray',   hex: '#6B7280' },
  { name: 'Gold',   hex: '#D4A019' }
];

const DIFFICULTY = {
  practice: { label: 'Practice', options: 3, time: 0,  count: 6,  desc: 'No timer' },
  easy:     { label: 'Easy',     options: 3, time: 8,  count: 6,  desc: '3 options · 8s · 6 colors' },
  medium:   { label: 'Medium',   options: 3, time: 6,  count: 8,  desc: '3 options · 6s · 8 colors' },
  hard:     { label: 'Hard',     options: 4, time: 5,  count: 12, desc: '4 options · 5s · 12 colors' },
  expert:   { label: 'Expert',   options: 4, time: 4,  count: 12, desc: '4 options · 4s · all 12' }
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
  desc: 'Tap the right color',
  ageHint: 'Age 6+',
  guide: 'Two challenges mixed: sometimes a colored circle appears with mismatched-ink color words below — tap the WORD that names the circle\'s color. Sometimes a color word appears in mismatched ink with circles below — tap the CIRCLE whose color matches the WORD. Always read carefully, ignore the ink color!',
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
      let currentCorrect = null; // { name, hex }

      stage.innerHTML = `
        <div class="ct-root">
          <div class="ct-hud">
            <div class="hud-pill"><span class="hud-label">SCORE</span><span class="hud-value" id="ct-score">0</span></div>
            <div class="hud-pill"><span class="hud-label">LIVES</span><span class="hud-value" id="ct-lives">❤️❤️❤️</span></div>
            <div class="hud-pill"><span class="hud-label">Q</span><span class="hud-value" id="ct-q">1/${MAX_QUESTIONS}</span></div>
          </div>
          <div id="ct-prompt" class="ct-prompt-area"></div>
          ${D.time > 0 ? `<div class="ct-timer-track"><div class="ct-timer-fill" id="ct-timer"></div></div>` : ''}
          <div class="ct-options" id="ct-options"></div>
          <div id="ct-hint" style="text-align:center;font-size:12px;color:var(--ink-soft)"></div>
        </div>
      `;

      const promptArea = stage.querySelector('#ct-prompt');
      const scoreEl    = stage.querySelector('#ct-score');
      const livesEl    = stage.querySelector('#ct-lives');
      const qEl        = stage.querySelector('#ct-q');
      const timerEl    = stage.querySelector('#ct-timer');
      const optsEl     = stage.querySelector('#ct-options');
      const hintEl     = stage.querySelector('#ct-hint');

      function nextQ() {
        if (cancelled) return;
        if (qIdx >= MAX_QUESTIONS) return endGame(true);
        qIdx += 1;
        qEl.textContent = `${qIdx}/${MAX_QUESTIONS}`;
        questionLocked = false;

        // Pick correct color and distractors
        currentCorrect = palette[Math.floor(Math.random() * palette.length)];
        const others = palette.filter(c => c.name !== currentCorrect.name);
        const distractors = shuffle(others).slice(0, D.options - 1);
        const opts = shuffle([currentCorrect, ...distractors]);

        // Pick mode at random — both train Stroop override
        const mode = Math.random() < 0.5 ? 'A' : 'B';

        if (mode === 'A') renderModeA(opts);
        else              renderModeB(opts);
        startTimer();
      }

      function renderModeA(opts) {
        // Big colored circle. Options are WORDS in mismatched ink.
        promptArea.innerHTML = `
          <div class="ct-circle" style="background:${currentCorrect.hex};${currentCorrect.name === 'White' ? 'border:4px solid #d8d8e8;' : ''}"></div>
        `;
        hintEl.textContent = 'Tap the WORD that names this color. Ignore the ink!';
        optsEl.className = 'ct-options' + (D.options === 4 ? ' four' : '');
        optsEl.innerHTML = opts.map((opt, i) => {
          let ink;
          do { ink = COLORS[Math.floor(Math.random() * COLORS.length)]; }
          while (ink.name === opt.name);
          return `<button class="ct-option" data-name="${opt.name}" style="color:${ink.hex}">${opt.name}</button>`;
        }).join('');
        optsEl.querySelectorAll('.ct-option').forEach(b => {
          b.onclick = () => onAnswer(b.dataset.name === currentCorrect.name, b);
        });
      }

      function renderModeB(opts) {
        // A color WORD in mismatched ink. Options are color CIRCLES.
        let ink;
        do { ink = COLORS[Math.floor(Math.random() * COLORS.length)]; }
        while (ink.name === currentCorrect.name);
        promptArea.innerHTML = `
          <div class="ct-word-prompt" style="color:${ink.hex}">${currentCorrect.name}</div>
        `;
        hintEl.textContent = 'Read the WORD. Tap the matching color circle!';
        optsEl.className = 'ct-options circles' + (D.options === 4 ? ' four' : '');
        optsEl.innerHTML = opts.map(opt => `
          <button class="ct-circle-opt" data-name="${opt.name}"
            style="background:${opt.hex};${opt.name === 'White' ? 'border:3px solid #d8d8e8;' : ''}"
            aria-label="${opt.name}"></button>
        `).join('');
        optsEl.querySelectorAll('.ct-circle-opt').forEach(b => {
          b.onclick = () => onAnswer(b.dataset.name === currentCorrect.name, b);
        });
      }

      function startTimer() {
        if (timerId) clearInterval(timerId);
        if (D.time === 0) { timerEl && (timerEl.style.width = '100%'); return; }
        timerLeft = D.time;
        if (timerEl) {
          timerEl.style.transition = 'none';
          timerEl.style.width = '100%';
          timerEl.classList.remove('warn');
          requestAnimationFrame(() => {
            timerEl.style.transition = `width ${D.time}s linear`;
            timerEl.style.width = '0%';
          });
        }
        const start = performance.now();
        timerId = setInterval(() => {
          if (cancelled) { clearInterval(timerId); return; }
          const elapsed = (performance.now() - start) / 1000;
          timerLeft = Math.max(0, D.time - elapsed);
          if (timerEl && D.time - elapsed <= 2) timerEl.classList.add('warn');
          if (elapsed >= D.time) { clearInterval(timerId); onTimeout(); }
        }, 100);
      }

      function onAnswer(isRight, btn) {
        if (questionLocked) return;
        questionLocked = true;
        if (timerId) clearInterval(timerId);
        const opts = stage.querySelectorAll('.ct-option, .ct-circle-opt');

        if (isRight) {
          btn.classList.add('right');
          const bonus = D.time > 0 ? Math.round(timerLeft * 2) : 0;
          score += 10 + bonus;
          streak += 1;
          if (streak > 0 && streak % STREAK_BONUS_AT === 0) {
            score += STREAK_BONUS;
            toast(`🔥 Streak +${STREAK_BONUS}`);
          }
          scoreEl.textContent = score;
          Audio.correct();
          setTimeout(nextQ, 600);
        } else {
          btn.classList.add('wrong');
          // Highlight correct
          opts.forEach(o => {
            if (o.dataset.name === currentCorrect.name) o.classList.add('right');
          });
          streak = 0;
          lives -= 1;
          livesEl.textContent = lives > 0 ? '❤️'.repeat(lives) : '💔';
          Audio.wrong();
          if (lives <= 0) setTimeout(() => endGame(false), 900);
          else setTimeout(nextQ, 900);
        }
      }

      function onTimeout() {
        if (questionLocked) return;
        questionLocked = true;
        const opts = stage.querySelectorAll('.ct-option, .ct-circle-opt');
        opts.forEach(o => { if (o.dataset.name === currentCorrect.name) o.classList.add('right'); });
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

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast good';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}
