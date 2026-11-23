// Chess robot for Activity 18. Rules + legal moves come from chess.js
// (BSD-2, pinned 1.2.0, no BigInt so it runs on old phones). The search is
// our own: alpha-beta negamax + capture search + simple piece-square tables
// (the well known "simplified evaluation function" values).
//
// Levels:
//   basic        depth 1, big random noise, sometimes a random move (makes kid mistakes)
//   intermediate depth 2 + capture search, small noise
//   expert       depth 3 to 4 (time limited) + capture search, no noise
//
// Uses chess.js internals (_moves, _makeMove, _undoMove, _board, _turn,
// _isKingAttacked) for speed, because the public move() builds SAN text on
// every call. Version is pinned, and there is a public-API fallback.

const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

// Index 0 = a8 ... 63 = h1, from White's side.
const PST = {
  p: [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5,
      0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
  n: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30,
      -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
  b: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10,
      -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
  r: [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5,
      -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
  q: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5,
      0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
  k: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
      -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20],
  ke: [-50,-40,-30,-20,-20,-30,-40,-50, -30,-20,-10,0,0,-10,-20,-30, -30,-10,20,30,30,20,-10,-30, -30,-10,30,40,40,30,-10,-30,
       -30,-10,30,40,40,30,-10,-30, -30,-10,20,30,30,20,-10,-30, -30,-30,0,0,0,0,-30,-30, -50,-30,-30,-30,-30,-30,-30,-50],
};

const MATE = 100000;
const ABORT = { abort: true };

function alg(sq) { return 'abcdefgh'[sq & 7] + (8 - (sq >> 4)); }
function pstIndex(sq, color) {
  const row = sq >> 4, col = sq & 7;
  return (color === 'w' ? row : 7 - row) * 8 + col;
}

function fast(c) {
  return typeof c._moves === 'function' && typeof c._makeMove === 'function' &&
    typeof c._undoMove === 'function' && Array.isArray(c._board);
}

// Score from the side to move.
function evaluate(c) {
  const b = c._board;
  let score = 0, nonPawn = 0, queens = 0;
  for (let i = 0; i < 120; i++) {
    if (i & 0x88) { i += 7; continue; }
    const p = b[i];
    if (!p || p.type === 'k') continue;
    const v = VAL[p.type] + PST[p.type][pstIndex(i, p.color)];
    score += p.color === 'w' ? v : -v;
    if (p.type !== 'p') nonPawn += VAL[p.type];
    if (p.type === 'q') queens++;
  }
  const endgame = queens === 0 || nonPawn <= 2600;
  const kt = endgame ? PST.ke : PST.k;
  const kw = c._kings.w, kb = c._kings.b;
  if (kw >= 0 && kw < 128) score += kt[pstIndex(kw, 'w')];
  if (kb >= 0 && kb < 128) score -= kt[pstIndex(kb, 'b')];
  return c._turn === 'w' ? score : -score;
}

function orderKey(m) {
  let k = 0;
  if (m.captured) k += 10 * VAL[m.captured] - VAL[m.piece] + 1000;
  if (m.promotion) k += VAL[m.promotion] + 900;
  return k;
}
function order(moves) { return moves.sort((a, b) => orderKey(b) - orderKey(a)); }

function makeSearcher(c, deadline) {
  let nodes = 0;
  function tick() {
    if ((++nodes & 511) === 0 && Date.now() > deadline) throw ABORT;
  }
  function quiesce(alpha, beta, qd) {
    tick();
    const stand = evaluate(c);
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    if (qd >= 6) return alpha;
    const moves = order(c._moves({ legal: true }).filter(m => m.captured || m.promotion));
    for (let i = 0; i < moves.length; i++) {
      c._makeMove(moves[i]);
      const s = -quiesce(-beta, -alpha, qd + 1);
      c._undoMove();
      if (s >= beta) return beta;
      if (s > alpha) alpha = s;
    }
    return alpha;
  }
  function search(depth, alpha, beta, ply, useQ) {
    tick();
    const moves = c._moves({ legal: true });
    if (!moves.length) return c._isKingAttacked(c._turn) ? -MATE + ply : 0;
    if (depth <= 0) return useQ ? quiesce(alpha, beta, 0) : evaluate(c);
    order(moves);
    for (let i = 0; i < moves.length; i++) {
      c._makeMove(moves[i]);
      const s = -search(depth - 1, -beta, -alpha, ply + 1, useQ);
      c._undoMove();
      if (s >= beta) return beta;
      if (s > alpha) alpha = s;
    }
    return alpha;
  }
  return { search, nodes: () => nodes };
}

const LEVELS = {
  basic:        { maxDepth: 1, q: false, noise: 140, randomPct: 0.22, ms: 400 },
  intermediate: { maxDepth: 2, q: true,  noise: 25,  randomPct: 0,    ms: 900 },
  expert:       { maxDepth: 4, q: true,  noise: 0,   randomPct: 0,    ms: 1400 },
};

// Returns { from, to, promotion } in algebraic, or null when no move.
export function bestMove(chess, level) {
  const L = LEVELS[level] || LEVELS.intermediate;
  if (!fast(chess)) return publicBest(chess, L);
  // Search a copy so the real game is never left half-moved.
  const c = new chess.constructor(chess.fen());
  let root = c._moves({ legal: true });
  if (!root.length) return null;
  const out = m => ({ from: alg(m.from), to: alg(m.to), promotion: m.promotion || undefined });
  if (L.randomPct && Math.random() < L.randomPct) return out(root[Math.floor(Math.random() * root.length)]);

  const opening = chess.history().length < 6;
  const noise = L.noise + (opening ? 12 : 0);
  const deadline = Date.now() + L.ms;
  const S = makeSearcher(c, deadline);
  let scored = order(root).map(m => ({ m, s: 0 }));
  let best = scored[0];
  for (let depth = 1; depth <= L.maxDepth; depth++) {
    try {
      let alpha = -MATE - 1;
      const next = [];
      for (let i = 0; i < scored.length; i++) {
        const m = scored[i].m;
        c._makeMove(m);
        // Full window at the root so every move gets a real score (needed for noise).
        let s = -S.search(depth - 1, -MATE - 1, MATE + 1, 1, L.q);
        c._undoMove();
        // Take a gain now rather than "later" (avoids dawdling before promoting or capturing).
        if (m.promotion === 'q') s += 60;
        else if (m.captured) s += 8;
        next.push({ m, s });
        if (s > alpha) alpha = s;
      }
      next.sort((a, b) => b.s - a.s);
      scored = next;
      best = scored[0];
      if (best.s > MATE - 100) break;        // found a mate, stop
    } catch (e) {
      if (e !== ABORT) throw e;
      // Out of time: the copy is thrown away, keep the last full depth.
      break;
    }
  }
  if (noise > 0) {
    let pick = best, top = -Infinity;
    scored.forEach(x => {
      // Never "noise" past a forced mate either way.
      const s = Math.abs(x.s) > MATE - 100 ? x.s * 10 : x.s + (Math.random() * 2 - 1) * noise;
      if (s > top) { top = s; pick = x; }
    });
    best = pick;
  }
  return out(best.m);
}

// Slow path (public API only), used if chess.js internals ever change.
function publicBest(chess, L) {
  const moves = chess.moves({ verbose: true });
  if (!moves.length) return null;
  if (L.randomPct && Math.random() < L.randomPct) {
    const m = moves[Math.floor(Math.random() * moves.length)];
    return { from: m.from, to: m.to, promotion: m.promotion };
  }
  let best = moves[0], top = -Infinity;
  moves.forEach(m => {
    let s = (m.captured ? VAL[m.captured] : 0) + (m.promotion ? VAL[m.promotion] : 0);
    chess.move(m);
    if (chess.isCheckmate()) s += MATE;
    const replies = chess.moves({ verbose: true });
    let worst = 0;
    replies.forEach(r => { if (r.captured) worst = Math.max(worst, VAL[r.captured]); });
    chess.undo();
    s -= worst;
    s += Math.random() * (L.noise || 5);
    if (s > top) { top = s; best = m; }
  });
  return { from: best.from, to: best.to, promotion: best.promotion };
}

export const CHESS_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9 };
