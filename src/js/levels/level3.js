// Level 3: First Letter (age 6)
// Show emoji + 3 names + audio. Per round, ONE language is quizzed:
// "Tap the first letter of <word>" — 4 options.
// Languages rotate across rounds in [primary, then the other 2].
// One score event per round (right=+1 or wrong=-1, after either correct tap or 2nd wrong).

import { Audio } from '../audio.js';
import { firstLetter, letterChoices } from '../alphabets.js';
import { renderNames, bindSpeakers, escape } from '../engine.js';

const LANG_ORDER = ['en', 'ur', 'ar'];

export const level3 = {
  id: 7,
  name: 'First Letter',
  emoji: '🔤',
  desc: 'Tap the first letter',
  ageHint: 'Age 6+',
  guide: 'Child reads or hears a word and taps its first letter from 4 options. Languages rotate each round.',
  altCount: 0,
  roundsPerSession: 9,
  scoring: { right: 1, wrong: -1 },

  _rotation: 0,

  render(stage, { round, lang, onAnswer }) {
    const order = [lang, ...LANG_ORDER.filter(l => l !== lang)];
    const quizLang = order[this._rotation % 3];
    this._rotation += 1;

    const word = round.target[quizLang];
    const correct = firstLetter(word, quizLang);
    const choices = letterChoices(correct, quizLang, 4);
    const isRTL = quizLang !== 'en';

    stage.innerHTML = `
      <div class="emoji-card">${round.target.emoji || '❓'}</div>
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
