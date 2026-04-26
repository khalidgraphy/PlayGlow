import { Storage } from './storage.js';
import { Audio } from './audio.js';
import { runLevel, runCustomLevel, showScreen } from './engine.js';
import { cloudABC }               from './games/cloudabc.js';       // id 2 (NEW)
import { wordFinder }             from './levels/wordfinder.js';    // id 3
import { level1 as hearTap }      from './levels/level1.js';        // id 4
import { level4 as spellIt }      from './levels/level4.js';        // id 5
import { level2 as threeNames }   from './levels/level2.js';        // id 6
import { level3 as firstLetter }  from './levels/level3.js';        // id 7
import { level5 as matchTrans }   from './levels/level5.js';        // id 8
import { missingLetter }          from './levels/missingletter.js'; // id 9
import { dailyWordLevel }         from './levels/dailyword.js';     // id 10
import { CRUSH_SUBS } from './games/sublevels.js';
import { COLOR_MAP } from './games/crush.js';

// Level 1 is a "parent" — its card opens the sub-level picker, not a game directly.
const LEVEL1_PARENT = {
  id: 1,
  name: 'ABC Crush',
  emoji: '🍬',
  desc: '4 letter packs to play',
  ageHint: 'Age 4+',
  guide: 'Tap two side-by-side colored letter tiles to swap them. Match 3 or more of the same color in a row to clear and score points.',
  parent: true
};

// Display order on home — matches numeric id sequence (1..10)
const HOME_LEVELS = [LEVEL1_PARENT, cloudABC, wordFinder, hearTap, spellIt, threeNames, firstLetter, matchTrans, missingLetter, dailyWordLevel];
// Routing lookup: parent + sub-levels + everything
const ALL_LEVELS = [LEVEL1_PARENT, cloudABC, wordFinder, ...CRUSH_SUBS, hearTap, spellIt, threeNames, firstLetter, matchTrans, missingLetter, dailyWordLevel];

const LANG_LABEL = { en: 'EN', ur: 'اردو', ar: 'عربي' };

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
  // First-run path: no profile saved → setup screen. After save → home.
  if (!Storage.getActiveProfile()) {
    showScreen('profile-screen');
    wireProfileSetup();
  } else if (!localStorage.getItem('wordglow:language')) {
    showScreen('lang-screen');
  } else {
    renderHome();
  }

  // "Let's Start" button (legacy lang-screen path; still works for users who get here)
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.onclick = () => {
      Audio.arm();
      Storage.setLanguage(startBtn.dataset.lang || 'en');
      renderHome();
    };
  }
  // Backwards-compat: if old .lang-btn elements still exist, wire them too.
  document.querySelectorAll('#lang-screen .lang-btn').forEach(btn => {
    btn.onclick = () => {
      Audio.arm();
      Storage.setLanguage(btn.dataset.lang);
      renderHome();
    };
  });

  // Profile chip (Phase 2 will open a picker; for now it just shows the name)
  const profChip = document.getElementById('profile-chip');
  if (profChip) profChip.onclick = () => {
    const p = Storage.getActiveProfile();
    if (p) showInfo(`${p.avatar} ${p.name}`,
      `Age ${p.age}${p.gender ? ' · ' + p.gender : ''} · keep playing! More profiles + edit/delete coming soon.`);
  };

  document.getElementById('lang-switch').onclick = () => showScreen('lang-screen');
  document.getElementById('back-home').onclick = () => renderHome();
  document.getElementById('subs-back').onclick = () => renderHome();
  document.getElementById('subs-info').onclick = () =>
    showInfo('Activity 1: ABC Crush', LEVEL1_PARENT.guide);

  document.getElementById('info-close').onclick = hideInfo;
  document.getElementById('info-overlay').onclick = (e) => {
    if (e.target.id === 'info-overlay') hideInfo();
  };
  document.getElementById('game-info').onclick = () => {
    const lvl = currentLevel;
    if (lvl) showInfo(displayLabel(lvl), lvl.guide || 'Tap, listen, and learn.');
  };
}

let currentLevel = null;

function displayLabel(lvl) {
  if (lvl.label) return `Activity ${lvl.label}: ${lvl.name}`;
  return `Activity ${lvl.id}: ${lvl.name}`;
}

// Profile setup: collect name+age+avatar (gender optional), save, go home
function wireProfileSetup() {
  const nameInput  = document.getElementById('pf-name');
  const ageRow     = document.getElementById('pf-ages');
  const genderRow  = document.getElementById('pf-genders');
  const avRow      = document.getElementById('pf-avatars');
  const saveBtn    = document.getElementById('pf-save');
  if (!nameInput || !saveBtn) return;

  let pickedAge = '';
  let pickedGender = '';   // default = skip
  let pickedAvatar = '';

  function refresh() {
    const ok = nameInput.value.trim().length > 0 && pickedAge && pickedAvatar;
    saveBtn.disabled = !ok;
    saveBtn.style.opacity = ok ? '1' : '0.5';
  }

  nameInput.oninput = refresh;
  ageRow.querySelectorAll('.age-chip').forEach(b => b.onclick = () => {
    pickedAge = b.dataset.age;
    ageRow.querySelectorAll('.age-chip').forEach(x => x.classList.toggle('selected', x === b));
    refresh();
  });
  genderRow.querySelectorAll('.gender-chip').forEach(b => b.onclick = () => {
    pickedGender = b.dataset.gender || '';
    genderRow.querySelectorAll('.gender-chip').forEach(x => x.classList.toggle('selected', x === b));
  });
  avRow.querySelectorAll('.avatar-btn').forEach(b => b.onclick = () => {
    pickedAvatar = b.dataset.av;
    avRow.querySelectorAll('.avatar-btn').forEach(x => x.classList.toggle('selected', x === b));
    refresh();
  });

  saveBtn.onclick = () => {
    if (saveBtn.disabled) return;
    Audio.arm();
    Storage.saveProfile({
      name: nameInput.value.trim(),
      age: pickedAge,
      gender: pickedGender,
      avatar: pickedAvatar
    });
    if (!localStorage.getItem('wordglow:language')) Storage.setLanguage('en');
    renderHome();
  };

  refresh();
}

function renderHome() {
  document.getElementById('lifetime-stars').textContent = Storage.getStars();
  document.getElementById('lang-label').textContent = LANG_LABEL[Storage.getLanguage()] || 'EN';

  // Profile chip + greeting
  const profile = Storage.getActiveProfile();
  if (profile) {
    document.getElementById('profile-avatar').textContent = profile.avatar;
    document.getElementById('profile-name').textContent = profile.name;
    document.getElementById('home-greeting').textContent = `Hi, ${profile.name}! Pick an Activity`;
  }

  const last = Storage.getLastLevel();
  const scores = Storage.getScores();
  const grid = document.getElementById('level-grid');
  grid.innerHTML = HOME_LEVELS.map(lvl => {
    const s = scores[lvl.id] || { high: 0, last: 0 };
    const recommended = lvl.id === last ? ' recommended' : '';
    return `
      <div class="level-card${recommended}" data-id="${lvl.id}">
        <button class="info-btn corner" data-info-id="${lvl.id}" aria-label="How to play">i</button>
        <div class="lvl-num">ACTIVITY ${lvl.id}${lvl.parent ? ' ▸' : ''}</div>
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
    card.onclick = () => {
      const id = parseInt(card.dataset.id, 10);
      const lvl = HOME_LEVELS.find(l => l.id === id);
      if (lvl?.parent) return openSubs();
      start(id);
    };
  });
  grid.querySelectorAll('.info-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.infoId, 10);
      const lvl = HOME_LEVELS.find(l => l.id === id);
      if (lvl) showInfo(`Activity ${lvl.id}: ${lvl.name}`, lvl.guide || '');
    };
  });

  showScreen('home-screen');
}

function openSubs() {
  const grid = document.getElementById('subs-grid');
  const scores = Storage.getScores();
  grid.innerHTML = CRUSH_SUBS.map(sub => {
    const s = scores[sub.id] || { high: 0 };
    const dots = sub.letters.slice(0, 6).map(L => {
      const c = COLOR_MAP[L];
      return `<span class="color-dot" style="background:${c.bg}" title="${L}"></span>`;
    }).join('');
    return `
      <div class="level-card sub-card" data-id="${sub.id}">
        <button class="info-btn corner" data-info-id="${sub.id}" aria-label="How to play">i</button>
        <div class="lvl-num sub-badge">${sub.label}</div>
        <div class="color-strip">${dots}</div>
        <div class="lvl-name">${sub.name}</div>
        <div class="lvl-desc">${sub.letters.length} colors · target ${sub.target}</div>
        <div class="lvl-meta">
          <span>${sub.ageHint}</span>
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
      const sub = CRUSH_SUBS.find(s => s.id === id);
      if (sub) showInfo(`Activity ${sub.label}: ${sub.name}`, sub.guide);
    };
  });
  showScreen('subs-screen');
}

function start(id) {
  const lvl = ALL_LEVELS.find(l => l.id === id);
  if (!lvl) return;
  currentLevel = lvl;
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
      // For crush subs, advance to next sub if there is one; otherwise back to subs picker
      const sub = CRUSH_SUBS.find(s => s.id === currentId);
      if (sub) {
        const idx = CRUSH_SUBS.indexOf(sub);
        const nextSub = CRUSH_SUBS[idx + 1];
        if (nextSub) return start(nextSub.id);
        return openSubs();
      }
      // Learning levels: walk to the next learning level by id
      const order = HOME_LEVELS.filter(l => !l.parent).map(l => l.id);
      const i = order.indexOf(currentId);
      const nextId = order[i + 1];
      if (nextId) return start(nextId);
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
