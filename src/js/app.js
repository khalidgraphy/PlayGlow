import { Game, showScreen } from './game.js';
import { Storage } from './storage.js';

let currentGame = null;

function startGame(language) {
  Storage.setLanguage(language);
  const saved = Storage.getProgress() || {};
  const startLevel = saved.language === language ? (saved.level || 1) : 1;
  const startStars = saved.language === language ? (saved.stars || 0) : 0;

  currentGame = new Game({ language, level: startLevel, stars: startStars });
  showScreen('game-screen');
  currentGame.start();
}

function bind() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => startGame(btn.dataset.lang));
  });

  document.getElementById('back-btn').addEventListener('click', () => {
    showScreen('language-select');
  });

  document.getElementById('next-btn').addEventListener('click', () => {
    if (!currentGame) return;
    const lang = currentGame.language;
    const saved = Storage.getProgress() || {};
    currentGame = new Game({
      language: lang,
      level: saved.level || currentGame.level + 1,
      stars: saved.stars || currentGame.stars
    });
    showScreen('game-screen');
    currentGame.start();
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(e => console.warn('sw register failed', e));
  });
}

bind();
