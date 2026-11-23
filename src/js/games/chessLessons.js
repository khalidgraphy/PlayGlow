// Chess learning content for Activity 18.
// All positions are White to move and checked by a script with chess.js.

// 1. Meet the pieces: a lone White piece hunts the black pawns (targets).
//    `start` and `targets` are squares; the pawn lesson also has to reach
//    the last row (promotion).
export const PIECES = [
  {
    key: 'k', name: 'King', ur: 'بادشاہ', ar: 'الملك', value: 'Priceless',
    moves: 'Moves 1 square in any direction: up, down, sideways or diagonally.',
    tip: 'The most important piece. If your King is trapped (checkmate), you lose. Keep him safe!',
    start: 'e1', targets: ['e2', 'f3', 'g4'],
  },
  {
    key: 'q', name: 'Queen', ur: 'وزیر', ar: 'الوزير', value: '9 points',
    moves: 'Moves as far as she likes in a straight line: up, down, sideways or diagonally.',
    tip: 'The strongest piece. Do not bring her out too early, or she can get chased around.',
    start: 'd1', targets: ['d5', 'g8', 'b3'],
  },
  {
    key: 'r', name: 'Rook', ur: 'رخ (ہاتھی)', ar: 'الرخ (القلعة)', value: '5 points',
    moves: 'Moves as far as it likes straight up, down or sideways. Never diagonally.',
    tip: 'Rooks love open lines and are great at the end of the game.',
    start: 'a1', targets: ['a6', 'f6', 'f2'],
  },
  {
    key: 'b', name: 'Bishop', ur: 'فیل (اونٹ)', ar: 'الفيل', value: '3 points',
    moves: 'Moves as far as it likes diagonally. It stays on the same colour square all game.',
    tip: 'You have one bishop for light squares and one for dark squares.',
    start: 'c1', targets: ['e3', 'g5', 'd8'],
  },
  {
    key: 'n', name: 'Knight', ur: 'گھوڑا', ar: 'الحصان', value: '3 points',
    moves: 'Jumps in an L shape: 2 squares one way, then 1 square to the side.',
    tip: 'The only piece that can jump over other pieces. Knights are tricky, watch them!',
    start: 'd4', targets: ['f5', 'e7', 'c6'],
  },
  {
    key: 'p', name: 'Pawn', ur: 'پیادہ', ar: 'الجندي', value: '1 point',
    moves: 'Moves 1 square forward (2 on its very first move). It captures 1 square diagonally forward.',
    tip: 'A pawn that reaches the last row becomes a Queen (promotion)!',
    start: 'e2', targets: ['f3', 'e4', 'd5'], promote: true,
  },
];

// 2. Special rules. type 'see' = read and look; type 'task' = make the move.
// goal: 'any' (any legal move), 'mate', 'castle', 'promote', 'ep', or a list of SAN moves.
export const RULES = [
  {
    id: 'setup', title: 'Starting position', emoji: '🏁', type: 'see',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    text: 'White is always at the bottom and moves first. A light square is in each player\'s right corner. The Queen starts on her own colour (White Queen on a light square), and the King stands next to her.',
  },
  {
    id: 'check', title: 'Check', emoji: '⚠️', type: 'task', goal: 'any',
    fen: '4r1k1/8/8/8/8/8/3P1P2/4K3 w - - 0 1',
    text: 'Your King is attacked by the black Rook. That is called CHECK. You must get out of check right away: move the King, block the attack, or capture the attacker.',
    task: 'Move your King out of check.',
    done: 'Safe! The King is out of check.',
  },
  {
    id: 'mate', title: 'Checkmate', emoji: '👑', type: 'task', goal: 'mate',
    fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
    text: 'CHECKMATE means the King is in check and has NO way to escape. That wins the game! The black King is stuck behind its own pawns.',
    task: 'Give checkmate with your Rook.',
    done: 'Checkmate! Rook to the back row, and the King cannot escape.',
  },
  {
    id: 'castle', title: 'Castling', emoji: '🏰', type: 'task', goal: 'castle',
    fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
    text: 'Castling is a special move to keep your King safe. The King moves 2 squares toward a Rook, and the Rook jumps over to the other side of the King. Allowed only if neither has moved, nothing is in between, and the King is not in check or crossing an attacked square.',
    task: 'Tap your King, then the square 2 steps to the right or left.',
    done: 'You castled! King safe in the corner, Rook ready to play.',
  },
  {
    id: 'promote', title: 'Promotion', emoji: '⭐', type: 'task', goal: 'promote',
    fen: '7k/1P6/8/8/8/8/8/6K1 w - - 0 1',
    text: 'When a pawn reaches the last row, it turns into a Queen, Rook, Bishop or Knight. Almost always pick the Queen, the strongest piece.',
    task: 'Push your pawn to the last row and make a Queen.',
    done: 'A brand new Queen! And it even gives check.',
  },
  {
    id: 'ep', title: 'En passant', emoji: '🥷', type: 'task', goal: 'ep',
    fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2',
    text: 'A rare pawn capture. The black pawn just jumped 2 squares and landed right next to your pawn. Only on the very next move, your pawn may capture it as if it had moved just 1 square.',
    task: 'Capture the black pawn en passant: move your pawn diagonally behind it.',
    done: 'En passant! French for "in passing".',
  },
  {
    id: 'stalemate', title: 'Stalemate', emoji: '🤝', type: 'task', goal: 'mate',
    fen: 'k7/8/1KQ5/8/8/8/8/8 w - - 0 1',
    text: 'STALEMATE: the player to move is NOT in check but has no legal move. The game is a draw, nobody wins! When you are winning, always leave the enemy King a square, or give checkmate.',
    task: 'Give checkmate, but careful: Queen to c7 would be stalemate!',
    done: 'Checkmate, not stalemate. Well done!',
  },
];

// 3. Scenarios for daily practice. goal 'mate' accepts any mating move;
// otherwise `sol` lists the accepted moves in SAN.
export const PUZZLES = [
  { id: 'm1', cat: 'Checkmate in 1', fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1', goal: 'mate',
    hint: 'a1', why: 'Back row mate: the King is trapped by its own pawns.' },
  { id: 'm2', cat: 'Checkmate in 1', fen: 'k7/3Q4/1K6/8/8/8/8/8 w - - 0 1', goal: 'mate',
    hint: 'd7', why: 'Your King guards the Queen, so the black King cannot take her.' },
  { id: 'm3', cat: 'Checkmate in 1', fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', goal: 'mate',
    hint: 'g5', why: 'Smothered mate: the King is boxed in by its own pieces and the Knight jumps in.' },
  { id: 'm4', cat: 'Checkmate in 1', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', goal: 'mate',
    hint: 'h5', why: 'Scholar\'s mate: f7 is weak, guarded only by the King. The Bishop protects your Queen.' },
  { id: 'm5', cat: 'Checkmate in 1', fen: '7k/R7/8/8/8/8/8/1R4K1 w - - 0 1', goal: 'mate',
    hint: 'b1', why: 'Two Rooks: one blocks row 7, the other checks on row 8.' },
  { id: 'm6', cat: 'Checkmate in 1', fen: '4k3/Q7/4K3/8/8/8/8/8 w - - 0 1', goal: 'mate',
    hint: 'a7', why: 'Queen right in front of the King, protected by your King.' },
  { id: 'm7', cat: 'Checkmate in 1', fen: '6k1/5p1p/8/5N2/6Q1/8/8/6K1 w - - 0 1', goal: 'mate',
    hint: 'g4', why: 'The Knight protects the Queen on g7.' },
  { id: 'm8', cat: 'Checkmate in 1', fen: '7k/6pp/8/7Q/8/3B4/8/6K1 w - - 0 1', goal: 'mate',
    hint: 'h5', why: 'The Bishop on the long diagonal protects the Queen on h7.' },
  { id: 'w1', cat: 'Win a piece', fen: '6k1/5ppp/3q4/8/8/8/5PPP/3R2K1 w - - 0 1', sol: ['Rxd6'],
    hint: 'd1', why: 'The black Queen has no guard. Always look for free pieces!' },
  { id: 'w2', cat: 'Win a piece', fen: '6k1/5ppp/5n2/8/1b1Q4/8/5PPP/6K1 w - - 0 1', sol: ['Qxb4'],
    hint: 'd4', why: 'The Bishop is free. The Knight is guarded by the g7 pawn, so taking it would lose your Queen.' },
  { id: 'w3', cat: 'Win a piece', fen: '6k1/5ppp/8/4q3/3P4/8/5PPP/6K1 w - - 0 1', sol: ['dxe5'],
    hint: 'd4', why: 'A 1 point pawn takes a 9 point Queen. Great trade!' },
  { id: 'w4', cat: 'Win a piece', fen: '4r1k1/5ppp/8/1B6/8/8/5PPP/4K3 w - - 0 1', sol: ['Bxe8'],
    hint: 'b5', why: 'You are in check. Best way out: capture the attacker!' },
  { id: 'f1', cat: 'Fork', fen: 'r3k3/8/8/1N6/8/8/8/6K1 w - - 0 1', sol: ['Nc7+'],
    hint: 'b5', why: 'A fork attacks two pieces at once. The King must move, then you take the Rook.' },
  { id: 'f2', cat: 'Fork', fen: '2q3k1/6pp/8/3N4/8/8/6PP/6K1 w - - 0 1', sol: ['Ne7+'],
    hint: 'd5', why: 'Knight check on the King and the Queen together. The Queen falls next move.' },
  { id: 'f3', cat: 'Fork', fen: '6k1/8/2r1r3/8/3P4/8/8/6K1 w - - 0 1', sol: ['d5'],
    hint: 'd4', why: 'Even a little pawn can fork! Both Rooks are attacked.' },
  { id: 's1', cat: 'Skewer', fen: '3q4/8/8/3k4/8/8/7K/7R w - - 0 1', sol: ['Rd1+'],
    hint: 'h1', why: 'A skewer: check the King, he moves away, and you take the Queen behind him.' },
  { id: 'p1', cat: 'Promotion', fen: '7k/1P6/8/8/8/8/8/6K1 w - - 0 1', goal: 'promote',
    hint: 'b7', why: 'New Queen, with check!' },
  { id: 'p2', cat: 'Promotion', fen: '8/5P1k/8/8/8/8/8/6K1 w - - 0 1', goal: 'promote',
    hint: 'f7', why: 'Make a Queen. (A Knight on f8 would also give check, but the Queen is stronger.)' },
];

// One tip a day on the Learn screen.
export const TIPS = [
  'Control the centre: pawns and pieces on the middle squares (d4, e4, d5, e5) are strongest.',
  'Bring out your Knights and Bishops early. They are your first helpers.',
  'Castle early to keep your King safe.',
  'Do not move the same piece twice in the opening if you can help it.',
  'Do not bring your Queen out too early. She can get chased by smaller pieces.',
  'Before every move, ask: what is my opponent threatening?',
  'Before you capture, check: is that piece guarded?',
  'Checks, captures and threats: look at these first, for both players.',
  'A Knight on the edge of the board is weak. "A Knight on the rim is dim!"',
  'Rooks love open lines with no pawns in the way.',
  'Two Rooks on the same row or column are very strong together.',
  'Count the points: pawn 1, Knight 3, Bishop 3, Rook 5, Queen 9.',
  'When you are ahead, trade pieces. When you are behind, avoid trades.',
  'In the endgame, your King becomes a fighter. Bring him to the centre.',
  'Push your extra pawn: a pawn that reaches the end becomes a Queen.',
  'When you are winning, watch out for stalemate! Leave the King a square.',
  'Knights and pawns can fork two pieces at once. Look for forks!',
  'If you find a good move, look for a better one.',
  'Take your time. Chess is not a race.',
  'Every great player lost many games. Each loss teaches you something!',
];
