// Verifies every Word Wheel target word is formable from its level's ring
// (multiset-subset check). Exits non-zero on any failure. Run before building.
import { WORD_WHEEL_LEVELS } from '../src/js/games/wordwheel_data.js';

function multiset(str) {
  const m = {};
  for (const ch of str.toUpperCase()) if (/[A-Z]/.test(ch)) m[ch] = (m[ch] || 0) + 1;
  return m;
}
function formable(word, ringM) {
  const w = multiset(word);
  return Object.entries(w).every(([ch, n]) => (ringM[ch] || 0) >= n);
}

let failures = 0;
for (const lvl of WORD_WHEEL_LEVELS) {
  const ringM = multiset(lvl.ring);
  const tiles = lvl.ring.length;
  for (const w of lvl.words) {
    const okLen = w.en.length === lvl.len;
    const okForm = formable(w.en, ringM);
    if (!okLen || !okForm) {
      failures++;
      console.error(`❌ L${lvl.level} "${w.en}" — ${!okLen ? `len ${w.en.length}!=${lvl.len} ` : ''}${!okForm ? 'not formable from ' + lvl.ring : ''}`);
    }
  }
  if (tiles > 7) console.warn(`⚠️  L${lvl.level} ring has ${tiles} tiles (>7 may crowd the wheel)`);
}
if (failures) { console.error(`\n${failures} problem(s) found.`); process.exit(1); }
console.log(`✅ All ${WORD_WHEEL_LEVELS.length} levels valid — every word formable, lengths correct.`);
