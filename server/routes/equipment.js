const express = require('express');
const router  = express.Router();
const db      = require('../database');
const { checkGroupAuth } = require('../utils/auth');

const VALID_STYLES = ['melee', 'ranged', 'magic', 'necromancy', 'hybrid'];
const VALID_SLOTS  = ['head','cape','neck','ammo','weapon','body','offhand','legs','gloves','boots','ring','pocket'];

// GET /api/equipment?player_id=X&style=melee
router.get('/', (req, res) => {
  const { player_id, style } = req.query;
  if (!player_id || !style) return res.status(400).json({ error: 'player_id and style required' });

  const rows = db.prepare(
    'SELECT slot, item_name, updated_at FROM equipment_loadouts WHERE player_id = ? AND style = ?'
  ).all(player_id, style);

  res.json(rows);
});

// PUT /api/equipment/:playerId/:style/:slot
router.put('/:playerId/:style/:slot', (req, res) => {
  const { playerId, style, slot } = req.params;
  const { item_name } = req.body;

  if (!VALID_STYLES.includes(style)) return res.status(400).json({ error: 'Invalid style' });
  if (!VALID_SLOTS.includes(slot))   return res.status(400).json({ error: 'Invalid slot' });

  const player = db.prepare('SELECT group_id FROM players WHERE id = ?').get(playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  if (!checkGroupAuth(req, res, player.group_id)) return;

  if (item_name && item_name.trim()) {
    db.prepare(`
      INSERT INTO equipment_loadouts (player_id, style, slot, item_name, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(player_id, style, slot) DO UPDATE SET
        item_name  = excluded.item_name,
        updated_at = excluded.updated_at
    `).run(playerId, style, slot, item_name.trim());
  } else {
    // Empty string / null = clear the slot
    db.prepare(
      'DELETE FROM equipment_loadouts WHERE player_id = ? AND style = ? AND slot = ?'
    ).run(playerId, style, slot);
  }

  res.json({ ok: true });
});

module.exports = router;
