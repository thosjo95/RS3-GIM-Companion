const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/groups - list all groups
router.get('/', (req, res) => {
  const groups = db.prepare(`
    SELECT g.*, COUNT(p.id) as member_count
    FROM groups g
    LEFT JOIN players p ON p.group_id = g.id
    GROUP BY g.id
    ORDER BY g.created_at DESC
  `).all();
  res.json(groups);
});

// GET /api/groups/:id - get group with players and aggregates
router.get('/:id', (req, res) => {
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const players = db.prepare(`
    SELECT p.*,
      (SELECT SUM(xp) FROM skills WHERE player_id = p.id AND skill_name = 'Overall') as total_xp,
      (SELECT level FROM skills WHERE player_id = p.id AND skill_name = 'Overall') as total_level
    FROM players p
    WHERE p.group_id = ?
    ORDER BY p.rsn
  `).all(req.params.id);

  // Attach skills to each player
  for (const player of players) {
    player.skills = db.prepare(
      'SELECT skill_name, level, xp, rank FROM skills WHERE player_id = ? ORDER BY skill_name'
    ).all(player.id);
  }

  const totals = db.prepare(`
    SELECT
      SUM(s.xp) as group_total_xp,
      SUM(CASE WHEN s.skill_name = 'Overall' THEN s.level ELSE 0 END) as group_total_level,
      SUM(p.quest_points) as group_quest_points
    FROM players p
    LEFT JOIN skills s ON s.player_id = p.id AND s.skill_name = 'Overall'
    WHERE p.group_id = ?
  `).get(req.params.id);

  res.json({ ...group, players, ...totals });
});

// POST /api/groups - create group
router.post('/', (req, res) => {
  const { name, group_rsn, notes } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Group name is required' });

  const result = db.prepare(
    'INSERT INTO groups (name, group_rsn, notes) VALUES (?, ?, ?)'
  ).run(name.trim(), group_rsn?.trim() || null, notes?.trim() || null);

  res.status(201).json({ id: result.lastInsertRowid, name, group_rsn, notes });
});

// PUT /api/groups/:id - update group
router.put('/:id', (req, res) => {
  const { name, group_rsn, notes } = req.body;
  db.prepare(
    'UPDATE groups SET name = ?, group_rsn = ?, notes = ? WHERE id = ?'
  ).run(name, group_rsn || null, notes || null, req.params.id);
  res.json({ success: true });
});

// DELETE /api/groups/:id
router.delete('/:id', (req, res) => {
  db.prepare('UPDATE players SET group_id = NULL WHERE group_id = ?').run(req.params.id);
  db.prepare('DELETE FROM groups WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
