const express = require('express');
const router  = express.Router();
const db      = require('../database');
const { fetchHiscores, fetchRuneMetrics, calcCombatLevel } = require('../services/runescape');
const { saveActivities, autoLogDrops, autoDetectDiaries, autoCountBossKills, autoDetectLevelMilestones } = require('../services/activitySync');
const { checkGroupAuth } = require('../utils/auth');
const { notifyGoalCompleted } = require('../services/discord');

// Auto-complete any skill-type goals whose target level has been reached.
// skillsMap = { SkillName: { level, xp, rank }, ... } (from fetchHiscores)
function autoCompleteGoals(playerId, skillsMap) {
  const groupId = db.prepare('SELECT group_id FROM players WHERE id = ?').get(playerId)?.group_id;
  if (!groupId) return;

  const activeGoals = db.prepare(`
    SELECT * FROM goals
    WHERE owner_id = ?
      AND category = 'skill'
      AND skill IS NOT NULL
      AND target_value IS NOT NULL
      AND status != 'complete'
  `).all(playerId);

  for (const goal of activeGoals) {
    const skillData = skillsMap[goal.skill];
    if (!skillData) continue;
    if (skillData.level >= goal.target_value) {
      db.prepare(
        "UPDATE goals SET status = 'complete', completed_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(goal.id);

      const contribs = db.prepare(`
        SELECT p.rsn FROM goal_contributors gc
        JOIN players p ON p.id = gc.player_id
        WHERE gc.goal_id = ?
      `).all(goal.id);
      notifyGoalCompleted(groupId, goal.title, contribs.map(c => c.rsn));
      console.log(`[goals] Auto-completed "${goal.title}" for player ${playerId}`);
    }
  }
}

function getPlayerGroupId(playerId) {
  return db.prepare('SELECT group_id FROM players WHERE id = ?').get(playerId)?.group_id;
}

// GET /api/players
router.get('/', (req, res) => {
  const players = db.prepare('SELECT * FROM players ORDER BY rsn').all();
  res.json(players);
});

// GET /api/players/:id
router.get('/:id', (req, res) => {
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  player.skills = db.prepare(
    'SELECT skill_name, level, xp, rank FROM skills WHERE player_id = ? ORDER BY skill_name'
  ).all(player.id);

  // XP gains: today, week, month
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const currentXp = db.prepare(
    "SELECT xp FROM skills WHERE player_id = ? AND skill_name = 'Overall'"
  ).get(player.id)?.xp ?? 0;

  const snapToday = db.prepare(
    'SELECT total_xp FROM snapshots WHERE player_id = ? AND snapshot_date = ?'
  ).get(player.id, today);
  const snapWeek = db.prepare(
    'SELECT total_xp FROM snapshots WHERE player_id = ? AND snapshot_date >= ? ORDER BY snapshot_date ASC LIMIT 1'
  ).get(player.id, weekAgo);
  const snapMonth = db.prepare(
    'SELECT total_xp FROM snapshots WHERE player_id = ? AND snapshot_date >= ? ORDER BY snapshot_date ASC LIMIT 1'
  ).get(player.id, monthAgo);

  player.xp_gains = {
    today: snapToday ? currentXp - snapToday.total_xp : 0,
    week: snapWeek ? currentXp - snapWeek.total_xp : 0,
    month: snapMonth ? currentXp - snapMonth.total_xp : 0,
  };

  res.json(player);
});

// POST /api/players - add player to group
router.post('/', (req, res) => {
  const { rsn, group_id } = req.body;
  if (!rsn?.trim()) return res.status(400).json({ error: 'RSN is required' });
  if (!checkGroupAuth(req, res, group_id || req.headers['x-group-id'])) return;

  try {
    const result = db.prepare(
      'INSERT INTO players (rsn, group_id) VALUES (?, ?)'
    ).run(rsn.trim(), group_id || null);
    res.status(201).json({ id: result.lastInsertRowid, rsn: rsn.trim(), group_id });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: `Player "${rsn}" already exists` });
    }
    throw err;
  }
});

// PUT /api/players/:id - update player (rsn, quest_points)
router.put('/:id', (req, res) => {
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  if (!checkGroupAuth(req, res, player.group_id || req.headers['x-group-id'])) return;

  const { rsn, quest_points, group_id } = req.body;
  db.prepare(
    'UPDATE players SET rsn = ?, quest_points = ?, group_id = ? WHERE id = ?'
  ).run(
    rsn ?? player.rsn,
    quest_points ?? player.quest_points,
    group_id ?? player.group_id,
    req.params.id
  );
  res.json({ success: true });
});

// DELETE /api/players/:id
router.delete('/:id', (req, res) => {
  const player = db.prepare('SELECT group_id FROM players WHERE id = ?').get(req.params.id);
  if (!checkGroupAuth(req, res, player?.group_id || req.headers['x-group-id'])) return;
  db.prepare('DELETE FROM players WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST /api/players/:id/sync - pull hiscores only (no auth — RS3 data is public)
// RuneMetrics (activity feed) is fetched separately by the 6-hour background cron
// to avoid Jagex rate-limits when many groups sync simultaneously.
router.post('/:id/sync', async (req, res) => {
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  try {
    const data = await fetchHiscores(player.rsn);
    const combat = calcCombatLevel(data.skills);

    // Preserve existing RuneMetrics quest data — only hiscores activities updated here
    const existing = player.stats_json ? JSON.parse(player.stats_json) : {};
    const statsJson = JSON.stringify({
      activities:     data.activities,
      questsComplete: existing.questsComplete ?? null,
      questsStarted:  existing.questsStarted  ?? null,
    });

    // activities_json (RuneMetrics feed) is NOT touched here — cron keeps it fresh
    db.prepare(
      'UPDATE players SET last_synced = CURRENT_TIMESTAMP, combat_level = ?, stats_json = ? WHERE id = ?'
    ).run(combat, statsJson, player.id);

    const upsertSkill = db.prepare(`
      INSERT INTO skills (player_id, skill_name, level, xp, rank)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(player_id, skill_name) DO UPDATE SET
        level = excluded.level,
        xp = excluded.xp,
        rank = excluded.rank
    `);

    db.runTransaction(() => {
      for (const [name, s] of Object.entries(data.skills)) {
        upsertSkill.run(player.id, name, s.level, s.xp, s.rank ?? -1);
      }
    });

    const today = new Date().toISOString().slice(0, 10);
    db.prepare(`
      INSERT INTO snapshots (player_id, snapshot_date, total_xp, total_level, skills_json)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(player_id, snapshot_date) DO NOTHING
    `).run(player.id, today, data.totalXp, data.totalLevel, JSON.stringify(data.skills));

    autoCompleteGoals(player.id, data.skills);

    res.json({ success: true, totalXp: data.totalXp, totalLevel: data.totalLevel, combat });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// POST /api/players/sync-all - hiscores only (no auth — RS3 data is public)
// RuneMetrics (activity feed) is fetched separately by the 6-hour background cron.
router.post('/sync-all/:groupId', async (req, res) => {
  const players = db.prepare('SELECT * FROM players WHERE group_id = ?').all(req.params.groupId);
  const results = [];

  for (const player of players) {
    try {
      const data = await fetchHiscores(player.rsn);
      const combat = calcCombatLevel(data.skills);

      // Preserve existing RuneMetrics quest data
      const existing = player.stats_json ? JSON.parse(player.stats_json) : {};
      const statsJson = JSON.stringify({
        activities:     data.activities,
        questsComplete: existing.questsComplete ?? null,
        questsStarted:  existing.questsStarted  ?? null,
      });

      // activities_json (RuneMetrics feed) NOT touched — cron keeps it fresh
      db.prepare(
        'UPDATE players SET last_synced = CURRENT_TIMESTAMP, combat_level = ?, stats_json = ? WHERE id = ?'
      ).run(combat, statsJson, player.id);

      const upsertSkill = db.prepare(`
        INSERT INTO skills (player_id, skill_name, level, xp, rank)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(player_id, skill_name) DO UPDATE SET
          level = excluded.level, xp = excluded.xp, rank = excluded.rank
      `);
      db.runTransaction(() => {
        for (const [name, s] of Object.entries(data.skills)) {
          upsertSkill.run(player.id, name, s.level, s.xp, s.rank ?? -1);
        }
      });

      const today = new Date().toISOString().slice(0, 10);
      db.prepare(`
        INSERT INTO snapshots (player_id, snapshot_date, total_xp, total_level, skills_json)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(player_id, snapshot_date) DO NOTHING
      `).run(player.id, today, data.totalXp, data.totalLevel, JSON.stringify(data.skills));

      autoCompleteGoals(player.id, data.skills);

      results.push({ rsn: player.rsn, success: true });
    } catch (err) {
      // 404 = player not yet ranked on hiscores (too low level) — not a real failure
      if (err.message.includes('not found on hiscores')) {
        results.push({ rsn: player.rsn, success: true, warning: 'Not yet ranked on hiscores' });
      } else {
        console.error(`[sync-all] Failed ${player.rsn}: ${err.message}`);
        results.push({ rsn: player.rsn, success: false, error: err.message });
      }
    }
  }

  res.json(results);
});

// POST /api/players/sync-activities/:groupId - fetch RuneMetrics for all group members
// Runs the same batched logic as the 2h cron but on demand for a single group.
// Batches of 10, 1s within batch, 60s between batches.
const BATCH_SIZE       = 10;
const WITHIN_BATCH_MS  = 1000;
const BETWEEN_BATCH_MS = 60000;

router.post('/sync-activities/:groupId', async (req, res) => {
  const players = db.prepare('SELECT * FROM players WHERE group_id = ?').all(req.params.groupId);
  const results = [];

  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    try {
      const rm = await fetchRuneMetrics(player.rsn, 20);
      const newActivities = saveActivities(player.id, rm.activities);
      if (newActivities.length > 0) {
        autoLogDrops(player.id, newActivities);
        autoDetectDiaries(player.id, newActivities);
        autoCountBossKills(player.id, newActivities);
        autoDetectLevelMilestones(player.id, newActivities);
      }
      results.push({ rsn: player.rsn, success: true, new: newActivities.length });
    } catch (err) {
      console.error(`[sync-activities] Failed ${player.rsn}: ${err.message}`);
      results.push({ rsn: player.rsn, success: false, error: err.message });
    }

    const isLastInBatch = (i + 1) % BATCH_SIZE === 0;
    const isLastPlayer  = i + 1 === players.length;
    if (!isLastPlayer) {
      await new Promise(r => setTimeout(r, isLastInBatch ? BETWEEN_BATCH_MS : WITHIN_BATCH_MS));
    }
  }

  res.json(results);
});

// GET /api/players/:id/snapshots - XP history
router.get('/:id/snapshots', (req, res) => {
  const snaps = db.prepare(
    'SELECT snapshot_date, total_xp, total_level FROM snapshots WHERE player_id = ? ORDER BY snapshot_date DESC LIMIT 90'
  ).all(req.params.id);
  res.json(snaps);
});

module.exports = router;
