// public/game.js
// Local realtime gameplay + REST integration with backend for players, mechanics, leaderboard.

let width = window.innerWidth;
let height = window.innerHeight;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = width; canvas.height = height;

let playerRadius, ballRadius, ballSpeed;
let isAttacker = false;
let localPlayer = null;
let currentDifficulty = 'easy';
let localScore = 0; // final to send to server

const dodgerCount = 3;
let topAttacker, bottomAttacker;
let redDodgers = [];
let balls = [];
let gameOver = false;
let lastBallOwnerWasPlayer = new Map(); // ballId -> boolean

const dodgerMovement = [
  { up:false, down:false, left:false, right:false },
  { up:false, down:false, left:false, right:false },
  { up:false, down:false, left:false, right:false }
];
const attackerMovement = { topLeft:false, topRight:false, bottomLeft:false, bottomRight:false };

const attackerBtn = document.getElementById('attackerBtn');
const dodgerBtn = document.getElementById('dodgerBtn');
const menu = document.getElementById('menu');
const loadingScreen = document.getElementById('loadingScreen');
const playerNameInput = document.getElementById('playerName');
const selectDifficulty = document.getElementById('selectDifficulty');
const scoreboard = document.getElementById('scoreboard');
const gameOverEl = document.getElementById('gameOver');

const mechanicsBtn = document.getElementById('btn-mechanics-minor');
const mechanicsModal = document.getElementById('mechanicsModal');
const mechanicsContent = document.getElementById('mechanicsContent');
const closeMechanics = document.getElementById('closeMechanics');

const leaderboardBtn = document.getElementById('btn-leaderboard-minor');
const leaderboardModal = document.getElementById('leaderboardModal');
const leaderboardContent = document.getElementById('leaderboardContent');
const closeLeaderboard = document.getElementById('closeLeaderboard');

attackerBtn.addEventListener('click', ()=> startFlow(true));
dodgerBtn.addEventListener('click', ()=> startFlow(false));
closeMechanics.addEventListener('click', ()=> mechanicsModal.classList.add('hidden'));
closeLeaderboard.addEventListener('click', ()=> leaderboardModal.classList.add('hidden'));

mechanicsBtn.addEventListener('click', async ()=> {
  const res = await fetch('/api/mechanics');
  const rows = await res.json();
  mechanicsContent.innerHTML = rows.map(r => `<h4>${r.title}</h4><p>${r.content}</p>`).join('');
  mechanicsModal.classList.remove('hidden');
});

leaderboardBtn.addEventListener('click', async ()=> {
  const res = await fetch(`/api/leaderboard?role=dodger&difficulty=${selectDifficulty.value}&limit=10`);
  const rows = await res.json();
  leaderboardContent.innerHTML = rows.length ? rows.map(r => `<div>${r.name} — ${r.total_score} (games ${r.games_played})</div>`).join('') : '<div>No records</div>';
  leaderboardModal.classList.remove('hidden');
});

function startFlow(attacker) {
  const name = playerNameInput.value.trim();
  if (!name) return alert('Please enter your name');
  isAttacker = attacker;
  currentDifficulty = selectDifficulty.value || 'easy';
  showLoadingScreen();

  fetch('/api/start', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ name })
  }).then(r => r.json()).then(j => {
    if (j.error) { hideLoadingScreen(); return alert('Start error'); }
    localPlayer = j.player;
    menu.style.display = 'none';
    hideLoadingScreen();
    initializeGame();
    requestAnimationFrame(gameLoop);
  }).catch(err => { hideLoadingScreen(); alert('Network error: '+err.message); });
}

function showLoadingScreen(){ loadingScreen.style.display = 'flex'; }
function hideLoadingScreen(){ loadingScreen.style.display = 'none'; }

function initializeGame(){
  width = window.innerWidth; height = window.innerHeight;
  canvas.width = width; canvas.height = height;
  playerRadius = Math.min(width, height) * 0.03;
  ballRadius = playerRadius * 0.45;
  ballSpeed = height * 0.006;

  topAttacker = { x: width/2, y: playerRadius*2, alive:true };
  bottomAttacker = { x: width/2, y: height - playerRadius*2, alive:true };

  redDodgers = [];
  for (let i=0;i<dodgerCount;i++){
    redDodgers.push({ x: width*(0.35 + 0.15*i), y: height/2, alive:true });
  }

  balls = [];
  gameOver = false;
  localScore = 0;
  lastBallOwnerWasPlayer.clear();
  gameOverEl.style.display = 'none';
  updateScore();
}

function updateScore(){
  const aliveCount = redDodgers.filter(p => p.alive).length;
  scoreboard.innerText = `Dodgers Remaining: ${aliveCount}`;
  if (aliveCount === 0) {
    gameOver = true;
    gameOverEl.style.display = 'block';
    // Submit score to backend
    submitScore();
  }
}

function drawHuman(x,y){
  ctx.fillStyle = "#FF6347";
  ctx.beginPath(); ctx.arc(x, y-20, 15, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#4682b4"; ctx.fillRect(x-5, y-10, 10, 30);
  ctx.beginPath(); ctx.moveTo(x,y+20); ctx.lineTo(x-10,y+40);
  ctx.moveTo(x,y+20); ctx.lineTo(x+10,y+40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x,y-10); ctx.lineTo(x-15,y);
  ctx.moveTo(x,y-10); ctx.lineTo(x+15,y); ctx.stroke();
}

function moveDodgers(){
  const moveSpeed = width * 0.007;
  redDodgers.forEach((p, idx) => {
    if (!p.alive) return;
    if (dodgerMovement[idx].left) p.x = Math.max(playerRadius, p.x - moveSpeed);
    if (dodgerMovement[idx].right) p.x = Math.min(width - playerRadius, p.x + moveSpeed);
    if (dodgerMovement[idx].up) p.y = Math.max(height * 0.4, p.y - moveSpeed);
    if (dodgerMovement[idx].down) p.y = Math.min(height * 0.6, p.y + moveSpeed);
  });
}

function moveAttackers(){
  const moveSpeed = width * 0.01;
  if (attackerMovement.topLeft) topAttacker.x = Math.max(playerRadius, topAttacker.x - moveSpeed);
  if (attackerMovement.topRight) topAttacker.x = Math.min(width - playerRadius, topAttacker.x + moveSpeed);
  if (attackerMovement.bottomLeft) bottomAttacker.x = Math.max(playerRadius, bottomAttacker.x - moveSpeed);
  if (attackerMovement.bottomRight) bottomAttacker.x = Math.min(width - playerRadius, bottomAttacker.x + moveSpeed);
}

function drawCourtLines(){
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, height/2); ctx.lineTo(width, height/2); ctx.stroke();
  ctx.beginPath(); ctx.arc(width/2, height/2, height * 0.1, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fillRect(0, height*0.4, width, height*0.2);
}

function drawPlayers(){
  drawHuman(topAttacker.x, topAttacker.y);
  drawHuman(bottomAttacker.x, bottomAttacker.y);
  redDodgers.forEach(p => { if (p.alive) drawHuman(p.x, p.y); });
}

function moveBalls(){
  balls.forEach((ball, idx) => {
    ball.y += ballSpeed * ball.direction;
    if (ball.y < -ballRadius || ball.y > height + ballRadius) balls.splice(idx,1);
  });
}

function drawBalls(){
  ctx.fillStyle = "#fdd835";
  balls.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, ballRadius, 0, Math.PI*2); ctx.fill(); });
}

function checkCollisions(){
  balls.forEach((ball, bIdx) => {
    redDodgers.forEach((dodger, dIdx) => {
      if (!dodger.alive) return;
      const dx = ball.x - dodger.x, dy = ball.y - dodger.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < playerRadius + ballRadius) {
        dodger.alive = false;
        // if ball was shot by player, increment localScore
        if (lastBallOwnerWasPlayer.get(ball._id)) {
          localScore += 1;
        }
        balls.splice(bIdx,1);
        updateScore();
      }
    });
  });
}

function gameLoop(){
  if (gameOver) return;
  ctx.clearRect(0,0,width,height);
  drawCourtLines();
  moveDodgers();
  moveAttackers();
  moveBalls();
  checkCollisions();
  drawPlayers();
  drawBalls();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('resize', ()=> {
  width = window.innerWidth; height = window.innerHeight;
  canvas.width = width; canvas.height = height;
  initializeGame();
});

// keyboard mapping
window.addEventListener('keydown', (ev)=>{
  if (ev.code === 'KeyW') dodgerMovement[0].up = true;
  if (ev.code === 'KeyA') dodgerMovement[0].left = true;
  if (ev.code === 'KeyS') dodgerMovement[0].down = true;
  if (ev.code === 'KeyD') dodgerMovement[0].right = true;

  if (ev.code === 'ArrowUp') dodgerMovement[1].up = true;
  if (ev.code === 'ArrowLeft') dodgerMovement[1].left = true;
  if (ev.code === 'ArrowDown') dodgerMovement[1].down = true;
  if (ev.code === 'ArrowRight') dodgerMovement[1].right = true;

  if (ev.code === 'KeyI') dodgerMovement[2].up = true;
  if (ev.code === 'KeyJ') dodgerMovement[2].left = true;
  if (ev.code === 'KeyK') dodgerMovement[2].down = true;
  if (ev.code === 'KeyL') dodgerMovement[2].right = true;

  if (ev.code === 'KeyA') attackerMovement.topLeft = true;
  if (ev.code === 'KeyD') attackerMovement.topRight = true;
  if (ev.code === 'KeyJ') attackerMovement.bottomLeft = true;
  if (ev.code === 'KeyL') attackerMovement.bottomRight = true;

  if (ev.code === 'Space' && isAttacker) {
    shootFromAttacker(topAttacker, 1, true);
  }
  if (ev.code === 'Enter' && isAttacker) {
    shootFromAttacker(bottomAttacker, -1, true);
  }

  // dodge shortcut for dodger (press Q to register a dodge action)
  if (ev.code === 'KeyQ' && !isAttacker) {
    localScore += 1; // count successful dodge action locally
  }
});

window.addEventListener('keyup', (ev)=>{
  if (ev.code === 'KeyW') dodgerMovement[0].up = false;
  if (ev.code === 'KeyA') dodgerMovement[0].left = false;
  if (ev.code === 'KeyS') dodgerMovement[0].down = false;
  if (ev.code === 'KeyD') dodgerMovement[0].right = false;

  if (ev.code === 'ArrowUp') dodgerMovement[1].up = false;
  if (ev.code === 'ArrowLeft') dodgerMovement[1].left = false;
  if (ev.code === 'ArrowDown') dodgerMovement[1].down = false;
  if (ev.code === 'ArrowRight') dodgerMovement[1].right = false;

  if (ev.code === 'KeyI') dodgerMovement[2].up = false;
  if (ev.code === 'KeyJ') dodgerMovement[2].left = false;
  if (ev.code === 'KeyK') dodgerMovement[2].down = false;
  if (ev.code === 'KeyL') dodgerMovement[2].right = false;

  if (ev.code === 'KeyA') attackerMovement.topLeft = false;
  if (ev.code === 'KeyD') attackerMovement.topRight = false;
  if (ev.code === 'KeyJ') attackerMovement.bottomLeft = false;
  if (ev.code === 'KeyL') attackerMovement.bottomRight = false;
});

let ballCounter = 0;
function shootFromAttacker(fromAttacker, direction, byPlayer=false){
  // create an id for this ball so we can map ownership
  const id = ++ballCounter;
  const x = fromAttacker.x;
  const y = fromAttacker.y + (direction>0 ? playerRadius*2 : -playerRadius*2);
  const ball = { _id: id, x, y, direction };
  balls.push(ball);
  lastBallOwnerWasPlayer.set(id, !!byPlayer);

  // if it's attacker and not player-controlled, could auto-aim: pick random dodger
  // For the local demo we only spawn visual balls.
}

function submitScore(){
  if (!localPlayer) return;
  // role string: 'thrower' if attacker, else 'dodger'
  const role = isAttacker ? 'thrower' : 'dodger';
  const body = { playerId: localPlayer.id, role, difficulty: currentDifficulty, score: localScore };
  fetch('/api/score', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
    .then(r=>r.json())
    .then(j => {
      // optionally show leaderboard automatically
      // refresh leaderboard modal data
    }).catch(err => console.error('submit score error', err));
}
