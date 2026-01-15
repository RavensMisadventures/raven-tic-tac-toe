(() => {
  // --- ASSETS ---
  const SEAL = "assets/raven-seal.png";
  const P1 = "assets/feather.png";
  const P2 = "assets/cookie.png";

  // --- DOM ---
  const boardEl = document.getElementById("board");
  const statusEl = document.getElementById("status");
  const sr = document.getElementById("srAnnounce");

  const screenHome = document.getElementById("screenHome");
  const screenGame = document.getElementById("screenGame");

  const btnStart = document.getElementById("btnStart");
  const btnReset = document.getElementById("btnReset");
  const btnHome = document.getElementById("btnHome");
  const btnExit = document.getElementById("btnExit");

  const modeSelect = document.getElementById("modeSelect");
  const difficultySelect = document.getElementById("difficultySelect"); // reserved for future

  const firstFeather = document.getElementById("firstFeather");
  const firstCookie = document.getElementById("firstCookie");

  const toggleSound = document.getElementById("toggleSound");
  const toggleHaptics = document.getElementById("toggleHaptics");

  // Overlay
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayMsg = document.getElementById("overlayMsg");
  const btnYes = document.getElementById("btnOverlayYes");
  const btnNo = document.getElementById("btnOverlayNo");

  // --- PREFS ---
  const PREFS_KEY = "raven_ttt_prefs_v4";
  const prefs = loadPrefs();

  // Apply prefs to UI
  if (toggleSound) toggleSound.checked = prefs.sound;
  if (toggleHaptics) toggleHaptics.checked = prefs.vibrate;
  if (modeSelect) modeSelect.value = prefs.mode;
  if (difficultySelect) difficultySelect.value = prefs.difficulty;

  // --- STATE ---
  let board = Array(9).fill(null);
  let current = prefs.firstPlayer; // "P1" or "P2"
  let gameOver = false;
  let firstPlayer = prefs.firstPlayer;

  setFirstButtons();

  // --- SOUND (WebAudio) ---
  let audioCtx = null;

  function ensureAudio() {
    if (!prefs.sound) return;
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      audioCtx = null;
    }
  }

  function resumeAudioIfNeeded() {
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
  }

  function tone(freq, duration = 0.16, peak = 0.045) {
    if (!prefs.sound) return;
    ensureAudio();
    if (!audioCtx) return;
    resumeAudioIfNeeded();

    const now = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();

    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(peak, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    o.type = "sine";
    o.frequency.setValueAtTime(freq, now);

    o.connect(g);
    g.connect(audioCtx.destination);

    o.start(now);
    o.stop(now + duration + 0.02);
  }

  function playTone(type) {
    switch (type) {
      case "place":  tone(494.0, 0.16, 0.042); break; // B4
      case "toggle": tone(349.2, 0.14, 0.038); break; // F4
      case "reset":  tone(440.0, 0.16, 0.040); break; // A4
      case "nope":   tone(220.0, 0.14, 0.028); break; // A3
      case "draw":   tone(392.0, 0.18, 0.040); break; // G4
      case "win":
        tone(523.25, 0.16, 0.040);                 // C5
        setTimeout(() => tone(659.25, 0.18, 0.040), 110); // E5
        break;
      default: tone(440.0, 0.16, 0.040);
    }
  }

  function primeAudioFromGesture() {
    // Must be called inside a click/tap handler to allow audio.
    if (!prefs.sound) return;
    ensureAudio();
    resumeAudioIfNeeded();
  }

  // --- VIBRATION ---
  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function gentleVibe(ms) {
    if (!prefs.vibrate) return;
    if (reducedMotion()) return;
    if (!("vibrate" in navigator)) return;
    navigator.vibrate(Math.max(0, Math.min(ms, 18)));
  }

  // --- UI EVENTS ---
  if (toggleSound) {
    toggleSound.addEventListener("change", () => {
      prefs.sound = !!toggleSound.checked;
      savePrefs(prefs);
      primeAudioFromGesture();
      playTone("toggle");
    });
  }

  if (toggleHaptics) {
    toggleHaptics.addEventListener("change", () => {
      prefs.vibrate = !!toggleHaptics.checked;
      savePrefs(prefs);
      gentleVibe(10);
    });
  }

  if (modeSelect) {
    modeSelect.addEventListener("change", () => {
      prefs.mode = (modeSelect.value === "two") ? "two" : "solo";
      savePrefs(prefs);
    });
  }

  if (difficultySelect) {
    difficultySelect.addEventListener("change", () => {
      const v = difficultySelect.value;
      prefs.difficulty = (v === "play" || v === "win") ? v : "learn";
      savePrefs(prefs);
    });
  }

  firstFeather.onclick = () => {
    primeAudioFromGesture();
    setFirst("P1");
    playTone("place");
    gentleVibe(10);
  };

  firstCookie.onclick = () => {
    primeAudioFromGesture();
    setFirst("P2");
    playTone("place");
    gentleVibe(10);
  };

  btnStart.onclick = () => {
    primeAudioFromGesture();
    start();
  };

  btnReset.onclick = () => {
    primeAudioFromGesture();
    reset();
    playTone("reset");
    gentleVibe(10);
  };

  btnHome.onclick = () => {
    primeAudioFromGesture();
    home();
  };

  btnExit.onclick = () => {
    primeAudioFromGesture();
    home();
  };

  btnYes.onclick = () => {
    primeAudioFromGesture();
    hideOverlay();
    reset();
    playTone("reset");
    gentleVibe(10);
  };

  btnNo.onclick = () => {
    primeAudioFromGesture();
    hideOverlay();
    home();
  };

  document.addEventListener("keydown", (e) => {
    if (!overlay || overlay.classList.contains("hidden")) return;
    if (e.key === "Escape") {
      hideOverlay();
      home();
    }
  });

  // --- NAV ---
  function start() {
    screenHome.classList.add("hidden");
    screenGame.classList.remove("hidden");
    reset();
  }

  function home() {
    hideOverlay();
    screenGame.classList.add("hidden");
    screenHome.classList.remove("hidden");
  }

  // --- GAME ---
  function reset() {
    hideOverlay();
    board = Array(9).fill(null);
    gameOver = false;
    current = firstPlayer;
    buildBoard();
    announce(label() + " turn");
    if (prefs.mode === "solo" && current === "P2") aiMove();
  }

  function buildBoard() {
    boardEl.innerHTML = "";
    for (let i = 0; i < 9; i++) {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="card-inner">
          <div class="face"><img src="${SEAL}" alt="Raven seal"></div>
          <div class="face back"><img alt=""></div>
        </div>
      `;
      card.onclick = () => pick(i, card);
      boardEl.appendChild(card);
    }
  }

  function pick(i, card) {
    primeAudioFromGesture();

    if (gameOver || board[i]) {
      playTone("nope");
      gentleVibe(8);
      return;
    }

    if (prefs.mode === "solo" && current === "P2") {
      playTone("nope");
      gentleVibe(8);
      return;
    }

    place(i, card, current);

    if (checkEnd()) return;

    current = (current === "P1") ? "P2" : "P1";
    announce(label() + " turn");

    if (prefs.mode === "solo" && current === "P2") aiMove();
  }

  function place(i, card, who) {
    board[i] = who;
    card.classList.add("flipped");
    const backImg = card.querySelector(".back img");
    backImg.src = (who === "P1") ? P1 : P2;
    backImg.alt = (who === "P1") ? "Feather" : "Cookie";
    playTone("place");
    gentleVibe(12);
  }

  function aiMove() {
    setTimeout(() => {
      if (gameOver) return;

      const empties = board.map((v, idx) => (v ? null : idx)).filter(v => v !== null);
      const idx = empties[Math.floor(Math.random() * empties.length)];

      place(idx, boardEl.children[idx], "P2");

      if (checkEnd()) return;

      current = "P1";
      announce("Your turn");
      sr.textContent = "Raven moved. Your turn.";
    }, 420);
  }

  function checkEnd() {
    const wins = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];

    for (const [a,b,c] of wins) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        gameOver = true;

        if (prefs.mode === "solo") {
          showOverlay(board[a] === "P1" ? "Great Job, You Win" : "Raven wins", "Play again?");
        } else {
          showOverlay(board[a] === "P1" ? "Feather wins" : "Cookie wins", "Play again?");
        }

        playTone("win");
        gentleVibe(18);
        return true;
      }
    }

    if (board.every(Boolean)) {
      gameOver = true;
      showOverlay("It’s a Tie", "Play again?");
      playTone("draw");
      gentleVibe(14);
      return true;
    }

    return false;
  }

  // --- OVERLAY ---
  function showOverlay(title, msg) {
    overlayTitle.textContent = title;
    overlayMsg.textContent = msg;
    overlay.classList.remove("hidden");
    statusEl.textContent = title;
    sr.textContent = title + ". Play again?";
    setTimeout(() => btnYes.focus(), 0);
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  // --- FIRST PLAYER ---
  function setFirst(p) {
    firstPlayer = p;
    prefs.firstPlayer = p;
    savePrefs(prefs);
    setFirstButtons();
  }

  function setFirstButtons() {
    firstFeather.classList.toggle("active", firstPlayer === "P1");
    firstCookie.classList.toggle("active", firstPlayer === "P2");
  }

  function label() {
    if (prefs.mode === "solo") return (current === "P1") ? "Your" : "Raven’s";
    return (current === "P1") ? "Feather’s" : "Cookie’s";
  }

  function announce(text) {
    statusEl.textContent = text;
  }

  // --- PREFS I/O ---
  function loadPrefs() {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (!raw) {
        return { sound: true, vibrate: true, mode: "solo", difficulty: "learn", firstPlayer: "P1" };
      }
      const p = JSON.parse(raw);
      return {
        sound: typeof p.sound === "boolean" ? p.sound : true,
        vibrate: typeof p.vibrate === "boolean" ? p.vibrate : true,
        mode: p.mode === "two" ? "two" : "solo",
        difficulty: (p.difficulty === "play" || p.difficulty === "win") ? p.difficulty : "learn",
        firstPlayer: p.firstPlayer === "P2" ? "P2" : "P1"
      };
    } catch {
      return { sound: true, vibrate: true, mode: "solo", difficulty: "learn", firstPlayer: "P1" };
    }
  }

  function savePrefs(p) {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch {}
  }

  // --- INIT ---
  // Leave on Home screen by default (your index.html already shows Home first).
})();