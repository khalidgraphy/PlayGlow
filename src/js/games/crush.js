// Shared match-3 engine for all "ABC Crush" levels.
// Each level supplies its letter pool (e.g. A-F) + scoring config.
// Game rules (intentionally classic Candy Crush):
//   - Tap two adjacent tiles to swap.
//   - If swap creates 3-in-a-row of same letter, matches clear, tiles cascade.
//   - If no match, swap reverts with a shake.
//   - Match speaks the letter aloud + plays a chime.
//   - Hit target score before moves run out = win.

import { Audio } from '../audio.js';
import { Storage } from '../storage.js';
import { toast } from '../engine.js';

const ROWS = 7, COLS = 6;

// Each letter has its own colour + a contrast-safe text shade.
export const COLOR_MAP = {
  A: { name: 'Amber',       bg: '#FFBF00', text: '#3a2d00' },
  B: { name: 'Blue',        bg: '#2196F3', text: '#fff'    },
  C: { name: 'Coral',       bg: '#FF7F50', text: '#fff'    },
  D: { name: 'Denim',       bg: '#1560BD', text: '#fff'    },
  E: { name: 'Emerald',     bg: '#50C878', text: '#fff'    },
  F: { name: 'Fuchsia',     bg: '#E040FB', text: '#fff'    },

  G: { name: 'Gold',        bg: '#FFD700', text: '#3a2d00' },
  H: { name: 'Honey',       bg: '#FFB300', text: '#3a2d00' },
  I: { name: 'Indigo',      bg: '#4B0082', text: '#fff'    },
  J: { name: 'Jade',        bg: '#00A86B', text: '#fff'    },
  K: { name: 'Khaki',       bg: '#C3B091', text: '#3a2d00' },
  L: { name: 'Lavender',    bg: '#B57EDC', text: '#fff'    },

  M: { name: 'Mint',        bg: '#98FF98', text: '#1f3d1f' },
  N: { name: 'Navy',        bg: '#001F5C', text: '#fff'    },
  O: { name: 'Orange',      bg: '#FFA500', text: '#3a2d00' },
  P: { name: 'Pink',        bg: '#FF69B4', text: '#fff'    },
  Q: { name: 'Quartz',      bg: '#F0DDF4', text: '#5a3a5e' },
  R: { name: 'Red',         bg: '#FF3B30', text: '#fff'    },

  S: { name: 'Sky Blue',    bg: '#87CEEB', text: '#1a3a4a' },
  T: { name: 'Teal',        bg: '#008080', text: '#fff'    },
  U: { name: 'Ultramarine', bg: '#3F00FF', text: '#fff'    },
  V: { name: 'Violet',      bg: '#8F00FF', text: '#fff'    },
  W: { name: 'White',       bg: '#FAFAFA', text: '#2D2A4A' },
  X: { name: 'Xanadu',      bg: '#738678', text: '#fff'    },
  Y: { name: 'Yellow',      bg: '#FFEB3B', text: '#3a2d00' },
  Z: { name: 'Zaffre',      bg: '#0014A8', text: '#fff'    },

  // Numbers — used by sub-packs 1.5 (0-9) and 1.6 (0-9 + A-Z)
  '0': { name: 'Navy',    bg: '#002B5C', text: '#fff'    },
  '1': { name: 'Red',     bg: '#E53935', text: '#fff'    },
  '2': { name: 'Orange',  bg: '#FB8C00', text: '#3a2d00' },
  '3': { name: 'Sun',     bg: '#FBC02D', text: '#3a2d00' },
  '4': { name: 'Green',   bg: '#43A047', text: '#fff'    },
  '5': { name: 'Teal',    bg: '#00897B', text: '#fff'    },
  '6': { name: 'Purple',  bg: '#8E24AA', text: '#fff'    },
  '7': { name: 'Pink',    bg: '#EC407A', text: '#fff'    },
  '8': { name: 'Brown',   bg: '#6D4C41', text: '#fff'    },
  '9': { name: 'Indigo',  bg: '#3949AB', text: '#fff'    }
};

export function makeCrushLevel(cfg) {
  return {
    id: cfg.id,
    label: cfg.label,             // shown as "1.1" badge on sub-cards
    parentId: cfg.parentId,
    name: cfg.name,
    emoji: cfg.emoji,
    desc: cfg.desc,
    ageHint: cfg.ageHint,
    guide: cfg.guide,
    letters: cfg.letters,         // exposed so sub-picker can render color preview
    target: cfg.target ?? 100,
    moves: cfg.moves ?? 30,
    custom: true,
    start(stage, { onExit, showDone }) {
      runCrush({
        stage, onExit, showDone,
        letters: cfg.letters,
        moves: cfg.moves ?? 30,
        target: cfg.target ?? 100,
        level: { id: cfg.id, name: cfg.name }
      });
    }
  };
}

// ---------- runtime ----------
function runCrush({ stage, onExit, showDone, letters, moves, target, level }) {
  let grid;
  let selected = null;
  let score = 0;
  let movesLeft = moves;
  let busy = false;

  function rndLetter() { return letters[Math.floor(Math.random() * letters.length)]; }

  function findMatches() {
    const m = new Set();
    for (let r = 0; r < ROWS; r++) {
      let run = 1;
      for (let c = 1; c <= COLS; c++) {
        const same = c < COLS && grid[r][c] && grid[r][c] === grid[r][c - 1];
        if (same) run++;
        else {
          if (run >= 3) for (let k = 1; k <= run; k++) m.add(`${r},${c - k}`);
          run = 1;
        }
      }
    }
    for (let c = 0; c < COLS; c++) {
      let run = 1;
      for (let r = 1; r <= ROWS; r++) {
        const same = r < ROWS && grid[r][c] && grid[r][c] === grid[r - 1][c];
        if (same) run++;
        else {
          if (run >= 3) for (let k = 1; k <= run; k++) m.add(`${r - k},${c}`);
          run = 1;
        }
      }
    }
    return m;
  }

  function init() {
    grid = Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => rndLetter()));
    ensurePlayable();
  }

  // Try every possible adjacent swap; return true if any creates a match.
  function hasMove() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (c + 1 < COLS) {
          swap({ r, c }, { r, c: c + 1 });
          const ok = findMatches().size > 0;
          swap({ r, c }, { r, c: c + 1 });
          if (ok) return true;
        }
        if (r + 1 < ROWS) {
          swap({ r, c }, { r: r + 1, c });
          const ok = findMatches().size > 0;
          swap({ r, c }, { r: r + 1, c });
          if (ok) return true;
        }
      }
    }
    return false;
  }

  // Re-roll cells until the board is both match-free AND has at least one move.
  // Fall back to a full re-randomise if stuck after many tries (rare).
  function ensurePlayable() {
    for (let attempt = 0; attempt < 8; attempt++) {
      let safety = 0;
      while (findMatches().size && safety++ < 30) {
        findMatches().forEach(k => {
          const [r, c] = k.split(',').map(Number);
          grid[r][c] = rndLetter();
        });
      }
      if (hasMove()) return;
      // No moves: full re-randomise and retry
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) grid[r][c] = rndLetter();
    }
  }

  function shuffleBoard() {
    // Collect existing letters, shuffle, redistribute — preserves the pack
    const all = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) if (grid[r][c]) all.push(grid[r][c]);
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    let i = 0;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) grid[r][c] = all[i++] || rndLetter();
    ensurePlayable();
  }

  function swap(a, b) {
    const t = grid[a.r][a.c];
    grid[a.r][a.c] = grid[b.r][b.c];
    grid[b.r][b.c] = t;
  }

  function cascade() {
    for (let c = 0; c < COLS; c++) {
      let writeR = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (grid[r][c] !== null) {
          const t = grid[r][c];
          grid[r][c] = null;
          grid[writeR][c] = t;
          writeR--;
        }
      }
      for (let r = writeR; r >= 0; r--) grid[r][c] = rndLetter();
    }
  }

  async function clearLoop() {
    busy = true;
    while (true) {
      const matches = findMatches();
      if (!matches.size) break;
      const cells = [...matches];
      score += cells.length * 5;

      const counts = {};
      cells.forEach(k => {
        const [r, c] = k.split(',').map(Number);
        const L = grid[r][c];
        counts[L] = (counts[L] || 0) + 1;
      });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      Audio.speak(top, 'en');
      Audio.correct();

      // Animate the matched tiles fading + shrinking before we mutate the grid
      cells.forEach(k => {
        const [r, c] = k.split(',').map(Number);
        const el = stage.querySelector(`.crush-tile[data-r="${r}"][data-c="${c}"]`);
        if (el) el.classList.add('clearing');
      });
      await sleep(260);

      cells.forEach(k => {
        const [r, c] = k.split(',').map(Number);
        grid[r][c] = null;
      });
      render();
      await sleep(60);
      cascade();
      render();
      await sleep(160);
    }
    // After everything settles, make sure at least one move exists.
    // If not, gently auto-shuffle so the kid is never stuck.
    if (!hasMove() && movesLeft > 0) {
      toast('No moves left — shuffling!', 'good');
      await sleep(900);
      shuffleBoard();
      render();
    }
    busy = false;
    checkEnd();
  }

  // Manual shuffle (HUD button). Free, no penalty — kid-friendly.
  async function manualShuffle() {
    if (busy) return;
    busy = true;
    toast('Shuffling…', 'good');
    await sleep(300);
    shuffleBoard();
    render();
    busy = false;
  }

  async function tap(r, c) {
    if (busy) return;
    if (!selected) { selected = { r, c }; render(); return; }
    if (selected.r === r && selected.c === c) { selected = null; render(); return; }
    const adj = Math.abs(selected.r - r) + Math.abs(selected.c - c) === 1;
    if (!adj) { selected = { r, c }; render(); return; }
    const from = selected;
    selected = null;
    render();              // clear selection highlight before animating
    await trySwap(from, { r, c });
  }

  function shake(p) {
    const el = stage.querySelector(`.crush-tile[data-r="${p.r}"][data-c="${p.c}"]`);
    if (el) {
      el.classList.add('shake');
      setTimeout(() => el.classList.remove('shake'), 400);
    }
  }

  // Core swap: animate the two tiles toward each other, then commit.
  // If invalid, animate them back. Used by both drag and tap-tap paths.
  async function trySwap(a, b) {
    if (busy) return;
    busy = true;

    const elA = stage.querySelector(`.crush-tile[data-r="${a.r}"][data-c="${a.c}"]`);
    const elB = stage.querySelector(`.crush-tile[data-r="${b.r}"][data-c="${b.c}"]`);
    if (!elA || !elB) { busy = false; return; }

    const rectA = elA.getBoundingClientRect();
    const rectB = elB.getBoundingClientRect();
    const dx = rectB.left - rectA.left;
    const dy = rectB.top - rectA.top;

    // Animate toward neighbour
    elA.style.zIndex = '5';
    elB.style.zIndex = '5';
    elA.style.transition = 'transform 180ms ease';
    elB.style.transition = 'transform 180ms ease';
    elA.style.transform = `translate(${dx}px, ${dy}px)`;
    elB.style.transform = `translate(${-dx}px, ${-dy}px)`;
    await sleep(180);

    // Test the swap on the data
    swap(a, b);
    if (findMatches().size === 0) {
      // Invalid: swing back, no move spent
      swap(a, b);
      Audio.wrong();
      elA.style.transform = 'translate(0, 0)';
      elB.style.transform = 'translate(0, 0)';
      await sleep(180);
      busy = false;
      return;
    }

    // Valid swap — commit + cascade. render() rebuilds the DOM,
    // so the in-flight inline transforms get cleared automatically.
    movesLeft--;
    render();
    await clearLoop();
  }

  function checkEnd() {
    if (score >= target) finish(true);
    else if (movesLeft <= 0) finish(false);
  }

  function finish(won) {
    Storage.addStars(won ? 3 : 1);
    Storage.setLevelScore(level.id, score);
    if (won) Audio.win();
    showDone({
      title: won ? 'Smashed it!' : 'Game Over',
      stars: won ? 3 : score >= target / 2 ? 2 : 1,
      summary: `Score ${score} · Target ${target} · Lifetime ⭐ ${Storage.getStars()}`,
      onAgain: () => { score = 0; movesLeft = moves; selected = null; busy = false; init(); render(); },
      onNext: () => onExit({ next: true }),
      onHome: () => onExit({ home: true })
    });
  }

  function render() {
    stage.innerHTML = `
      <div class="crush-hud">
        <div class="hud-pill"><span class="hud-label">SCORE</span><span class="hud-value">${score}</span></div>
        <div class="hud-pill target"><span class="hud-label">TARGET</span><span class="hud-value">${target}</span></div>
        <div class="hud-pill ${movesLeft <= 5 ? 'warn' : ''}"><span class="hud-label">MOVES</span><span class="hud-value">${movesLeft}</span></div>
        <button class="hud-shuffle" id="shuffle-btn" aria-label="Shuffle board" title="Shuffle">🔀</button>
      </div>
      <div class="crush-grid" style="grid-template-columns:repeat(${COLS}, 1fr)">
        ${grid.map((row, r) => row.map((L, c) => {
          if (!L) return `<div class="crush-tile empty"></div>`;
          const sel = selected && selected.r === r && selected.c === c ? ' selected' : '';
          const col = COLOR_MAP[L];
          const style = `background:${col.bg};color:${col.text};${L === 'W' ? 'border:2px solid #d8d8e8;' : ''}`;
          return `<button class="crush-tile${sel}" data-r="${r}" data-c="${c}" style="${style}">${L}</button>`;
        }).join('')).join('')}
      </div>
      <div class="crush-hint">Drag or tap two side-by-side letters. Make 3 in a row to clear. Stuck? Tap 🔀.</div>
    `;
    // Tap-to-select fallback for kids who don't drag — same UX as before
    stage.querySelectorAll('.crush-tile[data-r]').forEach(btn => {
      btn.onclick = () => {
        if (suppressClick) { suppressClick = false; return; }
        tap(parseInt(btn.dataset.r, 10), parseInt(btn.dataset.c, 10));
      };
    });
    const sBtn = stage.querySelector('#shuffle-btn');
    if (sBtn) sBtn.onclick = manualShuffle;
  }

  // ---------- drag-to-swap (Pointer Events: covers iOS + Android + mouse) ----------
  // Uses event delegation on the stage so a single set of listeners survives
  // every render() that recreates the grid DOM.
  const DRAG_THRESHOLD = 12; // px before we commit to a swipe direction

  let drag = null;
  let suppressClick = false;

  function getCellFromEvent(e) {
    const tile = e.target.closest?.('.crush-tile[data-r]');
    if (!tile) return null;
    return {
      r: parseInt(tile.dataset.r, 10),
      c: parseInt(tile.dataset.c, 10),
      el: tile
    };
  }

  function onPointerDown(e) {
    if (busy) return;
    const cell = getCellFromEvent(e);
    if (!cell) return;
    drag = { startX: e.clientX, startY: e.clientY, r: cell.r, c: cell.c, moved: false };
    try { cell.el.setPointerCapture?.(e.pointerId); } catch {}
  }

  function onPointerMove(e) {
    if (!drag || drag.moved) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (adx < DRAG_THRESHOLD && ady < DRAG_THRESHOLD) return;

    drag.moved = true;
    suppressClick = true;
    let dr = 0, dc = 0;
    if (adx > ady) dc = dx > 0 ? 1 : -1;
    else            dr = dy > 0 ? 1 : -1;

    const target = { r: drag.r + dr, c: drag.c + dc };
    const start  = { r: drag.r, c: drag.c };
    drag = null;

    if (target.r < 0 || target.r >= ROWS || target.c < 0 || target.c >= COLS) return;
    selected = null;
    trySwap(start, target);
  }

  function onPointerEnd() { drag = null; }

  // AbortController lets a re-entered Crush level cleanly drop old listeners
  // (start() is called fresh each time we route in).
  abortCtrl?.abort();
  abortCtrl = new AbortController();
  const sig = abortCtrl.signal;
  stage.addEventListener('pointerdown',   onPointerDown, { signal: sig });
  stage.addEventListener('pointermove',   onPointerMove, { signal: sig });
  stage.addEventListener('pointerup',     onPointerEnd,  { signal: sig });
  stage.addEventListener('pointercancel', onPointerEnd,  { signal: sig });

  init();
  render();
}

// Module-level so successive runCrush calls can abort the previous listener set
let abortCtrl;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
