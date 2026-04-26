// Level 1 (ABC Crush) sub-levels: each is a colored letter-pack candy crush.
// Sub IDs use 11x scheme so they don't collide with the 1-6 main level IDs.
// Display labels are "1.1", "1.2" etc; the underlying numeric id powers
// localStorage scoring + routing.

import { makeCrushLevel, COLOR_MAP } from './crush.js';

const sub = (sid, label, letters, name, ageHint, target) =>
  makeCrushLevel({
    id: 100 + sid,
    label,                    // shown as "1.1" badge
    parentId: 1,
    name,
    emoji: '🍬',
    desc: letters.join(' ') + ' colors',
    ageHint,
    guide: `Tap two side-by-side colored letters to swap them. Make 3+ same-color letters in a row to clear. ${letters.length} colors in this pack: ${letters.join(', ')}.`,
    letters,
    target,
    moves: 30
  });

export const CRUSH_SUBS = [
  sub(1, '1.1', ['A','B','C','D','E','F'],         'Pack A–F', 'Age 4+', 100),
  sub(2, '1.2', ['G','H','I','J','K','L'],         'Pack G–L', 'Age 4+', 120),
  sub(3, '1.3', ['M','N','O','P','Q','R'],         'Pack M–R', 'Age 5+', 140),
  sub(4, '1.4', ['S','T','U','V','W','X','Y','Z'], 'Pack S–Z', 'Age 5+', 160)
];

// Lookup card colors for the sub-pack pickers — show the dominant hue
export function packCardColor(sub) {
  const first = sub.letters?.[0] || COLOR_MAP[Object.keys(COLOR_MAP)[0]].bg;
  return COLOR_MAP[first]?.bg || '#999';
}
