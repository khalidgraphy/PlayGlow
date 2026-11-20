// Activities 15 + 16: Arabic Alphabet and Urdu Alphabet (Learning).
//   • Learn: one letter card at a time (big letter, Roman sound, native name,
//     🔊 Listen). "Next" marks the letter learned. Opens where you left off.
//   • All letters: grid of every letter, learned ones ticked, tap any to open.
//   • Revise: 8-question quiz on learned letters (see the sound, tap the letter).
//   • Restart: clears progress for this alphabet (confirm first).
//   • Progress bar, daily goal (5 new letters) and day streak, per profile.
// Voice: speaks the letter's native name with an Arabic / Urdu voice. When the
// phone has no such voice, it reads the Roman sound with the English voice.

import { Audio } from '../audio.js';
import { Storage } from '../storage.js';

// [letter, roman sound, native name, hint (optional)]
const ARABIC = [
  ['ا', 'alif', 'ألف'],
  ['ب', 'baa', 'باء'],
  ['ت', 'taa', 'تاء'],
  ['ث', 'thaa', 'ثاء', 'th as in "think"'],
  ['ج', 'jeem', 'جيم'],
  ['ح', 'Haa', 'حاء', 'breathy h from the throat'],
  ['خ', 'khaa', 'خاء', 'kh, like clearing the throat'],
  ['د', 'daal', 'دال'],
  ['ذ', 'dhaal', 'ذال', 'th as in "this"'],
  ['ر', 'raa', 'راء', 'rolled r'],
  ['ز', 'zaay', 'زاي'],
  ['س', 'seen', 'سين'],
  ['ش', 'sheen', 'شين'],
  ['ص', 'Saad', 'صاد', 'heavy s'],
  ['ض', 'Daad', 'ضاد', 'heavy d'],
  ['ط', 'Taa', 'طاء', 'heavy t'],
  ['ظ', 'Zaa', 'ظاء', 'heavy th as in "this"'],
  ['ع', 'ayn', 'عين', 'deep sound from the throat'],
  ['غ', 'ghayn', 'غين', 'gargling gh'],
  ['ف', 'faa', 'فاء'],
  ['ق', 'qaaf', 'قاف', 'deep k from the back of the throat'],
  ['ك', 'kaaf', 'كاف'],
  ['ل', 'laam', 'لام'],
  ['م', 'meem', 'ميم'],
  ['ن', 'noon', 'نون'],
  ['ه', 'haa', 'هاء', 'soft h as in "hat"'],
  ['و', 'waaw', 'واو'],
  ['ي', 'yaa', 'ياء'],
];

const URDU = [
  ['ا', 'alif', 'الف'],
  ['ب', 'bay', 'بے'],
  ['پ', 'pay', 'پے'],
  ['ت', 'tay', 'تے', 'soft t, tongue on the teeth'],
  ['ٹ', 'ttay', 'ٹے', 'hard t, tongue curled back'],
  ['ث', 'say', 'ثے', 's sound'],
  ['ج', 'jeem', 'جیم'],
  ['چ', 'chay', 'چے', 'ch as in "chair"'],
  ['ح', 'bari hay', 'بڑی حے', 'h sound'],
  ['خ', 'khay', 'خے', 'kh, like clearing the throat'],
  ['د', 'daal', 'دال', 'soft d, tongue on the teeth'],
  ['ڈ', 'ddaal', 'ڈال', 'hard d, tongue curled back'],
  ['ذ', 'zaal', 'ذال', 'z sound'],
  ['ر', 'ray', 'رے'],
  ['ڑ', 'rray', 'ڑے', 'flapped r, tongue curled back'],
  ['ز', 'zay', 'زے'],
  ['ژ', 'zhay', 'ژے', 'zh as in "measure"'],
  ['س', 'seen', 'سین'],
  ['ش', 'sheen', 'شین'],
  ['ص', 'swaad', 'صواد', 's sound'],
  ['ض', 'zwaad', 'ضواد', 'z sound'],
  ['ط', 'toay', 'طوئے', 't sound'],
  ['ظ', 'zoay', 'ظوئے', 'z sound'],
  ['ع', 'ain', 'عین'],
  ['غ', 'ghain', 'غین', 'gargling gh'],
  ['ف', 'fay', 'فے'],
  ['ق', 'qaaf', 'قاف', 'deep k from the back of the throat'],
  ['ک', 'kaaf', 'کاف'],
  ['گ', 'gaaf', 'گاف', 'g as in "go"'],
  ['ل', 'laam', 'لام'],
  ['م', 'meem', 'میم'],
  ['ن', 'noon', 'نون'],
  ['و', 'wao', 'واؤ'],
  ['ہ', 'choti hay', 'چھوٹی ہے', 'h sound'],
  ['ھ', 'do chashmi hay', 'دو چشمی ہے', 'adds a breath, as in "bh", "ph"'],
  ['ء', 'hamza', 'ہمزہ', 'a short catch in the voice'],
  ['ی', 'choti yay', 'چھوٹی یے'],
  ['ے', 'bari yay', 'بڑی یے'],
];

const DAILY_GOAL = 5;
const QUIZ_LEN = 8;

function esc(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function yesterday() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function makeAlphabet({ id, lang, name, emoji, desc, letters, script }) {
  const key = () => `playglow:alpha:${lang}:${Storage.getActiveProfile()?.id || 'anon'}`;
  const blank = () => ({ learned: [], pos: 0, day: '', todayNew: 0, streak: 0, lastDay: '' });
  function load() {
    let s;
    try { s = Object.assign(blank(), JSON.parse(localStorage.getItem(key()) || '{}')); } catch { s = blank(); }
    if (!Array.isArray(s.learned)) s.learned = [];
    s.learned = s.learned.filter(i => i >= 0 && i < letters.length);
    if (!(s.pos >= 0 && s.pos < letters.length)) s.pos = 0;
    if (s.day !== today()) { s.day = today(); s.todayNew = 0; }
    return s;
  }
  function save(s) { try { localStorage.setItem(key(), JSON.stringify(s)); } catch {} }

  function speakLetter(i) {
    const [, roman, native] = letters[i];
    if (Audio.hasVoice && Audio.hasVoice(lang)) Audio.speak(native, lang);
    else Audio.speak(roman, 'en');
  }

  return {
    id, name, emoji, desc,
    ageHint: 'Age 4+',
    custom: true,
    guide: `Learn the ${script} letters one by one. Tap 🔊 Listen to hear each letter, then Next. Your progress is saved: come back daily to learn ${DAILY_GOAL} new letters and keep your streak. Use All letters to jump to any letter, Revise for a quick quiz, or Restart to begin again.`,

    start(stage) {
      let s = load();
      let view = 'learn';

      stage.innerHTML = `
        <div class="ab-root ${lang === 'ur' ? 'ab-ur' : 'ab-ar'}">
          <div class="ab-top">
            <div class="ab-progress-row">
              <span class="ab-progress-text" id="ab-ptext"></span>
              <span class="ab-streak" id="ab-streak"></span>
            </div>
            <div class="ab-bar"><div class="ab-bar-fill" id="ab-bar"></div></div>
            <div class="ab-daily" id="ab-daily"></div>
          </div>
          <div class="ab-tabs">
            <button class="ab-tab" data-view="learn">📖 Learn</button>
            <button class="ab-tab" data-view="grid">🔤 All letters</button>
            <button class="ab-tab" data-view="quiz">🧠 Revise</button>
          </div>
          <div class="ab-body" id="ab-body"></div>
          <button class="ab-restart" id="ab-restart">↺ Restart</button>
        </div>`;
      const body = stage.querySelector('#ab-body');
      stage.querySelectorAll('.ab-tab').forEach(b => { b.onclick = () => show(b.dataset.view); });
      stage.querySelector('#ab-restart').onclick = confirmRestart;

      show('learn');

      function markLearned(i) {
        if (s.learned.includes(i)) return;
        s.learned.push(i);
        if (s.day !== today()) { s.day = today(); s.todayNew = 0; }
        s.todayNew += 1;
        if (s.lastDay !== today()) {
          s.streak = s.lastDay === yesterday() ? (s.streak || 0) + 1 : 1;
          s.lastDay = today();
        }
      }

      function renderTop() {
        const n = s.learned.length, total = letters.length;
        stage.querySelector('#ab-ptext').textContent = `Learned ${n} of ${total}`;
        stage.querySelector('#ab-bar').style.width = `${Math.round((n / total) * 100)}%`;
        stage.querySelector('#ab-streak').textContent = s.streak && s.lastDay && (s.lastDay === today() || s.lastDay === yesterday())
          ? `🔥 ${s.streak} day${s.streak > 1 ? 's' : ''}` : '';
        const daily = stage.querySelector('#ab-daily');
        if (n >= total) daily.textContent = '🏆 All letters learned! Revise any time.';
        else if (s.todayNew >= DAILY_GOAL) daily.textContent = `✅ Today's goal done (${s.todayNew} new). Keep going or come back tomorrow!`;
        else daily.textContent = `Today's goal: ${s.todayNew} / ${DAILY_GOAL} new letters`;
        stage.querySelectorAll('.ab-tab').forEach(b => b.classList.toggle('active', b.dataset.view === view));
      }

      function show(v) {
        view = v;
        if (v === 'learn') renderCard();
        else if (v === 'grid') renderGrid();
        else renderQuiz();
        renderTop();
      }

      // ---- Learn: one letter card ----
      function renderCard() {
        const i = s.pos;
        const [ch, roman, native, hint] = letters[i];
        const done = s.learned.includes(i);
        body.innerHTML = `
          <div class="ab-card${done ? ' learned' : ''}">
            <div class="ab-count">${i + 1} / ${letters.length}${done ? ' · ✓ learned' : ''}</div>
            <div class="ab-letter" lang="${lang}" dir="rtl">${ch}</div>
            <div class="ab-roman">${esc(roman)}</div>
            <div class="ab-native" lang="${lang}" dir="rtl">${native}</div>
            ${hint ? `<div class="ab-hint">${esc(hint)}</div>` : ''}
            <button class="ab-listen" id="ab-listen">🔊 Listen</button>
          </div>
          <div class="ab-nav">
            <button class="ww-ctrl" id="ab-prev" ${i === 0 ? 'disabled' : ''}>◀ Back</button>
            <button class="ww-ctrl ab-next" id="ab-next">${i === letters.length - 1 ? 'Finish ✓' : 'Next ▶'}</button>
          </div>`;
        body.querySelector('#ab-listen').onclick = () => speakLetter(i);
        body.querySelector('#ab-prev').onclick = () => { if (s.pos > 0) { s.pos -= 1; save(s); renderCard(); renderTop(); } };
        body.querySelector('#ab-next').onclick = () => {
          const wasNew = !s.learned.includes(i);
          markLearned(i);
          if (wasNew) Audio.correct();
          if (i === letters.length - 1) {
            save(s);
            if (s.learned.length >= letters.length) return celebrate();
            // Some letters skipped: jump to the first one not learned yet.
            const miss = letters.findIndex((_, k) => !s.learned.includes(k));
            s.pos = miss < 0 ? 0 : miss;
          } else {
            s.pos = i + 1;
          }
          save(s);
          renderCard(); renderTop();
          speakLetter(s.pos);
        };
      }

      function celebrate() {
        Audio.win();
        body.innerHTML = `
          <div class="ab-card ab-done">
            <div class="ab-done-emoji">🏆</div>
            <div class="ab-roman">Well done!</div>
            <div class="ab-hint">You learned all ${letters.length} ${script} letters.</div>
            <div class="ab-nav">
              <button class="ww-ctrl ab-next" id="ab-go-quiz">🧠 Revise</button>
              <button class="ww-ctrl" id="ab-go-start">From Alif</button>
            </div>
          </div>`;
        body.querySelector('#ab-go-quiz').onclick = () => show('quiz');
        body.querySelector('#ab-go-start').onclick = () => { s.pos = 0; save(s); show('learn'); };
        renderTop();
      }

      // ---- All letters grid ----
      function renderGrid() {
        body.innerHTML = `<div class="ab-grid">${letters.map(([ch, roman], i) => `
          <button class="ab-cell${s.learned.includes(i) ? ' learned' : ''}" data-i="${i}">
            <span class="ab-cell-letter" lang="${lang}">${ch}</span>
            <span class="ab-cell-roman">${esc(roman)}</span>
          </button>`).join('')}</div>`;
        body.querySelectorAll('.ab-cell').forEach(b => {
          b.onclick = () => { s.pos = parseInt(b.dataset.i, 10); save(s); show('learn'); speakLetter(s.pos); };
        });
      }

      // ---- Revise quiz: see + hear the sound, tap the letter ----
      function renderQuiz() {
        const pool = s.learned.length >= 4 ? s.learned.slice() : null;
        if (!pool) {
          body.innerHTML = `<div class="ab-card"><div class="ab-done-emoji">📖</div>
            <div class="ab-hint">Learn at least 4 letters first, then come back to revise them.</div>
            <div class="ab-nav"><button class="ww-ctrl ab-next" id="ab-go-learn">📖 Learn</button></div></div>`;
          body.querySelector('#ab-go-learn').onclick = () => show('learn');
          return;
        }
        const qs = [];
        while (qs.length < QUIZ_LEN) qs.push(...shuffle(pool));
        const questions = qs.slice(0, QUIZ_LEN);
        let qi = 0, score = 0;
        ask();

        function ask() {
          if (view !== 'quiz') return;
          if (qi >= questions.length) return finish();
          const ans = questions[qi];
          const others = shuffle(letters.map((_, k) => k).filter(k => k !== ans && letters[k][0] !== letters[ans][0])).slice(0, 3);
          const opts = shuffle([ans, ...others]);
          body.innerHTML = `
            <div class="ab-quiz">
              <div class="ab-count">Question ${qi + 1} / ${questions.length} · ⭐ ${score}</div>
              <div class="ab-q">Which letter is <b>${esc(letters[ans][1])}</b>?</div>
              <button class="ab-listen" id="ab-q-listen">🔊 Listen</button>
              <div class="ab-opts">${opts.map(k => `<button class="ab-opt" data-k="${k}" lang="${lang}">${letters[k][0]}</button>`).join('')}</div>
            </div>`;
          body.querySelector('#ab-q-listen').onclick = () => speakLetter(ans);
          speakLetter(ans);
          let answered = false, missed = false;
          body.querySelectorAll('.ab-opt').forEach(b => {
            b.onclick = () => {
              if (answered) return;
              const k = parseInt(b.dataset.k, 10);
              if (k === ans) {
                answered = true; if (!missed) score += 1; b.classList.add('right'); Audio.correct();
                setTimeout(() => { qi += 1; ask(); }, 700);
              } else {
                missed = true; b.classList.add('wrong'); b.disabled = true; Audio.wrong();
              }
            };
          });
        }

        function finish() {
          const stars = score >= QUIZ_LEN ? 3 : score >= QUIZ_LEN - 2 ? 2 : score >= QUIZ_LEN / 2 ? 1 : 0;
          if (stars) Audio.win();
          body.innerHTML = `
            <div class="ab-card ab-done">
              <div class="ab-done-emoji">${'⭐'.repeat(stars) || '💪'}</div>
              <div class="ab-roman">${score} / ${QUIZ_LEN} right first time</div>
              <div class="ab-hint">${stars >= 2 ? 'Great memory!' : 'Keep practising, you are getting there!'}</div>
              <div class="ab-nav">
                <button class="ww-ctrl ab-next" id="ab-quiz-again">🧠 Again</button>
                <button class="ww-ctrl" id="ab-go-learn2">📖 Learn</button>
              </div>
            </div>`;
          body.querySelector('#ab-quiz-again').onclick = () => show('quiz');
          body.querySelector('#ab-go-learn2').onclick = () => show('learn');
        }
      }

      function confirmRestart() {
        if (stage.querySelector('.tb-confirm')) return;
        const ov = document.createElement('div');
        ov.className = 'tb-confirm';
        ov.innerHTML = `
          <div class="tb-confirm-card">
            <div class="tb-confirm-text">Restart ${esc(name)}?</div>
            <div class="ab-hint" style="margin:-8px 0 14px">This clears the ${s.learned.length} letters learned. Your streak stays.</div>
            <div class="tb-confirm-btns">
              <button class="ww-ctrl" id="ab-rs-no">Cancel</button>
              <button class="ww-ctrl tb-danger" id="ab-rs-yes" disabled>Restart</button>
            </div>
          </div>`;
        stage.querySelector('.ab-root').appendChild(ov);
        const yes = ov.querySelector('#ab-rs-yes');
        ov.querySelector('#ab-rs-no').onclick = () => ov.remove();
        ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
        setTimeout(() => { yes.disabled = false; }, 350);
        yes.onclick = () => {
          ov.remove();
          s.learned = []; s.pos = 0; s.todayNew = 0;
          save(s); show('learn');
        };
      }
    }
  };
}

export const arabicAlphabet = makeAlphabet({
  id: 15, lang: 'ar', name: 'Arabic Alphabet', emoji: 'ا', desc: 'Alif to Yaa, 28 letters',
  letters: ARABIC, script: 'Arabic',
});
export const urduAlphabet = makeAlphabet({
  id: 16, lang: 'ur', name: 'Urdu Alphabet', emoji: 'ب', desc: 'Alif to Bari Ye, 38 letters',
  letters: URDU, script: 'Urdu',
});
export const ALPHABET_LETTERS = { ar: ARABIC, ur: URDU };
