// Word Wheel (Activity 11) — level data.
// Each level has a POOL of puzzles; one is picked at random each time the level
// is opened (never the same one twice in a row) so kids see fresh words and
// learn more. Difficulty ramps by length: L1-3 = 3-letter, L4-7 = 4-letter,
// L8-10 = 5-letter.
//
// A puzzle = { ring, words }. `ring` is one tile per character (duplicates ok);
// every word must be formable from it (a multiset-subset). Most puzzles use
// anagram / near-anagram pairs so they're guaranteed solvable.
//
// Picture (emoji) clues are shown ONLY on Level 1 (emojiClue: true) to help the
// youngest players; all other levels show just the length boxes. Every word
// still carries its English + Urdu (اردو) meaning, revealed when spelled right.
//
// Formability + lengths are checked by scripts/verify_wordwheel.mjs — run it
// after any edit to this file.

export const WORD_WHEEL_LEVELS = [
  // ---- L1: 3-letter, WITH emoji clues ----
  { level: 1, len: 3, emojiClue: true, puzzles: [
    { ring: 'CATSUN', words: [
      { en: 'CAT', ur: 'بلی',  emoji: '🐱' },
      { en: 'SUN', ur: 'سورج', emoji: '☀️' },
      { en: 'NUT', ur: 'گری',  emoji: '🥜' },
    ]},
    { ring: 'DOGBEA', words: [
      { en: 'DOG', ur: 'کتا',   emoji: '🐶' },
      { en: 'BED', ur: 'بستر',  emoji: '🛏️' },
      { en: 'BAG', ur: 'تھیلا', emoji: '🎒' },
    ]},
    { ring: 'CARHT', words: [
      { en: 'CAR', ur: 'گاڑی', emoji: '🚗' },
      { en: 'HAT', ur: 'ٹوپی', emoji: '🎩' },
      { en: 'RAT', ur: 'چوہا', emoji: '🐀' },
    ]},
    { ring: 'PENKYT', words: [
      { en: 'PEN', ur: 'قلم',  emoji: '🖊️' },
      { en: 'KEY', ur: 'چابی', emoji: '🔑' },
      { en: 'NET', ur: 'جال',  emoji: '🥅' },
    ]},
  ]},

  // ---- L2: 3-letter ----
  { level: 2, len: 3, puzzles: [
    { ring: 'CUPMAT', words: [
      { en: 'CUP', ur: 'کپ' }, { en: 'MAT', ur: 'چٹائی' }, { en: 'CAP', ur: 'ٹوپی' },
    ]},
    { ring: 'FANMUD', words: [
      { en: 'FAN', ur: 'پنکھا' }, { en: 'MUD', ur: 'کیچڑ' }, { en: 'MAN', ur: 'آدمی' },
    ]},
    { ring: 'JETLOG', words: [
      { en: 'JET', ur: 'جیٹ' }, { en: 'LOG', ur: 'لکڑی' }, { en: 'LEG', ur: 'ٹانگ' },
    ]},
  ]},

  // ---- L3: 3-letter ----
  { level: 3, len: 3, puzzles: [
    { ring: 'WEBTIN', words: [
      { en: 'WEB', ur: 'جالا' }, { en: 'TIN', ur: 'ٹین' }, { en: 'BIN', ur: 'ٹوکری' },
    ]},
    { ring: 'RUGBSA', words: [
      { en: 'RUG', ur: 'قالین' }, { en: 'BUS', ur: 'بس' }, { en: 'BAR', ur: 'سلاخ' },
    ]},
    { ring: 'HENTOW', words: [
      { en: 'HEN', ur: 'مرغی' }, { en: 'TEN', ur: 'دس' }, { en: 'NET', ur: 'جال' },
    ]},
  ]},

  // ---- L4: 4-letter ----
  { level: 4, len: 4, puzzles: [
    { ring: 'FISHD', words: [ { en: 'FISH', ur: 'مچھلی' }, { en: 'DISH', ur: 'برتن' } ]},
    { ring: 'CAKEL', words: [ { en: 'CAKE', ur: 'کیک' },  { en: 'LAKE', ur: 'جھیل' } ]},
    { ring: 'HANDS', words: [ { en: 'HAND', ur: 'ہاتھ' }, { en: 'SAND', ur: 'ریت' } ]},
  ]},

  // ---- L5: 4-letter ----
  { level: 5, len: 4, puzzles: [
    { ring: 'BALLE', words: [ { en: 'BALL', ur: 'گیند' }, { en: 'BELL', ur: 'گھنٹی' } ]},
    { ring: 'TREED', words: [ { en: 'TREE', ur: 'درخت' }, { en: 'DEER', ur: 'ہرن' } ]},
    { ring: 'HAIRN', words: [ { en: 'HAIR', ur: 'بال' },  { en: 'RAIN', ur: 'بارش' } ]},
  ]},

  // ---- L6: 4-letter ----
  { level: 6, len: 4, puzzles: [
    { ring: 'MILKS', words: [ { en: 'MILK', ur: 'دودھ' }, { en: 'SILK', ur: 'ریشم' } ]},
    { ring: 'DOORW', words: [ { en: 'DOOR', ur: 'دروازہ' }, { en: 'WOOD', ur: 'لکڑی' } ]},
    { ring: 'BOOKC', words: [ { en: 'BOOK', ur: 'کتاب' }, { en: 'COOK', ur: 'باورچی' } ]},
  ]},

  // ---- L7: 4-letter ----
  { level: 7, len: 4, puzzles: [
    { ring: 'LIONS', words: [ { en: 'LION', ur: 'شیر' },  { en: 'SOIL', ur: 'مٹی' } ]},
    { ring: 'GOATS', words: [ { en: 'GOAT', ur: 'بکری' }, { en: 'OATS', ur: 'جئی' } ]},
    { ring: 'SHOE',  words: [ { en: 'SHOE', ur: 'جوتا' }, { en: 'HOSE', ur: 'پائپ' } ]},
  ]},

  // ---- L8: 5-letter ----
  { level: 8, len: 5, puzzles: [
    { ring: 'HOUSEM', words: [ { en: 'HOUSE', ur: 'گھر' },   { en: 'MOUSE', ur: 'چوہا' } ]},
    { ring: 'PLANET', words: [ { en: 'PLANE', ur: 'ہوائی جہاز' }, { en: 'PLANT', ur: 'پودا' } ]},
    { ring: 'CHAIRN', words: [ { en: 'CHAIR', ur: 'کرسی' }, { en: 'CHAIN', ur: 'زنجیر' } ]},
  ]},

  // ---- L9: 5-letter ----
  { level: 9, len: 5, puzzles: [
    { ring: 'PLANTI', words: [ { en: 'PLANT', ur: 'پودا' },  { en: 'PAINT', ur: 'رنگ' } ]},
    { ring: 'HORSE',  words: [ { en: 'HORSE', ur: 'گھوڑا' }, { en: 'SHORE', ur: 'ساحل' } ]},
    { ring: 'BREAD',  words: [ { en: 'BREAD', ur: 'روٹی' },  { en: 'BEARD', ur: 'داڑھی' } ]},
  ]},

  // ---- L10: 5-letter (hardest — anagram pairs) ----
  { level: 10, len: 5, puzzles: [
    { ring: 'HEART', words: [ { en: 'HEART', ur: 'دل' },    { en: 'EARTH', ur: 'زمین' } ]},
    { ring: 'LEMON', words: [ { en: 'LEMON', ur: 'لیموں' }, { en: 'MELON', ur: 'خربوزہ' } ]},
    { ring: 'OCEAN', words: [ { en: 'OCEAN', ur: 'سمندر' }, { en: 'CANOE', ur: 'ڈونگی' } ]},
  ]},
];
