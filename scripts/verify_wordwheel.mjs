// Verifies every Word Wheel target word is formable from its puzzle's ring
// (multiset-subset check) and matches the level's length. Exits non-zero on any
// failure. Run before building.
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

let failures = 0, puzzles = 0, words = 0;
for (const lvl of WORD_WHEEL_LEVELS) {
  if (!lvl.puzzles?.length) { failures++; console.error(`❌ L${lvl.level} has no puzzles`); continue; }
  for (const p of lvl.puzzles) {
    puzzles++;
    const ringM = multiset(p.ring);
    if (p.ring.length > 7) console.warn(`⚠️  L${lvl.level} ring "${p.ring}" has ${p.ring.length} tiles (>7 may crowd the wheel)`);
    for (const w of p.words) {
      words++;
      const okLen = w.en.length === lvl.len;
      const okForm = formable(w.en, ringM);
      if (lvl.level === 1 && !w.emoji) { failures++; console.error(`❌ L1 "${w.en}" missing emoji clue`); }
      if (lvl.level !== 1 && w.emoji) { failures++; console.error(`❌ L${lvl.level} "${w.en}" should NOT have an emoji clue`); }
      if (!okLen || !okForm) {
        failures++;
        console.error(`❌ L${lvl.level} "${w.en}" — ${!okLen ? `len ${w.en.length}!=${lvl.len} ` : ''}${!okForm ? 'not formable from ' + p.ring : ''}`);
      }
    }
  }
}
if (failures) { console.error(`\n${failures} problem(s) found.`); process.exit(1); }
console.log(`✅ ${WORD_WHEEL_LEVELS.length} levels, ${puzzles} puzzles, ${words} words — all valid.`);
