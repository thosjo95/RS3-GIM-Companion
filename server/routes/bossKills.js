const express = require('express');
const router  = express.Router();
const db      = require('../database');
const { BOSS_KILL_PATTERNS } = require('../services/activitySync');

// Build a label lookup from the canonical pattern list
const BOSS_LABELS = Object.fromEntries(BOSS_KILL_PATTERNS.map(b => [b.key, b.label]));

/**
 * GET /api/boss-kills?group_id=X
 * Returns boss kill counts for all players in the group.
 * Response: [{ player_id, boss_key, boss_label, kills, last_seen }]
 */
router.get('/', (req, res) => {
  const groupId = parseInt(req.query.group_id, 10);
  if (!groupId) return res.status(400).json({ error: 'group_id required' });

  const rows = db.prepare(`
    SELECT bk.player_id, bk.boss_key, bk.kills, bk.last_seen
    FROM boss_kills bk
    JOIN players p ON p.id = bk.player_id
    WHERE p.group_id = ?
      AND bk.kills > 0
    ORDER BY bk.boss_key, bk.kills DESC
  `).all(groupId);

  const result = rows.map(r => ({
    player_id:  r.player_id,
    boss_key:   r.boss_key,
    boss_label: BOSS_LABELS[r.boss_key] ?? r.boss_key,
    kills:      r.kills,
    last_seen:  r.last_seen,
  }));

  res.json(result);
});

module.exports = router;
