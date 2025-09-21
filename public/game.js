/* game.js - Complete restructuring for multi-page flow and improved gameplay */
(() => {
  // --- Canvas / basic settings ---
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  let W = window.innerWidth, H = window.innerHeight;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // --- Page Elements ---
  const nameEntryPage = document.getElementById('nameEntryPage');
  const mainMenuPage = document.getElementById('mainMenuPage');
  const gameOptionsPage = document.getElementById('gameOptionsPage');
  const playerNameInput = document.getElementById('playerName');
  const btnContinue = document.getElementById('btnContinue');
  const btnStartGame = document.getElementById('btnStartGame');
  const btnMechanics = document.getElementById('btnMechanics');
  const btnLeaderboard = document.getElementById('btnLeaderboard');
  const btnModeThrower = document.getElementById('btnModeThrower');
  const btnModeDodger = document.getElementById('btnModeDodger');
  const throwerOptions = document.getElementById('throwerOptions');
  const dodgerOptions = document.getElementById('dodgerOptions');
  const selectThrowerCount = document.getElementById('selectThrowerCount');
  const selectDodgerCount = document.getElementById('selectDodgerCount');
  const selectDifficulty = document.getElementById('selectDifficulty');
  const btnPlay = document.getElementById('btnPlay');
  const btnBackToMenu = document.getElementById('btnBackToMenu');
  
  // HUD elements
  const hud = document.getElementById('hud');
  const scoreboardEl = document.getElementById('scoreboard');
  const turnLabel = document.getElementById('turnLabel');
  const controlsLegend = document.getElementById('controlsLegend');
  const btnExit = document.getElementById('btnExit');
  
  // Modal elements
  const mechanicsModal = document.getElementById('mechanicsModal');
  const mechanicsContent = document.getElementById('mechanicsContent');
  const closeMechanics = document.getElementById('closeMechanics');
  const leaderboardModal = document.getElementById('leaderboardModal');
  const leaderboardContent = document.getElementById('leaderboardContent');
  const closeLeaderboard = document.getElementById('closeLeaderboard');
  const gameOverModal = document.getElementById('gameOverModal');
  const finalScoreText = document.getElementById('finalScoreText');
  const restartBtn = document.getElementById('restartBtn');
  const menuBtn = document.getElementById('menuBtn');

  // --- Navigation Functions ---
  function showPage(page) {
    // Hide all pages
    nameEntryPage.classList.add('hidden');
    mainMenuPage.classList.add('hidden');
    gameOptionsPage.classList.add('hidden');
    hud.classList.add('hidden');
    
    // Show the requested page
    page.classList.remove('hidden');
  }

  // Initial page
  showPage(nameEntryPage);

  // Continue button - go to main menu
 document.getElementById("btnContinue").addEventListener("click", () => {
  const playerName = document.getElementById("playerName").value.trim();
  const errorEl = document.getElementById("nameError");

  if (!playerName) {
  errorEl.classList.remove("hidden");
  document.getElementById("playerName").classList.add("error-input"); // glow red
  return;
}

errorEl.classList.add("hidden");
document.getElementById("playerName").classList.remove("error-input"); // remove glow

  errorEl.classList.add("hidden");        // hide error if filled
  document.getElementById("nameEntryPage").classList.add("hidden");
  document.getElementById("mainMenuPage").classList.remove("hidden");
});

  // Start Game button - go to game options
  btnStartGame.addEventListener('click', () => {
    showPage(gameOptionsPage);
  });

  // Back to menu button
  btnBackToMenu.addEventListener('click', () => {
    showPage(mainMenuPage);
  });

  // Mode selection
  btnModeThrower.addEventListener('click', () => {
    mode = 'thrower';
    btnModeThrower.classList.add('active');
    btnModeDodger.classList.remove('active');
    throwerOptions.classList.remove('hidden');
    dodgerOptions.classList.add('hidden');
  });

  btnModeDodger.addEventListener('click', () => {
    mode = 'dodger';
    btnModeDodger.classList.add('active');
    btnModeThrower.classList.remove('active');
    dodgerOptions.classList.remove('hidden');
    throwerOptions.classList.add('hidden');
  });

  // Set default mode
  btnModeThrower.click();

  // Modal controls
  closeMechanics.addEventListener('click', () => mechanicsModal.classList.add('hidden'));
  closeLeaderboard.addEventListener('click', () => leaderboardModal.classList.add('hidden'));

  // Mechanics button
  btnMechanics.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/mechanics');
      const rows = await res.json();
      mechanicsContent.innerHTML = rows.map(r => `<h4>${r.title}</h4><p>${r.content}</p>`).join('');
      mechanicsModal.classList.remove('hidden');
    } catch (e) {
      alert('Mechanics load error');
    }
  });

  // Leaderboard button
btnLeaderboard.addEventListener('click', async () => {
  try {
    const role = 'dodger'; // or make this dynamic based on game mode
    const difficulty = selectDifficulty.value || 'easy';
    const limit = 10;
    
    const response = await fetch(`/api/leaderboard?role=${role}&difficulty=${difficulty}&limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const rows = await response.json();
    
    if (rows.length === 0) {
      leaderboardContent.innerHTML = '<div class="no-records">No records found. Play some games first!</div>';
    } else {
      leaderboardContent.innerHTML = `
        <table class="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>Score</th>
              <th>Games</th>
              <th>Wins</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((player, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${player.name}</td>
                <td>${player.total_score}</td>
                <td>${player.games_played}</td>
                <td>${player.wins}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
    
    leaderboardModal.classList.remove('hidden');
  } catch (e) {
    console.error('Leaderboard load error:', e);
    leaderboardContent.innerHTML = `<div class="error">Error loading leaderboard: ${e.message}</div>`;
    leaderboardModal.classList.remove('hidden');
  }
});

  // --- Game State & Entities ---
  let mode = null;
  let difficulty = 'easy';
  let humanThrowerCount = 1;
  let humanDodgerCount = 1;
  let localPlayer = null;
  let playerScore = 0;
  
  // Teams
  let throwers = [];
  let dodgers = [];
  let activeBall = null;
  let ballIdCounter = 0;
  
  // Turn & flow
  let currentThrowerIndex = 0;
  let ballInFlight = false;
  let gameRunning = false;
  
  // Throwing guide
  let throwGuide = {
    visible: false,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0
  };

  // Difficulty settings
  const DIFF = {
    easy: { react: 900, success: 0.45, speed: 0.8 },
    medium: { react: 500, success: 0.7, speed: 1.0 },
    hard: { react: 250, success: 0.9, speed: 1.25 }
  };

  // Controls mapping - Updated for new thrower controls
  const controls = {
    thrower1: { aimUp:'KeyW', aimDown:'KeyS', left:'KeyA', right:'KeyD', throw:'Space' },
    thrower2: { aimUp:'ArrowUp', aimDown:'ArrowDown', left:'ArrowLeft', right:'ArrowRight', throw:'Numpad5' },
    dodgers: [
      { up:'KeyW', down:'KeyS', left:'KeyA', right:'KeyD' },
      { up:'KeyI', down:'KeyK', left:'KeyJ', right:'KeyL' },
      { up:'ArrowUp', down:'ArrowDown', left:'ArrowLeft', right:'ArrowRight' },
      { up:'Numpad8', down:'Numpad5', left:'Numpad4', right:'Numpad6' }
    ]
  };

  // Keyboard state
  const keyState = {};
  window.addEventListener('keydown', e => { keyState[e.code] = true; });
  window.addEventListener('keyup', e => { keyState[e.code] = false; });

  // --- Entity Creation Functions ---
  function createHumanThrower(name, controlSet, color, isTop) {
    return {
      id: `human-throw-${Math.random().toString(36).slice(2,6)}`,
      name,
      x: W * 0.5,
      y: isTop ? 60 : H - 60,
      isHuman: true,
      control: controlSet,
      color,
      alive: true,
      speedMultiplier: 1,
      isTop: isTop,
      aimAngle: isTop ? Math.PI/2 : -Math.PI/2 // Default aim straight down/up
    };
  }

  function createAIThrower(name, color, isTop) {
    return {
      id: `ai-throw-${Math.random().toString(36).slice(2,6)}`,
      name,
      x: W * 0.5,
      y: isTop ? 60 : H - 60,
      isHuman: false,
      color,
      alive: true,
      speedMultiplier: 1,
      isTop: isTop,
      direction: Math.random() > 0.5 ? 1 : -1 // Initialize AI direction
    };
  }

  function createHumanDodger(name, controlSet, color, startX) {
    return {
      id: `human-dod-${Math.random().toString(36).slice(2,6)}`,
      name,
      x: startX,
      y: H * 0.5,
      isHuman: true,
      control: controlSet,
      color,
      alive: true,
      speedMultiplier: 1,
      lastReact: 0
    };
  }

  function createAIDodger(name, color, startX) {
    return {
      id: `ai-dod-${Math.random().toString(36).slice(2,6)}`,
      name,
      x: startX,
      y: H * 0.5,
      isHuman: false,
      color,
      alive: true,
      speedMultiplier: 1,
      lastReact: 0
    };
  }

  // --- Drawing Functions ---
  function drawHuman(p, isThrower = false) {
    const x = p.x, y = p.y;
    ctx.save();
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(x, y + 30, 26, 10, 0, 0, Math.PI*2);
    ctx.fill();
    
    // Head
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y-14, 12, 0, Math.PI*2);
    ctx.fill();
    
    // Body
    ctx.fillStyle = p.color || '#ff6b6b';
    ctx.fillRect(x-10, y-4, 20, 28);
    
    // Arms
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x-10,y+4);
    ctx.lineTo(x-22,y+8);
    ctx.moveTo(x+10,y+4);
    ctx.lineTo(x+22,y+8);
    ctx.stroke();
    
    // Legs
    ctx.beginPath();
    ctx.moveTo(x-6,y+24);
    ctx.lineTo(x-12,y+44);
    ctx.moveTo(x+6,y+24);
    ctx.lineTo(x+12,y+44);
    ctx.stroke();
    
    // Name label
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '11px Raleway';
    ctx.textAlign = 'center';
    ctx.fillText(p.name || '', x, y-30);
    
    // Draw aim indicator for throwers
    if (isThrower && p.isHuman && p === throwers[currentThrowerIndex] && !ballInFlight) {
      const aimLength = 40;
      const aimX = x + Math.cos(p.aimAngle) * aimLength;
      const aimY = y + Math.sin(p.aimAngle) * aimLength;
      
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(aimX, aimY);
      ctx.stroke();
      
      // Draw aim circle
      ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
      ctx.beginPath();
      ctx.arc(aimX, aimY, 6, 0, Math.PI*2);
      ctx.fill();
    }
    
    ctx.restore();
  }

  function drawBall(b) {
    ctx.save();
    ctx.fillStyle = '#fdd835';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 10, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function drawCourt() {
    // Court markings
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, H/2);
    ctx.lineTo(W, H/2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(W/2, H/2, H*0.09, 0, Math.PI*2);
    ctx.stroke();
    
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(0, H*0.4, W, H*0.2);
  }

  function drawThrowGuide() {
    if (!throwGuide.visible) return;
    
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(throwGuide.startX, throwGuide.startY);
    ctx.lineTo(throwGuide.endX, throwGuide.endY);
    ctx.stroke();
    ctx.restore();
  }

  // --- Team Setup ---
  function buildTeams() {
    throwers = [];
    dodgers = [];
    difficulty = selectDifficulty.value || 'easy';
    
    if (mode === 'thrower') {
      humanThrowerCount = Number(selectThrowerCount.value || 1);
      
      // Create human throwers on opposite sides
      if (humanThrowerCount >= 1) {
        throwers.push(createHumanThrower('You', controls.thrower1, '#4ac0e6', true));
      }
      if (humanThrowerCount >= 2) {
        throwers.push(createHumanThrower('You 2', controls.thrower2, '#7fe36a', false));
      }
      
      // Add AI teammates if needed
      if (humanThrowerCount === 1) {
        throwers.push(createAIThrower('AI-Thrower', '#f59b42', false));
      }
      
      // Position throwers
      throwers.forEach((t, i) => {
        t.x = W * (0.3 + 0.4 * (i % 2));
      });
      
      // Create AI dodgers
      for (let i = 0; i < 4; i++) {
        const sx = W * (0.25 + i * 0.15);
        dodgers.push(createAIDodger(`AI-Dodger-${i+1}`, '#ff6b6b', sx));
      }
    } else {
      // Dodger mode
      humanDodgerCount = Number(selectDodgerCount.value || 1);
      const orderColors = ['#4ac0e6','#7fe36a','#ffd86b','#c88cff'];
      
      // Create human and AI dodgers
      for (let i = 0; i < 4; i++) {
        const sx = W * (0.25 + i * 0.15);
        if (i < humanDodgerCount) {
          dodgers.push(createHumanDodger(`You${i+1}`, controls.dodgers[i], orderColors[i], sx));
        } else {
          dodgers.push(createAIDodger(`AI-Dodger-${i+1}`, '#ff7b7b', sx));
        }
      }
      
      // Create AI throwers on opposite sides
      throwers.push(createAIThrower('AI-T1', '#f59b42', true));
      throwers.push(createAIThrower('AI-T2', '#f59b42', false));
      
      throwers.forEach((t, i) => {
        t.x = W * (0.3 + 0.4 * (i % 2));
      });
    }
    
    // Set difficulty parameters for AI
    const dd = DIFF[difficulty];
    dodgers.forEach(d => {
      d.reactMs = dd.react;
      d.successProb = dd.success;
      d.speed = 1 * dd.speed;
    });
    
    // Reset game state
    currentThrowerIndex = 0;
    ballInFlight = false;
    activeBall = null;
    playerScore = 0;
    
    updateTurnLabel();
    updateControlsLegend();
  }

  // --- Game Mechanics ---
  function updateTurnLabel() {
    if (!hud) return;
    const t = throwers[currentThrowerIndex];
    turnLabel.innerText = `Turn: ${t ? (t.isHuman ? 'Human' : t.name) : '-'}`;
  }

  function updateControlsLegend() {
    if (!hud) return;
    let txt = '';
    
    if (mode === 'thrower') {
      txt = 'Thrower controls — Player1: A/D to move, W/S to aim, Space to throw. Player2: Arrows to move/aim, Numpad5 to throw.';
    } else {
      txt = 'Dodger controls: D1 WASD, D2 IJKL, D3 Arrows, D4 Numpad 8/5/4/6';
    }
    
    controlsLegend.innerText = txt;
  }

  function startThrowGuide(thrower) {
    throwGuide.visible = true;
    throwGuide.startX = thrower.x;
    throwGuide.startY = thrower.y;
    throwGuide.endX = thrower.x + Math.cos(thrower.aimAngle) * 200;
    throwGuide.endY = thrower.y + Math.sin(thrower.aimAngle) * 200;
  }

  function updateThrowGuideFromAim(thrower) {
    if (!throwGuide.visible) return;
    
    throwGuide.endX = thrower.x + Math.cos(thrower.aimAngle) * 200;
    throwGuide.endY = thrower.y + Math.sin(thrower.aimAngle) * 200;
  }

  function executeThrow() {
    if (ballInFlight) return false;
    
    const thrower = throwers[currentThrowerIndex];
    if (!thrower || !thrower.alive) return false;
    
    // Calculate direction based on aim angle
    const dirX = Math.cos(thrower.aimAngle);
    const dirY = Math.sin(thrower.aimAngle);
    
    // Create ball with velocity
    const ball = {
      id: ++ballIdCounter,
      x: thrower.x,
      y: thrower.y,
      dirX,
      dirY,
      speed: 400,
      ownerIndex: currentThrowerIndex
    };
    
    activeBall = ball;
    ballInFlight = true;
    throwGuide.visible = false;
    
    return true;
  }

  function updateBall(dt) {
    if (!activeBall) return;
    
    const speed = activeBall.speed * (dt / 1000);
    activeBall.x += activeBall.dirX * speed;
    activeBall.y += activeBall.dirY * speed;
    
    // Check collisions with dodgers
    for (let i = 0; i < dodgers.length; i++) {
      const d = dodgers[i];
      if (!d.alive) continue;
      
      const dx = activeBall.x - d.x;
      const dy = activeBall.y - d.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 26) {
        // Hit
        d.alive = false;
        resolveBall({ hitIndex: i, hit: true });
        return;
      }
    }
    
    // Check if ball is out of bounds
    if (activeBall.x < -40 || activeBall.x > W + 40 || 
        activeBall.y < -40 || activeBall.y > H + 40) {
      resolveBall({ hit: false });
    }
  }

  function resolveBall({ hit, hitIndex }) {
    const owner = throwers[activeBall.ownerIndex];
    if (hit && owner && owner.isHuman) {
      playerScore += 1;
    }
    
    activeBall = null;
    ballInFlight = false;
    
    // Rotate turn
    currentThrowerIndex = (currentThrowerIndex + 1) % throwers.length;
    updateTurnLabel();
    updateScoreboard();
    
    // If next thrower is AI, schedule their throw
    const next = throwers[currentThrowerIndex];
    if (next && !next.isHuman) {
      setTimeout(() => aiThrow(next, currentThrowerIndex), 600 + Math.random() * 700);
    }
    
    // Check game over
    const anyAlive = dodgers.some(d => d.alive);
    if (!anyAlive) endGame();
  }

  function aiThrow(aiObj, idx) {
    if (ballInFlight || idx !== currentThrowerIndex) return;
    
    // Pick a random target (alive dodger)
    const aliveDodgers = dodgers.filter(d => d.alive);
    if (aliveDodgers.length === 0) return;
    
    const target = aliveDodgers[Math.floor(Math.random() * aliveDodgers.length)];
    
    // Calculate direction to target
    const dx = target.x - aiObj.x;
    const dy = target.y - aiObj.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const dirX = dx / length;
    const dirY = dy / length;
    
    // Create ball
    const ball = {
      id: ++ballIdCounter,
      x: aiObj.x,
      y: aiObj.y,
      dirX,
      dirY,
      speed: 400,
      ownerIndex: idx
    };
    
    activeBall = ball;
    ballInFlight = true;
  }

  function updateAIDodgers(dt) {
    const aliveBall = activeBall;
    const params = DIFF[difficulty];
    
    dodgers.forEach(d => {
      if (d.isHuman || !d.alive) return;
      
      if (!aliveBall) {
        // Idle wandering
        d.x += (Math.random() - 0.5) * 20 * (dt / 1000) * params.speed;
        d.x = Math.max(30, Math.min(W - 30, d.x));
      } else {
        // React to ball
        const now = Date.now();
        if (now - (d.lastReact || 0) < d.reactMs) return;
        
        d.lastReact = now;
        
        if (Math.random() > d.successProb) {
          // Failed reaction
          if (Math.random() > 0.6) {
            d.x += (Math.random() > 0.5 ? -1 : 1) * 30 * params.speed;
          }
        } else {
          // Successful dodge
          if (Math.abs(aliveBall.x - d.x) < 120) {
            const leftSpace = d.x - 30;
            const rightSpace = (W - 30) - d.x;
            const dir = rightSpace > leftSpace ? 1 : -1;
            d.x += dir * (80 * params.speed);
            d.x = Math.max(30, Math.min(W - 30, d.x));
          } else {
            d.x += (W/2 - d.x) * 0.02 * params.speed;
          }
        }
      }
    });
  }

  // Add this new function to update AI throwers
  function updateAIThrowers(dt) {
    throwers.forEach((t, idx) => {
      if (t.isHuman || !t.alive) return;
      
      // AI throwers move randomly left and right
      if (Math.random() < 0.02) {
        t.direction = (Math.random() > 0.5) ? 1 : -1;
      }
      
      t.x += t.direction * 100 * (dt / 1000);
      
      // Constrain movement
      t.x = Math.max(30, Math.min(W - 30, t.x));
      
      // Reverse direction at edges
      if (t.x <= 30 || t.x >= W - 30) {
        t.direction *= -1;
      }
      
      // Occasionally throw balls
      if (!ballInFlight && idx === currentThrowerIndex && Math.random() < 0.01) {
        aiThrow(t, idx);
      }
    });
  }

  function updateHumans(dt) {
    const speedBase = 300 * (dt / 1000);
    
    // Update human throwers
    throwers.forEach((t, idx) => {
      if (!t.isHuman || !t.alive) return;
      
      const set = t.control;
      
      // Horizontal movement only (left/right)
      if (keyState[set.left]) t.x -= speedBase * t.speedMultiplier;
      if (keyState[set.right]) t.x += speedBase * t.speedMultiplier;
      
      // Constrain movement based on position
      t.x = Math.max(30, Math.min(W - 30, t.x));
      
      // Aim adjustment (up/down)
      const aimSpeed = 0.05;
      if (keyState[set.aimUp]) {
        if (t.isTop) {
          t.aimAngle = Math.max(Math.PI/4, Math.min(3*Math.PI/4, t.aimAngle - aimSpeed));
        } else {
          t.aimAngle = Math.max(-3*Math.PI/4, Math.min(-Math.PI/4, t.aimAngle - aimSpeed));
        }
      }
      if (keyState[set.aimDown]) {
        if (t.isTop) {
          t.aimAngle = Math.max(Math.PI/4, Math.min(3*Math.PI/4, t.aimAngle + aimSpeed));
        } else {
          t.aimAngle = Math.max(-3*Math.PI/4, Math.min(-Math.PI/4, t.aimAngle + aimSpeed));
        }
      }
      
      // Handle throw key
      if (keyState[set.throw] && idx === currentThrowerIndex && !ballInFlight) {
        if (!keyState._throwHandled) {
          startThrowGuide(t);
          keyState._throwHandled = true;
        }
      } else if (keyState._throwHandled) {
        // Throw when key is released
        executeThrow();
        keyState._throwHandled = false;
      }
      
      // Update throw guide if visible
      if (throwGuide.visible && idx === currentThrowerIndex) {
        updateThrowGuideFromAim(t);
      }
    });
    
    // Update human dodgers
    dodgers.forEach((d, idx) => {
      if (!d.isHuman || !d.alive) return;
      
      const set = d.control;
      if (!set) return;
      
      const sp = speedBase * 1.0;
      if (keyState[set.left]) d.x -= sp;
      if (keyState[set.right]) d.x += sp;
      if (keyState[set.up]) d.y -= sp;
      if (keyState[set.down]) d.y += sp;
      
      d.x = Math.max(30, Math.min(W - 30, d.x));
      d.y = Math.max(H * 0.4, Math.min(H * 0.6, d.y));
    });
  }

  function updateScoreboard() {
    const alive = dodgers.filter(d => d.alive).length;
    scoreboardEl.innerText = `Dodgers Remaining: ${alive} Score: ${playerScore}`;
  }

async function endGame() {
  gameRunning = false;
  
  try {
    if (localPlayer && localPlayer.id) {
      // Determine if player won or lost
      const isThrower = mode === 'thrower';
      const dodgersAlive = dodgers.filter(d => d.alive).length;
      const playerWon = (isThrower && dodgersAlive === 0) || (!isThrower && dodgersAlive > 0);
      
      const response = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: localPlayer.id,
          role: mode,
          difficulty,
          score: playerScore,
          result: playerWon ? 'win' : 'loss'
        })
      });
      
      const result = await response.json();
      if (!response.ok) {
        console.warn('Score submission failed:', result.error);
      } else {
        console.log('Score submitted successfully:', result.message);
      }
    }
  } catch (e) {
    console.warn('Score submission failed', e);
  }
  
  // Show game over modal
  finalScoreText.textContent = `Your score: ${playerScore}`;
  gameOverModal.classList.remove("hidden");
}

  // --- Game Loop ---
  let lastTime = performance.now();
  
  function frame(now) {
    const dt = now - lastTime;
    lastTime = now;
    
    // Clear canvas
    ctx.clearRect(0, 0, W, H);
    
    // Draw game elements
    drawCourt();
    
    if (gameRunning) {
      // Update game state
      updateHumans(dt);
      updateAIThrowers(dt); // Add this line
      updateAIDodgers(dt);
      updateBall(dt);
      
      // Draw entities
      throwers.forEach(t => { if (t.alive) drawHuman(t, true); });
      dodgers.forEach(d => { if (d.alive) drawHuman(d, false); });
      if (activeBall) drawBall(activeBall);
      if (throwGuide.visible) drawThrowGuide();
      
      // Update HUD
      updateScoreboard();
    }
    
    requestAnimationFrame(frame);
  }

  // --- Start Game ---
  btnPlay.addEventListener('click', async () => {
    const name = playerNameInput.value.trim();
    if (!name) return alert('Please enter your name');
    
    mode = btnModeThrower.classList.contains('active') ? 'thrower' : 'dodger';
    difficulty = selectDifficulty.value || 'easy';
    humanThrowerCount = Number(selectThrowerCount.value || 1);
    humanDodgerCount = Number(selectDodgerCount.value || 1);
    
    // Create player record
    try {
      const res = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const j = await res.json();
      localPlayer = j.player || null;
    } catch (e) {
      console.warn('Player creation error', e);
      localPlayer = { id: null, name };
    }
    
    // Hide options, show HUD and start game
    gameOptionsPage.classList.add('hidden');
    hud.classList.remove('hidden');
    buildTeams();
    gameRunning = true;
    lastTime = performance.now();
    requestAnimationFrame(frame);
  });

  // Exit to menu button
  btnExit.addEventListener('click', () => {
    gameRunning = false;
    activeBall = null;
    ballInFlight = false;
    playerScore = 0;
    hud.classList.add('hidden');
    showPage(mainMenuPage);
  });

  

  // Game over modal buttons
  restartBtn.addEventListener('click', () => {
    gameOverModal.classList.add('hidden');
    buildTeams();
    gameRunning = true;
    lastTime = performance.now();
    requestAnimationFrame(frame);
  });

  menuBtn.addEventListener('click', () => {
    gameOverModal.classList.add('hidden');
    hud.classList.add('hidden');
    showPage(mainMenuPage);
  });

  // Initialize
  updateScoreboard();
  updateControlsLegend();
  updateTurnLabel();

  // Start the game loop
  requestAnimationFrame(frame);
})();