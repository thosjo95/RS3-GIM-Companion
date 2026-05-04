// RS3 Hiscores CSV parser
// Endpoint: https://secure.runescape.com/m=hiscore/index_lite.ws?player=NAME

const SKILLS = [
  'Overall', 'Attack', 'Defence', 'Strength', 'Constitution', 'Ranged',
  'Prayer', 'Magic', 'Cooking', 'Woodcutting', 'Fletching', 'Fishing',
  'Firemaking', 'Crafting', 'Smithing', 'Mining', 'Herblore', 'Agility',
  'Thieving', 'Slayer', 'Farming', 'Runecrafting', 'Hunter', 'Construction',
  'Summoning', 'Dungeoneering', 'Divination', 'Invention', 'Archaeology',
  'Necromancy',
];

const HISCORES_URL = 'https://secure.runescape.com/m=hiscore/index_lite.ws';

async function fetchHiscores(rsn) {
  const url = `${HISCORES_URL}?player=${encodeURIComponent(rsn)}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'RS3-GIM-Companion/1.0' },
    signal: AbortSignal.timeout(10000),
  });

  if (response.status === 404) throw new Error(`Player "${rsn}" not found on hiscores`);
  if (!response.ok) throw new Error(`Hiscores API returned ${response.status}`);

  const text = await response.text();
  return parseHiscores(text);
}

function parseHiscores(csv) {
  const lines = csv.trim().split('\n');
  const result = { skills: {}, totalXp: 0, totalLevel: 0 };

  for (let i = 0; i < SKILLS.length && i < lines.length; i++) {
    const parts = lines[i].trim().split(',');
    if (parts.length < 3) continue;

    const rank = parseInt(parts[0], 10);
    const level = parseInt(parts[1], 10);
    const xp = parseInt(parts[2], 10);
    const name = SKILLS[i];

    result.skills[name] = { rank: rank < 0 ? null : rank, level, xp };

    if (i > 0) {
      // Exclude Overall from per-skill totals (it's pre-computed)
      result.totalXp = result.skills['Overall']?.xp ?? 0;
      result.totalLevel = result.skills['Overall']?.level ?? 0;
    }
  }

  return result;
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

  // Aggregate skill averages
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

  // Low Herblore → overloads
  if (avgLevels['Herblore'] < 96) {
    suggestions.push({
      title: 'Push Herblore toward overloads',
      description: `Group avg Herblore: ${avgLevels['Herblore'] ?? '?'}. Overloads require level 96.`,
      skill: 'Herblore',
      target_value: 96,
      category: 'skill',
      priority: 'high',
    });
  }

  // No Invention
  if ((avgLevels['Invention'] ?? 1) < 80) {
    suggestions.push({
      title: 'Unlock Invention',
      description: 'Invention requires level 80 Attack, Defence, and Smithing. Essential for perks.',
      skill: 'Invention',
      target_value: 80,
      category: 'skill',
      priority: 'high',
    });
  }

  // Low Agility (Prifddinas)
  if ((avgLevels['Agility'] ?? 1) < 75) {
    suggestions.push({
      title: 'Train Agility for Plague\'s End',
      description: `Group avg Agility: ${avgLevels['Agility'] ?? '?'}. Prifddinas requires 75 Agility.`,
      skill: 'Agility',
      target_value: 75,
      category: 'skill',
      priority: 'medium',
    });
  }

  // Low Slayer
  if ((avgLevels['Slayer'] ?? 1) < 85) {
    suggestions.push({
      title: 'Develop a Slayer specialist',
      description: `Group avg Slayer: ${avgLevels['Slayer'] ?? '?'}. High Slayer enables boss unlocks and rare drops.`,
      skill: 'Slayer',
      target_value: 85,
      category: 'skill',
      priority: 'medium',
    });
  }

  // Low Dungeoneering
  if ((avgLevels['Dungeoneering'] ?? 1) < 80) {
    suggestions.push({
      title: 'Level Dungeoneering for Daemonheim rewards',
      description: `Group avg Dungeoneering: ${avgLevels['Dungeoneering'] ?? '?'}. Level 80+ unlocks key ring and scroll upgrades.`,
      skill: 'Dungeoneering',
      target_value: 80,
      category: 'skill',
      priority: 'medium',
    });
  }

  // Low Summoning
  if ((avgLevels['Summoning'] ?? 1) < 67) {
    suggestions.push({
      title: 'Train Summoning for yak and unicorn',
      description: `Group avg Summoning: ${avgLevels['Summoning'] ?? '?'}. Unicorn stallion (88) and pack yak (96) are PvM staples.`,
      skill: 'Summoning',
      target_value: 67,
      category: 'skill',
      priority: 'medium',
    });
  }

  // Prifddinas group goal
  suggestions.push({
    title: 'Unlock Prifddinas (group)',
    description: 'Complete Plague\'s End. Requires: 75 each of Agility, Construction, Crafting, Dungeoneering, Herblore, Mining, Prayer, Ranged, Smithing, Summoning, Woodcutting.',
    category: 'quest',
    priority: 'high',
    type: 'group',
  });

  return suggestions;
}

module.exports = { fetchHiscores, calcCombatLevel, generateSuggestedGoals, SKILLS };
