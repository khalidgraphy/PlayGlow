import { Storage } from './storage.js';
import { Audio } from './audio.js';
import { runLevel, showScreen } from './engine.js';
import { openExplore } from './explore.js';
import { level1 } from './levels/level1.js';
import { level2 } from './levels/level2.js';
import { level3 } from './levels/level3.js';
import { level4 } from './levels/level4.js';
import { level5 } from './levels/level5.js';

const LEVELS = [level1, level2, level3, level4, level5];
const LANG_LABEL = { en: 'EN', ur: 'اردو', ar: 'عربي' };

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
}

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

  // Explore card lives outside the level grid (separate section)
  const exploreCard = document.getElementById('open-explore');
  if (exploreCard) {
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
  Audio.arm(); // re-unlock speech inside this user gesture (works across all levels)
  Storage.setLastLevel(id);
  if ('_rotation' in lvl) lvl._rotation = 0;
  runLevel(lvl, { onExit: handleExit(id) });
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
