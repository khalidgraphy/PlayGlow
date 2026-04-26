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
  Z: { name: 'Zaffre',      bg: '#0014A8', text: '#fff'    }
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
    let safety = 0;
    while (findMatches().size && safety++ < 30) {
      findMatches().forEach(k => {
        const [r, c] = k.split(',').map(Number);
        grid[r][c] = rndLetter();
      });
    }
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

  async function tap(r, c) {
    if (busy) return;
    if (!selected) { selected = { r, c }; render(); return; }
    if (selected.r === r && selected.c === c) { selected = null; render(); return; }
    const adj = Math.abs(selected.r - r) + Math.abs(selected.c - c) === 1;
    if (!adj) { selected = { r, c }; render(); return; }

    const a = selected, b = { r, c };
    swap(a, b);
    if (findMatches().size === 0) {
      swap(a, b);
      Audio.wrong();
      shake(a); shake(b);
      selected = null;
      render();
      return;
    }
    movesLeft--;
    selected = null;
    render();
    await clearLoop();
  }

  function shake(p) {
    const el = stage.querySelector(`.crush-tile[data-r="${p.r}"][data-c="${p.c}"]`);
    if (el) {
      el.classList.add('shake');
      setTimeout(() => el.classList.remove('shake'), 400);
    }
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
      <div class="crush-hint">Tap two side-by-side letters to swap. Make 3 in a row to clear!</div>
    `;
    stage.querySelectorAll('.crush-tile[data-r]').forEach(btn => {
      btn.onclick = () => tap(parseInt(btn.dataset.r, 10), parseInt(btn.dataset.c, 10));
    });
  }

  init();
  render();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
