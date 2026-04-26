// Level 1: Hear & Tap (age 4)
// Audio plays the target word; kid taps the matching emoji from 6 tiles.
// Wrong = 0 (no penalty for the youngest).

import { Audio } from '../audio.js';
import { shuffle } from '../alphabets.js';
import { escape } from '../engine.js';

export const level1 = {
  id: 4,
  name: 'Hear & Tap',
  emoji: '👂',
  desc: 'Listen, then tap the picture',
  ageHint: 'Age 4+',
  guide: 'Child hears the word in the chosen language and taps the matching picture from 6 options.',
  altCount: 5,
  roundsPerSession: 6,
  scoring: { right: 1, wrong: 0 },

  render(stage, { round, lang, onAnswer }) {
    const all = shuffle([round.target, ...round.alts]);
    const targetText = round.target[lang] || round.target.en;

    stage.innerHTML = `
      <div class="tap-prompt">
        <div class="prompt-text">Tap the picture you hear</div>
        <button class="big-speaker" id="play-target" aria-label="Play sound">🔊</button>
      </div>
      <div class="options-grid cols-3">
        ${all.map(t => `
          <button class="option-tile emoji" data-id="${t.id}" aria-label="${escape(t[lang] || t.en)}">${t.emoji || '❓'}</button>
        `).join('')}
      </div>
    `;

    const playBtn = stage.querySelector('#play-target');
    const play = () => Audio.speak(targetText, lang);
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
