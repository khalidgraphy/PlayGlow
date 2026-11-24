// Activity 21: Rock Paper Scissors (Games). Original PlayGlow design.
// Modes: Vs Robot (Sleepy / Robo / Brainy), Vs Friend (secret picks, pass the
// phone), Quick Think (robot shows a hand, tap the one that beats it, or loses
// to it, before the timer ends).
// Hands: Classic (rock, paper, scissors) or Plus (adds fire and water; every
// hand beats exactly 2 and loses to 2).
// Keys: playglow:rps:settings (global), playglow:rps:<profileId> (stats).
// Helpers are function declarations and the first render runs at the end of
// start() (TDZ rule from earlier games).

import { Audio } from '../audio.js';
import { Storage } from '../storage.js';
import { escape } from '../engine.js';

const HANDS = {
  rock:     { e: '✊', n: 'Rock',     c: '#8D6E63', t: '#EFEBE9' },
  paper:    { e: '✋', n: 'Paper',    c: '#29B6F6', t: '#E1F5FE' },
  scissors: { e: '✌️', n: 'Scissors', c: '#EC407A', t: '#FCE4EC' },
  fire:     { e: '🔥', n: 'Fire',     c: '#FF7043', t: '#FBE9E7' },
  water:    { e: '💧', n: 'Water',    c: '#1E88E5', t: '#E3F2FD' },
};
// winner -> { loser: verb }
const BEATS = {
  rock:     { scissors: 'crushes', fire: 'smothers' },
  paper:    { rock: 'covers', water: 'soaks up' },
  scissors: { paper: 'cut', water: 'splash through' },
  fire:     { paper: 'burns', scissors: 'melts' },
  water:    { fire: 'puts out', rock: 'wears down' },
};
const SETS = {
  classic: ['rock', 'paper', 'scissors'],
  plus:    ['rock', 'paper', 'scissors', 'fire', 'water'],
};
const BOTS = {
  easy:   { name: 'Sleepy Bot', ava: '😴', desc: 'Has a favourite hand' },
  normal: { name: 'Robo',       ava: '🤖', desc: 'Picks at random' },
  smart:  { name: 'Brainy Bot', ava: '🧠', desc: 'Learns your moves' },
};
const QUICK_ROUNDS = 10;
const SET_KEY = 'playglow:rps:settings';

let abortPrev = null;

export const rockPaperScissors = {
  id: 21,
  name: 'Rock Paper Scissors',
  emoji: '✊',
  desc: 'Beat the robot, a friend, or the clock',
  ageHint: 'Age 4+',
  custom: true,
  guide: 'Rock crushes scissors, scissors cut paper, paper covers rock. Play the robot, pass the phone to a friend (picks stay secret), or try Quick Think: tap the hand that beats the robot before time runs out. Turn on Fire and Water for 5 hands.',

  start(stage, { onExit, showDone }) {
    abortPrev?.();
    let cancelled = false;
    const timers = [];
    abortPrev = () => { cancelled = true; timers.forEach(clearTimeout); };
    function later(fn, ms) { const t = setTimeout(() => { if (!cancelled && alive()) fn(); }, ms); timers.push(t); return t; }

    const profile = Storage.getActiveProfile();
    const myName = profile?.name || 'You';
    let cfg = loadSettings();
    let st = loadStats();
    let root = null;

    function alive() { return !!root && document.body.contains(root); }

    function loadSettings() {
      let s;
      try { s = JSON.parse(localStorage.getItem(SET_KEY) || '{}') || {}; } catch (e) { s = {}; }
      return {
        mode:  ['robot', 'friend', 'quick'].indexOf(s.mode) >= 0 ? s.mode : 'robot',
        set:   s.set === 'plus' ? 'plus' : 'classic',
        match: [3, 5, 7].indexOf(s.match) >= 0 ? s.match : 3,
        bot:   BOTS[s.bot] ? s.bot : 'easy',
        quick: s.quick === 'mix' ? 'mix' : 'beat',
        voice: s.voice !== false,
        p2:    typeof s.p2 === 'string' ? s.p2.slice(0, 12) : 'Player 2',
      };
    }
    function saveSettings() { try { localStorage.setItem(SET_KEY, JSON.stringify(cfg)); } catch (e) {} }
    function statKey() { return `playglow:rps:${profile?.id || 'anon'}`; }
    function loadStats() {
      let s;
      try { s = JSON.parse(localStorage.getItem(statKey()) || '{}') || {}; } catch (e) { s = {}; }
      return { w: s.w || 0, l: s.l || 0, d: s.d || 0, streak: s.streak || 0, best: s.best || 0, quick: s.quick || 0, matches: s.matches || 0 };
    }
    function saveStats() { try { localStorage.setItem(statKey(), JSON.stringify(st)); } catch (e) {} }

    function hands() { return SETS[cfg.set]; }
    function beats(a, b) { return !!BEATS[a][b]; }
    function winnersOver(b) { return hands().filter(h => beats(h, b)); }
    function losersTo(b) { return hands().filter(h => beats(b, h)); }
    function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function say(text) { if (cfg.voice) Audio.speak(text, 'en'); }
    function phrase(w, l) { return `${HANDS[w].n} ${BEATS[w][l]} ${HANDS[l].n.toLowerCase()}`; }
    function handBtn(h, extra) {
      const x = HANDS[h];
      return `<button class="rps-pick" data-h="${h}" style="--hc:${x.c};--ht:${x.t}" ${extra || ''}>
        <span class="rps-pick-e">${x.e}</span><span class="rps-pick-n">${x.n}</span></button>`;
    }

    // ---------------- setup ----------------
    function showSetup() {
      const set = hands();
      const rules = set.map(h => `<div class="rps-rule"><span class="rps-rule-e">${HANDS[h].e}</span> beats ${
        Object.keys(BEATS[h]).filter(x => set.indexOf(x) >= 0).map(x => `<span class="rps-rule-e">${HANDS[x].e}</span>`).join(' ')}</div>`).join('');
      const total = st.w + st.l;
      stage.innerHTML = `
        <div class="rps-root rps-setup">
          <div class="rps-hero" aria-hidden="true"><span>✊</span><span>✋</span><span>✌️</span>${cfg.set === 'plus' ? '<span>🔥</span><span>💧</span>' : ''}</div>
          <div class="rps-h">How do you want to play?</div>
          <div class="rps-modes">
            ${modeCard('robot', '🤖', 'Robot', 'Play the computer')}
            ${modeCard('friend', '👥', 'Friend', 'Pass the phone')}
            ${modeCard('quick', '⚡', 'Quick Think', 'Beat the clock')}
          </div>
          <div class="rps-opt">
            <div class="rps-opt-l">Hands</div>
            <div class="rps-chips">
              ${chip('set', 'classic', '✊✋✌️ Classic')}
              ${chip('set', 'plus', '+ 🔥💧 Fire & Water')}
            </div>
          </div>
          ${cfg.mode !== 'quick' ? `<div class="rps-opt">
            <div class="rps-opt-l">Match</div>
            <div class="rps-chips">${[3, 5, 7].map(n => chip('match', n, `Best of ${n}`)).join('')}</div>
          </div>` : ''}
          ${cfg.mode === 'robot' ? `<div class="rps-opt">
            <div class="rps-opt-l">Robot</div>
            <div class="rps-chips">${Object.keys(BOTS).map(k => chip('bot', k, `${BOTS[k].ava} ${BOTS[k].name}`)).join('')}</div>
            <div class="rps-opt-d">${BOTS[cfg.bot].desc}</div>
          </div>` : ''}
          ${cfg.mode === 'friend' ? `<div class="rps-opt">
            <div class="rps-opt-l">Friend's name</div>
            <input id="rps-p2" class="rps-input" maxlength="12" value="${escape(cfg.p2)}" autocomplete="off">
          </div>` : ''}
          ${cfg.mode === 'quick' ? `<div class="rps-opt">
            <div class="rps-opt-l">Challenge</div>
            <div class="rps-chips">
              ${chip('quick', 'beat', '🏆 Beat it')}
              ${chip('quick', 'mix', '🔀 Beat it or Lose to it')}
            </div>
          </div>` : ''}
          <div class="rps-opt">
            <div class="rps-chips">
              <button class="rps-chip${cfg.voice ? ' on' : ''}" id="rps-voice">${cfg.voice ? '🔊 Voice on' : '🔇 Voice off'}</button>
            </div>
          </div>
          <button class="button rps-play" id="rps-go">Play ▶</button>
          <details class="rps-rules"><summary>Who beats who?</summary><div class="rps-rules-list">${rules}</div></details>
          <div class="rps-stats">${total || st.d ? `🏅 ${st.w} won · ${st.l} lost · ${st.d} draws` : 'No games yet. Good luck!'}${st.best ? ` · 🔥 Best streak ${st.best}` : ''}${st.quick ? ` · ⚡ Best ${st.quick}/${QUICK_ROUNDS}` : ''}</div>
        </div>`;
      root = stage.querySelector('.rps-root');
      stage.querySelectorAll('.rps-mode').forEach(b => { b.onclick = () => { cfg.mode = b.dataset.mode; saveSettings(); showSetup(); }; });
      stage.querySelectorAll('.rps-chip[data-k]').forEach(b => {
        b.onclick = () => {
          const k = b.dataset.k;
          cfg[k] = k === 'match' ? parseInt(b.dataset.v, 10) : b.dataset.v;
          saveSettings(); showSetup();
        };
      });
      stage.querySelector('#rps-voice').onclick = () => { cfg.voice = !cfg.voice; saveSettings(); showSetup(); };
      const p2 = stage.querySelector('#rps-p2');
      if (p2) p2.oninput = () => { cfg.p2 = p2.value.trim().slice(0, 12); saveSettings(); };
      stage.querySelector('#rps-go').onclick = () => {
        Audio.arm();
        if (cfg.mode === 'quick') runQuick(); else runMatch();
      };
    }
    function modeCard(m, e, n, d) {
      return `<button class="rps-mode${cfg.mode === m ? ' on' : ''}" data-mode="${m}">
        <span class="rps-mode-e">${e}</span><span class="rps-mode-n">${n}</span><span class="rps-mode-d">${d}</span></button>`;
    }
    function chip(k, v, label) {
      return `<button class="rps-chip${String(cfg[k]) === String(v) ? ' on' : ''}" data-k="${k}" data-v="${v}">${label}</button>`;
    }

    // ---------------- match (robot or friend) ----------------
    function runMatch() {
      const vsRobot = cfg.mode === 'robot';
      const bot = BOTS[cfg.bot];
      const p1 = { name: myName, ava: profile?.avatar || '🙂' };
      const p2 = vsRobot ? { name: bot.name, ava: bot.ava } : { name: cfg.p2 || 'Player 2', ava: '🧒' };
      const need = Math.ceil(cfg.match / 2);
      const set = hands();
      const fav = rnd(set);               // Sleepy Bot's favourite
      const hist = [];                    // player 1 picks, for Brainy Bot
      let s1 = 0, s2 = 0, round = 1, draws = 0, streak = 0;
      let pick1 = null, busy = false, tipShown = false;

      stage.innerHTML = `
        <div class="rps-root rps-game">
          <div class="rps-board">
            ${side(1, p1)}
            <div class="rps-round"><b id="rps-rn">Round 1</b><small>First to ${need}</small></div>
            ${side(2, p2)}
          </div>
          <div class="rps-arena" id="rps-arena">
            <div class="rps-glow" aria-hidden="true"></div>
            <div class="rps-hw left" id="rps-w1"><div class="rps-plate"><span class="rps-hand" id="rps-h1">✊</span></div></div>
            <div class="rps-mid"><div class="rps-call" id="rps-call">VS</div></div>
            <div class="rps-hw right" id="rps-w2"><div class="rps-plate"><span class="rps-flip"><span class="rps-hand" id="rps-h2">✊</span></span></div></div>
            <div class="rps-cover" id="rps-cover" hidden></div>
          </div>
          <div class="rps-msg" id="rps-msg"></div>
          <div class="rps-picks n${set.length}" id="rps-picks">${set.map(h => handBtn(h)).join('')}</div>
          <div class="rps-actions">
            <button class="chip" id="rps-back">↩ Change setup</button>
          </div>
        </div>`;
      root = stage.querySelector('.rps-root');
      const $ = id => stage.querySelector('#' + id);
      $('rps-back').onclick = () => { abortRound(); showSetup(); };
      stage.querySelectorAll('.rps-pick').forEach(b => { b.onclick = () => onPick(b.dataset.h); });
      ready();

      function side(n, p) {
        return `<div class="rps-side" id="rps-side${n}">
          <span class="rps-ava">${escape(p.ava)}</span>
          <span class="rps-nm">${escape(p.name)}</span>
          <span class="rps-pips">${Array.from({ length: need }, (_, i) => `<i class="rps-pip" data-i="${i}"></i>`).join('')}</span>
        </div>`;
      }
      function abortRound() { timers.forEach(clearTimeout); }
      function setMsg(html) { $('rps-msg').innerHTML = html; }
      function turnFor(n) {
        $('rps-side1').classList.toggle('turn', n === 1);
        $('rps-side2').classList.toggle('turn', n === 2);
      }
      function lockPicks(on) { stage.querySelectorAll('.rps-pick').forEach(b => { b.disabled = on; b.classList.remove('chosen'); }); }

      function ready() {
        busy = false; pick1 = null;
        $('rps-rn').textContent = `Round ${round}`;
        resetHands();
        lockPicks(false);
        turnFor(1);
        if (vsRobot) {
          let tip = '';
          if (cfg.bot === 'easy' && round >= 4 && !tipShown) {
            tipShown = true;
            tip = `<div class="rps-tip">🤫 Psst! ${escape(bot.name)} loves ${HANDS[fav].e} ${HANDS[fav].n}. What beats it?</div>`;
          }
          setMsg(`Pick your hand, ${escape(p1.name)}!${tip}`);
        } else {
          setMsg(`<b>${escape(p1.name)}</b>, pick secretly. 🙈 ${escape(p2.name)}, look away!`);
        }
      }
      function resetHands() {
        ['rps-w1', 'rps-w2'].forEach(id => { $(id).classList.remove('win', 'lose', 'tie'); $(id).style.removeProperty('--hc'); });
        $('rps-h1').textContent = '✊'; $('rps-h2').textContent = '✊';
        $('rps-call').textContent = 'VS'; $('rps-call').className = 'rps-call';
      }

      function onPick(h) {
        if (busy) return;
        if (vsRobot) {
          busy = true;
          lockPicks(true);
          stage.querySelector(`.rps-pick[data-h="${h}"]`).classList.add('chosen');
          const r = robotPick();
          hist.push(h);
          throwHands(h, r);
          return;
        }
        if (pick1 === null) {
          pick1 = h;
          busy = true;
          lockPicks(true);
          Audio.beep({ freq: 700, duration: 0.08 });
          showCover();
          return;
        }
        busy = true;
        lockPicks(true);
        throwHands(pick1, h);
      }

      function showCover() {
        const c = $('rps-cover');
        c.innerHTML = `<div class="rps-cover-in">
            <div class="rps-cover-e">🙈</div>
            <div class="rps-cover-t">${escape(p1.name)} picked!</div>
            <div class="rps-cover-s">Pass the phone to <b>${escape(p2.name)}</b></div>
            <button class="button" id="rps-ready">I am ${escape(p2.name)}, ready</button>
          </div>`;
        c.hidden = false;
        setMsg('');
        $('rps-ready').onclick = () => {
          c.hidden = true;
          busy = false;
          lockPicks(false);
          turnFor(2);
          setMsg(`<b>${escape(p2.name)}</b>, your turn. Pick secretly!`);
        };
      }

      function robotPick() {
        if (cfg.bot === 'easy') return Math.random() < 0.6 ? fav : rnd(set);
        if (cfg.bot === 'smart' && hist.length >= 2 && Math.random() < 0.75) {
          // Predict the next pick from what usually followed the last one.
          const last = hist[hist.length - 1];
          const after = {}, all = {};
          for (let i = 0; i < hist.length; i++) {
            all[hist[i]] = (all[hist[i]] || 0) + 1;
            if (i > 0 && hist[i - 1] === last) after[hist[i]] = (after[hist[i]] || 0) + 1;
          }
          const pool = Object.keys(after).length ? after : all;
          const guess = Object.keys(pool).sort((a, b) => pool[b] - pool[a])[0];
          return rnd(winnersOver(guess));
        }
        return rnd(set);
      }

      // Both fists shake 3 times while the call words pop, then reveal.
      function throwHands(a, b) {
        setMsg('');
        turnFor(0);
        const h1 = $('rps-h1'), h2 = $('rps-h2'), call = $('rps-call');
        const words = ['Rock!', 'Paper!', 'Scissors!'];
        h1.classList.remove('pop'); h2.classList.remove('pop');
        void h1.offsetWidth;
        h1.classList.add('shake'); h2.classList.add('shake');
        words.forEach((w, i) => later(() => {
          call.textContent = w;
          call.className = 'rps-call tick';
          Audio.beep({ freq: 440 + i * 110, duration: 0.09, type: 'triangle' });
        }, i * 420));
        later(() => {
          h1.classList.remove('shake'); h2.classList.remove('shake');
          h1.textContent = HANDS[a].e; h2.textContent = HANDS[b].e;
          void h1.offsetWidth;
          h1.classList.add('pop'); h2.classList.add('pop');
          $('rps-w1').style.setProperty('--hc', HANDS[a].c);
          $('rps-w2').style.setProperty('--hc', HANDS[b].c);
          call.textContent = 'Shoot!';
          call.className = 'rps-call shoot';
          Audio.beep({ freq: 990, duration: 0.14, type: 'triangle' });
          later(() => settle(a, b), 420);
        }, 3 * 420);
      }

      function settle(a, b) {
        const call = $('rps-call');
        const w1 = $('rps-w1'), w2 = $('rps-w2');
        let line, who = 0;
        if (a === b) {
          draws++;
          w1.classList.add('tie'); w2.classList.add('tie');
          call.textContent = '🤝'; call.className = 'rps-call burst';
          line = `Both picked ${HANDS[a].n}. It's a draw, go again!`;
          Audio.beep({ freq: 520, duration: 0.2 });
          say('Draw! Go again.');
        } else if (beats(a, b)) {
          who = 1; s1++;
          w1.classList.add('win'); w2.classList.add('lose');
          call.textContent = '💥'; call.className = 'rps-call burst';
          line = `${phrase(a, b)}! <b>${escape(p1.name)}</b> wins the round 🎉`;
          Audio.correct();
          say(`${phrase(a, b)}!`);
        } else {
          who = 2; s2++;
          w2.classList.add('win'); w1.classList.add('lose');
          call.textContent = '💥'; call.className = 'rps-call burst';
          line = `${phrase(b, a)}! <b>${escape(p2.name)}</b> wins the round`;
          if (vsRobot) Audio.slide({ from: 520, to: 260, duration: 0.35 }); else Audio.correct();
          say(`${phrase(b, a)}!`);
        }
        if (vsRobot) {
          if (who === 1) { streak++; st.streak = (st.streak || 0) + 1; st.best = Math.max(st.best, st.streak); }
          else if (who === 2) { streak = 0; st.streak = 0; }
          else st.d++;
          saveStats();
          if (who === 1 && streak >= 3) line += `<div class="rps-streak">🔥 ${streak} in a row!</div>`;
          if (who === 2) line += `<div class="rps-streak soft">Nice try! You can do it 💪</div>`;
        }
        fillPips();
        setMsg(line);
        if (s1 >= need || s2 >= need) { later(() => endMatch(s1 >= need ? 1 : 2), 1300); return; }
        round++;
        later(ready, 1700);
      }

      function fillPips() {
        [[1, s1], [2, s2]].forEach(([n, s]) => {
          stage.querySelectorAll(`#rps-side${n} .rps-pip`).forEach((p, i) => p.classList.toggle('on', i < s));
        });
      }

      function endMatch(winner) {
        const W = winner === 1 ? p1 : p2;
        let stars;
        if (vsRobot) {
          if (winner === 1) st.w++; else st.l++;
          stars = winner === 1 ? 3 : 1;
        } else {
          stars = 2;
        }
        st.matches++;
        saveStats();
        Storage.addStars(stars);
        Storage.setLevelScore(21, st.w);
        const human = !vsRobot || winner === 1;
        if (human) { Audio.win(); confetti(); say(`${W.name} wins the match!`); }
        else say(`${W.name} wins this time. Try again!`);
        const c = $('rps-cover');
        c.innerHTML = `<div class="rps-cover-in end">
            <div class="rps-cover-e big">${human ? '🏆' : '🤖'}</div>
            <div class="rps-cover-t">${escape(W.name)} wins!</div>
            <div class="rps-cover-s">${s1} : ${s2}${draws ? ` · ${draws} draw${draws > 1 ? 's' : ''}` : ''}</div>
          </div>`;
        c.hidden = false;
        later(() => showDone({
          title: human ? `${W.name} wins!` : 'So close!',
          stars,
          summary: vsRobot
            ? (winner === 1 ? `You beat ${bot.name} ${s1} to ${s2}. Try a harder robot next!` : `${bot.name} won ${s2} to ${s1}. Play again and win it back!`)
            : `${p1.name} ${s1} : ${s2} ${p2.name}`,
          onAgain: () => runMatch(),
          onNext:  () => onExit({ next: true }),
          onHome:  () => onExit({ home: true }),
        }), 1900);
      }
    }

    // ---------------- Quick Think ----------------
    function runQuick() {
      const set = hands();
      const limit = set.length === 5 ? 5000 : 4000;
      let i = 0, score = 0, target = null, mode = 'beat', busy = false, tStart = 0, prev = null;

      stage.innerHTML = `
        <div class="rps-root rps-game">
          <div class="rps-qtop">
            <span class="rps-qn" id="rps-qn"></span>
            <span class="rps-qs" id="rps-qs">⭐ 0</span>
          </div>
          <div class="rps-qarena">
            <div class="rps-qtask" id="rps-qtask"></div>
            <div class="rps-hw solo" id="rps-qw"><div class="rps-plate"><span class="rps-hand" id="rps-qh">🤖</span></div></div>
            <div class="rps-timer"><div class="rps-timer-fill" id="rps-tf"></div></div>
          </div>
          <div class="rps-msg" id="rps-msg"></div>
          <div class="rps-picks n${set.length}" id="rps-picks">${set.map(h => handBtn(h)).join('')}</div>
          <div class="rps-actions"><button class="chip" id="rps-back">↩ Change setup</button></div>
        </div>`;
      root = stage.querySelector('.rps-root');
      const $ = id => stage.querySelector('#' + id);
      $('rps-back').onclick = () => { timers.forEach(clearTimeout); showSetup(); };
      stage.querySelectorAll('.rps-pick').forEach(b => { b.onclick = () => answer(b.dataset.h); });
      next();

      function next() {
        if (i >= QUICK_ROUNDS) return finish();
        i++;
        busy = false;
        do { target = rnd(set); } while (target === prev && set.length > 1);
        prev = target;
        mode = cfg.quick === 'mix' && Math.random() < 0.35 ? 'lose' : 'beat';
        $('rps-qn').textContent = `${i} / ${QUICK_ROUNDS}`;
        const task = $('rps-qtask');
        task.className = `rps-qtask ${mode}`;
        task.textContent = mode === 'beat' ? '🏆 Beat it!' : '🙃 Lose to it!';
        const h = $('rps-qh');
        h.textContent = HANDS[target].e;
        h.classList.remove('pop'); void h.offsetWidth; h.classList.add('pop');
        $('rps-qw').classList.remove('win', 'lose');
        $('rps-qw').style.setProperty('--hc', HANDS[target].c);
        stage.querySelectorAll('.rps-pick').forEach(b => { b.disabled = false; b.classList.remove('right', 'wrong', 'chosen'); });
        setMsgQ(mode === 'beat' ? `Tap a hand that <b>beats</b> ${HANDS[target].n}` : `Tap a hand that <b>loses</b> to ${HANDS[target].n}`);
        const tf = $('rps-tf');
        tf.style.transition = 'none'; tf.style.width = '100%'; tf.classList.remove('low');
        void tf.offsetWidth;
        tf.style.transition = `width ${limit}ms linear`; tf.style.width = '0%';
        tStart = Date.now();
        later(() => tf.classList.add('low'), limit * 0.65);
        later(() => { if (!busy) answer(null); }, limit);
      }
      function setMsgQ(html) { $('rps-msg').innerHTML = html; }

      function answer(h) {
        if (busy) return;
        busy = true;
        timers.forEach(clearTimeout);
        const tf = $('rps-tf');
        tf.style.transition = 'none'; tf.style.width = getComputedStyle(tf).width;
        const good = mode === 'beat' ? winnersOver(target) : losersTo(target);
        const ok = h !== null && good.indexOf(h) >= 0;
        stage.querySelectorAll('.rps-pick').forEach(b => {
          b.disabled = true;
          if (good.indexOf(b.dataset.h) >= 0) b.classList.add('right');
          else if (b.dataset.h === h) b.classList.add('wrong');
        });
        if (ok) {
          score++;
          $('rps-qw').classList.add('lose');
          const fast = Date.now() - tStart < limit / 2;
          const w = mode === 'beat' ? phrase(h, target) : phrase(target, h);
          setMsgQ(`✅ Yes! ${w}.${fast ? ' ⚡ Super fast!' : ''}`);
          Audio.correct();
        } else {
          $('rps-qw').classList.add('win');
          const a = good[0];
          const w = mode === 'beat' ? phrase(a, target) : phrase(target, a);
          setMsgQ(`${h === null ? '⏰ Time is up!' : '❌ Not this one.'} ${w}.`);
          Audio.wrong();
        }
        $('rps-qs').textContent = `⭐ ${score}`;
        later(next, ok ? 1100 : 1800);
      }

      function finish() {
        const best = score > st.quick;
        if (best) { st.quick = score; saveStats(); }
        const stars = score >= 9 ? 3 : score >= 6 ? 2 : 1;
        Storage.addStars(stars);
        if (score >= 6) { Audio.win(); confetti(); }
        say(score >= 6 ? `Great thinking! ${score} out of ${QUICK_ROUNDS}.` : `${score} out of ${QUICK_ROUNDS}. Practice makes perfect!`);
        showDone({
          title: score >= 9 ? 'Lightning brain!' : score >= 6 ? 'Great thinking!' : 'Good try!',
          stars,
          summary: `${score} / ${QUICK_ROUNDS} right${best ? ' · New best!' : ` · Best ${st.quick}`}`,
          onAgain: () => runQuick(),
          onNext:  () => onExit({ next: true }),
          onHome:  () => onExit({ home: true }),
        });
      }
    }

    showSetup();
  }
};

// Confetti burst, reuses the shared .fireworks-overlay styles.
function confetti() {
  const overlay = document.createElement('div');
  overlay.className = 'fireworks-overlay';
  document.body.appendChild(overlay);
  const symbols = ['🎉', '✨', '⭐', '🌟', '✊', '✋', '✌️', '🎊'];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('span');
    p.className = 'firework-particle';
    p.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    p.style.left = (Math.random() * 90 + 5) + '%';
    p.style.top = (40 + Math.random() * 20) + '%';
    p.style.fontSize = (18 + Math.random() * 20) + 'px';
    p.style.setProperty('--dx', ((Math.random() - 0.5) * 600) + 'px');
    p.style.setProperty('--dy', (-300 + Math.random() * 200) + 'px');
    p.style.setProperty('--fall', (200 + Math.random() * 200) + 'px');
    p.style.animationDelay = (Math.random() * 0.25) + 's';
    p.style.animationDuration = (1.6 + Math.random() * 0.6) + 's';
    overlay.appendChild(p);
  }
  setTimeout(() => overlay.remove(), 3500);
}
