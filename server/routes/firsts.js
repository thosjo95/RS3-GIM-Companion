const express = require('express');
const router  = express.Router();
const db      = require('../database');
const { checkGroupAuth } = require('../utils/auth');

// GET /api/firsts?group_id=X — manual "Firsts" overrides for a group
router.get('/', (req, res) => {
  const { group_id } = req.query;
  if (!group_id) return res.status(400).json({ error: 'group_id required' });
  const rows = db.prepare(
    'SELECT key, player_id, achieved_at, note FROM manual_firsts WHERE group_id = ?'
  ).all(group_id);
  res.json(rows);
});

// PUT /api/firsts/:groupId/:key — set/correct a manual first (auth required)
router.put('/:groupId/:key', (req, res) => {
  if (!checkGroupAuth(req, res, req.params.groupId)) return;
  const { player_id, achieved_at, note } = req.body;
  if (!player_id || !achieved_at) return res.status(400).json({ error: 'player_id and achieved_at required' });

  const player = db.prepare('SELECT id FROM players WHERE id = ? AND group_id = ?').get(player_id, req.params.groupId);
  if (!player) return res.status(400).json({ error: 'Player is not in this group' });

  db.prepare(`
    INSERT INTO manual_firsts (group_id, key, player_id, achieved_at, note)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(group_id, key) DO UPDATE SET
      player_id   = excluded.player_id,
      achieved_at = excluded.achieved_at,
      note        = excluded.note
  `).run(req.params.groupId, req.params.key, player_id, achieved_at, note?.trim() || null);

  res.json({ success: true });
});

// DELETE /api/firsts/:groupId/:key — clear a manual override, reverting to auto-detection
router.delete('/:groupId/:key', (req, res) => {
  if (!checkGroupAuth(req, res, req.params.groupId)) return;
  db.prepare('DELETE FROM manual_firsts WHERE group_id = ? AND key = ?').run(req.params.groupId, req.params.key);
  res.json({ success: true });
});

module.exports = router;
