// Activity 11: Word Wheel — a calm, ZenWord-style speller for kids.
//   • A ring of big letter tiles at the bottom; empty slots on top (length = clue).
//   • Tap letters to spell. Each correct word reveals its English + Urdu meaning
//     (with 🔊 for both) and awards a star.
//   • 10 levels, easy → hard: L1–3 = 3-letter, L4–7 = 4-letter, L8–10 = 5-letter.
//   • Helpers: Shuffle (rearrange tiles) and Hint (reveal one letter). No timer.
// Self-managed custom level (like Color Trap): renders its own board + scoreboard
// and calls showDone() when a level is cleared.

import { Audio } from '../audio.js';
import { Storage } from '../storage.js';
import { WORD_WHEEL_LEVELS } from './wordwheel_data.js';

const PROGRESS_KEY = 'playglow:wordwheel'; // { "<level>": stars }
const STAR_PER_WORD = 10;

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); }
  catch { return {}; }
}
function saveLevelStars(level, stars) {
  const p = loadProgress();
  p[level] = Math.max(p[level] || 0, stars);
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

export const wordWheel = {
  id: 11,
  name: 'Word Wheel',
  emoji: '🎡',
  desc: 'Spell words, learn meanings',
  ageHint: 'Age 5+',
  guide: 'Tap the letters in the wheel to spell the hidden words. The empty boxes show how many letters each word has, and the picture is a clue. Spell a word right and you will see its English and Urdu meaning — tap 🔊 to hear it! Use Shuffle to move the letters around and Hint if you get stuck.',
  custom: true,

  start(stage, { onExit, showDone }) {
    showLevelPicker();

    // ---------- Level picker ----------
    function showLevelPicker() {
      const progress = loadProgress();
      stage.innerHTML = `
        <div class="ww-root">
          <div class="ww-pick-title">Pick a Level</div>
          <div class="ww-level-grid">
            ${WORD_WHEEL_LEVELS.map(lvl => {
              const stars = progress[lvl.level] || 0;
              return `
                <button class="ww-level-card" data-level="${lvl.level}">
                  <div class="ww-level-num">Level ${lvl.level}</div>
                  <div class="ww-level-len">${lvl.len}-letter words</div>
                  <div class="ww-level-stars">${stars ? '⭐'.repeat(stars) : '☆☆☆'}</div>
                </button>`;
            }).join('')}
          </div>
        </div>`;
      stage.querySelectorAll('.ww-level-card').forEach(b => {
        b.onclick = () => {
          Audio.arm();
          const lvl = WORD_WHEEL_LEVELS.find(l => l.level === parseInt(b.dataset.level, 10));
          playLevel(lvl);
        };
      });
    }

    // ---------- Play one level ----------
    function playLevel(lvl) {
      const found = new Set();          // en words already found
      let current = [];                 // [{ ch, tileIdx }]
      let hintsUsed = 0;
      let locked = false;               // brief input lock during feedback
      let tiles = shuffle([...lvl.ring].map((ch, i) => ({ ch, id: i, used: false })));
      let tilePos = [];                 // {x,y}% per tile, for the connecting line
      let dragging = false;             // true while a press-and-drag trace is active

      stage.innerHTML = `
        <div class="ww-root">
          <div class="ww-hud">
            <div class="hud-pill"><span class="hud-label">LEVEL</span><span class="hud-value">${lvl.level}</span></div>
            <div class="hud-pill"><span class="hud-label">FOUND</span><span class="hud-value" id="ww-found">0/${lvl.words.length}</span></div>
          </div>
          <div class="ww-slots" id="ww-slots"></div>
          <div class="ww-current" id="ww-current"></div>
          <div class="ww-controls">
            <button class="ww-ctrl" id="ww-back" aria-label="Backspace">⌫</button>
            <button class="ww-ctrl" id="ww-clear">Clear</button>
            <button class="ww-ctrl" id="ww-shuffle">🔀 Shuffle</button>
            <button class="ww-ctrl ww-hint" id="ww-hint">💡 Hint</button>
          </div>
          <div class="ww-wheel" id="ww-wheel"></div>
        </div>`;

      const slotsEl   = stage.querySelector('#ww-slots');
      const currentEl = stage.querySelector('#ww-current');
      const wheelEl   = stage.querySelector('#ww-wheel');
      const foundEl   = stage.querySelector('#ww-found');

      stage.querySelector('#ww-back').onclick    = backspace;
      stage.querySelector('#ww-clear').onclick   = clearCurrent;
      stage.querySelector('#ww-shuffle').onclick = () => { clearCurrent(); tiles = shuffle(tiles); renderWheel(); };
      stage.querySelector('#ww-hint').onclick    = useHint;

      renderSlots(); renderCurrent(); renderWheel();

      function renderSlots() {
        slotsEl.innerHTML = lvl.words.map(w => {
          const isFound = found.has(w.en);
          const boxes = [...w.en].map(ch =>
            `<span class="ww-box${isFound ? ' filled' : ''}">${isFound ? esc(ch) : ''}</span>`
          ).join('');
          const meaning = isFound
            ? `<div class="ww-meaning">
                 <button class="ww-say" data-say="${esc(w.en)}" data-lang="en" aria-label="Hear English">🔊</button>
                 <span class="ww-en">${esc(w.en)}</span>
                 <span class="ww-dot">·</span>
                 <span class="ww-ur" dir="rtl">${esc(w.ur)}</span>
                 <button class="ww-say" data-say="${esc(w.ur)}" data-lang="ur" aria-label="Hear Urdu">🔊</button>
               </div>`
            : '';
          return `
            <div class="ww-slot-row${isFound ? ' found' : ''}">
              <span class="ww-clue">${w.emoji}</span>
              <span class="ww-boxes">${boxes}</span>
              ${meaning}
            </div>`;
        }).join('');
        slotsEl.querySelectorAll('.ww-say').forEach(b => {
          b.onclick = () => Audio.speak(b.dataset.say, b.dataset.lang);
        });
      }

      function renderCurrent() {
        currentEl.innerHTML = current.length
          ? current.map(c => `<span class="ww-cur-tile">${esc(c.ch)}</span>`).join('')
          : `<span class="ww-cur-hint">Tap or swipe letters to spell</span>`;
      }

      function renderWheel() {
        const n = tiles.length;
        const R = 40; // % radius within the square wheel
        tilePos = [];
        const btns = tiles.map((t, i) => {
          const angle = (i / n) * 2 * Math.PI - Math.PI / 2; // start at top
          const x = 50 + R * Math.cos(angle);
          const y = 50 + R * Math.sin(angle);
          tilePos[i] = { x, y };
          return `<button class="ww-tile${t.used ? ' used' : ''}" data-idx="${i}"
                    style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%">${esc(t.ch)}</button>`;
        }).join('');
        // SVG line sits under the tiles and connects the letters as they're traced.
        wheelEl.innerHTML =
          `<svg class="ww-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
             <polyline id="ww-line" points="" /></svg>` + btns;
        drawLines();
      }

      function drawLines() {
        const line = wheelEl.querySelector('#ww-line');
        if (!line) return;
        line.setAttribute('points',
          current.map(c => tilePos[c.tileIdx]).filter(Boolean)
                 .map(p => `${p.x},${p.y}`).join(' '));
      }

      // Add one letter (used by tap, drag, and hint). Guards against re-use and
      // the brief lock during found/wrong feedback.
      function addTile(idx) {
        if (locked) return;
        const t = tiles[idx];
        if (!t || t.used) return;
        t.used = true;
        current.push({ ch: t.ch, tileIdx: idx });
        renderCurrent(); renderWheel();
        checkCurrent();
      }

      // ---- Pointer input: tap a tile, or press-and-drag a line across tiles ----
      function tileIdxAt(x, y) {
        const el = document.elementFromPoint(x, y);
        const tile = el && el.closest ? el.closest('.ww-tile') : null;
        if (!tile || !wheelEl.contains(tile)) return -1;
        return parseInt(tile.dataset.idx, 10);
      }
      wheelEl.addEventListener('pointerdown', (e) => {
        const idx = tileIdxAt(e.clientX, e.clientY);
        if (idx === -1) return;
        dragging = true;
        try { wheelEl.setPointerCapture(e.pointerId); } catch {}
        e.preventDefault();
        addTile(idx);
      });
      wheelEl.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const idx = tileIdxAt(e.clientX, e.clientY);
        if (idx !== -1) { e.preventDefault(); addTile(idx); }
      });
      const endDrag = (e) => {
        dragging = false;
        try { wheelEl.releasePointerCapture(e.pointerId); } catch {}
      };
      wheelEl.addEventListener('pointerup', endDrag);
      wheelEl.addEventListener('pointercancel', endDrag);

      function backspace() {
        if (locked || !current.length) return;
        const last = current.pop();
        if (tiles[last.tileIdx]) tiles[last.tileIdx].used = false;
        renderCurrent(); renderWheel();
      }

      function clearCurrent() {
        current.forEach(c => { if (tiles[c.tileIdx]) tiles[c.tileIdx].used = false; });
        current = [];
        renderCurrent(); renderWheel();
      }

      function word() { return current.map(c => c.ch).join(''); }

      function checkCurrent() {
        const w = word();
        const match = lvl.words.find(t => !found.has(t.en) && t.en === w);
        if (match) return onWordFound(match);
        if (w.length >= lvl.len) return onWrong();
      }

      function onWordFound(w) {
        locked = true;
        found.add(w.en);
        Audio.correct();
        Storage.addStars(1);
        Storage.setLevelScore(11, found.size * STAR_PER_WORD);
        renderSlots();
        foundEl.textContent = `${found.size}/${lvl.words.length}`;
        // Announce English then Urdu meaning.
        Audio.speakSequence([{ text: w.en, lang: 'en' }, { text: w.ur, lang: 'ur' }]);
        setTimeout(() => {
          current = [];
          tiles.forEach(t => t.used = false);
          renderCurrent(); renderWheel();
          locked = false;
          if (found.size === lvl.words.length) finishLevel();
        }, 700);
      }

      function onWrong() {
        locked = true;
        Audio.wrong();
        currentEl.classList.add('shake');
        setTimeout(() => {
          currentEl.classList.remove('shake');
          clearCurrent();
          locked = false;
        }, 450);
      }

      function useHint() {
        if (locked) return;
        // Prefer completing the word the current letters already start.
        const w = word();
        let target = lvl.words.find(t => !found.has(t.en) && t.en.startsWith(w) && w.length < t.en.length);
        if (!target) {
          // Restart toward the first unfound word.
          target = lvl.words.find(t => !found.has(t.en));
          if (!target) return;
          clearCurrent();
        }
        const nextChar = target.en[current.length];
        const idx = tiles.findIndex(t => !t.used && t.ch === nextChar);
        if (idx === -1) return;
        hintsUsed += 1;
        addTile(idx);
      }

      function finishLevel() {
        const stars = hintsUsed === 0 ? 3 : hintsUsed <= 2 ? 2 : 1;
        saveLevelStars(lvl.level, stars);
        Storage.addStars(stars); // bonus for clearing
        Audio.win();
        const nextLvl = WORD_WHEEL_LEVELS.find(l => l.level === lvl.level + 1);
        showDone({
          title: 'Level Cleared!',
          stars,
          summary: `Level ${lvl.level} done · ${lvl.words.length} words · ${hintsUsed} hint${hintsUsed === 1 ? '' : 's'} · Lifetime ⭐ ${Storage.getStars()}`,
          onAgain: () => { showScreenGame(); playLevel(lvl); },
          onNext: nextLvl ? () => { showScreenGame(); playLevel(nextLvl); } : () => { showScreenGame(); showLevelPicker(); },
          onHome: () => onExit({ home: true })
        });
      }
    }

    // showDone switches to #done-screen; Play Again / Next must switch back first.
    function showScreenGame() {
      document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
      document.getElementById('game-screen').classList.remove('hidden');
    }
  }
};
