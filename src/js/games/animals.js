// Activity 19: Animal Sounds (Learning).
//   • Learn: one animal at a time: photo, English + Urdu name, its real sound,
//     and a line saying how it sounds ("The cow says moo" / "گائے ماں ماں کرتی ہے").
//     Buttons: 🔊 Sound, English voice, Urdu voice. Next / Back.
//   • All animals: photo grid, seen ones ticked, tap to open.
//   • Guess: 8 rounds. The real sound plays, pick the animal from 4 photos.
//     After every pick the right animal is shown (name, Urdu, how it sounds).
//     First-try score gives 1 to 3 stars.
// Progress per profile in `playglow:animals:<profileId>` {seen[], best}.
//
// Sounds: real recordings from freesound.org, all CC0 (public domain, no
// attribution needed), trimmed to the loudest 2 to 4 seconds, mono 48 kbps:
//   cat       freesound.org/s/110011  by tuberatanka
//   dog       freesound.org/s/386766  by ken788
//   cow       freesound.org/s/59245   by Zozzy
//   horse     freesound.org/s/521246  by poodaddy69
//   sheep     freesound.org/s/710300  by michaelperfect
//   goat      freesound.org/s/683259  by saha213131
//   lion      freesound.org/s/69571   by Bidone
//   tiger     freesound.org/s/263115  by lauramellis
//   elephant  freesound.org/s/819668  by ikbenraar
//   monkey    freesound.org/s/67361   by Bidone
//   parrot    freesound.org/s/187928  by castle81
//   owl       freesound.org/s/398734  by Anthousai
//   bee       freesound.org/s/481647  by JonCon_Library
//   snake     freesound.org/s/540162  by schreibsel
//   peacock   freesound.org/s/646948  by Lexana.uk
//   camel     freesound.org/s/385912  by Pól
//   frog      freesound.org/s/391520  by Kamix0
//   duck      freesound.org/s/607226  by D4XX
//   bird      freesound.org/s/182502  by swiftoid
// Replacing a sound file: bump SOUND_VER so cached copies refresh.
// New Urdu lines need a Devanagari entry in urduVoice.js (Hindi voice fallback).

import { Audio } from '../audio.js';
import { Storage } from '../storage.js';

const SOUND_VER = 1;
const QUIZ_LEN = 8;

// slug, English name, Urdu name, emoji, sound word, English line, Urdu line
const ANIMALS = [
  { k: 'cat',      en: 'Cat',      ur: 'بلی',   emoji: '🐱', says: 'Meow!',        line: 'The cat says meow.',               urLine: 'بلی میاؤں میاؤں کرتی ہے' },
  { k: 'dog',      en: 'Dog',      ur: 'کتا',   emoji: '🐶', says: 'Woof woof!',   line: 'The dog barks, woof woof.',        urLine: 'کتا بھوں بھوں کرتا ہے' },
  { k: 'cow',      en: 'Cow',      ur: 'گائے',  emoji: '🐄', says: 'Moo!',         line: 'The cow says moo.',                urLine: 'گائے ماں ماں کرتی ہے' },
  { k: 'horse',    en: 'Horse',    ur: 'گھوڑا', emoji: '🐴', says: 'Neigh!',       line: 'The horse neighs.',                urLine: 'گھوڑا ہنہناتا ہے' },
  { k: 'sheep',    en: 'Sheep',    ur: 'بھیڑ',  emoji: '🐑', says: 'Baa!',         line: 'The sheep says baa.',              urLine: 'بھیڑ میں میں کرتی ہے' },
  { k: 'goat',     en: 'Goat',     ur: 'بکری',  emoji: '🐐', says: 'Maa!',         line: 'The goat bleats, maa.',            urLine: 'بکری ممیاتی ہے' },
  { k: 'lion',     en: 'Lion',     ur: 'شیر',   emoji: '🦁', says: 'Roar!',        line: 'The lion roars.',                  urLine: 'شیر دھاڑتا ہے' },
  { k: 'tiger',    en: 'Tiger',    ur: 'باگھ',  emoji: '🐯', says: 'Grrr!',        line: 'The tiger growls and roars.',      urLine: 'باگھ غراتا ہے' },
  { k: 'elephant', en: 'Elephant', ur: 'ہاتھی', emoji: '🐘', says: 'Pawoo!',       line: 'The elephant trumpets.',           urLine: 'ہاتھی چنگھاڑتا ہے' },
  { k: 'monkey',   en: 'Monkey',   ur: 'بندر',  emoji: '🐵', says: 'Ooh ooh aah!', line: 'The monkey chatters, ooh ooh aah.', urLine: 'بندر خوں خوں کرتا ہے' },
  { k: 'parrot',   en: 'Parrot',   ur: 'طوطا',  emoji: '🦜', says: 'Squawk!',      line: 'The parrot squawks.',              urLine: 'طوطا ٹیں ٹیں کرتا ہے' },
  { k: 'owl',      en: 'Owl',      ur: 'الو',   emoji: '🦉', says: 'Hoo hoo!',     line: 'The owl hoots, hoo hoo.',          urLine: 'الو ہو ہو کرتا ہے' },
  { k: 'bee',      en: 'Bee',      ur: 'مکھی',  emoji: '🐝', says: 'Buzz!',        line: 'The bee buzzes.',                  urLine: 'مکھی بھنبھناتی ہے' },
  { k: 'snake',    en: 'Snake',    ur: 'سانپ',  emoji: '🐍', says: 'Hiss!',        line: 'The snake hisses.',                urLine: 'سانپ پھنکارتا ہے' },
  { k: 'peacock',  en: 'Peacock',  ur: 'مور',   emoji: '🦚', says: 'Mee-awe!',     line: 'The peacock gives a loud call.',   urLine: 'مور کوکتا ہے' },
  { k: 'camel',    en: 'Camel',    ur: 'اونٹ',  emoji: '🐪', says: 'Grumble!',     line: 'The camel grunts and groans.',     urLine: 'اونٹ بلبلاتا ہے' },
  { k: 'frog',     en: 'Frog',     ur: 'مینڈک', emoji: '🐸', says: 'Ribbit!',      line: 'The frog croaks, ribbit.',         urLine: 'مینڈک ٹر ٹر کرتا ہے' },
  { k: 'duck',     en: 'Duck',     ur: 'بطخ',   emoji: '🦆', says: 'Quack!',       line: 'The duck says quack.',             urLine: 'بطخ قیں قیں کرتی ہے' },
  { k: 'bird',     en: 'Bird',     ur: 'پرندہ', emoji: '🐦', says: 'Tweet tweet!', line: 'The bird sings, tweet tweet.',     urLine: 'پرندہ چہچہاتا ہے' },
];

// Animals that sound alike are never offered together in Guess.
const LOOKALIKE = { lion: 'tiger', tiger: 'lion', sheep: 'goat', goat: 'sheep' };

function esc(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const photo = a => `/words/${a.k}.jpg`;
const soundUrl = a => `/sounds/animals/${a.k}.mp3?v=${SOUND_VER}`;

// One shared <audio> element: once a tap has started it, iPhones let the same
// element play again later without a new tap (next Guess round).
let player = null;
function stopSound() {
  if (player) { try { player.pause(); } catch (e) {} }
}
function playSound(a, onEnd) {
  try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
  if (!player) { player = new window.Audio(); player.preload = 'auto'; }
  stopSound();
  player.onended = onEnd || null;
  player.src = soundUrl(a);
  try {
    const p = player.play();
    if (p && p.catch) p.catch(() => { if (onEnd) onEnd(); });
  } catch (e) { if (onEnd) onEnd(); }
}
function sayEnglish(a) { stopSound(); Audio.speak(`${a.en}. ${a.line}`, 'en'); }
// The Urdu line already starts with the name; spoken whole so it matches the
// hand-spelled Hindi-voice line in urduVoice.js.
function sayUrdu(a) { stopSound(); Audio.speak(a.urLine, 'ur'); }

export const animalSounds = {
  id: 19,
  name: 'Animal Sounds',
  emoji: '🦁',
  desc: 'Hear 19 animals, then guess who is talking',
  ageHint: 'Age 3+',
  custom: true,
  guide: 'Learn: see each animal, hear its real sound, its name in English and Urdu, and how it sounds. Guess: listen to a sound and tap the animal that makes it. The right animal is shown after every guess.',

  start(stage) {
    const key = () => `playglow:animals:${Storage.getActiveProfile()?.id || 'anon'}`;
    function load() {
      let s;
      try { s = JSON.parse(localStorage.getItem(key()) || '{}') || {}; } catch (e) { s = {}; }
      if (!Array.isArray(s.seen)) s.seen = [];
      s.seen = s.seen.filter(k => ANIMALS.some(a => a.k === k));
      s.best = s.best || 0;
      return s;
    }
    function save() { try { localStorage.setItem(key(), JSON.stringify(s)); } catch (e) {} }
    let s = load();
    let pos = 0;

    stage.innerHTML = `
      <div class="an-root">
        <div class="ab-progress-row">
          <span class="ab-progress-text" id="an-ptext"></span>
          <span class="ab-streak" id="an-best"></span>
        </div>
        <div class="ab-bar"><div class="ab-bar-fill" id="an-bar"></div></div>
        <div class="ab-tabs">
          <button class="ab-tab" data-view="learn">📖 Learn</button>
          <button class="ab-tab" data-view="grid">🐾 All animals</button>
          <button class="ab-tab" data-view="quiz">🎧 Guess</button>
        </div>
        <div class="ab-body" id="an-body"></div>
      </div>`;
    const root = stage.querySelector('.an-root');
    const body = stage.querySelector('#an-body');
    stage.querySelectorAll('.ab-tab').forEach(b => { b.onclick = () => show(b.dataset.view); });
    show('learn');

    function alive() { return document.body.contains(root); }

    function renderTop() {
      stage.querySelector('#an-ptext').textContent = `🐾 ${s.seen.length} / ${ANIMALS.length} animals met`;
      stage.querySelector('#an-best').textContent = s.best ? `🏆 Best ${s.best}/${QUIZ_LEN}` : '';
      stage.querySelector('#an-bar').style.width = `${Math.round(100 * s.seen.length / ANIMALS.length)}%`;
    }

    function show(v, first) {
      stopSound();
      stage.querySelectorAll('.ab-tab').forEach(b => b.classList.toggle('active', b.dataset.view === v));
      renderTop();
      if (v === 'learn') renderCard(!first);
      else if (v === 'grid') renderGrid();
      else renderQuiz();
    }

    function img(a, cls) {
      return `<img class="${cls}" src="${photo(a)}" alt="${esc(a.en)}" loading="lazy"
        onerror="this.outerHTML='<span class=&quot;${cls} an-emoji&quot;>${a.emoji}</span>'">`;
    }

    // Learn card. autoPlay only after a tap (browsers block sound before one).
    function renderCard(autoPlay) {
      const a = ANIMALS[pos];
      const seen = s.seen.indexOf(a.k) >= 0;
      body.innerHTML = `
        <div class="ab-card an-card${seen ? ' learned' : ''}">
          <div class="ab-count">${pos + 1} / ${ANIMALS.length}${seen ? ' · ✓ met' : ''}</div>
          <button class="an-photo-btn" id="an-photo" aria-label="Play the ${esc(a.en)} sound">${img(a, 'an-photo')}</button>
          <div class="an-names">
            <span class="an-en">${esc(a.en)}</span>
            <span class="an-ur" lang="ur" dir="rtl">${a.ur}</span>
          </div>
          <div class="an-says">“${esc(a.says)}”</div>
          <div class="an-line">${esc(a.line)}</div>
          <div class="an-line an-urline" lang="ur" dir="rtl">${a.urLine}</div>
          <div class="an-btns">
            <button class="ab-listen an-sound" id="an-sound">🔊 Sound</button>
            <button class="ab-listen an-voice" id="an-en">🗣 English</button>
            <button class="ab-listen an-voice" id="an-urv">🗣 اردو</button>
          </div>
        </div>
        <div class="ab-nav">
          <button class="ww-ctrl" id="an-prev" ${pos === 0 ? 'disabled' : ''}>◀ Back</button>
          <button class="ww-ctrl ab-next" id="an-next">${pos === ANIMALS.length - 1 ? 'Guess 🎧' : 'Next ▶'}</button>
        </div>`;
      const meet = () => {
        if (s.seen.indexOf(a.k) < 0) { s.seen.push(a.k); save(); renderTop(); }
      };
      body.querySelector('#an-sound').onclick = () => { meet(); playSound(a); };
      body.querySelector('#an-photo').onclick = () => { meet(); playSound(a); };
      body.querySelector('#an-en').onclick = () => { meet(); sayEnglish(a); };
      body.querySelector('#an-urv').onclick = () => { meet(); sayUrdu(a); };
      body.querySelector('#an-prev').onclick = () => { if (pos > 0) { pos -= 1; renderCard(true); } };
      body.querySelector('#an-next').onclick = () => {
        meet();
        if (pos < ANIMALS.length - 1) { pos += 1; renderCard(true); } else show('quiz');
      };
      // Sound first, then the English name and line.
      if (autoPlay) { meet(); playSound(a, () => { if (alive() && ANIMALS[pos] === a) Audio.speak(`${a.en}. ${a.line}`, 'en'); }); }
    }

    function renderGrid() {
      body.innerHTML = `<div class="an-grid">${ANIMALS.map((a, i) => `
        <button class="an-cell${s.seen.indexOf(a.k) >= 0 ? ' learned' : ''}" data-i="${i}">
          ${img(a, 'an-cell-img')}
          <span class="an-cell-name">${esc(a.en)}</span>
          <span class="an-cell-ur" lang="ur">${a.ur}</span>
        </button>`).join('')}</div>`;
      body.querySelectorAll('.an-cell').forEach(b => {
        b.onclick = () => {
          pos = parseInt(b.dataset.i, 10);
          stage.querySelectorAll('.ab-tab').forEach(t => t.classList.toggle('active', t.dataset.view === 'learn'));
          renderCard(true);
        };
      });
    }

    function renderQuiz() {
      const order = shuffle(ANIMALS).slice(0, QUIZ_LEN);
      let qi = 0, score = 0;
      body.innerHTML = `
        <div class="ab-card an-start">
          <div class="ab-done-emoji">🎧</div>
          <div class="ab-roman">Who makes this sound?</div>
          <div class="ab-hint">Listen to ${QUIZ_LEN} animal sounds. Tap the animal you hear.</div>
          <div class="ab-nav"><button class="ww-ctrl ab-next" id="an-go">▶ Start</button></div>
        </div>`;
      body.querySelector('#an-go').onclick = ask;

      function ask() {
        if (!alive()) return;
        if (qi >= order.length) return finish();
        const ans = order[qi];
        const others = shuffle(ANIMALS.filter(a => a !== ans && LOOKALIKE[ans.k] !== a.k)).slice(0, 3);
        const opts = shuffle([ans].concat(others));
        body.innerHTML = `
          <div class="ab-quiz">
            <div class="ab-count">Sound ${qi + 1} / ${order.length} · ⭐ ${score}</div>
            <div class="ab-q">Who makes this sound?</div>
            <button class="ab-listen an-play" id="an-play">🔊 Play the sound</button>
            <div class="an-opts">${opts.map(a => `
              <button class="an-opt" data-k="${a.k}">${img(a, 'an-opt-img')}<span class="an-opt-name">${esc(a.en)}</span></button>`).join('')}</div>
            <div class="an-reveal" id="an-reveal"></div>
          </div>`;
        const play = () => playSound(ans);
        body.querySelector('#an-play').onclick = play;
        play();
        let done = false;
        body.querySelectorAll('.an-opt').forEach(b => {
          b.onclick = () => {
            if (done) return;
            done = true;
            const right = b.dataset.k === ans.k;
            body.querySelectorAll('.an-opt').forEach(o => {
              o.disabled = true;
              if (o.dataset.k === ans.k) o.classList.add('right');
            });
            if (right) { score += 1; Audio.correct(); } else { b.classList.add('wrong'); Audio.wrong(); }
            const rv = body.querySelector('#an-reveal');
            rv.className = 'an-reveal ' + (right ? 'good' : 'bad');
            rv.innerHTML = `
              <div class="an-rv-title">${right ? '✅ Yes! It is the' : '❌ Not quite. It is the'} ${esc(ans.en)}</div>
              <div class="an-rv-row">${img(ans, 'an-rv-img')}
                <div>
                  <div class="an-rv-ur" lang="ur" dir="rtl">${ans.ur}</div>
                  <div class="an-rv-says">“${esc(ans.says)}” ${esc(ans.line)}</div>
                  <div class="an-rv-urline" lang="ur" dir="rtl">${ans.urLine}</div>
                </div>
              </div>
              <div class="an-btns">
                <button class="ab-listen an-sound" id="an-rv-sound">🔊 Sound</button>
                <button class="ab-listen an-voice" id="an-rv-ur">🗣 اردو</button>
                <button class="ww-ctrl ab-next" id="an-rv-next">${qi + 1 < order.length ? 'Next ▶' : 'Finish ✓'}</button>
              </div>`;
            rv.querySelector('#an-rv-sound').onclick = () => playSound(ans);
            rv.querySelector('#an-rv-ur').onclick = () => sayUrdu(ans);
            rv.querySelector('#an-rv-next').onclick = () => { qi += 1; ask(); };
            setTimeout(() => { if (alive()) Audio.speak(`${right ? 'Yes! It is the ' : 'It is the '}${ans.en}. ${ans.line}`, 'en'); }, 450);
            if (s.seen.indexOf(ans.k) < 0) { s.seen.push(ans.k); save(); renderTop(); }
            try { rv.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
          };
        });
      }

      function finish() {
        stopSound();
        const stars = score >= QUIZ_LEN ? 3 : score >= QUIZ_LEN - 2 ? 2 : score >= QUIZ_LEN / 2 ? 1 : 0;
        if (stars) { Audio.win(); Storage.addStars(stars); }
        if (score > s.best) { s.best = score; save(); }
        renderTop();
        body.innerHTML = `
          <div class="ab-card ab-done">
            <div class="ab-done-emoji">${'⭐'.repeat(stars) || '💪'}</div>
            <div class="ab-roman">${score} / ${QUIZ_LEN} right</div>
            <div class="ab-hint">${stars >= 2 ? 'Super ears! You know your animals.' : 'Good try! Learn the sounds and play again.'}</div>
            <div class="ab-nav">
              <button class="ww-ctrl ab-next" id="an-again">🎧 Again</button>
              <button class="ww-ctrl" id="an-learn">📖 Learn</button>
            </div>
          </div>`;
        body.querySelector('#an-again').onclick = () => renderQuiz();
        body.querySelector('#an-learn').onclick = () => show('learn');
      }
    }
  }
};

export const ANIMAL_SOUND_LIST = ANIMALS;
