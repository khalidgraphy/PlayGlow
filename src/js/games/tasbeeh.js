// Activity 12: Tasbeeh Counter (Tools) — a simple one-tap dhikr counter.
//   • One big button: tap to count. Gentle tick + haptic buzz each press.
//   • Target (33 / 99 / 100 / free): on reaching it, a round completes,
//     it buzzes, and the count rolls back to 0.
//   • Undo removes one; Reset clears (two-tap confirm). Count is saved.
//   • Left midway (e.g. 356 of 1000)? On reopen a "Welcome back" prompt asks
//     Continue or Start new. Start new keeps the unfinished count as a saved
//     task (max 2) until it is completed or removed.
//   • Optional name per count (e.g. "My Tasbeeh Ramadan"), kept with saved tasks.
// Custom "tool" level like Word Finder: renders itself, no score/done screen —
// the header back arrow returns home.

import { Audio } from '../audio.js';

const KEY = 'playglow:tasbeeh';
const TARGETS = [
  { value: 33,  label: '33' },
  { value: 99,  label: '99' },
  { value: 100, label: '100' },
  { value: 0,   label: '∞' },   // 0 = free count, no auto-round
];

const MAX_SAVED = 2;

function load() {
  let s;
  try {
    s = { count: 0, rounds: 0, target: 33, ...(JSON.parse(localStorage.getItem(KEY) || '{}')) };
  } catch { s = { count: 0, rounds: 0, target: 33 }; }
  if (!Array.isArray(s.saved)) s.saved = [];
  s.saved = s.saved.filter(t => t && t.count > 0).slice(0, MAX_SAVED);
  return s;
}
function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}
function esc(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function buzz(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch {}
}

export const tasbeeh = {
  id: 12,
  name: 'Tasbeeh Counter',
  emoji: '📿',
  desc: 'Tap to count',
  ageHint: 'All ages',
  guide: 'Tap the big button to count your tasbeeh. Pick a target (33, 99, 100) or free count (∞). It buzzes gently and starts a new round when you reach the target. Undo removes one; Reset clears the count. Your count is saved automatically. Tap 🏷️ to give it a name, like My Tasbeeh Ramadan. Left midway? Next time you can continue, or start new and keep up to 2 unfinished counts saved.',
  custom: true,

  start(stage, { onExit }) {
    let s = load();

    stage.innerHTML = `
      <div class="tb-root">
        <div class="tb-stats">
          <div class="hud-pill"><span class="hud-label">ROUNDS</span><span class="hud-value" id="tb-rounds">0</span></div>
          <div class="hud-pill"><span class="hud-label">TARGET</span><span class="hud-value" id="tb-target">33</span></div>
        </div>

        <button class="tb-name" id="tb-name" type="button"></button>

        <div class="tb-targets" id="tb-targets">
          ${TARGETS.map(t => `<button class="tb-chip" data-target="${t.value}">${t.label}</button>`).join('')}
          <button class="tb-chip" id="tb-custom-chip">✏️ Custom</button>
        </div>

        <div class="tb-custom-row" id="tb-custom-row" style="display:none">
          <input type="number" inputmode="numeric" min="1" max="100000" id="tb-custom-input"
                 class="tb-custom-input" placeholder="1 – 100000" />
          <button class="ww-ctrl" id="tb-custom-set">Set</button>
        </div>

        <div class="tb-saved" id="tb-saved"></div>

        <div class="tb-dial-wrap">
          <div class="tb-dial" id="tb-dial">
            <button class="tb-button" id="tb-tap" aria-label="Count one">
              <span class="tb-count" id="tb-count">0</span>
              <span class="tb-tap-hint">tap to count</span>
            </button>
          </div>
        </div>

        <div class="tb-actions">
          <button class="ww-ctrl" id="tb-undo">↩︎ Undo</button>
          <button class="ww-ctrl" id="tb-new">＋ New</button>
          <button class="ww-ctrl" id="tb-reset">Reset</button>
        </div>
      </div>`;

    const dialEl   = stage.querySelector('#tb-dial');
    const tapEl    = stage.querySelector('#tb-tap');
    const countEl  = stage.querySelector('#tb-count');
    const roundsEl = stage.querySelector('#tb-rounds');
    const targetEl = stage.querySelector('#tb-target');
    const resetEl  = stage.querySelector('#tb-reset');
    const customChip  = stage.querySelector('#tb-custom-chip');
    const customRow   = stage.querySelector('#tb-custom-row');
    const customInput = stage.querySelector('#tb-custom-input');
    const savedEl     = stage.querySelector('#tb-saved');
    const nameEl      = stage.querySelector('#tb-name');
    nameEl.onclick = editName;

    tapEl.onclick = tap;
    stage.querySelector('#tb-undo').onclick = undo;
    resetEl.onclick = resetTap;
    stage.querySelector('#tb-new').onclick = () => startNew();
    stage.querySelectorAll('.tb-chip[data-target]').forEach(b => {
      b.onclick = () => { hideCustomRow(); setTarget(parseInt(b.dataset.target, 10)); };
    });
    customChip.onclick = toggleCustomRow;
    stage.querySelector('#tb-custom-set').onclick = applyCustom;
    customInput.onkeydown = (e) => { if (e.key === 'Enter') applyCustom(); };

    render();
    // Reopened with unfinished work: ask before counting on.
    if (s.count > 0 || s.saved.length) welcomeBack();

    function tap() {
      s.count += 1;
      Audio.beep({ freq: 540, duration: 0.05, gain: 0.14 });
      buzz(12);
      if (s.target && s.count >= s.target) {
        s.rounds += 1;
        s.count = 0;
        Audio.correct();
        buzz([30, 40, 30]);
        dialEl.classList.remove('complete');
        void dialEl.offsetWidth; // restart animation
        dialEl.classList.add('complete');
      }
      save(s);
      render();
    }

    function undo() {
      if (s.count > 0) s.count -= 1;
      else if (s.rounds > 0) { s.rounds -= 1; s.count = s.target ? s.target - 1 : 0; }
      buzz(8);
      save(s);
      render();
    }

    function setTarget(value) {
      s.target = value;
      save(s);
      render();
    }

    // Reset uses a distinct confirm dialog (not a double-tap) so fast tappers
    // can't wipe their count by accident. The Yes button sits away from Reset
    // and is briefly disabled to defeat an accidental rapid second tap.
    function resetTap() {
      if (stage.querySelector('#tb-confirm')) return; // already open
      const overlay = document.createElement('div');
      overlay.className = 'tb-confirm';
      overlay.id = 'tb-confirm';
      overlay.innerHTML = `
        <div class="tb-confirm-card">
          <div class="tb-confirm-text">Reset the count to 0?</div>
          <div class="tb-confirm-btns">
            <button class="ww-ctrl" id="tb-confirm-cancel">Cancel</button>
            <button class="ww-ctrl tb-danger" id="tb-confirm-yes" disabled>Yes, reset</button>
          </div>
        </div>`;
      stage.querySelector('.tb-root').appendChild(overlay);
      const yesBtn = overlay.querySelector('#tb-confirm-yes');
      const close = () => overlay.remove();
      overlay.querySelector('#tb-confirm-cancel').onclick = close;
      overlay.onclick = (e) => { if (e.target === overlay) close(); };
      // Arm Yes after a short delay so a fast double-tap on Reset can't hit it.
      setTimeout(() => { yesBtn.disabled = false; }, 350);
      yesBtn.onclick = () => {
        close();
        s.count = 0;
        s.rounds = 0;
        buzz(20);
        save(s);
        render();
      };
    }

    // ---- Unfinished tasks (resume / start new / saved list) ----
    function nums(t) { return t.target ? `${t.count} / ${t.target}` : `${t.count} (∞)`; }
    // HTML-safe label: "My Tasbeeh Ramadan: 356 / 1000" or just "356 / 1000".
    function label(t) { return t.name ? `${esc(t.name)}: ${nums(t)}` : nums(t); }
    function snapshot() { return { count: s.count, rounds: s.rounds, target: s.target, name: s.name || '', savedAt: Date.now() }; }

    // Optional name for the current count.
    function editName() {
      const ov = overlayCard(`
        <div class="tb-confirm-text">Name this tasbeeh</div>
        <div class="tb-wb-sub">Optional, e.g. My Tasbeeh Ramadan</div>
        <input type="text" id="tb-name-input" class="tb-custom-input tb-name-input" maxlength="40"
               placeholder="My Tasbeeh Ramadan" value="${esc(s.name || '')}" />
        <div class="tb-confirm-btns">
          ${s.name ? '<button class="ww-ctrl" id="tb-name-clear">Remove name</button>' : '<button class="ww-ctrl" id="tb-name-cancel">Cancel</button>'}
          <button class="ww-ctrl tb-save" id="tb-name-save">Save</button>
        </div>`);
      const input = ov.querySelector('#tb-name-input');
      const done = (v) => { ov.remove(); s.name = v; save(s); render(); };
      ov.querySelector('#tb-name-save').onclick = () => done(input.value.trim().slice(0, 40));
      input.onkeydown = (e) => { if (e.key === 'Enter') done(input.value.trim().slice(0, 40)); };
      const clr = ov.querySelector('#tb-name-clear');
      if (clr) clr.onclick = () => done('');
      const cancel = ov.querySelector('#tb-name-cancel');
      if (cancel) cancel.onclick = () => ov.remove();
      ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
      setTimeout(() => { try { input.focus(); } catch {} }, 50);
    }

    function overlayCard(html) {
      const old = stage.querySelector('#tb-confirm');
      if (old) old.remove();
      const overlay = document.createElement('div');
      overlay.className = 'tb-confirm';
      overlay.id = 'tb-confirm';
      overlay.innerHTML = `<div class="tb-confirm-card">${html}</div>`;
      stage.querySelector('.tb-root').appendChild(overlay);
      return overlay;
    }

    function welcomeBack() {
      const cur = s.count > 0;
      const list = s.saved.map((t, i) => `
        <button class="tb-wb-item" data-resume="${i}">▶ Continue saved ${label(t)}</button>`).join('');
      const ov = overlayCard(`
        <div class="tb-confirm-text">Welcome back!</div>
        ${cur ? `<div class="tb-wb-sub">You stopped at <b>${label(s)}</b></div>` : `<div class="tb-wb-sub">You have unfinished tasbeeh saved.</div>`}
        <div class="tb-wb-list">
          ${cur ? `<button class="tb-wb-item primary" id="tb-wb-continue">▶ Continue ${label(s)}</button>` : ''}
          ${list}
          <button class="tb-wb-item" id="tb-wb-new">＋ Start new${cur ? ' (keep this saved)' : ''}</button>
        </div>`);
      const close = () => ov.remove();
      const c = ov.querySelector('#tb-wb-continue');
      if (c) c.onclick = close;
      ov.querySelectorAll('[data-resume]').forEach(b => {
        b.onclick = () => { close(); resumeSaved(parseInt(b.dataset.resume, 10)); };
      });
      ov.querySelector('#tb-wb-new').onclick = () => { close(); startNew(); };
    }

    // Park the current count as a saved task and start from 0.
    function startNew() {
      if (s.count === 0) { s.rounds = 0; s.name = ''; save(s); render(); return; }
      if (s.saved.length >= MAX_SAVED) { fullDialog(); return; }
      s.saved.push(snapshot());
      s.count = 0; s.rounds = 0; s.name = '';
      buzz(15);
      save(s); render();
    }

    function fullDialog() {
      const ov = overlayCard(`
        <div class="tb-confirm-text">2 tasks already saved</div>
        <div class="tb-wb-sub">Finish or remove one to save <b>${label(s)}</b>.</div>
        <div class="tb-confirm-btns"><button class="ww-ctrl" id="tb-full-ok">OK</button></div>`);
      ov.querySelector('#tb-full-ok').onclick = () => ov.remove();
    }

    // Switch to a saved task; the current one (if any) takes its slot.
    function resumeSaved(i) {
      const t = s.saved[i];
      if (!t) return;
      if (s.count > 0) s.saved[i] = snapshot();
      else s.saved.splice(i, 1);
      s.count = t.count; s.rounds = t.rounds || 0; s.target = t.target; s.name = t.name || '';
      buzz(15);
      save(s); render();
    }

    function removeSaved(i) {
      const t = s.saved[i];
      if (!t) return;
      const ov = overlayCard(`
        <div class="tb-confirm-text">Remove saved ${label(t)}?</div>
        <div class="tb-confirm-btns">
          <button class="ww-ctrl" id="tb-rm-cancel">Cancel</button>
          <button class="ww-ctrl tb-danger" id="tb-rm-yes" disabled>Remove</button>
        </div>`);
      const yes = ov.querySelector('#tb-rm-yes');
      ov.querySelector('#tb-rm-cancel').onclick = () => ov.remove();
      ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
      setTimeout(() => { yes.disabled = false; }, 350);
      yes.onclick = () => { ov.remove(); s.saved.splice(i, 1); save(s); render(); };
    }

    function renderSaved() {
      if (!s.saved.length) { savedEl.style.display = 'none'; savedEl.innerHTML = ''; return; }
      savedEl.style.display = '';
      savedEl.innerHTML = `<span class="tb-saved-label">Saved:</span>` + s.saved.map((t, i) => `
        <span class="tb-saved-chip">
          <button class="tb-saved-go" data-go="${i}">▶ ${label(t)}</button>
          <button class="tb-saved-x" data-x="${i}" aria-label="Remove saved task">✕</button>
        </span>`).join('');
      savedEl.querySelectorAll('[data-go]').forEach(b => { b.onclick = () => resumeSaved(parseInt(b.dataset.go, 10)); });
      savedEl.querySelectorAll('[data-x]').forEach(b => { b.onclick = () => removeSaved(parseInt(b.dataset.x, 10)); });
    }

    // ---- Custom target (1–100000) ----
    function toggleCustomRow() {
      const open = customRow.style.display !== 'none';
      if (open) { hideCustomRow(); return; }
      customRow.style.display = 'flex';
      customInput.value = isCustom(s.target) ? s.target : '';
      customInput.focus();
    }
    function hideCustomRow() { customRow.style.display = 'none'; }
    function applyCustom() {
      const v = parseInt(customInput.value, 10);
      if (!Number.isFinite(v) || v < 1) { customInput.focus(); return; }
      hideCustomRow();
      setTarget(Math.min(100000, v));
    }

    function render() {
      countEl.textContent = s.count;
      roundsEl.textContent = s.rounds;
      targetEl.textContent = s.target ? s.target : '∞';
      stage.querySelectorAll('.tb-chip[data-target]').forEach(b =>
        b.classList.toggle('active', parseInt(b.dataset.target, 10) === s.target));
      const custom = isCustom(s.target);
      customChip.classList.toggle('active', custom);
      customChip.textContent = custom ? `✏️ ${s.target}` : '✏️ Custom';
      const pct = s.target ? Math.min(100, Math.round((s.count / s.target) * 100)) : 0;
      dialEl.style.background = `conic-gradient(var(--brand, #6b3fd4) ${pct}%, #e9e4fa ${pct}%)`;
      nameEl.innerHTML = s.name ? `🏷️ <span>${esc(s.name)}</span> ✏️` : '🏷️ Add a name (optional)';
      nameEl.classList.toggle('named', !!s.name);
      renderSaved();
    }
  }
};

// A target counts as "custom" when it isn't one of the preset chip values.
function isCustom(target) {
  return !TARGETS.some(t => t.value === target);
}
