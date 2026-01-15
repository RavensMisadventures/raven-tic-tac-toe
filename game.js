// game.js
const startScreen = document.getElementById("start-screen");
const gameScreen = document.getElementById("game-screen");
const startBtn = document.getElementById("startBtn");
const homeBtn = document.getElementById("homeBtn");

const firstSelect = document.getElementById("firstPlayerSelect");
const soundBtn = document.getElementById("soundToggle");
const buzzBtn = document.getElementById("buzzToggle");
const boardEl = document.getElementById("board");

let soundOn = true;
let buzzOn = false;
let currentPlayer = "player";

const cells = Array(9).fill(null);

startBtn.addEventListener("click", () => {
  let first = firstSelect.value;
  if (first === "random") first = Math.random() < 0.5 ? "player" : "raven";
  currentPlayer = first;
  startGame();
});

homeBtn.addEventListener("click", () => {
  gameScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");
});

function startGame() {
  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  boardEl.innerHTML = "";
  cells.fill(null);

  for (let i = 0; i < 9; i++) {
    const cell = document.createElement("button");
    cell.className = "cell";
    cell.addEventListener("click", () => makeMove(i, cell));
    boardEl.appendChild(cell);
  }

  if (currentPlayer === "raven") {
    setTimeout(ravenMove, 400);
  }
}

function makeMove(i, cell) {
  if (cells[i]) return;
  cells[i] = currentPlayer;
  cell.textContent = currentPlayer === "player" ? "❌" : "⭕";
  togglePlayer();
}

function togglePlayer() {
  currentPlayer = currentPlayer === "player" ? "raven" : "player";
  if (currentPlayer === "raven") {
    setTimeout(ravenMove, 400);
  }
}

function ravenMove() {
  const empty = cells.map((v, i) => v ? null : i).filter(v => v !== null);
  if (empty.length === 0) return;
  const choice = empty[Math.floor(Math.random() * empty.length)];
  const cell = boardEl.children[choice];
  makeMove(choice, cell);
}
