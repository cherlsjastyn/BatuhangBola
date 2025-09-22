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

  // Ability UI
  const abilityBar = document.createElement('div');
  abilityBar.id = 'abilityBar';
  abilityBar.className = 'ability-bar hidden';
  abilityBar.innerHTML = `
    <div class="ability-group">
      <button id="ability1" class="ability-btn" disabled>Ability 1</button>
      <span class="ability-count">2</span>
    </div>
    <div class="ability-group">
      <button id="ability2" class="ability-btn" disabled>Ability 2</button>
      <span class="ability-count">2</span>
    </div>
  `;
  document.body.appendChild(abilityBar);

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

  // Obstacles
  let obstacles = [];

  // Ability keys
  const ABILITY_KEYS = {
    player1: { ability1: 'KeyZ', ability2: 'KeyX' },
    player2: { ability1: 'KeyN', ability2: 'KeyM' },
    player3: { ability1: 'BracketLeft', ability2: 'BracketRight' },
    player4: { ability1: 'Numpad0', ability2: 'Numpad1' }
  };

  // Difficulty settings
  const DIFF = {
    easy: { react: 900, success: 0.45, speed: 0.8 },
    medium: { react: 500, success: 0.7, speed: 1.0, obstacles: true },
    hard: { react: 250, success: 0.9, speed: 1.0, obstacles: true, fastBalls: true } // Removed dodger speed boost
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

  // --- Obstacle Class ---
  class Obstacle {
    constructor(x, y, width, height, type) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.type = type; // 'static' or 'moving'
      this.speed = type === 'moving' ? (Math.random() * 2 + 1) : 0;
      this.direction = Math.random() > 0.5 ? 1 : -1;
    }
    
    update(dt) {
      if (this.type === 'moving') {
        this.x += this.speed * this.direction * (dt / 1000);
        
        // Reverse direction at boundaries
        if (this.x < 0 || this.x + this.width > W) {
          this.direction *= -1;
        }
      }
    }
    
    draw() {
      ctx.save();
      ctx.fillStyle = 'rgba(100, 100, 100, 0.7)';
      ctx.fillRect(this.x, this.y, this.width, this.height);
      
      // Add some visual details
      ctx.strokeStyle = 'rgba(50, 50, 50, 0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x, this.y, this.width, this.height);
      
      ctx.restore();
    }
  }

  // --- Ability Class ---
  class Ability {
    constructor(player, type, key, uses = 2) {
      this.player = player;
      this.type = type;
      this.key = key;
      this.uses = uses;
      this.maxUses = uses;
      this.cooldown = 0;
    }
    
    activate() {
      if (this.uses <= 0 || this.cooldown > 0) return false;
      
      this.uses--;
      this.cooldown = 180; // 3 seconds at 60fps
      
      // Apply ability effect based on type
      switch(this.type) {
        case 'speedBoost':
          this.player.speedMultiplier = 1.8;
          setTimeout(() => {
            this.player.speedMultiplier = 1;
          }, 3000);
          break;
          
        case 'temporaryShield':
          this.player.shielded = true;
          setTimeout(() => {
            this.player.shielded = false;
          }, 3000);
          break;
          
        case 'freeze':
          // Freeze all opponents for 2 seconds
          if (this.player.isThrower) {
            dodgers.forEach(d => {
              d.frozen = true;
              setTimeout(() => {
                d.frozen = false;
              }, 2000);
            });
          } else {
            throwers.forEach(t => {
              t.frozen = true;
              setTimeout(() => {
                t.frozen = false;
              }, 2000);
            });
          }
          break;
          
        case 'rapidFire':
          if (this.player.isThrower) {
            this.player.rapidFire = true;
            setTimeout(() => {
              this.player.rapidFire = false;
            }, 3000);
          }
          break;
      }
      
      return true;
    }
    
    update() {
      if (this.cooldown > 0) {
        this.cooldown--;
      }
    }
  }

  // --- Entity Creation Functions ---
  function createHumanThrower(name, controlSet, color, isTop, playerIndex) {
    const player = {
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
      isThrower: true,
      aimAngle: isTop ? Math.PI/2 : -Math.PI/2,
      abilities: [],
      shielded: false,
      frozen: false,
      rapidFire: false
    };
    
    // Add abilities based on player index
    if (playerIndex === 0) {
      player.abilities = [
        new Ability(player, 'rapidFire', ABILITY_KEYS.player1.ability1),
        new Ability(player, 'freeze', ABILITY_KEYS.player1.ability2)
      ];
    } else if (playerIndex === 1) {
      player.abilities = [
        new Ability(player, 'rapidFire', ABILITY_KEYS.player2.ability1),
        new Ability(player, 'freeze', ABILITY_KEYS.player2.ability2)
      ];
    }
    
    return player;
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
      isThrower: true,
      direction: Math.random() > 0.5 ? 1 : -1,
      rapidFire: false
    };
  }

  function createHumanDodger(name, controlSet, color, startX, playerIndex) {
    // Calculate middle area between throwers
    const topThrowerY = throwers.find(t => t.isTop)?.y || 60;
    const bottomThrowerY = throwers.find(t => !t.isTop)?.y || H - 60;
    const middleY = topThrowerY + (bottomThrowerY - topThrowerY) / 2;
    
    const player = {
      id: `human-dod-${Math.random().toString(36).slice(2,6)}`,
      name,
      x: startX,
      y: middleY, // Start in the middle of the extended area
      isHuman: true,
      control: controlSet,
      color,
      alive: true,
      speedMultiplier: 1,
      lastReact: 0,
      scoredOnThisBall: false,
      isThrower: false,
      abilities: [],
      shielded: false,
      frozen: false
    };
    
    // Add abilities based on player index
    if (playerIndex === 0) {
      player.abilities = [
        new Ability(player, 'speedBoost', ABILITY_KEYS.player1.ability1),
        new Ability(player, 'temporaryShield', ABILITY_KEYS.player1.ability2)
      ];
    } else if (playerIndex === 1) {
      player.abilities = [
        new Ability(player, 'speedBoost', ABILITY_KEYS.player2.ability1),
        new Ability(player, 'temporaryShield', ABILITY_KEYS.player2.ability2)
      ];
    } else if (playerIndex === 2) {
      player.abilities = [
        new Ability(player, 'speedBoost', ABILITY_KEYS.player3.ability1),
        new Ability(player, 'temporaryShield', ABILITY_KEYS.player3.ability2)
      ];
    } else if (playerIndex === 3) {
      player.abilities = [
        new Ability(player, 'speedBoost', ABILITY_KEYS.player4.ability1),
        new Ability(player, 'temporaryShield', ABILITY_KEYS.player4.ability2)
      ];
    }
    
    return player;
  }

  function createAIDodger(name, color, startX) {
    // Calculate middle area between throwers
    const topThrowerY = throwers.find(t => t.isTop)?.y || 60;
    const bottomThrowerY = throwers.find(t => !t.isTop)?.y || H - 60;
    const middleY = topThrowerY + (bottomThrowerY - topThrowerY) / 2;
    
    return {
      id: `ai-dod-${Math.random().toString(36).slice(2,6)}`,
      name,
      x: startX,
      y: middleY, // Start in the middle of the extended area
      isHuman: false,
      color,
      alive: true,
      speedMultiplier: 1,
      lastReact: 0,
      scoredOnThisBall: false,
      isThrower: false,
      shielded: false,
      frozen: false
    };
  }


  // --- Drawing Functions ---
  function drawHuman(p, isThrower = false) {
    const x = p.x, y = p.y;
    ctx.save();
    
    // Draw shield if active
    if (p.shielded) {
      ctx.fillStyle = 'rgba(0, 150, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(x, y, 30, 0, Math.PI*2);
      ctx.fill();
      
      ctx.strokeStyle = 'rgba(0, 150, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 30, 0, Math.PI*2);
      ctx.stroke();
    }
    
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
    
    // Extended dodger area (subtle background)
    const topThrowerY = throwers.find(t => t.isTop)?.y || 60;
    const bottomThrowerY = throwers.find(t => !t.isTop)?.y || H - 60;
    
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, topThrowerY + 30, W, bottomThrowerY - topThrowerY - 60);
    
    // Boundary lines for extended area
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, topThrowerY + 40);
    ctx.lineTo(W, topThrowerY + 40);
    ctx.moveTo(0, bottomThrowerY - 40);
    ctx.lineTo(W, bottomThrowerY - 40);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw obstacles
    obstacles.forEach(obstacle => obstacle.draw());
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

  // --- Obstacle Generation ---
  function generateObstacles() {
    const obstacleCount = difficulty === 'medium' ? 2 : 4;
    const isThrowerMode = mode === 'thrower';
    
    for (let i = 0; i < obstacleCount; i++) {
      const width = 40 + Math.random() * 60;
      const height = 20 + Math.random() * 40;
      
      // Position obstacles in the middle area (dodger zone)
      let x, y;
      
      if (isThrowerMode) {
        // For thrower mode, place obstacles in the dodging area
        x = Math.random() * (W - width);
        y = H * 0.3 + Math.random() * (H * 0.4 - height);
      } else {
        // For dodger mode, place obstacles throughout the court
        x = Math.random() * (W - width);
        y = H * 0.2 + Math.random() * (H * 0.6 - height);
      }
      
      const type = difficulty === 'hard' && Math.random() > 0.5 ? 'moving' : 'static';
      obstacles.push(new Obstacle(x, y, width, height, type));
    }
  }

  // --- Ability UI ---
  function updateAbilityUI() {
    const abilityBar = document.getElementById('abilityBar');
    if (!abilityBar) return;
    
    // Show ability bar only for human players
    const humanPlayers = [...throwers, ...dodgers].filter(p => p.isHuman);
    if (humanPlayers.length > 0) {
      abilityBar.classList.remove('hidden');
      
      // For simplicity, just show abilities for the first human player
      const player = humanPlayers[0];
      
      if (player.abilities && player.abilities.length >= 2) {
        const ability1 = document.getElementById('ability1');
        const ability2 = document.getElementById('ability2');
        
        if (ability1 && ability2) {
          // Extract key name without "Key" prefix
          const key1 = player.abilities[0].key.replace('Key', '').replace('Numpad', 'Num');
          const key2 = player.abilities[1].key.replace('Key', '').replace('Numpad', 'Num');
          
          ability1.textContent = `Ability 1 (${key1})`;
          ability2.textContent = `Ability 2 (${key2})`;
          
          ability1.disabled = player.abilities[0].uses <= 0 || player.abilities[0].cooldown > 0;
          ability2.disabled = player.abilities[1].uses <= 0 || player.abilities[1].cooldown > 0;
          
          const counts = abilityBar.querySelectorAll('.ability-count');
          if (counts.length >= 2) {
            counts[0].textContent = player.abilities[0].uses;
            counts[1].textContent = player.abilities[1].uses;
          }
        }
      }
    } else {
      abilityBar.classList.add('hidden');
    }
  }

  // --- Team Setup ---
  function buildTeams() {
    throwers = [];
    dodgers = [];
    obstacles = []; // Clear previous obstacles
    difficulty = selectDifficulty.value || 'easy';
    
    // Add obstacles for medium and hard difficulties
    if (difficulty !== 'easy') {
      generateObstacles();
    }
    
    if (mode === 'thrower') {
      humanThrowerCount = Number(selectThrowerCount.value || 1);
      
      // Create human throwers on opposite sides
      if (humanThrowerCount >= 1) {
        throwers.push(createHumanThrower('You', controls.thrower1, '#4ac0e6', true, 0));
      }
      if (humanThrowerCount >= 2) {
        throwers.push(createHumanThrower('You 2', controls.thrower2, '#7fe36a', false, 1));
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
          dodgers.push(createHumanDodger(`You${i+1}`, controls.dodgers[i], orderColors[i], sx, i));
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
      d.speed = 1 * dd.speed; // Removed speed boost for dodgers in hard mode
    });
    
    // Reset game state
    currentThrowerIndex = 0;
    ballInFlight = false;
    activeBall = null;
    playerScore = 0;
    
    updateTurnLabel();
    updateControlsLegend();
    updateAbilityUI();
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
    if (!thrower || !thrower.alive || thrower.frozen) return false;
    
    // Calculate direction based on aim angle
    const dirX = Math.cos(thrower.aimAngle);
    const dirY = Math.sin(thrower.aimAngle);
    
    // Create ball with velocity
    const ballSpeed = (difficulty === 'hard' && mode === 'dodger') ? 500 : 400;
    const ball = {
      id: ++ballIdCounter,
      x: thrower.x,
      y: thrower.y,
      dirX,
      dirY,
      speed: ballSpeed,
      ownerIndex: currentThrowerIndex
    };
    
    activeBall = ball;
    ballInFlight = true;
    throwGuide.visible = false;
    
    // If in rapid fire mode, schedule next throw
    if (thrower.rapidFire) {
      setTimeout(() => {
        if (currentThrowerIndex === ball.ownerIndex && !ballInFlight) {
          executeThrow();
        }
      }, 300);
    }
    
    return true;
  }

  function updateBall(dt) {
    if (!activeBall) return;
    
    const speed = activeBall.speed * (dt / 1000);
    activeBall.x += activeBall.dirX * speed;
    activeBall.y += activeBall.dirY * speed;
    
    // Check collisions with obstacles
    for (const obstacle of obstacles) {
      if (activeBall.x + 10 > obstacle.x && 
          activeBall.x - 10 < obstacle.x + obstacle.width &&
          activeBall.y + 10 > obstacle.y &&
          activeBall.y - 10 < obstacle.y + obstacle.height) {
        // Ball hit an obstacle - bounce off
        // Simple bounce logic - reverse direction
        activeBall.dirX *= -1;
        activeBall.dirY *= -1;
        
        // Add some randomness to the bounce
        activeBall.dirX += (Math.random() - 0.5) * 0.2;
        activeBall.dirY += (Math.random() - 0.5) * 0.2;
        
        // Normalize direction
        const length = Math.sqrt(activeBall.dirX * activeBall.dirX + activeBall.dirY * activeBall.dirY);
        activeBall.dirX /= length;
        activeBall.dirY /= length;
        
        // Move ball outside the obstacle to prevent multiple collisions
        activeBall.x += activeBall.dirX * 15;
        activeBall.y += activeBall.dirY * 15;
      }
    }
    
    // Check collisions with dodgers
    for (let i = 0; i < dodgers.length; i++) {
      const d = dodgers[i];
      if (!d.alive || d.shielded) continue;
      
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
    
    // NEW: Check if ball passed dodgers (for scoring)
    if (mode === 'dodger') {
      const ballOwner = throwers[activeBall.ownerIndex];
      if (ballOwner && !ballOwner.isHuman) { // Only AI throwers
        dodgers.forEach((dodger, index) => {
          if (dodger.alive && !dodger.scoredOnThisBall) {
            // Check if ball has passed the dodger
            const isBallPastDodger = 
              (ballOwner.isTop && activeBall.y > dodger.y) || 
              (!ballOwner.isTop && activeBall.y < dodger.y);
            
            if (isBallPastDodger) {
              // Dodger successfully avoided the ball
              if (dodger.isHuman) {
                playerScore += 1; // Human dodger scores
              }
              dodger.scoredOnThisBall = true; // Prevent multiple scores
              updateScoreboard();
            }
          }
        });
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
    
    // NEW: Reset scored flags for next ball
    dodgers.forEach(d => d.scoredOnThisBall = false);
    
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
    if (ballInFlight || idx !== currentThrowerIndex || aiObj.frozen) return;
    
    // Pick a random target (alive dodger)
    const aliveDodgers = dodgers.filter(d => d.alive && !d.shielded);
    if (aliveDodgers.length === 0) return;
    
    const target = aliveDodgers[Math.floor(Math.random() * aliveDodgers.length)];
    
    // Calculate direction to target
    const dx = target.x - aiObj.x;
    const dy = target.y - aiObj.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const dirX = dx / length;
    const dirY = dy / length;
    
    // Increase ball speed for hard difficulty in dodger mode
    const ballSpeed = (difficulty === 'hard' && mode === 'dodger') ? 500 : 400;
    
    // Create ball
    const ball = {
      id: ++ballIdCounter,
      x: aiObj.x,
      y: aiObj.y,
      dirX,
      dirY,
      speed: ballSpeed,
      ownerIndex: idx
    };
    
    activeBall = ball;
    ballInFlight = true;
    
    // If in rapid fire mode, schedule next throw
    if (aiObj.rapidFire) {
      setTimeout(() => aiThrow(aiObj, idx), 300);
    }
  }

function updateAIDodgers(dt) {
  const aliveBall = activeBall;
  const params = DIFF[difficulty];
  
  // Get thrower positions for movement boundaries
  const topThrowerY = throwers.find(t => t.isTop)?.y || 60;
  const bottomThrowerY = throwers.find(t => !t.isTop)?.y || H - 60;
  
  dodgers.forEach(d => {
    if (d.isHuman || !d.alive || d.frozen) return;
    
    let newX = d.x;
    let newY = d.y;
    
    if (!aliveBall) {
      // Idle wandering - within extended bounds
      newX += (Math.random() - 0.5) * 20 * (dt / 1000) * params.speed;
      
      // Also wander vertically within extended bounds
      newY += (Math.random() - 0.5) * 10 * (dt / 1000) * params.speed;
    } else {
      // React to ball
      const now = Date.now();
      if (now - (d.lastReact || 0) < d.reactMs) return;
      
      d.lastReact = now;
      
      if (Math.random() > d.successProb) {
        // Failed reaction - move randomly within extended bounds
        if (Math.random() > 0.6) {
          newX += (Math.random() > 0.5 ? -1 : 1) * 30 * params.speed;
        }
        if (Math.random() > 0.6) {
          newY += (Math.random() > 0.5 ? -1 : 1) * 20 * params.speed;
        }
      } else {
        // Successful dodge - strategic movement within extended bounds
        if (Math.abs(aliveBall.x - d.x) < 120) {
          const leftSpace = d.x - 30;
          const rightSpace = (W - 30) - d.x;
          const dir = rightSpace > leftSpace ? 1 : -1;
          newX += dir * (80 * params.speed);
        } else {
          newX += (W/2 - d.x) * 0.02 * params.speed;
        }
        
        // Also move vertically to avoid balls
        if (Math.abs(aliveBall.y - d.y) < 80) {
          const topSpace = d.y - (topThrowerY + 40);
          const bottomSpace = (bottomThrowerY - 40) - d.y;
          const dir = bottomSpace > topSpace ? 1 : -1;
          newY += dir * (60 * params.speed);
        }
      }
    }
    
    // Check collision before updating position
    if (!checkPlayerObstacleCollision(d, newX, newY)) {
      d.x = newX;
      d.y = newY;
    }
    
    // Constrain movement
    d.x = Math.max(30, Math.min(W - 30, d.x));
    d.y = Math.max(topThrowerY + 40, Math.min(bottomThrowerY - 40, d.y));
  });
}


  function updateAIThrowers(dt) {
    throwers.forEach((t, idx) => {
      if (t.isHuman || !t.alive || t.frozen) return;
      
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
    if (!t.isHuman || !t.alive || t.frozen) return;
    
    const set = t.control;
    let newX = t.x;
    let newY = t.y;
    
    // Calculate potential new position
    if (keyState[set.left]) newX -= speedBase * t.speedMultiplier;
    if (keyState[set.right]) newX += speedBase * t.speedMultiplier;
    
    // Check collision before updating position
    if (!checkPlayerObstacleCollision(t, newX, t.y)) {
      t.x = newX;
    }
    
    // Constrain movement based on position
    t.x = Math.max(30, Math.min(W - 30, t.x));
    
    // Aim adjustment (up/down) - no collision check needed for aiming
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
    
    // Handle abilities
    if (t.abilities) {
      t.abilities.forEach((ability, abilityIndex) => {
        if (keyState[ability.key] && !keyState[`ability_${ability.key}_handled`]) {
          if (ability.activate()) {
            updateAbilityUI();
          }
          keyState[`ability_${ability.key}_handled`] = true;
        } else if (!keyState[ability.key] && keyState[`ability_${ability.key}_handled`]) {
          keyState[`ability_${ability.key}_handled`] = false;
        }
      });
    }
  });
  
  // Update human dodgers - EXTENDED MOVEMENT AREA
  dodgers.forEach((d, idx) => {
    if (!d.isHuman || !d.alive || d.frozen) return;
    
    const set = d.control;
    if (!set) return;
    
    const sp = speedBase * d.speedMultiplier;
    let newX = d.x;
    let newY = d.y;
    
    // Calculate potential new position
    if (keyState[set.left]) newX -= sp;
    if (keyState[set.right]) newX += sp;
    if (keyState[set.up]) newY -= sp;
    if (keyState[set.down]) newY += sp;
    
    // Check collision before updating position (X movement)
    if (!checkPlayerObstacleCollision(d, newX, d.y)) {
      d.x = newX;
    } else {
      newX = d.x; // Reset X if collision detected
    }
    
    // Check collision before updating position (Y movement)
    if (!checkPlayerObstacleCollision(d, d.x, newY)) {
      d.y = newY;
    }
    
    // EXTENDED: Allow movement across the full width of the court
    d.x = Math.max(30, Math.min(W - 30, d.x));
    
    // EXTENDED: Allow vertical movement from just above bottom thrower to just below top thrower
    const topThrowerY = throwers.find(t => t.isTop)?.y || 60;
    const bottomThrowerY = throwers.find(t => !t.isTop)?.y || H - 60;
    
    d.y = Math.max(topThrowerY + 40, Math.min(bottomThrowerY - 40, d.y));
    
    // Handle abilities
    if (d.abilities) {
      d.abilities.forEach((ability, abilityIndex) => {
        if (keyState[ability.key] && !keyState[`ability_${ability.key}_handled`]) {
          if (ability.activate()) {
            updateAbilityUI();
          }
          keyState[`ability_${ability.key}_handled`] = true;
        } else if (!keyState[ability.key] && keyState[`ability_${ability.key}_handled`]) {
          keyState[`ability_${ability.key}_handled`] = false;
        }
      });
    }
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
      updateAIThrowers(dt);
      updateAIDodgers(dt);
      
      // Update obstacles
      obstacles.forEach(obstacle => obstacle.update(dt));
      
      updateBall(dt);
      
      // Update abilities
      const allPlayers = [...throwers, ...dodgers];
      allPlayers.forEach(player => {
        if (player.abilities) {
          player.abilities.forEach(ability => ability.update());
        }
      });
      
      // Draw entities
      throwers.forEach(t => { if (t.alive) drawHuman(t, true); });
      dodgers.forEach(d => { if (d.alive) drawHuman(d, false); });
      if (activeBall) drawBall(activeBall);
      if (throwGuide.visible) drawThrowGuide();
      
      // Update HUD
      updateScoreboard();
      updateAbilityUI();
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

  function checkPlayerObstacleCollision(player, newX, newY) {
  const playerRadius = 20; // Approximate player collision radius
  
  for (const obstacle of obstacles) {
    // Check if the player's new position would collide with an obstacle
    const closestX = Math.max(obstacle.x, Math.min(newX, obstacle.x + obstacle.width));
    const closestY = Math.max(obstacle.y, Math.min(newY, obstacle.y + obstacle.height));
    
    const distanceX = newX - closestX;
    const distanceY = newY - closestY;
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    
    if (distance < playerRadius) {
      return true; // Collision detected
    }
  }
  
  return false; // No collision
}
})();