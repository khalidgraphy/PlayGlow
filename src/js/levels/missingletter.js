// Activity 8: Missing Letter
// Show emoji + word with one letter hidden ("C _ T"). Tap the right letter
// from 4 options. Words are 3-5 letters, ASCII only, drawn from the daily-word
// library (no API call).

import { Audio } from '../audio.js';
import { ALPHABETS, shuffle } from '../alphabets.js';
import { escape } from '../engine.js';
import { pickWordsByLength } from './dailywords.js';

// Pre-filter once: 3-5 letter words, only A-Z (drop hyphens, spaces, accents)
const POOL = pickWordsByLength(3, 5).filter(w => /^[A-Za-z]+$/.test(w.en));

function pickWord() {
  return POOL[Math.floor(Math.random() * POOL.length)];
}

export const missingLetter = {
  id: 8,
  name: 'Missing Letter',
  emoji: '🔡',
  desc: 'Find the missing letter',
  ageHint: 'Age 5+',
  guide: 'Child sees a picture and a word with one letter missing. Tap the right letter from the four choices to complete the word.',
  altCount: 0,
  roundsPerSession: 6,
  scoring: { right: 1, wrong: -1 },

  render(stage, { onAnswer }) {
    const pick = pickWord();
    const word = pick.en.toUpperCase();
    const letters = [...word];
    // Hide a middle position (skips first and last so the puzzle stays solvable
    // without alphabet-pattern guessing for the youngest kids)
    const hideIdx = letters.length === 3
      ? 1
      : 1 + Math.floor(Math.random() * (letters.length - 2));
    const correct = letters[hideIdx];

    // 3 distractor letters from the same alphabet, none equal to correct
    const distractors = new Set();
    const pool = ALPHABETS.en.filter(L => L !== correct);
    while (distractors.size < 3) {
      distractors.add(pool[Math.floor(Math.random() * pool.length)]);
    }
    const choices = shuffle([correct, ...distractors]);

    stage.innerHTML = `
      <div class="emoji-card">${pick.emoji}</div>
      <div style="display:flex;justify-content:center;gap:14px;align-items:center">
        <button class="big-speaker" id="play-target" style="width:56px;height:56px;font-size:24px">🔊</button>
      </div>
      <div class="ml-word">
        ${letters.map((L, i) =>
          i === hideIdx
            ? `<div class="ml-slot empty" id="ml-slot">_</div>`
            : `<div class="ml-slot">${escape(L)}</div>`
        ).join('')}
      </div>
      <div class="prompt">
        <div class="prompt-label">PICK THE MISSING LETTER</div>
      </div>
      <div class="options-grid cols-4">
        ${choices.map(L => `<button class="option-tile" data-letter="${escape(L)}">${escape(L)}</button>`).join('')}
      </div>
    `;

    const playBtn = stage.querySelector('#play-target');
    const slot = stage.querySelector('#ml-slot');
    const play = () => Audio.speak(word, 'en');
    playBtn.onclick = play;
    setTimeout(play, 300);

    let answered = false;
    let wrongs = 0;
    stage.querySelectorAll('.option-tile').forEach(btn => {
      btn.onclick = () => {
        if (answered) return;
        const picked = btn.dataset.letter;
        if (picked === correct) {
          answered = true;
          btn.classList.add('correct');
          slot.classList.remove('empty');
          slot.textContent = correct;
          slot.style.background = '#E8F8EF';
          slot.style.borderColor = '#4CAF50';
          stage.querySelectorAll('.option-tile').forEach(b => b.classList.add('disabled'));
          Audio.speak(word, 'en');
          onAnswer(true);
        } else {
          btn.classList.add('wrong', 'disabled');
          wrongs += 1;
          if (wrongs >= 2) {
            answered = true;
            // Reveal correct + advance
            stage.querySelectorAll('.option-tile').forEach(b => {
              if (b.dataset.letter === correct) b.classList.add('correct');
              b.classList.add('disabled');
            });
            slot.textContent = correct;
            slot.classList.remove('empty');
            slot.style.background = '#FFE0E0';
            slot.style.borderColor = '#FF9B9B';
            onAnswer(false);
          }
        }
      };
    });
  }
};
