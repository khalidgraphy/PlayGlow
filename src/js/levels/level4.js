// Level 3: Spell It (was Level 5; promoted per user request)
// 3-4 letter English words only. Hardcoded list of 50 kid-recognisable words
// so we don't depend on the multilingual D1 (which doesn't index by length).
// Backspace UX: tap any filled slot to clear it AND every slot after it,
// returning those tiles to the pool. Pos rewinds to that slot.
// Score: +2 right, -1 if "Reveal" pressed (give-up).

import { Audio } from '../audio.js';
import { ALPHABETS, shuffle } from '../alphabets.js';
import { escape } from '../engine.js';

const WORDS = [
  // 30 three-letter
  { w: 'cat', e: '🐱' }, { w: 'dog', e: '🐶' }, { w: 'sun', e: '☀️' }, { w: 'car', e: '🚗' },
  { w: 'egg', e: '🥚' }, { w: 'hat', e: '🎩' }, { w: 'pen', e: '🖊️' }, { w: 'cup', e: '🥤' },
  { w: 'bag', e: '👜' }, { w: 'red', e: '🔴' }, { w: 'box', e: '📦' }, { w: 'bed', e: '🛏️' },
  { w: 'cow', e: '🐄' }, { w: 'pig', e: '🐷' }, { w: 'fox', e: '🦊' }, { w: 'bus', e: '🚌' },
  { w: 'fan', e: '🌀' }, { w: 'log', e: '🪵' }, { w: 'map', e: '🗺️' }, { w: 'net', e: '🥅' },
  { w: 'owl', e: '🦉' }, { w: 'bee', e: '🐝' }, { w: 'ant', e: '🐜' }, { w: 'arm', e: '💪' },
  { w: 'eye', e: '👁️' }, { w: 'ear', e: '👂' }, { w: 'ice', e: '🧊' }, { w: 'key', e: '🔑' },
  { w: 'lip', e: '👄' }, { w: 'man', e: '👨' },
  // 20 four-letter
  { w: 'moon', e: '🌙' }, { w: 'star', e: '⭐' }, { w: 'tree', e: '🌳' }, { w: 'fish', e: '🐟' },
  { w: 'bird', e: '🐦' }, { w: 'milk', e: '🥛' }, { w: 'book', e: '📖' }, { w: 'ball', e: '⚽' },
  { w: 'cake', e: '🍰' }, { w: 'door', e: '🚪' }, { w: 'duck', e: '🦆' }, { w: 'frog', e: '🐸' },
  { w: 'lion', e: '🦁' }, { w: 'shoe', e: '👟' }, { w: 'king', e: '👑' }, { w: 'ring', e: '💍' },
  { w: 'nose', e: '👃' }, { w: 'boat', e: '⛵' }, { w: 'baby', e: '👶' }, { w: 'hand', e: '✋' }
];

function pickWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

export const level4 = {
  id: 5,
  name: 'Spell It',
  emoji: '✏️',
  desc: 'Tap letters to spell',
  ageHint: 'Age 5+',
  guide: 'Child sees a picture, hears the word, then taps the jumbled letters in the right order to spell it. Tap any filled box to undo.',
  altCount: 0,
  roundsPerSession: 6,
  scoring: { right: 2, wrong: -1 },

  render(stage, { onAnswer }) {
    const pick = pickWord();
    const word = pick.w.toUpperCase();
    const letters = [...word];

    // 1 distractor letter (kept easy for 3-4 char words)
    const pool = ALPHABETS.en.filter(L => !letters.includes(L));
    const distractor = pool[Math.floor(Math.random() * pool.length)];
    const tray = shuffle([...letters, distractor]);

    stage.innerHTML = `
      <div class="emoji-card">${pick.e}</div>
      <div style="display:flex;justify-content:center;gap:14px;align-items:center">
        <button class="big-speaker" id="play-target" style="width:56px;height:56px;font-size:24px">🔊</button>
        <button class="chip" id="reveal-btn">Reveal</button>
      </div>
      <div class="spell-target" id="slots">
        ${letters.map((_, i) => `<div class="spell-slot" data-i="${i}"></div>`).join('')}
      </div>
      <div class="spell-pool" id="pool">
        ${tray.map((L, i) => `<button class="spell-letter" data-letter="${escape(L)}" data-pi="${i}">${escape(L)}</button>`).join('')}
      </div>
      <div style="text-align:center;font-size:12px;color:#888">Wrong letter? Tap a box to undo.</div>
    `;

    const slots = [...stage.querySelectorAll('.spell-slot')];
    const poolBtns = [...stage.querySelectorAll('.spell-letter')];
    const playBtn = stage.querySelector('#play-target');
    const revealBtn = stage.querySelector('#reveal-btn');

    const play = () => Audio.speak(word, 'en');
    playBtn.onclick = play;
    setTimeout(play, 300);

    let pos = 0;
    let answered = false;
    const slotPi = new Array(letters.length).fill(null); // pool index that filled each slot

    function check() {
      if (pos === letters.length) {
        const built = slots.map(s => s.textContent).join('');
        if (built === word) {
          answered = true;
          slots.forEach(s => { s.classList.add('filled'); s.style.borderColor = '#4CAF50'; s.style.background = '#E8F8EF'; });
          Audio.speak(word, 'en');
          onAnswer(true);
        }
        // If wrong but full: do NOT auto-reset. Let kid backspace from slots.
      }
    }

    function placeLetter(btn) {
      if (answered || pos >= letters.length || btn.classList.contains('used')) return;
      const slot = slots[pos];
      slot.textContent = btn.dataset.letter;
      slot.classList.add('filled');
      slotPi[pos] = parseInt(btn.dataset.pi, 10);
      btn.classList.add('used');
      pos += 1;
      check();
    }

    function rewindToSlot(targetPos) {
      if (answered) return;
      // Clear targetPos and every slot after it; return their pool tiles.
      for (let i = targetPos; i < pos; i++) {
        const pi = slotPi[i];
        if (pi !== null) {
          const btn = poolBtns[pi];
          if (btn) btn.classList.remove('used');
          slotPi[i] = null;
        }
        slots[i].textContent = '';
        slots[i].classList.remove('filled');
        slots[i].style.borderColor = '';
        slots[i].style.background = '';
      }
      pos = targetPos;
    }

    poolBtns.forEach(btn => { btn.onclick = () => placeLetter(btn); });
    slots.forEach((s, i) => {
      s.onclick = () => {
        if (i < pos) rewindToSlot(i);
      };
      s.style.cursor = 'pointer';
    });

    revealBtn.onclick = () => {
      if (answered) return;
      answered = true;
      // Clear current state then fill correctly
      poolBtns.forEach(b => b.classList.remove('used'));
      slots.forEach((s, i) => {
        s.textContent = letters[i];
        s.classList.add('filled');
        s.style.borderColor = '#FF9B9B';
        s.style.background = '#FFE0E0';
      });
      Audio.speak(word, 'en');
      onAnswer(false);
    };
  }
};
