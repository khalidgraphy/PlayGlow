// Activity 1 (ABC Crush) sub-packs: each is a colored letter/number candy crush.
// Sub IDs use 11x scheme so they don't collide with the 1-10 main activity IDs.
// Display labels are "1.1", "1.2" etc; the underlying numeric id powers
// localStorage scoring + routing.

import { makeCrushLevel, COLOR_MAP } from './crush.js';

const sub = (sid, label, letters, name, ageHint, target, moves = 30) =>
  makeCrushLevel({
    id: 100 + sid,
    label,
    parentId: 1,
    name,
    emoji: '🍬',
    desc: `${letters.length} colors`,
    ageHint,
    guide: `Tap or drag two side-by-side colored tiles to swap them. Match 3+ same-color tiles in a row to clear. ${letters.length} colors in this pack: ${letters.join(', ')}.`,
    letters,
    target,
    moves
  });

const NUMBERS = ['0','1','2','3','4','5','6','7','8','9'];
const LETTERS_AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const NUMBERS_AND_LETTERS = [...NUMBERS, ...LETTERS_AZ];

export const CRUSH_SUBS = [
  sub(1, '1.1', ['A','B','C','D','E','F'],         'Pack A–F',     'Age 4+', 100, 30),
  sub(2, '1.2', ['G','H','I','J','K','L'],         'Pack G–L',     'Age 4+', 120, 30),
  sub(3, '1.3', ['M','N','O','P','Q','R'],         'Pack M–R',     'Age 5+', 140, 30),
  sub(4, '1.4', ['S','T','U','V','W','X','Y','Z'], 'Pack S–Z',     'Age 5+', 160, 30),
  sub(5, '1.5', NUMBERS,                            'Pack 0–9',     'Age 6+', 180, 32),
  sub(6, '1.6', NUMBERS_AND_LETTERS,                'A–Z + 0–9 ⚡', 'Age 8+', 320, 45)
];

// Lookup card colors for the sub-pack pickers — show the dominant hue
export function packCardColor(sub) {
  const first = sub.letters?.[0] || COLOR_MAP[Object.keys(COLOR_MAP)[0]].bg;
  return COLOR_MAP[first]?.bg || '#999';
}
