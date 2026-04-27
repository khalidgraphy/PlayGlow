// Activity 2: Tic Tac Toe
// Modes: vs Robot · vs Friend (hot-seat)
// Grids: 3×3 (Easy, 3-in-a-row), 4×4 (Medium, 4-in-a-row), 5×5 (Hard, 5-in-a-row)
// Marks: letter (1-2 chars) or emoji from a 16-set, per player.
// AI scales with grid: random / win-or-block / threat-heuristic.

import { Audio } from '../audio.js';
import { Storage } from '../storage.js';
import { escape } from '../engine.js';

// 8 kid-friendly emojis + 2 traditional letters (X, O) shown as quick-picks
const EMOJI_MARKS = ['🦋','🦁','🐶','⭐','🐴','😊','🌈','❤️'];
const TRADITIONAL_MARKS = ['X', 'O'];

// m,n,k-game shape: square m×m board, need k in a row
const GRIDS = [
  { size: 3, winLen: 3, label: '3×3', diff: 'Easy',   diffKey: 'easy',   desc: '3 in a row' },
  { size: 4, winLen: 4, label: '4×4', diff: 'Medium', diffKey: 'medium', desc: '4 in a row' },
  { size: 5, winLen: 5, label: '5×5', diff: 'Hard',   diffKey: 'hard',   desc: '5 in a row · expert' }
];

let abortPrev = null;

export const ticTacToe = {
  id: 2,
  name: 'Tic Tac Toe',
  emoji: '⭕',
  desc: 'Classic — vs robot or friend',
  ageHint: 'Age 5+',
  guide: 'Pick a mode (vs robot or a friend), grid size, and your mark (letter or emoji). Take turns tapping empty cells. First to make 3, 4, or 5 in a row (matching the grid) wins!',
  custom: true,

  start(stage, { onExit, showDone }) {
    abortPrev?.();
    let cancelled = false;
    abortPrev = () => { cancelled = true; };

    let mode = null;     // 'robot' | 'friend'
    let gridCfg = null;
    let p1 = null;       // { name, mark, isRobot }
    let p2 = null;

    showModeStep();

    // ---------- step 1: mode ----------
    function showModeStep() {
      stage.innerHTML = `
        <div class="ttt-root">
          <div class="ttt-step-title">How do you want to play?</div>
          <div class="ttt-mode-grid">
            <button class="ttt-mode-card" data-mode="robot">
              <div class="ttt-mode-emoji">🤖</div>
              <div class="ttt-mode-name">Vs Robot</div>
              <div class="ttt-mode-desc">Play against the computer</div>
            </button>
            <button class="ttt-mode-card" data-mode="friend">
              <div class="ttt-mode-emoji">👥</div>
              <div class="ttt-mode-name">Vs Friend</div>
              <div class="ttt-mode-desc">Pass the device, take turns</div>
            </button>
          </div>
        </div>
      `;
      stage.querySelectorAll('.ttt-mode-card').forEach(b => {
        b.onclick = () => { mode = b.dataset.mode; showGridStep(); };
      });
    }

    // ---------- step 2: grid size / difficulty ----------
    function showGridStep() {
      const scores = Storage.getScores();
      stage.innerHTML = `
        <div class="ttt-root">
          <div class="ttt-step-title">Pick a grid size</div>
          <div class="ttt-grid-options">
            ${GRIDS.map(g => `
              <button class="ttt-grid-card" data-size="${g.size}">
                <div class="ttt-grid-label">${g.label}</div>
                <div class="ttt-grid-diff">${g.diff}</div>
                <div class="ttt-grid-desc">${g.desc}</div>
              </button>
            `).join('')}
          </div>
          <div style="text-align:center;font-size:12px;color:var(--ink-soft);margin-top:8px">
            ${mode === 'robot' ? 'Robot gets harder on bigger grids.' : 'Hot-seat — both players use this device.'}
          </div>
        </div>
      `;
      stage.querySelectorAll('.ttt-grid-card').forEach(b => {
        b.onclick = () => {
          const size = parseInt(b.dataset.size, 10);
          gridCfg = GRIDS.find(g => g.size === size);
          showMarksStep();
        };
      });
    }

    // ---------- step 3: marks ----------
    function showMarksStep() {
      const profile = Storage.getActiveProfile();
      const defP1 = profile?.name?.[0]?.toUpperCase() || 'X';
      const defP2 = mode === 'robot' ? '🦁' : 'O';
      let p1Mark = defP1;
      let p2Mark = defP2;

      function markSection(num, currentMark, sectionLabel) {
        return `
          <div class="ttt-mark-section" id="ttt-p${num}-section">
            <div class="ttt-mark-label">${sectionLabel}</div>
            <div class="ttt-mark-row">
              <input id="ttt-p${num}-letter" class="ttt-mark-input" type="text" maxlength="2" value="${escape(currentMark)}" autocomplete="off" placeholder="?" />
              <div class="ttt-quick-picks">
                ${TRADITIONAL_MARKS.map(t => `<button class="ttt-quick-btn ${currentMark === t ? 'selected' : ''}" data-mark="${escape(t)}" type="button">${escape(t)}</button>`).join('')}
              </div>
            </div>
            <div class="ttt-emoji-grid">
              ${EMOJI_MARKS.map(e => `<button class="ttt-emoji-btn ${currentMark === e ? 'selected' : ''}" data-mark="${escape(e)}" type="button">${escape(e)}</button>`).join('')}
            </div>
          </div>
        `;
      }

      function rebuild() {
        const p1Label = `Player 1${profile ? ' · ' + escape(profile.name) : ''}`;
        const p2Label = mode === 'robot' ? '🤖 Robot' : 'Player 2';
        stage.innerHTML = `
          <div class="ttt-root">
            <div class="ttt-step-title">Pick your marks</div>
            ${markSection(1, p1Mark, p1Label)}
            ${markSection(2, p2Mark, p2Label)}
            <div id="ttt-mark-error" class="ttt-mark-error" style="display:none">Both players need different marks!</div>
            <button class="button" id="ttt-start">Start Game</button>
          </div>
        `;
        wire();
        syncDisabled();
        validate();
      }

      function wire() {
        [1, 2].forEach(num => {
          const section = stage.querySelector(`#ttt-p${num}-section`);
          const input = section.querySelector('.ttt-mark-input');
          input.oninput = () => {
            const v = input.value.trim();
            if (num === 1) p1Mark = v; else p2Mark = v;
            highlightSelected(section, v);
            syncDisabled();
            validate();
          };
          section.querySelectorAll('[data-mark]').forEach(b => {
            b.onclick = () => {
              if (b.classList.contains('mark-disabled')) return;
              const m = b.dataset.mark;
              input.value = m;
              if (num === 1) p1Mark = m; else p2Mark = m;
              highlightSelected(section, m);
              syncDisabled();
              validate();
            };
          });
        });

        stage.querySelector('#ttt-start').onclick = () => {
          const m1 = normaliseMark(p1Mark) || defP1;
          const m2 = normaliseMark(p2Mark) || defP2;
          if (!m1 || !m2 || m1 === m2) {
            const err = stage.querySelector('#ttt-mark-error');
            err.textContent = m1 === m2
              ? 'Both players need different marks!'
              : 'Pick a mark for both players.';
            err.style.display = 'block';
            return;
          }
          p1 = { name: profile?.name || 'Player 1', mark: m1, isRobot: false };
          p2 = {
            name: mode === 'robot' ? 'Robot' : 'Player 2',
            mark: m2,
            isRobot: mode === 'robot'
          };
          runGame();
        };
      }

      function highlightSelected(section, mark) {
        section.querySelectorAll('[data-mark]').forEach(b => {
          b.classList.toggle('selected', b.dataset.mark === mark);
        });
      }

      // Cross-disable: if Player 1 picks a mark, Player 2 can't pick that same mark
      // (and vice versa). Letter input still allowed but validated at Start.
      function syncDisabled() {
        const sec1 = stage.querySelector('#ttt-p1-section');
        const sec2 = stage.querySelector('#ttt-p2-section');
        sec1.querySelectorAll('[data-mark]').forEach(b => {
          const blocked = !!p2Mark && b.dataset.mark === p2Mark;
          b.classList.toggle('mark-disabled', blocked);
          b.disabled = blocked;
        });
        sec2.querySelectorAll('[data-mark]').forEach(b => {
          const blocked = !!p1Mark && b.dataset.mark === p1Mark;
          b.classList.toggle('mark-disabled', blocked);
          b.disabled = blocked;
        });
      }

      function validate() {
        const m1 = normaliseMark(p1Mark);
        const m2 = normaliseMark(p2Mark);
        const err = stage.querySelector('#ttt-mark-error');
        const startBtn = stage.querySelector('#ttt-start');
        const conflict = !!m1 && !!m2 && m1 === m2;
        if (err) err.style.display = conflict ? 'block' : 'none';
        if (startBtn) {
          startBtn.disabled = conflict || !m1 || !m2;
          startBtn.style.opacity = startBtn.disabled ? 0.55 : 1;
        }
      }

      rebuild();
    }

    // ---------- step 4: game ----------
    function runGame() {
      const N = gridCfg.size;
      const board = Array.from({ length: N }, () => Array(N).fill(null));
      let turn = 0;          // 0 = p1, 1 = p2
      let busy = false;

      render();

      function render(winningCells = null) {
        const cur = turn === 0 ? p1 : p2;
        stage.innerHTML = `
          <div class="ttt-root">
            <div class="ttt-game-hud">
              <div class="ttt-player-pill ${turn === 0 ? 'active' : ''}">
                <span class="ttt-mark-display">${escape(p1.mark)}</span>
                <span class="ttt-player-name">${escape(p1.name)}</span>
              </div>
              <div class="ttt-vs">vs</div>
              <div class="ttt-player-pill ${turn === 1 ? 'active' : ''}">
                <span class="ttt-mark-display">${escape(p2.mark)}</span>
                <span class="ttt-player-name">${escape(p2.name)}</span>
              </div>
            </div>
            <div class="ttt-turn-indicator">${escape(cur.name)}'s turn (${escape(cur.mark)})${cur.isRobot ? ' 🤖 thinking…' : ''}</div>
            <div class="ttt-board" data-size="${N}" style="grid-template-columns:repeat(${N}, 1fr)">
              ${board.map((row, r) => row.map((m, c) => {
                const isWin = winningCells?.some(([wr, wc]) => wr === r && wc === c);
                return `<button class="ttt-cell ${isWin ? 'win' : ''}" data-r="${r}" data-c="${c}" ${m ? 'disabled' : ''}>${m ? escape(m) : ''}</button>`;
              }).join('')).join('')}
            </div>
            <div class="ttt-game-actions">
              <button class="chip" id="ttt-restart">↺ New Round</button>
              <button class="chip" id="ttt-setup">↩ Change Setup</button>
            </div>
          </div>
        `;
        stage.querySelectorAll('.ttt-cell:not(:disabled)').forEach(btn => {
          btn.onclick = () => onTap(parseInt(btn.dataset.r, 10), parseInt(btn.dataset.c, 10));
        });
        stage.querySelector('#ttt-restart').onclick = () => runGame();
        stage.querySelector('#ttt-setup').onclick = () => showModeStep();

        if (cur.isRobot && !winningCells && !isFull()) {
          setTimeout(robotMove, 550);
        }
      }

      function onTap(r, c) {
        if (busy || board[r][c]) return;
        const cur = turn === 0 ? p1 : p2;
        if (cur.isRobot) return;
        place(r, c, cur);
      }

      function place(r, c, player) {
        if (cancelled) return;
        board[r][c] = player.mark;
        Audio.correct();
        const win = findWinningLine();
        if (win) return endGame(player, win);
        if (isFull()) return endGame(null, null);
        turn = 1 - turn;
        render();
      }

      function robotMove() {
        if (cancelled) return;
        if (findWinningLine() || isFull()) return;
        const move = pickRobotMove();
        if (move) place(move.r, move.c, p2);
      }

      function pickRobotMove() {
        const empties = [];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (!board[r][c]) empties.push({ r, c });
        }
        if (!empties.length) return null;

        const diff = gridCfg.diffKey;
        const my = p2.mark, opp = p1.mark;

        // Easy = "Beginner Bot": let the kid win.
        // - Never blocks the kid's winning move (so the kid completes their line).
        // - Plays its own winning move only ~25% of the time (otherwise stays
        //   passive). Result: kid wins most 3×3 games but the bot still scores
        //   the occasional point so it doesn't feel fake.
        if (diff === 'easy') {
          if (Math.random() < 0.25) {
            for (const e of empties) {
              board[e.r][e.c] = my;
              const w = findWinningLine();
              board[e.r][e.c] = null;
              if (w) return e;
            }
          }
          // Avoid cells that would block the kid's imminent win
          const nonBlocking = empties.filter(e => {
            board[e.r][e.c] = opp;
            const w = findWinningLine();
            board[e.r][e.c] = null;
            return !w; // keep cells that DON'T finish kid's line
          });
          const pool = nonBlocking.length ? nonBlocking : empties;
          return pool[Math.floor(Math.random() * pool.length)];
        }

        // Medium / Hard: try to win, then to block, then heuristic
        for (const e of empties) {
          board[e.r][e.c] = my;
          const w = findWinningLine();
          board[e.r][e.c] = null;
          if (w) return e;
        }
        for (const e of empties) {
          board[e.r][e.c] = opp;
          const w = findWinningLine();
          board[e.r][e.c] = null;
          if (w) return e;
        }
        if (diff === 'medium') return empties[Math.floor(Math.random() * empties.length)];

        // Hard: threat-based heuristic with center bias
        return empties.map(e => ({ ...e, score: scoreCell(e.r, e.c, my, opp) }))
                     .sort((a, b) => b.score - a.score)[0];
      }

      function scoreCell(r, c, my, opp) {
        let s = 0;
        const dirs = [[0,1],[1,0],[1,1],[1,-1]];
        for (const [dr, dc] of dirs) {
          let mine = 0, theirs = 0;
          for (let i = -(gridCfg.winLen - 1); i <= gridCfg.winLen - 1; i++) {
            const nr = r + dr * i, nc = c + dc * i;
            if (nr >= 0 && nr < N && nc >= 0 && nc < N) {
              if (board[nr][nc] === my) mine++;
              else if (board[nr][nc] === opp) theirs++;
            }
          }
          s += mine * mine * 2 + theirs * theirs;
        }
        const mid = (N - 1) / 2;
        s += (N - Math.abs(r - mid) - Math.abs(c - mid));
        return s;
      }

      function findWinningLine() {
        const dirs = [[0,1],[1,0],[1,1],[1,-1]];
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const mark = board[r][c];
            if (!mark) continue;
            for (const [dr, dc] of dirs) {
              const cells = [];
              let ok = true;
              for (let i = 0; i < gridCfg.winLen; i++) {
                const nr = r + dr * i, nc = c + dc * i;
                if (nr < 0 || nr >= N || nc < 0 || nc >= N || board[nr][nc] !== mark) {
                  ok = false; break;
                }
                cells.push([nr, nc]);
              }
              if (ok && cells.length === gridCfg.winLen) return cells;
            }
          }
        }
        return null;
      }

      function isFull() { return board.every(row => row.every(c => c !== null)); }

      function endGame(winner, line) {
        busy = true;
        render(line);
        Audio.win();
        const stars = winner ? (winner === p1 ? 3 : 1) : 2;
        Storage.addStars(stars);
        Storage.setLevelScore(2, (Storage.getScores()[2]?.high || 0) + (winner === p1 ? 1 : 0));

        // 🎉 Celebrate when a human wins (any non-robot winner).
        if (winner && !winner.isRobot) launchFireworks();

        setTimeout(() => {
          if (cancelled) return;
          showDone({
            title: winner ? `${winner.name} wins!` : 'Draw',
            stars,
            summary: winner
              ? `${gridCfg.winLen} in a row · ${gridCfg.label} · ${escape(winner.mark)}`
              : `Stalemate on ${gridCfg.label}`,
            onAgain: () => runGame(),
            onNext:  () => onExit({ next: true }),
            onHome:  () => onExit({ home: true })
          });
        }, 1400);
      }
    }
  }
};

// Capitalize ASCII-only inputs; leave emoji/unicode marks untouched.
function normaliseMark(s) {
  if (!s) return '';
  return /^[a-zA-Z]+$/.test(s) ? s.toUpperCase() : s;
}

// 🎉 Confetti / fireworks burst — fixed overlay, removes itself after ~3s.
// Triggered on human win to make the moment feel like a celebration.
function launchFireworks() {
  const overlay = document.createElement('div');
  overlay.className = 'fireworks-overlay';
  document.body.appendChild(overlay);

  const symbols = ['🎉','✨','⭐','🌟','💥','🎆','🎇','🎊'];
  const count = 36;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'firework-particle';
    p.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    // start position: spread across width, just above center
    p.style.left = (Math.random() * 90 + 5) + '%';
    p.style.top = (40 + Math.random() * 20) + '%';
    p.style.fontSize = (18 + Math.random() * 22) + 'px';
    // explosion vector
    const dx = (Math.random() - 0.5) * 700;
    const dy = -300 + Math.random() * 200;        // upward burst
    const fall = 200 + Math.random() * 200;        // gravity drop
    p.style.setProperty('--dx', dx + 'px');
    p.style.setProperty('--dy', dy + 'px');
    p.style.setProperty('--fall', fall + 'px');
    p.style.animationDelay = (Math.random() * 0.25) + 's';
    p.style.animationDuration = (1.6 + Math.random() * 0.6) + 's';
    overlay.appendChild(p);
  }
  setTimeout(() => overlay.remove(), 3500);
}
