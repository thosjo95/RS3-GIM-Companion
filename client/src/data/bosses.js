// RS3 boss definitions: hard entry requirements + recommended combat levels + notable drops
// requirements = MUST meet to even enter/attempt (hard gate)
// recommended  = what makes it comfortable (used for green vs orange)

export const BOSSES = {
  'Giant Mole': {
    tier: 1,
    location: 'Falador Park',
    requirements: {},
    recommended: { Attack: 50, Defence: 50 },
    drops: ['Mole skin', 'Mole claw', 'Mole nose'],
  },
  'King Black Dragon': {
    tier: 1,
    location: 'Wilderness Dungeon',
    requirements: {},
    recommended: { Attack: 65, Defence: 65, Prayer: 43 },
    drops: ['Dragon longsword', 'Dragon platelegs', 'Dragon plateskirt', 'KBD heads', 'Draconic visage'],
  },
  'Barrows': {
    tier: 2,
    location: 'Barrows',
    requirements: {},
    recommended: { Magic: 70, Prayer: 43 },
    drops: ["Ahrim's set", "Dharok's set", "Guthan's set", "Karil's set", "Torag's set", "Verac's set"],
  },
  'Chaos Elemental': {
    tier: 2,
    location: 'Wilderness',
    requirements: {},
    recommended: { Attack: 75, Defence: 75 },
    drops: ['Dragon pickaxe', 'Dragon 2h sword', 'Chaos element'],
  },
  'Dagannoth Kings': {
    tier: 2,
    location: 'Waterbirth Island',
    requirements: {},
    recommended: { Attack: 80, Ranged: 80, Magic: 80, Prayer: 70 },
    drops: ['Berserker ring', 'Archer ring', "Seers' ring", 'Warrior ring', 'Dagannoth ring', 'Dragon axe'],
    note: 'Recommended to bring all three combat styles',
  },
  'Kalphite Queen': {
    tier: 2,
    location: 'Kalphite Lair',
    requirements: {},
    recommended: { Attack: 80, Strength: 80, Defence: 80, Prayer: 70 },
    drops: ['Dragon chainbody', 'Dragon 2h sword', 'Kalphite Queen head'],
  },
  'Corporeal Beast': {
    tier: 3,
    location: 'Wilderness',
    requirements: {},
    recommended: { Attack: 90, Strength: 90, Defence: 90, Magic: 90 },
    drops: ['Elysian spirit shield', 'Arcane spirit shield', 'Spectral spirit shield', 'Holy elixir', 'Corporeal beast pet'],
    note: 'Magic damage dealt at 50% — use Melee or specific Magic spells',
  },
  'General Graardor': {
    tier: 3,
    location: 'God Wars Dungeon',
    requirements: { Strength: 70 },
    recommended: { Attack: 80, Strength: 80, Defence: 80, Prayer: 70 },
    drops: ['Bandos chestplate', 'Bandos tassets', 'Bandos boots', 'Bandos hilt', 'Godsword shard'],
    note: 'Requires 70 Strength or Agility to enter GWD',
  },
  "Commander Zilyana": {
    tier: 3,
    location: 'God Wars Dungeon',
    requirements: { Agility: 70 },
    recommended: { Magic: 80, Prayer: 70, Defence: 80 },
    drops: ['Saradomin sword', 'Armadyl crossbow', 'Saradomin hilt', 'Godsword shard'],
    note: 'Requires 70 Agility to enter GWD',
  },
  "Kree'arra": {
    tier: 3,
    location: 'God Wars Dungeon',
    requirements: { Agility: 70 },
    recommended: { Ranged: 80, Defence: 80, Prayer: 70 },
    drops: ['Armadyl chestplate', 'Armadyl chainskirt', 'Armadyl helmet', 'Armadyl hilt', 'Godsword shard'],
    note: 'Requires 70 Agility to enter GWD',
  },
  "K'ril Tsutsaroth": {
    tier: 3,
    location: 'God Wars Dungeon',
    requirements: { Agility: 70 },
    recommended: { Magic: 80, Prayer: 70, Defence: 80 },
    drops: ['Zamorakian spear', 'Steam battlestaff', 'Zamorak hilt', 'Godsword shard'],
    note: 'Requires 70 Agility or Strength to enter GWD',
  },
  'Glacors': {
    tier: 4,
    location: 'Glacor Cave',
    requirements: { Magic: 80 },
    recommended: { Magic: 90, Defence: 90, Prayer: 70 },
    drops: ['Steadfast boots', 'Glaiven boots', 'Ragefire boots', 'Armadyl rune'],
    note: 'Requires completion of Ritual of the Mahjarrat',
  },
  'Queen Black Dragon': {
    tier: 3,
    location: "Grotworms' Lair",
    requirements: {},
    recommended: { Attack: 80, Defence: 80, Magic: 80 },
    drops: ['Royal crossbow part', 'Dragonbone upgrade kit', 'QBD pet'],
    note: "Requires The World Wakes quest",
  },
  'Nex': {
    tier: 4,
    location: 'Ancient Prison (GWD)',
    requirements: { Agility: 70, Prayer: 92 },
    recommended: { Attack: 90, Ranged: 90, Magic: 90, Defence: 90, Prayer: 92 },
    drops: ['Torva full helm', 'Torva platebody', 'Torva platelegs', 'Pernix cowl', 'Pernix body', 'Pernix chaps', 'Virtus mask', 'Virtus robe top', 'Virtus robe legs', 'Zaryte bow'],
    note: 'Requires The Temple at Senntisten quest and 40 kill count',
  },
  'Rex Matriarchs': {
    tier: 4,
    location: 'Anachronia',
    requirements: { Slayer: 60 },
    recommended: { Attack: 85, Ranged: 85, Magic: 85, Agility: 78 },
    drops: ['Omni talisman staff', 'Magma tempest scroll', 'Injected cave nightshade', 'Rex matriarch pet'],
    note: '60 Slayer to access. 78 Agility for full Anachronia shortcut access',
  },
  'Legiones': {
    tier: 4,
    location: 'Monastery of Ascension',
    requirements: { Slayer: 81, Ranged: 80 },
    recommended: { Ranged: 90, Defence: 90, Prayer: 70 },
    drops: ['Ascension crossbow', 'Ascension keystone', 'Karil parts'],
  },
  'Twin Furies': {
    tier: 4,
    location: 'Heart of Gielinor (GWD2)',
    requirements: {},
    recommended: { Attack: 90, Strength: 90, Defence: 90 },
    drops: ['Crest of Zamorak', 'Blade of Zamorak', 'Godsword shard'],
    note: 'Requires 80 Zamorak reputation to access',
  },
  'Vindicta': {
    tier: 4,
    location: 'Heart of Gielinor (GWD2)',
    requirements: {},
    recommended: { Attack: 90, Strength: 90, Defence: 90 },
    drops: ['Crest of Zaros', 'Blade of Zaros', 'Godsword shard'],
    note: 'Requires 80 Zaros reputation to access',
  },
  'Helwyr': {
    tier: 4,
    location: 'Heart of Gielinor (GWD2)',
    requirements: {},
    recommended: { Magic: 90, Defence: 90 },
    drops: ['Crest of Seren', 'Blade of Seren', 'Godsword shard'],
    note: 'Requires 80 Seren reputation to access',
  },
  'Gregorovic': {
    tier: 4,
    location: 'Heart of Gielinor (GWD2)',
    requirements: {},
    recommended: { Ranged: 90, Defence: 90 },
    drops: ['Crest of Sliske', 'Blade of Sliske', 'Godsword shard'],
    note: 'Requires 80 Sliske reputation to access',
  },
  'Araxxor / Araxxi': {
    tier: 5,
    location: 'Araxyte Lair',
    requirements: { Slayer: 92 },
    recommended: { Attack: 90, Ranged: 90, Magic: 90, Defence: 90 },
    drops: ['Noxious scythe', 'Noxious longbow', 'Noxious staff', "Araxxi's web", "Araxxi's fang", "Araxxi's eye", "Araxxi's leg"],
    note: '92 Slayer required. High accuracy and damage reduction mechanics',
  },
  'Telos': {
    tier: 6,
    location: 'The Pit',
    requirements: { Herblore: 96 },
    recommended: { Attack: 95, Strength: 95, Ranged: 95, Magic: 95, Defence: 95, Herblore: 96, Prayer: 95 },
    drops: ['Dormant Anima Core helm', 'Dormant Anima Core body', 'Dormant Anima Core legs', 'Seren godbow', 'Staff of Sliske', 'Zaros godsword'],
    note: 'Requires Fate of the Gods. Enrage scales from 0–4000%+',
  },
  'Vorago': {
    tier: 6,
    location: 'Borehole',
    requirements: {},
    recommended: { Magic: 95, Ranged: 95, Attack: 95, Defence: 95, Constitution: 99 },
    drops: ['Seismic wand', 'Seismic singularity', 'Tectonic energy', 'Mazcab ability codex'],
  },
  'Solak': {
    tier: 6,
    location: 'The Grove',
    requirements: {},
    recommended: { Attack: 99, Ranged: 99, Magic: 99, Defence: 99, Herblore: 99 },
    drops: ['Blightbound crossbows', "Erethdor's grimoire", 'Solak pet'],
    note: 'Very high-end raid boss — requires experienced team',
  },
  'Osseous Rex': {
    tier: 5,
    location: 'Anachronia',
    requirements: { Slayer: 96 },
    recommended: { Attack: 90, Strength: 90, Defence: 90 },
    drops: ['Rex bones', 'Venomous fangs', 'Osseous dust', 'Osseous Rex pet'],
  },
};

// Tier labels for display
export const TIER_LABELS = {
  1: 'Entry',
  2: 'Mid-game',
  3: 'High-game',
  4: 'End-game',
  5: 'Elite',
  6: 'Raid',
};

export const BOSS_NAMES = Object.keys(BOSSES).sort();

// Returns { status: 'green'|'orange'|'red', eligible: [rsn], closest: rsn }
// green  = at least one player meets all hard requirements AND recommended levels
// orange = at least one player meets hard requirements OR is within 15 levels of hard requirements
// red    = nobody is close
export function getBossStatus(bossName, players) {
  const boss = BOSSES[bossName];
  if (!boss) return { status: 'unknown', eligible: [], closest: null };

  const reqs = boss.requirements || {};
  const rec = boss.recommended || {};
  const eligible = [];
  let bestPlayer = null;
  let bestShortfall = Infinity;

  for (const player of players) {
    const skillMap = Object.fromEntries(
      (player.skills || []).map(s => [s.skill_name, s.level ?? 1])
    );

    // Check hard requirements
    let hardOk = true;
    let maxHardShortfall = 0;
    for (const [skill, need] of Object.entries(reqs)) {
      const have = skillMap[skill] ?? 1;
      const shortfall = need - have;
      if (shortfall > 0) { hardOk = false; maxHardShortfall = Math.max(maxHardShortfall, shortfall); }
    }

    if (hardOk) {
      eligible.push(player.rsn);
      // Check recommended
      let maxRecShortfall = 0;
      for (const [skill, need] of Object.entries(rec)) {
        const have = skillMap[skill] ?? 1;
        maxRecShortfall = Math.max(maxRecShortfall, need - have);
      }
      if (maxRecShortfall <= 0 && bestShortfall > 0) { bestShortfall = 0; bestPlayer = player.rsn; }
      else if (maxRecShortfall < bestShortfall) { bestShortfall = maxRecShortfall; bestPlayer = player.rsn; }
    } else {
      if (maxHardShortfall < bestShortfall) { bestShortfall = maxHardShortfall; bestPlayer = player.rsn; }
    }
  }

  let status;
  if (eligible.length > 0 && bestShortfall <= 0) status = 'green';
  else if (eligible.length > 0 || bestShortfall <= 15) status = 'orange';
  else status = 'red';

  return { status, eligible, closest: eligible.length > 0 ? null : bestPlayer, shortfall: bestShortfall };
}
