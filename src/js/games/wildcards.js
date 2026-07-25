// Activity 13: Wild Cards — a kid-friendly UNO-style card game (you vs 1 bot).
//   • Match the top card by COLOR or NUMBER/symbol. Play a card or draw one.
//   • Cards: 0–9 in 4 colors, Skip (🚫), Draw Two (+2), Wild (🌈), Wild+4.
//   • Original name + art (not UNO branding). No timer, no reading required
//     beyond colors/numbers. First to empty their hand wins.
// Self-managed custom level (like Color Trap): renders its own board + calls
// showDone() when the game ends.

import { Audio } from '../audio.js';
import { Storage } from '../storage.js';

const COLORS = ['red', 'blue', 'green', 'yellow'];
const COLOR_NAME = { red: 'Red', blue: 'Blue', green: 'Green', yellow: 'Yellow' };
const HAND_SIZE = 7;
const BOT_DELAY = 950;

let abortPrev = null; // cancel a previous game's pending bot timers

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck() {
  const deck = [];
  for (const color of COLORS) {
    deck.push({ color, kind: 'num', value: 0 });
    for (let v = 1; v <= 9; v++) { deck.push({ color, kind: 'num', value: v }); deck.push({ color, kind: 'num', value: v }); }
    for (let i = 0; i < 2; i++) { deck.push({ color, kind: 'skip' }); deck.push({ color, kind: 'draw2' }); }
  }
  for (let i = 0; i < 4; i++) { deck.push({ color: 'wild', kind: 'wild' }); deck.push({ color: 'wild', kind: 'wild4' }); }
  return shuffle(deck);
}

function isWild(c) { return c.kind === 'wild' || c.kind === 'wild4'; }

function cardLabel(c) {
  if (c.kind === 'num') return String(c.value);
  if (c.kind === 'skip') return '🚫';
  if (c.kind === 'draw2') return '+2';
  if (c.kind === 'wild') return '🌈';
  if (c.kind === 'wild4') return '+4';
  return '?';
}

export const wildCards = {
  id: 13,
  name: 'Wild Cards',
  emoji: '🃏',
  desc: 'Match color or number',
  ageHint: 'Age 5+',
  guide: 'Match the middle card by its COLOR or its NUMBER. Tap a glowing card to play it. No match? Tap the deck to draw. Special cards: 🚫 skips the other player, +2 makes them draw two, 🌈 lets you pick any color, +4 makes them draw four and you pick the color. First to play all their cards wins!',
  custom: true,

  start(stage, { onExit, showDone }) {
    abortPrev?.();
    let cancelled = false;
    abortPrev = () => { cancelled = true; };

    let deck, discard, playerHand, botHand, activeColor, topCard, turn, gameOver;

    newGame();

    function newGame() {
      deck = buildDeck();
      discard = [];
      playerHand = deck.splice(0, HAND_SIZE);
      botHand = deck.splice(0, HAND_SIZE);
      // First discard must be a plain number card.
      const idx = deck.findIndex(c => c.kind === 'num');
      const first = deck.splice(idx, 1)[0];
      discard.push(first);
      topCard = first;
      activeColor = first.color;
      turn = 'player';
      gameOver = false;
      render();
    }

    function reshuffleIfNeeded() {
      if (deck.length) return;
      const top = discard.pop();
      deck = shuffle(discard);
      discard = [top];
    }

    function draw(who, n) {
      const hand = who === 'player' ? playerHand : botHand;
      for (let i = 0; i < n; i++) { reshuffleIfNeeded(); if (deck.length) hand.push(deck.shift()); }
    }

    function playable(c) {
      if (isWild(c)) return true;
      if (c.color === activeColor) return true;
      if (c.kind === 'num' && topCard.kind === 'num' && c.value === topCard.value) return true;
      if (c.kind !== 'num' && c.kind === topCard.kind) return true; // skip on skip, +2 on +2
      return false;
    }

    // Apply a played card's effect. Returns who plays next.
    function applyCard(c, who, chosenColor) {
      const opp = who === 'player' ? 'bot' : 'player';
      topCard = c;
      activeColor = isWild(c) ? chosenColor : c.color;
      if (c.kind === 'skip') return who;                       // opponent skipped
      if (c.kind === 'draw2') { draw(opp, 2); return who; }
      if (c.kind === 'wild4') { draw(opp, 4); return who; }
      return opp;
    }

    function setTurn(t) {
      turn = t;
      render();
      if (t === 'bot' && !gameOver && !cancelled) setTimeout(botTurn, BOT_DELAY);
    }

    function announceUno(hand, who) {
      if (hand.length === 1) toast(who === 'player' ? '🎉 UNO! One card left!' : '🤖 Bot says UNO!');
    }

    function finish(winner) {
      gameOver = true;
      const won = winner === 'player';
      const stars = won ? 3 : 1;
      Storage.addStars(stars);
      Storage.setLevelScore(13, won ? 100 : 10);
      won ? Audio.win() : Audio.wrong();
      render();
      showDone({
        title: won ? 'You Win! 🎉' : 'Bot Wins 🤖',
        stars,
        summary: won ? `Great matching! Lifetime ⭐ ${Storage.getStars()}` : `So close! Tap Play Again to try once more.`,
        onAgain: () => { showGame(); newGame(); },
        onNext: () => onExit({ next: true }),
        onHome: () => onExit({ home: true }),
      });
    }

    // ---- Player actions ----
    function onPlayerCard(idx) {
      if (turn !== 'player' || gameOver || cancelled) return;
      const c = playerHand[idx];
      if (!c || !playable(c)) return;
      if (isWild(c)) return pickColor(color => doPlayerPlay(idx, color));
      doPlayerPlay(idx, null);
    }

    function doPlayerPlay(idx, color) {
      const c = playerHand.splice(idx, 1)[0];
      discard.push(c);
      Audio.beep({ freq: 620, duration: 0.06, gain: 0.14 });
      announceUno(playerHand, 'player');
      if (playerHand.length === 0) return finish('player');
      setTurn(applyCard(c, 'player', color));
    }

    function onPlayerDraw() {
      if (turn !== 'player' || gameOver || cancelled) return;
      if (playerHand.some(playable)) return; // must play a card if you can
      draw('player', 1);
      Audio.beep({ freq: 380, duration: 0.06, gain: 0.12 });
      const last = playerHand[playerHand.length - 1];
      if (last && playable(last)) render();   // let them play the drawn card
      else setTurn('bot');
    }

    // ---- Bot ----
    function botTurn() {
      if (gameOver || cancelled) return;
      let options = botHand.filter(playable);
      if (!options.length) {
        draw('bot', 1);
        const last = botHand[botHand.length - 1];
        if (last && playable(last)) options = [last];
        else return setTurn('player');
      }
      // Prefer non-wild cards so wilds are saved for when they're needed.
      const nonWild = options.filter(c => !isWild(c));
      const choice = (nonWild.length ? nonWild : options)[0];
      const idx = botHand.indexOf(choice);
      const c = botHand.splice(idx, 1)[0];
      discard.push(c);
      const color = isWild(c) ? botColor() : null;
      Audio.beep({ freq: 500, duration: 0.06, gain: 0.12 });
      announceUno(botHand, 'bot');
      if (botHand.length === 0) return finish('bot');
      setTurn(applyCard(c, 'bot', color));
    }

    function botColor() {
      const counts = { red: 0, blue: 0, green: 0, yellow: 0 };
      botHand.forEach(c => { if (!isWild(c)) counts[c.color]++; });
      return COLORS.reduce((a, b) => (counts[b] > counts[a] ? b : a), COLORS[0]);
    }

    // ---- Rendering ----
    function render() {
      const stuck = turn === 'player' && !gameOver && !playerHand.some(playable);
      stage.innerHTML = `
        <div class="wc-root">
          <div class="wc-oppo">
            <div class="wc-oppo-label">🤖 Bot</div>
            <div class="wc-oppo-hand">
              ${botHand.map(() => `<span class="wc-back">🃏</span>`).join('')}
              <span class="wc-count">${botHand.length}</span>
            </div>
          </div>

          <div class="wc-mid">
            <button class="wc-pile wc-draw${stuck ? ' pulse' : ''}" id="wc-draw" aria-label="Draw a card">
              <span class="wc-back big">🃏</span><span class="wc-pile-tag">Draw</span>
            </button>
            <div class="wc-pile-center">
              ${cardHTML(topCard, false, -1, 'top')}
              <div class="wc-active" style="background:${colorHex(activeColor)}">${activeColor === 'wild' ? '🌈' : COLOR_NAME[activeColor]}</div>
            </div>
          </div>

          <div class="wc-msg">${turn === 'player' ? (stuck ? 'No match — tap the deck to draw' : 'Your turn — tap a glowing card') : 'Bot is thinking…'}</div>

          <div class="wc-hand" id="wc-hand">
            ${playerHand.map((c, i) => cardHTML(c, turn === 'player' && playable(c), i, 'hand')).join('')}
          </div>
        </div>`;

      stage.querySelector('#wc-draw').onclick = onPlayerDraw;
      stage.querySelectorAll('.wc-card[data-idx]').forEach(el => {
        el.onclick = () => onPlayerCard(parseInt(el.dataset.idx, 10));
      });
    }

    function cardHTML(c, isPlayable, idx, where) {
      if (!c) return '';
      const wildCls = isWild(c) ? ' wc-wild' : '';
      const cls = `wc-card wc-${c.color}${wildCls}${isPlayable ? ' playable' : ''}${where === 'hand' && !isPlayable && turn === 'player' ? ' dim' : ''}`;
      const attr = where === 'hand' ? `data-idx="${idx}"` : '';
      return `<button class="${cls}" ${attr}><span class="wc-face">${cardLabel(c)}</span></button>`;
    }

    function colorHex(color) {
      return { red: '#E63946', blue: '#3B82F6', green: '#22C55E', yellow: '#FBBF24', wild: '#6b3fd4' }[color] || '#6b3fd4';
    }

    // ---- Wild color picker ----
    function pickColor(cb) {
      const overlay = document.createElement('div');
      overlay.className = 'wc-overlay';
      overlay.innerHTML = `
        <div class="wc-pick-card">
          <div class="wc-pick-title">Pick a color</div>
          <div class="wc-pick-grid">
            ${COLORS.map(col => `<button class="wc-pick-btn wc-${col}" data-color="${col}" aria-label="${COLOR_NAME[col]}"></button>`).join('')}
          </div>
        </div>`;
      stage.querySelector('.wc-root').appendChild(overlay);
      overlay.querySelectorAll('.wc-pick-btn').forEach(b => {
        b.onclick = () => { overlay.remove(); cb(b.dataset.color); };
      });
    }

    // showDone switches to #done-screen; Play Again must switch back first.
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
  setTimeout(() => el.remove(), 1500);
}
