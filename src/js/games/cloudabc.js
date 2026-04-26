// Activity 2: Cloud ABC (CSS-transition version — no rAF, no animation wars)
// Show CAPITAL target. 4 LOWERCASE letters fall from clouds via a single CSS
// transition (~1.4s each). Once at rest they just sit there waiting for tap.
//   right tap  → +1 right, next round
//   wrong tap  → +1 wrong, that letter dims + becomes inert, others stay tappable
//   5 rights → next series (A-F → A-J → A-Z)
//   5 wrongs → game over

import { Audio } from '../audio.js';
import { Storage } from '../storage.js';
import { COLOR_MAP } from './crush.js';

const SERIES = [
  { name: 'A–F',     letters: 'ABCDEF'.split('') },
  { name: 'A–J',     letters: 'ABCDEFGHIJ'.split('') },
  { name: 'Full A–Z',letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('') }
];
const TARGET_RIGHTS = 5;
const TARGET_WRONGS = 5;
const FALL_MS = 1400;          // 1.4s smooth fall via CSS transition
const REST_FRACTION = 0.72;

let abortPrev = null;

export const cloudABC = {
  id: 2,
  name: 'Cloud ABC',
  emoji: '☁️',
  desc: 'Match the capital letter',
  ageHint: 'Age 4+',
  guide: 'A capital letter shows at the top. Four lowercase letters drift down. Tap the lowercase letter that matches the capital. Five right answers in a row → next series. Five wrong → try again.',
  custom: true,

  start(stage, { onExit, showDone }) {
    abortPrev?.();
    let cancelled = false;
    abortPrev = () => { cancelled = true; };

    let seriesIdx = 0;
    let rights = 0;
    let wrongs = 0;
    let target = '';
    let roundLocked = false;
    let nextLetterId = 0;

    stage.innerHTML = `
      <div class="cloudabc-root">
        <div class="ca-target-panel">
          <div class="ca-target-label">FIND THIS LETTER</div>
          <div class="ca-target" id="ca-target">A</div>
        </div>
        <div class="cloudabc-hud">
          <div class="hud-pill"><span class="hud-label">SERIES</span><span class="hud-value" id="ca-series">${SERIES[0].name}</span></div>
          <div class="hud-pill"><span class="hud-label">RIGHT</span><span class="hud-value" id="ca-right">0/${TARGET_RIGHTS}</span></div>
          <div class="hud-pill warn-bg-soft"><span class="hud-label">WRONG</span><span class="hud-value" id="ca-wrong">0/${TARGET_WRONGS}</span></div>
        </div>
        <div class="cloudabc-stage" id="ca-stage">
          <div class="ca-cloud ca-cloud-1">☁️</div>
          <div class="ca-cloud ca-cloud-2">☁️</div>
          <div class="ca-cloud ca-cloud-3">☁️</div>
          <div class="ca-ground"></div>
        </div>
        <div style="text-align:center;font-size:12px;color:var(--ink-soft)">Tap the lowercase letter that matches the capital above.</div>
      </div>
    `;

    const root = stage.querySelector('.cloudabc-root');
    const sky = stage.querySelector('#ca-stage');
    const targetEl = stage.querySelector('#ca-target');
    const seriesEl = stage.querySelector('#ca-series');
    const rightEl = stage.querySelector('#ca-right');
    const wrongEl = stage.querySelector('#ca-wrong');

    function clearLetters() {
      sky.querySelectorAll('.ca-letter').forEach(el => el.remove());
    }

    function pickRound() {
      if (cancelled) return;
      roundLocked = false;
      const pool = SERIES[seriesIdx].letters;
      target = pool[Math.floor(Math.random() * pool.length)];
      targetEl.textContent = target;
      const distractors = pool.filter(L => L !== target);
      shuffle(distractors);
      const choices = shuffle([target, ...distractors.slice(0, 3)]);
      spawnLetters(choices);
      Audio.speak(target, 'en');
    }

    function spawnLetters(chars) {
      clearLetters();
      const W = sky.clientWidth || 320;
      const H = sky.clientHeight || 360;
      const restY = Math.round(H * REST_FRACTION);
      const slotW = W / chars.length;

      chars.forEach((char, i) => {
        const id = ++nextLetterId;
        const x = Math.round(i * slotW + slotW / 2 - 25 + (Math.random() * 24 - 12));
        const col = COLOR_MAP[char];
        const el = document.createElement('button');
        el.className = 'ca-letter';
        el.dataset.id = id;
        el.dataset.char = char;
        el.textContent = char.toLowerCase();
        el.style.background = col.bg;
        el.style.color = col.text;
        if (char === 'W') el.style.border = '2px solid #d8d8e8';
        // Start above the stage
        el.style.transform = `translate(${x}px, -60px)`;
        el.style.transition = 'none';
        el.addEventListener('click', () => onPick(char, el));
        sky.appendChild(el);

        // Force reflow then trigger the smooth fall via CSS transition.
        // No rAF involved — browser handles the tween.
        requestAnimationFrame(() => {
          el.style.transition = `transform ${FALL_MS}ms cubic-bezier(.32,.72,.55,1), opacity 0.3s ease, box-shadow 0.3s ease`;
          el.style.transform = `translate(${x}px, ${restY}px)`;
        });
      });
    }

    function onPick(char, el) {
      if (roundLocked) return;
      if (el.dataset.tried === '1') return;
      el.dataset.tried = '1';

      if (char === target) {
        roundLocked = true;
        // Pop the right letter; freeze others (disable taps so kid can't keep tapping)
        sky.querySelectorAll('.ca-letter').forEach(l => { l.style.pointerEvents = 'none'; });
        // Keep its transition but boost it for the celebration
        const tr = el.style.transform; // current translate(x, restY)
        el.style.transition = 'transform 0.45s cubic-bezier(.34,1.56,.64,1), opacity 0.45s ease, box-shadow 0.3s ease';
        el.style.boxShadow = '0 0 0 8px rgba(76, 175, 80, 0.45), 0 4px 0 rgba(0,0,0,0.18)';
        // Bump it up + scale by adding to the existing translate
        el.style.transform = tr.replace(/translate\(([^,]+),\s*([^)]+)\)/, (_m, x, y) =>
          `translate(${x}, calc(${y} - 30px)) scale(1.5)`);
        setTimeout(() => { el.style.opacity = '0'; }, 250);
        Audio.speak(char, 'en');
        Audio.correct();
        rights += 1;
        rightEl.textContent = `${rights}/${TARGET_RIGHTS}`;
        setTimeout(() => {
          if (cancelled) return;
          if (rights >= TARGET_RIGHTS) return advance();
          pickRound();
        }, 900);
      } else {
        // WRONG: don't advance. Disable just this letter.
        el.style.transition = 'opacity 0.4s ease, box-shadow 0.3s ease';
        el.style.boxShadow = '0 0 0 6px rgba(255, 90, 90, 0.5), 0 4px 0 rgba(0,0,0,0.18)';
        el.style.pointerEvents = 'none';
        setTimeout(() => {
          el.style.opacity = '0.35';
          el.style.boxShadow = '0 4px 0 rgba(0,0,0,0.18), inset 0 -3px 0 rgba(0,0,0,0.10)';
        }, 380);
        Audio.wrong();
        wrongs += 1;
        wrongEl.textContent = `${wrongs}/${TARGET_WRONGS}`;
        if (wrongs >= TARGET_WRONGS) {
          roundLocked = true;
          sky.querySelectorAll('.ca-letter').forEach(l => { l.style.pointerEvents = 'none'; });
          const correctEl = sky.querySelector(`.ca-letter[data-char="${target}"]`);
          if (correctEl) correctEl.style.boxShadow = '0 0 0 8px rgba(76, 175, 80, 0.5), 0 4px 0 rgba(0,0,0,0.18)';
          setTimeout(() => { if (!cancelled) endGame(false); }, 1100);
        }
      }
    }

    function advance() {
      if (seriesIdx + 1 >= SERIES.length) return endGame(true);
      seriesIdx += 1;
      rights = 0; wrongs = 0;
      seriesEl.textContent = SERIES[seriesIdx].name;
      rightEl.textContent = `0/${TARGET_RIGHTS}`;
      wrongEl.textContent = `0/${TARGET_WRONGS}`;
      Audio.win();
      targetEl.textContent = '⭐';
      setTimeout(() => { if (!cancelled) pickRound(); }, 800);
    }

    function endGame(won) {
      if (cancelled) return;
      cancelled = true;
      const totalScore = seriesIdx * TARGET_RIGHTS + rights;
      const stars = won ? 3 : seriesIdx >= 1 ? 2 : seriesIdx === 0 && rights >= 3 ? 1 : 0;
      Storage.addStars(stars);
      Storage.setLevelScore(2, totalScore);
      if (won) Audio.win();
      showDone({
        title: won ? 'All series cleared!' : 'Try Again',
        stars,
        summary: `Series ${seriesIdx + 1}/${SERIES.length} · ${totalScore} right · Lifetime ⭐ ${Storage.getStars()}`,
        onAgain: () => cloudABC.start(stage, { onExit, showDone }),
        onNext: () => onExit({ next: true }),
        onHome: () => onExit({ home: true })
      });
    }

    // Watchdog: stop everything if the user navigates away (#stage gets replaced)
    const watchdog = setInterval(() => {
      if (cancelled) return clearInterval(watchdog);
      if (!document.body.contains(root)) { cancelled = true; clearInterval(watchdog); }
    }, 500);

    pickRound();
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
