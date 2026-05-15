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

// ── RS3 reference tables ──────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS rs3_bosses (
    id               TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    difficulty       TEXT NOT NULL DEFAULT 'mid',
    min_combat_level INTEGER DEFAULT 0,
    requirements     TEXT NOT NULL DEFAULT '{}',
    drops            TEXT NOT NULL DEFAULT '[]',
    wiki_url         TEXT,
    last_verified_at TEXT
  );

  CREATE TABLE IF NOT EXISTS rs3_quests (
    id               TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    series           TEXT,
    members_only     INTEGER DEFAULT 1,
    quest_points     INTEGER DEFAULT 1,
    requirements     TEXT NOT NULL DEFAULT '{}',
    rewards          TEXT NOT NULL DEFAULT '[]',
    wiki_url         TEXT,
    last_verified_at TEXT
  );

  CREATE TABLE IF NOT EXISTS rs3_gear_items (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    tier                INTEGER DEFAULT 0,
    style               TEXT NOT NULL DEFAULT 'all',
    slot                TEXT NOT NULL DEFAULT 'weapon',
    is_power_armour     INTEGER DEFAULT 1,
    stats               TEXT NOT NULL DEFAULT '{}',
    acquisition_source  TEXT DEFAULT 'ge',
    source_id           TEXT,
    wiki_url            TEXT,
    last_verified_at    TEXT
  );

  CREATE TABLE IF NOT EXISTS rs3_gear_paths (
    id             TEXT PRIMARY KEY,
    style          TEXT NOT NULL,
    slot           TEXT NOT NULL,
    progression    TEXT NOT NULL DEFAULT '[]',
    last_updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS rs3_milestone_items (
    id               TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    category         TEXT NOT NULL DEFAULT 'pvm_drop',
    tier_impact      TEXT NOT NULL DEFAULT 'medium',
    why_important    TEXT,
    how_to_obtain    TEXT,
    gim_notes        TEXT,
    wiki_url         TEXT,
    last_verified_at TEXT
  );

  CREATE TABLE IF NOT EXISTS rs3_slayer_creatures (
    id               TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    slayer_level_req INTEGER DEFAULT 1,
    combat_level     INTEGER DEFAULT 1,
    location         TEXT,
    notable_drops    TEXT NOT NULL DEFAULT '[]',
    is_boss          INTEGER DEFAULT 0,
    wiki_url         TEXT
  );

  CREATE TABLE IF NOT EXISTS rs3_skill_milestones (
    id          TEXT PRIMARY KEY,
    skill       TEXT NOT NULL,
    level       INTEGER NOT NULL,
    description TEXT,
    unlock_type TEXT DEFAULT 'ability',
    wiki_url    TEXT
  );

  CREATE TABLE IF NOT EXISTS rs3_data_submissions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name     TEXT NOT NULL,
    action         TEXT NOT NULL DEFAULT 'create',
    record_id      TEXT,
    proposed_data  TEXT NOT NULL DEFAULT '{}',
    current_data   TEXT,
    submitted_by   TEXT NOT NULL DEFAULT 'system',
    submission_note TEXT,
    status         TEXT NOT NULL DEFAULT 'pending',
    review_note    TEXT,
    reviewed_by    TEXT,
    submitted_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at    DATETIME
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    username     TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt         TEXT NOT NULL,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login   DATETIME
  );
`);

// Migrations — safe to run on existing DBs
try { db.exec('ALTER TABLE goals ADD COLUMN details_json TEXT'); } catch {}
// rs3_gear_items: icon + requirements columns
try { db.exec('ALTER TABLE rs3_gear_items ADD COLUMN icon_url TEXT'); } catch {}
try { db.exec("ALTER TABLE rs3_gear_items ADD COLUMN requirements_json TEXT DEFAULT '{}'"); } catch {}
try { db.exec('ALTER TABLE rs3_gear_items ADD COLUMN quest TEXT'); } catch {}
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
// rs3_gear_items: mark items that cannot be traded (Fire Cape, Kiln Cape, etc.)
try { db.exec('ALTER TABLE rs3_gear_items ADD COLUMN untradeable INTEGER DEFAULT 0'); } catch {}
// rs3_bosses + rs3_milestone_items: wiki image URL for display in Goals tab
try { db.exec('ALTER TABLE rs3_bosses ADD COLUMN icon_url TEXT'); } catch {}
try { db.exec('ALTER TABLE rs3_milestone_items ADD COLUMN icon_url TEXT'); } catch {}
// rs3_slayer_creatures: wiki image URL
try { db.exec('ALTER TABLE rs3_slayer_creatures ADD COLUMN icon_url TEXT'); } catch {}
// goals: group_id scopes group-type goals so they don't bleed across groups
try { db.exec('ALTER TABLE goals ADD COLUMN group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE'); } catch {}
// Back-fill group_id for existing goals that have an owner_id
try {
  db.exec(`
    UPDATE goals SET group_id = (
      SELECT p.group_id FROM players p WHERE p.id = goals.owner_id
    ) WHERE group_id IS NULL AND owner_id IS NOT NULL
  `);
} catch {}

// Quest completion data fetched from RuneMetrics quests API
try { db.exec('ALTER TABLE players ADD COLUMN quests_json TEXT DEFAULT NULL'); } catch {}

// ── Custom Groups feature migrations ─────────────────────────────────────────

// Migration tracking table — idempotent
db.exec(`CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, ran_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);

// groups.is_dev_only — gates custom (non-GIM) groups from production browse
try { db.exec('ALTER TABLE groups ADD COLUMN is_dev_only INTEGER DEFAULT 0'); } catch {}

// Migration: relax players.rsn UNIQUE → UNIQUE(rsn, group_id)
// This lets the same RSN exist in multiple groups (e.g. GIM group + a custom group)
try {
  const migrated = db.prepare("SELECT name FROM _migrations WHERE name = 'players_rsn_group_unique'").get();
  if (!migrated) {
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec(`
      CREATE TABLE players_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rsn TEXT NOT NULL,
        quest_points INTEGER DEFAULT 0,
        combat_level INTEGER DEFAULT 3,
        group_id INTEGER,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_synced DATETIME,
        stats_json TEXT,
        activities_json TEXT,
        sync_error TEXT,
        sync_error_at DATETIME,
        UNIQUE(rsn, group_id),
        FOREIGN KEY (group_id) REFERENCES groups(id)
      )
    `);
    db.exec(`
      INSERT INTO players_v2
        SELECT id, rsn, quest_points, combat_level, group_id, joined_at,
               last_synced, stats_json, activities_json, sync_error, sync_error_at
        FROM players
    `);
    db.exec(`DROP TABLE players`);
    db.exec(`ALTER TABLE players_v2 RENAME TO players`);
    db.exec('PRAGMA foreign_keys = ON');
    db.prepare("INSERT INTO _migrations (name) VALUES (?)").run('players_rsn_group_unique');
    console.log('[db] Migration applied: players.rsn UNIQUE → UNIQUE(rsn, group_id)');
  }
} catch (e) {
  console.warn('[db] Migration players_rsn_group_unique failed:', e.message);
  try { db.exec('PRAGMA foreign_keys = ON'); } catch {}
}

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
