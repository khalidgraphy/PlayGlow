// Activity 8: Match Translation (age 7-8)
// Always English prompt → 4 options in the active secondary language
// (Urdu by default, Arabic when toggled on in Settings).
// Tap the option that means the same as the English word. +1 / -1.

import { Audio } from '../audio.js';
import { Storage } from '../storage.js';
import { shuffle } from '../alphabets.js';
import { escape } from '../engine.js';

export const level5 = {
  id: 8,
  name: 'Match Translation',
  emoji: '🔁',
  desc: 'Find the same word',
  ageHint: 'Age 7+',
  guide: 'Child sees an English word and picks its meaning from 4 options in the active secondary language (Urdu by default, Arabic if turned on in Settings).',
  altCount: 3,
  roundsPerSession: 8,
  scoring: { right: 1, wrong: -1 },

  render(stage, { round, onAnswer }) {
    const targetLang = Storage.getSecondaryLang();   // ur or ar — never both in same session
    const promptWord = round.target.en;              // prompt always English
    const all = shuffle([round.target, ...round.alts]);
    const targetTag = targetLang === 'ar' ? 'AR' : 'UR';

    stage.innerHTML = `
      <div class="emoji-card">${round.target.emoji || '❓'}</div>
      <div class="prompt">
        <div class="prompt-label">FIND THE SAME WORD</div>
        <div class="prompt-text">
          ${escape(capitalise(promptWord))}
          <button class="speaker" style="vertical-align:middle;width:32px;height:32px;font-size:14px;margin-left:6px"
                  data-speak="${escape(promptWord)}" data-lang="en">🔊</button>
        </div>
        <div style="font-size:11px;color:#aaa;margin-top:4px">in ${targetTag}</div>
      </div>
      <div class="options-grid">
        ${all.map(t => `
          <button class="option-tile rtl" data-id="${t.id}">${escape(t[targetLang])}</button>
        `).join('')}
      </div>
    `;

    stage.querySelectorAll('[data-speak]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        Audio.speak(btn.dataset.speak, btn.dataset.lang);
      };
    });
    setTimeout(() => Audio.speak(promptWord, 'en'), 250);

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

function capitalise(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
