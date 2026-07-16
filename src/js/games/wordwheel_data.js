// Word Wheel (Activity 11) — level data.
// Each level: a single letter `ring` (one tile per character, duplicates allowed)
// and the target `words`, all formable from that ring. Difficulty ramps by length:
//   L1–3 = 3-letter, L4–7 = 4-letter, L8–10 = 5-letter.
// Every word carries English + Urdu (اردو) meaning + an emoji picture clue.
// Formability (each word is a multiset-subset of its ring) is checked by
// scripts/verify_wordwheel.mjs — run it after any edit to this file.

export const WORD_WHEEL_LEVELS = [
  // ---- 3-letter words ----
  { level: 1, len: 3, ring: 'CATSUN', words: [
    { en: 'CAT', ur: 'بلی',  emoji: '🐱' },
    { en: 'SUN', ur: 'سورج', emoji: '☀️' },
    { en: 'NUT', ur: 'گری',  emoji: '🥜' },
  ]},
  { level: 2, len: 3, ring: 'DOGBEA', words: [
    { en: 'DOG', ur: 'کتا',   emoji: '🐶' },
    { en: 'BED', ur: 'بستر',  emoji: '🛏️' },
    { en: 'BAG', ur: 'تھیلا', emoji: '🎒' },
  ]},
  { level: 3, len: 3, ring: 'CARHT', words: [
    { en: 'CAR', ur: 'گاڑی',  emoji: '🚗' },
    { en: 'HAT', ur: 'ٹوپی',  emoji: '🎩' },
    { en: 'RAT', ur: 'چوہا',  emoji: '🐀' },
  ]},

  // ---- 4-letter words ----
  { level: 4, len: 4, ring: 'FISHD', words: [
    { en: 'FISH', ur: 'مچھلی', emoji: '🐟' },
    { en: 'DISH', ur: 'برتن',  emoji: '🍽️' },
  ]},
  { level: 5, len: 4, ring: 'CAKEL', words: [
    { en: 'CAKE', ur: 'کیک',  emoji: '🍰' },
    { en: 'LAKE', ur: 'جھیل', emoji: '🏞️' },
  ]},
  { level: 6, len: 4, ring: 'BALLE', words: [
    { en: 'BALL', ur: 'گیند',  emoji: '⚽' },
    { en: 'BELL', ur: 'گھنٹی', emoji: '🔔' },
  ]},
  { level: 7, len: 4, ring: 'TREED', words: [
    { en: 'TREE', ur: 'درخت', emoji: '🌳' },
    { en: 'DEER', ur: 'ہرن',  emoji: '🦌' },
  ]},

  // ---- 5-letter words ----
  { level: 8, len: 5, ring: 'HOUSEM', words: [
    { en: 'HOUSE', ur: 'گھر',  emoji: '🏠' },
    { en: 'MOUSE', ur: 'چوہا', emoji: '🐭' },
  ]},
  { level: 9, len: 5, ring: 'PLANTI', words: [
    { en: 'PLANT', ur: 'پودا', emoji: '🌱' },
    { en: 'PAINT', ur: 'رنگ',  emoji: '🎨' },
  ]},
  { level: 10, len: 5, ring: 'BREAD', words: [
    { en: 'BREAD', ur: 'روٹی',   emoji: '🍞' },
    { en: 'BEARD', ur: 'داڑھی', emoji: '🧔' },
  ]},
];
