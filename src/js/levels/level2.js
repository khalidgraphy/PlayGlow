// Activity 6: Word Cards (was "Three Names" — renamed when Arabic became opt-in)
// No quiz — pure exposure. Show emoji + 2 names (English + active secondary)
// + speakers. Star awarded when kid plays both audios.

import { Storage } from '../storage.js';
import { renderNames, bindSpeakers, visualFor } from '../engine.js';

export const level2 = {
  id: 6,
  name: 'Word Cards',
  emoji: '👀',
  desc: 'See, hear, learn',
  ageHint: 'Age 5+',
  guide: 'Child sees a picture and taps each speaker to hear the word in English and the active secondary language (Urdu by default, Arabic if turned on in Settings). No quiz, just exposure.',
  altCount: 0,
  roundsPerSession: 5,
  scoring: { right: 1, wrong: 0 },

  render(stage, { round, onAnswer }) {
    const sec = Storage.getSecondaryLang();
    const secLabel = sec === 'ar' ? 'Arabic' : 'Urdu';

    stage.innerHTML = `
      <div class="emoji-card">${visualFor(round.target)}</div>
      ${renderNames(round)}
      <div style="text-align:center;color:#888;font-size:13px">Tap each 🔊 to hear it</div>
      <button class="button" id="next-word" disabled style="opacity:.55">Hear English & ${secLabel} to continue</button>
    `;
    bindSpeakers(stage);

    const nextBtn = stage.querySelector('#next-word');
    const heard = new Set();
    stage.querySelectorAll('[data-speak]').forEach(btn => {
      btn.addEventListener('click', () => {
        heard.add(btn.dataset.lang);
        // 2 langs to hear now (was 3): EN + active secondary
        if (heard.size >= 2) {
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
