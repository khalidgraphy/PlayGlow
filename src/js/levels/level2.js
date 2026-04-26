// Level 2: Three Names (age 5)
// No quiz — pure exposure. Show emoji + 3 names + speakers.
// Star awarded when kid plays all 3 language audios. Tap "Next" to advance.

import { renderNames, bindSpeakers, escape } from '../engine.js';

export const level2 = {
  id: 5,
  name: 'Three Names',
  emoji: '👀',
  desc: 'See, hear, learn',
  ageHint: 'Age 5+',
  guide: 'Child sees a picture and taps each speaker to hear the word in English, Urdu, and Arabic. No quiz, just exposure.',
  altCount: 0,
  roundsPerSession: 5,
  scoring: { right: 1, wrong: 0 },

  render(stage, { round, lang, onAnswer }) {
    stage.innerHTML = `
      <div class="emoji-card">${round.target.emoji || '❓'}</div>
      ${renderNames(round)}
      <div style="text-align:center;color:#888;font-size:13px">Tap each 🔊 to hear it</div>
      <button class="button" id="next-word" disabled style="opacity:.55">Hear all 3 to continue</button>
    `;
    bindSpeakers(stage);

    const nextBtn = stage.querySelector('#next-word');
    const heard = new Set();
    stage.querySelectorAll('[data-speak]').forEach(btn => {
      btn.addEventListener('click', () => {
        heard.add(btn.dataset.lang);
        if (heard.size === 3) {
          nextBtn.disabled = false;
          nextBtn.style.opacity = 1;
          nextBtn.textContent = 'Next ⭐';
        }
      });
    });

    nextBtn.onclick = () => {
      if (nextBtn.disabled) return;
      onAnswer(true, { delay: 200 });
    };
  }
};
