const express      = require('express');
const router       = express.Router();
const path         = require('path');
const { execFile } = require('child_process');
const db           = require('../database');
const {
  hashPassword, verifyPassword, issueToken,
  checkRateLimit, recordFailedAttempt, clearRateLimit, requireAdmin,
} = require('../utils/adminAuth');
const { sanitizeRSN } = require('../services/runescape');

// Helpers for wiki scan
function normalizeForDiff(s) {
  return (s ?? '').toLowerCase()
    .replace(/[',\-().!:]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function slugify(s) {
  return (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// ── POST /api/admin/login ─────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';

  // Rate-limit check
  const rl = checkRateLimit(ip);
  if (rl.blocked) {
    return res.status(429).json({ error: `Too many failed attempts. Try again in ${rl.secsLeft}s.` });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username.trim().toLowerCase());
  if (!user) {
    recordFailedAttempt(ip);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  let ok;
  try { ok = verifyPassword(password, user.password_hash, user.salt); }
  catch { ok = false; }

  if (!ok) {
    recordFailedAttempt(ip);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Success — clear rate limit, update last_login, issue token
  clearRateLimit(ip);
  db.prepare('UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
  const token = issueToken(user.username);
  res.json({ token, username: user.username });
});

// ── All routes below require a valid admin JWT ────────────────────────────────

// GET /api/admin/submissions
router.get('/submissions', requireAdmin, (req, res) => {
  const { status, table_name } = req.query;
  let sql = 'SELECT * FROM rs3_data_submissions';
  const params = [];
  const where = [];
  if (status)     { where.push('status = ?');     params.push(status); }
  if (table_name) { where.push('table_name = ?'); params.push(table_name); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY submitted_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(r => ({
    ...r,
    proposed_data: safeParse(r.proposed_data),
    current_data:  safeParse(r.current_data),
  })));
});

// GET /api/admin/submissions/:id
router.get('/submissions/:id', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT * FROM rs3_data_submissions WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Submission not found' });
  res.json({
    ...row,
    proposed_data: safeParse(row.proposed_data),
    current_data:  safeParse(row.current_data),
  });
});

// POST /api/admin/submissions — create a new submission (for table-browser "submit new entry")
router.post('/submissions', requireAdmin, (req, res) => {
  const { table_name, action, record_id, proposed_data, submission_note } = req.body;
  if (!table_name || !proposed_data) return res.status(400).json({ error: 'table_name and proposed_data required' });
  const ALLOWED_TABLES = ['rs3_bosses','rs3_quests','rs3_gear_items','rs3_gear_paths','rs3_milestone_items','rs3_slayer_creatures','rs3_skill_milestones'];
  if (!ALLOWED_TABLES.includes(table_name)) return res.status(400).json({ error: 'Unknown table' });

  // Capture current data if this is an update/delete
  let current_data = null;
  if (record_id && (action === 'update' || action === 'delete')) {
    const cur = db.prepare(`SELECT * FROM ${table_name} WHERE id = ?`).get(record_id);
    current_data = cur ? JSON.stringify(cur) : null;
  }

  const result = db.prepare(`
    INSERT INTO rs3_data_submissions (table_name, action, record_id, proposed_data, current_data, submitted_by, submission_note)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    table_name,
    action || 'create',
    record_id || null,
    JSON.stringify(proposed_data),
    current_data,
    req.adminUser,
    submission_note || null,
  );
  res.status(201).json({ id: result.lastInsertRowid });
});

// POST /api/admin/submissions/:id/approve
router.post('/submissions/:id/approve', requireAdmin, (req, res) => {
  const sub = db.prepare('SELECT * FROM rs3_data_submissions WHERE id = ?').get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Submission not found' });
  if (sub.status !== 'pending') return res.status(409).json({ error: 'Already reviewed' });

  const data = safeParse(sub.proposed_data);
  if (!data) return res.status(422).json({ error: 'Invalid proposed_data JSON' });

  const ALLOWED_TABLES = ['rs3_bosses','rs3_quests','rs3_gear_items','rs3_gear_paths','rs3_milestone_items','rs3_slayer_creatures','rs3_skill_milestones'];
  if (!ALLOWED_TABLES.includes(sub.table_name)) return res.status(400).json({ error: 'Unknown table' });

  try {
    db.runTransaction(() => {
      if (sub.action === 'create') {
        const cols = Object.keys(data);
        const vals = Object.values(data).map(v => typeof v === 'object' ? JSON.stringify(v) : v);
        db.prepare(`INSERT OR REPLACE INTO ${sub.table_name} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...vals);
      } else if (sub.action === 'update') {
        const cols = Object.keys(data).filter(k => k !== 'id');
        const vals = cols.map(k => typeof data[k] === 'object' ? JSON.stringify(data[k]) : data[k]);
        vals.push(data.id || sub.record_id);
        db.prepare(`UPDATE ${sub.table_name} SET ${cols.map(c => `${c} = ?`).join(', ')} WHERE id = ?`).run(...vals);
      } else if (sub.action === 'delete') {
        db.prepare(`DELETE FROM ${sub.table_name} WHERE id = ?`).run(sub.record_id);
      }

      // Mark any other pending submissions for the same record as superseded
      if (sub.record_id) {
        db.prepare(`UPDATE rs3_data_submissions SET status = 'superseded' WHERE table_name = ? AND record_id = ? AND id != ? AND status = 'pending'`)
          .run(sub.table_name, sub.record_id, sub.id);
      }

      db.prepare(`UPDATE rs3_data_submissions SET status = 'approved', reviewed_by = ?, review_note = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(req.adminUser, req.body.review_note || null, sub.id);
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/submissions/:id/reject
router.post('/submissions/:id/reject', requireAdmin, (req, res) => {
  const sub = db.prepare('SELECT * FROM rs3_data_submissions WHERE id = ?').get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Submission not found' });
  if (sub.status !== 'pending') return res.status(409).json({ error: 'Already reviewed' });

  db.prepare(`UPDATE rs3_data_submissions SET status = 'rejected', reviewed_by = ?, review_note = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(req.adminUser, req.body.review_note || null, sub.id);
  res.json({ success: true });
});

// GET /api/admin/table/:name — browse any RS3 reference table
router.get('/table/:name', requireAdmin, (req, res) => {
  const ALLOWED = ['rs3_bosses','rs3_quests','rs3_gear_items','rs3_gear_paths','rs3_milestone_items','rs3_slayer_creatures','rs3_skill_milestones'];
  if (!ALLOWED.includes(req.params.name)) return res.status(400).json({ error: 'Unknown table' });
  const { search } = req.query;
  let sql = `SELECT * FROM ${req.params.name}`;
  const params = [];
  if (search) { sql += ' WHERE id LIKE ? OR name LIKE ?'; params.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY id LIMIT 500';
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// GET /api/admin/audit — approved + rejected submissions
router.get('/audit', requireAdmin, (req, res) => {
  const rows = db.prepare(
    "SELECT * FROM rs3_data_submissions WHERE status IN ('approved','rejected') ORDER BY reviewed_at DESC LIMIT 200"
  ).all();
  res.json(rows.map(r => ({
    ...r,
    proposed_data: safeParse(r.proposed_data),
    current_data:  safeParse(r.current_data),
  })));
});

// GET /api/admin/stats — dashboard counters
router.get('/stats', requireAdmin, (req, res) => {
  const pending  = db.prepare("SELECT COUNT(*) as n FROM rs3_data_submissions WHERE status = 'pending'").get().n;
  const approved = db.prepare("SELECT COUNT(*) as n FROM rs3_data_submissions WHERE status = 'approved'").get().n;
  const rejected = db.prepare("SELECT COUNT(*) as n FROM rs3_data_submissions WHERE status = 'rejected'").get().n;
  const tables = ['rs3_bosses','rs3_quests','rs3_gear_items','rs3_gear_paths','rs3_milestone_items','rs3_slayer_creatures','rs3_skill_milestones'];
  const counts = {};
  for (const t of tables) {
    counts[t] = db.prepare(`SELECT COUNT(*) as n FROM ${t}`).get().n;
  }
  res.json({ pending, approved, rejected, table_counts: counts });
});

function safeParse(val) {
  if (val == null) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return val; }
}

// ── Maintenance operations ─────────────────────────────────────────────────────

// GET /api/admin/groups — full group listing used by the Groups tab
router.get('/groups', requireAdmin, (req, res) => {
  const groups = db.prepare(`
    SELECT
      g.id,
      g.name,
      g.group_rsn,
      g.gim_type,
      g.gim_size,
      CASE WHEN g.password_hash IS NOT NULL THEN 1 ELSE 0 END AS claimed,
      CASE WHEN g.discord_webhook_url IS NOT NULL THEN 1 ELSE 0 END AS has_webhook,
      g.last_activity,
      g.created_at,
      (SELECT COUNT(*) FROM players WHERE group_id = g.id) AS player_count,
      (SELECT COUNT(*) FROM players WHERE group_id = g.id AND sync_error IS NOT NULL) AS error_count
    FROM groups g ORDER BY g.id DESC
  `).all();
  res.json(groups);
});

// GET /api/admin/maintenance/groups — list all groups with player counts
router.get('/maintenance/groups', requireAdmin, (req, res) => {
  const groups = db.prepare(`
    SELECT
      g.id,
      g.name,
      g.group_rsn,
      g.gim_type,
      g.gim_size,
      CASE WHEN g.password_hash IS NOT NULL THEN 1 ELSE 0 END AS claimed,
      (SELECT COUNT(*) FROM players WHERE group_id = g.id) AS player_count,
      g.created_at
    FROM groups g ORDER BY g.id DESC
  `).all();
  res.json(groups);
});

// GET /api/admin/maintenance/groups/:id/players — list players in a group
router.get('/maintenance/groups/:id/players', requireAdmin, (req, res) => {
  const players = db.prepare(
    'SELECT id, rsn, combat_level, last_synced AS last_synced_at, sync_error FROM players WHERE group_id = ? ORDER BY rsn'
  ).all(req.params.id);
  res.json(players);
});

// POST /api/admin/maintenance/move-players — move all players from one group to another
router.post('/maintenance/move-players', requireAdmin, (req, res) => {
  const { from_group_id, to_group_id } = req.body;
  if (!from_group_id || !to_group_id) return res.status(400).json({ error: 'from_group_id and to_group_id required' });
  const moved = db.prepare('UPDATE players SET group_id = ? WHERE group_id = ?').run(Number(to_group_id), Number(from_group_id));
  res.json({ success: true, moved: moved.changes, message: `Moved ${moved.changes} player(s) from group #${from_group_id} → #${to_group_id}` });
});

// POST /api/admin/maintenance/delete-orphan-group — delete a group that has 0 players
router.post('/maintenance/delete-orphan-group', requireAdmin, (req, res) => {
  const { group_id } = req.body;
  if (!group_id) return res.status(400).json({ error: 'group_id required' });
  const gid = Number(group_id);
  const playerCount = db.prepare('SELECT COUNT(*) as n FROM players WHERE group_id = ?').get(gid).n;
  if (playerCount > 0) return res.status(409).json({ error: `Group ${gid} still has ${playerCount} player(s). Move or delete them first.` });
  const deleted = db.prepare('DELETE FROM groups WHERE id = ?').run(gid);
  if (!deleted.changes) return res.status(404).json({ error: `Group ${gid} not found` });
  res.json({ success: true, message: `Deleted empty group #${gid}` });
});

// POST /api/admin/maintenance/reset-secret — clear a group's password so they can re-claim
router.post('/maintenance/reset-secret', requireAdmin, (req, res) => {
  const { group_id } = req.body;
  if (!group_id) return res.status(400).json({ error: 'group_id required' });
  const gid = Number(group_id);
  const group = db.prepare('SELECT id, name FROM groups WHERE id = ?').get(gid);
  if (!group) return res.status(404).json({ error: `Group ${gid} not found` });
  db.prepare('UPDATE groups SET password_hash = NULL WHERE id = ?').run(gid);
  res.json({ success: true, message: `Secret cleared for "${group.name}" (id ${gid}). They can now re-claim.` });
});

// POST /api/admin/maintenance/delete-group — permanently delete a group and all its players
router.post('/maintenance/delete-group', requireAdmin, (req, res) => {
  const { group_id } = req.body;
  if (!group_id) return res.status(400).json({ error: 'group_id required' });
  const gid = Number(group_id);
  const group = db.prepare('SELECT id, name FROM groups WHERE id = ?').get(gid);
  if (!group) return res.status(404).json({ error: `Group ${gid} not found` });
  const playerCount = db.prepare('SELECT COUNT(*) as n FROM players WHERE group_id = ?').get(gid).n;
  db.prepare('DELETE FROM players WHERE group_id = ?').run(gid);
  db.prepare('DELETE FROM groups WHERE id = ?').run(gid);
  res.json({ success: true, message: `Deleted group "${group.name}" (id ${gid}) and ${playerCount} player(s). All related data cascaded.` });
});

// POST /api/admin/maintenance/fix-rsn — overwrite a player's RSN and clear their sync error
router.post('/maintenance/fix-rsn', requireAdmin, (req, res) => {
  const { player_id, rsn } = req.body;
  if (!player_id || !rsn) return res.status(400).json({ error: 'player_id and rsn required' });
  const clean = sanitizeRSN(rsn.trim());
  const player = db.prepare('SELECT id, rsn FROM players WHERE id = ?').get(Number(player_id));
  if (!player) return res.status(404).json({ error: `Player ${player_id} not found` });
  db.prepare('UPDATE players SET rsn = ?, sync_error = NULL WHERE id = ?').run(clean, Number(player_id));
  res.json({ success: true, old_rsn: player.rsn, new_rsn: clean, message: `Player #${player_id}: "${player.rsn}" → "${clean}". Sync error cleared.` });
});

// ── Database refresh / wiki scan ──────────────────────────────────────────────

// POST /api/admin/maintenance/reseed — re-run the seed script (all upserts are idempotent)
router.post('/maintenance/reseed', requireAdmin, (req, res) => {
  const scriptPath = path.resolve(__dirname, '../scripts/seedRs3Data.js');
  execFile('node', [scriptPath], { cwd: path.resolve(__dirname, '..'), timeout: 30000 },
    (err, stdout, stderr) => {
      const output = (stdout + '\n' + stderr).trim().slice(-1200);
      if (err) return res.status(500).json({ error: err.message, output });
      res.json({ success: true, message: 'Seed data re-applied successfully.', output });
    }
  );
});

// GET /api/admin/maintenance/wiki-scan?type=quests|bosses
// Fetches the RS Wiki category and returns items not yet in the DB.
router.get('/maintenance/wiki-scan', requireAdmin, async (req, res) => {
  const { type } = req.query;
  const CATEGORIES = { quests: 'Quests', bosses: 'Bosses' };
  const TABLES     = { quests: 'rs3_quests', bosses: 'rs3_bosses' };
  if (!CATEGORIES[type]) return res.status(400).json({ error: 'type must be quests or bosses' });

  try {
    // Paginate through the wiki category (up to 1500 entries = 3 pages of 500)
    const allTitles = [];
    let cmcontinue  = '';
    for (let page = 0; page < 3; page++) {
      const params = new URLSearchParams({
        action: 'query', list: 'categorymembers',
        cmtitle: `Category:${CATEGORIES[type]}`,
        cmlimit: '500', cmtype: 'page', format: 'json',
      });
      if (cmcontinue) params.set('cmcontinue', cmcontinue);

      const resp = await fetch(`https://runescape.wiki/api.php?${params}`, {
        headers: { 'User-Agent': 'RS3-GIM-Companion/1.0' },
        signal: AbortSignal.timeout(12000),
      });
      if (!resp.ok) throw new Error(`RS Wiki API returned ${resp.status}`);
      const data = await resp.json();

      (data.query?.categorymembers ?? []).forEach(m => allTitles.push(m.title));
      if (!data.continue?.cmcontinue) break;
      cmcontinue = data.continue.cmcontinue;
    }

    // Load current DB names for diff
    const dbRows   = db.prepare(`SELECT id, name FROM ${TABLES[type]}`).all();
    const dbNorms  = dbRows.map(r => normalizeForDiff(r.name));

    // Items on wiki but not matched in DB (fuzzy: DB name contains wiki name or vice versa)
    const newItems = allTitles
      .filter(title => {
        const wn = normalizeForDiff(title);
        // Skip obvious non-entries (redirect pages, disambiguation, etc.)
        if (wn.length < 2) return false;
        return !dbNorms.some(dn => dn === wn || dn.includes(wn) || wn.includes(dn));
      })
      .map(name => ({
        name,
        wiki_url: `https://runescape.wiki/w/${encodeURIComponent(name.replace(/ /g, '_'))}`,
        suggested_id: slugify(name),
      }));

    res.json({ total_wiki: allTitles.length, total_db: dbRows.length, new_items: newItems });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/maintenance/wiki-add — add a stub record from a wiki scan result
router.post('/maintenance/wiki-add', requireAdmin, (req, res) => {
  const { type, name, wiki_url } = req.body;
  const TABLES = { quests: 'rs3_quests', bosses: 'rs3_bosses' };
  if (!TABLES[type] || !name?.trim()) return res.status(400).json({ error: 'type and name required' });

  const id = slugify(name.trim());
  if (!id) return res.status(400).json({ error: 'Could not derive an ID from the name' });

  const existing = db.prepare(`SELECT id FROM ${TABLES[type]} WHERE id = ?`).get(id);
  if (existing) return res.status(409).json({ error: `"${id}" already exists in ${TABLES[type]}` });

  if (type === 'quests') {
    db.prepare(`
      INSERT INTO rs3_quests (id, name, wiki_url, requirements, rewards, last_verified_at)
      VALUES (?, ?, ?, '{}', '[]', ?)
    `).run(id, name.trim(), wiki_url ?? null, new Date().toISOString());
  } else {
    db.prepare(`
      INSERT INTO rs3_bosses (id, name, difficulty, requirements, drops, wiki_url, last_verified_at)
      VALUES (?, ?, 'unknown', '{}', '[]', ?, ?)
    `).run(id, name.trim(), wiki_url ?? null, new Date().toISOString());
  }

  res.json({ success: true, id, message: `Added stub "${name}" (id: ${id}). Fill in details via Table Browser → ${TABLES[type]}.` });
});

module.exports = router;
