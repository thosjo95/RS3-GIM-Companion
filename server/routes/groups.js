const express = require('express');
const router = express.Router();
const db = require('../database');
const { fetchHiscores, calcCombatLevel } = require('../services/runescape');
const { hashPassword, checkGroupAuth } = require('../utils/auth');
const { sendTestWebhook, DEFAULT_EVENTS } = require('../services/discord');

function fmtXp(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(n ?? 0);
}

// GET /api/groups/lookup-debug — fetches the GIM hiscores JS bundle to find the real data API
router.get('/lookup-debug', async (req, res) => {
  const { name = 'plink', type = 'competitive', size = '2' } = req.query;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Cache-Control': 'no-cache',
  };

  try {
    // 1. Get the hiscores page to find the route-specific JS chunk URL
    const pageResp = await fetch(
      `https://rs.runescape.com/hiscores/group-ironman/${type}/${size}/${encodeURIComponent(name)}`,
      { headers, signal: AbortSignal.timeout(15000) }
    );
    const html = await pageResp.text();

    // Extract chunk URLs from the RSC payload (the route-specific chunk is most likely to have the fetch call)
    const chunkUrls = [...new Set([...html.matchAll(/["']\/community-app\/_next\/static\/chunks\/([^"']+\.js)["']/g)].map(m => `/community-app/_next/static/chunks/${m[1]}`))];

    // 2. Try candidate direct API endpoints first
    const candidates = [
      `https://rs.runescape.com/community-app/api/hiscores/gim/${type}/${size}/${encodeURIComponent(name)}`,
      `https://rs.runescape.com/api/hiscores/gim/${type}/${size}/${encodeURIComponent(name)}`,
      `https://secure.runescape.com/m=hiscore/gimhiscores.json?group=${encodeURIComponent(name)}&type=${type}&size=${size}`,
      `https://apps.runescape.com/runemetrics/gim/group?name=${encodeURIComponent(name)}&type=${type}&size=${size}`,
    ];

    const apiResults = {};
    for (const url of candidates) {
      try {
        const r = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
        apiResults[url] = { status: r.status, body: (await r.text()).slice(0, 300) };
      } catch (e) {
        apiResults[url] = { error: e.message };
      }
    }

    // 3. Fetch the first two chunk JS files and search them for fetch calls and API URL patterns
    const chunkFindings = [];
    for (const chunkPath of chunkUrls.slice(0, 5)) {
      try {
        const cr = await fetch(`https://rs.runescape.com${chunkPath}`, { headers, signal: AbortSignal.timeout(8000) });
        if (!cr.ok) continue;
        const js = await cr.text();
        // Look for fetch calls and interesting URL strings
        const fetchUrls = [...js.matchAll(/fetch\(["'`]([^"'`]+)["'`]/g)].map(m => m[1]);
        const apiStrings = [...js.matchAll(/["'`](https?:\/\/[^"'`]*(?:gim|hiscore|group)[^"'`]*)["'`]/gi)].map(m => m[1]);
        const pathStrings = [...js.matchAll(/["'`](\/(?:api|community-app|hiscores)[^"'`]{5,80})["'`]/g)].map(m => m[1]);
        if (fetchUrls.length || apiStrings.length || pathStrings.length) {
          chunkFindings.push({ chunk: chunkPath, fetchUrls: fetchUrls.slice(0, 10), apiStrings: apiStrings.slice(0, 10), pathStrings: pathStrings.slice(0, 20) });
        }
      } catch {}
    }

    res.json({ htmlStatus: pageResp.status, chunkUrlCount: chunkUrls.length, chunkUrls: chunkUrls.slice(0, 8), apiResults, chunkFindings });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// GET /api/groups/search?name=X — search existing DB groups by name
// When name is empty, returns the most recently active groups (for browse/discover)
router.get('/search', (req, res) => {
  const { name, limit = 25 } = req.query;
  const cap = Math.min(Number(limit) || 25, 100);

  // Always hide dev-only groups (custom non-GIM groups) from public browse
  // Custom groups are accessible directly by ID (from sidebar/localStorage) but not discoverable
  const devFilter = 'AND (g.is_dev_only = 0 OR g.is_dev_only IS NULL)';

  if (!name?.trim()) {
    const groups = db.prepare(`
      SELECT g.id, g.name, g.group_rsn, g.gim_type, g.gim_size,
             g.created_at, g.last_activity,
             (g.password_hash IS NOT NULL) as is_claimed,
             COUNT(p.id) as member_count
      FROM groups g
      LEFT JOIN players p ON p.group_id = g.id
      WHERE 1=1 ${devFilter}
      GROUP BY g.id
      ORDER BY g.last_activity DESC, member_count DESC, g.created_at DESC
      LIMIT ?
    `).all(cap);
    return res.json(groups);
  }

  const groups = db.prepare(`
    SELECT g.id, g.name, g.group_rsn, g.gim_type, g.gim_size,
           g.created_at, g.last_activity,
           (g.password_hash IS NOT NULL) as is_claimed,
           COUNT(p.id) as member_count
    FROM groups g
    LEFT JOIN players p ON p.group_id = g.id
    WHERE (g.name LIKE ? OR g.group_rsn LIKE ?) ${devFilter}
    GROUP BY g.id
    ORDER BY member_count DESC, g.last_activity DESC, g.created_at DESC
    LIMIT ?
  `).all(`%${name.trim()}%`, `%${name.trim()}%`, cap);
  res.json(groups);
});

function extractMembers(obj) {
  if (!obj || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    // Check if this array looks like a list of players
    if (obj.length > 0 && obj.length <= 6) {
      const candidates = obj.map(m => {
        if (typeof m !== 'object' || !m) return null;
        const rsn = m.name || m.rsn || m.displayName || m.playerName || m.username;
        if (!rsn || typeof rsn !== 'string') return null;
        return {
          rsn,
          totalXp: m.totalXp || m.xp || m.experience || m.total_xp || 0,
          totalLevel: m.totalLevel || m.level || m.totalSkillLevel || m.total_level || 0,
        };
      }).filter(Boolean);
      if (candidates.length === obj.length && candidates.length > 0) return candidates;
    }
    for (const item of obj) {
      const result = extractMembers(item);
      if (result) return result;
    }
    return null;
  }
  // Check known member-bearing keys
  for (const key of ['members', 'players', 'groupMembers', 'groupPlayers']) {
    if (Array.isArray(obj[key]) && obj[key].length > 0) {
      const result = extractMembers(obj[key]);
      if (result) return result;
    }
  }
  // Recurse into all values
  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object') {
      const result = extractMembers(val);
      if (result) return result;
    }
  }
  return null;
}

// GET /api/groups/lookup?name=X&type=regular&size=5
// Fetches RS3 GIM hiscores page and extracts group members
router.get('/lookup', async (req, res) => {
  const { name, type = 'regular', size = '5' } = req.query;
  if (!name?.trim()) return res.status(400).json({ error: 'Group name required' });
  // Custom groups have no hiscores entry — members are added manually
  if (type === 'custom') return res.status(400).json({ error: 'Custom groups cannot be looked up on hiscores. Use manual member entry.' });

  const encoded = encodeURIComponent(name.trim());
  const url = `https://rs.runescape.com/hiscores/group-ironman/${type}/${size}/${encoded}`;

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

    if (!resp.ok) {
      return res.json({ found: false, error: `RS3 hiscores returned HTTP ${resp.status}` });
    }

    const html = await resp.text();

    // Strategy 1: Legacy __NEXT_DATA__ (Pages Router)
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      try {
        const members = extractMembers(JSON.parse(nextDataMatch[1]));
        if (members?.length) return res.json({ found: true, groupName: name.trim(), type, size: Number(size), members });
      } catch {}
    }

    // Strategy 2: Next.js App Router RSC flight data (self.__next_f.push([1,"..."]))
    // Each push([1, STRING]) contains a JSON-encoded RSC payload with embedded page data
    for (const match of html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)) {
      try {
        const payload = JSON.parse('"' + match[1] + '"'); // decode the JSON string
        // The RSC payload has lines like: T1234,{...json...}
        for (const chunk of payload.split('\n')) {
          const jsonStart = chunk.indexOf('{');
          if (jsonStart === -1) continue;
          try {
            const members = extractMembers(JSON.parse(chunk.slice(jsonStart)));
            if (members?.length) return res.json({ found: true, groupName: name.trim(), type, size: Number(size), members });
          } catch {}
        }
      } catch {}
    }

    // Strategy 3: Any JSON fragment with "members" or "players" key in raw HTML
    for (const match of html.matchAll(/"(?:members|players|groupMembers)"\s*:\s*(\[[\s\S]*?\](?:\s*[,}]))/g)) {
      try {
        const arr = JSON.parse(match[1].replace(/[,}]\s*$/, ']').replace(/,$/, ''));
        const members = extractMembers(arr);
        if (members?.length) return res.json({ found: true, groupName: name.trim(), type, size: Number(size), members });
      } catch {}
    }

    // Strategy 4: Same but searching escaped JSON inside RSC strings (\"members\":...)
    for (const match of html.matchAll(/\\"(?:members|players)\\"\s*:\s*(\[(?:[^[\]]|\[(?:[^[\]]|\[[^\]]*\])*\])*\])/g)) {
      try {
        const unescaped = match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        const members = extractMembers(JSON.parse(unescaped));
        if (members?.length) return res.json({ found: true, groupName: name.trim(), type, size: Number(size), members });
      } catch {}
    }

    // Strategy 5: RS avatar URLs — most reliable, always present in rendered group pages
    // Pattern: https://secure.runescape.com/m=avatar-rs/PLAYER NAME/chat.png
    const avatarMatches = [...html.matchAll(/m=avatar-rs\/([^\/]+)\/chat\.png/g)];
    if (avatarMatches.length) {
      const rsns = [...new Set(avatarMatches.map(m => decodeURIComponent(m[1].replace(/\+/g, ' '))))];
      const members = rsns.map(rsn => ({ rsn, totalXp: 0, totalLevel: 0 }));
      if (members.length) return res.json({ found: true, groupName: name.trim(), type, size: Number(size), members });
    }

    // Strategy 6: Player profile links (/players/NAME or personal-hiscores?user=NAME)
    const profileMatches = [
      ...html.matchAll(/href="[^"]*\/players\/([^"/?#]+)/g),
      ...html.matchAll(/[?&]user\d*=([^"&\s<>]+)/g),
    ];
    if (profileMatches.length) {
      const members = [...new Set(profileMatches.map(m => decodeURIComponent(m[1])))].map(rsn => ({ rsn, totalXp: 0, totalLevel: 0 }));
      if (members.length) return res.json({ found: true, groupName: name.trim(), type, size: Number(size), members });
    }

    return res.json({
      found: false,
      error: `No group data found in the RS3 hiscores page for "${name.trim()}" (${type}, ${size} members).`,
    });
  } catch (err) {
    res.json({ found: false, error: `Lookup failed: ${err.message}` });
  }
});

// GET /api/groups - list all groups
router.get('/', (req, res) => {
  const groups = db.prepare(`
    SELECT g.id, g.name, g.group_rsn, g.notes, g.gim_type, g.gim_size,
           g.created_at, g.last_activity,
           (g.password_hash IS NOT NULL) as is_claimed,
           COUNT(p.id) as member_count
    FROM groups g
    LEFT JOIN players p ON p.group_id = g.id
    GROUP BY g.id
    ORDER BY g.created_at DESC
  `).all();
  res.json(groups);
});

// GET /api/groups/:id - get group with players and aggregates
router.get('/:id', (req, res) => {
  const group = db.prepare(
    'SELECT id, name, group_rsn, notes, gim_type, gim_size, created_at, last_activity, (password_hash IS NOT NULL) as is_claimed FROM groups WHERE id = ?'
  ).get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const players = db.prepare(`
    SELECT p.id, p.rsn, p.quest_points, p.rune_score, p.combat_level, p.group_id,
           p.joined_at, p.last_synced, p.stats_json, p.activities_json, p.quests_json,
           p.sync_error, p.sync_error_at,
      (SELECT SUM(xp) FROM skills WHERE player_id = p.id AND skill_name = 'Overall') as total_xp,
      (SELECT level FROM skills WHERE player_id = p.id AND skill_name = 'Overall') as total_level
    FROM players p
    WHERE p.group_id = ?
    ORDER BY p.rsn
  `).all(req.params.id);

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  for (const player of players) {
    player.skills = db.prepare(
      'SELECT skill_name, level, xp, rank FROM skills WHERE player_id = ? ORDER BY skill_name'
    ).all(player.id);

    // Weekly XP gain: compare current Overall XP vs most recent snapshot >= 7 days old
    const weekSnap = db.prepare(
      'SELECT total_xp FROM snapshots WHERE player_id = ? AND snapshot_date <= ? ORDER BY snapshot_date DESC LIMIT 1'
    ).get(player.id, weekAgo)
      ?? db.prepare(
        'SELECT total_xp FROM snapshots WHERE player_id = ? ORDER BY snapshot_date ASC LIMIT 1'
      ).get(player.id);
    const currentXp = player.skills.find(s => s.skill_name === 'Overall')?.xp ?? 0;
    player.weekly_xp_gain = weekSnap != null ? Math.max(0, currentXp - weekSnap.total_xp) : null;
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

  const isDevOnly = 0;

  const groupResult = db.prepare(
    'INSERT INTO groups (name, group_rsn, gim_type, gim_size, password_hash, last_activity, is_dev_only) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)'
  ).run(name.trim(), name.trim(), type, size || member_rsns.length,
    password?.trim() ? hashPassword(password.trim()) : null, isDevOnly);

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

// POST /api/groups/:id/claim - generate a secret and claim an unclaimed group
router.post('/:id/claim', (req, res) => {
  const group = db.prepare('SELECT id, password_hash FROM groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (group.password_hash) return res.status(409).json({ error: 'Group is already claimed' });

  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const secret = `${seg()}-${seg()}-${seg()}`;

  db.prepare('UPDATE groups SET password_hash = ?, last_activity = CURRENT_TIMESTAMP WHERE id = ?')
    .run(hashPassword(secret), group.id);

  res.json({ ok: true, secret });
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

// ── Webhook settings ───────────────────────────────────────────────────────────

// GET /api/groups/:id/webhook — read webhook config (auth required)
router.get('/:id/webhook', (req, res) => {
  if (!checkGroupAuth(req, res, req.params.id)) return;
  const row = db.prepare('SELECT discord_webhook_url, webhook_events FROM groups WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Group not found' });
  let events;
  try { events = JSON.parse(row.webhook_events || 'null') ?? DEFAULT_EVENTS; } catch { events = DEFAULT_EVENTS; }
  res.json({
    configured: !!row.discord_webhook_url,
    webhook_url: row.discord_webhook_url || '',
    events,
  });
});

// PUT /api/groups/:id/webhook — save webhook URL + events (auth required)
router.put('/:id/webhook', (req, res) => {
  if (!checkGroupAuth(req, res, req.params.id)) return;
  const { webhook_url, events } = req.body;
  db.prepare('UPDATE groups SET discord_webhook_url = ?, webhook_events = ? WHERE id = ?')
    .run(webhook_url?.trim() || null, JSON.stringify(events ?? DEFAULT_EVENTS), req.params.id);
  res.json({ success: true });
});

// POST /api/groups/:id/share-snapshot
// Accepts a base64 PNG and posts it as a file to the group's Discord webhook
router.post('/:id/share-snapshot', checkGroupAuth, async (req, res) => {
  const group = db.prepare('SELECT discord_webhook_url AS webhook_url, name FROM groups WHERE id = ?').get(req.params.id);
  if (!group?.webhook_url) return res.status(400).json({ error: 'No Discord webhook configured for this group. Set one in the notification settings.' });

  const { imageData } = req.body;
  if (!imageData) return res.status(400).json({ error: 'No image data provided' });

  try {
    const base64 = imageData.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    // Build a multipart/form-data body manually (Node 18+ has no native FormData for fetch)
    const boundary = `----FormBoundary${Date.now()}`;
    const payloadJson = JSON.stringify({
      content: `📊 **${group.name}** — Group Snapshot`,
      username: 'RS3 GIM Companion',
    });

    const parts = [
      `--${boundary}\r\nContent-Disposition: form-data; name="payload_json"\r\nContent-Type: application/json\r\n\r\n${payloadJson}\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="snapshot.png"\r\nContent-Type: image/png\r\n\r\n`,
    ];
    const prefix = Buffer.from(parts.join(''));
    const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body   = Buffer.concat([prefix, buffer, suffix]);

    const response = await fetch(group.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body,
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: `Discord returned ${response.status}: ${errText}` });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/groups/:id/webhook/test — send a test embed (auth required)
router.post('/:id/webhook/test', async (req, res) => {
  if (!checkGroupAuth(req, res, req.params.id)) return;
  const { webhook_url } = req.body;
  const group = db.prepare('SELECT name FROM groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  try {
    await sendTestWebhook(webhook_url, group.name);
    res.json({ success: true });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
