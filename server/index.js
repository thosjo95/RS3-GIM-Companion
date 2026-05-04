const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/groups', require('./routes/groups'));
app.use('/api/players', require('./routes/players'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/drops', require('./routes/drops'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Daily snapshot cron: runs at midnight every day
cron.schedule('0 0 * * *', async () => {
  const { fetchHiscores, calcCombatLevel } = require('./services/runescape');
  const players = db.prepare('SELECT * FROM players').all();
  const today = new Date().toISOString().slice(0, 10);

  for (const player of players) {
    try {
      const data = await fetchHiscores(player.rsn);
      const combat = calcCombatLevel(data.skills);
      db.prepare('UPDATE players SET last_synced = CURRENT_TIMESTAMP, combat_level = ? WHERE id = ?').run(combat, player.id);

      const upsert = db.prepare(`
        INSERT INTO skills (player_id, skill_name, level, xp, rank)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(player_id, skill_name) DO UPDATE SET
          level = excluded.level, xp = excluded.xp, rank = excluded.rank
      `);
      db.runTransaction(() => {
        for (const [name, s] of Object.entries(data.skills)) {
          upsert.run(player.id, name, s.level, s.xp, s.rank ?? -1);
        }
      });

      db.prepare(`
        INSERT INTO snapshots (player_id, snapshot_date, total_xp, total_level, skills_json)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(player_id, snapshot_date) DO NOTHING
      `).run(player.id, today, data.totalXp, data.totalLevel, JSON.stringify(data.skills));

      console.log(`[cron] Snapshotted ${player.rsn}`);
    } catch (err) {
      console.error(`[cron] Failed ${player.rsn}: ${err.message}`);
    }
  }
});

// Cleanup cron: runs at 2am every day, deletes groups inactive for 30+ days
cron.schedule('0 2 * * *', () => {
  try {
    const stale = db.prepare(
      "SELECT id FROM groups WHERE last_activity IS NOT NULL AND last_activity < datetime('now', '-30 days')"
    ).all();

    for (const group of stale) {
      db.prepare('DELETE FROM groups WHERE id = ?').run(group.id);
      console.log(`[cron] Deleted stale group ${group.id}`);
    }
    if (stale.length) console.log(`[cron] Removed ${stale.length} inactive group(s)`);
  } catch (err) {
    console.error(`[cron] Cleanup failed: ${err.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`RS3 GIM Companion server running on http://localhost:${PORT}`);
});
