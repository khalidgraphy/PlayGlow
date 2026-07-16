// Activity 12: Tasbeeh Counter (Tools) — a simple one-tap dhikr counter.
//   • One big button: tap to count. Gentle tick + haptic buzz each press.
//   • Target (33 / 99 / 100 / free): on reaching it, a round completes,
//     it buzzes, and the count rolls back to 0.
//   • Undo removes one; Reset clears (two-tap confirm). Count is saved.
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

function load() {
  try {
    return { count: 0, rounds: 0, target: 33, ...(JSON.parse(localStorage.getItem(KEY) || '{}')) };
  } catch { return { count: 0, rounds: 0, target: 33 }; }
}
function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
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
  guide: 'Tap the big button to count your tasbeeh. Pick a target (33, 99, 100) or free count (∞). It buzzes gently and starts a new round when you reach the target. Undo removes one; Reset clears the count. Your count is saved automatically.',
  custom: true,

  start(stage, { onExit }) {
    let s = load();

    stage.innerHTML = `
      <div class="tb-root">
        <div class="tb-stats">
          <div class="hud-pill"><span class="hud-label">ROUNDS</span><span class="hud-value" id="tb-rounds">0</span></div>
          <div class="hud-pill"><span class="hud-label">TARGET</span><span class="hud-value" id="tb-target">33</span></div>
        </div>

        <div class="tb-dial" id="tb-dial">
          <button class="tb-button" id="tb-tap" aria-label="Count one">
            <span class="tb-count" id="tb-count">0</span>
            <span class="tb-tap-hint">tap to count</span>
          </button>
        </div>

        <div class="tb-targets" id="tb-targets">
          ${TARGETS.map(t => `<button class="tb-chip" data-target="${t.value}">${t.label}</button>`).join('')}
          <button class="tb-chip" id="tb-custom-chip">✏️ Custom</button>
        </div>

        <div class="tb-custom-row" id="tb-custom-row" style="display:none">
          <input type="number" inputmode="numeric" min="1" max="100000" id="tb-custom-input"
                 class="tb-custom-input" placeholder="1 – 100000" />
          <button class="ww-ctrl" id="tb-custom-set">Set</button>
        </div>

        <div class="tb-actions">
          <button class="ww-ctrl" id="tb-undo">↩︎ Undo</button>
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

    tapEl.onclick = tap;
    stage.querySelector('#tb-undo').onclick = undo;
    resetEl.onclick = resetTap;
    stage.querySelectorAll('.tb-chip[data-target]').forEach(b => {
      b.onclick = () => { hideCustomRow(); setTarget(parseInt(b.dataset.target, 10)); };
    });
    customChip.onclick = toggleCustomRow;
    stage.querySelector('#tb-custom-set').onclick = applyCustom;
    customInput.onkeydown = (e) => { if (e.key === 'Enter') applyCustom(); };

    render();

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
    }
  }
};

// A target counts as "custom" when it isn't one of the preset chip values.
function isCustom(target) {
  return !TARGETS.some(t => t.value === target);
}
