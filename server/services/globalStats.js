/**
 * Numbers for the Global Leaderboard page: every group tracked on the site, side by side.
 * Only public data is used: hiscores snapshots (XP), the Adventurer's Log (boss kills, drops, 99s and 120s)
 * and the group list itself. Custom (non-Group-Ironman) groups and dev-only groups are left out.
 *
 * "This week" and "this month" count back from the newest daily snapshot (normally today), so the page still
 * makes sense if a sync is late. The result is built once and kept for 10 minutes: it reads every snapshot row
 * of the two periods, which is too much work to repeat on every page view.
 */
const db = require('../database');
const { BOSS_KILL_PATTERNS } = require('./activitySync');

const CACHE_MS = 10 * 60 * 1000;
let cache = null;                 // { at, value }

const dayBefore = (isoDate, days) => new Date(Date.parse(isoDate + 'T00:00:00Z') - days * 86400000).toISOString().slice(0, 10);
const parseJson = s => { try { return JSON.parse(s); } catch { return null; } };

// "I killed 17 Hermods." -> 17, "I killed  The Gate of Elidinis." -> 1
const batchKills = text => {
  const m = (text || '').match(/\b(?:killed|defeated|slain|vanquished)\s+(?:the\s+)?(\d[\d,]*)\b/i);
  return m ? Math.max(1, parseInt(m[1].replace(/,/g, ''), 10) || 1) : 1;
};

function build() {
  // groups that count: real Group Ironman groups
  const groups = db.prepare(`
    SELECT g.id, g.name, g.gim_type, g.gim_size, g.created_at,
           (g.password_hash IS NOT NULL) AS is_claimed
    FROM groups g
    WHERE COALESCE(g.is_dev_only, 0) = 0 AND COALESCE(g.gim_type, 'regular') <> 'custom'
  `).all();
  const groupById = new Map(groups.map(g => [g.id, { ...g, members: 0, totalXp: 0, weekGain: 0, monthGain: 0, activeMembers: 0 }]));

  const players = db.prepare('SELECT id, rsn, group_id FROM players').all().filter(p => groupById.has(p.group_id));
  const playerById = new Map(players.map(p => [p.id, p]));

  // current XP per player and skill
  const current = new Map();      // player_id -> { Overall: xp, Attack: xp, ... }
  for (const r of db.prepare('SELECT player_id, skill_name, xp FROM skills').all()) {
    if (!playerById.has(r.player_id)) continue;
    let m = current.get(r.player_id); if (!m) current.set(r.player_id, (m = {}));
    m[r.skill_name] = r.xp ?? 0;
  }

  const anchor = db.prepare('SELECT MAX(snapshot_date) d FROM snapshots').get()?.d ?? new Date().toISOString().slice(0, 10);
  const periods = { week: dayBefore(anchor, 7), month: dayBefore(anchor, 30) };

  // the starting point of a period: the newest snapshot on or before the cut-off day, or else the oldest one
  // (a player who was added during the period counts from the day they were first tracked)
  const baseAt = db.prepare(`
    SELECT s.player_id, s.total_xp, s.skills_json FROM snapshots s
    JOIN (SELECT player_id, MAX(snapshot_date) d FROM snapshots WHERE snapshot_date <= ? GROUP BY player_id) b
      ON b.player_id = s.player_id AND b.d = s.snapshot_date`);
  const baseFirst = db.prepare(`
    SELECT s.player_id, s.total_xp, s.skills_json FROM snapshots s
    JOIN (SELECT player_id, MIN(snapshot_date) d FROM snapshots GROUP BY player_id) b
      ON b.player_id = s.player_id AND b.d = s.snapshot_date`);
  const firstRows = new Map(baseFirst.all().map(r => [r.player_id, r]));

  const gains = {};               // period -> { players: Map(id -> gain), skills: { skill: xp } }
  for (const [key, cut] of Object.entries(periods)) {
    const base = new Map(baseAt.all(cut).map(r => [r.player_id, r]));
    const pg = new Map(), sg = {};
    for (const p of players) {
      const now = current.get(p.id);
      const b = base.get(p.id) ?? firstRows.get(p.id);
      if (!now?.Overall || !b?.total_xp) continue;            // a failed sync (0 XP) would look like a huge gain
      const gain = Math.max(0, now.Overall - b.total_xp);
      pg.set(p.id, gain);
      const old = parseJson(b.skills_json);
      if (old && gain > 0) {
        for (const [skill, xp] of Object.entries(now)) {
          if (skill === 'Overall') continue;
          const d = xp - (old[skill]?.xp ?? xp);
          if (d > 0) sg[skill] = (sg[skill] ?? 0) + d;
        }
      }
    }
    gains[key] = { players: pg, skills: sg };
  }

  for (const p of players) {
    const g = groupById.get(p.group_id);
    g.members++;
    g.totalXp += current.get(p.id)?.Overall ?? 0;
    const w = gains.week.players.get(p.id) ?? 0;
    g.weekGain += w;
    g.monthGain += gains.month.players.get(p.id) ?? 0;
    if (w > 0) g.activeMembers++;
  }
  const groupList = [...groupById.values()].filter(g => g.members > 0).map(g => ({
    id: g.id, name: g.name, type: g.gim_type ?? 'regular', size: g.gim_size ?? g.members, members: g.members,
    claimed: !!g.is_claimed, createdAt: g.created_at, totalXp: g.totalXp, weekGain: g.weekGain, monthGain: g.monthGain,
    activeMembers: g.activeMembers,
  }));

  const topPlayers = key => [...gains[key].players.entries()].filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]).slice(0, 15)
    .map(([id, gain]) => { const p = playerById.get(id), g = groupById.get(p.group_id); return { rsn: p.rsn, groupId: g.id, groupName: g.name, gain }; });
  const skillList = key => Object.entries(gains[key].skills).sort((a, b) => b[1] - a[1]).map(([skill, xp]) => ({ skill, xp }));

  const who = id => { const p = playerById.get(id); if (!p) return null; const g = groupById.get(p.group_id); return { rsn: p.rsn, groupId: g.id, groupName: g.name }; };

  // 99s and 120s (from the Adventurer's Log, or set by hand by the group)
  const milestoneRows = db.prepare(`SELECT player_id, skill, level, achieved_at FROM player_skill_milestones
    WHERE achieved_at >= ? ORDER BY achieved_at DESC`).all(periods.month).filter(r => playerById.has(r.player_id));
  const milestones = {
    weekCount: milestoneRows.filter(r => r.achieved_at >= periods.week).length,
    monthCount: milestoneRows.length,
    recent: milestoneRows.slice(0, 12).map(r => ({ ...who(r.player_id), skill: r.skill, level: r.level, at: r.achieved_at })),
  };

  // boss kills from the Adventurer's Log, per boss and per group
  const bosses = {};
  for (const [key, cut] of Object.entries(periods)) {
    const per = new Map(), perGroup = new Map();
    let total = 0;
    const rows = db.prepare(`SELECT player_id, text, details FROM player_activities
      WHERE ts >= ? AND (text LIKE '%kill%' OR text LIKE '%defeat%' OR text LIKE '%slain%' OR text LIKE '%vanquish%')`).all(cut);
    for (const r of rows) {
      const p = playerById.get(r.player_id); if (!p) continue;
      const boss = BOSS_KILL_PATTERNS.find(b => b.pattern.test(r.text + ' ' + (r.details || '')));
      if (!boss) continue;
      const n = batchKills(r.text);
      total += n;
      per.set(boss.label, (per.get(boss.label) ?? 0) + n);
      perGroup.set(p.group_id, (perGroup.get(p.group_id) ?? 0) + n);
    }
    const topGroup = [...perGroup.entries()].sort((a, b) => b[1] - a[1])[0];
    bosses[key] = {
      total,
      top: [...per.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, kills]) => ({ name, kills })),
      topGroup: topGroup ? { id: topGroup[0], name: groupById.get(topGroup[0]).name, kills: topGroup[1] } : null,
    };
  }

  // drops seen in the Adventurer's Log ("I found a ...")
  const dropRows = db.prepare(`SELECT player_id, item_name, dropped_at FROM drops
    WHERE notes = 'Auto-detected from activity feed' AND dropped_at >= ? ORDER BY dropped_at DESC`).all(periods.month)
    .filter(r => playerById.has(r.player_id));
  const drops = {
    weekCount: dropRows.filter(r => r.dropped_at >= periods.week).length,
    monthCount: dropRows.length,
    recent: dropRows.slice(0, 12).map(r => ({ ...who(r.player_id), item: r.item_name, at: r.dropped_at })),
  };

  const weekXp = groupList.reduce((s, g) => s + g.weekGain, 0);
  return {
    updatedAt: new Date().toISOString(),
    anchor, periods,
    totals: {
      groups: groupList.length,
      activeGroups: groupList.filter(g => g.weekGain > 0).length,
      players: players.length,
      activePlayers: [...gains.week.players.values()].filter(v => v > 0).length,
      totalXp: groupList.reduce((s, g) => s + g.totalXp, 0),
      weekXp, monthXp: groupList.reduce((s, g) => s + g.monthGain, 0),
      newGroupsMonth: groupList.filter(g => (g.createdAt ?? '') >= periods.month).length,
    },
    groups: groupList,
    players: { week: topPlayers('week'), month: topPlayers('month') },
    skills: { week: skillList('week'), month: skillList('month') },
    milestones, bosses, drops,
  };
}

function globalStats() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const value = build();
  cache = { at: Date.now(), value };
  return value;
}

module.exports = { globalStats, _build: build };
