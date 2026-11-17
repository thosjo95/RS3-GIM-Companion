// RS3 Hiscores CSV + RuneMetrics API integration

const SKILLS = [
  'Overall', 'Attack', 'Defence', 'Strength', 'Constitution', 'Ranged',
  'Prayer', 'Magic', 'Cooking', 'Woodcutting', 'Fletching', 'Fishing',
  'Firemaking', 'Crafting', 'Smithing', 'Mining', 'Herblore', 'Agility',
  'Thieving', 'Slayer', 'Farming', 'Runecrafting', 'Hunter', 'Construction',
  'Summoning', 'Dungeoneering', 'Divination', 'Invention', 'Archaeology',
  'Necromancy',
];

// ── Jagex Platform API (https://developer.runescape.com/platform/) ─────────────
// RuneMetrics (apps.runescape.com/runemetrics/*) was switched off on 10 Nov 2026.
//   hiscores       → index_lite.json          (named skills + activities)
//   quests, skills → adventurers-log playerData
//   activity feed  → adventurers-log playerEvents (20 most recent events)
// Best practices from the docs: descriptive User-Agent, cache, don't hammer.
const UA = 'RS3-GIM-Companion (groupiron.com; github.com/thosjo95/RS3-GIM-Companion)';
const HISCORES_URL = 'https://secure.runescape.com/m=hiscore/index_lite.json';
const ALOG_URL     = 'https://secure.runescape.com/m=adventurers-log/api/v1';

// API names that differ from the names used everywhere else in this app.
const HISCORE_SKILL_NAME = { Hitpoints: 'Constitution', Runecraft: 'Runecrafting' };
const ALOG_SKILL_NAME    = {
  attack: 'Attack', defence: 'Defence', strength: 'Strength', hitpoints: 'Constitution', ranged: 'Ranged',
  prayer: 'Prayer', magic: 'Magic', cooking: 'Cooking', woodcutting: 'Woodcutting', fletching: 'Fletching',
  fishing: 'Fishing', firemaking: 'Firemaking', crafting: 'Crafting', smithing: 'Smithing', mining: 'Mining',
  herblore: 'Herblore', agility: 'Agility', thieving: 'Thieving', slayer: 'Slayer', farming: 'Farming',
  runecraft: 'Runecrafting', hunter: 'Hunter', construction: 'Construction', summoning: 'Summoning',
  dungeoneering: 'Dungeoneering', divination: 'Divination', invention: 'Invention',
  archaeology: 'Archaeology', necromancy: 'Necromancy',
};
// Keep the activity keys the rest of the app (clue leaderboard, RuneScore) already reads.
const HISCORE_ACTIVITY_NAME = {
  'Clue Scrolls (easy)':   'Clue Scrolls Easy',
  'Clue Scrolls (medium)': 'Clue Scrolls Medium',
  'Clue Scrolls (hard)':   'Clue Scrolls Hard',
  'Clue Scrolls (elite)':  'Clue Scrolls Elite',
  'Clue Scrolls (master)': 'Clue Scrolls Master',
};

async function apiGet(url, timeoutMs = 10000) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  let body = null;
  try { body = await res.json(); } catch { /* error pages are HTML */ }
  return { status: res.status, body };
}

/**
 * Sanitize an RSN before sending it to Jagex APIs.
 * RS3 names only allow letters, digits, spaces and hyphens.
 * Replace any non-breaking spaces, Unicode replacement chars, or other
 * non-printable/non-ASCII characters with a regular space, then trim.
 */
function sanitizeRSN(rsn) {
  return rsn
    .replace(/ /g, ' ')        // non-breaking space (common copy-paste artifact)
    .replace(/�/g, ' ')        // Unicode replacement character
    .replace(/[^\x20-\x7E]/g, ' ')  // any other non-printable or non-ASCII
    .replace(/\s+/g, ' ')           // collapse multiple spaces
    .trim();
}

async function fetchHiscores(rsn) {
  const cleanRSN = sanitizeRSN(rsn);
  const { status, body } = await apiGet(`${HISCORES_URL}?${new URLSearchParams({ player: cleanRSN })}`);

  if (status === 404) {
    // Not on the hiscores (private / unranked) — the Adventurer's Log still has levels and XP.
    console.log(`[sync] ${cleanRSN}: not on hiscores, falling back to Adventurer's Log`);
    return fetchSkillsFromPlayerData(cleanRSN);
  }
  if (status !== 200 || !body) throw new Error(`Hiscores API returned ${status}`);
  return parseHiscores(body);
}

/** Skills-only fallback in the same shape as parseHiscores(), for players missing from the hiscores. */
async function fetchSkillsFromPlayerData(cleanRSN) {
  const { status, body } = await apiGet(`${ALOG_URL}/playerData/${encodeURIComponent(cleanRSN)}?includeSkills=true`);
  if (status === 404) throw new Error(`"${cleanRSN}" not found on hiscores`);
  if (status !== 200 || !body?.skills) throw new Error(`Adventurer's Log returned ${status} for "${cleanRSN}"`);

  const result = { skills: {}, activities: {}, totalXp: 0, totalLevel: 0, privateHiscores: true };
  for (const [key, s] of Object.entries(body.skills)) {
    const name = ALOG_SKILL_NAME[key];
    if (!name) continue;
    result.skills[name] = { rank: null, level: s.level ?? 1, xp: Math.floor((s.fine_xp ?? 0) / 10) };
  }
  const totalLevel = Object.values(result.skills).reduce((n, s) => n + (s.level ?? 1), 0);
  const totalXp    = Object.values(result.skills).reduce((n, s) => n + (s.xp ?? 0), 0);
  result.skills['Overall'] = { rank: null, level: totalLevel, xp: totalXp };
  result.totalLevel = totalLevel;
  result.totalXp    = totalXp;
  return result;
}

function parseHiscores(json) {
  const result = { skills: {}, activities: {}, totalXp: 0, totalLevel: 0 };

  for (const s of json.skills ?? []) {
    const name = HISCORE_SKILL_NAME[s.name] ?? s.name;
    // level/xp are -1 on some old records ("no data")
    result.skills[name] = {
      rank:  s.rank < 0 ? null : s.rank,
      level: s.level < 0 ? 1 : s.level,
      xp:    s.xp    < 0 ? 0 : s.xp,
    };
    if (name === 'Overall') {
      result.totalXp    = s.xp    > 0 ? s.xp    : 0;
      result.totalLevel = s.level > 0 ? s.level : 0;
    }
  }

  // Activities are identified by NAME — ids aren't stable. Note the hiscores have no
  // boss kill counts: only minigames, clues, RuneScore and Leagues.
  for (const a of json.activities ?? []) {
    if (a.score >= 0) result.activities[HISCORE_ACTIVITY_NAME[a.name] ?? a.name] = a.score;
  }
  return result;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
/** ISO 8601 → the "DD-Mon-YYYY HH:mm" (UTC) format the rest of the app stores and parses. */
function isoToActivityDate(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}-${MONTHS[d.getUTCMonth()]}-${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/**
 * Most recent Adventurer's Log events (the API returns the latest 20, newest first).
 * Returns { name, activities: [{ date, text, details, type }] }. Kill and level-up
 * events are batched by the game, e.g. "I killed 17 Hermods." is one event.
 */
async function fetchPlayerEvents(rsn) {
  const cleanRSN = sanitizeRSN(rsn);
  const { status, body } = await apiGet(`${ALOG_URL}/playerEvents/${encodeURIComponent(cleanRSN)}`);
  if (status !== 200 || !body) throw new Error(`Adventurer's Log events returned ${status}${body?.error ? ` (${body.error})` : ''}`);
  return {
    name: typeof body.name === 'string' ? body.name.trim() : null,
    activities: (body.events || []).map(e => ({
      date: isoToActivityDate(e.date),
      text: e.text,
      details: e.details,
      type: e.type,
    })),
  };
}

/**
 * Quest list + quest points from the Adventurer's Log player data.
 * Returns { quests: [{ title, status, difficulty, members, questPoints, userEligible }], qp }
 * (same item shape the old RuneMetrics quests API produced). Parent "Multi" nodes
 * (difficulty 250, e.g. Recipe for Disaster) are grouping rows, not real quests.
 */
async function fetchPlayerQuests(rsn) {
  const cleanRSN = sanitizeRSN(rsn);
  const { status, body } = await apiGet(`${ALOG_URL}/playerData/${encodeURIComponent(cleanRSN)}?includeQuests=true`);
  if (status !== 200 || !body?.quests) throw new Error(`Adventurer's Log quests returned ${status}${body?.error ? ` (${body.error})` : ''}`);
  const quests = Object.values(body.quests)
    .filter(q => q.difficulty !== 250)
    .map(q => ({ title: q.title, status: q.status, difficulty: q.difficulty, members: q.members, questPoints: q.qp, userEligible: q.eligible }));
  return { quests, qp: body.qp ?? 0 };
}

function calcCombatLevel(skills) {
  const s = skills;
  if (!s) return 3;
  const atk = s['Attack']?.level ?? 1;
  const def = s['Defence']?.level ?? 1;
  const str = s['Strength']?.level ?? 1;
  const con = s['Constitution']?.level ?? 10;
  const ran = s['Ranged']?.level ?? 1;
  const mag = s['Magic']?.level ?? 1;
  const pray = s['Prayer']?.level ?? 1;
  const sum = s['Summoning']?.level ?? 1;
  const nec = s['Necromancy']?.level ?? 1;

  // Formula per runescape.wiki/w/Combat_level (current, post-Necromancy):
  // floor( (1.3 * max(Att+Str, 2*Mag, 2*Ranged, 2*Necro) + Def + Con + floor(Pray/2) + floor(Summ/2)) / 4 )
  const base = def + con + Math.floor(pray / 2) + Math.floor(sum / 2);
  const styleMax = Math.max(atk + str, 2 * mag, 2 * ran, 2 * nec);

  return Math.floor((1.3 * styleMax + base) / 4);
}

function generateSuggestedGoals(players) {
  const suggestions = [];
  const skillTotals = {};
  const skillCounts = {};

  for (const player of players) {
    if (!player.skills) continue;
    for (const [skill, data] of Object.entries(player.skills)) {
      if (skill === 'Overall') continue;
      skillTotals[skill] = (skillTotals[skill] ?? 0) + (data.level ?? 1);
      skillCounts[skill] = (skillCounts[skill] ?? 0) + 1;
    }
  }

  const avgLevels = {};
  for (const skill of Object.keys(skillTotals)) {
    avgLevels[skill] = Math.round(skillTotals[skill] / skillCounts[skill]);
  }

  if (avgLevels['Herblore'] < 96) {
    suggestions.push({
      title: 'Push Herblore toward overloads',
      description: `Group avg Herblore: ${avgLevels['Herblore'] ?? '?'}. Overloads require level 96.`,
      skill: 'Herblore', target_value: 96, category: 'skill', priority: 'high',
    });
  }
  if ((avgLevels['Invention'] ?? 1) < 80) {
    suggestions.push({
      title: 'Unlock Invention',
      description: 'Invention requires level 80 Attack, Defence, and Smithing. Essential for perks.',
      skill: 'Invention', target_value: 80, category: 'skill', priority: 'high',
    });
  }
  if ((avgLevels['Agility'] ?? 1) < 75) {
    suggestions.push({
      title: 'Train Agility for Plague\'s End',
      description: `Group avg Agility: ${avgLevels['Agility'] ?? '?'}. Prifddinas requires 75 Agility.`,
      skill: 'Agility', target_value: 75, category: 'skill', priority: 'medium',
    });
  }
  if ((avgLevels['Slayer'] ?? 1) < 85) {
    suggestions.push({
      title: 'Develop a Slayer specialist',
      description: `Group avg Slayer: ${avgLevels['Slayer'] ?? '?'}. High Slayer enables boss unlocks and rare drops.`,
      skill: 'Slayer', target_value: 85, category: 'skill', priority: 'medium',
    });
  }
  if ((avgLevels['Dungeoneering'] ?? 1) < 80) {
    suggestions.push({
      title: 'Level Dungeoneering for Daemonheim rewards',
      description: `Group avg Dungeoneering: ${avgLevels['Dungeoneering'] ?? '?'}. Level 80+ unlocks key ring and scroll upgrades.`,
      skill: 'Dungeoneering', target_value: 80, category: 'skill', priority: 'medium',
    });
  }
  if ((avgLevels['Summoning'] ?? 1) < 67) {
    suggestions.push({
      title: 'Train Summoning for yak and unicorn',
      description: `Group avg Summoning: ${avgLevels['Summoning'] ?? '?'}. Pack yak (96) and unicorn stallion (88) are PvM staples.`,
      skill: 'Summoning', target_value: 67, category: 'skill', priority: 'medium',
    });
  }
  suggestions.push({
    title: 'Unlock Prifddinas (group)',
    description: 'Complete Plague\'s End. Requires 75 each of Agility, Construction, Crafting, Dungeoneering, Herblore, Mining, Prayer, Ranged, Smithing, Summoning, Woodcutting.',
    category: 'quest', priority: 'high', type: 'group',
  });

  return suggestions;
}

module.exports = { fetchHiscores, fetchPlayerEvents, fetchPlayerQuests, calcCombatLevel, generateSuggestedGoals, sanitizeRSN, SKILLS };
