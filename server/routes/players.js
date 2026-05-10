const express = require('express');
const router  = express.Router();
const db      = require('../database');
const { fetchHiscores, fetchRuneMetrics, calcCombatLevel, sanitizeRSN } = require('../services/runescape');
const { saveActivities, autoLogDrops, autoDetectDiaries, autoCountBossKills, autoDetectLevelMilestones } = require('../services/activitySync');
const { checkGroupAuth } = require('../utils/auth');
const { notifyGoalCompleted } = require('../services/discord');

// Auto-complete any skill-type goals whose target level has been reached.
// skillsMap = { SkillName: { level, xp, rank }, ... } (from fetchHiscores)
function autoCompleteGoals(playerId, skillsMap) {
  const groupId = db.prepare('SELECT group_id FROM players WHERE id = ?').get(playerId)?.group_id;
  if (!groupId) return;

  const activeGoals = db.prepare(`
    SELECT * FROM goals
    WHERE owner_id = ?
      AND category = 'skill'
      AND skill IS NOT NULL
      AND target_value IS NOT NULL
      AND status != 'complete'
  `).all(playerId);

  for (const goal of activeGoals) {
    const skillData = skillsMap[goal.skill];
    if (!skillData) continue;
    if (skillData.level >= goal.target_value) {
      db.prepare(
        "UPDATE goals SET status = 'complete', completed_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(goal.id);

      const contribs = db.prepare(`
        SELECT p.rsn FROM goal_contributors gc
        JOIN players p ON p.id = gc.player_id
        WHERE gc.goal_id = ?
      `).all(goal.id);
      notifyGoalCompleted(groupId, goal.title, contribs.map(c => c.rsn));
      console.log(`[goals] Auto-completed "${goal.title}" for player ${playerId}`);
    }
  }
}

function getPlayerGroupId(playerId) {
  return db.prepare('SELECT group_id FROM players WHERE id = ?').get(playerId)?.group_id;
}

// GET /api/players
router.get('/', (req, res) => {
  const players = db.prepare('SELECT * FROM players ORDER BY rsn').all();
  res.json(players);
});

// GET /api/players/:id
router.get('/:id', (req, res) => {
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  player.skills = db.prepare(
    'SELECT skill_name, level, xp, rank FROM skills WHERE player_id = ? ORDER BY skill_name'
  ).all(player.id);

  // XP gains: today, week, month
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const currentXp = db.prepare(
    "SELECT xp FROM skills WHERE player_id = ? AND skill_name = 'Overall'"
  ).get(player.id)?.xp ?? 0;

  const snapToday = db.prepare(
    'SELECT total_xp FROM snapshots WHERE player_id = ? AND snapshot_date = ?'
  ).get(player.id, today);
  const snapWeek = db.prepare(
    'SELECT total_xp FROM snapshots WHERE player_id = ? AND snapshot_date >= ? ORDER BY snapshot_date ASC LIMIT 1'
  ).get(player.id, weekAgo);
  const snapMonth = db.prepare(
    'SELECT total_xp FROM snapshots WHERE player_id = ? AND snapshot_date >= ? ORDER BY snapshot_date ASC LIMIT 1'
  ).get(player.id, monthAgo);

  player.xp_gains = {
    today: snapToday ? currentXp - snapToday.total_xp : 0,
    week: snapWeek ? currentXp - snapWeek.total_xp : 0,
    month: snapMonth ? currentXp - snapMonth.total_xp : 0,
  };

  res.json(player);
});

// POST /api/players - add player to group
router.post('/', async (req, res) => {
  const { rsn, group_id } = req.body;
  if (!rsn?.trim()) return res.status(400).json({ error: 'RSN is required' });
  if (!checkGroupAuth(req, res, group_id || req.headers['x-group-id'])) return;

  const cleanRSN = sanitizeRSN(rsn.trim());
  if (!cleanRSN) return res.status(400).json({ error: 'RSN is required' });

  // Step 1 — Confirm the player exists on hiscores (definitive 404 blocks the add;
  // other network errors are non-fatal so the user isn't locked out when Jagex is slow).
  try {
    await fetchHiscores(cleanRSN);
  } catch (err) {
    if (err.message.includes('not found on hiscores')) {
      return res.status(400).json({
        error: `"${cleanRSN}" was not found on the RS3 hiscores. Check the exact in-game name (player must be ranked).`,
      });
    }
    console.warn(`[add-player] Hiscores check failed for "${cleanRSN}": ${err.message} — proceeding anyway`);
  }

  // Step 2 — Resolve the canonical display name from RuneMetrics.
  // RS3 normalises names (capitalisation, spaces) and RuneMetrics returns the definitive
  // form in its 'name' field.  Storing the canonical name avoids future encoding mismatches.
  let canonicalRSN = cleanRSN;
  try {
    const rm = await fetchRuneMetrics(cleanRSN, 0);
    if (rm.name && rm.name.length > 0) {
      canonicalRSN = rm.name;
      if (canonicalRSN !== cleanRSN) {
        console.log(`[add-player] Canonical RSN resolved: "${cleanRSN}" → "${canonicalRSN}"`);
      }
    }
  } catch {
    // RuneMetrics unavailable or profile is private — fall back to the sanitised name
  }

  try {
    const result = db.prepare(
      'INSERT INTO players (rsn, group_id) VALUES (?, ?)'
    ).run(canonicalRSN, group_id || null);
    res.status(201).json({ id: result.lastInsertRowid, rsn: canonicalRSN, group_id });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: `Player "${cleanRSN}" is already in this group` });
    }
    throw err;
  }
});

// PUT /api/players/:id - update player (rsn, quest_points)
router.put('/:id', (req, res) => {
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  if (!checkGroupAuth(req, res, player.group_id || req.headers['x-group-id'])) return;

  const { rsn, quest_points, group_id } = req.body;
  const newRSN = rsn != null ? sanitizeRSN(rsn) : player.rsn;
  db.prepare(
    'UPDATE players SET rsn = ?, quest_points = ?, group_id = ? WHERE id = ?'
  ).run(
    newRSN,
    quest_points ?? player.quest_points,
    group_id ?? player.group_id,
    req.params.id
  );
  res.json({ success: true });
});

// DELETE /api/players/:id
router.delete('/:id', (req, res) => {
  const player = db.prepare('SELECT group_id FROM players WHERE id = ?').get(req.params.id);
  if (!checkGroupAuth(req, res, player?.group_id || req.headers['x-group-id'])) return;
  db.prepare('DELETE FROM players WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST /api/players/:id/sync - pull hiscores only (no auth — RS3 data is public)
// RuneMetrics (activity feed) is fetched separately by the 6-hour background cron
// to avoid Jagex rate-limits when many groups sync simultaneously.
router.post('/:id/sync', async (req, res) => {
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  try {
    // Auto-heal any dirty RSN (non-breaking space, replacement char, etc.)
    const cleanRSN = sanitizeRSN(player.rsn);
    if (cleanRSN !== player.rsn) {
      db.prepare('UPDATE players SET rsn = ? WHERE id = ?').run(cleanRSN, player.id);
      console.log(`[sync] Fixed RSN for player ${player.id}: ${JSON.stringify(player.rsn)} → ${JSON.stringify(cleanRSN)}`);
      player.rsn = cleanRSN;
    }

    const data = await fetchHiscores(player.rsn);
    const combat = calcCombatLevel(data.skills);

    // Preserve existing RuneMetrics quest data — only hiscores activities updated here.
    // Also take the opportunity to resolve the canonical display name (fixes casing /
    // encoding mismatches that slipped through sanitiseRSN).
    let existing = {};
    let canonicalRSN = player.rsn;
    try {
      const rm = await fetchRuneMetrics(player.rsn, 0);
      if (rm.name && rm.name.length > 0 && rm.name !== player.rsn) {
        // Only rename if no other player already has the canonical name
        const conflict = db.prepare('SELECT id FROM players WHERE rsn = ? AND id != ?').get(rm.name, player.id);
        if (conflict) {
          // Duplicate record — delete this stale copy and abort sync; the clean record will sync fine
          console.warn(`[sync] Duplicate player detected: "${player.rsn}" (id ${player.id}) conflicts with existing "${rm.name}" (id ${conflict.id}). Removing duplicate.`);
          db.prepare('DELETE FROM players WHERE id = ?').run(player.id);
          return res.json({ success: true, warning: 'Duplicate player removed — re-sync the group.' });
        }
        canonicalRSN = rm.name;
        db.prepare('UPDATE players SET rsn = ? WHERE id = ?').run(canonicalRSN, player.id);
        console.log(`[sync] Canonical RSN: "${player.rsn}" → "${canonicalRSN}"`);
        player.rsn = canonicalRSN;
      }
    } catch {
      // RuneMetrics unavailable or private — no problem, hiscores data is still valid
    }
    // Defensive parse: corrupted stats_json from before the sanitize fix must not crash the sync.
    try { existing = player.stats_json ? JSON.parse(player.stats_json) : {}; } catch {}
    const statsJson = JSON.stringify({
      activities:     data.activities,
      questsComplete: existing.questsComplete ?? null,
      questsStarted:  existing.questsStarted  ?? null,
    });

    // activities_json (RuneMetrics feed) is NOT touched here — cron keeps it fresh
    // Clear any previous sync_error on success
    db.prepare(
      'UPDATE players SET last_synced = CURRENT_TIMESTAMP, combat_level = ?, stats_json = ?, sync_error = NULL, sync_error_at = NULL WHERE id = ?'
    ).run(combat, statsJson, player.id);

    const upsertSkill = db.prepare(`
      INSERT INTO skills (player_id, skill_name, level, xp, rank)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(player_id, skill_name) DO UPDATE SET
        level = excluded.level,
        xp = excluded.xp,
        rank = excluded.rank
    `);

    db.runTransaction(() => {
      for (const [name, s] of Object.entries(data.skills)) {
        upsertSkill.run(player.id, name, s.level, s.xp, s.rank ?? -1);
      }
    });

    const today = new Date().toISOString().slice(0, 10);
    db.prepare(`
      INSERT INTO snapshots (player_id, snapshot_date, total_xp, total_level, skills_json)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(player_id, snapshot_date) DO NOTHING
    `).run(player.id, today, data.totalXp, data.totalLevel, JSON.stringify(data.skills));

    autoCompleteGoals(player.id, data.skills);

    res.json({ success: true, totalXp: data.totalXp, totalLevel: data.totalLevel, combat });
  } catch (err) {
    // Persist the error so the UI can flag this player
    db.prepare(
      'UPDATE players SET sync_error = ?, sync_error_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(err.message, player.id);
    res.status(502).json({ error: err.message });
  }
});

// POST /api/players/sync-all - hiscores only (no auth — RS3 data is public)
// RuneMetrics (activity feed) is fetched separately by the 6-hour background cron.
router.post('/sync-all/:groupId', async (req, res) => {
  const players = db.prepare('SELECT * FROM players WHERE group_id = ?').all(req.params.groupId);
  const results = [];

  for (const player of players) {
    try {
      // Auto-heal any dirty RSN
      const cleanRSN = sanitizeRSN(player.rsn);
      if (cleanRSN !== player.rsn) {
        db.prepare('UPDATE players SET rsn = ? WHERE id = ?').run(cleanRSN, player.id);
        console.log(`[sync-all] Fixed RSN for player ${player.id}: ${JSON.stringify(player.rsn)} → ${JSON.stringify(cleanRSN)}`);
        player.rsn = cleanRSN;
      }

      const data = await fetchHiscores(player.rsn);
      const combat = calcCombatLevel(data.skills);

      // Resolve canonical name + preserve RuneMetrics quest data.
      let existing = {};
      try {
        const rm = await fetchRuneMetrics(player.rsn, 0);
        if (rm.name && rm.name.length > 0 && rm.name !== player.rsn) {
          db.prepare('UPDATE players SET rsn = ? WHERE id = ?').run(rm.name, player.id);
          console.log(`[sync-all] Canonical RSN: "${player.rsn}" → "${rm.name}"`);
          player.rsn = rm.name;
        }
      } catch {
        // RuneMetrics unavailable or private — no problem
      }
      // Defensive parse: corrupted stats_json must not crash the sync.
      try { existing = player.stats_json ? JSON.parse(player.stats_json) : {}; } catch {}
      const statsJson = JSON.stringify({
        activities:     data.activities,
        questsComplete: existing.questsComplete ?? null,
        questsStarted:  existing.questsStarted  ?? null,
      });

      // activities_json (RuneMetrics feed) NOT touched — cron keeps it fresh
      // Clear any previous sync_error on success
      db.prepare(
        'UPDATE players SET last_synced = CURRENT_TIMESTAMP, combat_level = ?, stats_json = ?, sync_error = NULL, sync_error_at = NULL WHERE id = ?'
      ).run(combat, statsJson, player.id);

      const upsertSkill = db.prepare(`
        INSERT INTO skills (player_id, skill_name, level, xp, rank)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(player_id, skill_name) DO UPDATE SET
          level = excluded.level, xp = excluded.xp, rank = excluded.rank
      `);
      db.runTransaction(() => {
        for (const [name, s] of Object.entries(data.skills)) {
          upsertSkill.run(player.id, name, s.level, s.xp, s.rank ?? -1);
        }
      });

      const today = new Date().toISOString().slice(0, 10);
      db.prepare(`
        INSERT INTO snapshots (player_id, snapshot_date, total_xp, total_level, skills_json)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(player_id, snapshot_date) DO NOTHING
      `).run(player.id, today, data.totalXp, data.totalLevel, JSON.stringify(data.skills));

      autoCompleteGoals(player.id, data.skills);

      results.push({ rsn: player.rsn, success: true });
    } catch (err) {
      // Persist the error so the UI can flag this player
      db.prepare(
        'UPDATE players SET sync_error = ?, sync_error_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(err.message, player.id);

      // 404 = player not yet ranked on hiscores (too low level) — not a real failure
      if (err.message.includes('not found on hiscores')) {
        results.push({ rsn: player.rsn, success: true, warning: 'Not yet ranked on hiscores' });
      } else {
        console.error(`[sync-all] Failed ${player.rsn}: ${err.message}`);
        results.push({ rsn: player.rsn, success: false, error: err.message });
      }
    }
  }

  res.json(results);
});

// POST /api/players/sync-activities/:groupId - fetch RuneMetrics for all group members
// Runs the same batched logic as the 2h cron but on demand for a single group.
// Batches of 10, 1s within batch, 60s between batches.
const BATCH_SIZE       = 10;
const WITHIN_BATCH_MS  = 1000;
const BETWEEN_BATCH_MS = 60000;

router.post('/sync-activities/:groupId', async (req, res) => {
  const players = db.prepare('SELECT * FROM players WHERE group_id = ?').all(req.params.groupId);
  const results = [];

  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    try {
      const rm = await fetchRuneMetrics(player.rsn, 20);
      const newActivities = saveActivities(player.id, rm.activities);
      if (newActivities.length > 0) {
        autoLogDrops(player.id, newActivities);
        autoDetectDiaries(player.id, newActivities);
        autoCountBossKills(player.id, newActivities);
        autoDetectLevelMilestones(player.id, newActivities);
      }
      results.push({ rsn: player.rsn, success: true, new: newActivities.length });
    } catch (err) {
      console.error(`[sync-activities] Failed ${player.rsn}: ${err.message}`);
      results.push({ rsn: player.rsn, success: false, error: err.message });
    }

    const isLastInBatch = (i + 1) % BATCH_SIZE === 0;
    const isLastPlayer  = i + 1 === players.length;
    if (!isLastPlayer) {
      await new Promise(r => setTimeout(r, isLastInBatch ? BETWEEN_BATCH_MS : WITHIN_BATCH_MS));
    }
  }

  res.json(results);
});

// GET /api/players/group-snapshots/:groupId
// Returns per-player per-skill weekly XP gains (current snapshot minus 7-day-old snapshot)
router.get('/group-snapshots/:groupId', (req, res) => {
  const { groupId } = req.params;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const players = db.prepare('SELECT id, rsn FROM players WHERE group_id = ? ORDER BY rsn').all(groupId);

  const result = players.map(player => {
    const latestSnap = db.prepare(
      'SELECT skills_json FROM snapshots WHERE player_id = ? ORDER BY snapshot_date DESC LIMIT 1'
    ).get(player.id);
    const weekSnap = db.prepare(
      'SELECT skills_json FROM snapshots WHERE player_id = ? AND snapshot_date <= ? ORDER BY snapshot_date DESC LIMIT 1'
    ).get(player.id, weekAgo);

    let gains = {};
    try {
      const latest = latestSnap?.skills_json ? JSON.parse(latestSnap.skills_json) : {};
      const old    = weekSnap?.skills_json   ? JSON.parse(weekSnap.skills_json)   : {};
      for (const [skill, data] of Object.entries(latest)) {
        if (skill === 'Overall') continue;
        const gain = (data.xp ?? 0) - (old[skill]?.xp ?? 0);
        if (gain > 0) gains[skill] = gain;
      }
    } catch {}

    return { playerId: player.id, rsn: player.rsn, gains };
  });

  res.json(result);
});

// GET /api/players/:id/snapshots - XP history
router.get('/:id/snapshots', (req, res) => {
  const snaps = db.prepare(
    'SELECT snapshot_date, total_xp, total_level FROM snapshots WHERE player_id = ? ORDER BY snapshot_date DESC LIMIT 90'
  ).all(req.params.id);
  res.json(snaps);
});

module.exports = router;
