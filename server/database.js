// Uses the built-in node:sqlite module (Node.js 22+) — no native compilation needed
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const db = new DatabaseSync(path.join(dataDir, 'gim.db'));

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    group_rsn TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rsn TEXT NOT NULL UNIQUE,
    quest_points INTEGER DEFAULT 0,
    combat_level INTEGER DEFAULT 3,
    group_id INTEGER,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_synced DATETIME,
    FOREIGN KEY (group_id) REFERENCES groups(id)
  );

  CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    skill_name TEXT NOT NULL,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    rank INTEGER DEFAULT -1,
    UNIQUE(player_id, skill_name),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    snapshot_date DATE NOT NULL,
    total_xp INTEGER DEFAULT 0,
    total_level INTEGER DEFAULT 0,
    skills_json TEXT,
    UNIQUE(player_id, snapshot_date),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL DEFAULT 'personal',
    owner_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'skill',
    skill TEXT,
    target_value INTEGER,
    current_value INTEGER DEFAULT 0,
    status TEXT DEFAULT 'not_started',
    priority TEXT DEFAULT 'medium',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (owner_id) REFERENCES players(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS goal_contributors (
    goal_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    PRIMARY KEY (goal_id, player_id),
    FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS drops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    boss_name TEXT,
    quantity INTEGER DEFAULT 1,
    value_gp INTEGER,
    notes TEXT,
    dropped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS item_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    boss_name TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    obtained INTEGER DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    obtained_at DATETIME,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
  );
`);

// Migrations — safe to run on existing DBs
try { db.exec('ALTER TABLE goals ADD COLUMN details_json TEXT'); } catch {}
try { db.exec('ALTER TABLE groups ADD COLUMN gim_type TEXT DEFAULT \'regular\''); } catch {}
try { db.exec('ALTER TABLE groups ADD COLUMN gim_size INTEGER DEFAULT 5'); } catch {}

// Helper: run a function inside a BEGIN/COMMIT transaction
db.runTransaction = function (fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
};

module.exports = db;
