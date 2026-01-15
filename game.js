(() => {
  const SEAL="assets/raven-seal.png";
  const P1="assets/feather.png";
  const P2="assets/cookie.png";

  const boardEl=document.getElementById("board");
  const statusEl=document.getElementById("status");
  const sr=document.getElementById("srAnnounce");

  const screenHome=document.getElementById("screenHome");
  const screenGame=document.getElementById("screenGame");

  const btnStart=document.getElementById("btnStart");
  const btnReset=document.getElementById("btnReset");
  const btnHome=document.getElementById("btnHome");
  const btnExit=document.getElementById("btnExit");

  const modeSelect=document.getElementById("modeSelect");
  const difficultySelect=document.getElementById("difficultySelect");

  const firstFeather=document.getElementById("firstFeather");
  const firstCookie=document.getElementById("firstCookie");

  const btnSound=document.getElementById("btnSound");
  const btnVibrate=document.getElementById("btnVibrate");

  const overlay=document.getElementById("overlay");
  const overlayTitle=document.getElementById("overlayTitle");
  const overlayMsg=document.getElementById("overlayMsg");
  const btnYes=document.getElementById("btnOverlayYes");
  const btnNo=document.getElementById("btnOverlayNo");

  const PREFS_KEY="raven_ttt_prefs_v6";
  const prefs=loadPrefs();

  modeSelect.value=prefs.mode;
  difficultySelect.value=prefs.difficulty;

  btnSound.setAttribute("aria-pressed", String(prefs.sound));
  btnVibrate.setAttribute("aria-pressed", String(prefs.vibrate));

  let firstPlayer=prefs.firstPlayer;
  setFirstButtons();

  let board=Array(9).fill(null);
  let current=firstPlayer;
  let gameOver=false;

  // --- WebAudio ---
  let audioCtx=null;
  function primeAudio(){
    if(!prefs.sound) return;
    try{
      if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)();
      if(audioCtx.state==="suspended") audioCtx.resume().catch(()=>{});
    }catch{}
  }
  function tone(freq, dur=0.12, peak=0.06){
    if(!prefs.sound) return;
    primeAudio();
    if(!audioCtx) return;
    const now=audioCtx.currentTime;
    const o=audioCtx.createOscillator();
    const g=audioCtx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(peak, now+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now+dur);
    o.type="sine";
    o.frequency.setValueAtTime(freq, now);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(now); o.stop(now+dur+0.02);
  }
  function sfx(type){
    if(type==="toggle") tone(392,0.10,0.065);
    else if(type==="place") tone(494,0.12,0.065);
    else if(type==="reset") tone(440,0.12,0.065);
    else if(type==="nope") tone(220,0.10,0.045);
    else if(type==="draw") tone(349.2,0.14,0.065);
    else if(type==="win"){ tone(523.25,0.12,0.065); setTimeout(()=>tone(659.25,0.14,0.065),110); }
    else tone(440,0.12,0.065);
  }

  // --- Vibrate ---
  function gentleVibe(ms){
    if(!prefs.vibrate) return;
    if(!("vibrate" in navigator)) return;
    navigator.vibrate(Math.max(0, Math.min(ms, 25)));
  }

  // Toggle buttons
  btnSound.addEventListener("click", ()=>{
    prefs.sound=!prefs.sound;
    savePrefs(prefs);
    btnSound.setAttribute("aria-pressed", String(prefs.sound));
    // If turning ON, we must prime + play from this click
    if(prefs.sound){ primeAudio(); sfx("toggle"); }
  });

  btnVibrate.addEventListener("click", ()=>{
    prefs.vibrate=!prefs.vibrate;
    savePrefs(prefs);
    btnVibrate.setAttribute("aria-pressed", String(prefs.vibrate));
    gentleVibe(12);
  });

  modeSelect.addEventListener("change", ()=>{
    prefs.mode = modeSelect.value==="two" ? "two" : "solo";
    savePrefs(prefs);
  });

  difficultySelect.addEventListener("change", ()=>{
    const v=difficultySelect.value;
    prefs.difficulty=(v==="play"||v==="win")?v:"learn";
    savePrefs(prefs);
  });

  firstFeather.addEventListener("click", ()=>{ setFirst("P1"); if(prefs.sound) sfx("place"); gentleVibe(10); });
  firstCookie.addEventListener("click", ()=>{ setFirst("P2"); if(prefs.sound) sfx("place"); gentleVibe(10); });

  btnStart.addEventListener("click", ()=>{ primeAudio(); start(); });
  btnReset.addEventListener("click", ()=>{ primeAudio(); reset(); if(prefs.sound) sfx("reset"); gentleVibe(10); });
  btnHome.addEventListener("click", ()=>home());
  btnExit.addEventListener("click", ()=>home());

  btnYes.addEventListener("click", ()=>{ primeAudio(); hideOverlay(); reset(); if(prefs.sound) sfx("reset"); gentleVibe(10); });
  btnNo.addEventListener("click", ()=>{ hideOverlay(); home(); });

  document.addEventListener("keydown",(e)=>{
    if(overlay.classList.contains("hidden")) return;
    if(e.key==="Escape"){ hideOverlay(); home(); }
  });

  function start(){
    screenHome.classList.add("hidden");
    screenGame.classList.remove("hidden");
    reset();
  }
  function home(){
    hideOverlay();
    screenGame.classList.add("hidden");
    screenHome.classList.remove("hidden");
  }

  function reset(){
    hideOverlay();
    board=Array(9).fill(null);
    gameOver=false;
    current=firstPlayer;
    buildBoard();
    announce(label()+" turn");
    if(prefs.mode==="solo" && current==="P2") aiMove();
  }

  function buildBoard(){
    boardEl.innerHTML="";
    for(let i=0;i<9;i++){
      const c=document.createElement("div");
      c.className="card";
      c.innerHTML=`<div class="card-inner">
        <div class="face"><img src="${SEAL}" alt="Raven seal"></div>
        <div class="face back"><img alt=""></div>
      </div>`;
      c.addEventListener("click", ()=>pick(i,c));
      boardEl.appendChild(c);
    }
  }

  function pick(i,card){
    primeAudio();
    if(gameOver || board[i]){ if(prefs.sound) sfx("nope"); gentleVibe(8); return; }
    if(prefs.mode==="solo" && current==="P2"){ if(prefs.sound) sfx("nope"); gentleVibe(8); return; }

    place(i,card,current);
    if(checkEnd()) return;

    current=current==="P1"?"P2":"P1";
    announce(label()+" turn");
    if(prefs.mode==="solo" && current==="P2") aiMove();
  }

  function place(i,card,who){
    board[i]=who;
    card.classList.add("flipped");
    const img=card.querySelector(".back img");
    img.src = who==="P1"?P1:P2;
    img.alt = who==="P1"?"Feather":"Cookie";
    if(prefs.sound) sfx("place");
    gentleVibe(12);
  }

  function aiMove(){
    setTimeout(()=>{
      if(gameOver) return;
      const empties=board.map((v,idx)=>v?null:idx).filter(v=>v!==null);
      const idx=empties[Math.floor(Math.random()*empties.length)];
      place(idx, boardEl.children[idx], "P2");
      if(checkEnd()) return;
      current="P1";
      announce("Your turn");
      sr.textContent="Raven moved. Your turn.";
    }, 420);
  }

  function checkEnd(){
    const w=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for(const [a,b,c] of w){
      if(board[a] && board[a]===board[b] && board[a]===board[c]){
        gameOver=true;
        const title=(prefs.mode==="solo")
          ? (board[a]==="P1" ? "Great Job, You Win" : "Raven wins")
          : (board[a]==="P1" ? "Feather wins" : "Cookie wins");
        showOverlay(title,"Play again?");
        if(prefs.sound) sfx("win");
        gentleVibe(18);
        return true;
      }
    }
    if(board.every(Boolean)){
      gameOver=true;
      showOverlay("It’s a Tie","Play again?");
      if(prefs.sound) sfx("draw");
      gentleVibe(14);
      return true;
    }
    return false;
  }

  function showOverlay(title,msg){
    overlayTitle.textContent=title;
    overlayMsg.textContent=msg;
    overlay.classList.remove("hidden");
    statusEl.textContent=title;
    sr.textContent=title+". Play again?";
    setTimeout(()=>btnYes.focus(),0);
  }
  function hideOverlay(){ overlay.classList.add("hidden"); }
  function announce(t){ statusEl.textContent=t; }

  function setFirst(p){
    firstPlayer=p;
    prefs.firstPlayer=p;
    savePrefs(prefs);
    setFirstButtons();
  }
  function setFirstButtons(){
    firstFeather.classList.toggle("active", firstPlayer==="P1");
    firstCookie.classList.toggle("active", firstPlayer==="P2");
  }
  function label(){
    if(prefs.mode==="solo") return current==="P1"?"Your":"Raven’s";
    return current==="P1"?"Feather’s":"Cookie’s";
  }

  function loadPrefs(){
    try{
      const raw=localStorage.getItem(PREFS_KEY);
      if(!raw) return {sound:true,vibrate:true,mode:"solo",difficulty:"learn",firstPlayer:"P1"};
      const p=JSON.parse(raw);
      return {
        sound: typeof p.sound==="boolean"?p.sound:true,
        vibrate: typeof p.vibrate==="boolean"?p.vibrate:true,
        mode: p.mode==="two"?"two":"solo",
        difficulty: (p.difficulty==="play"||p.difficulty==="win")?p.difficulty:"learn",
        firstPlayer: p.firstPlayer==="P2"?"P2":"P1"
      };
    }catch{
      return {sound:true,vibrate:true,mode:"solo",difficulty:"learn",firstPlayer:"P1"};
    }
  }
  function savePrefs(p){ try{ localStorage.setItem(PREFS_KEY, JSON.stringify(p)); }catch{} }

})();