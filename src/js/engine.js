// Shared round runner: each level module exports { id, name, emoji, desc, ageHint,
//   roundsPerSession, scoring: { right, wrong },
//   render(stage, { round, lang, onAnswer }) }
// Engine handles: fetching rounds, scoring, screen transitions, end-of-session summary.

import { API } from './api.js';
import { Audio } from './audio.js';
import { Storage } from './storage.js';

const stage      = () => document.getElementById('stage');
const titleEl    = () => document.getElementById('game-title');
const subEl      = () => document.getElementById('game-subtitle');
const scoreEl    = () => document.getElementById('round-score');
const scorePill  = () => scoreEl().closest('.score-pill');

let active = null;

export async function runLevel(level, { onExit }) {
  active = {
    level,
    lang: Storage.getLanguage(),
    rounds: 0,
    score: 0,
    streakRight: 0,
    streakWrong: 0,
    onExit
  };

  titleEl().textContent = `Level ${level.id}: ${level.name}`;
  subEl().textContent = level.desc;
  updateScoreUI(0);
  showScreen('game-screen');

  await nextRound();
}

async function nextRound() {
  if (!active) return;
  if (active.rounds >= active.level.roundsPerSession) {
    return finish();
  }

  stage().innerHTML = '<div class="muted" style="text-align:center;padding:30px">Loading…</div>';
  let round;
  try {
    round = await API.getRound(active.level.altCount ?? 5);
  } catch (err) {
    stage().innerHTML = `<div class="muted" style="text-align:center;padding:30px">Couldn't load. <button class="button" id="retry">Retry</button></div>`;
    document.getElementById('retry').onclick = () => nextRound();
    return;
  }

  active.level.render(stage(), {
    round,
    lang: active.lang,
    onAnswer: handleAnswer,
    nextRound
  });
}

function handleAnswer(correct, opts = {}) {
  if (!active) return;
  const delta = correct ? active.level.scoring.right : active.level.scoring.wrong;
  active.score += delta;
  if (correct) {
    active.streakRight += 1; active.streakWrong = 0;
    Audio.correct();
    Storage.addStars(1);
  } else {
    active.streakWrong += 1; active.streakRight = 0;
    Audio.wrong();
  }
  updateScoreUI(active.score);
  toast(correct ? `+${active.level.scoring.right} ⭐` : `${active.level.scoring.wrong}`, correct ? 'good' : 'bad');

  // Round advance is the level's responsibility — caller can pass advance:true to skip
  if (opts.advance !== false) {
    setTimeout(() => {
      active.rounds += 1;
      nextRound();
    }, opts.delay ?? 900);
  }
}

function finish() {
  const lvl = active.level;
  const finalScore = active.score;
  const summary = Storage.setLevelScore(lvl.id, finalScore);
  const lifetime = Storage.getStars();

  // Stars 1-3 based on hit rate this session
  const ratio = Math.max(0, Math.min(1, finalScore / (lvl.roundsPerSession * lvl.scoring.right)));
  const stars = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : ratio > 0 ? 1 : 0;

  document.getElementById('done-title').textContent =
    finalScore > 0 ? 'Great Job!' : finalScore === 0 ? 'Keep Trying!' : 'Try Again';
  document.getElementById('done-stars').textContent = '⭐'.repeat(Math.max(0, stars)) || '✨';
  document.getElementById('done-summary').textContent =
    `Score ${finalScore}  •  Best ${summary.high}  •  Lifetime stars ${lifetime}`;

  Audio.win();
  showScreen('done-screen');

  // Wire done buttons (re-bind each session to capture current level)
  document.getElementById('done-again').onclick = () => runLevel(lvl, { onExit: active.onExit });
  document.getElementById('done-next').onclick = () => active.onExit({ next: true });
  document.getElementById('done-home').onclick = () => active.onExit({ home: true });
}

function updateScoreUI(s) {
  scoreEl().textContent = s;
  scorePill().classList.toggle('negative', s < 0);
}

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

export function toast(msg, kind = '') {
  const el = document.createElement('div');
  el.className = 'toast' + (kind ? ' ' + kind : '');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

// Generic helper: render the "three names with speakers" block
export function renderNames(round) {
  const items = [
    { lang: 'en', text: round.target.en, rtl: false },
    { lang: 'ur', text: round.target.ur, rtl: true },
    { lang: 'ar', text: round.target.ar, rtl: true }
  ];
  return `
    <div class="names-stack">
      ${items.map(i => `
        <div class="name-row ${i.rtl ? 'rtl' : ''}">
          <button class="speaker" data-speak="${escapeAttr(i.text)}" data-lang="${i.lang}" aria-label="Play ${i.lang}">🔊</button>
          <span class="name-text">${escape(i.text)}</span>
          <span class="lang-tag">${i.lang.toUpperCase()}</span>
        </div>
      `).join('')}
    </div>
  `;
}

export function bindSpeakers(root) {
  root.querySelectorAll('[data-speak]').forEach(btn => {
    btn.addEventListener('click', () => {
      Audio.speak(btn.dataset.speak, btn.dataset.lang);
    });
  });
}

export function escape(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
export function escapeAttr(s) { return escape(s); }
