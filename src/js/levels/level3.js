// Activity 7: First Letter (age 6)
// Show emoji + 2 names + audio. Per round, one language is quizzed:
// "Tap the first letter of <word>" — 4 options.
// Rotation honors the active secondary language (Urdu by default, Arabic
// if turned on in Settings) — never quizzes both UR and AR in the same
// session, only EN ↔ active secondary.

import { Audio } from '../audio.js';
import { Storage } from '../storage.js';
import { firstLetter, letterChoices } from '../alphabets.js';
import { renderNames, bindSpeakers, escape, visualFor } from '../engine.js';

export const level3 = {
  id: 7,
  name: 'First Letter',
  emoji: '🔤',
  desc: 'Tap the first letter',
  ageHint: 'Age 6+',
  guide: 'Child reads or hears a word and taps its first letter from 4 options. Alternates English and the active secondary language each round.',
  altCount: 0,
  roundsPerSession: 8,            // even count for clean en/secondary split
  scoring: { right: 1, wrong: -1 },

  _rotation: 0,

  render(stage, { round, onAnswer }) {
    const sec = Storage.getSecondaryLang();
    // Alternate EN ↔ secondary per round (no third language)
    const quizLang = this._rotation % 2 === 0 ? 'en' : sec;
    this._rotation += 1;

    const word = round.target[quizLang];
    const correct = firstLetter(word, quizLang);
    const choices = letterChoices(correct, quizLang, 4);
    const isRTL = quizLang !== 'en';

    stage.innerHTML = `
      <div class="emoji-card">${visualFor(round.target)}</div>
      ${renderNames(round)}
      <div class="prompt">
        <div class="prompt-label">FIRST LETTER OF</div>
        <div class="prompt-text ${isRTL ? 'rtl' : ''}">${escape(word)} <span style="color:#aaa;font-size:12px">(${quizLang.toUpperCase()})</span></div>
      </div>
      <div class="options-grid cols-4">
        ${choices.map(c => `
          <button class="option-tile ${isRTL ? 'rtl' : ''}" data-letter="${escape(c)}">${escape(c)}</button>
        `).join('')}
      </div>
    `;
    bindSpeakers(stage);
    setTimeout(() => Audio.speak(word, quizLang), 250);

    let answered = false;
    let wrongs = 0;

    stage.querySelectorAll('.option-tile').forEach(btn => {
      btn.onclick = () => {
        if (answered) return;
        const picked = btn.dataset.letter;
        if (picked === correct) {
          answered = true;
          btn.classList.add('correct');
          stage.querySelectorAll('.option-tile').forEach(b => b.classList.add('disabled'));
          onAnswer(true);
        } else {
          btn.classList.add('wrong', 'disabled');
          wrongs += 1;
          if (wrongs >= 2) {
            answered = true;
            stage.querySelectorAll('.option-tile').forEach(b => {
              if (b.dataset.letter === correct) b.classList.add('correct');
              b.classList.add('disabled');
            });
            onAnswer(false);
          }
        }
      };
    });
  }
};
