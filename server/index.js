const express = require('express');
const cors    = require('cors');
const cron    = require('node-cron');
const db      = require('./database');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/groups',       require('./routes/groups'));
app.use('/api/players',      require('./routes/players'));
app.use('/api/goals',        require('./routes/goals'));
app.use('/api/drops',        require('./routes/drops'));
app.use('/api/achievements', require('./routes/achievements'));
app.use('/api/boss-kills',   require('./routes/bossKills'));
app.use('/api/group-notes',  require('./routes/groupNotes'));
app.use('/api/equipment',    require('./routes/equipment'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── 15-minute activity sync ────────────────────────────────────────────────────
// Fetches the last 20 RuneMetrics activities for every tracked player.
// Detects diary completions (persisted) and auto-logs drops.
// 15-min interval + 1.5s delay per player avoids Jagex 429 rate limits at scale.
cron.schedule('*/15 * * * *', async () => {
  const { fetchRuneMetrics } = require('./services/runescape');
  const { autoLogDrops, autoDetectDiaries, autoCountBossKills, autoDetectLevelMilestones } = require('./services/activitySync');

  const players = db.prepare('SELECT * FROM players WHERE group_id IS NOT NULL').all();
  console.log(`[5-min cron] Syncing activities for ${players.length} player(s)…`);

  for (const player of players) {
    try {
      const rm = await fetchRuneMetrics(player.rsn, 20);
      db.prepare('UPDATE players SET activities_json = ? WHERE id = ?')
        .run(JSON.stringify(rm.activities), player.id);
      autoLogDrops(player.id, rm.activities);
      autoDetectDiaries(player.id, rm.activities);
      autoCountBossKills(player.id, rm.activities);
      autoDetectLevelMilestones(player.id, rm.activities);
    } catch (err) {
      console.error(`[5-min cron] ${player.rsn}: ${err.message}`);
    }
    // Delay between players — 1.5s keeps us well under Jagex's rate limit
    await new Promise(r => setTimeout(r, 1500));
  }
});

// ── Daily snapshot cron ────────────────────────────────────────────────────────
// Runs at midnight every day — syncs hiscores (skills, boss kills, clue scrolls).
cron.schedule('0 0 * * *', async () => {
  const { fetchHiscores, fetchRuneMetrics, calcCombatLevel } = require('./services/runescape');
  const { autoLogDrops, autoDetectDiaries, autoCountBossKills, autoDetectLevelMilestones } = require('./services/activitySync');

  const players = db.prepare('SELECT * FROM players').all();
  const today   = new Date().toISOString().slice(0, 10);

  for (const player of players) {
    try {
      const [data, rm] = await Promise.all([
        fetchHiscores(player.rsn),
        fetchRuneMetrics(player.rsn, 20).catch(() => null),
      ]);
      const combat = calcCombatLevel(data.skills);

      // stats_json: hiscores activities (clue scrolls) + RuneMetrics meta
      // Note: bossKills are now tracked separately via the boss_kills table
      const statsJson = JSON.stringify({
        activities:     data.activities,   // hiscores activities — clue scrolls etc.
        questsComplete: rm?.questsComplete ?? null,
        questsStarted:  rm?.questsStarted  ?? null,
      });
      const activitiesJson = rm ? JSON.stringify(rm.activities) : null;

      db.prepare(
        'UPDATE players SET last_synced = CURRENT_TIMESTAMP, combat_level = ?, stats_json = ?, activities_json = COALESCE(?, activities_json) WHERE id = ?'
      ).run(combat, statsJson, activitiesJson, player.id);

      db.runTransaction(() => {
        const upsert = db.prepare(`
          INSERT INTO skills (player_id, skill_name, level, xp, rank)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(player_id, skill_name) DO UPDATE SET
            level = excluded.level, xp = excluded.xp, rank = excluded.rank
        `);
        for (const [name, s] of Object.entries(data.skills)) {
          upsert.run(player.id, name, s.level, s.xp, s.rank ?? -1);
        }
      });

      db.prepare(`
        INSERT INTO snapshots (player_id, snapshot_date, total_xp, total_level, skills_json)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(player_id, snapshot_date) DO NOTHING
      `).run(player.id, today, data.totalXp, data.totalLevel, JSON.stringify(data.skills));

      if (rm?.activities) {
        autoLogDrops(player.id, rm.activities);
        autoDetectDiaries(player.id, rm.activities);
        autoCountBossKills(player.id, rm.activities);
        autoDetectLevelMilestones(player.id, rm.activities);
      }

      console.log(`[daily cron] Snapshotted ${player.rsn}`);
    } catch (err) {
      console.error(`[daily cron] Failed ${player.rsn}: ${err.message}`);
    }
  }
});

// ── Cleanup cron ───────────────────────────────────────────────────────────────
// Runs at 2am every day — removes groups inactive for 30+ days.
cron.schedule('0 2 * * *', () => {
  try {
    const stale = db.prepare(
      "SELECT id FROM groups WHERE last_activity IS NOT NULL AND last_activity < datetime('now', '-30 days')"
    ).all();
    for (const group of stale) {
      db.prepare('DELETE FROM groups WHERE id = ?').run(group.id);
      console.log(`[cleanup cron] Deleted stale group ${group.id}`);
    }
    if (stale.length) console.log(`[cleanup cron] Removed ${stale.length} inactive group(s)`);
  } catch (err) {
    console.error(`[cleanup cron] Failed: ${err.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`RS3 GIM Companion server running on http://localhost:${PORT}`);
});
