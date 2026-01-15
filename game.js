(() => {
  const SEAL = "assets/raven-seal.png";
  const P1 = "assets/feather.png";
  const P2 = "assets/cookie.png";

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
  const difficultySelect = document.getElementById("difficultySelect");

  const firstFeather = document.getElementById("firstFeather");
  const firstCookie = document.getElementById("firstCookie");

  let board, current, gameOver;
  let firstPlayer = "P1";

  firstFeather.onclick = () => setFirst("P1");
  firstCookie.onclick = () => setFirst("P2");

  function setFirst(p){
    firstPlayer = p;
    firstFeather.classList.toggle("active", p==="P1");
    firstCookie.classList.toggle("active", p==="P2");
  }

  btnStart.onclick = start;
  btnReset.onclick = reset;
  btnHome.onclick = home;
  btnExit.onclick = home;

  function home(){
    screenGame.classList.add("hidden");
    screenHome.classList.remove("hidden");
  }

  function start(){
    screenHome.classList.add("hidden");
    screenGame.classList.remove("hidden");
    reset();
  }

  function reset(){
    board = Array(9).fill(null);
    current = firstPlayer;
    gameOver = false;
    build();
    announce(`${label()} turn`);
    if(modeSelect.value==="solo" && current==="P2") aiMove();
  }

  function build(){
    boardEl.innerHTML="";
    for(let i=0;i<9;i++){
      const c=document.createElement("div");
      c.className="card";
      c.innerHTML=`
        <div class="card-inner">
          <div class="face"><img src="${SEAL}"></div>
          <div class="face back"><img></div>
        </div>`;
      c.onclick=()=>pick(i,c);
      boardEl.appendChild(c);
    }
  }

  function pick(i,card){
    if(gameOver||board[i]) return;
    if(modeSelect.value==="solo" && current==="P2") return;

    place(i,card,current);
    if(check()) return;
    current=current==="P1"?"P2":"P1";
    announce(`${label()} turn`);
    if(modeSelect.value==="solo" && current==="P2") aiMove();
  }

  function place(i,card,p){
    board[i]=p;
    card.classList.add("flipped");
    card.querySelector(".back img").src = p==="P1"?P1:P2;
  }

  function aiMove(){
    setTimeout(()=>{
      const empties=board.map((v,i)=>v?null:i).filter(v=>v!==null);
      const i=empties[Math.floor(Math.random()*empties.length)];
      place(i,boardEl.children[i],"P2");
      if(check()) return;
      current="P1";
      announce("Your turn");
    },420);
  }

  function check(){
    const wins=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for(const [a,b,c] of wins){
      if(board[a] && board[a]===board[b] && board[a]===board[c]){
        announce(`${board[a]==="P1"?"Feather":"Cookie"} wins!`);
        sr.textContent="Game over";
        gameOver=true;
        return true;
      }
    }
    if(board.every(Boolean)){
      announce("It’s a tie");
      gameOver=true;
      return true;
    }
    return false;
  }

  function announce(t){ statusEl.textContent=t; }

  function label(){
    if(modeSelect.value==="solo") return current==="P1"?"Your":"Raven’s";
    return current==="P1"?"Feather’s":"Cookie’s";
  }

  setFirst("P1");
})();
