// Activity 17: Ludo, the traditional board game.
//   • Start screen: Play with Robot (you + 1, 2 or 3 robots) or Play with
//     Friends (2, 3 or 4 players, all humans, no robot). One colour per
//     player, a colour picked by one player is locked for the others.
//   • Quick game (2 pawns each) or Classic (4 pawns each).
//   • Classic rules: roll a 6 to bring a pawn out. Go around the board, then
//     up your own coloured lane to the centre. Exact roll needed to finish.
//     Land on another colour to send it back home (not on ★ or start
//     squares, those are safe). Roll a 6, capture, or finish a pawn = roll
//     again. First player with all pawns home wins.
// Self-managed custom level, same look and dice as Snakes & Ladders.
// Original implementation (Ludo rules are traditional / public domain).

import { Audio } from '../audio.js';
import { Storage } from '../storage.js';

// Board corners: red top-left, green top-right, yellow bottom-right, blue
// bottom-left. Turn order goes clockwise in this order.
const BOARD_ORDER = ['red', 'green', 'yellow', 'blue'];
const COLORS = {
  red:    { name: 'Red',    hex: '#E03131', soft: '#FFE3E3', yard: [0, 0] },
  green:  { name: 'Green',  hex: '#2F9E44', soft: '#DDF5E1', yard: [9, 0] },
  yellow: { name: 'Yellow', hex: '#F08C00', soft: '#FFF0D1', yard: [9, 9] },
  blue:   { name: 'Blue',   hex: '#1971C2', soft: '#DBEAFE', yard: [0, 9] },
};
const OPPOSITE = { red: 'yellow', yellow: 'red', green: 'blue', blue: 'green' };
const SETTINGS_KEY = 'playglow:ludo:settings';
const LEVEL_ID = 17;

// 52 squares of the shared track on a 15 x 15 grid, as [col, row].
// Index 0 is Red's start square; play moves clockwise.
const TRACK = (() => {
  const t = [];
  for (let c = 1; c <= 5; c++) t.push([c, 6]);
  for (let r = 5; r >= 0; r--) t.push([6, r]);
  t.push([7, 0]);
  for (let r = 0; r <= 5; r++) t.push([8, r]);
  for (let c = 9; c <= 14; c++) t.push([c, 6]);
  t.push([14, 7]);
  for (let c = 14; c >= 9; c--) t.push([c, 8]);
  for (let r = 9; r <= 14; r++) t.push([8, r]);
  t.push([7, 14]);
  for (let r = 14; r >= 9; r--) t.push([6, r]);
  for (let c = 5; c >= 0; c--) t.push([c, 8]);
  t.push([0, 7]);
  t.push([0, 6]);
  return t;
})();
const START = { red: 0, green: 13, yellow: 26, blue: 39 };
const STARS = [8, 21, 34, 47];
const SAFE = new Set([0, 13, 26, 39].concat(STARS));
// Each colour's own lane to the centre (5 squares).
const LANE = {
  red:    [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  green:  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  yellow: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
  blue:   [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
};
// Where finished pawns sit, inside their colour's centre triangle.
const HOME_SPOT = { red: [6.75, 7.5], green: [7.5, 6.75], yellow: [8.25, 7.5], blue: [7.5, 8.25] };
// Pawn progress: -1 = in yard, 0..50 = on track, 51..55 = own lane, 56 = home.
const LAST_TRACK = 50, HOME = 56;

const STEP_MS = 200;
const ROLL_MS = 1000;
const BOT_DELAY = 750;

const FACE_ROT = { 1: [0, 0], 6: [0, 180], 3: [0, -90], 4: [0, 90], 2: [-90, 0], 5: [90, 0] };
const PIPS = { 1: [5], 2: [3, 7], 3: [3, 5, 7], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };

let abortPrev = null;

function loadSettings() {
  const def = { mode: 'robot', robots: 1, friends: 2, pawns: 4, colors: ['red', 'yellow', 'green', 'blue'] };
  try {
    const s = Object.assign({}, def, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'));
    if (s.mode !== 'friend') s.mode = 'robot';
    if (![1, 2, 3].includes(s.robots)) s.robots = 1;
    if (![2, 3, 4].includes(s.friends)) s.friends = 2;
    if (s.pawns !== 2) s.pawns = 4;
    // colors must be a full set of the 4 colours, each once.
    const ok = Array.isArray(s.colors) && s.colors.length === 4 && BOARD_ORDER.every(k => s.colors.includes(k));
    if (!ok) s.colors = def.colors.slice();
    return s;
  } catch (e) { return def; }
}
function saveSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {} }

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function faceHTML(v, side) {
  let pips = '';
  for (let i = 1; i <= 9; i++) pips += `<span class="dz-pip${PIPS[v].indexOf(i) >= 0 ? ' on' : ''}"></span>`;
  return `<div class="dz-face dz-${side}">${pips}</div>`;
}
function diceHTML() {
  return `
    <div class="dz-scene">
      <div class="dz-cube" id="ld-cube">
        ${faceHTML(1, 'front')}${faceHTML(6, 'back')}${faceHTML(3, 'right')}
        ${faceHTML(4, 'left')}${faceHTML(2, 'top')}${faceHTML(5, 'bottom')}
      </div>
    </div>
    <div class="dz-shadow"></div>`;
}

function starPath(cx, cy, R, r) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R;
    d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rad).toFixed(3) + ' ' + (cy + Math.sin(a) * rad).toFixed(3);
  }
  return d + 'Z';
}

function yardSpots(color, pawns) {
  const [ox, oy] = COLORS[color].yard;
  const all = [[1.95, 1.95], [4.05, 1.95], [1.95, 4.05], [4.05, 4.05]];
  const use = pawns === 2 ? [all[0], all[3]] : all;
  return use.map(([x, y]) => [ox + x, oy + y]);
}

function boardSVG(pawns) {
  let s = `<rect x="0" y="0" width="15" height="15" fill="#fff"/>`;
  // yards
  BOARD_ORDER.forEach(k => {
    const c = COLORS[k], [x, y] = c.yard;
    s += `<rect x="${x}" y="${y}" width="6" height="6" fill="${c.hex}"/>`;
    s += `<rect x="${x + 0.9}" y="${y + 0.9}" width="4.2" height="4.2" rx="0.6" fill="#fff"/>`;
    yardSpots(k, 4).forEach(([cx, cy]) => {
      const used = yardSpots(k, pawns).some(p => p[0] === cx && p[1] === cy);
      s += `<circle cx="${cx}" cy="${cy}" r="0.72" fill="${used ? c.soft : '#f1f3f5'}" stroke="${used ? c.hex : '#dee2e6'}" stroke-width="0.12"/>`;
    });
  });
  // track squares
  const startOf = {};
  BOARD_ORDER.forEach(k => { startOf[START[k]] = k; });
  TRACK.forEach(([c, r], i) => {
    const k = startOf[i];
    s += `<rect x="${c}" y="${r}" width="1" height="1" fill="${k ? COLORS[k].hex : '#fff'}" stroke="#b9bfca" stroke-width="0.05"/>`;
    if (STARS.indexOf(i) >= 0) s += `<path d="${starPath(c + 0.5, r + 0.5, 0.38, 0.16)}" fill="#ced4da"/>`;
    if (k) s += `<path d="${starPath(c + 0.5, r + 0.5, 0.36, 0.15)}" fill="rgba(255,255,255,.75)"/>`;
  });
  // coloured lanes
  BOARD_ORDER.forEach(k => {
    LANE[k].forEach(([c, r]) => {
      s += `<rect x="${c}" y="${r}" width="1" height="1" fill="${COLORS[k].hex}" stroke="#b9bfca" stroke-width="0.05"/>`;
    });
  });
  // centre home: four triangles
  s += `<polygon points="6,6 7.5,7.5 6,9" fill="${COLORS.red.hex}"/>`;
  s += `<polygon points="6,6 9,6 7.5,7.5" fill="${COLORS.green.hex}"/>`;
  s += `<polygon points="9,6 9,9 7.5,7.5" fill="${COLORS.yellow.hex}"/>`;
  s += `<polygon points="6,9 9,9 7.5,7.5" fill="${COLORS.blue.hex}"/>`;
  s += `<path d="M6 6L9 9M9 6L6 9" stroke="rgba(255,255,255,.55)" stroke-width="0.06"/>`;
  s += `<rect x="0" y="0" width="15" height="15" fill="none" stroke="#868e96" stroke-width="0.08"/>`;
  return `<svg class="ld-svg" viewBox="0 0 15 15" preserveAspectRatio="none">${s}</svg>`;
}

export const ludo = {
  id: LEVEL_ID,
  name: 'Ludo',
  emoji: '🎯',
  desc: 'Classic Ludo, 2 to 4 players',
  ageHint: 'Age 5+',
  guide: 'Play with robots or with 1 to 3 friends. Roll a 6 to bring a pawn out of your home corner. Move all the way around the board, then up your own coloured lane to the centre. Land on another player to send their pawn back home, but ★ and start squares are safe. Roll a 6, capture a pawn, or get a pawn home to roll again. First to get all pawns home wins!',
  custom: true,

  start(stage, { onExit, showDone }) {
    if (abortPrev) abortPrev();
    let cancelled = false;
    abortPrev = () => { cancelled = true; };

    const profile = Storage.getActiveProfile();
    const avatar = (profile && profile.avatar) || '🦊';
    let settings = loadSettings();
    let players = [], cur = 0, gameOver = true, locked = false, choosing = null;
    let gen = 0;                       // bumps on every new game / setup, old timers die
    let spin = { x: 0, y: 0 }, sixes = 0;
    let hitDelay = 450;                // pause before the next turn (longer after a capture / pawn home)
    let el = {};

    // Timer that does nothing if the game was left or restarted meanwhile.
    function later(fn, ms) {
      const g = gen;
      setTimeout(() => { if (!cancelled && g === gen) fn(); }, ms);
    }

    setup();

    // ---------- Start screen ----------
    function humanCount() { return settings.mode === 'friend' ? settings.friends : 1; }

    function setup() {
      gen += 1; gameOver = true; locked = false; choosing = null;
      const friend = settings.mode === 'friend';
      const n = humanCount();
      const cols = settings.colors;
      const swatches = (row) => BOARD_ORDER.map(k => {
        const owner = cols.indexOf(k);
        const takenByOther = owner !== row && owner < n;
        return `<button class="sl-sw${cols[row] === k ? ' on' : ''}" data-row="${row}" data-c="${k}" ${takenByOther ? 'disabled' : ''}
          style="--pc:${COLORS[k].hex}" aria-label="${COLORS[k].name}"><span></span><em>${COLORS[k].name}</em></button>`;
      }).join('');
      const counts = friend ? [2, 3, 4] : [1, 2, 3];
      const curCount = friend ? settings.friends : settings.robots;
      const countBtns = counts.map(c => `<button class="ld-chip${c === curCount ? ' on' : ''}" data-count="${c}">${friend ? c + ' players' : c + (c === 1 ? ' robot' : ' robots')}</button>`).join('');
      let rows = '';
      for (let i = 0; i < n; i++) {
        rows += `
          <div class="sl-pick">
            <div class="sl-pick-label">${friend ? 'Player ' + (i + 1) + ' colour' : 'Pick your colour'}</div>
            <div class="sl-sws">${swatches(i)}</div>
          </div>`;
      }
      const robotNote = friend ? '' : `<div class="sl-robot-note">🤖 ${robotColors().map(k => `<b style="color:${COLORS[k].hex}">${COLORS[k].name}</b>`).join(', ')}</div>`;
      stage.innerHTML = `
        <div class="sl-setup ld-setup">
          <div class="sl-setup-title">🎯 Ludo: who's playing?</div>
          <div class="sl-modes">
            <button class="sl-mode${!friend ? ' on' : ''}" data-mode="robot"><span class="sl-mode-ico">🤖</span>Play with Robot</button>
            <button class="sl-mode${friend ? ' on' : ''}" data-mode="friend"><span class="sl-mode-ico">👫</span>Play with Friends</button>
          </div>
          <div class="ld-chips">${countBtns}</div>
          ${rows}
          ${robotNote}
          <div class="ld-chips ld-pawns">
            <button class="ld-chip${settings.pawns === 2 ? ' on' : ''}" data-pawns="2">⚡ Quick, 2 pawns</button>
            <button class="ld-chip${settings.pawns === 4 ? ' on' : ''}" data-pawns="4">🎯 Classic, 4 pawns</button>
          </div>
          <button class="sl-go" id="ld-go">Start game ▶</button>
        </div>`;
      stage.querySelectorAll('.sl-mode').forEach(b => {
        b.onclick = () => { settings.mode = b.dataset.mode; saveSettings(settings); setup(); };
      });
      stage.querySelectorAll('[data-count]').forEach(b => {
        b.onclick = () => {
          const c = +b.dataset.count;
          if (settings.mode === 'friend') settings.friends = c; else settings.robots = c;
          saveSettings(settings); setup();
        };
      });
      stage.querySelectorAll('[data-pawns]').forEach(b => {
        b.onclick = () => { settings.pawns = +b.dataset.pawns; saveSettings(settings); setup(); };
      });
      stage.querySelectorAll('.sl-sw').forEach(b => {
        b.onclick = () => {
          const row = +b.dataset.row, c = b.dataset.c;
          const j = settings.colors.indexOf(c);
          // swap with whoever held it (only an unused slot can, others are disabled)
          settings.colors[j] = settings.colors[row];
          settings.colors[row] = c;
          saveSettings(settings); setup();
        };
      });
      stage.querySelector('#ld-go').onclick = () => { Audio.arm(); newGame(); };
    }

    // Robots: with 1 robot it sits opposite you (classic 2 player setup),
    // otherwise they take the next free corners clockwise.
    function robotColors() {
      const me = settings.colors[0];
      if (settings.robots === 1) return [OPPOSITE[me]];
      const start = BOARD_ORDER.indexOf(me);
      const rest = [];
      for (let i = 1; i < 4; i++) rest.push(BOARD_ORDER[(start + i) % 4]);
      return rest.slice(0, settings.robots);
    }

    function newGame() {
      gen += 1;
      const list = [];
      if (settings.mode === 'friend') {
        for (let i = 0; i < settings.friends; i++) {
          list.push({ name: 'Player ' + (i + 1), short: 'P' + (i + 1), icon: String(i + 1), color: settings.colors[i], bot: false });
        }
      } else {
        list.push({ name: (profile && profile.name) || 'You', short: 'You', icon: avatar, color: settings.colors[0], bot: false, me: true });
        const rc = robotColors();
        rc.forEach((k, i) => list.push({ name: rc.length === 1 ? 'Robot' : 'Robot ' + (i + 1), short: 'Robot', icon: '🤖', color: k, bot: true }));
      }
      // Clockwise board order, starting with Player 1 / you.
      const first = BOARD_ORDER.indexOf(list[0].color);
      list.sort((a, b) => ((BOARD_ORDER.indexOf(a.color) - first + 4) % 4) - ((BOARD_ORDER.indexOf(b.color) - first + 4) % 4));
      players = list.map(p => Object.assign(p, { pawns: Array.from({ length: settings.pawns }, () => -1), home: 0 }));
      cur = 0; gameOver = false; locked = false; choosing = null; sixes = 0;
      build();
      startTurn();
    }

    // ---------- Board ----------
    function build() {
      const byColor = {};
      players.forEach((p, i) => { byColor[p.color] = i; });
      const card = (color) => {
        const i = byColor[color];
        if (i == null) return `<div class="sl-card ld-card ld-empty"></div>`;
        const p = players[i], c = COLORS[p.color];
        return `
          <div class="sl-card ld-card" id="ld-card-${i}" style="--pc:${c.hex};--ps:${c.soft}">
            <span class="sl-card-ava">${esc(p.icon)}</span>
            <span class="sl-card-info"><span class="sl-card-name">${esc(p.name)}</span><span class="sl-card-sq" id="ld-home-${i}"></span></span>
            <span class="sl-card-bar"><i id="ld-bar-${i}"></i></span>
          </div>`;
      };
      let pawnsHTML = '';
      players.forEach((p, i) => p.pawns.forEach((_, k) => {
        pawnsHTML += `<button class="ld-pawn" id="ld-p-${i}-${k}" data-i="${i}" data-k="${k}" style="--pc:${COLORS[p.color].hex}" aria-label="${COLORS[p.color].name} pawn ${k + 1}"><i></i></button>`;
      }));
      stage.innerHTML = `
        <div class="sl-root ld-root">
          <div class="ld-row">${card('red')}${card('green')}</div>
          <div class="ld-frame">
            <div class="ld-wrap">
              ${boardSVG(settings.pawns)}
              ${pawnsHTML}
              <div class="sl-fx" id="ld-fx"></div>
            </div>
          </div>
          <div class="ld-row">${card('blue')}${card('yellow')}</div>
          <div class="sl-controls">
            <button class="sl-dice3d" id="ld-roll" aria-label="Roll the dice">${diceHTML()}</button>
            <div class="sl-side">
              <div class="sl-msg" id="ld-msg"></div>
              <div class="sl-rolled" id="ld-rolled"></div>
            </div>
          </div>
          <button class="sl-change" id="ld-change">⚙ Change players</button>
        </div>`;
      el = {
        roll: stage.querySelector('#ld-roll'),
        cube: stage.querySelector('#ld-cube'),
        msg: stage.querySelector('#ld-msg'),
        rolled: stage.querySelector('#ld-rolled'),
        fx: stage.querySelector('#ld-fx'),
        pawn: players.map((p, i) => p.pawns.map((_, k) => stage.querySelector(`#ld-p-${i}-${k}`))),
        home: players.map((_, i) => stage.querySelector(`#ld-home-${i}`)),
        bar: players.map((_, i) => stage.querySelector(`#ld-bar-${i}`)),
        card: players.map((_, i) => stage.querySelector(`#ld-card-${i}`)),
      };
      el.roll.onclick = onTapDice;
      stage.querySelectorAll('.ld-pawn').forEach(b => { b.onclick = () => onTapPawn(+b.dataset.i, +b.dataset.k); });
      stage.querySelector('#ld-change').onclick = () => { if (!locked) setup(); };
      spin = { x: 0, y: 0 };
      setCube(1, false);
      layout(false);
    }

    function absIndex(color, p) { return (START[color] + p) % 52; }

    // Centre of a pawn's square, in grid units (0..15).
    function spotOf(i, k) {
      const p = players[i], prog = p.pawns[k];
      if (prog < 0) return yardSpots(p.color, settings.pawns)[k];
      if (prog >= HOME) return HOME_SPOT[p.color];
      if (prog > LAST_TRACK) { const [c, r] = LANE[p.color][prog - LAST_TRACK - 1]; return [c + 0.5, r + 0.5]; }
      const [c, r] = TRACK[absIndex(p.color, prog)];
      return [c + 0.5, r + 0.5];
    }
    function keyOf(i, k) {
      const p = players[i], prog = p.pawns[k];
      if (prog < 0) return `y${i}-${k}`;
      if (prog >= HOME) return `h${i}`;
      if (prog > LAST_TRACK) return `l${i}-${prog}`;
      return `t${absIndex(p.color, prog)}`;
    }

    // Place every pawn; pawns sharing a square sit side by side, smaller.
    function layout(animateMs) {
      const groups = {};
      players.forEach((p, i) => p.pawns.forEach((_, k) => {
        const key = keyOf(i, k);
        (groups[key] = groups[key] || []).push([i, k]);
      }));
      Object.keys(groups).forEach(key => {
        const g = groups[key], n = g.length;
        const per = Math.ceil(Math.sqrt(n)), gap = n > 1 ? (n > 4 ? 0.26 : 0.32) : 0;
        g.forEach(([i, k], j) => {
          const [x, y] = spotOf(i, k);
          const col = j % per, row = Math.floor(j / per), rowsN = Math.ceil(n / per);
          const ox = (col - (Math.min(per, n - row * per) - 1) / 2) * gap;
          const oy = (row - (rowsN - 1) / 2) * gap;
          const b = el.pawn[i][k];
          if (animateMs != null && animateMs !== false) b.style.transition = `left ${animateMs}ms ease, top ${animateMs}ms ease, width .2s ease`;
          b.style.left = `${((x + ox) / 15 * 100).toFixed(2)}%`;
          b.style.top = `${((y + oy) / 15 * 100).toFixed(2)}%`;
          b.classList.toggle('sm', n > 1);
          b.classList.toggle('xs', n > 4);
          b.classList.toggle('done', players[i].pawns[k] >= HOME);
        });
      });
    }

    function refresh() {
      players.forEach((p, i) => {
        const prog = p.pawns.reduce((a, v) => a + (v + 1), 0);
        el.home[i].textContent = `🏠 ${p.home} of ${p.pawns.length} home`;
        el.bar[i].style.width = `${Math.round(prog / ((HOME + 1) * p.pawns.length) * 100)}%`;
        el.card[i].classList.toggle('turn', cur === i && !gameOver);
      });
      const p = players[cur];
      const ready = !p.bot && !locked && !gameOver && !choosing;
      el.roll.disabled = !ready;
      el.roll.classList.toggle('ready', ready);
      el.roll.style.setProperty('--pc', COLORS[p.color].hex);
      el.msg.style.color = COLORS[p.color].hex;
      el.msg.textContent = gameOver ? '' :
        p.bot ? `${p.name} is playing…` :
        choosing ? (p.me ? 'Tap a glowing pawn' : `${p.name}, tap a glowing pawn`) :
        locked ? 'Moving…' :
        p.me ? 'Your turn! Tap the dice' : `${p.name}, tap the dice!`;
      players.forEach((pl, i) => pl.pawns.forEach((_, k) => {
        el.pawn[i][k].classList.toggle('turn', i === cur && !gameOver && !choosing);
        el.pawn[i][k].classList.toggle('can', !!(choosing && i === cur && choosing.indexOf(k) >= 0));
      }));
    }

    function setCube(v, animate) {
      const [rx, ry] = FACE_ROT[v];
      if (animate) {
        spin.x += 720 + (Math.random() < 0.5 ? 360 : 0);
        spin.y += 720 + (Math.random() < 0.5 ? 360 : 0);
      }
      const baseX = Math.round(spin.x / 360) * 360, baseY = Math.round(spin.y / 360) * 360;
      spin.x = baseX; spin.y = baseY;
      el.cube.style.transition = animate ? `transform ${ROLL_MS}ms cubic-bezier(.2,.75,.25,1)` : 'none';
      el.cube.style.transform = `rotateX(-16deg) rotateY(18deg) rotateX(${baseX + rx}deg) rotateY(${baseY + ry}deg)`;
    }

    // ---------- Turn flow ----------
    function who(p) { return p.me ? 'You' : p.name; }

    function startTurn() {
      locked = false; choosing = null;
      refresh();
      if (players[cur].bot) later(doRoll, BOT_DELAY);
    }

    function onTapDice() {
      if (players[cur].bot || locked || gameOver || choosing || cancelled) return;
      doRoll();
    }

    function movable(i, roll) {
      const out = [];
      players[i].pawns.forEach((v, k) => {
        if (v < 0) { if (roll === 6) out.push(k); }
        else if (v < HOME && v + roll <= HOME) out.push(k);
      });
      return out;
    }

    function doRoll() {
      locked = true;
      const i = cur, p = players[i];
      const roll = 1 + Math.floor(Math.random() * 6);
      el.rolled.textContent = '';
      refresh();
      el.roll.classList.remove('rolling'); void el.roll.offsetWidth; el.roll.classList.add('rolling');
      setCube(roll, true);
      Audio.diceRoll(ROLL_MS - 100);
      later(() => {
        el.roll.classList.remove('rolling');
        el.rolled.innerHTML = `${who(p)} rolled <b style="color:${COLORS[p.color].hex}">${roll}</b>`;
        sixes = roll === 6 ? sixes + 1 : 0;
        if (sixes === 3) {                       // classic rule: three 6s in a row, turn ends
          sixes = 0;
          toast(`🎲 Three 6s! ${p.me ? 'Your' : p.name + "'s"} turn ends`, 'bad');
          return later(() => endTurn(false), 1000);
        }
        const opts = movable(i, roll);
        if (!opts.length) {
          const allYard = p.pawns.every(v => v < 0 || v >= HOME);
          toast(allYard ? '🎲 Need a 6 to bring a pawn out' : '🎲 No move this time', 'bad');
          return later(() => endTurn(false), 1000);
        }
        if (p.bot) return later(() => move(i, botPick(i, roll, opts), roll), 450);
        // Same square for all choices (e.g. all in the yard) = no real choice.
        const distinct = opts.filter((k, n) => opts.findIndex(o => p.pawns[o] === p.pawns[k] && (p.pawns[k] >= 0 || p.pawns[o] < 0)) === n);
        if (distinct.length === 1) return later(() => move(i, opts[0], roll), 350);
        choosing = opts; locked = false;
        refresh();
        el.roll.dataset.roll = roll;
      }, ROLL_MS + 80);
    }

    function onTapPawn(i, k) {
      if (!choosing || i !== cur || choosing.indexOf(k) < 0 || gameOver) return;
      const roll = +el.roll.dataset.roll;
      choosing = null;
      move(i, k, roll);
    }

    function move(i, k, roll) {
      locked = true; choosing = null;
      refresh();
      const p = players[i], b = el.pawn[i][k];
      if (p.pawns[k] < 0) {                       // bring out of the yard
        p.pawns[k] = 0;
        b.classList.remove('hop'); void b.offsetWidth; b.classList.add('hop');
        Audio.slide({ from: 400, to: 800, duration: 0.25, type: 'triangle', gain: 0.16 });
        layout(320);
        return later(() => land(i, k, roll), 380);
      }
      let left = roll;
      const tick = () => {
        p.pawns[k] += 1; left -= 1;
        layout(STEP_MS - 30);
        b.classList.remove('hop'); void b.offsetWidth; b.classList.add('hop');
        Audio.beep({ freq: 500 + p.pawns[k] * 6, duration: 0.05, gain: 0.1 });
        if (left > 0) later(tick, STEP_MS);
        else later(() => land(i, k, roll), STEP_MS);
      };
      tick();
    }

    function land(i, k, roll) {
      const p = players[i], prog = p.pawns[k];
      let bonus = roll === 6;
      if (prog >= HOME) {
        p.home += 1;
        bonus = true;
        pawnHome(i);
      } else if (prog <= LAST_TRACK) {
        const sq = absIndex(p.color, prog);
        if (!SAFE.has(sq)) {
          const hit = [];
          players.forEach((o, j) => {
            if (j === i) return;
            o.pawns.forEach((v, m) => { if (v >= 0 && v <= LAST_TRACK && absIndex(o.color, v) === sq) hit.push([j, m]); });
          });
          if (hit.length) {
            bonus = true;
            capture(i, hit, sq);
          }
        }
      }
      layout(450);
      refresh();
      if (p.home === p.pawns.length) return later(() => finish(i), 700);
      later(() => endTurn(bonus), hitDelay);
      hitDelay = 450;
    }

    function capture(i, hit, sq) {
      const p = players[i];
      hit.forEach(([j, m]) => { players[j].pawns[m] = -1; });
      const names = hit.map(([j]) => who(players[j])).filter((n, x, a) => a.indexOf(n) === x).join(' and ');
      toast(`💥 ${who(p)} sent ${names === 'You' ? 'you' : names} home!`, players[i].bot ? 'bad' : 'good');
      const [c, r] = TRACK[sq];
      fxAt(c + 0.5, r + 0.5, '💥', 'sl-emoji-pop', 1100);
      // Sad slide for the pawn going home, happy chirp for the catcher.
      Audio.slide({ from: 620, to: 180, duration: 0.6, type: 'sawtooth', gain: 0.09 });
      [880, 1175].forEach((f, n) => setTimeout(() => Audio.beep({ freq: f, duration: 0.12, gain: 0.13 }), 250 + n * 110));
      hit.forEach(([j]) => {
        const y = yardSpots(players[j].color, settings.pawns)[0];
        later(() => fxAt(y[0] + 1, y[1] + 1, '😭<b class="tear l"></b><b class="tear r"></b>', 'sl-emoji-cry', 1500), 300);
      });
      hitDelay = 1100;
    }

    function pawnHome(i) {
      const p = players[i], [x, y] = HOME_SPOT[p.color];
      Audio.slide({ from: 330, to: 990, duration: 0.4, type: 'triangle', gain: 0.18 });
      [784, 988, 1175].forEach((f, n) => setTimeout(() => Audio.beep({ freq: f, duration: 0.14, gain: 0.14 }), 380 + n * 90));
      fireworks(x, y);
      fxAt(x, y, '😄', 'sl-emoji-happy', 1400);
      toast(`🏠 ${who(p)} got a pawn home!`, 'good');
      hitDelay = 900;
    }

    function endTurn(bonus) {
      if (gameOver) return;
      if (bonus) {
        const p = players[cur];
        toast(`🎲 ${who(p)} ${p.me ? 'roll' : 'rolls'} again!`, 'good');
      } else {
        sixes = 0;
        cur = (cur + 1) % players.length;
      }
      startTurn();
    }

    // ---------- Robot ----------
    function threatened(sq, i) {
      if (SAFE.has(sq)) return false;
      return players.some((o, j) => j !== i && o.pawns.some(v => {
        if (v < 0 || v > LAST_TRACK) return false;
        const d = (sq - absIndex(o.color, v) + 52) % 52;
        return d >= 1 && d <= 6 && v + d <= LAST_TRACK;
      }));
    }
    function botPick(i, roll, opts) {
      const p = players[i];
      let best = opts[0], bestScore = -1e9;
      opts.forEach(k => {
        const from = p.pawns[k];
        const to = from < 0 ? 0 : from + roll;
        let s = Math.random() * 3;
        if (to >= HOME) s += 100;
        if (from < 0) s += 55;
        if (from <= LAST_TRACK && to > LAST_TRACK && to < HOME) s += 40;
        if (to <= LAST_TRACK) {
          const sq = absIndex(p.color, to);
          const catches = !SAFE.has(sq) && players.some((o, j) => j !== i && o.pawns.some(v => v >= 0 && v <= LAST_TRACK && absIndex(o.color, v) === sq));
          if (catches) s += 80;
          if (SAFE.has(sq)) s += 18;
          if (threatened(sq, i)) s -= 30;
        }
        if (from >= 0 && from <= LAST_TRACK && threatened(absIndex(p.color, from), i)) s += 22;
        s += to / 10;
        if (s > bestScore) { bestScore = s; best = k; }
      });
      return best;
    }

    // ---------- Effects + end ----------
    function fxAt(x, y, html, cls, ms) {
      const node = document.createElement('div');
      node.className = `sl-fx-item ${cls}`;
      node.style.left = `${(x / 15 * 100).toFixed(2)}%`;
      node.style.top = `${(y / 15 * 100).toFixed(2)}%`;
      node.innerHTML = html;
      el.fx.appendChild(node);
      setTimeout(() => node.remove(), ms || 1500);
    }
    function fireworks(x, y) {
      const colors = ['#FF6B6B', '#FFD43B', '#69DB7C', '#4DABF7', '#DA77F2', '#FFA94D'];
      [0, 260].forEach((delay, b) => later(() => {
        let sparks = '';
        for (let n = 0; n < 14; n++) {
          const ang = (n / 14) * Math.PI * 2 + b * 0.2, dist = 26 + Math.random() * 16;
          sparks += `<i style="--dx:${(Math.cos(ang) * dist).toFixed(1)}px;--dy:${(Math.sin(ang) * dist).toFixed(1)}px;background:${colors[(n + b) % colors.length]}"></i>`;
        }
        fxAt(x, y, sparks, 'sl-firework', 1100);
      }, delay));
    }

    function finish(i) {
      gameOver = true; locked = false; choosing = null;
      const p = players[i];
      const humanWon = !p.bot;
      const vsRobot = settings.mode !== 'friend';
      const stars = humanWon ? 3 : 1;
      Storage.addStars(stars);
      Storage.setLevelScore(LEVEL_ID, humanWon ? 100 : 10);
      humanWon ? Audio.win() : Audio.wrong();
      refresh();
      if (humanWon) [0, 350, 700].forEach(d => later(() => fireworks(7.5, 7.5), d));
      later(() => {
        showDone({
          title: vsRobot ? (humanWon ? 'You Win! 🎉' : `${p.name} Wins 🤖`) : `${p.name} Wins! 🎉`,
          stars,
          summary: vsRobot
            ? (humanWon ? `All your pawns are home! Lifetime ⭐ ${Storage.getStars()}` : 'So close! Tap Play Again.')
            : `${p.name} (${COLORS[p.color].name}) got all pawns home first! Play again?`,
          onAgain: () => { showGame(); newGame(); },
          onNext: () => onExit({ next: true }),
          onHome: () => onExit({ home: true }),
        });
      }, 1400);
    }

    function showGame() {
      document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
      document.getElementById('game-screen').classList.remove('hidden');
    }
  }
};

function toast(msg, kind) {
  const el = document.createElement('div');
  el.className = 'toast ' + (kind || 'good');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1400);
}
