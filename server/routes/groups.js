const express = require('express');
const router = express.Router();
const db = require('../database');
const { fetchHiscores, calcCombatLevel } = require('../services/runescape');
const { hashPassword, checkGroupAuth } = require('../utils/auth');

function fmtXp(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(n ?? 0);
}

// GET /api/groups/lookup-debug?name=X&type=regular&size=5 — returns raw page snippet for debugging
router.get('/lookup-debug', async (req, res) => {
  const { name, type = 'regular', size = '5' } = req.query;
  if (!name?.trim()) return res.status(400).json({ error: 'Group name required' });
  const url = `https://rs.runescape.com/hiscores/group-ironman/${type}/${size}/${encodeURIComponent(name.trim())}`;
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(15000),
    });
    const html = await resp.text();
    const hasNextData = html.includes('__NEXT_DATA__');
    const snippet = html.slice(0, 2000);
    res.json({ status: resp.status, hasNextData, htmlLength: html.length, snippet, url });
  } catch (err) {
    res.json({ error: err.message, url });
  }
});

// GET /api/groups/search?name=X — search existing DB groups by name
router.get('/search', (req, res) => {
  const { name } = req.query;
  if (!name?.trim()) return res.json([]);
  const groups = db.prepare(`
    SELECT g.*, COUNT(p.id) as member_count
    FROM groups g
    LEFT JOIN players p ON p.group_id = g.id
    WHERE g.name LIKE ? OR g.group_rsn LIKE ?
    GROUP BY g.id
    ORDER BY g.last_activity DESC, g.created_at DESC
    LIMIT 10
  `).all(`%${name.trim()}%`, `%${name.trim()}%`);
  res.json(groups);
});

// GET /api/groups/lookup?name=X&type=regular&size=5
// Scrapes RS3 GIM hiscores page to find group members
router.get('/lookup', async (req, res) => {
  const { name, type = 'regular', size = '5' } = req.query;
  if (!name?.trim()) return res.status(400).json({ error: 'Group name required' });

  const encoded = encodeURIComponent(name.trim());
  const url = `https://rs.runescape.com/hiscores/group-ironman/${type}/${size}/${encoded}`;

  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      return res.json({ found: false, error: `RS3 hiscores returned HTTP ${resp.status}` });
    }

    const html = await resp.text();

    // Strategy 1: Next.js __NEXT_DATA__ script tag
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const pageProps = nextData?.props?.pageProps;
        const raw =
          pageProps?.group?.members ||
          pageProps?.group?.players ||
          pageProps?.data?.group?.members ||
          pageProps?.data?.members ||
          pageProps?.members ||
          pageProps?.players ||
          nextData?.props?.initialState?.group?.members;

        if (raw?.length) {
          const members = raw.map(m => ({
            rsn: m.name || m.rsn || m.displayName || m.playerName || m.username,
            totalXp: m.totalXp || m.xp || m.experience || m.total_xp || 0,
            totalLevel: m.totalLevel || m.level || m.totalSkillLevel || m.total_level || 0,
          })).filter(m => m.rsn);

          if (members.length) {
            return res.json({ found: true, groupName: name.trim(), type, size: Number(size), members });
          }
        }
      } catch {}
    }

    // Strategy 2: Search for any JSON fragment containing member/player arrays in the raw HTML
    const jsonFragments = html.matchAll(/"(?:members|players)"\s*:\s*(\[[\s\S]*?\])/g);
    for (const match of jsonFragments) {
      try {
        const arr = JSON.parse(match[1]);
        if (!Array.isArray(arr) || !arr.length) continue;
        const members = arr.map(m => ({
          rsn: m.name || m.rsn || m.displayName || m.playerName || m.username,
          totalXp: m.totalXp || m.xp || m.experience || m.total_xp || 0,
          totalLevel: m.totalLevel || m.level || m.totalSkillLevel || m.total_level || 0,
        })).filter(m => m.rsn);
        if (members.length) {
          return res.json({ found: true, groupName: name.trim(), type, size: Number(size), members });
        }
      } catch {}
    }

    // Strategy 3: Extract player names from HTML href patterns (hiscores links)
    // RS3 player links look like /hiscores/compare?user1=Name
    const hrefMatches = [...html.matchAll(/[?&]user\d*=([^"&\s]+)/g)];
    if (hrefMatches.length >= 1) {
      const members = [...new Set(hrefMatches.map(m => decodeURIComponent(m[1])))].map(rsn => ({ rsn, totalXp: 0, totalLevel: 0 }));
      if (members.length) {
        return res.json({ found: true, groupName: name.trim(), type, size: Number(size), members });
      }
    }

    return res.json({
      found: false,
      error: 'Group not found — check the name and group size match exactly. The group must be ranked on the RS3 GIM hiscores.',
    });
  } catch (err) {
    res.json({ found: false, error: `Lookup failed: ${err.message}` });
  }
});

// GET /api/groups - list all groups
router.get('/', (req, res) => {
  const groups = db.prepare(`
    SELECT g.*, COUNT(p.id) as member_count
    FROM groups g
    LEFT JOIN players p ON p.group_id = g.id
    GROUP BY g.id
    ORDER BY g.created_at DESC
  `).all();
  res.json(groups);
});

// GET /api/groups/:id - get group with players and aggregates
router.get('/:id', (req, res) => {
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const players = db.prepare(`
    SELECT p.id, p.rsn, p.quest_points, p.combat_level, p.group_id,
           p.joined_at, p.last_synced, p.stats_json, p.activities_json,
      (SELECT SUM(xp) FROM skills WHERE player_id = p.id AND skill_name = 'Overall') as total_xp,
      (SELECT level FROM skills WHERE player_id = p.id AND skill_name = 'Overall') as total_level
    FROM players p
    WHERE p.group_id = ?
    ORDER BY p.rsn
  `).all(req.params.id);

  for (const player of players) {
    player.skills = db.prepare(
      'SELECT skill_name, level, xp, rank FROM skills WHERE player_id = ? ORDER BY skill_name'
    ).all(player.id);
  }

  const totals = db.prepare(`
    SELECT
      SUM(s.xp) as group_total_xp,
      SUM(CASE WHEN s.skill_name = 'Overall' THEN s.level ELSE 0 END) as group_total_level,
      SUM(p.quest_points) as group_quest_points
    FROM players p
    LEFT JOIN skills s ON s.player_id = p.id AND s.skill_name = 'Overall'
    WHERE p.group_id = ?
  `).get(req.params.id);

  res.json({ ...group, players, ...totals });
});

// POST /api/groups/:id/verify - check password without performing a write
router.post('/:id/verify', (req, res) => {
  const group = db.prepare('SELECT id, password_hash FROM groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (!group.password_hash) return res.json({ ok: true });
  const password = req.headers['x-group-password'];
  if (!password) return res.status(401).json({ error: 'Password required' });
  if (hashPassword(password) !== group.password_hash) return res.status(401).json({ error: 'Incorrect password' });
  res.json({ ok: true });
});

// POST /api/groups/setup - create group + add all members + sync hiscores
router.post('/setup', async (req, res) => {
  const { name, type = 'regular', size, member_rsns = [], password } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Group name required' });
  if (!member_rsns.length) return res.status(400).json({ error: 'At least one member RSN required' });

  if (!password?.trim()) return res.status(400).json({ error: 'A group password is required' });

  const groupResult = db.prepare(
    'INSERT INTO groups (name, group_rsn, gim_type, gim_size, password_hash, last_activity) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
  ).run(name.trim(), name.trim(), type, size || member_rsns.length, hashPassword(password.trim()));

  const groupId = groupResult.lastInsertRowid;

  const addStmt = db.prepare('INSERT OR IGNORE INTO players (rsn, group_id) VALUES (?, ?)');
  for (const rsn of member_rsns) {
    if (rsn?.trim()) addStmt.run(rsn.trim(), groupId);
  }

  const players = db.prepare('SELECT * FROM players WHERE group_id = ?').all(groupId);
  const today = new Date().toISOString().split('T')[0];
  const synced = [];
  const failed = [];

  for (const player of players) {
    try {
      const data = await fetchHiscores(player.rsn);
      const combat = calcCombatLevel(data.skills);

      db.prepare('UPDATE players SET combat_level = ?, last_synced = CURRENT_TIMESTAMP WHERE id = ?')
        .run(combat, player.id);

      db.runTransaction(() => {
        const upsert = db.prepare(`
          INSERT INTO skills (player_id, skill_name, level, xp, rank)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(player_id, skill_name) DO UPDATE SET
            level = excluded.level, xp = excluded.xp, rank = excluded.rank
        `);
        for (const [skillName, s] of Object.entries(data.skills)) {
          upsert.run(player.id, skillName, s.level, s.xp, s.rank);
        }
      });

      db.prepare(`
        INSERT INTO snapshots (player_id, snapshot_date, total_xp, total_level, skills_json)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(player_id, snapshot_date) DO UPDATE SET
          total_xp = excluded.total_xp, total_level = excluded.total_level, skills_json = excluded.skills_json
      `).run(player.id, today, data.totalXp, data.totalLevel, JSON.stringify(data.skills));

      synced.push(player.rsn);
    } catch (err) {
      failed.push({ rsn: player.rsn, error: err.message });
    }
  }

  res.status(201).json({ id: groupId, synced, failed });
});

// POST /api/groups - create group (simple, no members)
router.post('/', (req, res) => {
  const { name, group_rsn, notes } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Group name is required' });

  const result = db.prepare(
    'INSERT INTO groups (name, group_rsn, notes) VALUES (?, ?, ?)'
  ).run(name.trim(), group_rsn?.trim() || null, notes?.trim() || null);

  res.status(201).json({ id: result.lastInsertRowid, name, group_rsn, notes });
});

// PUT /api/groups/:id
router.put('/:id', (req, res) => {
  if (!checkGroupAuth(req, res, req.params.id)) return;
  const { name, group_rsn, notes } = req.body;
  db.prepare(
    'UPDATE groups SET name = ?, group_rsn = ?, notes = ? WHERE id = ?'
  ).run(name, group_rsn || null, notes || null, req.params.id);
  res.json({ success: true });
});

// DELETE /api/groups/:id
router.delete('/:id', (req, res) => {
  if (!checkGroupAuth(req, res, req.params.id)) return;
  db.prepare('UPDATE players SET group_id = NULL WHERE group_id = ?').run(req.params.id);
  db.prepare('DELETE FROM groups WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
