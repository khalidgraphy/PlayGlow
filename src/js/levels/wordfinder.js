// Level 2: Word Finder (custom, full 26-letter coverage)
// Tap A-Z, see 3 words for that letter with English/Urdu/Arabic + emoji + audio.
// Promoted from the old "Explore" section into a real level.

import { Audio } from '../audio.js';
import { escape } from '../engine.js';
import { WORDS_BY_LETTER, ALL_LETTERS } from './wordfinderdata.js';

export const wordFinder = {
  id: 2,
  name: 'Word Finder',
  emoji: '🔍',
  desc: 'Tap A–Z to see 3 words',
  ageHint: 'All ages',
  guide: 'Child taps any letter A–Z to see 3 words starting with that letter, with picture and pronunciation in English, Urdu, and Arabic.',
  custom: true,

  start(stage, { onExit }) {
    let currentLetter = 'A';

    function renderStrip() {
      return `<div id="wf-strip" class="letter-strip">
        ${ALL_LETTERS.map(L =>
          `<button class="letter-chip${L === currentLetter ? ' active' : ''}" data-letter="${L}">${L}</button>`
        ).join('')}
      </div>`;
    }

    function renderResults(letter) {
      const words = WORDS_BY_LETTER[letter] || [];
      if (!words.length) {
        return `<div class="empty-state">
          <div class="empty-emoji">📚</div>
          <div class="empty-title">No "${letter}" words yet</div>
        </div>`;
      }
      return words.map(w => `
        <div class="word-card" data-en="${escape(w.en)}">
          <div class="word-emoji">${w.emoji}</div>
          <div class="word-body">
            <div class="word-row">
              <button class="speaker-mini" data-speak="${escape(w.en)}" data-lang="en">🔊</button>
              <span class="word-en">${escape(w.en)}</span>
              <span class="lang-tag-mini">EN</span>
            </div>
            <div class="word-row rtl" dir="rtl">
              <button class="speaker-mini" data-speak="${escape(w.ur)}" data-lang="ur">🔊</button>
              <span class="word-script">${escape(w.ur)}</span>
              <span class="lang-tag-mini">UR</span>
            </div>
            <div class="word-row rtl" dir="rtl">
              <button class="speaker-mini" data-speak="${escape(w.ar)}" data-lang="ar">🔊</button>
              <span class="word-script">${escape(w.ar)}</span>
              <span class="lang-tag-mini">AR</span>
            </div>
          </div>
        </div>
      `).join('');
    }

    function renderAll() {
      stage.innerHTML = `
        ${renderStrip()}
        <div id="wf-results" class="explore-results">${renderResults(currentLetter)}</div>
      `;
      wireStrip();
      wireResults();
    }

    function selectLetter(L) {
      currentLetter = L;
      // Update strip selection
      stage.querySelectorAll('.letter-chip').forEach(b =>
        b.classList.toggle('active', b.dataset.letter === L));
      // Re-render only the results column to keep scroll position on the strip
      stage.querySelector('#wf-results').innerHTML = renderResults(L);
      wireResults();
      // scroll the active letter into view
      const activeBtn = stage.querySelector(`.letter-chip[data-letter="${L}"]`);
      activeBtn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    function wireStrip() {
      stage.querySelectorAll('.letter-chip').forEach(btn => {
        btn.onclick = () => selectLetter(btn.dataset.letter);
      });
    }

    function wireResults() {
      stage.querySelectorAll('[data-speak]').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          Audio.speak(btn.dataset.speak, btn.dataset.lang);
        };
      });
      stage.querySelectorAll('.word-card').forEach(card => {
        card.onclick = () => Audio.speak(card.dataset.en, 'en');
      });
    }

    renderAll();
  }
};
