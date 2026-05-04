const express = require('express');
const router = express.Router();
const db = require('../database');
const { fetchHiscores, calcCombatLevel } = require('../services/runescape');

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
  const { rsn, quest_points, group_id } = req.body;
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });

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
  db.prepare('DELETE FROM players WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST /api/players/:id/sync - pull hiscores and update
router.post('/:id/sync', async (req, res) => {
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  try {
    const data = await fetchHiscores(player.rsn);
    const combat = calcCombatLevel(data.skills);

    db.prepare(
      'UPDATE players SET last_synced = CURRENT_TIMESTAMP, combat_level = ? WHERE id = ?'
    ).run(combat, player.id);

    // Upsert skills
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

    // Take a snapshot for today
    const today = new Date().toISOString().slice(0, 10);
    db.prepare(`
      INSERT INTO snapshots (player_id, snapshot_date, total_xp, total_level, skills_json)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(player_id, snapshot_date) DO NOTHING
    `).run(player.id, today, data.totalXp, data.totalLevel, JSON.stringify(data.skills));

    res.json({ success: true, totalXp: data.totalXp, totalLevel: data.totalLevel, combat });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// POST /api/players/sync-all - sync all players in a group
router.post('/sync-all/:groupId', async (req, res) => {
  const players = db.prepare('SELECT * FROM players WHERE group_id = ?').all(req.params.groupId);
  const results = [];

  for (const player of players) {
    try {
      const data = await fetchHiscores(player.rsn);
      const combat = calcCombatLevel(data.skills);

      db.prepare(
        'UPDATE players SET last_synced = CURRENT_TIMESTAMP, combat_level = ? WHERE id = ?'
      ).run(combat, player.id);

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

      results.push({ rsn: player.rsn, success: true });
    } catch (err) {
      results.push({ rsn: player.rsn, success: false, error: err.message });
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
