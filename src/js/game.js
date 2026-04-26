import { API } from './api.js';
import { Audio } from './audio.js';
import { Storage } from './storage.js';

const MATCHES_PER_LEVEL = 3;
const STARTING_LIVES = 3;

export class Game {
  constructor({ language, level = 1, stars = 0 }) {
    this.language = language;
    this.level = level;
    this.stars = stars;
    this.matches = 0;
    this.lives = STARTING_LIVES;
    this.tiles = [];
    this.targetId = null;
    this.target = null;
    this.locked = false;

    this.el = {
      level: document.getElementById('current-level'),
      stars: document.getElementById('stars'),
      board: document.getElementById('game-board'),
      targetImage: document.getElementById('target-image'),
      targetWord: document.getElementById('target-word'),
      playAudio: document.getElementById('play-audio'),
      progressFill: document.getElementById('progress-fill')
    };

    this.el.playAudio.addEventListener('click', () => this.playTargetAudio());
  }

  async start() {
    this.updateHud();
    await this.loadRound();
  }

  difficulty() {
    if (this.level <= 3) return 1;
    if (this.level <= 8) return 2;
    return 3;
  }

  async loadRound() {
    this.locked = true;
    try {
      const data = await API.getWords({
        language: this.language,
        difficulty: this.difficulty(),
        limit: 6
      });
      this.tiles = shuffle(data.tiles);
      this.targetId = data.target_id;
      this.target = data.target;
      this.render();
      this.playTargetAudio();
    } catch (err) {
      console.error(err);
      this.el.targetWord.textContent = 'Could not load. Tap to retry.';
      this.el.targetWord.onclick = () => { this.el.targetWord.onclick = null; this.loadRound(); };
    } finally {
      this.locked = false;
    }
  }

  render() {
    this.el.targetImage.textContent = this.target.emoji || '❓';
    this.el.targetWord.textContent = this.target.word;
    this.el.targetWord.classList.toggle('rtl', this.language !== 'en');

    const board = this.el.board;
    board.innerHTML = '';
    this.tiles.forEach(tile => {
      const div = document.createElement('div');
      div.className = 'tile';
      div.textContent = tile.emoji || '❓';
      div.setAttribute('role', 'button');
      div.setAttribute('aria-label', tile.word);
      div.addEventListener('click', () => this.onTileTap(tile, div));
      board.appendChild(div);
    });
  }

  onTileTap(tile, el) {
    if (this.locked || el.classList.contains('disabled')) return;
    this.locked = true;

    if (tile.id === this.targetId) {
      el.classList.add('correct');
      Audio.correct();
      this.matches += 1;
      this.stars += 1;
      this.updateHud();

      if (this.matches >= MATCHES_PER_LEVEL) {
        setTimeout(() => this.complete(), 700);
      } else {
        setTimeout(() => this.loadRound(), 900);
      }
    } else {
      el.classList.add('wrong');
      Audio.wrong();
      this.lives -= 1;
      setTimeout(() => {
        el.classList.remove('wrong');
        this.locked = false;
      }, 500);
      if (this.lives <= 0) {
        this.lives = STARTING_LIVES;
      }
    }
  }

  updateHud() {
    this.el.level.textContent = this.level;
    this.el.stars.textContent = this.stars;
    this.el.progressFill.style.width = `${(this.matches / MATCHES_PER_LEVEL) * 100}%`;
  }

  playTargetAudio() {
    if (this.target?.audio_url) Audio.playWord(this.target.audio_url);
  }

  async complete() {
    Audio.win();
    const earnedStars = Math.max(1, this.lives);
    document.getElementById('stars-earned').textContent = '⭐'.repeat(earnedStars);
    showScreen('complete-screen');

    const sessionId = Storage.getSessionId();
    const nextLevel = this.level + 1;
    try {
      await API.saveProgress(sessionId, {
        language: this.language,
        current_level: nextLevel,
        stars_earned: this.stars
      });
    } catch (e) {
      console.warn('progress save failed (offline ok)', e);
    }
    Storage.saveProgress({ language: this.language, level: nextLevel, stars: this.stars });
  }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}
