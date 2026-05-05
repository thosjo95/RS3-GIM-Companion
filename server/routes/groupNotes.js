const express = require('express');
const router  = express.Router();
const db      = require('../database');
const { checkGroupAuth } = require('../utils/auth');

// GET /api/group-notes/:groupId — public read
router.get('/:groupId', (req, res) => {
  const { groupId } = req.params;
  const row = db.prepare('SELECT content, updated_at FROM group_notes WHERE group_id = ?').get(groupId);
  res.json(row || { content: '', updated_at: null });
});

// PUT /api/group-notes/:groupId — requires group auth
router.put('/:groupId', (req, res) => {
  const { groupId } = req.params;
  const { content } = req.body;
  if (!checkGroupAuth(req, res, groupId)) return;

  db.prepare(`
    INSERT INTO group_notes (group_id, content, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(group_id) DO UPDATE SET
      content    = excluded.content,
      updated_at = excluded.updated_at
  `).run(groupId, content ?? '');

  res.json({ ok: true });
});

module.exports = router;
