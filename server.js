// server.js
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const { createServer } = require('node:http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app); // Use http.createServer for Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust for production
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// -----------------
// MySQL pool
// -----------------
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'batuhang_bola',
  waitForConnections: true,
  connectionLimit: 10,
});

// -----------------
// Database Init
// -----------------
async function initializeDatabase() {
  try {
    const conn = await pool.getConnection();
    console.log("✅ MySQL connected");

    const initQueries = [
      `CREATE TABLE IF NOT EXISTS players (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS leaderboard_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  player_id INT NOT NULL,
  player_name VARCHAR(255) NOT NULL,  // ADD THIS LINE
  role ENUM('dodger', 'thrower') DEFAULT 'dodger',
  difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'easy',
  total_score INT DEFAULT 0,
  games_played INT DEFAULT 0,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  UNIQUE KEY unique_player_role_diff (player_id, role, difficulty)
)`,
      `CREATE TABLE IF NOT EXISTS mechanics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `INSERT IGNORE INTO mechanics (id, title, content) VALUES
        (1, 'Game Objective', 'Dodgers must avoid balls thrown by throwers. Throwers aim to hit dodgers with balls.'),
        (2, 'Controls', 'Thrower 1: A/D to move, W/S to aim, Space to throw. Thrower 2: Arrows to move/aim, Numpad5 to throw. Dodgers: WASD for player 1, IJKL for player 2, Arrows for player 3, Numpad for player 4.'),
        (3, 'Scoring', 'Throwers earn points for each dodger hit. Dodgers earn points for surviving longer.'),
        (4, 'Winning', 'Throwers win by hitting all dodgers. Dodgers win by surviving the time limit or all throw attempts.')`
    ];

    for (const query of initQueries) {
      try {
        await conn.execute(query);
      } catch (err) {
        console.warn('Query execution warning:', err.message);
      }
    }

    console.log("✅ Database tables initialized");
    conn.release();
  } catch (err) {
    console.error("❌ MySQL connection failed:", err.message);
    console.error("Please check your database configuration in .env file");
  }
}

initializeDatabase();

// -----------------
// Helpers
// -----------------
async function createPlayer(name) {
  const [res] = await pool.query('INSERT INTO players (name) VALUES (?)', [name]);
  const id = res.insertId;
  const [rows] = await pool.query('SELECT id, name, created_at FROM players WHERE id = ?', [id]);
  return rows[0];
}

async function getMechanics() {
  const [rows] = await pool.query('SELECT id, title, content FROM mechanics ORDER BY id');
  return rows;
}

async function getLeaderboard(role = 'dodger', difficulty = 'easy', limit = 10) {
  try {
    const [rows] = await pool.query(
      `SELECT lb.player_id, lb.player_name, 
              lb.total_score, lb.games_played, 
              lb.wins, lb.losses
       FROM leaderboard_stats lb
       WHERE lb.role = ? AND lb.difficulty = ?
       ORDER BY lb.total_score DESC
       LIMIT ?`,
      [role, difficulty, Number(limit)]
    );
    return rows;
  } catch (err) {
    console.error('Error fetching leaderboard:', err.message);
    return [];
  }
}

// -----------------
// API Routes
// -----------------
app.post('/api/start', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const player = await createPlayer(name);
    res.json({ player });
  } catch (err) {
    console.error('POST /api/start', err.message);
    res.status(500).json({ error: 'server error' });
  }
});

app.get('/api/mechanics', async (req, res) => {
  try {
    const rows = await getMechanics();
    res.json(rows);
  } catch (err) {
    console.error('GET /api/mechanics', err.message);
    res.status(500).json({ error: 'server error' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const role = req.query.role || 'dodger';
    const difficulty = req.query.difficulty || 'easy';
    const limit = parseInt(req.query.limit || '10', 10);
    const rows = await getLeaderboard(role, difficulty, limit);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/leaderboard', err.message);
    res.status(500).json({ error: 'server error' });
  }
});

app.post('/api/score', async (req, res) => {
  try {
    const { playerId, playerName, role = 'dodger', difficulty = 'easy', score = 0, result = null } = req.body;

    if (!playerId) return res.status(400).json({ error: 'playerId required' });
    if (!playerName) return res.status(400).json({ error: 'playerName required' }); // ADD THIS VALIDATION
    if (!['dodger', 'thrower'].includes(role)) return res.status(400).json({ error: 'invalid role' });
    if (!['easy', 'medium', 'hard'].includes(difficulty)) return res.status(400).json({ error: 'invalid difficulty' });

    const [playerRows] = await pool.query('SELECT id, name FROM players WHERE id = ?', [playerId]);
    if (playerRows.length === 0) return res.status(400).json({ error: 'player not found' });

    let winIncrement = result === 'win' ? 1 : 0;
    let lossIncrement = result === 'loss' ? 1 : 0;

    await pool.query(
      `INSERT INTO leaderboard_stats (player_id, player_name, role, difficulty, total_score, games_played, wins, losses)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)
       ON DUPLICATE KEY UPDATE 
         player_name = VALUES(player_name), // ADD THIS LINE TO UPDATE NAME
         total_score = total_score + VALUES(total_score),
         games_played = games_played + 1,
         wins = wins + VALUES(wins),
         losses = losses + VALUES(losses),
         updated_at = CURRENT_TIMESTAMP`,
      [playerId, playerName, role, difficulty, Number(score), winIncrement, lossIncrement] // ADD playerName HERE
    );

    res.json({ ok: true, message: 'Score saved successfully' });
  } catch (err) {
    console.error('POST /api/score', err.message);
    res.status(500).json({ error: 'server error' });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.execute('SELECT 1');
    res.json({ status: 'OK', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', database: 'disconnected', error: err.message });
  }
});

// -----------------
// Fallback -> Frontend
// -----------------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// -----------------
// Socket.IO Events
// -----------------
let connectedPlayers = 0;
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

socket.on('scoreUpdate', async (data) => {
  try {
    const { playerId, playerName, role, difficulty, score, result } = data; // ADD playerName HERE

    await pool.query(
      `INSERT INTO leaderboard_stats (player_id, player_name, role, difficulty, total_score, games_played, wins, losses)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)
       ON DUPLICATE KEY UPDATE 
         player_name = VALUES(player_name), // ADD THIS LINE
         total_score = total_score + VALUES(total_score),
         games_played = games_played + 1,
         wins = wins + VALUES(wins),
         losses = losses + VALUES(losses),
         updated_at = CURRENT_TIMESTAMP`,
      [playerId, playerName, role, difficulty, Number(score), 
       result === 'win' ? 1 : 0, result === 'loss' ? 1 : 0]
    );

    const updatedLeaderboard = await getLeaderboard(role, difficulty, 10);
    io.emit('leaderboardUpdate', updatedLeaderboard);
  } catch (error) {
    console.error('Score update error:', error);
    socket.emit('error', 'Failed to update score');
  }
});

  socket.on('gameStateUpdate', (gameData) => {
    socket.broadcast.emit('gameStateSync', gameData);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// -----------------
// Start Server (ONLY ONCE)
// -----------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📡 Socket.IO server ready for real-time updates`);
});


