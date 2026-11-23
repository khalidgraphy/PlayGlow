// Activity 18: Chess.
//   • Learn: meet the 6 pieces (catch the black pawns with each piece),
//     special rules (check, checkmate, castling, promotion, en passant,
//     stalemate), 3 scenario puzzles a day + more on demand, tip of the day.
//   • Play with Robot: Basic / Intermediate / Expert, play White, Black or random.
//   • Play with Friend: two players on one phone. The level sets the helpers.
//   Levels: Basic = move dots, danger warnings, hints, undo.
//           Intermediate = move dots, 3 hints a game, undo.
//           Expert = no dots, no hints, no undo.
// Rules and legal moves: chess.js 1.2.0 (BSD-2). Robot: ./chessEngine.js.
// Unfinished games are saved and can be continued.

import { Chess } from 'chess.js';
import { Audio } from '../audio.js';
import { Storage } from '../storage.js';
import { bestMove } from './chessEngine.js';
import { PIECES, RULES, PUZZLES, TIPS } from './chessLessons.js';

const LEVEL_ID = 18;
const SETTINGS_KEY = 'playglow:chess:settings';
const GAME_KEY = 'playglow:chess:game';
const FILES = 'abcdefgh';
const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const NAME = { k: 'King', q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight', p: 'Pawn' };
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const START_COUNT = { p: 8, n: 2, b: 2, r: 2, q: 1 };

const LEVELS = {
  basic: {
    name: 'Basic', emoji: '🌱', dots: true, danger: true, hints: 99, undo: true, stars: 2,
    robot: 'Robot makes beginner moves.',
    help: 'Dots show every move, orange rings and warnings show danger. Hints and undo any time.',
  },
  intermediate: {
    name: 'Intermediate', emoji: '🌿', dots: true, danger: false, hints: 3, undo: true, stars: 3,
    robot: 'Robot thinks 2 moves ahead.',
    help: 'Dots show your moves. 3 hints per game, undo allowed.',
  },
  expert: {
    name: 'Expert', emoji: '🌳', dots: false, danger: false, hints: 0, undo: false, stars: 5,
    robot: 'Robot thinks deeper and plays its best.',
    help: 'Real chess: no dots, no hints, no undo.',
  },
};

let abortPrev = null;

// ---------- storage ----------
function loadSettings() {
  const def = { mode: 'learn', level: 'basic', side: 'w' };
  try {
    const s = Object.assign({}, def, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'));
    if (['learn', 'robot', 'friend'].indexOf(s.mode) < 0) s.mode = 'learn';
    if (!LEVELS[s.level]) s.level = 'basic';
    if (['w', 'b', 'r'].indexOf(s.side) < 0) s.side = 'w';
    return s;
  } catch (e) { return def; }
}
function saveSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {} }
function loadGame() {
  try {
    const g = JSON.parse(localStorage.getItem(GAME_KEY) || 'null');
    return g && g.pgn != null && LEVELS[g.level] ? g : null;
  } catch (e) { return null; }
}
function saveGame(g) { try { localStorage.setItem(GAME_KEY, JSON.stringify(g)); } catch (e) {} }
function clearGame() { try { localStorage.removeItem(GAME_KEY); } catch (e) {} }

function progKey() {
  const p = Storage.getActiveProfile();
  return 'playglow:chess:learn:' + ((p && (p.id || p.name)) || 'guest');
}
function loadProg() {
  let p = {};
  try { p = JSON.parse(localStorage.getItem(progKey()) || '{}') || {}; } catch (e) {}
  return {
    pieces: Array.isArray(p.pieces) ? p.pieces : [],
    rules: Array.isArray(p.rules) ? p.rules : [],
    solved: Array.isArray(p.solved) ? p.solved : [],
    day: p.day && Array.isArray(p.day.ids) ? p.day : null,
    streak: p.streak || 0,
    lastDay: p.lastDay || '',
  };
}
function saveProg(p) { try { localStorage.setItem(progKey(), JSON.stringify(p)); } catch (e) {} }

function dayStr(offset) {
  const d = new Date();
  d.setDate(d.getDate() + (offset || 0));
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => {
    h = (h + 0x6D2B79F5) >>> 0;
    let r = Math.imul(h ^ (h >>> 15), 1 | h);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- helpers ----------
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function glyph(t) { return GLYPH[t] + '︎'; }
function pieceHTML(p) { return p ? `<span class="cs-pc ${p.color}">${glyph(p.type)}</span>` : ''; }
function fileOf(sq) { return FILES.indexOf(sq[0]); }
function rankOf(sq) { return +sq[1]; }
function toast(msg, kind) {
  const el = document.createElement('div');
  el.className = 'toast ' + (kind || 'good');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}
function moveSound(m, inCheck) {
  if (m.captured) {
    Audio.beep({ freq: 300, duration: 0.08, type: 'square', gain: 0.07 });
    setTimeout(() => Audio.beep({ freq: 620, duration: 0.07, type: 'triangle', gain: 0.12 }), 70);
  } else {
    Audio.beep({ freq: 520, duration: 0.05, type: 'triangle', gain: 0.15 });
  }
  if (inCheck) setTimeout(() => Audio.slide({ from: 500, to: 950, duration: 0.25, type: 'triangle', gain: 0.13 }), 120);
}

// 64 squares. o: { get(sq), flip, sel, dots, danger, last, check, hint, targets }
function squaresHTML(o) {
  let h = '';
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const file = o.flip ? 7 - f : f;
      const rank = o.flip ? r + 1 : 8 - r;
      const sq = FILES[file] + rank;
      const p = o.get(sq);
      let cls = 'cs-sq ' + ((file + rank) % 2 === 0 ? 'dk' : 'lt');
      if (o.last && (o.last[0] === sq || o.last[1] === sq)) cls += ' last';
      if (o.sel === sq) cls += ' sel';
      if (o.check === sq) cls += ' chk';
      if (o.hint && o.hint.indexOf(sq) >= 0) cls += ' hint';
      if (o.targets && o.targets.indexOf(sq) >= 0) cls += ' tgt';
      let mark = '';
      if (o.dots && o.dots.indexOf(sq) >= 0) {
        const danger = o.danger && o.danger.indexOf(sq) >= 0;
        mark = `<i class="cs-dot${p ? ' cap' : ''}${danger ? ' warn' : ''}"></i>`;
      }
      const coord = (r === 7 ? `<b class="cs-f">${FILES[file]}</b>` : '') + (f === 0 ? `<b class="cs-r">${rank}</b>` : '');
      h += `<button class="${cls}" data-sq="${sq}" aria-label="${sq}${p ? ' ' + (p.color === 'w' ? 'white ' : 'black ') + NAME[p.type] : ''}">${coord}${pieceHTML(p)}${mark}</button>`;
    }
  }
  return h;
}

// Slide the piece that just landed on `to` from `from`.
function animate(boardEl, from, to, flip) {
  const span = boardEl.querySelector(`[data-sq="${to}"] .cs-pc`);
  if (!span) return;
  const col = s => flip ? 7 - fileOf(s) : fileOf(s);
  const row = s => flip ? rankOf(s) - 1 : 8 - rankOf(s);
  const dx = (col(from) - col(to)) * 100, dy = (row(from) - row(to)) * 100;
  span.style.transition = 'none';
  span.style.transform = `translate(${dx}%, ${dy}%)`;
  span.classList.add('moving');
  void span.offsetWidth;
  span.style.transition = 'transform .24s ease';
  span.style.transform = '';
  setTimeout(() => span.classList.remove('moving'), 260);
}

// Interactive board for a real chess.js position (games, rules, puzzles).
function makeBoard(host, chess, cfg) {
  let sel = null, moves = [], last = null, hint = null, dangerSq = [];
  host.innerHTML = `<div class="cs-board"></div><div class="cs-promo hidden"></div>`;
  const boardEl = host.querySelector('.cs-board');
  const promoEl = host.querySelector('.cs-promo');
  boardEl.onclick = e => {
    const b = e.target.closest('[data-sq]');
    if (b) tap(b.dataset.sq);
  };

  function kingSq() {
    if (!chess.inCheck()) return null;
    return chess.findPiece({ type: 'k', color: chess.turn() })[0] || null;
  }
  function render(anim) {
    boardEl.innerHTML = squaresHTML({
      get: sq => chess.get(sq) || null,
      flip: cfg.flip, sel, last, check: kingSq(), hint,
      dots: cfg.dots() ? moves.map(m => m.to) : null,
      danger: dangerSq,
    });
    if (anim) animate(boardEl, anim.from, anim.to, cfg.flip);
  }
  function select(sq) {
    sel = sq;
    moves = sq ? chess.moves({ square: sq, verbose: true }) : [];
    dangerSq = [];
    if (sq && cfg.danger()) {
      const opp = chess.turn() === 'w' ? 'b' : 'w';
      const seen = {};
      moves.forEach(m => {
        if (seen[m.to] != null) return;
        chess.move(m);
        seen[m.to] = chess.isAttacked(m.to, opp);
        chess.undo();
        if (seen[m.to]) dangerSq.push(m.to);
      });
    }
  }
  function tap(sq) {
    if (!cfg.canTap()) return;
    const to = moves.filter(m => m.to === sq);
    if (sel && to.length) {
      if (to.some(m => m.promotion)) return askPromo(chess.turn(), p => play(sel, sq, p));
      return play(sel, sq);
    }
    const p = chess.get(sq);
    if (p && p.color === chess.turn()) {
      select(sq === sel ? null : sq);
      if (sel) Audio.beep({ freq: 700, duration: 0.03, gain: 0.06 });
      render();
      return;
    }
    if (sel) {
      if (!cfg.dots()) boardEl.classList.add('nope'), setTimeout(() => boardEl.classList.remove('nope'), 300);
      select(null);
      render();
    }
  }
  function askPromo(color, done) {
    promoEl.innerHTML = `<div class="cs-promo-box"><div class="cs-promo-t">Your pawn becomes…</div>
      <div class="cs-promo-row">${['q', 'r', 'b', 'n'].map(t => `<button data-p="${t}"><span class="cs-pc ${color}">${glyph(t)}</span><em>${NAME[t]}</em></button>`).join('')}</div>
      <button class="cs-promo-x">Cancel</button></div>`;
    promoEl.classList.remove('hidden');
    promoEl.querySelectorAll('[data-p]').forEach(b => {
      b.onclick = () => { promoEl.classList.add('hidden'); done(b.dataset.p); };
    });
    promoEl.querySelector('.cs-promo-x').onclick = () => { promoEl.classList.add('hidden'); select(null); render(); };
  }
  function play(from, to, promotion) {
    let m = null;
    try { m = chess.move({ from, to, promotion: promotion || 'q' }); } catch (e) { m = null; }
    select(null); hint = null;
    if (!m) { render(); return null; }
    last = [m.from, m.to];
    render(m);
    moveSound(m, chess.inCheck());
    if (cfg.onMove) cfg.onMove(m);
    return m;
  }
  function syncLast() {
    const h = chess.history({ verbose: true });
    const m = h[h.length - 1];
    last = m ? [m.from, m.to] : null;
  }
  return {
    render, play, syncLast,
    clear() { select(null); hint = null; render(); },
    setHint(h) { select(null); hint = h; render(); },
    el: boardEl,
  };
}

// ---------- the activity ----------
export const chess = {
  id: LEVEL_ID,
  name: 'Chess',
  emoji: '♟️',
  desc: 'Learn chess, then play Robot or Friend',
  ageHint: 'Age 6+',
  guide: 'Learn: meet every piece and how it moves, the special rules, and 3 new practice scenarios every day. Then play with the Robot (Basic, Intermediate or Expert) or with a friend on the same phone. Tap a piece, then tap where it should go. Trap the other King (checkmate) to win!',
  custom: true,

  start(stage, { onExit, showDone }) {
    if (abortPrev) abortPrev();
    let cancelled = false;
    abortPrev = () => { cancelled = true; };
    let gen = 0;
    const profile = Storage.getActiveProfile();
    const avatar = (profile && profile.avatar) || '🦊';
    const myName = (profile && profile.name) || 'You';
    let settings = loadSettings();

    function later(fn, ms) {
      const g = gen;
      setTimeout(() => { if (!cancelled && g === gen) fn(); }, ms);
    }
    function onScreen() {
      const gs = document.getElementById('game-screen');
      return !gs || !gs.classList.contains('hidden');
    }
    function showGame() {
      document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
      document.getElementById('game-screen').classList.remove('hidden');
    }
    function addStars(n) { if (n > 0) Storage.addStars(n); }

    setup();

    // ===== Start screen =====
    function setup() {
      gen += 1;
      const m = settings.mode;
      const saved = loadGame();
      const prog = loadProg();
      const lessonsDone = prog.pieces.length + prog.rules.length;
      const lessonsAll = PIECES.length + RULES.length;
      const L = LEVELS[settings.level];
      const levelChips = Object.keys(LEVELS).map(k =>
        `<button class="ld-chip${settings.level === k ? ' on' : ''}" data-level="${k}">${LEVELS[k].emoji} ${LEVELS[k].name}</button>`).join('');
      const sideChips = [['w', '♔ White'], ['b', '♚ Black'], ['r', '🎲 Random']].map(([k, t]) =>
        `<button class="ld-chip${settings.side === k ? ' on' : ''}" data-side="${k}">${t}</button>`).join('');
      let body = '';
      if (m === 'learn') {
        body = `
          <div class="cs-note">Learn how every piece moves, the special rules, and solve 3 new chess scenarios every day.</div>
          <div class="cs-note sm">📘 Lessons done: <b>${lessonsDone} of ${lessonsAll}</b> · 🧩 Scenarios solved: <b>${prog.solved.length}</b>${prog.streak ? ` · 🔥 ${prog.streak} day streak` : ''}</div>
          <button class="sl-go" id="cs-go">Open lessons ▶</button>`;
      } else {
        body = `
          <div class="sl-pick"><div class="sl-pick-label">Level</div><div class="ld-chips">${levelChips}</div></div>
          <div class="cs-note sm">${m === 'robot' ? esc(L.robot) + ' ' : ''}${esc(L.help)}</div>
          ${m === 'robot' ? `<div class="sl-pick"><div class="sl-pick-label">You play</div><div class="ld-chips">${sideChips}</div></div>` : '<div class="cs-note sm">White moves first. Pass the phone after each move.</div>'}
          <button class="sl-go" id="cs-go">Start game ▶</button>`;
      }
      const cont = saved ? `<button class="cs-continue" id="cs-continue">▶ Continue your game<small>${saved.mode === 'robot' ? 'vs Robot' : 'with Friend'}, ${LEVELS[saved.level].name}, move ${saved.moves || 1}</small></button>` : '';
      stage.innerHTML = `
        <div class="sl-setup cs-setup">
          <div class="sl-setup-title">♟️ Chess</div>
          ${cont}
          <div class="sl-modes cs-modes">
            <button class="sl-mode${m === 'learn' ? ' on' : ''}" data-mode="learn"><span class="sl-mode-ico">📘</span>Learn</button>
            <button class="sl-mode${m === 'robot' ? ' on' : ''}" data-mode="robot"><span class="sl-mode-ico">🤖</span>Robot</button>
            <button class="sl-mode${m === 'friend' ? ' on' : ''}" data-mode="friend"><span class="sl-mode-ico">👫</span>Friend</button>
          </div>
          ${body}
        </div>`;
      stage.querySelectorAll('[data-mode]').forEach(b => {
        b.onclick = () => { settings.mode = b.dataset.mode; saveSettings(settings); setup(); };
      });
      stage.querySelectorAll('[data-level]').forEach(b => {
        b.onclick = () => { settings.level = b.dataset.level; saveSettings(settings); setup(); };
      });
      stage.querySelectorAll('[data-side]').forEach(b => {
        b.onclick = () => { settings.side = b.dataset.side; saveSettings(settings); setup(); };
      });
      stage.querySelector('#cs-go').onclick = () => {
        Audio.arm();
        if (m === 'learn') return learnHub();
        if (saved && !confirm('Start a new game? Your saved game will be replaced.')) return;
        clearGame();
        play(null);
      };
      const c = stage.querySelector('#cs-continue');
      if (c) c.onclick = () => { Audio.arm(); play(saved); };
    }

    // ===== Learn hub =====
    function todayPuzzles(prog) {
      const today = dayStr(0);
      if (prog.day && prog.day.date === today) return prog.day;
      const rand = seeded(today + '|' + progKey());
      const shuffled = PUZZLES.slice().sort(() => rand() - 0.5);
      const fresh = shuffled.filter(p => prog.solved.indexOf(p.id) < 0);
      const old = shuffled.filter(p => prog.solved.indexOf(p.id) >= 0);
      prog.day = { date: today, ids: fresh.concat(old).slice(0, 3).map(p => p.id), done: [] };
      saveProg(prog);
      return prog.day;
    }

    function learnHub() {
      gen += 1;
      const prog = loadProg();
      const day = todayPuzzles(prog);
      const tip = TIPS[Math.floor(seeded(dayStr(0))() * TIPS.length)];
      const pieceCards = PIECES.map((p, i) => `
        <button class="cs-pcard${prog.pieces.indexOf(p.key) >= 0 ? ' done' : ''}" data-piece="${i}">
          <span class="cs-pc w">${glyph(p.key)}</span><em>${p.name}</em>
        </button>`).join('');
      const ruleRows = RULES.map((r, i) => `
        <button class="cs-row${prog.rules.indexOf(r.id) >= 0 ? ' done' : ''}" data-rule="${i}">
          <span class="cs-row-ico">${r.emoji}</span><span class="cs-row-t">${r.title}</span>
        </button>`).join('');
      const dayRows = day.ids.map((id, i) => {
        const pz = PUZZLES.find(p => p.id === id);
        if (!pz) return '';
        return `<button class="cs-row${day.done.indexOf(id) >= 0 ? ' done' : ''}" data-day="${i}">
          <span class="cs-row-ico">🧩</span><span class="cs-row-t">Scenario ${i + 1}: ${pz.cat}</span></button>`;
      }).join('');
      stage.innerHTML = `
        <div class="cs-learn">
          <div class="cs-tip"><b>💡 Tip of the day</b>${esc(tip)}</div>
          <div class="cs-sec">1. Meet the pieces <span>${prog.pieces.length} of ${PIECES.length}</span></div>
          <div class="cs-pgrid">${pieceCards}</div>
          <div class="cs-sec">2. Special rules <span>${prog.rules.length} of ${RULES.length}</span></div>
          <div class="cs-list">${ruleRows}</div>
          <div class="cs-sec">3. Today's practice <span>${day.done.length} of ${day.ids.length}${prog.streak ? ' · 🔥 ' + prog.streak : ''}</span></div>
          <div class="cs-list">${dayRows}</div>
          <button class="cs-more" id="cs-more">🎲 More scenarios</button>
          <button class="sl-change" id="cs-menu">⚙ Chess menu</button>
        </div>`;
      stage.querySelectorAll('[data-piece]').forEach(b => { b.onclick = () => pieceLesson(+b.dataset.piece); });
      stage.querySelectorAll('[data-rule]').forEach(b => { b.onclick = () => ruleLesson(+b.dataset.rule); });
      stage.querySelectorAll('[data-day]').forEach(b => { b.onclick = () => puzzle(day.ids[+b.dataset.day], 'day'); });
      stage.querySelector('#cs-more').onclick = () => puzzle(randomPuzzle(null), 'more');
      stage.querySelector('#cs-menu').onclick = setup;
      stage.scrollTop = 0;
    }

    function randomPuzzle(notId) {
      const prog = loadProg();
      const pool = PUZZLES.filter(p => p.id !== notId);
      const fresh = pool.filter(p => prog.solved.indexOf(p.id) < 0);
      const list = fresh.length ? fresh : pool;
      return list[Math.floor(Math.random() * list.length)].id;
    }

    function langNames(p) {
      const sec = Storage.getSecondaryLang ? Storage.getSecondaryLang() : '';
      const ur = `<span class="cs-native" dir="rtl" lang="ur">${p.ur}</span>`;
      const ar = `<span class="cs-native" dir="rtl" lang="ar">${p.ar}</span>`;
      if (sec === 'ar') return ar;
      if (sec === 'ur') return ur;
      return ur + ar;
    }

    // ===== Piece lesson: catch the black pawns =====
    function pieceLesson(i) {
      gen += 1;
      const P = PIECES[i];
      let type = P.key, at = P.start, left = P.targets.slice(), steps = 0, promoted = false, done = false;
      stage.innerHTML = `
        <div class="cs-lesson">
          <div class="cs-lhead">
            <span class="cs-big"><span class="cs-pc w">${glyph(P.key)}</span></span>
            <div class="cs-lname"><b>${P.name}</b>${langNames(P)}<small>Worth: ${P.value}</small></div>
            <button class="cs-say" id="cs-say" aria-label="Say the name">🔊</button>
          </div>
          <div class="cs-text">${esc(P.moves)}</div>
          <div class="cs-goal" id="cs-goal"></div>
          <div class="cs-host" id="cs-host"><div class="cs-board"></div></div>
          <div class="cs-text sm">${esc(P.tip)}</div>
          <div class="cs-btns">
            <button class="cs-btn" id="cs-back">← Lessons</button>
            <button class="cs-btn" id="cs-reset">↺ Again</button>
            <button class="cs-btn pri hidden" id="cs-next">Next ▶</button>
          </div>
        </div>`;
      const boardEl = stage.querySelector('.cs-board');
      const goal = stage.querySelector('#cs-goal');
      stage.querySelector('#cs-say').onclick = () => Audio.speak(P.name, 'en');
      stage.querySelector('#cs-back').onclick = learnHub;
      stage.querySelector('#cs-reset').onclick = () => pieceLesson(i);
      const next = stage.querySelector('#cs-next');
      next.onclick = () => (i + 1 < PIECES.length ? pieceLesson(i + 1) : learnHub());
      next.textContent = i + 1 < PIECES.length ? `Next: ${PIECES[i + 1].name} ▶` : 'Lessons ▶';
      boardEl.onclick = e => {
        const b = e.target.closest('[data-sq]');
        if (!b || done) return;
        const sq = b.dataset.sq;
        if (lessonMoves(type, at, left).indexOf(sq) < 0) return;
        const from = at;
        at = sq; steps += 1;
        const hit = left.indexOf(sq) >= 0;
        left = left.filter(s => s !== sq);
        if (type === 'p' && rankOf(sq) === 8) { type = 'q'; promoted = true; toast('⭐ Promotion! Your pawn is now a Queen', 'good'); }
        draw({ from, to: sq });
        moveSound({ captured: hit }, false);
        check();
      };
      function draw(anim) {
        const dots = done ? [] : lessonMoves(type, at, left);
        boardEl.innerHTML = squaresHTML({
          get: sq => sq === at ? { type, color: 'w' } : (left.indexOf(sq) >= 0 ? { type: 'p', color: 'b' } : null),
          dots, sel: done ? null : at,
        });
        if (anim) animate(boardEl, anim.from, anim.to, false);
        const need = P.promote && !promoted ? ' Then reach the top row.' : '';
        goal.innerHTML = done ? `🎉 Well done! You caught them all in ${steps} moves.`
          : left.length ? `🎯 Catch the ${left.length} black pawn${left.length > 1 ? 's' : ''}!${need} Tap a dot.`
          : `🎯 Now reach the top row to promote!`;
        if (!done && !dots.length) goal.innerHTML = '😮 Stuck! Pawns cannot go back. Tap ↺ Again.';
      }
      function check() {
        if (left.length || (P.promote && !promoted)) return;
        done = true;
        draw();
        Audio.win();
        const prog = loadProg();
        if (prog.pieces.indexOf(P.key) < 0) { prog.pieces.push(P.key); saveProg(prog); addStars(1); toast(`⭐ You learned the ${P.name}!`, 'good'); }
        next.classList.remove('hidden');
      }
      draw();
      Audio.speak(P.name, 'en');
    }

    // Moves of a lone white piece; targets (black pawns) can be captured and block.
    function lessonMoves(type, at, targets) {
      const f = fileOf(at), r = rankOf(at), out = [];
      const on = (ff, rr) => ff >= 0 && ff < 8 && rr >= 1 && rr <= 8;
      const sq = (ff, rr) => FILES[ff] + rr;
      const isT = s => targets.indexOf(s) >= 0;
      if (type === 'p') {
        if (on(f, r + 1) && !isT(sq(f, r + 1))) {
          out.push(sq(f, r + 1));
          if (r === 2 && !isT(sq(f, 4))) out.push(sq(f, 4));
        }
        [-1, 1].forEach(d => { if (on(f + d, r + 1) && isT(sq(f + d, r + 1))) out.push(sq(f + d, r + 1)); });
        return out;
      }
      const KN = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
      const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]], DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
      if (type === 'n' || type === 'k') {
        (type === 'n' ? KN : ORTH.concat(DIAG)).forEach(([df, dr]) => { if (on(f + df, r + dr)) out.push(sq(f + df, r + dr)); });
        return out;
      }
      const dirs = type === 'r' ? ORTH : type === 'b' ? DIAG : ORTH.concat(DIAG);
      dirs.forEach(([df, dr]) => {
        let ff = f + df, rr = r + dr;
        while (on(ff, rr)) {
          out.push(sq(ff, rr));
          if (isT(sq(ff, rr))) break;
          ff += df; rr += dr;
        }
      });
      return out;
    }

    // ===== Rule lessons + puzzles share one "make the right move" screen =====
    function goalMet(item, m, c) {
      const g = item.goal;
      if (g === 'any') return true;
      if (g === 'mate') return c.isCheckmate();
      if (g === 'castle') return /[kq]/.test(m.flags);
      if (g === 'promote') return m.promotion === 'q';
      if (g === 'ep') return m.flags.indexOf('e') >= 0;
      return (item.sol || []).indexOf(m.san) >= 0;
    }
    function wrongText(item, m, c) {
      if (c.isStalemate()) return '🤝 That is stalemate, a draw! Try again.';
      if (item.goal === 'promote' && m.promotion) return 'Good, but pick the Queen, she is the strongest!';
      if (item.goal === 'mate' && c.inCheck()) return 'Check, but the King can still escape. Try again!';
      return 'Not quite. Try again!';
    }

    function taskScreen(item, opts) {
      gen += 1;
      const c = new Chess(item.fen);
      let solved = false, wrongLock = false;
      stage.innerHTML = `
        <div class="cs-lesson">
          <div class="cs-ltitle">${opts.title}</div>
          ${item.text ? `<div class="cs-text">${esc(item.text)}</div>` : ''}
          <div class="cs-goal" id="cs-goal">${opts.task ? '👉 ' + esc(opts.task) : ''}</div>
          <div class="cs-host" id="cs-host"></div>
          <div class="cs-btns">
            <button class="cs-btn" id="cs-back">← Lessons</button>
            ${opts.hint ? '<button class="cs-btn" id="cs-hint">💡 Hint</button>' : ''}
            <button class="cs-btn pri${item.type === 'see' ? '' : ' hidden'}" id="cs-next">${opts.nextLabel}</button>
          </div>
        </div>`;
      const goal = stage.querySelector('#cs-goal');
      const next = stage.querySelector('#cs-next');
      stage.querySelector('#cs-back').onclick = learnHub;
      next.onclick = opts.onNext;
      const board = makeBoard(stage.querySelector('#cs-host'), c, {
        flip: false,
        dots: () => true,
        danger: () => false,
        canTap: () => item.type !== 'see' && !solved && !wrongLock,
        onMove: m => {
          if (goalMet(item, m, c)) {
            solved = true;
            goal.innerHTML = '🎉 ' + esc(opts.doneText || 'Correct!');
            Audio.correct();
            next.classList.remove('hidden');
            opts.onSolved();
          } else {
            wrongLock = true;
            goal.innerHTML = '❌ ' + esc(wrongText(item, m, c));
            Audio.wrong();
            later(() => { c.undo(); board.syncLast(); board.clear(); wrongLock = false; }, 1300);
          }
        },
      });
      board.render();
      if (item.type === 'see') opts.onSolved();
      const h = stage.querySelector('#cs-hint');
      if (h) h.onclick = () => {
        if (solved) return;
        board.setHint([item.hint]);
        goal.innerHTML = `💡 Look at the ${NAME[(c.get(item.hint) || {}).type] || 'piece'} on ${item.hint}.`;
      };
    }

    function ruleLesson(i) {
      const r = RULES[i];
      const last = i + 1 >= RULES.length;
      taskScreen(r, {
        title: `${r.emoji} ${r.title}`,
        task: r.task,
        doneText: r.done,
        nextLabel: last ? 'Lessons ▶' : `Next: ${RULES[i + 1].title} ▶`,
        onNext: () => (last ? learnHub() : ruleLesson(i + 1)),
        onSolved: () => {
          const prog = loadProg();
          if (prog.rules.indexOf(r.id) < 0) { prog.rules.push(r.id); saveProg(prog); addStars(1); }
        },
      });
    }

    function puzzle(id, from) {
      const pz = PUZZLES.find(p => p.id === id);
      if (!pz) return learnHub();
      const prog0 = loadProg();
      const day = prog0.day;
      const dayIdx = from === 'day' && day ? day.ids.indexOf(id) : -1;
      const nextDayId = dayIdx >= 0 ? day.ids.find(x => x !== id && day.done.indexOf(x) < 0) : null;
      const task = pz.goal === 'mate' ? 'White to move. Find checkmate in 1!'
        : pz.goal === 'promote' ? 'White to move. Promote your pawn!'
        : `White to move. Find the best move (${pz.cat.toLowerCase()}).`;
      taskScreen(pz, {
        title: `🧩 ${dayIdx >= 0 ? 'Scenario ' + (dayIdx + 1) + ': ' : ''}${pz.cat}`,
        task,
        hint: true,
        doneText: pz.why,
        nextLabel: from === 'day' ? (nextDayId ? 'Next scenario ▶' : 'Done ▶') : 'Another one ▶',
        onNext: () => (from === 'day' ? (nextDayId ? puzzle(nextDayId, 'day') : learnHub()) : puzzle(randomPuzzle(id), 'more')),
        onSolved: () => {
          const prog = loadProg();
          if (prog.solved.indexOf(id) < 0) { prog.solved.push(id); addStars(1); }
          if (prog.day && prog.day.date === dayStr(0) && prog.day.ids.indexOf(id) >= 0 && prog.day.done.indexOf(id) < 0) {
            prog.day.done.push(id);
            if (prog.day.done.length === prog.day.ids.length && prog.lastDay !== dayStr(0)) {
              prog.streak = prog.lastDay === dayStr(-1) ? prog.streak + 1 : 1;
              prog.lastDay = dayStr(0);
              addStars(2);
              later(() => toast(`🔥 Today's practice done! Streak: ${prog.streak} day${prog.streak > 1 ? 's' : ''}`, 'good'), 900);
            }
          }
          saveProg(prog);
        },
      });
    }

    // ===== Game: Robot or Friend =====
    function play(saved) {
      gen += 1;
      const mode = saved ? saved.mode : settings.mode;
      const level = saved ? saved.level : settings.level;
      const L = LEVELS[level];
      const vsRobot = mode === 'robot';
      let side = saved ? saved.side : (settings.side === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : settings.side);
      if (side !== 'b') side = 'w';
      const c = new Chess();
      if (saved && saved.pgn) { try { c.loadPgn(saved.pgn); } catch (e) { c.reset(); } }
      let hintsLeft = saved && saved.hints != null ? saved.hints : L.hints;
      let thinking = false, over = false;
      const flip = vsRobot && side === 'b';
      const isHuman = col => !vsRobot || col === side;
      const who = col => vsRobot
        ? (col === side ? { icon: avatar, name: myName } : { icon: '🤖', name: `Robot (${L.name})` })
        : { icon: col === 'w' ? '♔' : '♚', name: col === 'w' ? 'Player 1 (White)' : 'Player 2 (Black)' };
      const topCol = flip ? 'w' : 'b', botCol = flip ? 'b' : 'w';
      const bar = col => `
        <div class="cs-bar" id="cs-bar-${col}">
          <span class="cs-ava">${esc(who(col).icon)}</span>
          <span class="cs-who"><b>${esc(who(col).name)}</b><span class="cs-caps" id="cs-caps-${col}"></span></span>
          <span class="cs-dotc ${col}"></span>
        </div>`;
      stage.innerHTML = `
        <div class="cs-root">
          ${bar(topCol)}
          <div class="cs-host" id="cs-host"></div>
          ${bar(botCol)}
          <div class="cs-msg" id="cs-msg"></div>
          <div class="cs-btns">
            ${L.undo ? '<button class="cs-btn" id="cs-undo">↶ Undo</button>' : ''}
            ${L.hints ? '<button class="cs-btn" id="cs-hint">💡 Hint</button>' : ''}
            <button class="cs-btn" id="cs-new">🔄 New</button>
            <button class="cs-btn" id="cs-menu">⚙ Menu</button>
          </div>
        </div>`;
      const msg = stage.querySelector('#cs-msg');
      const board = makeBoard(stage.querySelector('#cs-host'), c, {
        flip,
        dots: () => L.dots,
        danger: () => L.danger,
        canTap: () => !over && !thinking && isHuman(c.turn()),
        onMove: afterMove,
      });
      board.syncLast();
      board.render();
      const undoBtn = stage.querySelector('#cs-undo');
      const hintBtn = stage.querySelector('#cs-hint');
      if (undoBtn) undoBtn.onclick = undo;
      if (hintBtn) hintBtn.onclick = hint;
      stage.querySelector('#cs-new').onclick = () => {
        if (!over && c.history().length && !confirm('Start a new game?')) return;
        clearGame();
        settings.mode = mode; settings.level = level;
        play(null);
      };
      stage.querySelector('#cs-menu').onclick = setup;
      refresh();
      if (!checkEnd()) nextTurn();

      function save() {
        if (over) return;
        saveGame({ mode, level, side, pgn: c.pgn(), hints: hintsLeft, moves: Math.ceil((c.history().length + 1) / 2) });
      }
      function refresh() {
        ['w', 'b'].forEach(col => {
          const b = stage.querySelector('#cs-bar-' + col);
          if (b) b.classList.toggle('turn', !over && c.turn() === col);
          const el = stage.querySelector('#cs-caps-' + col);
          if (el) el.innerHTML = capturedHTML(c, col);
        });
        if (undoBtn) undoBtn.disabled = thinking || over || !c.history().length;
        if (hintBtn) {
          hintBtn.disabled = thinking || over || hintsLeft <= 0 || !isHuman(c.turn());
          hintBtn.textContent = L.hints < 50 ? `💡 Hint (${Math.max(0, hintsLeft)})` : '💡 Hint';
        }
      }
      function turnText() {
        const col = c.turn();
        const check = c.inCheck();
        if (vsRobot) {
          if (!isHuman(col)) return '🤖 Robot is thinking…';
          return check ? '⚠️ Check! Protect your King' : `Your turn (${side === 'w' ? 'White' : 'Black'})`;
        }
        const name = col === 'w' ? 'White' : 'Black';
        return check ? `⚠️ ${name} is in check!` : `${name}'s turn`;
      }
      // Basic level: warn about own pieces that can be taken for free.
      function dangerText() {
        if (!L.danger) return '';
        const me = c.turn(), opp = me === 'w' ? 'b' : 'w';
        let worst = null;
        ['q', 'r', 'b', 'n'].forEach(t => c.findPiece({ type: t, color: me }).forEach(sq => {
          const att = c.attackers(sq, opp);
          if (!att.length) return;
          const minAtt = Math.min.apply(null, att.map(a => VALUE[c.get(a).type] || 0));
          const guarded = c.isAttacked(sq, me);
          if ((!guarded || minAtt < VALUE[t]) && (!worst || VALUE[t] > VALUE[worst.t])) worst = { t, sq };
        }));
        return worst ? `<span class="cs-warn">⚠️ Careful! Your ${NAME[worst.t]} on ${worst.sq} can be captured.</span>` : '';
      }
      function nextTurn() {
        refresh();
        msg.innerHTML = esc(turnText()) + (isHuman(c.turn()) ? dangerText() : '');
        if (c.inCheck()) msg.classList.add('chk'); else msg.classList.remove('chk');
        if (vsRobot && !isHuman(c.turn())) robotTurn();
      }
      function robotTurn() {
        thinking = true;
        refresh();
        later(() => {
          if (!onScreen()) { thinking = false; return; }   // left the game: it is saved, robot moves on return
          let mv = null;
          try { mv = bestMove(c, level); } catch (e) { const ms = c.moves({ verbose: true }); mv = ms[0] || null; }
          thinking = false;
          if (!mv) { checkEnd(); return; }
          board.play(mv.from, mv.to, mv.promotion);
        }, 550);
      }
      function afterMove(m) {
        save();
        if (c.inCheck() && !c.isCheckmate()) Audio.speak('Check', 'en');
        if (checkEnd()) return;
        nextTurn();
      }
      function undo() {
        if (thinking || over || !c.history().length) return;
        c.undo();
        if (vsRobot && !isHuman(c.turn()) && c.history().length) c.undo();
        board.syncLast();
        board.clear();
        save();
        nextTurn();
      }
      function hint() {
        if (thinking || over || hintsLeft <= 0 || !isHuman(c.turn())) return;
        const mv = bestMove(c, 'intermediate');
        if (!mv) return;
        hintsLeft -= 1;
        save();
        board.setHint([mv.from, mv.to]);
        const p = c.get(mv.from);
        msg.innerHTML = `💡 Try your ${NAME[p.type]}: ${mv.from} to ${mv.to}`;
        refresh();
      }
      function checkEnd() {
        if (!c.isGameOver()) return false;
        over = true;
        clearGame();
        refresh();
        let title, summary, stars, score;
        if (c.isCheckmate()) {
          const winner = c.turn() === 'w' ? 'b' : 'w';
          Audio.speak('Checkmate', 'en');
          if (vsRobot) {
            const won = winner === side;
            stars = won ? L.stars : 1;
            score = won ? 100 : 10;
            title = won ? 'Checkmate! You Win! 🎉' : 'Robot Wins 🤖';
            summary = won ? `You beat the ${L.name} Robot! Lifetime ⭐ ${Storage.getStars() + stars}` : 'Good try! Every game makes you stronger. Play again?';
            won ? Audio.win() : Audio.wrong();
          } else {
            stars = 2; score = 100;
            title = `${winner === 'w' ? 'White' : 'Black'} Wins! 🎉`;
            summary = `Checkmate! ${winner === 'w' ? 'Player 1 (White)' : 'Player 2 (Black)'} wins. Play again?`;
            Audio.win();
          }
          msg.innerHTML = '👑 Checkmate!';
        } else {
          const why = c.isStalemate() ? 'Stalemate: no legal move, but not in check.'
            : c.isInsufficientMaterial() ? 'Not enough pieces left to checkmate.'
            : c.isThreefoldRepetition() ? 'The same position came 3 times.'
            : '50 moves with no capture or pawn move.';
          stars = 1; score = 50;
          title = "It's a Draw 🤝";
          summary = why;
          msg.innerHTML = '🤝 Draw. ' + esc(why);
          Audio.correct();
        }
        addStars(stars);
        Storage.setLevelScore(LEVEL_ID, score);
        later(() => {
          showDone({
            title, stars, summary,
            onAgain: () => { showGame(); settings.mode = mode; settings.level = level; play(null); },
            onNext: () => onExit({ next: true }),
            onHome: () => onExit({ home: true }),
          });
        }, 1800);
        return true;
      }
    }
  }
};

// Pieces of the other colour that `col` has captured, plus the points lead.
function capturedHTML(c, col) {
  const opp = col === 'w' ? 'b' : 'w';
  const count = { w: {}, b: {} };
  c.board().forEach(row => row.forEach(p => { if (p) count[p.color][p.type] = (count[p.color][p.type] || 0) + 1; }));
  let h = '', pts = { w: 0, b: 0 };
  ['w', 'b'].forEach(k => Object.keys(VALUE).forEach(t => { pts[k] += (count[k][t] || 0) * VALUE[t]; }));
  ['q', 'r', 'b', 'n', 'p'].forEach(t => {
    const lost = Math.max(0, START_COUNT[t] - (count[opp][t] || 0));
    for (let i = 0; i < lost; i++) h += `<span class="cs-pc ${opp}">${glyph(t)}</span>`;
  });
  const lead = pts[col] - pts[opp];
  return h + (lead > 0 ? `<em>+${lead}</em>` : '');
}
