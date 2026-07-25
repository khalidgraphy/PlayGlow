import { Storage } from './storage.js';
import { Audio } from './audio.js';
import { API } from './api.js';
import { runLevel, runCustomLevel, showScreen } from './engine.js';
import { ticTacToe }              from './games/tictactoe.js';      // id 2 (NEW)
import { wordFinder }             from './levels/wordfinder.js';    // id 3
import { level1 as hearTap }      from './levels/level1.js';        // id 4
import { level4 as spellIt }      from './levels/level4.js';        // id 5
import { level2 as threeNames }   from './levels/level2.js';        // id 6
import { level3 as firstLetter }  from './levels/level3.js';        // id 7
import { level5 as matchTrans }   from './levels/level5.js';        // id 8
import { missingLetter }          from './levels/missingletter.js'; // id 9
import { colorTrap }              from './games/colortrap.js';      // id 10 (was id 2; Daily Word removed)
import { wordWheel }              from './games/wordwheel.js';      // id 11 (NEW)
import { tasbeeh }                from './games/tasbeeh.js';        // id 12 (NEW, Tools)
import { wildCards }              from './games/wildcards.js';      // id 13 (NEW, Games)
import { snakesLadders }          from './games/snakesladders.js';  // id 14 (NEW, Games)
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
// (Daily Word removed; Color Trap moved from id 2 → id 10; Tic Tac Toe new at id 2)
const HOME_LEVELS = [LEVEL1_PARENT, ticTacToe, wordFinder, hearTap, spellIt, threeNames, firstLetter, matchTrans, missingLetter, colorTrap, wordWheel, tasbeeh, wildCards, snakesLadders];
// Routing lookup: parent + sub-levels + everything
const ALL_LEVELS = [LEVEL1_PARENT, ticTacToe, wordFinder, ...CRUSH_SUBS, hearTap, spellIt, threeNames, firstLetter, matchTrans, missingLetter, colorTrap, wordWheel, tasbeeh, wildCards, snakesLadders];

// Home categories (tabbed). Each activity maps to exactly one bucket.
const CATEGORIES = [
  { key: 'learning',    label: 'Learning',    emoji: '📚' },
  { key: 'edutainment', label: 'Edutainment', emoji: '🎨' },
  { key: 'games',       label: 'Games',       emoji: '🎮' },
  { key: 'tools',       label: 'Tools',       emoji: '🧰' },
];
const LEVEL_CATEGORY = {
  1: 'edutainment',  // ABC Crush
  2: 'games',        // Tic Tac Toe
  3: 'tools',        // Word Finder (A–Z word explorer)
  4: 'learning',     // Hear & Tap
  5: 'learning',     // Spell It
  6: 'learning',     // Word Cards
  7: 'learning',     // First Letter
  8: 'learning',     // Match Translation
  9: 'learning',     // Missing Letter
  10: 'edutainment', // Color Trap
  11: 'edutainment', // Word Wheel
  12: 'tools',        // Tasbeeh Counter
  13: 'games',        // Wild Cards
  14: 'games',        // Snakes & Ladders
};
function categoryOf(lvl) { return LEVEL_CATEGORY[lvl.id] || 'learning'; }
let activeCategory = 'learning';

const LANG_LABEL = { en: 'EN', ur: 'اردو', ar: 'عربي' };

// Bump on each notable release so users can see they're current in Settings.
const APP_VERSION = 'v4';

// Force the newest version: drop the service worker + caches, then reload from
// network. The nuclear option for stuck PWAs (esp. iOS home-screen installs).
async function forceUpdate() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (e) {
    console.warn('forceUpdate cleanup failed', e);
  }
  location.reload();
}

function openSettings() {
  syncSettingsUI();
  syncAccountUI();
  showScreen('lang-screen');
}

// ---- Parent account (email OTP) ----
let pendingEmail = '';

function syncAccountUI() {
  const btn = document.getElementById('account-btn');
  const desc = document.getElementById('account-desc');
  if (btn) {
    if (Storage.isSignedIn()) {
      btn.textContent = 'Sign out';
      btn.classList.add('signed-in');
      if (desc) desc.textContent = 'Signed in as ' + (Storage.getAuthEmail() || 'parent');
    } else {
      btn.textContent = 'Sign in';
      btn.classList.remove('signed-in');
      if (desc) desc.textContent = 'Sign in to save progress across devices';
    }
  }
  syncProfileChip();
}

// Home profile chip doubles as the sign-in entry point when signed out
// (kids can still play without it). Signed in → shows the child's name.
function syncProfileChip() {
  const nameEl = document.getElementById('profile-name');
  if (!nameEl) return;
  const profile = Storage.getActiveProfile();
  if (Storage.isSignedIn()) {
    if (profile) nameEl.textContent = profile.name;
    nameEl.classList.remove('chip-signin');
  } else {
    nameEl.textContent = 'Sign in';
    nameEl.classList.add('chip-signin');
  }
}

function showAuth() {
  document.getElementById('auth-step-email').classList.remove('hidden');
  document.getElementById('auth-step-code').classList.add('hidden');
  document.getElementById('auth-email-msg').textContent = '';
  document.getElementById('auth-code-msg').textContent = '';
  const overlay = document.getElementById('auth-overlay');
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
  document.getElementById('auth-email').focus();
}
function hideAuth() {
  const overlay = document.getElementById('auth-overlay');
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
}

const AUTH_ERRORS = {
  too_soon: 'Please wait a moment before requesting another code.',
  rate_limited: 'Too many requests. Please try again later.',
  send_failed: 'Could not send the email. Please try again.',
  invalid_email: 'Please enter a valid email.',
  code_incorrect: 'Incorrect code. Please try again.',
  code_expired: 'That code expired. Please request a new one.',
  too_many_attempts: 'Too many tries. Please request a new code.',
};

function wireAuth() {
  const accountBtn = document.getElementById('account-btn');
  if (!accountBtn) return;

  accountBtn.onclick = () => {
    if (Storage.isSignedIn()) {
      const t = Storage.getAuthToken();
      Storage.clearAuth();
      syncAccountUI();
      API.logout(t);
    } else {
      showAuth();
    }
  };

  document.getElementById('auth-send').onclick = async () => {
    const email = document.getElementById('auth-email').value.trim();
    const msg = document.getElementById('auth-email-msg');
    msg.classList.remove('ok');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = 'Please enter a valid email.'; return; }
    const btn = document.getElementById('auth-send');
    btn.disabled = true; btn.textContent = 'Sending...';
    try {
      await API.requestOtp(email);
      pendingEmail = email;
      document.getElementById('auth-email-echo').textContent = email;
      document.getElementById('auth-step-email').classList.add('hidden');
      document.getElementById('auth-step-code').classList.remove('hidden');
      const codeInput = document.getElementById('auth-code');
      codeInput.value = ''; codeInput.focus();
    } catch (e) {
      msg.textContent = AUTH_ERRORS[e.message] || 'Something went wrong. Please try again.';
    } finally {
      btn.disabled = false; btn.textContent = 'Send code';
    }
  };

  document.getElementById('auth-verify').onclick = async () => {
    const code = document.getElementById('auth-code').value.trim();
    const msg = document.getElementById('auth-code-msg');
    msg.classList.remove('ok');
    if (!/^\d{6}$/.test(code)) { msg.textContent = 'Enter the 6-digit code.'; return; }
    const btn = document.getElementById('auth-verify');
    btn.disabled = true; btn.textContent = 'Verifying...';
    try {
      const res = await API.verifyOtp(pendingEmail, code);
      Storage.setAuth(res.token, res.email);
      syncAccountUI();
      hideAuth();
    } catch (e) {
      msg.textContent = AUTH_ERRORS[e.message] || 'Could not verify. Please try again.';
    } finally {
      btn.disabled = false; btn.textContent = 'Verify & sign in';
    }
  };

  document.getElementById('auth-resend').onclick = () => {
    document.getElementById('auth-step-code').classList.add('hidden');
    document.getElementById('auth-step-email').classList.remove('hidden');
    document.getElementById('auth-email').focus();
  };
  document.getElementById('auth-close').onclick = hideAuth;
  document.getElementById('auth-overlay').onclick = (e) => {
    if (e.target.id === 'auth-overlay') hideAuth();
  };
}

function syncSettingsUI() {
  const sec = Storage.getSecondaryLang();
  const ar = document.getElementById('ar-toggle');
  if (ar) ar.checked = sec === 'ar';
  const urBadge = document.getElementById('ur-badge');
  if (urBadge) {
    urBadge.textContent = sec === 'ur' ? 'ON' : 'OFF';
    urBadge.classList.toggle('badge-off', sec !== 'ur');
    urBadge.classList.toggle('badge-on', sec === 'ur');
  }
}

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
  } else {
    // Default primary lang to 'en' if missing — kept simple, no picker needed
    if (!localStorage.getItem('wordglow:language')) Storage.setLanguage('en');
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

  // Profile chip: signed out → open sign-in (optional, encourages saving
  // progress); signed in → show profile + account info.
  const profChip = document.getElementById('profile-chip');
  if (profChip) profChip.onclick = () => {
    if (!Storage.isSignedIn()) { showAuth(); return; }
    const p = Storage.getActiveProfile();
    const acct = Storage.getAuthEmail();
    if (p) showInfo(`${p.avatar} ${p.name}`,
      `Age ${p.age}${p.gender ? ' · ' + p.gender : ''} · Progress is being saved${acct ? ' to ' + acct : ''}. Manage your account in Settings (🌐).`);
  };

  document.getElementById('lang-switch').onclick = () => openSettings();
  const settingsBack = document.getElementById('settings-back');
  if (settingsBack) settingsBack.onclick = () => renderHome();
  const arToggle = document.getElementById('ar-toggle');
  if (arToggle) {
    arToggle.checked = Storage.getSecondaryLang() === 'ar';
    arToggle.onchange = () => {
      Storage.setSecondaryLang(arToggle.checked ? 'ar' : 'ur');
      syncSettingsUI();
    };
  }
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

  wireAuth();
  // Parent sign-in link on the first-run setup screen (optional; kids can just play).
  const pfSignin = document.getElementById('pf-signin-link');
  if (pfSignin) pfSignin.onclick = () => showAuth();

  // App updates: show version + a force-refresh button for stuck PWAs.
  const versionEl = document.getElementById('app-version');
  if (versionEl) versionEl.textContent = `Version ${APP_VERSION} · tap Refresh for the newest`;
  const refreshBtn = document.getElementById('refresh-app-btn');
  if (refreshBtn) refreshBtn.onclick = () => {
    refreshBtn.disabled = true;
    refreshBtn.textContent = 'Updating…';
    forceUpdate();
  };
  // Silently drop a stale/revoked token so the UI doesn't show a false signed-in state.
  const tok = Storage.getAuthToken();
  if (tok) {
    API.me(tok).then(res => {
      if (!res) { Storage.clearAuth(); syncAccountUI(); }
    });
  }
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
  const sec = Storage.getSecondaryLang();
  document.getElementById('lang-label').textContent = sec === 'ar' ? 'EN+AR' : 'EN+UR';

  // Profile chip + greeting
  const profile = Storage.getActiveProfile();
  if (profile) {
    document.getElementById('profile-avatar').textContent = profile.avatar;
    document.getElementById('profile-name').textContent = profile.name;
    document.getElementById('home-greeting').textContent = `Hi, ${profile.name}! Pick an Activity`;
  }
  syncProfileChip();

  renderHomeTabs();
  renderLevelGrid();
  showScreen('home-screen');
}

// Category tab bar — switches which activities the grid shows.
function renderHomeTabs() {
  const bar = document.getElementById('home-tabs');
  if (!bar) return;
  bar.innerHTML = CATEGORIES.map(c => {
    const active = c.key === activeCategory ? ' active' : '';
    return `<button class="home-tab${active}" data-cat="${c.key}" type="button">` +
           `<span class="home-tab-emoji">${c.emoji}</span>${c.label}</button>`;
  }).join('');
  bar.querySelectorAll('.home-tab').forEach(tab => {
    tab.onclick = () => {
      if (activeCategory === tab.dataset.cat) return;
      activeCategory = tab.dataset.cat;
      renderHomeTabs();
      renderLevelGrid();
    };
  });
}

// Grid of activity cards for the active category.
function renderLevelGrid() {
  const last = Storage.getLastLevel();
  const scores = Storage.getScores();
  const grid = document.getElementById('level-grid');
  const items = HOME_LEVELS.filter(lvl => categoryOf(lvl) === activeCategory);
  grid.innerHTML = items.map(lvl => {
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
