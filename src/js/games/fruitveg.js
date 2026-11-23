// Activity 20: Fruits & Vegetables (Learning). English first, Urdu second.
//   • Learn: one card at a time: big photo, English name, Urdu name, a short
//     English line (colour, taste, how we eat it). 🔊 English / 🗣 اردو.
//     Filter chips: All / Fruits / Vegetables.
//   • All: photo grid with English + Urdu names, seen ones ticked.
//   • Find it: "Find the mango". Tap the right photo out of 4. A wrong tap
//     says "Try again" and greys that photo out; first-try answers score.
// Progress per profile in `playglow:fv:<profileId>` {seen[], best}.
//
// Photos: public/fv/<slug>.jpg (max 360px). 25 reuse public/words photos; the
// rest are Wikimedia Commons photos (lead image of the English Wikipedia
// article, or a Commons search pick: Coconut halves "Kokosnuss-Coconut.jpg",
// "Yellow Corn on the Cob (35115370841).jpg", "DriedDates.JPG", "Cut Fig 01.jpg",
// "Garlic bulbs and cloves.jpg", "Lettuce in a stack.jpg", "Papaya cut half.jpg",
// "White-Peaches-Bunch.jpg", "Fresh Spinach leaves.jpg",
// "Slice of Watermelon from Wilson Farm, Lexington MA.jpg", "Okra or Derere.jpg",
// "Zingiber officinale fresh rhizome.JPG",
// "Kiwi (Actinidia chinensis) 1 Luc Viatour.jpg", "Mulberry fruit (1).jpg",
// "Bitter gourd at Hyderabad market.jpg", "Bunches of coriander leaves.jpg").
// New Urdu words need a Devanagari entry in urduVoice.js.

import { Audio } from '../audio.js';
import { Storage } from '../storage.js';

const QUIZ_LEN = 10;

// k = photo slug, t = 'f' fruit / 'v' vegetable
const ITEMS = [
  { k: 'apple',       t: 'f', en: 'Apple',        ur: 'سیب',       line: 'Apples are red or green, sweet and crunchy.' },
  { k: 'banana',      t: 'f', en: 'Banana',       ur: 'کیلا',      line: 'Peel the yellow skin and eat the soft banana inside.' },
  { k: 'orange',      t: 'f', en: 'Orange',       ur: 'مالٹا',     line: 'Oranges are juicy and full of vitamin C.' },
  { k: 'grapes',      t: 'f', en: 'Grapes',       ur: 'انگور',     line: 'Grapes grow in bunches. They can be green or purple.' },
  { k: 'mango',       t: 'f', en: 'Mango',        ur: 'آم',        line: 'The mango is sweet and yellow inside. It is the king of fruits.' },
  { k: 'watermelon',  t: 'f', en: 'Watermelon',   ur: 'تربوز',     line: 'Green outside, red inside, with black seeds. Great in summer.' },
  { k: 'strawberry',  t: 'f', en: 'Strawberry',   ur: 'اسٹرابیری', line: 'A small red fruit with tiny seeds on the outside.' },
  { k: 'pineapple',   t: 'f', en: 'Pineapple',    ur: 'انناس',     line: 'Spiky outside, sweet and yellow inside.' },
  { k: 'cherry',      t: 'f', en: 'Cherry',       ur: 'چیری',      line: 'Cherries are small, round and red, with a stone inside.' },
  { k: 'pear',        t: 'f', en: 'Pear',         ur: 'ناشپاتی',   line: 'A pear is thin at the top and round at the bottom.' },
  { k: 'lemon',       t: 'f', en: 'Lemon',        ur: 'لیموں',     line: 'Lemons are yellow and very sour.' },
  { k: 'peach',       t: 'f', en: 'Peach',        ur: 'آڑو',       line: 'A peach has soft, fuzzy skin and a big stone inside.' },
  { k: 'pomegranate', t: 'f', en: 'Pomegranate',  ur: 'انار',      line: 'Inside a pomegranate are many shiny red seeds.' },
  { k: 'dates',       t: 'f', en: 'Dates',        ur: 'کھجور',     line: 'Dates are brown, soft and very sweet. They grow on palm trees.' },
  { k: 'papaya',      t: 'f', en: 'Papaya',       ur: 'پپیتا',     line: 'Papaya is orange inside with black seeds in the middle.' },
  { k: 'fig',         t: 'f', en: 'Fig',          ur: 'انجیر',     line: 'A fig is soft and sweet, with tiny seeds inside.' },
  { k: 'coconut',     t: 'f', en: 'Coconut',      ur: 'ناریل',     line: 'A coconut is hard and brown outside, white inside.' },
  { k: 'melon',       t: 'f', en: 'Melon',        ur: 'خربوزہ',    line: 'A melon is sweet and juicy, orange or green inside.' },
  { k: 'guava',       t: 'f', en: 'Guava',        ur: 'امرود',     line: 'Guava is green outside and white or pink inside.' },
  { k: 'apricot',     t: 'f', en: 'Apricot',      ur: 'خوبانی',    line: 'A small orange fruit, soft and sweet.' },
  { k: 'plum',        t: 'f', en: 'Plum',         ur: 'آلو بخارا', line: 'Plums are round and purple or red, with a stone inside.' },
  { k: 'lychee',      t: 'f', en: 'Lychee',       ur: 'لیچی',      line: 'Peel the bumpy red skin to find sweet white fruit.' },
  { k: 'kiwi',        t: 'f', en: 'Kiwi',         ur: 'کیوی',      line: 'Brown and hairy outside, bright green inside.' },
  { k: 'mulberry',    t: 'f', en: 'Mulberry',     ur: 'شہتوت',     line: 'Mulberries are small dark berries that grow on trees.' },

  { k: 'carrot',      t: 'v', en: 'Carrot',       ur: 'گاجر',      line: 'Carrots are orange and crunchy. They grow under the ground.' },
  { k: 'potato',      t: 'v', en: 'Potato',       ur: 'آلو',       line: 'Potatoes grow under the ground. We make chips from them.' },
  { k: 'tomato',      t: 'v', en: 'Tomato',       ur: 'ٹماٹر',     line: 'Tomatoes are red and juicy. We put them in salad and curry.' },
  { k: 'onion',       t: 'v', en: 'Onion',        ur: 'پیاز',      line: 'Cutting an onion can make your eyes water.' },
  { k: 'cucumber',    t: 'v', en: 'Cucumber',     ur: 'کھیرا',     line: 'A long green vegetable, cool and crunchy.' },
  { k: 'broccoli',    t: 'v', en: 'Broccoli',     ur: 'بروکلی',    line: 'Broccoli looks like a little green tree.' },
  { k: 'corn',        t: 'v', en: 'Corn',         ur: 'مکئی',      line: 'Corn has many yellow seeds on a cob.' },
  { k: 'lettuce',     t: 'v', en: 'Lettuce',      ur: 'سلاد پتہ',  line: 'Lettuce has big green leaves. We eat it in salad.' },
  { k: 'eggplant',    t: 'v', en: 'Eggplant',     ur: 'بینگن',     line: 'An eggplant is shiny and purple.' },
  { k: 'garlic',      t: 'v', en: 'Garlic',       ur: 'لہسن',      line: 'Garlic is white and has a strong smell. It adds taste to food.' },
  { k: 'pepper',      t: 'v', en: 'Bell pepper',  ur: 'شملہ مرچ',  line: 'Bell peppers can be green, red or yellow. They are not hot.' },
  { k: 'chili',       t: 'v', en: 'Chili',        ur: 'مرچ',       line: 'Chilies are small and very hot. Be careful!' },
  { k: 'mushroom',    t: 'v', en: 'Mushroom',     ur: 'کھمبی',     line: 'A mushroom looks like a little umbrella.' },
  { k: 'ginger',      t: 'v', en: 'Ginger',       ur: 'ادرک',      line: 'Ginger is a root with a strong, warm taste.' },
  { k: 'spinach',     t: 'v', en: 'Spinach',      ur: 'پالک',      line: 'Spinach has soft green leaves that make you strong.' },
  { k: 'peas',        t: 'v', en: 'Peas',         ur: 'مٹر',       line: 'Small round green peas grow inside a pod.' },
  { k: 'okra',        t: 'v', en: 'Okra',         ur: 'بھنڈی',     line: 'Okra is long, green and thin, like a finger.' },
  { k: 'cabbage',     t: 'v', en: 'Cabbage',      ur: 'بند گوبھی', line: 'A cabbage is a round ball of green leaves.' },
  { k: 'cauliflower', t: 'v', en: 'Cauliflower',  ur: 'پھول گوبھی', line: 'A cauliflower is white, like a big flower.' },
  { k: 'radish',      t: 'v', en: 'Radish',       ur: 'مولی',      line: 'A radish is crunchy and a little bit spicy.' },
  { k: 'turnip',      t: 'v', en: 'Turnip',       ur: 'شلجم',      line: 'A turnip is round, white and purple. It grows under the ground.' },
  { k: 'beetroot',    t: 'v', en: 'Beetroot',     ur: 'چقندر',     line: 'Beetroot is dark red inside and colours your fingers.' },
  { k: 'pumpkin',     t: 'v', en: 'Pumpkin',      ur: 'کدو',       line: 'A pumpkin is big, round and orange.' },
  { k: 'sweetpotato', t: 'v', en: 'Sweet potato', ur: 'شکر قندی',  line: 'A sweet potato is orange inside and tastes sweet.' },
  { k: 'bittergourd', t: 'v', en: 'Bitter gourd', ur: 'کریلا',     line: 'Bitter gourd is green and bumpy, and it tastes bitter.' },
  { k: 'beans',       t: 'v', en: 'Green beans',  ur: 'پھلیاں',    line: 'Green beans are long, thin and crunchy.' },
  { k: 'coriander',   t: 'v', en: 'Coriander',    ur: 'دھنیا',     line: 'Coriander leaves smell fresh. We put them on top of food.' },
];

const PRAISE = ['Well done!', 'Great job!', 'Super!', 'You got it!', 'Excellent!'];
const TRY = ['Try again!', 'Not this one. Try again!', 'Look again, you can do it!'];

function esc(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const photo = it => `/fv/${it.k}.jpg`;
const kind = it => (it.t === 'f' ? 'Fruit' : 'Vegetable');

export const fruitsVeg = {
  id: 20,
  name: 'Fruits & Vegetables',
  emoji: '🍎',
  desc: `${ITEMS.length} fruits and vegetables, in English and Urdu`,
  ageHint: 'Age 3+',
  custom: true,
  guide: 'Learn: see each fruit or vegetable with its photo, English name, Urdu name and a short fact. Tap 🔊 English or 🗣 اردو to hear it. Find it: tap the right photo. A wrong tap is fine, just try again!',

  start(stage) {
    const key = () => `playglow:fv:${Storage.getActiveProfile()?.id || 'anon'}`;
    function load() {
      let s;
      try { s = JSON.parse(localStorage.getItem(key()) || '{}') || {}; } catch (e) { s = {}; }
      if (!Array.isArray(s.seen)) s.seen = [];
      s.seen = s.seen.filter(k => ITEMS.some(it => it.k === k));
      s.best = s.best || 0;
      return s;
    }
    function save() { try { localStorage.setItem(key(), JSON.stringify(s)); } catch (e) {} }
    const s = load();
    let filter = 'all';   // all | f | v
    let pos = 0;          // index inside the filtered list
    let view = 'learn';

    stage.innerHTML = `
      <div class="an-root">
        <div class="ab-progress-row">
          <span class="ab-progress-text" id="fv-ptext"></span>
          <span class="ab-streak" id="fv-best"></span>
        </div>
        <div class="ab-bar"><div class="ab-bar-fill" id="fv-bar"></div></div>
        <div class="ab-tabs">
          <button class="ab-tab" data-view="learn">📖 Learn</button>
          <button class="ab-tab" data-view="grid">🧺 All</button>
          <button class="ab-tab" data-view="quiz">🔍 Find it</button>
        </div>
        <div class="fv-chips" id="fv-chips">
          <button class="fv-chip" data-f="all">All</button>
          <button class="fv-chip" data-f="f">🍎 Fruits</button>
          <button class="fv-chip" data-f="v">🥕 Vegetables</button>
        </div>
        <div class="ab-body" id="fv-body"></div>
      </div>`;
    const root = stage.querySelector('.an-root');
    const body = stage.querySelector('#fv-body');
    const chips = stage.querySelector('#fv-chips');
    stage.querySelectorAll('.ab-tab').forEach(b => { b.onclick = () => show(b.dataset.view); });
    chips.querySelectorAll('.fv-chip').forEach(b => {
      b.onclick = () => { filter = b.dataset.f; pos = 0; show(view); };
    });
    const alive = () => document.body.contains(root);
    const list = () => ITEMS.filter(it => filter === 'all' || it.t === filter);
    const seen = it => s.seen.indexOf(it.k) >= 0;
    const meet = it => { if (!seen(it)) { s.seen.push(it.k); save(); renderTop(); } };
    const sayEn = it => Audio.speak(`${it.en}. ${it.line}`, 'en');
    const sayUr = it => Audio.speak(it.ur, 'ur');

    function renderTop() {
      stage.querySelector('#fv-ptext').textContent = `🧺 ${s.seen.length} / ${ITEMS.length} learned`;
      stage.querySelector('#fv-best').textContent = s.best ? `🏆 Best ${s.best}/${QUIZ_LEN}` : '';
      stage.querySelector('#fv-bar').style.width = `${Math.round(100 * s.seen.length / ITEMS.length)}%`;
    }
    function show(v) {
      view = v;
      stage.querySelectorAll('.ab-tab').forEach(b => b.classList.toggle('active', b.dataset.view === v));
      chips.querySelectorAll('.fv-chip').forEach(b => b.classList.toggle('active', b.dataset.f === filter));
      renderTop();
      if (v === 'learn') renderCard(false);
      else if (v === 'grid') renderGrid();
      else renderQuiz();
    }
    const img = (it, cls) => `<img class="${cls}" src="${photo(it)}" alt="${esc(it.en)}" loading="lazy">`;
    show('learn');   // after every const helper above (TDZ)

    function renderCard(speak) {
      const L = list();
      if (pos >= L.length) pos = 0;
      const it = L[pos];
      body.innerHTML = `
        <div class="ab-card an-card${seen(it) ? ' learned' : ''}">
          <div class="ab-count">${pos + 1} / ${L.length} · ${kind(it)}${seen(it) ? ' · ✓' : ''}</div>
          <button class="an-photo-btn" id="fv-photo" aria-label="Hear ${esc(it.en)}">${img(it, 'an-photo')}</button>
          <div class="an-names">
            <span class="an-en">${esc(it.en)}</span>
            <span class="an-ur" lang="ur" dir="rtl">${it.ur}</span>
          </div>
          <div class="fv-line">${esc(it.line)}</div>
          <div class="an-btns">
            <button class="ab-listen an-sound" id="fv-en">🔊 English</button>
            <button class="ab-listen an-voice" id="fv-ur">🗣 اردو</button>
          </div>
        </div>
        <div class="ab-nav">
          <button class="ww-ctrl" id="fv-prev" ${pos === 0 ? 'disabled' : ''}>◀ Back</button>
          <button class="ww-ctrl ab-next" id="fv-next">${pos === L.length - 1 ? 'Find it 🔍' : 'Next ▶'}</button>
        </div>`;
      body.querySelector('#fv-en').onclick = () => { meet(it); sayEn(it); };
      body.querySelector('#fv-photo').onclick = () => { meet(it); sayEn(it); };
      body.querySelector('#fv-ur').onclick = () => { meet(it); sayUr(it); };
      body.querySelector('#fv-prev').onclick = () => { if (pos > 0) { pos -= 1; renderCard(true); } };
      body.querySelector('#fv-next').onclick = () => {
        meet(it);
        if (pos < L.length - 1) { pos += 1; renderCard(true); } else show('quiz');
      };
      if (speak) { meet(it); sayEn(it); }
    }

    function renderGrid() {
      const L = list();
      body.innerHTML = `<div class="an-grid">${L.map((it, i) => `
        <button class="an-cell${seen(it) ? ' learned' : ''}" data-i="${i}">
          ${img(it, 'an-cell-img')}
          <span class="an-cell-name">${esc(it.en)}</span>
          <span class="an-cell-ur" lang="ur">${it.ur}</span>
        </button>`).join('')}</div>`;
      body.querySelectorAll('.an-cell').forEach(b => {
        b.onclick = () => {
          pos = parseInt(b.dataset.i, 10);
          view = 'learn';
          stage.querySelectorAll('.ab-tab').forEach(t => t.classList.toggle('active', t.dataset.view === 'learn'));
          renderCard(true);
        };
      });
    }

    function renderQuiz() {
      const L = list();
      const order = shuffle(L).slice(0, QUIZ_LEN);
      let qi = 0, score = 0;
      body.innerHTML = `
        <div class="ab-card">
          <div class="ab-done-emoji">🔍</div>
          <div class="ab-roman">Find it!</div>
          <div class="ab-hint">Hear a name, then tap the right picture. ${order.length} questions.</div>
          <div class="ab-nav"><button class="ww-ctrl ab-next" id="fv-go">▶ Start</button></div>
        </div>`;
      body.querySelector('#fv-go').onclick = ask;

      function ask() {
        if (!alive()) return;
        if (qi >= order.length) return finish();
        const ans = order[qi];
        // Same kind (fruit with fruits) makes it a fair look-and-find.
        const pool = ITEMS.filter(it => it !== ans && it.t === ans.t);
        const opts = shuffle([ans].concat(shuffle(pool).slice(0, 3)));
        body.innerHTML = `
          <div class="ab-quiz">
            <div class="ab-count">Question ${qi + 1} / ${order.length} · ⭐ ${score}</div>
            <div class="ab-q">Find the <b>${esc(ans.en)}</b></div>
            <button class="ab-listen an-play" id="fv-say">🔊 Hear it</button>
            <div class="an-opts">${opts.map(it => `
              <button class="an-opt" data-k="${it.k}">${img(it, 'an-opt-img')}</button>`).join('')}</div>
            <div class="fv-msg" id="fv-msg"></div>
          </div>`;
        const say = () => Audio.speak(`Find the ${ans.en}`, 'en');
        body.querySelector('#fv-say').onclick = say;
        say();
        let missed = false, done = false;
        const msg = body.querySelector('#fv-msg');
        body.querySelectorAll('.an-opt').forEach(b => {
          b.onclick = () => {
            if (done || b.disabled) return;
            if (b.dataset.k === ans.k) {
              done = true;
              if (!missed) score += 1;
              meet(ans);
              b.classList.add('right');
              body.querySelectorAll('.an-opt').forEach(o => { o.disabled = true; });
              Audio.correct();
              const p = pick(PRAISE);
              msg.className = 'fv-msg good'; setTimeout(() => { try { msg.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {} }, 50);
              msg.innerHTML = `<div>🎉 ${p} This is the <b>${esc(ans.en)}</b></div>
                <div class="an-ur" lang="ur" dir="rtl">${ans.ur}</div>
                <button class="ww-ctrl ab-next" id="fv-next-q">${qi + 1 < order.length ? 'Next ▶' : 'Finish ✓'}</button>`;
              msg.querySelector('#fv-next-q').onclick = () => { qi += 1; ask(); };
              setTimeout(() => { if (alive()) Audio.speak(`${p} ${ans.en}!`, 'en'); }, 350);
            } else {
              missed = true;
              b.classList.add('wrong'); b.disabled = true;
              Audio.wrong();
              const t = pick(TRY);
              msg.className = 'fv-msg bad'; setTimeout(() => { try { msg.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {} }, 50);
              msg.innerHTML = `💪 ${esc(t)}`;
              setTimeout(() => { if (alive() && !done) Audio.speak(`${t} Find the ${ans.en}.`, 'en'); }, 350);
            }
          };
        });
      }

      function finish() {
        const n = order.length;
        const stars = score >= n ? 3 : score >= n - 2 ? 2 : score >= n / 2 ? 1 : 0;
        if (stars) { Audio.win(); Storage.addStars(stars); }
        if (n === QUIZ_LEN && score > s.best) { s.best = score; save(); }
        renderTop();
        body.innerHTML = `
          <div class="ab-card ab-done">
            <div class="ab-done-emoji">${'⭐'.repeat(stars) || '💪'}</div>
            <div class="ab-roman">${score} / ${n} first try</div>
            <div class="ab-hint">${stars >= 2 ? 'Amazing! You know your fruits and vegetables.' : 'Good try! Learn a few more and play again.'}</div>
            <div class="ab-nav">
              <button class="ww-ctrl ab-next" id="fv-again">🔍 Again</button>
              <button class="ww-ctrl" id="fv-learn">📖 Learn</button>
            </div>
          </div>`;
        body.querySelector('#fv-again').onclick = () => renderQuiz();
        body.querySelector('#fv-learn').onclick = () => show('learn');
      }
    }
  }
};

export const FRUIT_VEG_ITEMS = ITEMS;
