// Distractor letter pools for the "first letter" game.
// Capitals for English (kid-friendly), full forms for Arabic/Urdu.

export const ALPHABETS = {
  en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  ar: 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'.split(''),
  ur: 'ابپتٹثجچحخددذرڑزژسشصضطظعغفقکگلمنوہھءیے'.split('')
};

export function firstLetter(word, lang) {
  if (!word) return '';
  if (lang === 'en') return word[0].toUpperCase();
  return word[0]; // ar/ur: take the first codepoint as-is (RTL display handled by CSS)
}

// Build a 4-option set: 1 correct + 3 random distractors from the same alphabet
export function letterChoices(correct, lang, n = 4) {
  const pool = ALPHABETS[lang].filter(L => L !== correct);
  const picks = new Set();
  while (picks.size < n - 1) {
    picks.add(pool[Math.floor(Math.random() * pool.length)]);
  }
  const arr = [correct, ...picks];
  return shuffle(arr);
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
