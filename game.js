(() => {
  const boardEl = document.getElementById("board");
  const modeEl = document.getElementById("mode");
  const difficultyEl = document.getElementById("difficulty");
  const newGameBtn = document.getElementById("newGame");
  const statusLine = document.getElementById("statusLine");
  const hintLine = document.getElementById("hintLine");
  const turnPill = document.getElementById("turnPill");
  const tokenBtns = Array.from(document.querySelectorAll(".tokenBtn"));

  const TOKEN_PATHS = {
    feather: "assets/feather.png",
    cookie: "assets/cookie.png",
  };

  // State
  let cells = Array(9).fill(null); // null | 1 | 2
  let gameOver = false;
  let currentPlayer = 1; // 1 or 2
  let p1Token = "feather";
  let p2Token = "cookie";

  function mode() { return modeEl.value; } // cpu | pvp
  function difficulty() { return difficultyEl.value; } // gentle | smart

  function buildBoard() {
    boardEl.innerHTML = "";
    for (let i = 0; i < 9; i++) {
      const btn = document.createElement("button");
      btn.className = "cell";
      btn.type = "button";
      btn.dataset.idx = String(i);
      btn.setAttribute("aria-label", `Square ${i + 1}, empty`);
      btn.addEventListener("click", () => onMove(i));
      boardEl.appendChild(btn);
    }
  }

  function imgForPlayer(player) {
    const token = (player === 1) ? p1Token : p2Token;
    const img = document.createElement("img");
    img.src = TOKEN_PATHS[token];
    img.alt = token === "feather" ? "Feather token" : "Cookie token";
    img.className = "tokenImg";
    return img;
  }

  function setStatus(html, hint = "") {
    statusLine.innerHTML = html;
    hintLine.textContent = hint;
  }

  function updateTurn() {
    if (gameOver) return;
    if (mode() === "cpu") {
      turnPill.textContent = (currentPlayer === 1) ? "Turn: You" : "Turn: Computer";
    } else {
      turnPill.textContent = `Turn: Player ${currentPlayer}`;
    }
  }

  function render() {
    const btns = boardEl.querySelectorAll(".cell");
    btns.forEach((btn, i) => {
      btn.innerHTML = "";
      const v = cells[i];
      btn.disabled = gameOver || v !== null;
      btn.setAttribute("aria-label", `Square ${i + 1}, ${v === null ? "empty" : "filled"}`);
      if (v !== null) btn.appendChild(imgForPlayer(v));
    });
    updateTurn();
  }

  function resetGame() {
    cells = Array(9).fill(null);
    gameOver = false;
    currentPlayer = 1;
    clearWinGlow();
    setStatus("<strong>Welcome!</strong> Tap a square to start.", "Big taps. Calm play. You’ve got this.");
    render();
  }

  function clearWinGlow() {
    boardEl.querySelectorAll(".cell").forEach(c => c.classList.remove("winGlow"));
  }

  function winningLine(board) {
    const W = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];
    for (const [a,b,c] of W) {
      if (board[a] !== null && board[a] === board[b] && board[a] === board[c]) {
        return [a,b,c];
      }
    }
    return null;
  }

  function boardFull(board) {
    return board.every(x => x !== null);
  }

  function endWin(line, winner) {
    gameOver = true;
    const btns = boardEl.querySelectorAll(".cell");
    line.forEach(i => btns[i].classList.add("winGlow"));

    if (mode() === "cpu") {
      if (winner === 1) {
        setStatus("<strong>You did it!</strong> Raven’s cozy path is found ✨", "Play again whenever you’re ready.");
      } else {
        setStatus("<strong>Nice try.</strong> Let’s gently try again ✨", "Tip: Try the center square, or block two-in-a-row.");
      }
      turnPill.textContent = "Finished";
    } else {
      setStatus(`<strong>Player ${winner} did it!</strong> Cozy win ✨`, "Play again whenever you’re ready.");
      turnPill.textContent = "Finished";
    }
    render();
  }

  function endDraw() {
    gameOver = true;
    setStatus("<strong>Cozy tie.</strong> The search continues ✨", "Try again — there’s no rush.");
    turnPill.textContent = "Finished";
    render();
  }

  function onMove(idx) {
    if (gameOver) return;
    if (cells[idx] !== null) return;

    // Only allow human to play in CPU mode on player 1 turn
    if (mode() === "cpu" && currentPlayer !== 1) return;

    cells[idx] = currentPlayer;

    const line = winningLine(cells);
    if (line) return endWin(line, currentPlayer);
    if (boardFull(cells)) return endDraw();

    currentPlayer = (currentPlayer === 1) ? 2 : 1;
    setStatus("<strong>Good job!</strong> Keep going ✨", "");
    render();

    if (mode() === "cpu" && currentPlayer === 2) {
      window.setTimeout(cpuMove, 450);
    }
  }

  // --- CPU ---
  function cpuMove() {
    if (gameOver) return;

    let move;
    if (difficulty() === "gentle") {
      move = gentleMove(cells);
    } else {
      move = bestMoveMinimax(cells, 2);
    }

    if (move === null || move === undefined) return;

    cells[move] = 2;

    const line = winningLine(cells);
    if (line) return endWin(line, 2);
    if (boardFull(cells)) return endDraw();

    currentPlayer = 1;
    setStatus("<strong>Your turn.</strong> Tap a square ✨", "");
    render();
  }

  function availableMoves(board) {
    const moves = [];
    for (let i = 0; i < 9; i++) if (board[i] === null) moves.push(i);
    return moves;
  }

  function gentleMove(board) {
    // Gentle: sometimes random, sometimes blocks obvious win, sometimes takes win
    const moves = availableMoves(board);
    if (moves.length === 0) return null;

    // take a winning move if available
    for (const m of moves) {
      const b = board.slice();
      b[m] = 2;
      if (winningLine(b)) return m;
    }

    // block player win if obvious
    for (const m of moves) {
      const b = board.slice();
      b[m] = 1;
      if (winningLine(b)) return m;
    }

    // otherwise prefer center/corners a bit, but not always
    const preferred = [4,0,2,6,8,1,3,5,7].filter(i => board[i] === null);
    const pickFrom = (Math.random() < 0.7 && preferred.length) ? preferred : moves;
    return pickFrom[Math.floor(Math.random() * pickFrom.length)];
  }

  function scoreTerminal(board) {
    const line = winningLine(board);
    if (!line) return null;
    const winner = board[line[0]];
    if (winner === 2) return 10;
    if (winner === 1) return -10;
    return 0;
  }

  function bestMoveMinimax(board, player) {
    // player: 2 is CPU, 1 is human
    const terminal = scoreTerminal(board);
    if (terminal !== null) return null;

    let bestScore = -Infinity;
    let best = null;

    for (const m of availableMoves(board)) {
      const b = board.slice();
      b[m] = 2;
      const s = minimax(b, 1, 0);
      if (s > bestScore) {
        bestScore = s;
        best = m;
      }
    }
    return best;
  }

  function minimax(board, player, depth) {
    const terminal = scoreTerminal(board);
    if (terminal !== null) return terminal - depth; // prefer quicker wins
    if (boardFull(board)) return 0;

    const moves = availableMoves(board);

    if (player === 2) {
      let best = -Infinity;
      for (const m of moves) {
        const b = board.slice();
        b[m] = 2;
        best = Math.max(best, minimax(b, 1, depth + 1));
      }
      return best;
    } else {
      let best = Infinity;
      for (const m of moves) {
        const b = board.slice();
        b[m] = 1;
        best = Math.min(best, minimax(b, 2, depth + 1));
      }
      return best;
    }
  }

  // --- Token selection ---
  function setTokenSelection(token) {
    p1Token = token;
    p2Token = (token === "feather") ? "cookie" : "feather";

    tokenBtns.forEach(btn => {
      const isPressed = btn.dataset.token === token;
      btn.setAttribute("aria-pressed", isPressed ? "true" : "false");
    });

    document.getElementById("tokenNote").textContent =
      `Player 1 uses ${p1Token}. Player 2 gets ${p2Token}.`;

    resetGame();
  }

  tokenBtns.forEach(btn => {
    btn.addEventListener("click", () => setTokenSelection(btn.dataset.token));
  });

  // Controls
  newGameBtn.addEventListener("click", resetGame);
  modeEl.addEventListener("change", resetGame);
  difficultyEl.addEventListener("change", resetGame);

  // Init
  buildBoard();
  setTokenSelection("feather");
})();
