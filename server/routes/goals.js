const express = require('express');
const router = express.Router();
const db = require('../database');
const { generateSuggestedGoals } = require('../services/runescape');
const { checkGroupAuth } = require('../utils/auth');
const { notifyGoalCompleted } = require('../services/discord');

function goalGroupId(goalId) {
  const goal = db.prepare('SELECT owner_id FROM goals WHERE id = ?').get(goalId);
  if (!goal?.owner_id) return null;
  return db.prepare('SELECT group_id FROM players WHERE id = ?').get(goal.owner_id)?.group_id;
}

// GET /api/goals?group_id=X
router.get('/', (req, res) => {
  const { group_id } = req.query;

  let goals;
  if (group_id) {
    goals = db.prepare(`
      SELECT g.*, p.rsn as owner_rsn
      FROM goals g
      LEFT JOIN players p ON p.id = g.owner_id
      WHERE g.type = 'group'
         OR g.owner_id IN (SELECT id FROM players WHERE group_id = ?)
      ORDER BY g.created_at DESC
    `).all(group_id);
  } else {
    goals = db.prepare(`
      SELECT g.*, p.rsn as owner_rsn
      FROM goals g
      LEFT JOIN players p ON p.id = g.owner_id
      ORDER BY g.created_at DESC
    `).all();
  }

  for (const goal of goals) {
    goal.contributors = db.prepare(`
      SELECT p.id, p.rsn FROM goal_contributors gc
      JOIN players p ON p.id = gc.player_id
      WHERE gc.goal_id = ?
    `).all(goal.id);
  }

  res.json(goals);
});

// POST /api/goals
router.post('/', (req, res) => {
  const { type, owner_id, title, description, category, skill, target_value, priority, contributor_ids, details_json } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

  const groupId = req.headers['x-group-id']
    || (owner_id && db.prepare('SELECT group_id FROM players WHERE id = ?').get(owner_id)?.group_id);
  if (!checkGroupAuth(req, res, groupId)) return;

  const result = db.prepare(`
    INSERT INTO goals (type, owner_id, title, description, category, skill, target_value, priority, details_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    type || 'personal',
    owner_id || null,
    title.trim(),
    description?.trim() || null,
    category || 'skill',
    skill || null,
    target_value || null,
    priority || 'medium',
    details_json ? JSON.stringify(details_json) : null
  );

  const goalId = result.lastInsertRowid;

  if (contributor_ids?.length) {
    const ins = db.prepare('INSERT OR IGNORE INTO goal_contributors (goal_id, player_id) VALUES (?, ?)');
    db.runTransaction(() => contributor_ids.forEach(pid => ins.run(goalId, pid)));
  }

  res.status(201).json({ id: goalId });
});

// PUT /api/goals/:id
router.put('/:id', (req, res) => {
  const { title, description, category, skill, target_value, current_value, status, priority, contributor_ids, details_json } = req.body;
  const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
  if (!goal) return res.status(404).json({ error: 'Goal not found' });

  const groupId = req.headers['x-group-id'] || goalGroupId(req.params.id);
  if (!checkGroupAuth(req, res, groupId)) return;

  const justCompleted = status === 'complete' && goal.status !== 'complete';
  const completed_at = justCompleted ? new Date().toISOString() : goal.completed_at;

  db.prepare(`
    UPDATE goals SET
      title = ?, description = ?, category = ?, skill = ?,
      target_value = ?, current_value = ?, status = ?, priority = ?, completed_at = ?, details_json = ?
    WHERE id = ?
  `).run(
    title ?? goal.title,
    description ?? goal.description,
    category ?? goal.category,
    skill ?? goal.skill,
    target_value ?? goal.target_value,
    current_value ?? goal.current_value,
    status ?? goal.status,
    priority ?? goal.priority,
    completed_at,
    details_json !== undefined ? JSON.stringify(details_json) : goal.details_json,
    req.params.id
  );

  if (contributor_ids !== undefined) {
    db.prepare('DELETE FROM goal_contributors WHERE goal_id = ?').run(req.params.id);
    if (contributor_ids.length) {
      const ins = db.prepare('INSERT OR IGNORE INTO goal_contributors (goal_id, player_id) VALUES (?, ?)');
      db.runTransaction(() => contributor_ids.forEach(pid => ins.run(req.params.id, pid)));
    }
  }

  // Fire Discord notification when a goal is first marked complete
  if (justCompleted && groupId) {
    const contribs = db.prepare(`
      SELECT p.rsn FROM goal_contributors gc JOIN players p ON p.id = gc.player_id WHERE gc.goal_id = ?
    `).all(req.params.id);
    notifyGoalCompleted(groupId, title ?? goal.title, contribs.map(c => c.rsn));
  }

  res.json({ success: true });
});

// DELETE /api/goals/:id
router.delete('/:id', (req, res) => {
  const groupId = req.headers['x-group-id'] || goalGroupId(req.params.id);
  if (!checkGroupAuth(req, res, groupId)) return;
  db.prepare('DELETE FROM goals WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// GET /api/goals/suggestions/:groupId
router.get('/suggestions/:groupId', (req, res) => {
  const players = db.prepare('SELECT * FROM players WHERE group_id = ?').all(req.params.groupId);

  for (const player of players) {
    const skills = db.prepare(
      'SELECT skill_name, level, xp FROM skills WHERE player_id = ?'
    ).all(player.id);
    player.skills = Object.fromEntries(skills.map(s => [s.skill_name, { level: s.level, xp: s.xp }]));
  }

  const suggestions = generateSuggestedGoals(players);
  res.json(suggestions);
});

module.exports = router;
