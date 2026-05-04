const express = require('express');
const router = express.Router();
const db = require('../database');

// ── Drop log ──────────────────────────────────────────────────────────────────

// GET /api/drops?group_id=X
router.get('/', (req, res) => {
  const { group_id } = req.query;
  let rows;
  if (group_id) {
    rows = db.prepare(`
      SELECT d.*, p.rsn FROM drops d
      JOIN players p ON p.id = d.player_id
      WHERE p.group_id = ?
      ORDER BY d.dropped_at DESC
    `).all(group_id);
  } else {
    rows = db.prepare(`
      SELECT d.*, p.rsn FROM drops d
      JOIN players p ON p.id = d.player_id
      ORDER BY d.dropped_at DESC
    `).all();
  }
  res.json(rows);
});

// POST /api/drops
router.post('/', (req, res) => {
  const { player_id, item_name, boss_name, quantity, value_gp, notes } = req.body;
  if (!player_id || !item_name?.trim()) {
    return res.status(400).json({ error: 'player_id and item_name are required' });
  }
  const result = db.prepare(`
    INSERT INTO drops (player_id, item_name, boss_name, quantity, value_gp, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(player_id, item_name.trim(), boss_name?.trim() || null, quantity || 1, value_gp || null, notes?.trim() || null);
  res.status(201).json({ id: result.lastInsertRowid });
});

// DELETE /api/drops/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM drops WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Item requests ─────────────────────────────────────────────────────────────

// GET /api/drops/requests?group_id=X
router.get('/requests', (req, res) => {
  const { group_id } = req.query;
  let rows;
  if (group_id) {
    rows = db.prepare(`
      SELECT r.*, p.rsn FROM item_requests r
      JOIN players p ON p.id = r.player_id
      WHERE p.group_id = ?
      ORDER BY r.obtained ASC, r.priority DESC, r.created_at DESC
    `).all(group_id);
  } else {
    rows = db.prepare(`
      SELECT r.*, p.rsn FROM item_requests r
      JOIN players p ON p.id = r.player_id
      ORDER BY r.obtained ASC, r.priority DESC, r.created_at DESC
    `).all();
  }
  res.json(rows);
});

// POST /api/drops/requests
router.post('/requests', (req, res) => {
  const { player_id, item_name, boss_name, priority, notes } = req.body;
  if (!player_id || !item_name?.trim() || !boss_name?.trim()) {
    return res.status(400).json({ error: 'player_id, item_name, and boss_name are required' });
  }
  const result = db.prepare(`
    INSERT INTO item_requests (player_id, item_name, boss_name, priority, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(player_id, item_name.trim(), boss_name.trim(), priority || 'medium', notes?.trim() || null);
  res.status(201).json({ id: result.lastInsertRowid });
});

// PUT /api/drops/requests/:id — toggle obtained or update fields
router.put('/requests/:id', (req, res) => {
  const { obtained, priority, notes } = req.body;
  const existing = db.prepare('SELECT * FROM item_requests WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Request not found' });

  const nowObtained = obtained ?? existing.obtained;
  const obtained_at = nowObtained && !existing.obtained ? new Date().toISOString() : existing.obtained_at;

  db.prepare(`
    UPDATE item_requests SET obtained = ?, obtained_at = ?, priority = ?, notes = ? WHERE id = ?
  `).run(nowObtained ? 1 : 0, obtained_at, priority ?? existing.priority, notes ?? existing.notes, req.params.id);
  res.json({ success: true });
});

// DELETE /api/drops/requests/:id
router.delete('/requests/:id', (req, res) => {
  db.prepare('DELETE FROM item_requests WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
