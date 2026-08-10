const express = require('express');
const router  = express.Router();
const db      = require('../database');
const { checkGroupAuth } = require('../utils/auth');

const VALID_LEVELS = [99, 110, 120];

// GET /api/skill-milestones?group_id=X — dated 99/120 achievements for every player in a group
router.get('/', (req, res) => {
  const { group_id } = req.query;
  if (!group_id) return res.status(400).json({ error: 'group_id required' });
  const rows = db.prepare(`
    SELECT m.player_id, m.skill, m.level, m.achieved_at, m.manual
    FROM player_skill_milestones m
    JOIN players p ON p.id = m.player_id
    WHERE p.group_id = ?
  `).all(group_id);
  res.json(rows);
});

// PUT /api/skill-milestones/:playerId/:skill/:level — set/correct a player's achievement date
// (auto-detection only persists going forward — this backfills history or fixes a miss)
router.put('/:playerId/:skill/:level', (req, res) => {
  const player = db.prepare('SELECT group_id FROM players WHERE id = ?').get(req.params.playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  if (!checkGroupAuth(req, res, player.group_id)) return;

  const level = Number(req.params.level);
  if (!VALID_LEVELS.includes(level)) return res.status(400).json({ error: 'level must be 99, 110, or 120' });
  const { achieved_at } = req.body;
  if (!achieved_at) return res.status(400).json({ error: 'achieved_at required' });

  db.prepare(`
    INSERT INTO player_skill_milestones (player_id, skill, level, achieved_at, manual)
    VALUES (?, ?, ?, ?, 1)
    ON CONFLICT(player_id, skill, level) DO UPDATE SET
      achieved_at = excluded.achieved_at,
      manual      = 1
  `).run(req.params.playerId, req.params.skill, level, achieved_at);

  res.json({ success: true });
});

// DELETE /api/skill-milestones/:playerId/:skill/:level
router.delete('/:playerId/:skill/:level', (req, res) => {
  const player = db.prepare('SELECT group_id FROM players WHERE id = ?').get(req.params.playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  if (!checkGroupAuth(req, res, player.group_id)) return;

  db.prepare('DELETE FROM player_skill_milestones WHERE player_id = ? AND skill = ? AND level = ?')
    .run(req.params.playerId, req.params.skill, Number(req.params.level));
  res.json({ success: true });
});

module.exports = router;
