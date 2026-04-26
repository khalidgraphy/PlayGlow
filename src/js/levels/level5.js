// Level 5: Match Translation (age 7-8)
// Show the target word in the PRIMARY language. 4 options shown in a different
// language (rotated). Tap the matching translation. +1 / -1.

import { Audio } from '../audio.js';
import { shuffle } from '../alphabets.js';
import { escape } from '../engine.js';

const OTHER = { en: ['ur', 'ar'], ur: ['en', 'ar'], ar: ['en', 'ur'] };

export const level5 = {
  id: 8,
  name: 'Match Translation',
  emoji: '🔁',
  desc: 'Find the same word',
  ageHint: 'Age 7+',
  guide: 'Child sees a word in the main language and picks its meaning from 4 options in another language.',
  altCount: 3,
  roundsPerSession: 8,
  scoring: { right: 1, wrong: -1 },

  _rotation: 0,

  render(stage, { round, lang, onAnswer }) {
    const targetLang = OTHER[lang][this._rotation % 2];
    this._rotation += 1;

    const promptWord = round.target[lang];
    const promptIsRTL = lang !== 'en';
    const optionsRTL = targetLang !== 'en';

    const all = shuffle([round.target, ...round.alts]);
    // Make sure the correct answer is in the set (shuffle preserves it)

    stage.innerHTML = `
      <div class="emoji-card">${round.target.emoji || '❓'}</div>
      <div class="prompt">
        <div class="prompt-label">FIND THE SAME WORD</div>
        <div class="prompt-text ${promptIsRTL ? 'rtl' : ''}">
          ${escape(promptWord)}
          <button class="speaker" style="vertical-align:middle;width:32px;height:32px;font-size:14px;margin-left:6px"
                  data-speak="${escape(promptWord)}" data-lang="${lang}">🔊</button>
        </div>
        <div style="font-size:11px;color:#aaa;margin-top:4px">in ${targetLang.toUpperCase()}</div>
      </div>
      <div class="options-grid">
        ${all.map(t => `
          <button class="option-tile ${optionsRTL ? 'rtl' : ''}" data-id="${t.id}">${escape(t[targetLang])}</button>
        `).join('')}
      </div>
    `;

    // Wire speaker buttons
    stage.querySelectorAll('[data-speak]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        Audio.speak(btn.dataset.speak, btn.dataset.lang);
      };
    });
    setTimeout(() => Audio.speak(promptWord, lang), 250);

    let answered = false;
    stage.querySelectorAll('.option-tile').forEach(btn => {
      btn.onclick = () => {
        if (answered) return;
        const id = parseInt(btn.dataset.id, 10);
        const correct = id === round.target.id;
        if (correct) {
          answered = true;
          btn.classList.add('correct');
          stage.querySelectorAll('.option-tile').forEach(b => b.classList.add('disabled'));
          onAnswer(true);
        } else {
          answered = true;
          btn.classList.add('wrong');
          // Reveal the right one
          stage.querySelectorAll('.option-tile').forEach(b => {
            if (parseInt(b.dataset.id, 10) === round.target.id) b.classList.add('correct');
            b.classList.add('disabled');
          });
          onAnswer(false);
        }
      };
    });
  }
};
