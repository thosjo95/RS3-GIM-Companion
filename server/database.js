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

// Achievements table (safe to run on existing DBs)
db.exec(`
  CREATE TABLE IF NOT EXISTS achievements (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id   INTEGER NOT NULL,
    type        TEXT    NOT NULL DEFAULT 'diary',
    key         TEXT    NOT NULL,
    achieved    INTEGER NOT NULL DEFAULT 0,
    achieved_at DATETIME,
    manual      INTEGER NOT NULL DEFAULT 0,
    UNIQUE(player_id, key),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
  );
`);

// Boss kill tracker — populated from RuneMetrics activity feed (safe to run on existing DBs)
db.exec(`
  CREATE TABLE IF NOT EXISTS boss_kills (
    player_id INTEGER NOT NULL,
    boss_key  TEXT    NOT NULL,
    kills     INTEGER NOT NULL DEFAULT 0,
    last_seen TEXT,
    PRIMARY KEY (player_id, boss_key),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
  );

  -- Dedup log: each unique (player, activity_sig) counted at most once
  CREATE TABLE IF NOT EXISTS boss_kill_log (
    player_id    INTEGER NOT NULL,
    activity_sig TEXT    NOT NULL,
    PRIMARY KEY (player_id, activity_sig),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
  );
`);

// Group notes — one shared text note per group
db.exec(`
  CREATE TABLE IF NOT EXISTS group_notes (
    group_id   INTEGER PRIMARY KEY,
    content    TEXT    NOT NULL DEFAULT '',
    updated_at DATETIME,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
  );
`);

// Equipment loadouts — per player, per style, per slot
db.exec(`
  CREATE TABLE IF NOT EXISTS equipment_loadouts (
    player_id  INTEGER NOT NULL,
    style      TEXT    NOT NULL,
    slot       TEXT    NOT NULL,
    item_name  TEXT,
    updated_at DATETIME,
    PRIMARY KEY (player_id, style, slot),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
  );
`);

// Persistent activity feed — accumulates RuneMetrics entries forever.
// Deduplicated by (player_id, date_str, text) via UNIQUE constraint.
// activities_json on the players table is a cache rebuilt from this table.
db.exec(`
  CREATE TABLE IF NOT EXISTS player_activities (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id  INTEGER NOT NULL,
    date_str   TEXT    NOT NULL,
    ts         DATETIME,
    text       TEXT    NOT NULL,
    details    TEXT,
    saved_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_id, date_str, text),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_player_activities_ts ON player_activities(player_id, ts DESC);
`);

// Migrations — safe to run on existing DBs
try { db.exec('ALTER TABLE goals ADD COLUMN details_json TEXT'); } catch {}
try { db.exec('ALTER TABLE groups ADD COLUMN gim_type TEXT DEFAULT \'regular\''); } catch {}
try { db.exec('ALTER TABLE groups ADD COLUMN gim_size INTEGER DEFAULT 5'); } catch {}
try { db.exec('ALTER TABLE groups ADD COLUMN password_hash TEXT'); } catch {}
try { db.exec('ALTER TABLE groups ADD COLUMN last_activity DATETIME'); } catch {}
try { db.exec('ALTER TABLE players ADD COLUMN stats_json TEXT'); } catch {}
try { db.exec('ALTER TABLE players ADD COLUMN activities_json TEXT'); } catch {}
try { db.exec('ALTER TABLE item_requests ADD COLUMN quantity INTEGER DEFAULT 1'); } catch {}
// confirmed=1 means player has verified they own/wear the item; 0=planning/goal
try { db.exec('ALTER TABLE equipment_loadouts ADD COLUMN confirmed INTEGER DEFAULT 0'); } catch {}
// Discord webhook settings per group
try { db.exec('ALTER TABLE groups ADD COLUMN discord_webhook_url TEXT'); } catch {}
try { db.exec("ALTER TABLE groups ADD COLUMN webhook_events TEXT DEFAULT '[\"level_milestones\",\"diary_completions\",\"boss_first_kills\",\"goal_completions\"]'"); } catch {}
// Per-player sync error tracking — set on failure, cleared on success
try { db.exec('ALTER TABLE players ADD COLUMN sync_error TEXT'); } catch {}
try { db.exec('ALTER TABLE players ADD COLUMN sync_error_at DATETIME'); } catch {}

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
