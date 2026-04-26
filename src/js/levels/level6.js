// Level 6: ABC Crush (match-3 alphabet)
// Tap two adjacent tiles to swap. 3+ in a row clear, drop down, refill.
// 25 moves to hit target. Speaks the matched letter on every clear.

import { Audio } from '../audio.js';
import { Storage } from '../storage.js';

const ROWS = 7, COLS = 6;
const MOVES_START = 25;
const TARGET = 200;

// Weighted pool — vowels + common consonants more frequent (avoids dead boards)
const POOL = ('AAAEEEIIOOOU' + 'BCDFGHLMNPRSTW').split('');
function randomLetter() { return POOL[Math.floor(Math.random() * POOL.length)]; }

// Color group per letter (visual variety, kid-friendly palette)
function colorClass(L) {
  const idx = 'AEIOU'.includes(L) ? 0 : (L.charCodeAt(0) % 4) + 1;
  return `tile-c${idx}`;
}

let grid;       // 2D array [row][col] of letters
let selected;   // {r,c} | null
let score;
let moves;
let busy;       // input lock during cascades
let stageEl;
let onExitFn;
let showDoneFn;

export const level6 = {
  id: 6,
  name: 'ABC Crush',
  emoji: '🍬',
  desc: 'Match 3 letters in a row',
  ageHint: 'Age 5+',
  custom: true,

  start(stage, { onExit, showDone }) {
    stageEl = stage;
    onExitFn = onExit;
    showDoneFn = showDone;
    score = 0;
    moves = MOVES_START;
    selected = null;
    busy = false;
    initBoard();
    render();
  }
};

function initBoard() {
  grid = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => randomLetter()));
  // Re-roll any starting matches so we begin with a clean board
  let safety = 0;
  while (findMatches().size && safety++ < 20) {
    findMatches().forEach(k => {
      const [r, c] = k.split(',').map(Number);
      grid[r][c] = randomLetter();
    });
  }
}

function findMatches() {
  const m = new Set();
  // horizontal
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
  // vertical
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

function swap(a, b) {
  const tmp = grid[a.r][a.c];
  grid[a.r][a.c] = grid[b.r][b.c];
  grid[b.r][b.c] = tmp;
}

function cascade() {
  for (let c = 0; c < COLS; c++) {
    let writeR = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r][c] !== null) {
        const tmp = grid[r][c];
        grid[r][c] = null;
        grid[writeR][c] = tmp;
        writeR--;
      }
    }
    for (let r = writeR; r >= 0; r--) grid[r][c] = randomLetter();
  }
}

async function clearLoop() {
  busy = true;
  let chain = 0;
  while (true) {
    const matches = findMatches();
    if (!matches.size) break;
    chain++;
    const cells = [...matches];
    // score: 5 per cell, +chain bonus
    score += cells.length * 5 + (chain - 1) * 10;
    // speak the most-matched letter (kid-facing reinforcement)
    const counts = {};
    cells.forEach(k => {
      const [r, c] = k.split(',').map(Number);
      const L = grid[r][c];
      counts[L] = (counts[L] || 0) + 1;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    Audio.speak(top, 'en');
    Audio.correct();
    // mark for fade
    cells.forEach(k => {
      const [r, c] = k.split(',').map(Number);
      grid[r][c] = null;
    });
    render();
    await sleep(280);
    cascade();
    render();
    await sleep(180);
  }
  busy = false;
  checkEnd();
}

async function tryTap(r, c) {
  if (busy) return;
  if (!selected) { selected = { r, c }; render(); return; }
  if (selected.r === r && selected.c === c) { selected = null; render(); return; }
  const adj = Math.abs(selected.r - r) + Math.abs(selected.c - c) === 1;
  if (!adj) { selected = { r, c }; render(); return; }

  const a = selected, b = { r, c };
  swap(a, b);
  if (findMatches().size === 0) {
    swap(a, b); // revert
    Audio.wrong();
    flashInvalid(a, b);
    selected = null;
    render();
    return;
  }
  moves--;
  selected = null;
  render();
  await clearLoop();
}

function flashInvalid(a, b) {
  [a, b].forEach(({ r, c }) => {
    const el = stageEl.querySelector(`.crush-tile[data-r="${r}"][data-c="${c}"]`);
    if (el) {
      el.classList.add('shake');
      setTimeout(() => el.classList.remove('shake'), 400);
    }
  });
}

function checkEnd() {
  if (score >= TARGET) finish(true);
  else if (moves <= 0) finish(false);
}

function finish(won) {
  Storage.addStars(won ? 3 : 1);
  Storage.setLevelScore(6, score);
  if (won) Audio.win();
  showDoneFn({
    title: won ? 'Smashed it!' : 'Game Over',
    stars: won ? 3 : score >= TARGET / 2 ? 2 : 1,
    summary: `Score ${score} · Target ${TARGET} · Lifetime ⭐ ${Storage.getStars()}`,
    onAgain: () => {
      level6.start(stageEl, { onExit: onExitFn, showDone: showDoneFn });
    },
    onNext: () => onExitFn({ next: true }),
    onHome: () => onExitFn({ home: true })
  });
}

function render() {
  stageEl.innerHTML = `
    <div class="crush-hud">
      <div class="hud-pill"><span class="hud-label">SCORE</span><span class="hud-value">${score}</span></div>
      <div class="hud-pill target"><span class="hud-label">TARGET</span><span class="hud-value">${TARGET}</span></div>
      <div class="hud-pill ${moves <= 5 ? 'warn' : ''}"><span class="hud-label">MOVES</span><span class="hud-value">${moves}</span></div>
    </div>
    <div class="crush-grid" style="grid-template-columns:repeat(${COLS}, 1fr)">
      ${grid.map((row, r) => row.map((L, c) => {
        if (!L) return `<div class="crush-tile empty"></div>`;
        const sel = selected && selected.r === r && selected.c === c ? ' selected' : '';
        return `<button class="crush-tile ${colorClass(L)}${sel}" data-r="${r}" data-c="${c}">${L}</button>`;
      }).join('')).join('')}
    </div>
    <div class="crush-hint">Tap two side-by-side letters to swap. Make 3 in a row to clear!</div>
  `;
  stageEl.querySelectorAll('.crush-tile[data-r]').forEach(btn => {
    btn.onclick = () => tryTap(parseInt(btn.dataset.r, 10), parseInt(btn.dataset.c, 10));
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
