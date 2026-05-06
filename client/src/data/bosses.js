// RS3 boss definitions: hard entry requirements + recommended combat levels + notable drops
// requirements = MUST meet to even enter/attempt (hard gate)
// recommended  = what makes it comfortable (used for green vs orange)
// Tier guide: 1=Entry, 2=Mid, 3=High, 4=End, 5=Elite, 6=Raid

export const BOSSES = {

  // ── TIER 1: Entry bosses ────────────────────────────────────────────────────

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
  'TzTok-Jad': {
    tier: 1,
    location: 'TzHaar Fight Cave',
    requirements: {},
    recommended: { Ranged: 75, Prayer: 43, Magic: 70 },
    drops: ['Fire cape', 'Tokkul'],
    note: 'Waves 1–62 must be cleared first. Prayer switching required',
  },

  // ── TIER 2: Mid-game bosses ─────────────────────────────────────────────────

  'Barrows': {
    tier: 2,
    location: 'Barrows',
    requirements: {},
    recommended: { Magic: 70, Prayer: 43 },
    drops: ["Ahrim's hood", "Ahrim's robe top", "Ahrim's robe skirt", "Ahrim's staff",
            "Dharok's helm", "Dharok's platebody", "Dharok's platelegs", "Dharok's greataxe",
            "Guthan's helm", "Guthan's platebody", "Guthan's chainskirt", "Guthan's warspear",
            "Karil's coif", "Karil's top", "Karil's skirt", "Karil's crossbow",
            "Torag's helm", "Torag's platebody", "Torag's platelegs", "Torag's hammers",
            "Verac's helm", "Verac's brassard", "Verac's plateskirt", "Verac's flail"],
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
    note: 'Bring all three combat styles — each king weak to a different one',
  },
  'Kalphite Queen': {
    tier: 2,
    location: 'Kalphite Lair',
    requirements: {},
    recommended: { Attack: 80, Strength: 80, Defence: 80, Prayer: 70 },
    drops: ['Dragon chainbody', 'Dragon 2h sword', 'Kalphite Queen head'],
  },
  'Tormented Demons': {
    tier: 2,
    location: 'Ancient Grim Cavern',
    requirements: {},
    recommended: { Attack: 75, Strength: 75, Ranged: 75, Magic: 75 },
    drops: ['Dragon claws', 'Claws shard'],
    note: 'Requires While Guthix Sleeps to access. Switch combat styles to remove shield',
  },
  'Chaos Giants': {
    tier: 2,
    location: 'Chaos Tunnels',
    requirements: {},
    recommended: { Attack: 70, Strength: 70, Defence: 70 },
    drops: ['Rune items', 'Noted rune bars'],
  },

  // ── TIER 3: High-game bosses ────────────────────────────────────────────────

  'General Graardor': {
    tier: 3,
    location: 'God Wars Dungeon',
    requirements: { Strength: 70 },
    recommended: { Attack: 80, Strength: 80, Defence: 80, Prayer: 70 },
    drops: ['Bandos chestplate', 'Bandos tassets', 'Bandos boots', 'Bandos hilt', 'Godsword shard 1', 'Godsword shard 2', 'Godsword shard 3'],
    note: 'Requires 70 Strength or Agility to enter GWD',
  },
  'Commander Zilyana': {
    tier: 3,
    location: 'God Wars Dungeon',
    requirements: { Agility: 70 },
    recommended: { Magic: 80, Prayer: 70, Defence: 80 },
    drops: ['Saradomin sword', 'Armadyl crossbow', 'Saradomin hilt', 'Godsword shard 1', 'Godsword shard 2', 'Godsword shard 3'],
    note: 'Requires 70 Agility to enter GWD',
  },
  "Kree'arra": {
    tier: 3,
    location: 'God Wars Dungeon',
    requirements: { Agility: 70 },
    recommended: { Ranged: 80, Defence: 80, Prayer: 70 },
    drops: ['Armadyl chestplate', 'Armadyl chainskirt', 'Armadyl helmet', 'Armadyl hilt', 'Godsword shard 1', 'Godsword shard 2', 'Godsword shard 3'],
    note: 'Requires 70 Agility to enter GWD',
  },
  "K'ril Tsutsaroth": {
    tier: 3,
    location: 'God Wars Dungeon',
    requirements: { Agility: 70 },
    recommended: { Magic: 80, Prayer: 70, Defence: 80 },
    drops: ['Zamorakian spear', 'Steam battlestaff', 'Zamorak hilt', 'Godsword shard 1', 'Godsword shard 2', 'Godsword shard 3'],
    note: 'Requires 70 Agility or Strength to enter GWD',
  },
  'Queen Black Dragon': {
    tier: 3,
    location: "Grotworms' Lair",
    requirements: {},
    recommended: { Attack: 80, Defence: 80, Magic: 80 },
    drops: ['Royal crossbow part', 'Dragonbone upgrade kit', 'Scalecrusher (pet)'],
    note: 'Requires The World Wakes quest',
  },
  'Corporeal Beast': {
    tier: 3,
    location: 'Wilderness',
    requirements: {},
    recommended: { Attack: 90, Strength: 90, Defence: 90, Magic: 90 },
    drops: ['Elysian spirit shield', 'Arcane spirit shield', 'Spectral spirit shield', 'Holy elixir'],
    note: 'Magic damage dealt at 50% — use Melee or specific Magic spells',
  },
  'Har-Aken': {
    tier: 3,
    location: 'TzHaar Fight Kiln',
    requirements: { Firemaking: 80 },
    recommended: { Magic: 80, Ranged: 80, Attack: 80, Prayer: 70 },
    drops: ['TokHaar-Kal-Ket', 'TokHaar-Kal-Mej', 'TokHaar-Kal-Xil'],
    note: 'Requires The Elder Kiln quest. Final boss of the Fight Kiln',
  },

  // ── TIER 4: End-game bosses ─────────────────────────────────────────────────

  'Kalphite King': {
    tier: 4,
    location: 'Exiled Kalphite Hive',
    requirements: {},
    recommended: { Attack: 90, Strength: 90, Magic: 90, Ranged: 90, Defence: 90 },
    drops: ['Drygore longsword', 'Drygore rapier', 'Drygore mace',
            'Off-hand drygore longsword', 'Off-hand drygore rapier', 'Off-hand drygore mace'],
    note: 'Switch combat styles when shield is active. Protect from the style he uses',
  },
  'Nex': {
    tier: 4,
    location: 'Ancient Prison (GWD)',
    requirements: { Agility: 70, Prayer: 92 },
    recommended: { Attack: 90, Ranged: 90, Magic: 90, Defence: 90, Prayer: 92 },
    drops: ['Torva full helm', 'Torva platebody', 'Torva platelegs',
            'Pernix cowl', 'Pernix body', 'Pernix chaps',
            'Virtus mask', 'Virtus robe top', 'Virtus robe legs', 'Zaryte bow'],
    note: 'Requires The Temple at Senntisten quest and 40 kill count',
  },
  'Glacors': {
    tier: 4,
    location: 'Glacor Cave',
    requirements: { Magic: 80 },
    recommended: { Magic: 90, Defence: 90, Prayer: 70 },
    drops: ['Steadfast boots', 'Glaiven boots', 'Ragefire boots', 'Armadyl rune'],
    note: 'Requires completion of Ritual of the Mahjarrat',
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
    drops: ['Ascension crossbow', 'Off-hand ascension crossbow',
            'Ascension keystone primus', 'Ascension keystone secundus',
            'Ascension keystone tertius', 'Ascension keystone quartus',
            'Ascension keystone quintus', 'Ascension keystone sextus'],
  },
  'Twin Furies': {
    tier: 4,
    location: 'Heart of Gielinor (GWD2)',
    requirements: {},
    recommended: { Attack: 90, Strength: 90, Defence: 90 },
    drops: ['Crest of Zamorak', 'Blade of Zamorak', 'Godsword shard 1', 'Godsword shard 2', 'Godsword shard 3'],
    note: 'Requires 80 Zamorak reputation to access',
  },
  'Vindicta': {
    tier: 4,
    location: 'Heart of Gielinor (GWD2)',
    requirements: {},
    recommended: { Attack: 90, Strength: 90, Defence: 90 },
    drops: ['Crest of Zaros', 'Blade of Zaros', 'Godsword shard 1', 'Godsword shard 2', 'Godsword shard 3'],
    note: 'Requires 80 Zaros reputation to access',
  },
  'Helwyr': {
    tier: 4,
    location: 'Heart of Gielinor (GWD2)',
    requirements: {},
    recommended: { Magic: 90, Defence: 90 },
    drops: ['Crest of Seren', 'Blade of Seren', 'Godsword shard 1', 'Godsword shard 2', 'Godsword shard 3'],
    note: 'Requires 80 Seren reputation to access',
  },
  'Gregorovic': {
    tier: 4,
    location: 'Heart of Gielinor (GWD2)',
    requirements: {},
    recommended: { Ranged: 90, Defence: 90 },
    drops: ['Crest of Sliske', 'Blade of Sliske', 'Godsword shard 1', 'Godsword shard 2', 'Godsword shard 3'],
    note: 'Requires 80 Sliske reputation to access',
  },
  'Magister': {
    tier: 4,
    location: 'Heart of the Khepri (Sophanem Slayer Dungeon)',
    requirements: { Slayer: 115 },
    recommended: { Attack: 90, Strength: 90, Magic: 90, Ranged: 90, Defence: 90, Prayer: 95 },
    drops: ['Khopesh of the Kharidian', 'Off-hand khopesh of the Kharidian',
            'Phylactery', 'Soul phylactery'],
    note: '115 Slayer required. Requires 100 Soul Devourers kill count to enter',
  },
  'Taraket the Necromancer': {
    tier: 4,
    location: 'Dragonkin Laboratory (ED2)',
    requirements: {},
    recommended: { Attack: 90, Magic: 90, Ranged: 90, Defence: 90 },
    drops: ['Laceration boots', 'Blast diffusion boots', 'Fleeting boots',
            'Shadow dye', 'Third Age dye', 'Blood dye'],
    note: 'Elite Dungeon 2 second boss. Powerful undead mechanics',
  },

  // ── TIER 5: Elite bosses ────────────────────────────────────────────────────

  'Araxxor / Araxxi': {
    tier: 5,
    location: 'Araxyte Lair',
    requirements: { Slayer: 92 },
    recommended: { Attack: 90, Ranged: 90, Magic: 90, Defence: 90 },
    drops: ['Noxious scythe', 'Noxious longbow', 'Noxious staff',
            "Araxxi's web", "Araxxi's fang", "Araxxi's eye", "Araxxi's leg"],
    note: '92 Slayer required. Araxxor phases — choose path before fight',
  },
  'Osseous Rex': {
    tier: 5,
    location: 'Anachronia',
    requirements: { Slayer: 96 },
    recommended: { Attack: 90, Strength: 90, Defence: 90 },
    drops: ['Rex bones', 'Venomous fangs', 'Osseous dust', 'Osseous Rex pet'],
  },
  'Seiryu the Azure Serpent': {
    tier: 5,
    location: 'Temple of Aminishi (ED1)',
    requirements: {},
    recommended: { Magic: 92, Ranged: 90, Defence: 90, Prayer: 95 },
    drops: ['Eldritch crossbow', 'Off-hand eldritch crossbow',
            'Azure crystal', 'Seiryu pet'],
    note: 'Elite Dungeon 1 final boss. Clear all sections first',
  },
  'The Ambassador': {
    tier: 5,
    location: 'The Shadow Reef (ED3)',
    requirements: {},
    recommended: { Attack: 92, Ranged: 92, Magic: 92, Defence: 92, Prayer: 95 },
    drops: ['Brooch of the Gods', 'Essence of Finality amulet (empty)',
            'Inquisitor staff', 'Shadow crystal'],
    note: 'Elite Dungeon 3 final boss. Highly mechanically complex',
  },
  'Raksha the Shadow Colossus': {
    tier: 5,
    location: 'Orthen (Anachronia)',
    requirements: { Slayer: 96 },
    recommended: { Attack: 92, Ranged: 92, Magic: 92, Necromancy: 90, Defence: 90, Prayer: 95 },
    drops: ['Laceration boots', 'Blightbound crossbow', 'Shadow spike',
            'Inquisitor staff shard', 'Raksha pet'],
    note: '96 Slayer required. Requires Orthen get-away kit (teleport)',
  },
  'Croesus': {
    tier: 5,
    location: 'Croesus Front',
    requirements: { Woodcutting: 80, Mining: 80, Fishing: 80, Farming: 80 },
    recommended: { Woodcutting: 95, Mining: 95, Fishing: 95, Farming: 95 },
    drops: ['Croesus flake', 'Fungal flake', 'Animica stone fragment',
            'Enriched anima stone', 'Croesus pet'],
    note: 'Skilling boss — no combat stats required. Up to 5 players',
  },
  'Zamorak, Lord of Erebus': {
    tier: 5,
    location: 'Senntisten (City of Um)',
    requirements: {},
    recommended: { Attack: 95, Ranged: 95, Magic: 95, Necromancy: 95, Defence: 95, Prayer: 95 },
    drops: ['Fractured Staff of Armadyl', 'Zamorak hilt',
            'Chaos die', 'Zamorak pet'],
    note: 'Enrage scales from 0–2000%+. Requires The Extinction quest',
  },
  'Rasial, the First Necromancer': {
    tier: 5,
    location: 'City of Um',
    requirements: { Necromancy: 110 },
    recommended: { Necromancy: 115, Defence: 99, Prayer: 99 },
    drops: ['Soulbound lantern', 'Death guard (tier 95)',
            'Skull lantern (tier 95)', 'Rasial pet'],
    note: '110 Necromancy hard requirement. Primarily a Necromancy fight',
  },

  // ── TIER 6: Raids ───────────────────────────────────────────────────────────

  'Nex: Angel of Death': {
    tier: 6,
    location: 'Heart of Gielinor (GWD2)',
    requirements: { Prayer: 92 },
    recommended: { Attack: 95, Ranged: 95, Magic: 95, Defence: 95, Prayer: 95, Herblore: 96 },
    drops: ['Zaros godsword', 'Virtus mask', 'Virtus robe top', 'Virtus robe legs',
            'Pernix cowl', 'Pernix body', 'Pernix chaps',
            'Torva full helm', 'Torva platebody', 'Torva platelegs'],
    note: 'Requires 80 Zaros reputation. Scales 1–7 players. Very high-end',
  },
  'Telos, the Warden': {
    tier: 6,
    location: 'The Pit',
    requirements: { Herblore: 96 },
    recommended: { Attack: 95, Strength: 95, Ranged: 95, Magic: 95, Defence: 95, Herblore: 96, Prayer: 95 },
    drops: ['Dormant Anima Core helm', 'Dormant Anima Core body', 'Dormant Anima Core legs',
            'Seren godbow', 'Staff of Sliske', 'Zaros godsword',
            'Wand of the praesul', 'Imperium core'],
    note: 'Requires Fate of the Gods. Enrage scales from 0–4000%+',
  },
  'Vorago': {
    tier: 6,
    location: 'Borehole',
    requirements: {},
    recommended: { Magic: 95, Ranged: 95, Attack: 95, Defence: 95, Constitution: 99 },
    drops: ['Seismic wand', 'Seismic singularity', 'Tectonic energy',
            'Mazcab ability codex', 'Vitalis (pet)'],
  },
  'Solak': {
    tier: 6,
    location: 'The Grove',
    requirements: {},
    recommended: { Attack: 99, Ranged: 99, Magic: 99, Defence: 99, Herblore: 99 },
    drops: ['Blightbound crossbow', 'Off-hand blightbound crossbow',
            "Erethdor's grimoire", 'Solak pet'],
    note: 'Very high-end raid boss — requires experienced team',
  },
  'Beastmaster Durzag': {
    tier: 6,
    location: 'Liberation of Mazcab (Raids 1)',
    requirements: {},
    recommended: { Attack: 90, Ranged: 90, Magic: 90, Defence: 90 },
    drops: ['Teralith cape', 'Tempest cape', 'Fleetfoot cape',
            'Mazcab ability codex'],
    note: 'Raids 1 (Liberation of Mazcab). First boss — must defeat before Yakamaru',
  },
  'Yakamaru': {
    tier: 6,
    location: 'Liberation of Mazcab (Raids 1)',
    requirements: {},
    recommended: { Attack: 95, Ranged: 95, Magic: 95, Defence: 95 },
    drops: ['Teralith cape', 'Tempest cape', 'Fleetfoot cape',
            'Mazcab ability codex'],
    note: 'Raids 1 final boss. Requires pool mechanics and split-team coordination',
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
  if (!boss) return { status: 'unknown', eligible: [], closest: null, shortfall: 0 };

  const reqs = boss.requirements || {};
  const rec  = boss.recommended  || {};
  const eligible = [];
  let bestPlayer  = null;
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
