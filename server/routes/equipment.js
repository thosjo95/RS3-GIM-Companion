const express = require('express');
const router  = express.Router();
const db      = require('../database');
const { checkGroupAuth } = require('../utils/auth');

const VALID_STYLES = ['melee', 'ranged', 'magic', 'necromancy', 'hybrid'];
const VALID_SLOTS  = ['head','cape','neck','ammo','weapon','body','offhand','legs','gloves','boots','ring','pocket'];

// GET /api/equipment/group/:groupId  — all confirmed gear for every player in a group
// Used by VaultTab to display "Worn Equipment" without needing per-player calls
router.get('/group/:groupId', (req, res) => {
  const { groupId } = req.params;
  const rows = db.prepare(`
    SELECT e.player_id, e.style, e.slot, e.item_name, e.confirmed, e.updated_at, p.rsn
    FROM equipment_loadouts e
    JOIN players p ON p.id = e.player_id
    WHERE p.group_id = ? AND e.item_name IS NOT NULL AND e.item_name != ''
    ORDER BY p.rsn, e.style, e.slot
  `).all(groupId);
  res.json(rows);
});

// GET /api/equipment?player_id=X&style=melee
router.get('/', (req, res) => {
  const { player_id, style } = req.query;
  if (!player_id || !style) return res.status(400).json({ error: 'player_id and style required' });

  const rows = db.prepare(
    'SELECT slot, item_name, confirmed, updated_at FROM equipment_loadouts WHERE player_id = ? AND style = ?'
  ).all(player_id, style);

  res.json(rows);
});

// PUT /api/equipment/:playerId/:style/:slot
// Body: { item_name: string, confirmed: boolean }
router.put('/:playerId/:style/:slot', (req, res) => {
  const { playerId, style, slot } = req.params;
  const { item_name, confirmed } = req.body;

  if (!VALID_STYLES.includes(style)) return res.status(400).json({ error: 'Invalid style' });
  if (!VALID_SLOTS.includes(slot))   return res.status(400).json({ error: 'Invalid slot' });

  const player = db.prepare('SELECT group_id FROM players WHERE id = ?').get(playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  if (!checkGroupAuth(req, res, player.group_id)) return;

  if (item_name && item_name.trim()) {
    db.prepare(`
      INSERT INTO equipment_loadouts (player_id, style, slot, item_name, confirmed, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(player_id, style, slot) DO UPDATE SET
        item_name  = excluded.item_name,
        confirmed  = excluded.confirmed,
        updated_at = excluded.updated_at
    `).run(playerId, style, slot, item_name.trim(), confirmed ? 1 : 0);

    // When an item is confirmed as owned, ensure it appears in the Group Vault.
    // This means clearing it from gear later won't remove it from the vault —
    // it'll show as available (no WORN badge) instead of disappearing.
    if (confirmed) {
      const existing = db.prepare(
        'SELECT id FROM drops WHERE player_id = ? AND item_name = ?'
      ).get(playerId, item_name.trim());
      if (!existing) {
        db.prepare(
          "INSERT INTO drops (player_id, item_name, notes) VALUES (?, ?, 'Added via gear loadout confirmation')"
        ).run(playerId, item_name.trim());
      }
    }
  } else {
    // Empty string / null = clear the slot
    db.prepare(
      'DELETE FROM equipment_loadouts WHERE player_id = ? AND style = ? AND slot = ?'
    ).run(playerId, style, slot);
  }

  res.json({ ok: true });
});

module.exports = router;
