// Activity 9: Daily Word
// One word per day. Same calendar day always returns the same word (deterministic
// pick from days-since-epoch). Star earned once per calendar day.

import { Audio } from '../audio.js';
import { Storage } from '../storage.js';
import { escape } from '../engine.js';
import { dailyWord } from './dailywords.js';

const LAST_KEY = 'wordglow:daily_last_date';

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export const dailyWordLevel = {
  id: 10,
  name: 'Daily Word',
  emoji: '📅',
  desc: "Today's word in 3 languages",
  ageHint: 'All ages',
  guide: 'A new word each day with picture and pronunciation in English, Urdu, and Arabic. Earns one star per day, only once.',
  custom: true,

  start(stage, { onExit, showDone }) {
    const word = dailyWord(new Date());
    const today = todayISO();
    const last = localStorage.getItem(LAST_KEY);
    const isFirstToday = last !== today;

    stage.innerHTML = `
      <div style="text-align:center;font-size:11px;color:#888;font-weight:700;letter-spacing:1.5px">
        TODAY · ${today}
      </div>
      <div class="emoji-card">${word.emoji}</div>
      <div class="names-stack">
        <div class="name-row">
          <button class="speaker" data-speak="${escape(word.en)}" data-lang="en" aria-label="Play English">🔊</button>
          <span class="name-text">${escape(capitalise(word.en))}</span>
          <span class="lang-tag">EN</span>
        </div>
        ${(() => {
          const sec = Storage.getSecondaryLang();
          const tag = sec === 'ar' ? 'AR' : 'UR';
          return `
            <div class="name-row rtl" dir="rtl">
              <button class="speaker" data-speak="${escape(word[sec])}" data-lang="${sec}" aria-label="Play ${tag}">🔊</button>
              <span class="name-text">${escape(word[sec])}</span>
              <span class="lang-tag">${tag}</span>
            </div>
          `;
        })()}
      </div>
      <div style="text-align:center;color:#888;font-size:13px;margin-top:6px">
        ${isFirstToday ? '⭐ Tap each speaker, then come back tomorrow for a new word!'
                        : '✓ You already played today. Come back tomorrow!'}
      </div>
      <button class="button" id="dw-done">Done</button>
    `;

    stage.querySelectorAll('[data-speak]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        Audio.speak(btn.dataset.speak, btn.dataset.lang);
      };
    });

    // Auto-play English on entry
    setTimeout(() => Audio.speak(word.en, 'en'), 350);

    // Award star + mark today as played
    if (isFirstToday) {
      Storage.addStars(1);
      localStorage.setItem(LAST_KEY, today);
    }

    stage.querySelector('#dw-done').onclick = () => {
      showDone({
        title: isFirstToday ? '⭐ Word Learned!' : 'Nice!',
        stars: isFirstToday ? 1 : 0,
        summary: `Today's word: ${capitalise(word.en)} · Lifetime ⭐ ${Storage.getStars()}`,
        onAgain: () => dailyWordLevel.start(stage, { onExit, showDone }),
        onNext: () => onExit({ next: true }),
        onHome: () => onExit({ home: true })
      });
    };
  }
};

function capitalise(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
