// server.js
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors()); // TODO: restrict origin in production
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

// Test DB connection at startup
pool.getConnection()
  .then(conn => {
    console.log("✅ MySQL connected");
    conn.release();
  })
  .catch(err => {
    console.error("❌ MySQL connection failed:", err.message);
  });

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
  const [rows] = await pool.query(
    `SELECT p.id as player_id, p.name, 
            lb.total_score, lb.games_played, 
            lb.wins, lb.losses
     FROM leaderboard_stats lb
     JOIN players p ON p.id = lb.player_id
     WHERE lb.role = ? AND lb.difficulty = ?
     ORDER BY lb.total_score DESC
     LIMIT ?`,
    [role, difficulty, Number(limit)]
  );
  return rows;
}

// -----------------
// Routes
// -----------------

// POST /api/start => create a player
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

// GET /api/mechanics
app.get('/api/mechanics', async (req, res) => {
  try {
    const rows = await getMechanics();
    res.json(rows);
  } catch (err) {
    console.error('GET /api/mechanics', err.message);
    res.status(500).json({ error: 'server error' });
  }
});

// GET /api/leaderboard
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

/*
 POST /api/score
 body: { playerId, role, difficulty, score, result }
 result = 'win' | 'loss'
*/
app.post('/api/score', async (req, res) => {
  try {
    const { playerId, role = 'dodger', difficulty = 'easy', score = 0, result = null } = req.body;
    if (!playerId) return res.status(400).json({ error: 'playerId required' });
    if (!['dodger', 'thrower'].includes(role)) return res.status(400).json({ error: 'invalid role' });

    let winIncrement = 0;
    let lossIncrement = 0;
    if (result === 'win') winIncrement = 1;
    if (result === 'loss') lossIncrement = 1;

    // Upsert into leaderboard_stats
    await pool.query(
      `INSERT INTO leaderboard_stats (player_id, role, difficulty, total_score, games_played, wins, losses)
       VALUES (?,?,?,?,1,?,?)
       ON DUPLICATE KEY UPDATE 
         total_score = total_score + VALUES(total_score),
         games_played = games_played + 1,
         wins = wins + VALUES(wins),
         losses = losses + VALUES(losses)`,
      [playerId, role, difficulty, Number(score), winIncrement, lossIncrement]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/score', err.message);
    res.status(500).json({ error: 'server error' });
  }
});

// -----------------
// Fallback -> frontend
// -----------------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// -----------------
// Start server
// -----------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
