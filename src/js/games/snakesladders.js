// Activity 14: Snakes & Ladders — classic board race, you vs 1 bot.
//   • Tap the dice to roll (1–6). Roll a 6 → roll again (Ludo-style).
//   • Land on a ladder 🪜 → climb up. Land on a snake 🐍 → slide down.
//   • Colorful 10×10 board (Ludo-board look). First to reach 100 wins.
// Self-managed custom level (like Color Trap): renders its own board + calls
// showDone() at the end.

import { Audio } from '../audio.js';
import { Storage } from '../storage.js';

// Gentle, kid-friendly set (not too many, games stay short).
const LADDERS = { 3: 22, 8: 26, 28: 47, 42: 63, 51: 70, 74: 92 };
const SNAKES  = { 19: 5, 39: 17, 58: 40, 66: 45, 83: 61, 95: 77 };

const DICE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const BOT_DELAY = 900;

let abortPrev = null;

function cellCenter(n) {
  const nn = Math.max(1, n);
  const rowFromBottom = Math.floor((nn - 1) / 10);      // 0..9
  const p = (nn - 1) % 10;
  const col = rowFromBottom % 2 === 0 ? p : 9 - p;       // boustrophedon
  const displayRow = 9 - rowFromBottom;                  // top row rendered first
  return { x: col * 10 + 5, y: displayRow * 10 + 5 };
}

export const snakesLadders = {
  id: 14,
  name: 'Snakes & Ladders',
  emoji: '🎲',
  desc: 'Roll, climb, slide, win',
  ageHint: 'Age 4+',
  guide: 'Take turns with the bot. Tap the dice to roll and move that many squares. Land at the bottom of a ladder 🪜 to climb up, but land on a snake 🐍 and slide down! Roll a 6 to go again. First to reach square 100 wins!',
  custom: true,

  start(stage, { onExit, showDone }) {
    abortPrev?.();
    let cancelled = false;
    abortPrev = () => { cancelled = true; };

    const avatar = Storage.getActiveProfile()?.avatar || '🦊';
    let pos, turn, gameOver, locked, lastRoll;

    newGame();

    function newGame() {
      pos = { player: 0, bot: 0 };
      turn = 'player';
      gameOver = false;
      locked = false;
      lastRoll = 0;
      render();
    }

    function boardCells() {
      let html = '';
      for (let dr = 0; dr < 10; dr++) {
        const rowFromBottom = 9 - dr;
        for (let col = 0; col < 10; col++) {
          const n = rowFromBottom * 10 + (rowFromBottom % 2 === 0 ? col + 1 : 10 - col);
          const isLadder = LADDERS[n] != null;
          const isSnake = SNAKES[n] != null;
          const goal = n === 100;
          const cls = `sl-cell${(dr + col) % 2 ? ' alt' : ''}${isLadder ? ' ladder' : ''}${isSnake ? ' snake' : ''}${goal ? ' goal' : ''}`;
          const mark = goal ? '🏁' : isLadder ? '🪜' : isSnake ? '🐍' : '';
          html += `<div class="${cls}"><span class="sl-num">${n}</span>${mark ? `<span class="sl-mark">${mark}</span>` : ''}</div>`;
        }
      }
      return html;
    }

    function linkLines() {
      const seg = (from, to, cls) => {
        const a = cellCenter(from), b = cellCenter(to);
        return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="${cls}" />`;
      };
      const ladders = Object.entries(LADDERS).map(([f, t]) => seg(+f, t, 'sl-line-ladder')).join('');
      const snakes = Object.entries(SNAKES).map(([f, t]) => seg(+f, t, 'sl-line-snake')).join('');
      return `<svg class="sl-links" viewBox="0 0 100 100" preserveAspectRatio="none">${ladders}${snakes}</svg>`;
    }

    function tokenEls() {
      const mk = (who, emoji, nudge) => {
        const c = cellCenter(pos[who] || 1);
        const active = turn === who && !gameOver ? ' active' : '';
        return `<div class="sl-token${active}" style="left:${(c.x + nudge).toFixed(1)}%;top:${c.y.toFixed(1)}%">${emoji}</div>`;
      };
      return mk('player', avatar, -2.2) + mk('bot', '🤖', 2.2);
    }

    function render() {
      const msg = gameOver ? '' :
        turn === 'player'
          ? (locked ? 'Moving…' : 'Your turn — tap the dice')
          : (locked ? 'Bot moving…' : 'Bot’s turn…');
      stage.innerHTML = `
        <div class="sl-root">
          <div class="sl-hud">
            <div class="sl-player"><span class="sl-ava">${avatar}</span> You <b>${pos.player}</b></div>
            <div class="sl-player"><span class="sl-ava">🤖</span> Bot <b>${pos.bot}</b></div>
          </div>
          <div class="sl-board-wrap">
            <div class="sl-board">${boardCells()}</div>
            ${linkLines()}
            ${tokenEls()}
          </div>
          <div class="sl-msg">${msg}</div>
          <div class="sl-controls">
            <button class="sl-dice${turn === 'player' && !locked && !gameOver ? ' ready' : ''}" id="sl-roll"
              ${turn !== 'player' || locked || gameOver ? 'disabled' : ''}>
              <span class="sl-dice-face">${lastRoll ? DICE[lastRoll] : '🎲'}</span>
            </button>
          </div>
        </div>`;
      const roll = stage.querySelector('#sl-roll');
      if (roll) roll.onclick = onPlayerRoll;
    }

    function onPlayerRoll() {
      if (turn !== 'player' || locked || gameOver || cancelled) return;
      doRoll('player');
    }

    function doRoll(who) {
      locked = true;
      lastRoll = 1 + Math.floor(Math.random() * 6);
      Audio.beep({ freq: 500, duration: 0.06, gain: 0.13 });
      render();
      setTimeout(() => { if (!cancelled) doMove(who, lastRoll); }, 350);
    }

    function doMove(who, roll) {
      const target = Math.min(100, pos[who] + roll);
      pos[who] = target;
      render();
      setTimeout(() => {
        if (cancelled) return;
        if (target >= 100) return finish(who);
        const jump = LADDERS[target] ?? SNAKES[target];
        if (jump != null) {
          pos[who] = jump;
          const up = LADDERS[target] != null;
          up ? Audio.correct() : Audio.wrong();
          toast(up ? '🪜 Up you go!' : '🐍 Whoops — slide down!');
          render();
          setTimeout(() => { if (!cancelled) afterMove(who, roll); }, 700);
        } else {
          afterMove(who, roll);
        }
      }, 620);
    }

    function afterMove(who, roll) {
      locked = false;
      const again = roll === 6;              // roll a 6 → same player goes again
      const next = again ? who : (who === 'player' ? 'bot' : 'player');
      if (again) toast('🎲 Rolled a 6 — go again!');
      turn = next;
      render();
      if (next === 'bot' && !gameOver && !cancelled) setTimeout(() => { if (!cancelled) doRoll('bot'); }, BOT_DELAY);
    }

    function finish(who) {
      gameOver = true;
      const won = who === 'player';
      const stars = won ? 3 : 1;
      Storage.addStars(stars);
      Storage.setLevelScore(14, won ? 100 : 10);
      won ? Audio.win() : Audio.wrong();
      render();
      showDone({
        title: won ? 'You Win! 🎉' : 'Bot Wins 🤖',
        stars,
        summary: won ? `You reached 100! Lifetime ⭐ ${Storage.getStars()}` : 'So close! Tap Play Again.',
        onAgain: () => { showGame(); newGame(); },
        onNext: () => onExit({ next: true }),
        onHome: () => onExit({ home: true }),
      });
    }

    function showGame() {
      document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
      document.getElementById('game-screen').classList.remove('hidden');
    }
  }
};

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast good';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1400);
}
