import { Storage } from './storage.js';
import { Audio } from './audio.js';
import { runLevel, runCustomLevel, showScreen } from './engine.js';
import { openExplore } from './explore.js';
import { level1 } from './levels/level1.js';
import { level2 } from './levels/level2.js';
import { level3 } from './levels/level3.js';
import { level4 } from './levels/level4.js';
import { level5 } from './levels/level5.js';
import { level6 } from './levels/level6.js';

const LEVELS = [level1, level2, level3, level4, level5, level6];
const LANG_LABEL = { en: 'EN', ur: 'اردو', ar: 'عربي' };

const EXPLORE_GUIDE = 'Child taps any letter A–Z to see up to 3 words starting with it, with picture and pronunciation in 3 languages.';

export function showInfo(title, text) {
  document.getElementById('info-title').textContent = title;
  document.getElementById('info-text').textContent = text;
  const overlay = document.getElementById('info-overlay');
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
}

function hideInfo() {
  const overlay = document.getElementById('info-overlay');
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
}

function init() {
  // First-run language picker, otherwise straight to home
  if (!localStorage.getItem('wordglow:language')) {
    showScreen('lang-screen');
  } else {
    renderHome();
  }

  document.querySelectorAll('#lang-screen .lang-btn').forEach(btn => {
    btn.onclick = () => {
      Audio.arm(); // unlock speech engine inside the user gesture
      Storage.setLanguage(btn.dataset.lang);
      renderHome();
    };
  });

  document.getElementById('lang-switch').onclick = () => showScreen('lang-screen');
  document.getElementById('back-home').onclick = () => renderHome();
  document.getElementById('explore-back').onclick = () => renderHome();

  // Info popup wiring
  document.getElementById('info-close').onclick = hideInfo;
  document.getElementById('info-overlay').onclick = (e) => {
    if (e.target.id === 'info-overlay') hideInfo();
  };
  document.getElementById('game-info').onclick = () => {
    const lvl = currentLevel;
    if (lvl) showInfo(`Level ${lvl.id}: ${lvl.name}`, lvl.guide || 'Tap, listen, and learn.');
  };
}

let currentLevel = null;

function renderHome() {
  document.getElementById('lifetime-stars').textContent = Storage.getStars();
  document.getElementById('lang-label').textContent = LANG_LABEL[Storage.getLanguage()] || 'EN';

  const last = Storage.getLastLevel();
  const scores = Storage.getScores();
  const grid = document.getElementById('level-grid');
  grid.innerHTML = LEVELS.map(lvl => {
    const s = scores[lvl.id] || { high: 0, last: 0 };
    const recommended = lvl.id === last ? ' recommended' : '';
    return `
      <div class="level-card${recommended}" data-id="${lvl.id}">
        <button class="info-btn corner" data-info-id="${lvl.id}" aria-label="How to play">i</button>
        <div class="lvl-num">LEVEL ${lvl.id}</div>
        <div class="lvl-emoji">${lvl.emoji}</div>
        <div class="lvl-name">${lvl.name}</div>
        <div class="lvl-desc">${lvl.desc}</div>
        <div class="lvl-meta">
          <span>${lvl.ageHint}</span>
          <span class="best">${s.high ? '★ ' + s.high : ''}</span>
        </div>
      </div>
    `;
  }).join('');
  grid.querySelectorAll('.level-card').forEach(card => {
    card.onclick = () => start(parseInt(card.dataset.id, 10));
  });
  grid.querySelectorAll('.info-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.infoId, 10);
      const lvl = LEVELS.find(l => l.id === id);
      if (lvl) showInfo(`Level ${lvl.id}: ${lvl.name}`, lvl.guide || '');
    };
  });

  // Explore card lives outside the level grid (separate section)
  const exploreCard = document.getElementById('open-explore');
  if (exploreCard) {
    // Inject (i) button if not present
    if (!exploreCard.querySelector('.info-btn')) {
      const btn = document.createElement('button');
      btn.className = 'info-btn corner';
      btn.setAttribute('aria-label', 'How to play');
      btn.textContent = 'i';
      btn.onclick = (e) => {
        e.stopPropagation();
        showInfo('Word Finder', EXPLORE_GUIDE);
      };
      exploreCard.appendChild(btn);
    }
    exploreCard.onclick = () => {
      Audio.arm();
      openExplore();
    };
  }
  showScreen('home-screen');
}

function start(id) {
  const lvl = LEVELS.find(l => l.id === id);
  if (!lvl) return;
  currentLevel = lvl; // for the in-game (i) button
  Audio.arm();
  Storage.setLastLevel(id);
  if ('_rotation' in lvl) lvl._rotation = 0;
  if (lvl.custom) runCustomLevel(lvl, { onExit: handleExit(id) });
  else runLevel(lvl, { onExit: handleExit(id) });
}

function handleExit(currentId) {
  return ({ next, home }) => {
    if (home) return renderHome();
    if (next) {
      const nextLvl = LEVELS.find(l => l.id === currentId + 1);
      if (nextLvl) return start(nextLvl.id);
      return renderHome();
    }
    renderHome();
  };
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(e => console.warn('sw register failed', e));
  });
}

init();
