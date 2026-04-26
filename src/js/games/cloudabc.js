// Activity 2: Cloud ABC (learning version)
// Show a CAPITAL target letter at top. 4 LOWERCASE letters drift down slowly
// from clouds. Kid taps the lowercase that matches the capital.
//   right tap  → +1 right, next round
//   wrong tap  → +1 wrong, next round
//   5 rights → advance to next series (A-F → A-J → A-Z)
//   5 wrongs → game over, replay
// Letters fall to a rest-line near the ground and stay there until tapped —
// no time pressure, this is a recognition game.

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
const FALL_PX_PER_S = 28;     // gentle — kid has time to read all 4
const REST_FRACTION = 0.72;   // letters stop at 72% of stage height

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
    let target = '';        // current capital letter
    let letters = [];       // { id, char, x, y, restY, el, settled }
    let lastTs = performance.now();
    let nextLetterId = 0;
    let roundLocked = false;

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
      letters.forEach(l => l.el.remove());
      letters = [];
    }

    function pickRound() {
      const pool = SERIES[seriesIdx].letters;
      target = pool[Math.floor(Math.random() * pool.length)];
      targetEl.textContent = target;
      // 4 falling letters: 1 correct + 3 distractors
      const distractors = pool.filter(L => L !== target);
      // Fisher-Yates
      for (let i = distractors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [distractors[i], distractors[j]] = [distractors[j], distractors[i]];
      }
      const choices = [target, ...distractors.slice(0, 3)];
      // shuffle final 4
      for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
      }
      spawnLetters(choices);
      Audio.speak(target, 'en');
    }

    function spawnLetters(chars) {
      clearLetters();
      const W = sky.clientWidth || 320;
      const H = sky.clientHeight || 360;
      const restY = H * REST_FRACTION;
      // Distribute across width
      const slots = chars.length;
      const slotW = W / slots;
      chars.forEach((char, i) => {
        const id = ++nextLetterId;
        const x = i * slotW + slotW / 2 - 27 + (Math.random() * 30 - 15);
        const col = COLOR_MAP[char];
        const el = document.createElement('button');
        el.className = 'ca-letter';
        el.dataset.id = id;
        el.textContent = char.toLowerCase();
        el.style.background = col.bg;
        el.style.color = col.text;
        if (char === 'W') el.style.border = '2px solid #d8d8e8';
        el.style.transform = `translate(${x}px, -60px)`;
        el.onclick = () => onPick(char, el);
        sky.appendChild(el);
        letters.push({ id, char, x, y: -60, restY, el, settled: false });
      });
    }

    function onPick(char, el) {
      // If this letter is already settled-as-tried, ignore re-tap
      if (el.dataset.tried === '1') return;
      // Round-lock only applies to the brief end-of-round window after a CORRECT pick
      if (roundLocked) return;

      const isRight = char === target;
      const letterObj = letters.find(l => l.el === el);

      // Freeze this letter in place so the rAF loop stops moving it (otherwise
      // the inline transform we set every frame overrides the CSS animation).
      if (letterObj) letterObj.frozen = true;
      el.dataset.tried = '1';

      if (isRight) {
        roundLocked = true;
        letters.forEach(l => { l.frozen = true; });
        // Inline animation that respects the letter's current x,y position
        const lx = letterObj?.x ?? 0;
        const ly = letterObj?.y ?? 0;
        el.style.transition = 'transform 0.5s cubic-bezier(.34,1.56,.64,1), opacity 0.5s ease, box-shadow 0.3s ease';
        el.style.boxShadow = '0 0 0 8px rgba(76, 175, 80, 0.45), 0 4px 0 rgba(0,0,0,0.18)';
        el.style.transform = `translate(${lx}px, ${ly - 30}px) scale(1.5)`;
        setTimeout(() => { el.style.opacity = '0'; }, 200);
        Audio.speak(char, 'en');
        Audio.correct();
        rights += 1;
        rightEl.textContent = `${rights}/${TARGET_RIGHTS}`;
        setTimeout(() => {
          if (cancelled) return;
          if (rights >= TARGET_RIGHTS) return advance();
          roundLocked = false;
          pickRound();
        }, 900);
      } else {
        // WRONG: don't advance. Disable this letter; others keep falling
        // and stay tappable. Kid keeps trying until they pick correctly.
        el.style.pointerEvents = 'none';
        el.style.transition = 'opacity 0.5s ease, box-shadow 0.3s ease';
        el.style.boxShadow = '0 0 0 6px rgba(255, 90, 90, 0.5), 0 4px 0 rgba(0,0,0,0.18)';
        setTimeout(() => {
          el.style.opacity = '0.35';
          el.style.boxShadow = '0 4px 0 rgba(0,0,0,0.18), inset 0 -3px 0 rgba(0,0,0,0.10)';
        }, 350);
        Audio.wrong();
        wrongs += 1;
        wrongEl.textContent = `${wrongs}/${TARGET_WRONGS}`;
        if (wrongs >= TARGET_WRONGS) {
          roundLocked = true;
          // Highlight the correct letter so kid sees what was right
          const correctEl = letters.find(l => l.char === target)?.el;
          if (correctEl) {
            correctEl.style.boxShadow = '0 0 0 8px rgba(76, 175, 80, 0.5), 0 4px 0 rgba(0,0,0,0.18)';
          }
          setTimeout(() => { if (!cancelled) endGame(false); }, 1100);
        }
      }
    }

    function advance() {
      if (seriesIdx + 1 >= SERIES.length) return endGame(true);
      seriesIdx += 1;
      rights = 0; wrongs = 0; roundLocked = false;
      seriesEl.textContent = SERIES[seriesIdx].name;
      rightEl.textContent = `0/${TARGET_RIGHTS}`;
      wrongEl.textContent = `0/${TARGET_WRONGS}`;
      Audio.win();
      // brief celebration
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

    function tick(ts) {
      if (cancelled) return;
      if (!document.body.contains(root)) { cancelled = true; return; }
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;

      letters.forEach(l => {
        // Frozen = letter was clicked; CSS animation owns its transform now.
        // Settled = letter has reached the rest line, no need to keep updating.
        if (l.frozen || l.settled) return;
        l.y += FALL_PX_PER_S * dt;
        if (l.y >= l.restY) {
          l.y = l.restY;
          l.settled = true;
        }
        l.el.style.transform = `translate(${l.x}px, ${l.y}px)`;
      });

      requestAnimationFrame(tick);
    }

    // Kick off
    requestAnimationFrame((ts) => {
      lastTs = ts;
      pickRound();
      tick(ts);
    });
  }
};
