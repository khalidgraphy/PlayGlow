// Word Finder: tap a letter, see up to 3 words in 3 languages.
// Empty state shows a friendly "more coming" card.

import { API } from './api.js';
import { Audio } from './audio.js';
import { Storage } from './storage.js';
import { showScreen, escape } from './engine.js';

const ALL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
let availableSet = new Set();   // letters with at least one word
let currentLetter = 'A';

export async function openExplore() {
  showScreen('explore-screen');

  // Load available letters once per session for the lang
  try {
    const data = await API.getLetters('en');
    availableSet = new Set(data.letters.map(l => l.letter));
  } catch {
    availableSet = new Set(ALL_LETTERS); // fail open — try all letters
  }

  renderStrip();
  // Default to first letter that actually has words, falls back to A
  const firstReal = ALL_LETTERS.find(L => availableSet.has(L)) || 'A';
  await selectLetter(firstReal);
}

function renderStrip() {
  const strip = document.getElementById('letter-strip');
  strip.innerHTML = ALL_LETTERS.map(L => {
    const has = availableSet.has(L);
    return `<button class="letter-chip ${has ? '' : 'empty'}" data-letter="${L}">${L}</button>`;
  }).join('');
  strip.querySelectorAll('.letter-chip').forEach(btn => {
    btn.onclick = () => selectLetter(btn.dataset.letter);
  });
}

async function selectLetter(letter) {
  currentLetter = letter;
  document.getElementById('explore-letter-current').textContent = letter;

  document.querySelectorAll('.letter-chip').forEach(b =>
    b.classList.toggle('active', b.dataset.letter === letter));

  const results = document.getElementById('explore-results');
  results.innerHTML = `<div class="muted" style="text-align:center;padding:30px">Loading…</div>`;

  let data;
  try {
    data = await API.getByLetter(letter, 'en', 3);
  } catch {
    results.innerHTML = `<div class="muted" style="text-align:center;padding:30px">Couldn't load. Try again.</div>`;
    return;
  }

  if (!data.words.length) {
    results.innerHTML = renderEmpty(letter);
    return;
  }

  results.innerHTML = data.words.map(w => renderWordCard(w)).join('') +
    (data.words.length < 3 ? renderMoreSoon(letter, data.words.length) : '');

  // wire speakers
  results.querySelectorAll('[data-speak]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      Audio.speak(btn.dataset.speak, btn.dataset.lang);
    };
  });

  // tap card body to play primary language
  results.querySelectorAll('.word-card').forEach(card => {
    card.onclick = () => {
      const text = card.dataset.en;
      Audio.speak(text, 'en');
    };
  });
}

function renderWordCard(w) {
  return `
    <div class="word-card" data-en="${escape(w.en)}">
      <div class="word-emoji">${w.emoji || '❓'}</div>
      <div class="word-body">
        <div class="word-row">
          <button class="speaker-mini" data-speak="${escape(w.en)}" data-lang="en">🔊</button>
          <span class="word-en">${escape(capitalise(w.en))}</span>
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
  `;
}

function renderEmpty(letter) {
  return `
    <div class="empty-state">
      <div class="empty-emoji">📚</div>
      <div class="empty-title">No "${letter}" words yet</div>
      <div class="empty-desc">More words coming soon. Try B, C, E, M, R, or S — they have lots!</div>
    </div>
  `;
}

function renderMoreSoon(letter, n) {
  return `
    <div class="empty-state slim">
      <div style="font-size:32px">✨</div>
      <div class="empty-desc">Only ${n} "${letter}" word${n>1?'s':''} for now. More coming!</div>
    </div>
  `;
}

function capitalise(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
