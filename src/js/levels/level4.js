// Level 4: Spell It (age 7)
// Show emoji + audio button. Letters of the chosen-language word are jumbled
// in a pool. Tap them in order to fill the slots. Backspace if wrong.
// +2 right / -1 if user gives up (Reveal button).

import { Audio } from '../audio.js';
import { ALPHABETS, shuffle } from '../alphabets.js';
import { escape } from '../engine.js';

export const level4 = {
  id: 4,
  name: 'Spell It',
  emoji: '✏️',
  desc: 'Tap letters to spell',
  ageHint: 'Age 7+',
  guide: 'Child sees a picture, hears the word, and taps the jumbled letters in the correct order to spell it.',
  altCount: 0,
  roundsPerSession: 6,
  scoring: { right: 2, wrong: -1 },

  render(stage, { round, lang, onAnswer }) {
    // Always spell in the chosen primary language (English easiest, Urdu/Arabic harder)
    const word = round.target[lang] || round.target.en;
    const letters = [...word];
    const isRTL = lang !== 'en';

    // Pool: all word letters + 1-2 distractor letters
    const distractorN = letters.length <= 4 ? 1 : 2;
    const pool = ALPHABETS[lang].filter(L => !letters.includes(L) && L !== letters[0]);
    const distractors = [];
    while (distractors.length < distractorN && pool.length) {
      distractors.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    const tray = shuffle([...letters, ...distractors]);

    stage.innerHTML = `
      <div class="emoji-card">${round.target.emoji || '❓'}</div>
      <div style="display:flex;justify-content:center;gap:14px;align-items:center">
        <button class="big-speaker" id="play-target" style="width:56px;height:56px;font-size:24px">🔊</button>
        <button class="chip" id="reveal-btn">Reveal</button>
      </div>
      <div class="spell-target ${isRTL ? 'rtl' : ''}" id="slots" ${isRTL ? 'dir="rtl"' : ''}>
        ${letters.map((_, i) => `<div class="spell-slot" data-i="${i}"></div>`).join('')}
      </div>
      <div class="spell-pool" id="pool">
        ${tray.map((L, i) => `<button class="spell-letter" data-letter="${escape(L)}" data-pi="${i}">${escape(L)}</button>`).join('')}
      </div>
    `;

    const slots = [...stage.querySelectorAll('.spell-slot')];
    const poolBtns = [...stage.querySelectorAll('.spell-letter')];
    const playBtn = stage.querySelector('#play-target');
    const revealBtn = stage.querySelector('#reveal-btn');

    const play = () => Audio.speak(word, lang);
    playBtn.onclick = play;
    setTimeout(play, 300);

    let pos = 0;
    let answered = false;

    function check() {
      if (pos === letters.length) {
        const built = slots.map(s => s.textContent).join('');
        if (built === word) {
          answered = true;
          slots.forEach(s => s.classList.add('filled'));
          stage.querySelectorAll('.spell-slot').forEach(s => s.style.borderColor = '#4CAF50');
          onAnswer(true);
        } else {
          // wrong order — clear last and let them try again (no penalty for individual wrong taps)
          flashSlots('wrong');
          setTimeout(reset, 600);
        }
      }
    }

    function flashSlots(cls) {
      slots.forEach(s => s.style.background = cls === 'wrong' ? '#FFD3D3' : '#fafaff');
      setTimeout(() => slots.forEach(s => s.style.background = '#fafaff'), 500);
    }

    function reset() {
      pos = 0;
      slots.forEach(s => { s.textContent = ''; s.classList.remove('filled'); });
      poolBtns.forEach(b => b.classList.remove('used'));
    }

    poolBtns.forEach(btn => {
      btn.onclick = () => {
        if (answered || btn.classList.contains('used') || pos >= letters.length) return;
        const slot = slots[pos];
        // Slot order is left-to-right in DOM. For RTL the visual reverses but indices stay.
        slot.textContent = btn.dataset.letter;
        slot.classList.add('filled');
        btn.classList.add('used');
        pos += 1;
        check();
      };
    });

    revealBtn.onclick = () => {
      if (answered) return;
      answered = true;
      slots.forEach((s, i) => { s.textContent = letters[i]; s.classList.add('filled'); });
      onAnswer(false);
    };
  }
};
