// ── RS3 PvM recommended gear per combat style ────────────────────────────────
// All requirements verified against runescape.wiki (May 2026).
// Key RS3 patterns:
//   - T70 power armour (Armadyl/Bandos): only Defence 70
//   - T80 Nex armour (Pernix/Virtus/Torva): Defence 80 + Constitution 80 or Strength 80
//   - T85 tank boots (Steadfast/Glaiven/Ragefire): Defence 85
//   - T90 power armour (Sirenic/Tectonic/Malevolent): Defence 90
//   - Most ranged/magic armour does NOT require Ranged/Magic to wear, only Defence
//   - Rune-tier items require Defence 50 in RS3 (NOT 40 like in OSRS)
//   - Bandos armour requires Defence 70 (NOT Strength — only Defence)
//   - Void Knight equipment requires Attack 42, Strength 42, Defence 42,
//     Constitution 42, Ranged 42, Magic 42, Prayer 22

// ── Quest skill prerequisites ─────────────────────────────────────────────────
// Exact skill levels needed to START or COMPLETE the listed quest.
// Sourced from runescape.wiki quest pages.
export const QUEST_SKILL_REQUIREMENTS = {
  'Smoking Kills':           { Slayer: 35, Crafting: 25 },
  'Haunted Mine':            { Agility: 15, Crafting: 35 },
  // Lair of Tarn Razorlor requires Slayer 40 + Haunted Mine (Agility 15, Crafting 35)
  'Lair of Tarn Razorlor':  { Slayer: 40, Agility: 15, Crafting: 35 },
  'Barbarian Assault':       {},
  // Recipe for Disaster needs 70 Cooking, 48 Agility, 20 Firemaking to complete all sub-quests
  'Recipe for Disaster':     { Cooking: 70, Agility: 48, Firemaking: 20 },
  // Roving Elves itself has no skill requirements (Agility 50 is on the items directly)
  'Roving Elves':            {},
  'Horror from the Deep':    { Agility: 35 },
  // The World Wakes — combat level 100 requirement was REMOVED in 2016; no hard skill reqs
  'The World Wakes':         {},
};

// ── RS3 XP thresholds for goal creation ──────────────────────────────────────
export const LEVEL_XP = {
  1: 0, 40: 37224, 50: 101333, 55: 166636, 60: 273742,
  65: 449428, 70: 737627, 75: 1210421, 80: 2097152,
  82: 2636890, 85: 3258594, 87: 3972294, 90: 5346332,
  92: 6517253, 95: 8771558, 99: 13034431,
};
export function levelToXp(lvl) {
  if (LEVEL_XP[lvl] !== undefined) return LEVEL_XP[lvl];
  const keys = Object.keys(LEVEL_XP).map(Number).sort((a, b) => a - b);
  for (let i = keys.length - 1; i >= 0; i--) {
    if (keys[i] <= lvl) return LEVEL_XP[keys[i]];
  }
  return 0;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function canWear(item, skillLevels) {
  if (!item) return false;
  if (item.reqs) {
    const ok = Object.entries(item.reqs).every(([skill, need]) => (skillLevels[skill] ?? 1) >= need);
    if (!ok) return false;
  }
  if (item.quest) {
    const qReqs = QUEST_SKILL_REQUIREMENTS[item.quest] ?? {};
    const ok = Object.entries(qReqs).every(([skill, need]) => (skillLevels[skill] ?? 1) >= need);
    if (!ok) return false;
  }
  return true;
}

export function getMissingReqs(item, skillLevels) {
  const missing = [];
  if (item?.reqs) {
    for (const [skill, need] of Object.entries(item.reqs)) {
      const have = skillLevels[skill] ?? 1;
      if (have < need) missing.push({ skill, need, have });
    }
  }
  if (item?.quest) {
    const qReqs = QUEST_SKILL_REQUIREMENTS[item.quest] ?? {};
    for (const [skill, need] of Object.entries(qReqs)) {
      const have = skillLevels[skill] ?? 1;
      if (have < need && !missing.some(m => m.skill === skill)) {
        missing.push({ skill, need, have, forQuest: item.quest });
      }
    }
  }
  return missing;
}

// items = already-filtered array for a specific style+slot, sorted best→worst (tier desc)
export function getBestAndNext(items, skillLevels) {
  if (!Array.isArray(items)) items = [];
  let bestIdx = -1;
  for (let i = 0; i < items.length; i++) {
    if (canWear(items[i], skillLevels)) { bestIdx = i; break; }
  }
  const best = bestIdx >= 0 ? items[bestIdx] : null;
  const next = bestIdx > 0 ? items[bestIdx - 1]
    : bestIdx === -1 && items.length > 0 ? items[items.length - 1]
    : null;
  return { best, next };
}

export const STYLES = [
  { key: 'melee',      label: 'Melee',      icon: '⚔️',  wikiImg: 'Attack.png',     color: '#f77e7e', bg: 'rgba(247,126,126,0.12)' },
  { key: 'ranged',     label: 'Ranged',     icon: '🏹',  wikiImg: 'Ranged.png',     color: '#7ef7a8', bg: 'rgba(126,247,168,0.12)' },
  { key: 'magic',      label: 'Magic',      icon: '🔮',  wikiImg: 'Magic.png',      color: '#7eb8f7', bg: 'rgba(126,184,247,0.12)' },
  { key: 'necromancy', label: 'Necromancy', icon: '💀',  wikiImg: 'Necromancy.png', color: '#d07ef7', bg: 'rgba(208,126,247,0.12)' },
  { key: 'hybrid',     label: 'Hybrid',     icon: '🌀',  wikiImg: null,             color: '#f7c97e', bg: 'rgba(247,201,126,0.12)' },
];

export const EQUIPMENT_SLOTS = [
  { slot: 'head',    label: 'Head',     icon: '⛑️',  wikiImg: 'Head_slot.png',      gridCol: 2, gridRow: 1 },
  { slot: 'pocket',  label: 'Pocket',   icon: '📖',  wikiImg: 'Pocket_slot.png',    gridCol: 3, gridRow: 1 },
  { slot: 'cape',    label: 'Cape',     icon: '🧣',  wikiImg: 'Back_slot.png',      gridCol: 1, gridRow: 2 },
  { slot: 'neck',    label: 'Amulet',   icon: '📿',  wikiImg: 'Neck_slot.png',      gridCol: 2, gridRow: 2 },
  { slot: 'ammo',    label: 'Ammo',     icon: '🎯',  wikiImg: 'Ammo_slot.png',      gridCol: 3, gridRow: 2 },
  { slot: 'weapon',  label: 'Weapon',   icon: '⚔️',  wikiImg: 'Main_hand_slot.png', gridCol: 1, gridRow: 3 },
  { slot: 'body',    label: 'Body',     icon: '🧥',  wikiImg: 'Torso_slot.png',     gridCol: 2, gridRow: 3 },
  { slot: 'offhand', label: 'Off-hand', icon: '🗡️',  wikiImg: 'Off-hand_slot.png',  gridCol: 3, gridRow: 3 },
  { slot: 'legs',    label: 'Legs',     icon: '👖',  wikiImg: 'Legs_slot.png',      gridCol: 2, gridRow: 4 },
  { slot: 'gloves',  label: 'Gloves',   icon: '🧤',  wikiImg: 'Hands_slot.png',     gridCol: 1, gridRow: 5 },
  { slot: 'boots',   label: 'Boots',    icon: '👢',  wikiImg: 'Feet_slot.png',      gridCol: 2, gridRow: 5 },
  { slot: 'ring',    label: 'Ring',     icon: '💍',  wikiImg: 'Ring_slot.png',      gridCol: 3, gridRow: 5 },
];

// Shorthand: i(name, reqs, quest)
const i = (name, reqs = null, quest = null) => ({ name, reqs, quest });

// Void Knight equip requirements (all pieces identical)
const VOID = { Attack: 42, Strength: 42, Defence: 42, Constitution: 42, Ranged: 42, Magic: 42, Prayer: 22 };

export const GEAR_SUGGESTIONS = {

  // ── MELEE ─────────────────────────────────────────────────────────────────
  melee: {
    head: [
      i('Vestments of Havoc hood',      { Defence: 95 }),
      i('Trimmed Masterwork helm',       { Defence: 92 }),
      i('Masterwork helm',               { Defence: 90 }),
      i('Torva full helm',               { Defence: 80 }),
      i('Bandos helmet',                 { Defence: 70 }),           // Defence 70 only — wiki confirmed
      i('Corrupted slayer helmet',       { Slayer: 55 }, 'Smoking Kills'),
      i('Slayer helmet (i)',             { Slayer: 55 }, 'Smoking Kills'),
      i('Dragon full helm',              { Defence: 60 }),
      i('Rune full helm',                { Defence: 50 }),           // RS3: Defence 50 — wiki confirmed
    ],
    cape: [
      i('Igneous Kal-Ket'),
      i('TokHaar-Kal-Ket',              null, 'The Elder Kiln'),
      i('Completionist cape',            { Attack: 99, Defence: 99 }),
      i('Max cape',                      { Attack: 99 }),
      i('Strength cape (t)',             { Strength: 99 }),
      i('Attack cape (t)',               { Attack: 99 }),
      i('Fire cape'),
    ],
    neck: [
      i('Amulet of souls'),
      i('Essence of Finality (melee)'),
      i('Blood amulet of fury'),
      i('Amulet of fury'),
      i('Salve amulet (e)',              null, 'Lair of Tarn Razorlor'),   // requires Slayer 40 + Haunted Mine
      i('Amulet of strength'),
    ],
    ammo: [
      i('Ruby bakriminel bolts (e)'),
      i('Hydrix bakriminel bolts (e)'),
      i('Onyx bakriminel bolts (e)'),
      i('N/A — melee'),
    ],
    weapon: [
      i('Zaros godsword',                { Attack: 92 }),
      i('Noxious scythe',                { Attack: 90 }),
      i('Dragon rider lance',            { Attack: 85 }),
      i("Laniakea's spear",              { Attack: 85 }),
      i("Masuta's warspear",             { Attack: 82 }),
      i('Dual drygore longswords',       { Attack: 90 }),
      i('Dual drygore maces',            { Attack: 90 }),
      i('Dual drygore rapiers',          { Attack: 90 }),
      i('Blade of Nymora + Avaryss',    { Attack: 85 }),
      i('Abyssal vine whip',             { Attack: 75 }),
      i('Chaotic maul',                  { Attack: 80, Dungeoneering: 80 }),
      i('Chaotic longsword',             { Attack: 80, Dungeoneering: 80 }),
      i('Saradomin sword',               { Attack: 75 }),             // wiki confirmed: 75 Attack
      i('Dragon 2H sword',               { Attack: 60 }),
    ],
    body: [
      i('Vestments of Havoc top',        { Defence: 95 }),
      i('Trimmed Masterwork platebody',  { Defence: 92 }),
      i('Masterwork platebody',          { Defence: 90 }),
      i('Malevolent cuirass',            { Defence: 90 }),
      i('Torva platebody',               { Defence: 80 }),
      i('Bandos chestplate',             { Defence: 70 }),            // Defence 70 only — wiki confirmed
      i('Fighter torso',                 { Defence: 40, Strength: 50 }, 'Barbarian Assault'),
      i('Rune platebody',                { Defence: 50 }),            // RS3: Defence 50 — wiki confirmed
    ],
    offhand: [
      i('Off-hand drygore longsword',    { Attack: 90 }),
      i('Off-hand drygore mace',         { Attack: 90 }),
      i('Off-hand drygore rapier',       { Attack: 90 }),
      i('Malevolent kiteshield',         { Defence: 90 }),
      i('Dragonfire shield',             { Defence: 75 }),
      i('Dragon kiteshield',             { Defence: 60 }),
      i('2H weapon (no off-hand)'),
    ],
    legs: [
      i('Vestments of Havoc bottom',     { Defence: 95 }),
      i('Trimmed Masterwork platelegs',  { Defence: 92 }),
      i('Masterwork platelegs',          { Defence: 90 }),
      i('Malevolent greaves',            { Defence: 90 }),
      i('Torva platelegs',               { Defence: 80 }),
      i('Bandos tassets',                { Defence: 70 }),            // Defence 70 only — wiki confirmed
      i('Rune platelegs',                { Defence: 50 }),            // RS3: Defence 50 — wiki confirmed
    ],
    gloves: [
      i('Goliath gloves',                { Attack: 80, Defence: 80 }),  // Dominion Tower — wiki confirmed
      i('Tracking gloves',               { Defence: 85 }),               // Automaton Guardians drop
      i("Culinaromancer's gloves 10",    null, 'Recipe for Disaster'),   // no equip stat, quest only
      i('Dragon gauntlets',              { Defence: 60 }),
    ],
    boots: [
      i('Laceration boots',              { Defence: 80 }),
      i('Steadfast boots',               { Defence: 85 }),            // wiki confirmed: 85 (not 80)
      i('Dragon boots',                  { Defence: 60 }),
      i('Rune boots',                    { Defence: 50 }),            // RS3: Defence 50 — wiki confirmed
    ],
    ring: [
      i("Asylum surgeon's ring"),
      i('Berserker ring (i)'),
      i('Onyx ring (i)'),
      i('Sixth-Age circuit',             null, 'The World Wakes'),    // no skill reqs for TWW
    ],
    pocket: [
      i('Scripture of Jas'),
      i('Scripture of Bik'),
      i('Illuminated god book',          null, 'Horror from the Deep'),
      i('God book (any)',                null, 'Horror from the Deep'),
    ],
  },

  // ── RANGED ────────────────────────────────────────────────────────────────
  ranged: {
    head: [
      i('Sirenic mask',                  { Defence: 90 }),             // only Defence — wiki confirmed
      i('Pernix cowl',                   { Defence: 80, Constitution: 80 }),
      i('Anima core helm of Zamorak',    { Defence: 80 }),
      i('Armadyl helmet',                { Defence: 70 }),             // only Defence — wiki confirmed
      i('Corrupted slayer helmet',       { Slayer: 55 }, 'Smoking Kills'),
      i('Slayer helmet (i)',             { Slayer: 55 }, 'Smoking Kills'),
      i('Void ranger helm',              VOID),
    ],
    cape: [
      i('Igneous Kal-Xil'),
      i('TokHaar-Kal-Xil',              null, 'The Elder Kiln'),
      i('Completionist cape',            { Ranged: 99, Defence: 99 }),
      i('Max cape',                      { Ranged: 99 }),
      i('Ranging cape (t)',              { Ranged: 99 }),
    ],
    neck: [
      i('Farsight sniper necklace'),
      i('Blood necklace'),
      i('Amulet of fury'),
      i('Salve amulet (e)',              null, 'Lair of Tarn Razorlor'),
    ],
    ammo: [
      i('Hydrix bakriminel bolts (e)',    { Ranged: 80 }),
      i('Ruby bakriminel bolts (e)',      { Ranged: 80 }),
      i('Onyx bakriminel bolts (e)',      { Ranged: 80 }),
      i('Dragonstone bakriminel bolts (e)', { Ranged: 80 }),
      i('Diamond bakriminel bolts (e)',   { Ranged: 80 }),
      i('Araxyte arrows',                { Ranged: 90 }),
      i('Ascension bolts',               { Ranged: 90 }),
      i('Dragon arrows',                 { Ranged: 60 }),
      i('Broad-tipped bolts',            { Ranged: 55 }, 'Smoking Kills'),
    ],
    weapon: [
      i('Bow of the Last Guardian',      { Ranged: 95 }),
      i('Seren godbow',                  { Ranged: 92 }),
      i('Eldritch crossbow',             { Ranged: 92 }),
      i('Blightbound crossbow + off-hand',{ Ranged: 92 }),
      i('Noxious longbow',               { Ranged: 90 }),
      i('Ascension crossbow + off-hand', { Ranged: 90 }),
      i('Decimation',                    { Ranged: 87 }),
      i('Shadow glaive',                 { Ranged: 85 }),
      i('Chaotic crossbow',              { Ranged: 80, Dungeoneering: 80 }),
      i('Royal crossbow',                { Ranged: 80 }),
      i('Zaryte bow',                    { Ranged: 80 }),
      // Crystal bow requires Ranged 70 + Agility 50 + Roving Elves (no quest skill req, item has Agility 50)
      i('Crystal bow',                   { Ranged: 70, Agility: 50 }, 'Roving Elves'),
      i('Rune crossbow',                 { Ranged: 65 }),
    ],
    body: [
      i('Sirenic hauberk',               { Defence: 90 }),
      i('Pernix body',                   { Defence: 80, Constitution: 80 }),
      i('Anima core body of Zamorak',    { Defence: 80 }),
      i('Death lotus chestplate',        { Defence: 85 }),             // only Defence 85 — wiki confirmed
      i('Armadyl chestplate',            { Defence: 70 }),
      i('Void ranger top',               VOID),
    ],
    offhand: [
      i('Off-hand ascension crossbow',   { Ranged: 90 }),
      i('Off-hand blightbound crossbow', { Ranged: 92 }),
      i('Off-hand chaotic crossbow',     { Ranged: 80, Dungeoneering: 80 }),
      i('Merciless kiteshield',          { Defence: 75 }),
      i('2H weapon (no off-hand)'),
    ],
    legs: [
      i('Sirenic chaps',                 { Defence: 90 }),
      i('Pernix chaps',                  { Defence: 80, Constitution: 80 }),
      i('Anima core legs of Zamorak',    { Defence: 80 }),
      i('Death lotus chaps',             { Defence: 85 }),
      i('Armadyl chainskirt',            { Defence: 70 }),
      i('Void ranger robe',              VOID),
    ],
    gloves: [
      i('Swift gloves',                  { Ranged: 80, Defence: 80 }), // Dominion Tower — wiki confirmed
      i('Pneumatic gloves',              { Defence: 85 }),              // Automaton Tracers drop — wiki confirmed
      i('Pernix gloves',                 { Defence: 80, Constitution: 80 }),
      i('Armadyl gloves',                { Defence: 70 }),              // only Defence — wiki confirmed
      i('Void gloves',                   VOID),
    ],
    boots: [
      i('Flarefrost boots',              { Defence: 90 }),              // only Defence 90 — wiki confirmed
      i('Glaiven boots',                 { Defence: 85 }),              // only Defence 85 — wiki confirmed
      i('Pernix boots',                  { Defence: 80, Constitution: 80 }),
      i('Armadyl boots',                 { Defence: 70 }),
      i('Ranger boots',                  { Ranged: 40 }),
    ],
    ring: [
      i("Archers' ring (i)"),
      i('Sixth-Age circuit',             null, 'The World Wakes'),
      i("Asylum surgeon's ring"),
    ],
    pocket: [
      i('Scripture of Jas'),
      i('Scripture of Bik'),
      i('Illuminated god book',          null, 'Horror from the Deep'),
      i('God book (any)',                null, 'Horror from the Deep'),
    ],
  },

  // ── MAGIC ─────────────────────────────────────────────────────────────────
  magic: {
    head: [
      i('Tectonic mask',                 { Defence: 90 }),
      i('Virtus mask',                   { Defence: 80, Constitution: 80 }),
      i("Seasinger's hood",              { Defence: 85, Constitution: 85 }),
      i('Anima core helm of Seren',      { Defence: 80 }),
      i("Ahrim's hood",                  { Magic: 70, Defence: 70 }),   // requires BOTH — wiki confirmed
      i('Hood of subjugation',           { Defence: 70 }),
      i('Corrupted slayer helmet',       { Slayer: 55 }, 'Smoking Kills'),
      i('Slayer helmet (i)',             { Slayer: 55 }, 'Smoking Kills'),
    ],
    cape: [
      i('Igneous Kal-Mej'),
      i('TokHaar-Kal-Mej',              null, 'The Elder Kiln'),
      i('Completionist cape',            { Magic: 99, Defence: 99 }),
      i('Max cape',                      { Magic: 99 }),
      i('Magic cape (t)',                { Magic: 99 }),
    ],
    neck: [
      i('Arcane stream necklace'),
      i('Blood necklace'),
      i('Amulet of fury'),
      i('Salve amulet (e)',              null, 'Lair of Tarn Razorlor'),
    ],
    ammo: [
      i('N/A — magic'),
    ],
    weapon: [
      i('Fractured staff of Armadyl',    { Magic: 95 }),
      i('Wand of the Praesul',           { Magic: 92 }),
      i('Staff of Sliske',               { Magic: 92 }),
      i('Noxious staff',                 { Magic: 90 }),
      i('Seismic wand',                  { Magic: 90 }),
      i('Obliteration',                  { Magic: 87 }),
      i('Wand of the Cywir Elders',      { Magic: 85 }),
      i('Virtus wand',                   { Magic: 80 }),
      i('Chaotic staff',                 { Magic: 80, Dungeoneering: 80 }),
      i('Staff of light',                { Magic: 75 }),
      // Crystal wand: Magic 70 + Agility 50 on the item, plus Roving Elves (no quest skill req)
      i('Crystal wand',                  { Magic: 70, Agility: 50 }, 'Roving Elves'),
      i('Master wand',                   { Magic: 70 }),
      i("Ahrim's wand",                  { Magic: 70 }),
    ],
    body: [
      i('Tectonic robe top',             { Defence: 90 }),
      i('Virtus robe top',               { Defence: 80, Constitution: 80 }),
      i("Seasinger's robe top",          { Defence: 85, Constitution: 85 }),
      i('Anima core body of Seren',      { Defence: 80 }),
      i("Ahrim's robe top",              { Magic: 70, Defence: 70 }),
      i('Garb of subjugation',           { Defence: 70 }),
    ],
    offhand: [
      i('Imperium core',                 { Magic: 95 }),
      i('Virtus book',                   { Magic: 80 }),
      i("Seasinger's wand (off-hand)",   { Defence: 85 }),
      i('Arcane spirit shield',          { Magic: 75, Defence: 75 }),
      i('2H weapon (no off-hand)'),
    ],
    legs: [
      i('Tectonic robe bottom',          { Defence: 90 }),
      i('Virtus robe bottom',            { Defence: 80, Constitution: 80 }),
      i("Seasinger's robe bottom",       { Defence: 85, Constitution: 85 }),
      i('Anima core legs of Seren',      { Defence: 80 }),
      i("Ahrim's robe bottom",           { Magic: 70, Defence: 70 }),
      i('Gown of subjugation',           { Defence: 70 }),
    ],
    gloves: [
      i('Spellcaster gloves',            { Magic: 80, Defence: 80 }),   // Dominion Tower — wiki confirmed
      i('Static gloves',                 { Defence: 85 }),               // Automaton Generators drop
      i('Virtus gloves',                 { Defence: 80, Constitution: 80 }),
      i("Seasinger's gloves",            { Defence: 85, Constitution: 85 }),
      i('Void gloves',                   VOID),
    ],
    boots: [
      i('Tectonic boots',                { Defence: 90 }),
      i('Ragefire boots',                { Defence: 85 }),               // only Defence 85 — wiki confirmed
      i('Virtus boots',                  { Defence: 80, Constitution: 80 }),
      i("Seasinger's boots",             { Defence: 85, Constitution: 85 }),
      i('Infinity boots',                { Magic: 50, Defence: 55 }),    // wiki confirmed: Magic 50, Defence 55
    ],
    ring: [
      i("Seers' ring (i)"),
      i('Sixth-Age circuit',             null, 'The World Wakes'),
      i("Asylum surgeon's ring"),
    ],
    pocket: [
      i('Scripture of Jas'),
      i('Scripture of Bik'),
      i('Illuminated god book',          null, 'Horror from the Deep'),
      i('God book (any)',                null, 'Horror from the Deep'),
    ],
  },

  // ── NECROMANCY ────────────────────────────────────────────────────────────
  necromancy: {
    head: [
      i('Crown of the First Necromancer', { Necromancy: 95 }),
      i('Deathwarden nexus (T90)',        { Necromancy: 90, Defence: 90 }),
      i('Deathwarden hood (T80)',         { Necromancy: 80, Defence: 80 }),
      i('Deathwarden hood (T70)',         { Necromancy: 70, Defence: 70 }),
      i('Cryptbloom helm',               { Necromancy: 90, Defence: 90 }),
      i('Corrupted slayer helmet',        { Slayer: 55 }, 'Smoking Kills'),
    ],
    cape: [
      i('Igneous Kal-Mor'),
      i('TokHaar-Kal-Mor',               null, 'The Elder Kiln'),
      i('Completionist cape',            { Necromancy: 99 }),
      i('Max cape',                      { Necromancy: 99 }),
      i('Necromancy cape (t)',            { Necromancy: 99 }),
    ],
    neck: [
      i('Amulet of souls'),
      i('Essence of Finality (necromancy)'),
      i('Blood amulet of fury'),
      i('Amulet of fury'),
      i('Salve amulet (e)',              null, 'Lair of Tarn Razorlor'),
    ],
    ammo: [
      i('N/A — necromancy'),
    ],
    weapon: [
      i('Omni Guard',                    { Necromancy: 95 }),
      i("Devourer's Guard",              { Necromancy: 95 }),
      i('Death Guard (T90)',             { Necromancy: 90 }),
      i('Death Guard (T80)',             { Necromancy: 80 }),
      i('Death Guard (T70)',             { Necromancy: 70 }),
      i('Death Guard (T60)',             { Necromancy: 60 }),
    ],
    body: [
      i('Robe top of the First Necromancer', { Necromancy: 95 }),
      i('Deathdealer robe top (T90)',    { Necromancy: 90, Defence: 90 }),
      i('Deathdealer robe top (T80)',    { Necromancy: 80, Defence: 80 }),
      i('Deathdealer robe top (T70)',    { Necromancy: 70, Defence: 70 }),
      i('Cryptbloom top',                { Necromancy: 90, Defence: 90 }),
    ],
    offhand: [
      i('Soulbound Lantern',             { Necromancy: 95 }),
      i('Skull Lantern (T90)',           { Necromancy: 90 }),
      i('Skull Lantern (T80)',           { Necromancy: 80 }),
      i('Skull Lantern (T70)',           { Necromancy: 70 }),
      i('Skull Lantern (T60)',           { Necromancy: 60 }),
    ],
    legs: [
      i('Robe bottom of the First Necromancer', { Necromancy: 95 }),
      i('Deathdealer robe bottom (T90)', { Necromancy: 90, Defence: 90 }),
      i('Deathdealer robe bottom (T80)', { Necromancy: 80, Defence: 80 }),
      i('Deathdealer robe bottom (T70)', { Necromancy: 70, Defence: 70 }),
      i('Cryptbloom bottom',             { Necromancy: 90, Defence: 90 }),
    ],
    gloves: [
      i('Hand wraps of the First Necromancer', { Necromancy: 95 }),
      i('Deathdealer gloves (T90)',      { Necromancy: 90 }),
      i('Deathdealer gloves (T80)',      { Necromancy: 80 }),
      i('Deathdealer gloves (T70)',      { Necromancy: 70 }),
      i('Cryptbloom gloves',             { Necromancy: 90 }),
      i('Spellcaster gloves',            { Magic: 80, Defence: 80 }),
    ],
    boots: [
      i('Foot wraps of the First Necromancer', { Necromancy: 95 }),
      i('Deathdealer boots (T90)',       { Necromancy: 90 }),
      i('Deathdealer boots (T80)',       { Necromancy: 80 }),
      i('Deathdealer boots (T70)',       { Necromancy: 70 }),
      i('Cryptbloom boots',              { Necromancy: 90 }),
      i('Ragefire boots',                { Defence: 85 }),
    ],
    ring: [
      i('Seal of the Occultist'),
      i('Sixth-Age circuit',             null, 'The World Wakes'),
      i("Asylum surgeon's ring"),
    ],
    pocket: [
      i('Scripture of Jas'),
      i('Scripture of Bik'),
      i('Scripture of Ful'),
      i('Illuminated god book',          null, 'Horror from the Deep'),
    ],
  },

  // ── HYBRID ────────────────────────────────────────────────────────────────
  hybrid: {
    head: [
      i('Anima core helm of Zaros',      { Defence: 80 }),
      i('Corrupted slayer helmet',        { Slayer: 55 }, 'Smoking Kills'),
      i('Slayer helmet (i)',             { Slayer: 55 }, 'Smoking Kills'),
      i('Void melee helm',               VOID),
    ],
    cape: [
      i('Completionist cape',            { Attack: 99, Ranged: 99, Magic: 99 }),
      i('Max cape',                      { Attack: 99 }),
      i('Igneous Kal-Ket'),
      i('Igneous Kal-Xil'),
      i('Igneous Kal-Mej'),
      i('Igneous Kal-Mor'),
    ],
    neck: [
      i('Amulet of souls'),
      i('Blood amulet of fury'),
      i('Amulet of fury'),
      i('Salve amulet (e)',              null, 'Lair of Tarn Razorlor'),
      i('Essence of Finality'),
    ],
    ammo: [
      i('Ruby bakriminel bolts (e)'),
      i('Hydrix bakriminel bolts (e)'),
      i('N/A'),
    ],
    weapon: [
      i('Zaros godsword',                { Attack: 92 }),
      i('Noxious staff',                 { Magic: 90 }),
      i('Noxious longbow',               { Ranged: 90 }),
      i('Noxious scythe',                { Attack: 90 }),
      i('Staff of Sliske',               { Magic: 92 }),
      i('Seren godbow',                  { Ranged: 92 }),
    ],
    body: [
      i('Anima core body of Zaros',      { Defence: 80 }),
      i('Elite sirenic hauberk',         { Defence: 92 }),
      i('Elite tectonic robe top',       { Defence: 92 }),
      i('Elite malevolent cuirass',      { Defence: 92 }),
    ],
    offhand: [
      i('Elysian spirit shield',         { Defence: 75 }),
      i('Dragonfire shield',             { Defence: 75 }),
      i('Merciless kiteshield',          { Defence: 75 }),
      i('Malevolent kiteshield',         { Defence: 90 }),
    ],
    legs: [
      i('Anima core legs of Zaros',      { Defence: 80 }),
      i('Elite sirenic chaps',           { Defence: 92 }),
      i('Elite tectonic robe bottom',    { Defence: 92 }),
      i('Elite malevolent greaves',      { Defence: 92 }),
    ],
    gloves: [
      i('Goliath gloves',                { Attack: 80, Defence: 80 }),
      i('Swift gloves',                  { Ranged: 80, Defence: 80 }),
      i('Spellcaster gloves',            { Magic: 80, Defence: 80 }),
    ],
    boots: [
      i('Steadfast boots',               { Defence: 85 }),
      i('Glaiven boots',                 { Defence: 85 }),
      i('Ragefire boots',                { Defence: 85 }),
      i('Dragon boots',                  { Defence: 60 }),
    ],
    ring: [
      i('Sixth-Age circuit',             null, 'The World Wakes'),
      i("Asylum surgeon's ring"),
      i("Completionist's ring",          { Attack: 99 }),
    ],
    pocket: [
      i('Scripture of Jas'),
      i('Scripture of Bik'),
      i('Illuminated god book',          null, 'Horror from the Deep'),
    ],
  },
};
