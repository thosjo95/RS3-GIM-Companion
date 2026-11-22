/**
 * Numbers for the Global Leaderboard page: every group tracked on the site, side by side.
 * (The same file runs in 1.x and 2.0; the 2.0-only parts switch on when their tables and columns exist.)
 *
 * The page filters everything by group mode and size in the browser, so the numbers are sent per group:
 * XP gains, drops and 99s/120s per group; XP per skill and boss kills per mode and size ("buckets", much smaller).
 * Lists that name someone (players, the latest 99s and drops) carry the group's mode and size so they can be filtered too.
 *
 * Everything that names a group or a player comes from PUBLIC data only: hiscores snapshots (XP), the Adventurer's Log
 * (boss kills, drops, 99s and 120s) and the group list. In 2.0, plugin data (online, exact kills, drops with values,
 * clues, achievements) is private to each group (see docs/privacy.html), so it only appears as totals over everyone,
 * never per group, mode or size. Left out entirely: the demo group, custom (non-Group-Ironman) and dev-only groups.
 * Unlisted groups count in the numbers but are never named (they are sent without id and name).
 *
 * "This week", "this month" and "this year" (7, 30 and 365 days) count back from the newest daily snapshot (normally today), so the page still makes
 * sense if a sync is late. The result is built once and kept for 10 minutes.
 */
const db = require('../database');
const { BOSS_KILL_PATTERNS } = require('./activitySync');

const CACHE_MS = 10 * 60 * 1000;
const ONLINE_MS = 5 * 60 * 1000;  // "online now": the plugin was heard from in the last 5 minutes
const RECENT_MAX = 150;           // newest 99s/120s and drops sent for the lists (the counts use all of them)
let cache = null;                 // { at, value }

const dayBefore = (isoDate, days) => new Date(Date.parse(isoDate + 'T00:00:00Z') - days * 86400000).toISOString().slice(0, 10);
const parseJson = s => { try { return JSON.parse(s); } catch { return null; } };
const hasColumn = (table, col) => { try { return db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === col); } catch { return false; } };
const hasTable = name => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
const add = (obj, key, n) => { obj[key] = (obj[key] ?? 0) + n; };
const CLUE_FIELDS = ['Clue Scrolls Easy', 'Clue Scrolls Medium', 'Clue Scrolls Hard', 'Clue Scrolls Elite', 'Clue Scrolls Master'];
const CLUE_TIERS = ['easy', 'medium', 'hard', 'elite', 'master'];          // the same order, as metric snapshots name them

// "I killed 17 Hermods." -> 17, "I killed  The Gate of Elidinis." -> 1
const batchKills = text => {
  const m = (text || '').match(/\b(?:killed|defeated|slain|vanquished)\s+(?:the\s+)?(\d[\d,]*)\b/i);
  return m ? Math.max(1, parseInt(m[1].replace(/,/g, ''), 10) || 1) : 1;
};

function build() {
  const isV2 = hasColumn('groups', 'is_demo');
  // groups that count: real Group Ironman groups (in 2.0 not the demo)
  const groups = db.prepare(`
    SELECT g.id, g.name, g.gim_type, g.gim_size, g.created_at ${isV2 ? ', g.settings_json' : ''}
    FROM groups g
    WHERE COALESCE(g.is_dev_only, 0) = 0 AND COALESCE(g.gim_type, 'regular') <> 'custom'
      ${isV2 ? 'AND COALESCE(g.is_demo, 0) = 0' : ''}
  `).all();
  const periodsEmpty = () => ({ week: {}, month: {}, year: {} });
  const groupById = new Map(groups.map(g => [g.id, {
    id: g.id, name: g.name, type: g.gim_type ?? 'regular', size: g.gim_size ?? null, createdAt: g.created_at,
    unlisted: isV2 && parseJson(g.settings_json)?.unlisted === true,
    members: 0, totalXp: 0, weekGain: 0, monthGain: 0, yearGain: 0, activeWeek: 0, bossKills: { week: 0, month: 0, year: 0 },
    drops: { week: 0, month: 0, year: 0 }, milestones: { week: 0, month: 0, year: 0 },
    clues: 0, clueGain: { week: 0, month: 0, year: 0 },
  }]));

  const players = db.prepare('SELECT id, rsn, group_id, stats_json FROM players').all().filter(p => groupById.has(p.group_id));
  const playerById = new Map(players.map(p => [p.id, p]));
  const groupOf = id => groupById.get(playerById.get(id)?.group_id);
  // XP per skill and boss kills, per mode and size: "regular|5" -> { skills: { week, month, year }, bosses: { week, month, year } }
  const buckets = {};
  const bucket = g => (buckets[g.type + '|' + g.size] ??= { type: g.type, size: g.size, skills: periodsEmpty(), bosses: periodsEmpty() });

  // current XP per player and skill
  const current = new Map();      // player_id -> { Overall: xp, Attack: xp, ... }
  for (const r of db.prepare('SELECT player_id, skill_name, xp FROM skills').all()) {
    if (!playerById.has(r.player_id)) continue;
    let m = current.get(r.player_id); if (!m) current.set(r.player_id, (m = {}));
    m[r.skill_name] = r.xp ?? 0;
  }

  const anchor = db.prepare('SELECT MAX(snapshot_date) d FROM snapshots').get()?.d ?? new Date().toISOString().slice(0, 10);
  const periods = { week: dayBefore(anchor, 7), month: dayBefore(anchor, 30), year: dayBefore(anchor, 365) };

  // the starting point of a period: the newest snapshot on or before the cut-off day, or else the oldest one
  // (a player who was added during the period counts from the day they were first tracked)
  const baseAt = db.prepare(`
    SELECT s.player_id, s.total_xp, s.skills_json FROM snapshots s
    JOIN (SELECT player_id, MAX(snapshot_date) d FROM snapshots WHERE snapshot_date <= ? GROUP BY player_id) b
      ON b.player_id = s.player_id AND b.d = s.snapshot_date`);
  const firstRows = new Map(db.prepare(`
    SELECT s.player_id, s.total_xp, s.skills_json FROM snapshots s
    JOIN (SELECT player_id, MIN(snapshot_date) d FROM snapshots GROUP BY player_id) b
      ON b.player_id = s.player_id AND b.d = s.snapshot_date`).all().map(r => [r.player_id, r]));

  const playerGain = { week: new Map(), month: new Map(), year: new Map() };
  for (const [key, cut] of Object.entries(periods)) {
    const base = new Map(baseAt.all(cut).map(r => [r.player_id, r]));
    for (const p of players) {
      const now = current.get(p.id);
      const b = base.get(p.id) ?? firstRows.get(p.id);
      if (!now?.Overall || !b?.total_xp) continue;            // a failed sync (0 XP) would look like a huge gain
      const gain = Math.max(0, now.Overall - b.total_xp);
      playerGain[key].set(p.id, gain);
      const old = parseJson(b.skills_json);
      if (old && gain > 0) {
        const sk = bucket(groupById.get(p.group_id)).skills[key];
        for (const [skill, xp] of Object.entries(now)) {
          if (skill === 'Overall') continue;
          const d = xp - (old[skill]?.xp ?? xp);
          if (d > 0) add(sk, skill, d);
        }
      }
    }
  }

  for (const p of players) {
    const g = groupById.get(p.group_id);
    g.members++;
    g.totalXp += current.get(p.id)?.Overall ?? 0;
    const w = playerGain.week.get(p.id) ?? 0;
    g.weekGain += w;
    g.monthGain += playerGain.month.get(p.id) ?? 0;
    g.yearGain += playerGain.year.get(p.id) ?? 0;
    if (w > 0) g.activeWeek++;
  }

  // clue scrolls completed (public hiscores, all five tiers added up). Every version has today's count; 2.0 also keeps
  // dated metric snapshots (up to 120 days), so there clues gained in a period can be worked out too.
  // Per player and tier: clueNow id -> [easy, medium, hard, elite, master]; cluePeriod[period] id -> the same, gained.
  const clueNow = new Map();
  for (const p of players) {
    const acts = parseJson(p.stats_json)?.activities;
    if (!acts) continue;
    const tiers = CLUE_FIELDS.map(f => (Number.isFinite(acts[f]) && acts[f] > 0 ? acts[f] : 0));
    clueNow.set(p.id, tiers);
    groupById.get(p.group_id).clues += tiers.reduce((s, n) => s + n, 0);
  }
  const clueGains = hasTable('metric_snapshots');
  const cluePeriod = { week: new Map(), month: new Map(), year: new Map() };
  if (clueGains) {
    const tiersOf = json => { const c = parseJson(json)?.clues; return c ? CLUE_TIERS.map(t => (Number.isFinite(c[t]) ? c[t] : null)) : null; };
    const firstClue = new Map(db.prepare(`SELECT m.player_id, m.data_json FROM metric_snapshots m
      JOIN (SELECT player_id, MIN(taken_at) t FROM metric_snapshots GROUP BY player_id) b ON b.player_id = m.player_id AND b.t = m.taken_at`)
      .all().map(r => [r.player_id, tiersOf(r.data_json)]));
    const clueAt = db.prepare(`SELECT m.player_id, m.data_json FROM metric_snapshots m
      JOIN (SELECT player_id, MAX(taken_at) t FROM metric_snapshots WHERE taken_at <= ? GROUP BY player_id) b ON b.player_id = m.player_id AND b.t = m.taken_at`);
    for (const [key, cut] of Object.entries(periods)) {
      const base = new Map(clueAt.all(cut + 'T23:59:59Z').map(r => [r.player_id, tiersOf(r.data_json)]));
      for (const [id, now] of clueNow) {
        const b = base.get(id) ?? firstClue.get(id);
        if (!b) continue;
        // a tier the old snapshot did not have counts as no gain (not as everything)
        const gained = now.map((n, i) => (b[i] == null ? 0 : Math.max(0, n - b[i])));
        const sum = gained.reduce((s, n) => s + n, 0);
        if (sum > 0) { cluePeriod[key].set(id, gained); groupById.get(playerById.get(id).group_id).clueGain[key] += sum; }
      }
    }
  }

  // boss kills from the Adventurer's Log, per group and boss
  for (const [key, cut] of Object.entries(periods)) {
    const rows = db.prepare(`SELECT player_id, text, details FROM player_activities
      WHERE ts >= ? AND (text LIKE '%kill%' OR text LIKE '%defeat%' OR text LIKE '%slain%' OR text LIKE '%vanquish%')`).all(cut);
    for (const r of rows) {
      const g = groupOf(r.player_id); if (!g) continue;
      const boss = BOSS_KILL_PATTERNS.find(b => b.pattern.test(r.text + ' ' + (r.details || '')));
      if (boss) { const n = batchKills(r.text); add(bucket(g).bosses[key], boss.label, n); g.bossKills[key] += n; }
    }
  }

  // a row of a named list: the group's mode and size always (for the filter), names only for listed groups
  const tag = id => {
    const g = groupOf(id);
    const out = { type: g.type, size: g.size };
    if (!g.unlisted) Object.assign(out, { rsn: playerById.get(id).rsn, groupId: g.id, groupName: g.name });
    return out;
  };

  // 99s and 120s (from the Adventurer's Log, or set by hand by the group)
  const milestoneRows = db.prepare(`SELECT player_id, skill, level, achieved_at FROM player_skill_milestones
    WHERE achieved_at >= ? ORDER BY achieved_at DESC`).all(periods.year).filter(r => playerById.has(r.player_id));
  for (const r of milestoneRows) { const g = groupOf(r.player_id); for (const k of Object.keys(periods)) if (r.achieved_at >= periods[k]) g.milestones[k]++; }

  // drops seen in the Adventurer's Log ("I found a ..."); the plugin's own drops are private and only counted below
  const dropRows = db.prepare(`SELECT player_id, item_name, dropped_at FROM drops
    WHERE notes = 'Auto-detected from activity feed' AND dropped_at >= ? ORDER BY dropped_at DESC`).all(periods.year)
    .filter(r => playerById.has(r.player_id));
  for (const r of dropRows) { const g = groupOf(r.player_id); for (const k of Object.keys(periods)) if (r.dropped_at >= periods[k]) g.drops[k]++; }

  const out = {
    updatedAt: new Date().toISOString(),
    clueGains,                      // true: groups carry clues gained per period; false (1.x): only the all-time count
    anchor, periods,
    // unlisted groups are sent without id and name: they only add to the numbers
    groups: [...groupById.values()].filter(g => g.members > 0).map(({ unlisted, ...g }) => {
      if (unlisted) { delete g.id; delete g.name; g.anon = true; }
      if (!clueGains) delete g.clueGain;
      return g;
    }),
    buckets: Object.values(buckets),
    // every player who gained XP this year (names only from listed groups)
    players: players.filter(p => (playerGain.year.get(p.id) ?? 0) > 0 && !groupById.get(p.group_id).unlisted)
      .map(p => ({ ...tag(p.id), week: playerGain.week.get(p.id) ?? 0, month: playerGain.month.get(p.id) ?? 0, year: playerGain.year.get(p.id) })),
    milestones: milestoneRows.filter(r => !groupOf(r.player_id).unlisted).slice(0, RECENT_MAX)
      .map(r => ({ ...tag(r.player_id), skill: r.skill, level: r.level, at: r.achieved_at })),
    drops: dropRows.filter(r => !groupOf(r.player_id).unlisted).slice(0, RECENT_MAX)
      .map(r => ({ ...tag(r.player_id), item: r.item_name, at: r.dropped_at })),
    // clue scrolls per player and tier, kept short because there is a row for nearly every player:
    // g = group id and r = name (listed groups) or ty / sz = mode and size (unlisted groups, no names);
    // t = completed [easy, medium, hard, elite, master]; w / m / y = gained this week / month / year (2.0 only, when any)
    clues: [...clueNow.entries()].filter(([, t]) => t.some(n => n > 0)).map(([id, t]) => {
      const g = groupOf(id);
      const row = g.unlisted ? { ty: g.type, sz: g.size } : { g: g.id, r: playerById.get(id).rsn };
      row.t = t;
      for (const [k, short] of [['week', 'w'], ['month', 'm'], ['year', 'y']]) { const v = cluePeriod[k].get(id); if (v) row[short] = v; }
      return row;
    }),
  };

  // ── 2.0, the plugin: totals over everyone, never per group, mode, size or player ──
  if (hasTable('progress_log')) {
    const inScope = id => playerById.has(id);
    const liveRows = db.prepare('SELECT player_id, updated_at FROM player_live_state').all().filter(r => inScope(r.player_id));
    const connected = new Set(db.prepare('SELECT DISTINCT player_id FROM plugin_tokens WHERE revoked = 0').all()
      .map(r => r.player_id).filter(inScope));
    for (const r of liveRows) connected.add(r.player_id);
    const nowMs = Date.now();
    const sumFrom = (sql, cut) => db.prepare(sql).all(cut).filter(r => inScope(r.player_id)).reduce((s, r) => s + (r.n ?? 0), 0);
    const pluginPeriod = cut => ({
      bossKills: sumFrom(`SELECT player_id, SUM(gain) n FROM progress_log WHERE kind = 'boss' AND at >= ? GROUP BY player_id`, cut),
      clues: sumFrom(`SELECT player_id, SUM(gain) n FROM progress_log WHERE kind = 'clue' AND at >= ? GROUP BY player_id`, cut),
      drops: sumFrom(`SELECT player_id, COUNT(*) n FROM drops WHERE source = 'plugin' AND dropped_at >= ? GROUP BY player_id`, cut),
      dropValue: sumFrom(`SELECT player_id, SUM(COALESCE(value_gp, 0) * COALESCE(quantity, 1)) n FROM drops WHERE source = 'plugin' AND dropped_at >= ? GROUP BY player_id`, cut),
      achievements: sumFrom(`SELECT player_id, COUNT(*) n FROM player_achievements WHERE completed_at >= ? GROUP BY player_id`, cut),
    });
    out.plugin = {
      connectedPlayers: connected.size,
      groupsUsing: new Set([...connected].map(id => playerById.get(id).group_id)).size,
      onlineNow: liveRows.filter(r => nowMs - Date.parse(r.updated_at) < ONLINE_MS).length,
      week: pluginPeriod(periods.week),
      month: pluginPeriod(periods.month),
      year: pluginPeriod(periods.year),
    };
  }
  return out;
}

function globalStats() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const value = build();
  cache = { at: Date.now(), value };
  return value;
}

module.exports = { globalStats, _build: build, _clearCache: () => { cache = null; } };
