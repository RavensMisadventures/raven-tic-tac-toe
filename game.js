(() => {
  // --- ASSETS (your repo paths) ---
  const FALLBACK_SEAL = "assets/raven-seal.png";
  const P1_ICON_SRC = "assets/feather.png";
  const P2_ICON_SRC = "assets/cookie.png";

  // Optional per-level seals (auto-detected if present):
  // assets/seal-level1.png, assets/seal-level2.png, assets/seal-level3.png
  const levelSealPath = (level) => `assets/seal-level${level}.png`;

  // --- DOM ---
  const screenHome = document.getElementById("screenHome");
  const screenGame = document.getElementById("screenGame");

  const modeSelect = document.getElementById("modeSelect");
  const difficultySelect = document.getElementById("difficultySelect");
  const levelSelect = document.getElementById("levelSelect");

  const firstFeather = document.getElementById("firstFeather");
  const firstCookie = document.getElementById("firstCookie");

  const btnStart = document.getElementById("btnStart");
  const btnReset = document.getElementById("btnReset");
  const btnHome = document.getElementById("btnHome");
  const btnExit = document.getElementById("btnExit");

  const toggleSound = document.getElementById("toggleSound");
  const toggleHaptics = document.getElementById("toggleHaptics");

  const boardEl = document.getElementById("board");
  const statusEl = document.getElementById("status");
  const srAnnounceEl = document.getElementById("srAnnounce");

  // --- STATE ---
  const PREFS_KEY = "raven_ttt_v2_prefs";
  const prefs = loadPrefs();

  toggleSound.checked = prefs.sound;
  toggleHaptics.checked = prefs.haptics;

  modeSelect.value = prefs.mode;
  difficultySelect.value = prefs.difficulty;
  levelSelect.value = String(prefs.level);

  let firstPlayer = prefs.firstPlayer; // "P1" or "P2"
  setFirstButtons();

  // game runtime
  let board = Array(9).fill(null); // null | "P1" | "P2"
  let current = "P1";
  let gameOver = false;
  let sealSrc = FALLBACK_SEAL;

  // Solo settings
  // Player = Feather (P1). Raven = Cookie (P2).
  const humanIs = "P1";
  const ravenIs = "P2";

  // --- EVENTS ---
  toggleSound.addEventListener("change", () => {
    prefs.sound = !!toggleSound.checked;
    savePrefs(prefs);
    if (prefs.sound) initAudio();
    playTone("toggle");
  });

  toggleHaptics.addEventListener("change", () => {
    prefs.haptics = !!toggleHaptics.checked;
    savePrefs(prefs);
    gentleVibe(10);
  });

  modeSelect.addEventListener("change", () => {
    prefs.mode = modeSelect.value;
    savePrefs(prefs);
  });

  difficultySelect.addEventListener("change", () => {
    prefs.difficulty = difficultySelect.value;
    savePrefs(prefs);
  });

  levelSelect.addEventListener("change", () => {
    prefs.level = clampLevel(parseInt(levelSelect.value, 10));
    savePrefs(prefs);
  });

  firstFeather.addEventListener("click", () => {
    firstPlayer = "P1";
    prefs.firstPlayer = "P1";
    savePrefs(prefs);
    setFirstButtons();
    playTone("place");
    gentleVibe(10);
  });

  firstCookie.addEventListener("click", () => {
    firstPlayer = "P2";
    prefs.firstPlayer = "P2";
    savePrefs(prefs);
    setFirstButtons();
    playTone("place");
    gentleVibe(10);
  });

  btnStart.addEventListener("click", () => startGame());
  btnReset.addEventListener("click", () => resetGame());
  btnHome.addEventListener("click", () => goHome());
  btnExit.addEventListener("click", () => goHome());

  // --- UI HELPERS ---
  function showHome() {
    screenHome.classList.remove("hidden");
    screenGame.classList.add("hidden");
  }

  function showGame() {
    screenHome.classList.add("hidden");
    screenGame.classList.remove("hidden");
  }

  function announcePolite(text) {
    statusEl.textContent = text;
  }

  function announceAssertive(text) {
    // for screen readers
    srAnnounceEl.textContent = "";
    setTimeout(() => { srAnnounceEl.textContent = text; }, 10);
  }

  function setFirstButtons() {
    firstFeather.classList.toggle("active", firstPlayer === "P1");
    firstCookie.classList.toggle("active", firstPlayer === "P2");
  }

  // --- BOARD BUILD ---
  function buildBoard() {
    boardEl.innerHTML = "";
    for (let i = 0; i < 9; i++) {
      const card = document.createElement("div");
      card.className = "card";
      card.dataset.index = String(i);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("role", "gridcell");
      btn.setAttribute("aria-label", `Cell ${i + 1}`);

      const inner = document.createElement("div");
      inner.className = "card-inner";

      const front = document.createElement("div");
      front.className = "face front";
      const frontImg = document.createElement("img");
      frontImg.src = sealSrc;
      frontImg.alt = "Raven seal";
      front.appendChild(frontImg);

      const back = document.createElement("div");
      back.className = "face back";
      const backImg = document.createElement("img");
      backImg.src = "";
      backImg.alt = "Player icon";
      back.appendChild(backImg);

      inner.appendChild(front);
      inner.appendChild(back);
      btn.appendChild(inner);
      card.appendChild(btn);

      btn.addEventListener("click", () => onPick(i, card));
      boardEl.appendChild(card);
    }
  }

  // --- GAME FLOW ---
  function startGame() {
    // Save current home choices so "Let's Play" always uses them.
    prefs.mode = modeSelect.value;
    prefs.difficulty = difficultySelect.value;
    prefs.level = clampLevel(parseInt(levelSelect.value, 10));
    prefs.firstPlayer = firstPlayer;
    savePrefs(prefs);

    const chosenLevel = prefs.level;
    sealSrc = FALLBACK_SEAL;

    // Try to use per-level seal if present; otherwise fallback.
    const test = new Image();
    test.onload = () => {
      sealSrc = levelSealPath(chosenLevel);
      showGame();
      initGameRound();
    };
    test.onerror = () => {
      sealSrc = FALLBACK_SEAL;
      showGame();
      initGameRound();
    };
    test.src = levelSealPath(chosenLevel);
  }

  function initGameRound() {
    board = Array(9).fill(null);
    gameOver = false;
    current = firstPlayer;

    buildBoard();

    announcePolite(currentLabel() + " turn.");
    announceAssertive("Game started. " + currentLabel() + " goes first.");

    // if solo + Raven starts, make Raven move gently
    maybeRavenMove();
  }

  function resetGame() {
    if (screenGame.classList.contains("hidden")) return;
    initGameRound();
    playTone("reset");
    gentleVibe(10);
  }

  function goHome() {
    showHome();
    statusEl.textContent = "Tap a card to begin.";
    srAnnounceEl.textContent = "";
  }

  function onPick(i, cardEl) {
    if (gameOver) return;

    // block clicks if it's Raven's turn in solo mode
    if (prefs.mode === "solo" && current === ravenIs) {
      playTone("nope");
      gentleVibe(8);
      return;
    }

    // ignore already played
    if (board[i] !== null) {
      playTone("nope");
      gentleVibe(8);
      return;
    }

    if (prefs.sound) initAudio();

    placeMove(i, current, cardEl);

    const outcome = checkOutcome();
    if (outcome.done) return;

    // switch turns
    current = (current === "P1") ? "P2" : "P1";
    announcePolite(currentLabel() + " turn.");

    maybeRavenMove();
  }

  function placeMove(i, who, cardEl) {
    board[i] = who;

    const backImg = cardEl.querySelector(".back img");
    backImg.src = (who === "P1") ? P1_ICON_SRC : P2_ICON_SRC;

    cardEl.classList.add("flipped");
    cardEl.querySelector("button").setAttribute(
      "aria-label",
      `Cell ${i + 1} selected by ${who === "P1" ? "Feather" : "Cookie"}`
    );

    playTone("place");
    gentleVibe(12);
  }

  function checkOutcome() {
    const winner = getWinner(board);
    if (winner) {
      gameOver = true;

      const msg = (winner === "P1") ? "Feather wins! ✨" : "Cookie wins! ✨";
      announcePolite(msg);
      announceAssertive(msg + " Game over.");

      playTone("win");
      gentleVibe(18);
      return { done: true };
    }

    if (board.every(v => v !== null)) {
      gameOver = true;
      const msg = "It’s a cozy tie. Want to play again?";
      announcePolite(msg);
      announceAssertive("Tie game. Game over.");

      playTone("draw");
      gentleVibe(14);
      return { done: true };
    }

    return { done: false };
  }

  // --- RAVEN AI ---
  function maybeRavenMove() {
    if (prefs.mode !== "solo") return;
    if (gameOver) return;
    if (current !== ravenIs) return;

    setTimeout(() => {
      if (gameOver) return;
      const move = chooseRavenMove(board, prefs.difficulty);
      if (move == null) return;

      const cardEl = boardEl.querySelector(`.card[data-index="${move}"]`);
      if (!cardEl) return;

      placeMove(move, ravenIs, cardEl);

      const outcome = checkOutcome();
      if (outcome.done) return;

      current = humanIs;
      announcePolite("Your turn.");
      announceAssertive("Raven moved. Your turn.");
    }, 420);
  }

  function chooseRavenMove(b, difficulty) {
    const empties = emptyIndices(b);
    if (empties.length === 0) return null;

    // Difficulty meanings:
    // play  = mostly random
    // learn = blocks obvious wins often, otherwise gentle/random
    // win   = best play (minimax)
    if (difficulty === "play") return pickRandom(empties);

    if (difficulty === "learn") {
      const r = Math.random();

      const block = findImmediateWin(b, humanIs);
      if (block != null && r < 0.60) return block;

      const soft = pickSoftSmart(empties);
      if (soft != null && r < 0.85) return soft;

      return pickRandom(empties);
    }

    return bestMoveMinimax(b, ravenIs, humanIs);
  }

  function pickSoftSmart(empties) {
    if (empties.includes(4)) return 4;
    const corners = [0,2,6,8].filter(i => empties.includes(i));
    if (corners.length) return pickRandom(corners);
    const edges = [1,3,5,7].filter(i => empties.includes(i));
    if (edges.length) return pickRandom(edges);
    return null;
  }

  function findImmediateWin(b, player) {
    const empties = emptyIndices(b);
    for (const idx of empties) {
      const copy = b.slice();
      copy[idx] = player;
      if (getWinner(copy) === player) return idx;
    }
    return null;
  }

  function bestMoveMinimax(b, ai, human) {
    const empties = emptyIndices(b);
    let bestScore = -Infinity;
    let bestIdx = empties[0];

    for (const idx of empties) {
      const copy = b.slice();
      copy[idx] = ai;
      const score = minimax(copy, false, ai, human);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    }
    return bestIdx;
  }

  function minimax(state, isAiTurn, ai, human) {
    const w = getWinner(state);
    if (w === ai) return 10;
    if (w === human) return -10;
    if (state.every(v => v !== null)) return 0;

    const empties = emptyIndices(state);

    if (isAiTurn) {
      let best = -Infinity;
      for (const idx of empties) {
        const next = state.slice();
        next[idx] = ai;
        best = Math.max(best, minimax(next, false, ai, human) - 1);
      }
      return best;
    } else {
      let best = Infinity;
      for (const idx of empties) {
        const next = state.slice();
        next[idx] = human;
        best = Math.min(best, minimax(next, true, ai, human) + 1);
      }
      return best;
    }
  }

  // --- GAME LOGIC ---
  function getWinner(b) {
    const lines = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6],
    ];
    for (const [a,c,d] of lines) {
      if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
    }
    return null;
  }

  function emptyIndices(b) {
    const out = [];
    for (let i = 0; i < b.length; i++) if (b[i] === null) out.push(i);
    return out;
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function currentLabel() {
    if (prefs.mode === "solo") {
      return current === humanIs ? "Your" : "Raven’s";
    }
    return current === "P1" ? "Feather’s" : "Cookie’s";
  }

  function clampLevel(n) {
    if (!Number.isFinite(n)) return 1;
    return Math.max(1, Math.min(3, n));
  }

  // --- HAPTICS (safe + optional) ---
  function gentleVibe(ms) {
    if (!prefs.haptics) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("vibrate" in navigator)) return;
    navigator.vibrate(Math.max(0, Math.min(ms, 18)));
  }

  // --- SOUND (gentle WebAudio tones) ---
  let audioCtx = null;

  function initAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      audioCtx = null;
    }
  }

  function playTone(type) {
    if (!prefs.sound) return;
    initAudio();
    if (!audioCtx) return;

    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }

    const now = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();

    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.055, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    o.type = "sine";

    const freq = (() => {
      switch (type) {
        case "place": return 523.25;
        case "win":   return 659.25;
        case "draw":  return 392.00;
        case "reset": return 440.00;
        case "nope":  return 220.00;
        case "toggle":return 349.23;
        default:      return 440.00;
      }
    })();

    o.frequency.setValueAtTime(freq, now);

    o.connect(g);
    g.connect(audioCtx.destination);

    o.start(now);
    o.stop(now + 0.2);
  }

  // --- PREFS ---
  function loadPrefs() {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (!raw) {
        return {
          sound: true,
          haptics: true,
          mode: "solo",
          difficulty: "learn",
          level: 1,
          firstPlayer: "P1",
        };
      }
      const p = JSON.parse(raw);
      return {
        sound: typeof p.sound === "boolean" ? p.sound : true,
        haptics: typeof p.haptics === "boolean" ? p.haptics : true,
        mode: (p.mode === "two" ? "two" : "solo"),
        difficulty: (p.difficulty === "win" || p.difficulty === "play") ? p.difficulty : "learn",
        level: clampLevel(parseInt(p.level, 10) || 1),
        firstPlayer: (p.firstPlayer === "P2") ? "P2" : "P1",
      };
    } catch {
      return {
        sound: true,
        haptics: true,
        mode: "solo",
        difficulty: "learn",
        level: 1,
        firstPlayer: "P1",
      };
    }
  }

  function savePrefs(p) {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch {}
  }

  // --- INIT ---
  showHome();
})();
