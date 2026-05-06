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

/**
 * Runs auto-completion effects when a goal is first set to 'complete':
 *  1. Inserts tradeable unlock items into the drops (Group Vault) table.
 *  2. Auto-ticks the matching achievement diary entry.
 * Returns { autoVaulted: string[], diaryTicked: bool }
 */
function applyCompletionEffects({ ownerId, goalId, completedBy, goalTitle, detailsObj, category, groupId }) {
  const autoVaulted = [];
  let diaryTicked   = false;

  // 1. Auto-add tradeable unlock items to Group Vault
  const unlocks = (detailsObj?.unlocks ?? []).filter(u => u?.trim?.());
  if (unlocks.length > 0 && ownerId) {
    const insertDrop = db.prepare(
      `INSERT OR IGNORE INTO drops (player_id, item_name, boss_name, quantity, notes)
       VALUES (?, ?, ?, 1, 'Auto-added from goal completion')`
    );
    for (const unlock of unlocks) {
      const cleanName = unlock.replace(/\s*\([^)]*\)\s*/g, '').replace(/\s*—.*$/, '').trim();
      const gearItem = db.prepare(
        `SELECT id, untradeable FROM rs3_gear_items WHERE LOWER(name) = LOWER(?)`
      ).get(cleanName);
      if (gearItem && !gearItem.untradeable) {
        insertDrop.run(ownerId, cleanName, goalTitle);
        autoVaulted.push(cleanName);
      }
    }
  }

  // 2. Auto-tick achievement diary for owner + all contributors + completedBy
  const diaryKey = detailsObj?.diaryKey;
  if (category === 'diary' && diaryKey) {
    const playerIds = new Set();
    if (ownerId)      playerIds.add(Number(ownerId));
    if (completedBy)  playerIds.add(Number(completedBy));
    if (goalId) {
      const contribs = db.prepare(
        `SELECT player_id FROM goal_contributors WHERE goal_id = ?`
      ).all(goalId);
      contribs.forEach(c => playerIds.add(c.player_id));
    }

    if (playerIds.size > 0) {
      const now = new Date().toISOString();
      const tickStmt = db.prepare(`
        INSERT INTO achievements (player_id, type, key, achieved, achieved_at, manual)
        VALUES (?, 'diary', ?, 1, ?, 0)
        ON CONFLICT(player_id, key) DO UPDATE SET
          achieved    = 1,
          achieved_at = CASE WHEN achievements.achieved_at IS NULL
                             THEN excluded.achieved_at
                             ELSE achievements.achieved_at END
      `);
      for (const pid of playerIds) {
        tickStmt.run(pid, diaryKey, now);
      }
      diaryTicked = true;
    }
  }

  // 3. Discord notification
  if (groupId) {
    // goalId not available here; skip contributor list (acceptable for creation)
    notifyGoalCompleted(groupId, goalTitle, []);
  }

  return { autoVaulted, diaryTicked };
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
  const { type, owner_id, title, description, category, skill, target_value, priority, status, contributor_ids, details_json } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

  const groupId = req.headers['x-group-id']
    || (owner_id && db.prepare('SELECT group_id FROM players WHERE id = ?').get(owner_id)?.group_id);
  if (!checkGroupAuth(req, res, groupId)) return;

  // ── Duplicate prevention ──────────────────────────────────────────────────
  if (owner_id) {
    if (category === 'skill' && skill && target_value != null) {
      const dup = db.prepare(
        `SELECT id FROM goals WHERE owner_id = ? AND category = 'skill' AND skill = ? AND CAST(target_value AS INTEGER) = ? AND status != 'complete'`
      ).get(owner_id, skill, Number(target_value));
      if (dup) {
        return res.status(409).json({
          error: `An active goal for ${skill} level ${target_value} already exists for this player.`,
        });
      }
    }

    if (category === 'quest' && details_json?.questName) {
      const dup = db.prepare(
        `SELECT id FROM goals WHERE owner_id = ? AND category = 'quest' AND json_extract(details_json, '$.questName') = ? AND status != 'complete'`
      ).get(owner_id, details_json.questName);
      if (dup) {
        return res.status(409).json({
          error: `An active goal for the quest "${details_json.questName}" already exists for this player.`,
        });
      }
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const VALID_STATUSES = ['not_started', 'in_progress', 'blocked', 'complete'];
  const finalStatus = VALID_STATUSES.includes(status) ? status : 'not_started';
  const completedAt = finalStatus === 'complete' ? new Date().toISOString() : null;

  const result = db.prepare(`
    INSERT INTO goals (type, owner_id, title, description, category, skill, target_value, priority, status, completed_at, details_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    type || 'personal',
    owner_id || null,
    title.trim(),
    description?.trim() || null,
    category || 'skill',
    skill || null,
    target_value || null,
    priority || 'medium',
    finalStatus,
    completedAt,
    details_json ? JSON.stringify(details_json) : null
  );

  const goalId = result.lastInsertRowid;

  if (contributor_ids?.length) {
    const ins = db.prepare('INSERT OR IGNORE INTO goal_contributors (goal_id, player_id) VALUES (?, ?)');
    db.runTransaction(() => contributor_ids.forEach(pid => ins.run(goalId, pid)));
  }

  // Run auto-completion effects if created already complete (e.g. "Mark as Done")
  let autoVaulted = [], diaryTicked = false;
  if (finalStatus === 'complete') {
    const detailsObj = typeof details_json === 'object' && details_json !== null ? details_json : null;
    const effects = applyCompletionEffects({
      ownerId:    owner_id || null,
      goalId,                    // pass so contributors just inserted are queried
      goalTitle:  title.trim(),
      detailsObj,
      category:   category || 'skill',
      groupId,
    });
    autoVaulted = effects.autoVaulted;
    diaryTicked = effects.diaryTicked;
  }

  res.status(201).json({ id: goalId, autoVaulted, diaryTicked });
});

// PUT /api/goals/:id
router.put('/:id', (req, res) => {
  const { title, description, category, skill, target_value, current_value, status, priority, contributor_ids, details_json, completedBy } = req.body;
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

  // ── Auto-completion effects ───────────────────────────────────────────────
  let autoVaulted = [], diaryTicked = false;

  if (justCompleted) {
    // Parse details_json: use request body value if provided, else fall back to existing DB value
    const detailsObj = details_json !== undefined
      ? (typeof details_json === 'object' && details_json !== null ? details_json : null)
      : (() => { try { return goal.details_json ? JSON.parse(goal.details_json) : null; } catch { return null; } })();

    const effects = applyCompletionEffects({
      ownerId:     goal.owner_id,
      goalId:      req.params.id,
      completedBy: completedBy || null,
      goalTitle:   title ?? goal.title,
      detailsObj,
      category:    category ?? goal.category,
      groupId:     null, // Discord handled separately below with contributor list
    });
    autoVaulted = effects.autoVaulted;
    diaryTicked = effects.diaryTicked;

    // Fire Discord notification with contributor list
    if (groupId) {
      const contribs = db.prepare(`
        SELECT p.rsn FROM goal_contributors gc JOIN players p ON p.id = gc.player_id WHERE gc.goal_id = ?
      `).all(req.params.id);
      notifyGoalCompleted(groupId, title ?? goal.title, contribs.map(c => c.rsn));
    }
  }

  res.json({ success: true, autoVaulted, diaryTicked });
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
