// Activity 4: Hear & Tap (age 4)
// English word + 🔊 + Urdu word displayed at top so kids on devices without
// working speakers (some Macs / Windows) can still play. Audio always English.
// Wrong = 0 (no penalty for the youngest).

import { Audio } from '../audio.js';
import { shuffle } from '../alphabets.js';
import { escape, visualFor } from '../engine.js';

export const level1 = {
  id: 4,
  name: 'Hear & Tap',
  emoji: '👂',
  desc: 'Listen, then tap the picture',
  ageHint: 'Age 4+',
  guide: 'Child hears the English word and taps the matching picture from 6 options. The word is shown in English and Urdu so kids on devices without sound can still play.',
  altCount: 5,
  roundsPerSession: 6,
  scoring: { right: 1, wrong: 0 },

  render(stage, { round, onAnswer }) {
    const all = shuffle([round.target, ...round.alts]);
    const enWord = round.target.en;
    const urWord = round.target.ur;

    stage.innerHTML = `
      <div class="tap-prompt">
        <div class="word-speaker-row">
          <span class="ws-en">${escape(capitalise(enWord))}</span>
          <button class="big-speaker" id="play-target" aria-label="Play sound">🔊</button>
          <span class="ws-ur" dir="rtl">${escape(urWord)}</span>
        </div>
        <div class="prompt-text">Tap the picture you hear</div>
      </div>
      <div class="options-grid cols-3">
        ${all.map(t => `
          <button class="option-tile emoji" data-id="${t.id}" aria-label="${escape(t.en)}">${visualFor(t)}</button>
        `).join('')}
      </div>
    `;

    const playBtn = stage.querySelector('#play-target');
    // Always speak in English on this activity — many kids' first sound association
    const play = () => Audio.speak(enWord, 'en');
    playBtn.onclick = play;
    setTimeout(play, 350);

    let locked = false;
    stage.querySelectorAll('.option-tile').forEach(btn => {
      btn.onclick = () => {
        if (locked) return;
        const id = parseInt(btn.dataset.id, 10);
        const correct = id === round.target.id;
        if (correct) {
          locked = true;
          btn.classList.add('correct');
          stage.querySelectorAll('.option-tile').forEach(b => b.classList.add('disabled'));
          onAnswer(true);
        } else {
          btn.classList.add('wrong', 'disabled');
          // No penalty + no advance: kid keeps trying
          onAnswer(false, { advance: false, delay: 0 });
        }
      };
    });
  }
};

function capitalise(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
