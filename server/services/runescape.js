// RS3 Hiscores CSV + RuneMetrics API integration

const SKILLS = [
  'Overall', 'Attack', 'Defence', 'Strength', 'Constitution', 'Ranged',
  'Prayer', 'Magic', 'Cooking', 'Woodcutting', 'Fletching', 'Fishing',
  'Firemaking', 'Crafting', 'Smithing', 'Mining', 'Herblore', 'Agility',
  'Thieving', 'Slayer', 'Farming', 'Runecrafting', 'Hunter', 'Construction',
  'Summoning', 'Dungeoneering', 'Divination', 'Invention', 'Archaeology',
  'Necromancy',
];

// Post-skill activity rows in the RS3 hiscores CSV (indices 30–60).
// Order matches the RS3 hiscores lite endpoint exactly.
// Note: RS3 does NOT have a "Clue Scrolls All" row — only the 5 tiers.
const ACTIVITIES = [
  'Bounty Hunter Hunter',                  // 30
  'Bounty Hunter Rogues',                  // 31
  'Dominion Tower',                        // 32
  'The Crucible',                          // 33
  'Castle Wars Games',                     // 34
  'B.A. Attackers',                        // 35
  'B.A. Defenders',                        // 36
  'B.A. Collectors',                       // 37
  'B.A. Healers',                          // 38
  'Duel Tournament',                       // 39
  'Mobilising Armies',                     // 40
  'Conquest',                              // 41
  'Fist of Guthix',                        // 42
  'GG: Athletics',                         // 43
  'GG: Resource Race',                     // 44
  'WE2: Armadyl Lifetime Contribution',    // 45
  'WE2: Bandos Lifetime Contribution',     // 46
  'WE2: Armadyl PvP Kills',               // 47
  'WE2: Bandos PvP Kills',                // 48
  'Heist Guard Level',                     // 49
  'Heist Robber Level',                    // 50
  'CFP: 5 Game Average',                   // 51
  'AF15: Cow Tipping',                     // 52
  'AF15: Rats Killed After the Miniquest', // 53
  'RuneScore',                             // 54
  'Clue Scrolls Easy',                     // 55
  'Clue Scrolls Medium',                   // 56
  'Clue Scrolls Hard',                     // 57
  'Clue Scrolls Elite',                    // 58
  'Clue Scrolls Master',                   // 59
];

// Boss kill-count rows in the RS3 hiscores CSV (indices 41+).
// Note: exact ordering may vary between Jagex updates — values will be null if
// an index is missing. Compare synced data with the RS3 hiscores site to verify.
const BOSS_KILLS = [
  'Corporeal Beast',
  'General Graardor',
  "K'ril Tsutsaroth",
  'Commander Zilyana',
  "Kree'arra",
  'Dagannoth Kings',
  'Kalphite Queen',
  'Nex',
  'TzTok-Jad',
  'TzKal-Zuk',
  'Kalphite King',
  'Vorago',
  'Araxxi',
  'Nex: Angel of Death',
  'Telos, the Warden',
  'Solak',
  'Helwyr',
  'Vindicta',
  'Gregorovic',
  'Twin Furies',
  'Rasial, the First Necromancer',
  'Zamorak, Lord of Erebus',
];

const HISCORES_URL = 'https://secure.runescape.com/m=hiscore/index_lite.ws';
const RUNEMETRICS_URL = 'https://apps.runescape.com/runemetrics/profile/profile';

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
  // RS3 hiscores runs on old Jagex infrastructure that expects application/x-www-form-urlencoded
  // query strings — i.e. spaces must be '+', not '%20'.  Using URLSearchParams gives us that
  // automatically and is the correct encoding for query parameters on this endpoint.
  const url = `${HISCORES_URL}?${new URLSearchParams({ player: cleanRSN })}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'RS3-GIM-Companion/1.0' },
    signal: AbortSignal.timeout(10000),
  });

  if (response.status === 404) throw new Error(`Player "${cleanRSN}" not found on hiscores`);
  if (!response.ok) throw new Error(`Hiscores API returned ${response.status}`);

  const text = await response.text();
  return parseHiscores(text);
}

function parseHiscores(csv) {
  const lines = csv.trim().split('\n');
  const result = { skills: {}, activities: {}, bossKills: {}, totalXp: 0, totalLevel: 0 };

  for (let i = 0; i < SKILLS.length && i < lines.length; i++) {
    const parts = lines[i].trim().split(',');
    if (parts.length < 3) continue;

    const rank  = parseInt(parts[0], 10);
    const level = parseInt(parts[1], 10);
    const xp    = parseInt(parts[2], 10);
    const name  = SKILLS[i];

    result.skills[name] = { rank: rank < 0 ? null : rank, level, xp };

    if (i === 0) {
      result.totalXp    = xp    > 0 ? xp    : 0;
      result.totalLevel = level > 0 ? level : 0;
    }
  }

  // Activities / minigames (indices 30–40, format: rank,score)
  for (let i = 0; i < ACTIVITIES.length; i++) {
    const csvIdx = SKILLS.length + i;
    if (csvIdx >= lines.length) break;
    const parts = lines[csvIdx].trim().split(',');
    if (parts.length < 2) continue;
    const score = parseInt(parts[1], 10);
    if (score >= 0) result.activities[ACTIVITIES[i]] = score;
  }

  // Boss kill counts (indices 41+, format: rank,kills)
  for (let i = 0; i < BOSS_KILLS.length; i++) {
    const csvIdx = SKILLS.length + ACTIVITIES.length + i;
    if (csvIdx >= lines.length) break;
    const parts = lines[csvIdx].trim().split(',');
    if (parts.length < 2) continue;
    const kills = parseInt(parts[1], 10);
    if (kills >= 0) result.bossKills[BOSS_KILLS[i]] = kills;
  }

  return result;
}

async function fetchRuneMetrics(rsn, activityCount = 20) {
  const cleanRSN = sanitizeRSN(rsn);
  // Same + encoding requirement as the hiscores endpoint.
  const url = `${RUNEMETRICS_URL}?${new URLSearchParams({ user: cleanRSN, activities: activityCount })}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'RS3-GIM-Companion/1.0' },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) throw new Error(`RuneMetrics returned ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(data.error);

  return {
    // 'name' is the canonical RS3 display name — useful for normalising stored RSNs
    name: typeof data.name === 'string' ? data.name.trim() : null,
    questsComplete: data.questscomplete ?? 0,
    questsStarted: data.questsstarted ?? 0,
    activities: (data.activities || []).map(a => ({
      date: a.date,
      text: a.text,
      details: a.details,
    })),
  };
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

  const base = 0.25 * (def + con + Math.floor(pray / 2) + Math.floor(sum / 2));
  const melee = 0.325 * (atk + str);
  const range = 0.325 * (Math.floor(ran * 1.5));
  const mage = 0.325 * (Math.floor(mag * 1.5));
  const necro = 0.325 * (Math.floor(nec * 2));

  return Math.floor(base + Math.max(melee, range, mage, necro));
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

module.exports = { fetchHiscores, fetchRuneMetrics, calcCombatLevel, generateSuggestedGoals, sanitizeRSN, SKILLS, BOSS_KILLS };
