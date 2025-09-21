/* game.js
   - implements thrower/dodger modes
   - supports: 1-2 human throwers (WASD+Space, Arrows+Numpad5)
   - supports: 1-4 human dodgers (WASD, IJKL, Arrows, Numpad 8/5/4/6)
   - AI dodgers/throwers with difficulty-based behavior
   - only one ball active at a time; throwers alternate
   - submits score to /api/score at game end
*/

(() => {
  // --- Canvas / basic settings ---
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  let W = window.innerWidth, H = window.innerHeight;
  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  window.addEventListener('resize', resize); resize();

  // HUD + menu elements
  const menu = document.getElementById('menu');
  const hud = document.getElementById('hud');
  const playerNameInput = document.getElementById('playerName');
  const btnModeThrower = document.getElementById('btnModeThrower');
  const btnModeDodger = document.getElementById('btnModeDodger');
  const throwerOptions = document.getElementById('throwerOptions');
  const dodgerOptions = document.getElementById('dodgerOptions');
  const selectThrowerCount = document.getElementById('selectThrowerCount');
  const selectDodgerCount = document.getElementById('selectDodgerCount');
  const selectDifficulty = document.getElementById('selectDifficulty');
  const btnStart = document.getElementById('btnStart');
  const scoreboardEl = document.getElementById('scoreboard');
  const turnLabel = document.getElementById('turnLabel');
  const controlsLegend = document.getElementById('controlsLegend');
  const btnExit = document.getElementById('btnExit');

  const btnMechanics = document.getElementById('btnMechanics');
  const btnLeaderboard = document.getElementById('btnLeaderboard');
  const mechanicsModal = document.getElementById('mechanicsModal');
  const mechanicsContent = document.getElementById('mechanicsContent');
  const closeMechanics = document.getElementById('closeMechanics');
  const leaderboardModal = document.getElementById('leaderboardModal');
  const leaderboardContent = document.getElementById('leaderboardContent');
  const closeLeaderboard = document.getElementById('closeLeaderboard');

  closeMechanics.addEventListener('click', ()=> mechanicsModal.classList.add('hidden'));
  closeLeaderboard.addEventListener('click', ()=> leaderboardModal.classList.add('hidden'));
  btnMechanics.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/mechanics');
      const rows = await res.json();
      mechanicsContent.innerHTML = rows.map(r => `<h4>${r.title}</h4><p>${r.content}</p>`).join('');
      mechanicsModal.classList.remove('hidden');
    } catch (e) { alert('Mechanics load error'); }
  });
  btnLeaderboard.addEventListener('click', async () => {
    try {
      const r = await fetch(`/api/leaderboard?role=dodger&difficulty=${selectDifficulty.value}&limit=10`);
      const rows = await r.json();
      leaderboardContent.innerHTML = rows.length ? rows.map(x => `<div>${x.name} — ${x.total_score} (${x.games_played})</div>`).join('') : '<div>No records</div>';
      leaderboardModal.classList.remove('hidden');
    } catch (e) { alert('Leaderboard load error'); }
  });

  // --- Controls mapping ---
  const controls = {
    thrower1: { up:'KeyW', down:'KeyS', left:'KeyA', right:'KeyD', throw:'Space' },
    thrower2: { up:'ArrowUp', down:'ArrowDown', left:'ArrowLeft', right:'ArrowRight', throw:'Numpad5' },
    dodgers: [
      { up:'KeyW', down:'KeyS', left:'KeyA', right:'KeyD' },      // Dodger 1
      { up:'KeyI', down:'KeyK', left:'KeyJ', right:'KeyL' },      // Dodger 2
      { up:'ArrowUp', down:'ArrowDown', left:'ArrowLeft', right:'ArrowRight' }, // Dodger 3
      { up:'Numpad8', down:'Numpad5', left:'Numpad4', right:'Numpad6' } // Dodger 4 (numpad)
    ]
  };

  // keyboard state
  const keyState = {};
  window.addEventListener('keydown', e => { keyState[e.code] = true; });
  window.addEventListener('keyup', e => { keyState[e.code] = false; });

  // --- Game state & entities ---
  let mode = null;             // "thrower" or "dodger"
  let difficulty = 'easy';
  let humanThrowerCount = 1;
  let humanDodgerCount = 1;
  let localPlayer = null;      // created by /api/start call
  let playerScore = 0;

  // Teams
  let throwers = []; // array of participant objects {id, x,y, isHuman, controlSet, color, alive}
  let dodgers = [];  // array of 4 participants (mix human/AI)
  let activeBall = null; // single ball allowed {x,y,dir,ownerIndex (throwers index), id}
  let ballIdCounter = 0;

  // Turn & flow
  let currentThrowerIndex = 0; // index into throwers[] whose turn to throw
  let ballInFlight = false;    // true while ball active
  let gameRunning = false;

  // difficulty AI parameters (reaction ms, dodge success probability)
  const DIFF = {
    easy:   { react: 900, success: 0.45, speed: 0.8 },
    medium: { react: 500, success: 0.7,  speed: 1.0 },
    hard:   { react: 250, success: 0.9,  speed: 1.25 }
  };

  // --- Utility: create participants ---
  function createHumanThrower(name, controlSet, color){
    return { id: `human-throw-${Math.random().toString(36).slice(2,6)}`, name, x: W*0.5, y: 60, isHuman:true, control: controlSet, color, alive:true, speedMultiplier:1 };
  }
  function createAIThrower(name, color){
    return { id: `ai-throw-${Math.random().toString(36).slice(2,6)}`, name, x: W*0.5, y: 60, isHuman:false, color, alive:true, speedMultiplier:1 };
  }
  function createHumanDodger(name, controlSet, color, startX){
    return { id:`human-dod-${Math.random().toString(36).slice(2,6)}`, name, x:startX, y:H*0.5, isHuman:true, control:controlSet, color, alive:true, speedMultiplier:1, lastReact:0 };
  }
  function createAIDodger(name, color, startX){
    return { id:`ai-dod-${Math.random().toString(36).slice(2,6)}`, name, x:startX, y:H*0.5, isHuman:false, color, alive:true, speedMultiplier:1, lastReact:0 };
  }

  // --- Visual helpers (sprite-like humans) ---
  function drawHuman(p, isThrower=false){
    // p: {x,y,color}
    const x = p.x, y = p.y;
    ctx.save();
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath(); ctx.ellipse(x, y + 30, 26, 10, 0, 0, Math.PI*2); ctx.fill();

    // head
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x, y-14, 12, 0, Math.PI*2); ctx.fill();
    // body
    ctx.fillStyle = p.color || '#ff6b6b';
    ctx.fillRect(x-10, y-4, 20, 28);
    // arms
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x-10,y+4); ctx.lineTo(x-22,y+8); ctx.moveTo(x+10,y+4); ctx.lineTo(x+22,y+8); ctx.stroke();
    // legs
    ctx.beginPath(); ctx.moveTo(x-6,y+24); ctx.lineTo(x-12,y+44); ctx.moveTo(x+6,y+24); ctx.lineTo(x+12,y+44); ctx.stroke();

    // small ID label
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '11px Raleway';
    ctx.textAlign = 'center';
    ctx.fillText(p.name || '', x, y-30);
    ctx.restore();
  }

  function drawBall(b){
    ctx.save();
    ctx.fillStyle = '#fdd835';
    ctx.beginPath(); ctx.arc(b.x, b.y, 10, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawCourt(){
    // background gradient already via CSS; draw half-court and center circle
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0,H/2); ctx.lineTo(W, H/2); ctx.stroke();
    ctx.beginPath(); ctx.arc(W/2, H/2, H*0.09, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(0, H*0.4, W, H*0.2);
  }

  // --- Setup teams per mode + user picks ---
  function buildTeams(){
    // reset arrays
    throwers = []; dodgers = [];
    difficulty = selectDifficulty.value || 'easy';

    if (mode === 'thrower'){
      // human thrower count can be 1 or 2
      humanThrowerCount = Number(selectThrowerCount.value || 1);
      // create human throwers first
      if (humanThrowerCount >= 1) throwers.push(createHumanThrower('You', controls.thrower1, '#4ac0e6'));
      if (humanThrowerCount >= 2) throwers.push(createHumanThrower('You 2', controls.thrower2, '#7fe36a'));
      // if only 1 human chosen -> add AI teammate
      if (humanThrowerCount === 1) throwers.push(createAIThrower('AI-Thrower', '#f59b42'));

      // throwers positioned top and bottom alternately
      throwers.forEach((t,i) => {
        t.y = i===0 ? 60 : 60; // both appear at top for simplicity
        t.x = W* (0.4 + 0.2 * i);
      });

      // dodgers all AI by default (4 AIs)
      for (let i=0;i<4;i++){
        const sx = W*(0.25 + i*0.15);
        dodgers.push(createAIDodger(`AI-Dodger-${i+1}`, '#ff6b6b', sx));
      }
    } else { // dodger mode
      humanDodgerCount = Number(selectDodgerCount.value || 1);
      // create human dodgers up to humanDodgerCount
      const orderColors = ['#4ac0e6','#7fe36a','#ffd86b','#c88cff'];
      for (let i=0;i<4;i++){
        const sx = W*(0.25 + i*0.15);
        if (i < humanDodgerCount){
          // assign control sets in order
          dodgers.push(createHumanDodger(`You${i+1}`, controls.dodgers[i], orderColors[i], sx));
        } else {
          dodgers.push(createAIDodger(`AI-Dodger-${i+1}`, '#ff7b7b', sx));
        }
      }
      // throwers are AI (2)
      throwers.push(createAIThrower('AI-T1', '#f59b42')); throwers.push(createAIThrower('AI-T2', '#f59b42'));
      throwers.forEach((t,i)=>{ t.x = W*(0.4 + 0.2*i); t.y = 60; });
    }

    // give each AI dodger difficulty parameters
    dodgers.forEach(d => {
      const dd = DIFF[difficulty];
      d.reactMs = dd.react;
      d.successProb = dd.success;
      d.speed = 1 * dd.speed;
    });

    // reset turn: first thrower starts
    currentThrowerIndex = 0;
    updateTurnLabel();
    updateControlsLegend();
  }

  // update HUD controls legend
  function updateControlsLegend(){
    if (!hud) return;
    let txt = '';
    if (mode === 'thrower'){
      txt = `Thrower controls — Player1: WASD + Space. Player2: Arrows + Numpad5 (if present).`;
    } else {
      txt = `Dodger controls: D1 WASD, D2 IJKL, D3 Arrows, D4 Numpad 8/5/4/6`;
    }
    controlsLegend.innerText = txt;
  }

  // --- Turn label ---
  function updateTurnLabel(){
    if (!hud) return;
    const t = throwers[currentThrowerIndex];
    turnLabel.innerText = `Turn: ${t ? (t.isHuman ? 'Human' : t.name) : '-'}`;
  }

  // --- Throw action (called when human presses throw key OR AI decides to throw) ---
  function attemptThrow(byIndex, isHuman){
    // byIndex -> index into throwers[] for the one attempting
    // allow throw only if it's their turn and no ball is in flight
    if (ballInFlight) return false;
    if (byIndex !== currentThrowerIndex) return false;

    const thrower = throwers[byIndex];
    if (!thrower || !thrower.alive) return false;

    // spawn ball: direction = +1 (top -> down) or -1 (bottom -> up)
    // We'll assume throwers are at top; ball goes down
    const dir = 1;
    const ball = { id: ++ballIdCounter, x: thrower.x, y: thrower.y + 30, dir, ownerIndex: byIndex };
    activeBall = ball; ballInFlight = true;

    // advance turn only AFTER ball resolved (we'll rotate in resolveBall())
    // however to prevent double-throw during flight, set ballInFlight true here.

    // small visual kick / sound placeholder (no audio included)
    return true;
  }

  // --- Update ball movement & check collisions ---
  function updateBall(dt){
    if (!activeBall) return;
    const speed = 400 * (dt/1000); // pixels per second baseline
    activeBall.y += speed * activeBall.dir;
    // check collisions with dodgers
    for (let i=0;i<dodgers.length;i++){
      const d = dodgers[i];
      if (!d.alive) continue;
      const dx = activeBall.x - d.x;
      const dy = activeBall.y - d.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 26) {
        // hit
        d.alive = false;
        resolveBall({ hitIndex:i, hit:true });
        return;
      }
    }
    // if leaves screen
    if (activeBall.y > H + 40 || activeBall.y < -40) {
      resolveBall({ hit:false });
    }
  }

  // resolveBall: called when ball hit or out
  function resolveBall({ hit, hitIndex }){
    // if hit by thrower, that thrower gets +1 score (only if human thrower)
    const owner = throwers[activeBall.ownerIndex];
    if (hit && owner && owner.isHuman) {
      playerScore += 1;
    }
    // cleanup ball
    activeBall = null; ballInFlight = false;
    // rotate turn to next thrower
    currentThrowerIndex = (currentThrowerIndex + 1) % throwers.length;
    updateTurnLabel();
    updateScoreboard();
    // AI thrower may decide to throw if it's AI's turn -> schedule
    const next = throwers[currentThrowerIndex];
    if (next && !next.isHuman) {
      setTimeout(()=> aiThrow(next, currentThrowerIndex), 600 + Math.random()*700);
    }
    // check game over (all dodgers dead)
    const anyAlive = dodgers.some(d=>d.alive);
    if (!anyAlive) endGame();
  }

  // --- AI thrower behavior ---
  function aiThrow(aiObj, idx){
    // only throw if it's their turn and no active ball
    if (ballInFlight) return;
    if (idx !== currentThrowerIndex) return;
    // pick random alive dodger target to visualize (server not authoritative)
    // spawn ball from aiObj.x
    const dir = 1;
    const ball = { id: ++ballIdCounter, x: aiObj.x, y: aiObj.y + 30, dir, ownerIndex: idx };
    activeBall = ball; ballInFlight = true;
    // note: no further immediate scoring; resolveBall will handle rotation
  }

  // --- AI dodger logic: they try to move away from incoming ball ---
  function updateAIDodgers(dt){
    const aliveBall = activeBall;
    dodgers.forEach(d => {
      if (d.isHuman || !d.alive) return;
      const params = DIFF[difficulty];
      if (!aliveBall) {
        // idle wander: small random walk
        d.x += (Math.random()-0.5) * 20 * (dt/1000) * params.speed;
        d.x = Math.max(30, Math.min(W-30, d.x));
      } else {
        // decide whether to react based on lastReact timestamp
        const now = Date.now();
        if (now - (d.lastReact || 0) < d.reactMs) return;
        d.lastReact = now;
        // decide if this AI will react successfully
        if (Math.random() > d.successProb) {
          // failed reaction -> maybe move wrong direction or not at all
          if (Math.random() > 0.6) {
            d.x += (Math.random() > 0.5 ? -1 : 1) * 30 * params.speed;
          }
          // else no move
        } else {
          // move away from ball.x: if ball will hit x near d.x, move sideways
          if (Math.abs(aliveBall.x - d.x) < 120) {
            // dodge direction: move to left or right whichever has more space
            const leftSpace = d.x - 30;
            const rightSpace = (W-30) - d.x;
            const dir = rightSpace > leftSpace ? 1 : -1;
            d.x += dir * (80 * params.speed);
            d.x = Math.max(30, Math.min(W-30, d.x));
          } else {
            // slight reposition towards center
            d.x += (W/2 - d.x) * 0.02 * params.speed;
          }
        }
      }
    });
  }

  // --- Human movement updates ---
  function updateHumans(dt){
    const speedBase = 300 * (dt/1000);
    // throwers human movement
    throwers.forEach((t, idx) => {
      if (!t.isHuman || !t.alive) return;
      const set = t.control;
      if (keyState[set.left]) t.x -= speedBase * t.speedMultiplier;
      if (keyState[set.right]) t.x += speedBase * t.speedMultiplier;
      if (keyState[set.up]) t.y -= speedBase * t.speedMultiplier;
      if (keyState[set.down]) t.y += speedBase * t.speedMultiplier;
      t.x = Math.max(30, Math.min(W-30, t.x));
      t.y = Math.max(30, Math.min(H-30, t.y));
      // handle throw key
      if (keyState[set.throw]) {
        // detect edge-press: only attempt when pressed and no ball and when turn matches
        if (!keyState._handled) {
          if (!ballInFlight && throwers.indexOf(t) === currentThrowerIndex) {
            attemptThrow(throwers.indexOf(t), true);
          }
          // mark handled to prevent repeat firing while key held
          keyState._handled = true;
        }
      } else {
        // reset handled when key released
        // note: we cannot detect which key exactly triggered _handled easily; keep simple
        keyState._handled = false;
      }
    });

    // human dodgers movement
    dodgers.forEach((d, idx) => {
      if (!d.isHuman || !d.alive) return;
      const set = d.control;
      if (!set) return;
      const sp = speedBase * 1.0;
      if (keyState[set.left]) d.x -= sp;
      if (keyState[set.right]) d.x += sp;
      if (keyState[set.up]) d.y -= sp;
      if (keyState[set.down]) d.y += sp;
      d.x = Math.max(30, Math.min(W-30, d.x));
      d.y = Math.max(H*0.4, Math.min(H*0.6, d.y));
    });
  }

  // --- Scoreboard update ---
  function updateScoreboard(){
    const alive = dodgers.filter(d=>d.alive).length;
    scoreboardEl.innerText = `Dodgers Remaining: ${alive}    Score: ${playerScore}`;
  }

  // --- End game handler ---
async function endGame(){
  gameRunning = false;
  setTimeout(() => {
    (async () => {
      alert(`Game over! Your score: ${playerScore}`);
      try {
        if (localPlayer && localPlayer.id) {
          await fetch('/api/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId: localPlayer.id,
              role: mode === 'thrower' ? 'thrower' : 'dodger',
              difficulty,
              score: playerScore
            })
          });
        }
      } catch (e) {
        console.warn('score submit failed', e);
      }
      hud.classList.add('hidden');
      menu.classList.remove('hidden');
    })();
  }, 200);
}


  // --- Game loop ---
  let lastTime = performance.now();
  function frame(now){
    const dt = now - lastTime; lastTime = now;
    // clear
    ctx.clearRect(0,0,W,H);
    drawCourt();

    if (!gameRunning) return;

    // updates
    updateHumans(dt);
    updateAIDodgers(dt);
    // ball update
    updateBall(dt);

    // draw throwers & dodgers & ball
    throwers.forEach(t => { if (t.alive) drawHuman(t, true); });
    dodgers.forEach(d => { if (d.alive) drawHuman(d, false); });

    if (activeBall) drawBall(activeBall);

    updateScoreboard();
    requestAnimationFrame(frame);
  }

  // --- Start flow: call /api/start to create local player then build teams & run ---
  btnStart.addEventListener('click', async () => {
    const name = playerNameInput.value.trim();
    if (!name) return alert('Please enter your name');
    mode = (document.getElementById('btnModeThrower').classList.contains('active') || btnModeThrower.dataset.active==='true') ? 'thrower' : 'dodger';
    difficulty = selectDifficulty.value || 'easy';
    humanThrowerCount = Number(selectThrowerCount.value || 1);
    humanDodgerCount = Number(selectDodgerCount.value || 1);

    // create player record
    try {
      const res = await fetch('/api/start', { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name })});
      const j = await res.json();
      localPlayer = j.player || null;
    } catch (e) {
      console.warn('player create error', e);
      localPlayer = { id: null, name }; // allow local play even if API down
    }

    // hide menu, show HUD
    menu.classList.add('hidden'); hud.classList.remove('hidden'); hud.classList.add('visible');
    buildTeams(); gameRunning = true;
    lastTime = performance.now();
    requestAnimationFrame(frame);
  });

  // toggles for mode buttons
  btnModeThrower.addEventListener('click', ()=>{
    mode = 'thrower';
    btnModeThrower.classList.add('active'); btnModeDodger.classList.remove('active');
    throwerOptions.classList.remove('hidden'); dodgerOptions.classList.add('hidden');
  });
  btnModeDodger.addEventListener('click', ()=>{
    mode = 'dodger';
    btnModeDodger.classList.add('active'); btnModeThrower.classList.remove('active');
    dodgerOptions.classList.remove('hidden'); throwerOptions.classList.add('hidden');
  });

  // exit to menu button
  btnExit.addEventListener('click', async ()=>{
    // if running, stop and return to menu (no score submission)
    gameRunning = false;
    activeBall = null; ballInFlight = false; playerScore = 0;
    hud.classList.add('hidden'); menu.classList.remove('hidden');
  });

  // initial UI text
  controlsLegend.innerText = 'Choose mode, difficulty and start. Mechanics & leaderboard are live from server.';
  updateScoreboard();
  updateControlsLegend();
  updateTurnLabel();

  // --- auto-AI throw scheduling if initial thrower is AI ---
  // if first thrower is AI when game starts, ensure it throws after small delay
  const observeTurnForAI = setInterval(() => {
    if (!gameRunning) return;
    const t = throwers[currentThrowerIndex];
    if (t && !t.isHuman && !ballInFlight) {
      aiThrow(t, currentThrowerIndex);
    }
  }, 700);

  // expose some utilities to window for debugging
  window._game = {
    getState: () => ({ mode, difficulty, throwers, dodgers, activeBall, playerScore })
  };

  // --- small UI nicety: set default mode to thrower on load ---
  btnModeThrower.click();
})();
