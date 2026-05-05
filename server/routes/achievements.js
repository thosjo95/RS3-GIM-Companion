const express = require('express');
const router  = express.Router();
const db      = require('../database');
const { checkGroupAuth } = require('../utils/auth');

// GET /api/achievements?group_id=X
// Returns all achievements for every player in the group (public, no auth needed)
router.get('/', (req, res) => {
  const { group_id } = req.query;
  if (!group_id) return res.status(400).json({ error: 'group_id required' });

  const rows = db.prepare(`
    SELECT a.*, p.rsn
    FROM achievements a
    JOIN players p ON p.id = a.player_id
    WHERE p.group_id = ?
    ORDER BY a.player_id, a.key
  `).all(group_id);

  res.json(rows);
});

// PUT /api/achievements/:playerId/:key — manual toggle
router.put('/:playerId/:key', (req, res) => {
  const { playerId, key } = req.params;
  const { achieved } = req.body;

  const player = db.prepare('SELECT group_id FROM players WHERE id = ?').get(playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  if (!checkGroupAuth(req, res, player.group_id)) return;

  const flag = achieved ? 1 : 0;
  const achievedAt = flag ? new Date().toISOString() : null;

  db.prepare(`
    INSERT INTO achievements (player_id, type, key, achieved, achieved_at, manual)
    VALUES (?, 'diary', ?, ?, ?, 1)
    ON CONFLICT(player_id, key) DO UPDATE SET
      achieved    = excluded.achieved,
      achieved_at = CASE WHEN excluded.achieved = 1 AND achievements.achieved_at IS NULL
                         THEN excluded.achieved_at ELSE achievements.achieved_at END,
      manual      = 1
  `).run(playerId, key, flag, achievedAt);

  res.json({ success: true });
});

module.exports = router;
