// Activity 14: Snakes & Ladders, classic board race.
//   • Start screen: Play with Robot (pick your colour) or Play with Friend
//     (Player 1 and Player 2, each their own colour). Choice is remembered.
//   • Tap the real 3D dice to roll (1 to 6). It tumbles with a dice-roll
//     sound and lands on a face. Roll a 6 and you go again.
//   • Tokens hop square by square. Ladder = climb up with fireworks and a
//     happy face. Snake = slide down with a crying face and a sad sound.
//   • First to reach 100 wins.
// Self-managed custom level: builds the board once per game, then only moves
// tokens and the dice, and calls showDone() at the end.

import { Audio } from '../audio.js';
import { Storage } from '../storage.js';

// Classic board layout, the same squares most real boards use
// (incl. the famous snake on 98). Top ladder ends at 99, not 100, so it is
// never a direct win: from 99 you still need to roll to finish.
const LADDERS = { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 99 };
const SNAKES  = { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 };
const SNAKE_COLORS = ['#2FB344', '#F08C00', '#7048E8', '#E03131', '#1C7ED6', '#D6336C'];

const COLORS = {
  red:    { name: 'Red',    hex: '#E03131', soft: '#FFE3E3' },
  blue:   { name: 'Blue',   hex: '#1971C2', soft: '#DBEAFE' },
  green:  { name: 'Green',  hex: '#2F9E44', soft: '#DDF5E1' },
  yellow: { name: 'Yellow', hex: '#F08C00', soft: '#FFF0D1' },
};
const COLOR_KEYS = Object.keys(COLORS);
const SETTINGS_KEY = 'playglow:sl:settings';

const STEP_MS = 230;      // one square hop
const SLIDE_MS = 800;     // ladder climb / snake slide
const ROLL_MS = 1000;     // dice tumble
const BOT_DELAY = 800;

// Which face turns to the front for each value (opposite faces add up to 7).
const FACE_ROT = { 1: [0, 0], 6: [0, 180], 3: [0, -90], 4: [0, 90], 2: [-90, 0], 5: [90, 0] };
// Pip positions on a 3x3 grid (1..9, reading order).
const PIPS = { 1: [5], 2: [3, 7], 3: [3, 5, 7], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };

let abortPrev = null;

function cellCenter(n) {
  const nn = Math.max(1, n);
  const rowFromBottom = Math.floor((nn - 1) / 10);      // 0..9
  const p = (nn - 1) % 10;
  const col = rowFromBottom % 2 === 0 ? p : 9 - p;       // boustrophedon
  const displayRow = 9 - rowFromBottom;                  // top row rendered first
  return { x: col * 10 + 5, y: displayRow * 10 + 5 };
}

function loadSettings() {
  const def = { mode: 'robot', c1: 'red', c2: 'blue' };
  try {
    const s = Object.assign(def, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'));
    if (!COLORS[s.c1]) s.c1 = 'red';
    if (!COLORS[s.c2] || s.c2 === s.c1) s.c2 = COLOR_KEYS.find(k => k !== s.c1);
    if (s.mode !== 'friend') s.mode = 'robot';
    return s;
  } catch { return def; }
}
function saveSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {} }

function faceHTML(v, side) {
  let pips = '';
  for (let i = 1; i <= 9; i++) pips += `<span class="dz-pip${PIPS[v].includes(i) ? ' on' : ''}"></span>`;
  return `<div class="dz-face dz-${side}">${pips}</div>`;
}

function diceHTML() {
  return `
    <div class="dz-scene">
      <div class="dz-cube" id="sl-cube">
        ${faceHTML(1, 'front')}${faceHTML(6, 'back')}${faceHTML(3, 'right')}
        ${faceHTML(4, 'left')}${faceHTML(2, 'top')}${faceHTML(5, 'bottom')}
      </div>
    </div>
    <div class="dz-shadow"></div>`;
}

function ladderSVG(from, to) {
  const a = cellCenter(from), b = cellCenter(to);
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
  const ux = dx / L, uy = dy / L, nx = -uy * 1.9, ny = ux * 1.9;
  let rungs = '';
  for (let t = 2.2; t < L - 1; t += 3.4) {
    const cx = a.x + ux * t, cy = a.y + uy * t;
    rungs += `<line x1="${(cx + nx).toFixed(2)}" y1="${(cy + ny).toFixed(2)}" x2="${(cx - nx).toFixed(2)}" y2="${(cy - ny).toFixed(2)}" class="sl-rung"/>`;
  }
  const rail = (s) => `<line x1="${(a.x + nx * s).toFixed(2)}" y1="${(a.y + ny * s).toFixed(2)}" x2="${(b.x + nx * s).toFixed(2)}" y2="${(b.y + ny * s).toFixed(2)}" class="sl-rail"/>`;
  return `<g class="sl-ladder">${rungs}${rail(1)}${rail(-1)}</g>`;
}

function snakeSVG(from, to, color) {
  const h = cellCenter(from), t = cellCenter(to);
  const dx = t.x - h.x, dy = t.y - h.y, L = Math.hypot(dx, dy);
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux, w = L * 0.2;
  const c1 = { x: h.x + dx * 0.3 + nx * w, y: h.y + dy * 0.3 + ny * w };
  const c2 = { x: h.x + dx * 0.7 - nx * w, y: h.y + dy * 0.7 - ny * w };
  const d = `M${h.x.toFixed(2)} ${h.y.toFixed(2)} C${c1.x.toFixed(2)} ${c1.y.toFixed(2)} ${c2.x.toFixed(2)} ${c2.y.toFixed(2)} ${t.x.toFixed(2)} ${t.y.toFixed(2)}`;
  const bx = c1.x - h.x, by = c1.y - h.y, bl = Math.hypot(bx, by) || 1;
  const fx = -bx / bl, fy = -by / bl;              // forward (out of the mouth)
  const px = -fy, py = fx;                         // across the head
  const eye = (s) => {
    const ex = h.x + fx * 0.6 + px * 1.0 * s, ey = h.y + fy * 0.6 + py * 1.0 * s;
    return `<circle cx="${ex.toFixed(2)}" cy="${ey.toFixed(2)}" r="0.75" fill="#fff"/><circle cx="${(ex + fx * 0.25).toFixed(2)}" cy="${(ey + fy * 0.25).toFixed(2)}" r="0.38" fill="#1f2430"/>`;
  };
  const tip = { x: h.x + fx * 4.2, y: h.y + fy * 4.2 };
  const tongue = `<path d="M${(h.x + fx * 2.3).toFixed(2)} ${(h.y + fy * 2.3).toFixed(2)} L${tip.x.toFixed(2)} ${tip.y.toFixed(2)} M${tip.x.toFixed(2)} ${tip.y.toFixed(2)} l${(px * 0.7 - fx * 0.5).toFixed(2)} ${(py * 0.7 - fy * 0.5).toFixed(2)} M${tip.x.toFixed(2)} ${tip.y.toFixed(2)} l${(-px * 0.7 - fx * 0.5).toFixed(2)} ${(-py * 0.7 - fy * 0.5).toFixed(2)}" class="sl-tongue"/>`;
  return `<g class="sl-snake">
    <path d="${d}" class="sl-snake-edge"/>
    <path d="${d}" stroke="${color}" class="sl-snake-body"/>
    <path d="${d}" class="sl-snake-stripe"/>
    ${tongue}
    <ellipse cx="${h.x.toFixed(2)}" cy="${h.y.toFixed(2)}" rx="2.6" ry="2.6" fill="${color}" class="sl-snake-head"/>
    ${eye(1)}${eye(-1)}
    <circle cx="${t.x.toFixed(2)}" cy="${t.y.toFixed(2)}" r="0.9" fill="${color}"/>
  </g>`;
}

export const snakesLadders = {
  id: 14,
  name: 'Snakes & Ladders',
  emoji: '🎲',
  desc: 'Roll, climb, slide, win',
  ageHint: 'Age 4+',
  guide: 'Play with the robot or with a friend. Each player has their own colour. Tap the dice to roll and move that many squares. Land at the bottom of a ladder 🪜 to climb up, but land on a snake\'s head 🐍 and slide down! Roll a 6 to go again. First to reach square 100 wins!',
  custom: true,

  start(stage, { onExit, showDone }) {
    abortPrev?.();
    let cancelled = false;
    abortPrev = () => { cancelled = true; };

    const profile = Storage.getActiveProfile();
    const avatar = profile?.avatar || '🦊';
    let settings = loadSettings();
    let players = [], cur = 0, gameOver = false, locked = false, spin = { x: 0, y: 0 };
    let el = {};

    setup();

    // ---------- Start screen: mode + colours ----------
    function setup() {
      locked = false; gameOver = true;
      const swatches = (row, chosen, taken) => COLOR_KEYS.map(k => `
        <button class="sl-sw${k === chosen ? ' on' : ''}" data-row="${row}" data-c="${k}" ${k === taken ? 'disabled' : ''}
          style="--pc:${COLORS[k].hex}" aria-label="${COLORS[k].name}"><span></span><em>${COLORS[k].name}</em></button>`).join('');
      const friend = settings.mode === 'friend';
      stage.innerHTML = `
        <div class="sl-setup">
          <div class="sl-setup-title">🎲 Who's playing?</div>
          <div class="sl-modes">
            <button class="sl-mode${!friend ? ' on' : ''}" data-mode="robot"><span class="sl-mode-ico">🤖</span>Play with Robot</button>
            <button class="sl-mode${friend ? ' on' : ''}" data-mode="friend"><span class="sl-mode-ico">👫</span>Play with Friend</button>
          </div>
          <div class="sl-pick">
            <div class="sl-pick-label">${friend ? 'Player 1 colour' : 'Pick your colour'}</div>
            <div class="sl-sws">${swatches(1, settings.c1, friend ? settings.c2 : null)}</div>
          </div>
          ${friend ? `
          <div class="sl-pick">
            <div class="sl-pick-label">Player 2 colour</div>
            <div class="sl-sws">${swatches(2, settings.c2, settings.c1)}</div>
          </div>` : `<div class="sl-robot-note">🤖 Robot plays <b style="color:${COLORS[robotColor()].hex}">${COLORS[robotColor()].name}</b></div>`}
          <button class="sl-go" id="sl-go">Start game ▶</button>
        </div>`;
      stage.querySelectorAll('.sl-mode').forEach(b => {
        b.onclick = () => { settings.mode = b.dataset.mode; saveSettings(settings); setup(); };
      });
      stage.querySelectorAll('.sl-sw').forEach(b => {
        b.onclick = () => {
          const c = b.dataset.c;
          if (b.dataset.row === '1') {
            settings.c1 = c;
            if (settings.c2 === c) settings.c2 = COLOR_KEYS.find(k => k !== c);
          } else settings.c2 = c;
          saveSettings(settings); setup();
        };
      });
      stage.querySelector('#sl-go').onclick = () => { Audio.arm(); newGame(); };
    }

    function robotColor() { return COLOR_KEYS.find(k => k !== settings.c1); }

    function newGame() {
      const c1 = COLORS[settings.c1];
      if (settings.mode === 'friend') {
        const c2 = COLORS[settings.c2];
        players = [
          { name: 'Player 1', short: 'P1', icon: '1', color: c1, bot: false, pos: 0 },
          { name: 'Player 2', short: 'P2', icon: '2', color: c2, bot: false, pos: 0 },
        ];
      } else {
        players = [
          { name: profile?.name || 'You', short: 'You', icon: avatar, color: c1, bot: false, pos: 0 },
          { name: 'Robot', short: 'Robot', icon: '🤖', color: COLORS[robotColor()], bot: true, pos: 0 },
        ];
      }
      cur = 0; gameOver = false; locked = false;
      build();
      refresh();
    }

    function boardCells() {
      let html = '';
      for (let dr = 0; dr < 10; dr++) {
        const rowFromBottom = 9 - dr;
        for (let col = 0; col < 10; col++) {
          const n = rowFromBottom * 10 + (rowFromBottom % 2 === 0 ? col + 1 : 10 - col);
          const tone = (dr + col) % 4;
          const extra = n === 100 ? ' goal' : n === 1 ? ' start' : '';
          html += `<div class="sl-cell t${tone}${extra}"></div>`;
        }
      }
      return html;
    }
    // Numbers sit in their own layer ABOVE the snakes and ladders, so every
    // square number stays readable.
    function boardNums() {
      let html = '';
      for (let dr = 0; dr < 10; dr++) {
        const rowFromBottom = 9 - dr;
        for (let col = 0; col < 10; col++) {
          const n = rowFromBottom * 10 + (rowFromBottom % 2 === 0 ? col + 1 : 10 - col);
          const label = n === 100 ? '100 👑' : n === 1 ? '1 GO' : n;
          html += `<span class="sl-num${n === 100 ? ' goal' : ''}">${label}</span>`;
        }
      }
      return html;
    }

    function art() {
      const ladders = Object.entries(LADDERS).map(([f, t]) => ladderSVG(+f, t)).join('');
      const snakes = Object.entries(SNAKES).map(([f, t], i) => snakeSVG(+f, t, SNAKE_COLORS[i % SNAKE_COLORS.length])).join('');
      return `<svg class="sl-links" viewBox="0 0 100 100" preserveAspectRatio="none">${ladders}${snakes}</svg>`;
    }

    function build() {
      const card = (p, i) => `
        <div class="sl-card" id="sl-card-${i}" style="--pc:${p.color.hex};--ps:${p.color.soft}">
          <span class="sl-card-ava">${p.icon}</span>
          <span class="sl-card-info"><span class="sl-card-name">${p.name}</span><span class="sl-card-sq" id="sl-sq-${i}">Start</span></span>
          <span class="sl-card-bar"><i id="sl-bar-${i}"></i></span>
        </div>`;
      const token = (p, i) => `<div class="sl-token${/^\d$/.test(p.icon) ? ' num' : ''}" id="sl-tok-${i}" style="--pc:${p.color.hex}"><span>${p.icon}</span></div>`;
      stage.innerHTML = `
        <div class="sl-root">
          <div class="sl-hud">${players.map(card).join('')}</div>
          <div class="sl-board-frame">
            <div class="sl-board-wrap">
              <div class="sl-board">${boardCells()}</div>
              ${art()}
              <div class="sl-nums">${boardNums()}</div>
              ${players.map(token).join('')}
              <div class="sl-fx" id="sl-fx"></div>
            </div>
          </div>
          <div class="sl-controls">
            <button class="sl-dice3d" id="sl-roll" aria-label="Roll the dice">${diceHTML()}</button>
            <div class="sl-side">
              <div class="sl-msg" id="sl-msg"></div>
              <div class="sl-rolled" id="sl-rolled"></div>
            </div>
          </div>
          <button class="sl-change" id="sl-change">⚙ Change players</button>
        </div>`;
      el = {
        roll: stage.querySelector('#sl-roll'),
        cube: stage.querySelector('#sl-cube'),
        msg: stage.querySelector('#sl-msg'),
        rolled: stage.querySelector('#sl-rolled'),
        fx: stage.querySelector('#sl-fx'),
        tok: players.map((_, i) => stage.querySelector(`#sl-tok-${i}`)),
        sq: players.map((_, i) => stage.querySelector(`#sl-sq-${i}`)),
        bar: players.map((_, i) => stage.querySelector(`#sl-bar-${i}`)),
        card: players.map((_, i) => stage.querySelector(`#sl-card-${i}`)),
      };
      el.roll.onclick = onTapDice;
      stage.querySelector('#sl-change').onclick = () => {
        if (locked) return;
        setup();                        // sets gameOver, so a pending robot turn won't fire
      };
      spin = { x: 0, y: 0 };
      setCube(1, false);
    }

    function placeToken(i) {
      const me = players[i], other = players[1 - i];
      const c = cellCenter(me.pos || 1);
      const shared = (me.pos || 1) === (other.pos || 1);
      const nx = shared ? (i === 0 ? -2.3 : 2.3) : 0;
      const ny = shared ? (i === 0 ? -1.5 : 1.5) : 0;
      el.tok[i].style.left = `${(c.x + nx).toFixed(1)}%`;
      el.tok[i].style.top = `${(c.y + ny).toFixed(1)}%`;
    }
    function placeAll() { placeToken(0); placeToken(1); }

    function showPos(i) {
      el.sq[i].textContent = players[i].pos ? `Square ${players[i].pos}` : 'Start';
      el.bar[i].style.width = `${players[i].pos}%`;
    }

    function refresh() {
      players.forEach((p, i) => {
        showPos(i);
        el.card[i].classList.toggle('turn', cur === i && !gameOver);
        el.tok[i].classList.toggle('active', cur === i && !gameOver);
      });
      placeAll();
      const p = players[cur];
      const ready = !p.bot && !locked && !gameOver;
      el.roll.disabled = !ready;
      el.roll.classList.toggle('ready', ready);
      el.roll.style.setProperty('--pc', p.color.hex);
      el.msg.style.color = p.color.hex;
      el.msg.textContent = gameOver ? '' :
        p.bot ? (locked ? 'Robot is moving…' : 'Robot is rolling…') :
        locked ? `${p.short === 'You' ? 'Moving' : p.name + ' moving'}…` :
        settings.mode === 'friend' ? `${p.name}, tap the dice!` : 'Your turn! Tap the dice';
    }

    function setCube(v, animate) {
      const [rx, ry] = FACE_ROT[v];
      if (animate) {
        // Always tumble forward a few full turns before landing.
        spin.x += 720 + (Math.random() < 0.5 ? 360 : 0);
        spin.y += 720 + (Math.random() < 0.5 ? 360 : 0);
      }
      const baseX = Math.round(spin.x / 360) * 360, baseY = Math.round(spin.y / 360) * 360;
      spin.x = baseX; spin.y = baseY;
      el.cube.style.transition = animate ? `transform ${ROLL_MS}ms cubic-bezier(.2,.75,.25,1)` : 'none';
      // Small fixed tilt so you see two edges, like a real dice on a table.
      el.cube.style.transform = `rotateX(-16deg) rotateY(18deg) rotateX(${baseX + rx}deg) rotateY(${baseY + ry}deg)`;
    }

    function onTapDice() {
      if (players[cur].bot || locked || gameOver || cancelled) return;
      doRoll();
    }

    function doRoll() {
      locked = true;
      const who = cur;
      const roll = 1 + Math.floor(Math.random() * 6);
      el.rolled.textContent = '';
      refresh();
      el.roll.classList.remove('rolling'); void el.roll.offsetWidth; el.roll.classList.add('rolling');
      setCube(roll, true);
      Audio.diceRoll(ROLL_MS - 100);
      setTimeout(() => {
        if (cancelled) return;
        el.roll.classList.remove('rolling');
        const p = players[who];
        el.rolled.innerHTML = `${p.short === 'You' ? 'You' : p.name} rolled <b style="color:${p.color.hex}">${roll}</b>`;
        hop(who, roll, () => land(who, roll));
      }, ROLL_MS + 80);
    }

    // Move one square at a time with a little hop.
    function hop(i, steps, done) {
      let left = Math.min(steps, 100 - players[i].pos);
      if (left <= 0) return done();
      const t = el.tok[i];
      t.style.transition = `left ${STEP_MS - 30}ms ease, top ${STEP_MS - 30}ms ease`;
      const tick = () => {
        if (cancelled) return;
        players[i].pos += 1; left -= 1;
        placeAll();
        t.classList.remove('hop'); void t.offsetWidth; t.classList.add('hop');
        Audio.beep({ freq: 520 + players[i].pos * 3, duration: 0.05, gain: 0.1 });
        showPos(i);
        if (left > 0) setTimeout(tick, STEP_MS);
        else setTimeout(done, STEP_MS);
      };
      tick();
    }

    // ---------- Ladder / snake effects ----------
    function fxAt(n, html, cls, ms = 1600) {
      const c = cellCenter(n);
      const node = document.createElement('div');
      node.className = `sl-fx-item ${cls}`;
      node.style.left = `${c.x}%`;
      node.style.top = `${c.y}%`;
      node.innerHTML = html;
      el.fx.appendChild(node);
      setTimeout(() => node.remove(), ms);
    }

    function celebrateLadder(from, to) {
      // Happy rising sound: quick up-glide then a bright little chord.
      Audio.slide({ from: 330, to: 990, duration: 0.45, type: 'triangle', gain: 0.18 });
      [784, 988, 1175].forEach((f, k) => setTimeout(() => Audio.beep({ freq: f, duration: 0.14, gain: 0.14 }), 420 + k * 90));
      fxAt(from, '😄', 'sl-emoji-happy', 1500);
      // Fireworks at the top of the ladder: two bursts of sparks.
      const colors = ['#FF6B6B', '#FFD43B', '#69DB7C', '#4DABF7', '#DA77F2', '#FFA94D'];
      [0, 260].forEach((delay, b) => setTimeout(() => {
        if (cancelled) return;
        let sparks = '';
        for (let k = 0; k < 14; k++) {
          const ang = (k / 14) * Math.PI * 2 + b * 0.2;
          const dist = 26 + Math.random() * 16;
          sparks += `<i style="--dx:${(Math.cos(ang) * dist).toFixed(1)}px;--dy:${(Math.sin(ang) * dist).toFixed(1)}px;background:${colors[(k + b) % colors.length]}"></i>`;
        }
        fxAt(to, sparks, 'sl-firework', 1100);
      }, SLIDE_MS * 0.6 + delay));
      setTimeout(() => { if (!cancelled) fxAt(to, '🎉', 'sl-emoji-pop', 1300); }, SLIDE_MS);
    }

    function cryOnSnake(from) {
      // Sad "wah-wah": two falling glides, the second one longer.
      Audio.slide({ from: 520, to: 380, duration: 0.35, type: 'sawtooth', gain: 0.09 });
      Audio.slide({ from: 440, to: 220, duration: 0.7, type: 'sawtooth', gain: 0.09, delay: 0.38 });
      fxAt(from, '😭<b class="tear l"></b><b class="tear r"></b>', 'sl-emoji-cry', 1700);
    }

    function land(i, roll) {
      if (cancelled) return;
      const p = players[i];
      if (p.pos >= 100) return finish(i);
      const from = p.pos;
      const jump = LADDERS[from] ?? SNAKES[from];
      if (jump == null) return afterMove(i, roll);
      const up = LADDERS[from] != null;
      const who = p.short === 'You' ? 'You' : p.name;
      toast(up ? `🪜 ${who} climbed up!` : `🐍 Oh no, ${who === 'You' ? 'you' : who} slid down!`, up ? 'good' : 'bad');
      up ? celebrateLadder(from, jump) : cryOnSnake(from);
      const t = el.tok[i];
      t.style.transition = `left ${SLIDE_MS}ms ease-in-out, top ${SLIDE_MS}ms ease-in-out`;
      t.classList.add(up ? 'climb' : 'slide');
      setTimeout(() => {
        if (cancelled) return;
        p.pos = jump;
        placeAll();
        showPos(i);
        setTimeout(() => {
          if (cancelled) return;
          t.classList.remove('climb', 'slide');
          if (p.pos >= 100) return finish(i);   // ladder 80 → 100 wins
          afterMove(i, roll);
        }, SLIDE_MS + 120);
      }, 300);
    }

    function afterMove(i, roll) {
      locked = false;
      const again = roll === 6;              // roll a 6 → same player goes again
      if (again) {
        const p = players[i];
        toast(`🎲 ${p.short === 'You' ? 'You' : p.name} rolled a 6, go again!`, 'good');
      }
      cur = again ? i : 1 - i;
      refresh();
      if (players[cur].bot && !gameOver && !cancelled) setTimeout(() => { if (!cancelled && !locked && !gameOver && players[cur].bot) doRoll(); }, BOT_DELAY);
    }

    function finish(i) {
      gameOver = true;
      locked = false;
      const p = players[i];
      const humanWon = !p.bot;
      const vsRobot = settings.mode !== 'friend';
      const stars = humanWon ? 3 : 1;
      Storage.addStars(stars);
      Storage.setLevelScore(14, humanWon ? 100 : 10);
      humanWon ? Audio.win() : Audio.wrong();
      refresh();
      if (humanWon) [0, 300, 600].forEach(d => setTimeout(() => { if (!cancelled) celebrateBurst(); }, d));
      setTimeout(() => {
        if (cancelled) return;
        showDone({
          title: vsRobot ? (humanWon ? 'You Win! 🎉' : 'Robot Wins 🤖') : `${p.name} Wins! 🎉`,
          stars,
          summary: vsRobot
            ? (humanWon ? `You reached 100! Lifetime ⭐ ${Storage.getStars()}` : 'So close! Tap Play Again.')
            : `${p.name} (${p.color.name}) reached 100 first! Play again?`,
          onAgain: () => { showGame(); newGame(); },
          onNext: () => onExit({ next: true }),
          onHome: () => onExit({ home: true }),
        });
      }, 1300);
    }

    function celebrateBurst() {
      const n = 91 + Math.floor(Math.random() * 10);
      const colors = ['#FF6B6B', '#FFD43B', '#69DB7C', '#4DABF7', '#DA77F2'];
      let sparks = '';
      for (let k = 0; k < 16; k++) {
        const ang = (k / 16) * Math.PI * 2;
        sparks += `<i style="--dx:${(Math.cos(ang) * 40).toFixed(1)}px;--dy:${(Math.sin(ang) * 40).toFixed(1)}px;background:${colors[k % colors.length]}"></i>`;
      }
      fxAt(n, sparks, 'sl-firework', 1100);
    }

    function showGame() {
      document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
      document.getElementById('game-screen').classList.remove('hidden');
    }
  }
};

function toast(msg, kind = 'good') {
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1400);
}
