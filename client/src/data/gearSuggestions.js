// ── RS3 PvM recommended gear per combat style ────────────────────────────────
// Items converted to objects: { name, reqs: { SkillName: level }, quest: 'Quest' | null }
// reqs: null means no level requirement to wield/wear.
// Items sorted BiS → entry tier within each slot so the first canWear() hit = best available.

// ── RS3 XP thresholds for goal creation ──────────────────────────────────────
export const LEVEL_XP = {
  1: 0, 40: 37224, 50: 101333, 55: 166636, 60: 273742,
  65: 449428, 70: 737627, 75: 1210421, 80: 2097152,
  82: 2636890, 85: 3258594, 87: 3972294, 90: 5346332,
  92: 6517253, 95: 8771558, 99: 13034431,
};
// Get XP for a given level (exact or nearest lower key)
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
  if (!item?.reqs) return true;
  return Object.entries(item.reqs).every(([skill, need]) => (skillLevels[skill] ?? 1) >= need);
}

export function getMissingReqs(item, skillLevels) {
  if (!item?.reqs) return [];
  return Object.entries(item.reqs)
    .filter(([skill, need]) => (skillLevels[skill] ?? 1) < need)
    .map(([skill, need]) => ({ skill, need, have: skillLevels[skill] ?? 1 }));
}

// Returns { best: item|null, next: item|null } for a slot given current skills.
// Items are sorted BiS-first, so first canWear hit = best available; item just above it = next upgrade.
export function getBestAndNext(styleKey, slot, skillLevels) {
  const items = GEAR_SUGGESTIONS[styleKey]?.[slot] ?? [];
  let bestIdx = -1;
  for (let i = 0; i < items.length; i++) {
    if (canWear(items[i], skillLevels)) { bestIdx = i; break; }
  }
  const best = bestIdx >= 0 ? items[bestIdx] : null;
  // Next = highest-tier locked item just above best (or easiest locked item if none available)
  const next = bestIdx > 0 ? items[bestIdx - 1]
    : bestIdx === -1 && items.length > 0 ? items[items.length - 1]
    : null;
  return { best, next };
}

// wikiImg uses runescape.wiki/images/ — same source as skill icons in OverviewTab
export const STYLES = [
  { key: 'melee',      label: 'Melee',      icon: '⚔️',  wikiImg: 'Attack.png',     color: '#f77e7e', bg: 'rgba(247,126,126,0.12)' },
  { key: 'ranged',     label: 'Ranged',     icon: '🏹',  wikiImg: 'Ranged.png',     color: '#7ef7a8', bg: 'rgba(126,247,168,0.12)' },
  { key: 'magic',      label: 'Magic',      icon: '🔮',  wikiImg: 'Magic.png',      color: '#7eb8f7', bg: 'rgba(126,184,247,0.12)' },
  { key: 'necromancy', label: 'Necromancy', icon: '💀',  wikiImg: 'Necromancy.png', color: '#d07ef7', bg: 'rgba(208,126,247,0.12)' },
  { key: 'hybrid',     label: 'Hybrid',     icon: '🌀',  wikiImg: null,             color: '#f7c97e', bg: 'rgba(247,201,126,0.12)' },
];

// Slot definitions + their position on the RS3 equipment grid (3 cols × 5 rows)
// wikiImg: verified filenames from runescape.wiki/w/Worn_equipment
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

// ── Gear suggestions with level/quest requirements ────────────────────────────
// reqs: { SkillName: level } — the primary skill(s) needed to equip the item.
// quest: 'Quest Name' — additional quest prerequisite if any.
// null reqs = no equip requirement (or practical req is "get there through bossing").
const i = (name, reqs = null, quest = null) => ({ name, reqs, quest });

export const GEAR_SUGGESTIONS = {

  // ── MELEE ──────────────────────────────────────────────────────────────────
  melee: {
    head: [
      i('Vestments of Havoc hood',    { Defence: 95 }),
      i('Trimmed Masterwork helm',    { Defence: 92 }),
      i('Masterwork helm',            { Defence: 90 }),
      i('Torva full helm',            { Defence: 80 }),
      i('Bandos helmet',              { Defence: 65, Strength: 70 }),
      i('Corrupted slayer helmet',    { Slayer: 55 }, 'Smoking Kills'),
      i('Slayer helmet (i)',          { Slayer: 55 }, 'Smoking Kills'),
      i('Dragon full helm',           { Defence: 60 }),
      i('Rune full helm',             { Defence: 40 }),
    ],
    cape: [
      i('Igneous Kal-Ket'),
      i('TokHaar-Kal-Ket'),
      i('Completionist cape',         { Attack: 99, Defence: 99 }),
      i('Max cape',                   { Attack: 99 }),
      i('Strength cape (t)',          { Strength: 99 }),
      i('Attack cape (t)',            { Attack: 99 }),
      i('Fire cape'),
    ],
    neck: [
      i('Amulet of souls'),
      i('Essence of Finality (melee)'),
      i('Blood amulet of fury'),
      i('Amulet of fury'),
      i('Salve amulet (e)',           null, 'Haunted Mine'),
      i('Amulet of strength'),
    ],
    ammo: [
      i('Ruby bakriminel bolts (e)'),
      i('Hydrix bakriminel bolts (e)'),
      i('Onyx bakriminel bolts (e)'),
      i('N/A — melee'),
    ],
    weapon: [
      i('Zaros godsword',             { Attack: 92 }),
      i('Noxious scythe',             { Attack: 90 }),
      i('Dragon rider lance',         { Attack: 85 }),
      i("Laniakea's spear",           { Attack: 85 }),
      i("Masuta's warspear",          { Attack: 82 }),
      i('Dual drygore longswords',    { Attack: 90 }),
      i('Dual drygore maces',         { Attack: 90 }),
      i('Dual drygore rapiers',       { Attack: 90 }),
      i('Blade of Nymora + Avaryss', { Attack: 85 }),
      i('Abyssal vine whip',          { Attack: 75 }),
      i('Chaotic maul',               { Attack: 80, Dungeoneering: 80 }),
      i('Chaotic longsword',          { Attack: 80, Dungeoneering: 80 }),
      i('Saradomin sword',            { Attack: 70 }),
      i('Dragon 2H sword',            { Attack: 60 }),
    ],
    body: [
      i('Vestments of Havoc top',     { Defence: 95 }),
      i('Trimmed Masterwork platebody', { Defence: 92 }),
      i('Masterwork platebody',       { Defence: 90 }),
      i('Malevolent cuirass',         { Defence: 90 }),
      i('Torva platebody',            { Defence: 80 }),
      i('Bandos chestplate',          { Defence: 65, Strength: 70 }),
      i('Fighter torso',              { Defence: 40 }, 'Barbarian Assault'),
      i('Rune platebody',             { Defence: 40 }),
    ],
    offhand: [
      i('Off-hand drygore longsword', { Attack: 90 }),
      i('Off-hand drygore mace',      { Attack: 90 }),
      i('Off-hand drygore rapier',    { Attack: 90 }),
      i('Malevolent kiteshield',      { Defence: 90 }),
      i('Dragonfire shield',          { Defence: 75 }),
      i('Dragon kiteshield',          { Defence: 60 }),
      i('2H weapon (no off-hand)'),
    ],
    legs: [
      i('Vestments of Havoc bottom',  { Defence: 95 }),
      i('Trimmed Masterwork platelegs', { Defence: 92 }),
      i('Masterwork platelegs',       { Defence: 90 }),
      i('Malevolent greaves',         { Defence: 90 }),
      i('Torva platelegs',            { Defence: 80 }),
      i('Bandos tassets',             { Defence: 65, Strength: 70 }),
      i('Rune platelegs',             { Defence: 40 }),
    ],
    gloves: [
      i('Goliath gloves',             { Dungeoneering: 80 }),
      i('Pneumatic gloves',           { Dungeoneering: 80 }),
      i('Siege gloves',               { Dungeoneering: 80 }),
      i("Culinaromancer's gloves 10", { Defence: 65 }, 'Recipe for Disaster'),
      i('Dragon gauntlets',           { Defence: 60 }),
    ],
    boots: [
      i('Laceration boots',           { Defence: 80 }),
      i('Steadfast boots',            { Defence: 80 }),
      i('Dragon boots',               { Defence: 60 }),
      i('Rune boots',                 { Defence: 40 }),
    ],
    ring: [
      i("Asylum surgeon's ring"),
      i('Berserker ring (i)'),
      i('Onyx ring (i)'),
      i('Sixth-Age circuit',          null, 'The World Wakes'),
    ],
    pocket: [
      i('Scripture of Jas'),
      i('Scripture of Bik'),
      i('Illuminated god book',       null, 'Horror from the Deep'),
      i('God book (any)',             null, 'Horror from the Deep'),
    ],
  },

  // ── RANGED ─────────────────────────────────────────────────────────────────
  ranged: {
    head: [
      i('Sirenic mask',               { Ranged: 90, Defence: 90 }),
      i('Pernix cowl',                { Ranged: 80, Defence: 80 }),
      i('Anima core helm of Zamorak', { Ranged: 80, Defence: 80 }),
      i('Armadyl helmet',             { Ranged: 70, Defence: 70 }),
      i('Corrupted slayer helmet',    { Slayer: 55 }, 'Smoking Kills'),
      i('Slayer helmet (i)',          { Slayer: 55 }, 'Smoking Kills'),
      i('Void ranger helm',           { Ranged: 42, Defence: 42, Attack: 42 }),
    ],
    cape: [
      i('Igneous Kal-Xil'),
      i('TokHaar-Kal-Xil'),
      i('Completionist cape',         { Ranged: 99, Defence: 99 }),
      i('Max cape',                   { Ranged: 99 }),
      i('Ranging cape (t)',           { Ranged: 99 }),
    ],
    neck: [
      i('Farsight sniper necklace'),
      i('Blood necklace'),
      i('Amulet of fury'),
      i('Salve amulet (e)',           null, 'Haunted Mine'),
    ],
    ammo: [
      i('Hydrix bakriminel bolts (e)', { Ranged: 80 }),
      i('Ruby bakriminel bolts (e)',   { Ranged: 80 }),
      i('Onyx bakriminel bolts (e)',   { Ranged: 80 }),
      i('Dragonstone bakriminel bolts (e)', { Ranged: 80 }),
      i('Diamond bakriminel bolts (e)', { Ranged: 80 }),
      i('Araxyte arrows',             { Ranged: 90 }),
      i('Ascension bolts',            { Ranged: 90 }),
      i('Dragon arrows',              { Ranged: 60 }),
      i('Broad-tipped bolts',         { Ranged: 55 }, 'Smoking Kills'),
    ],
    weapon: [
      i('Bow of the Last Guardian',   { Ranged: 95 }),
      i('Seren godbow',               { Ranged: 92 }),
      i('Eldritch crossbow',          { Ranged: 92 }),
      i('Blightbound crossbow + off-hand', { Ranged: 92 }),
      i('Noxious longbow',            { Ranged: 90 }),
      i('Ascension crossbow + off-hand', { Ranged: 90 }),
      i('Decimation',                 { Ranged: 87 }),
      i('Shadow glaive',              { Ranged: 85 }),
      i('Chaotic crossbow',           { Ranged: 80, Dungeoneering: 80 }),
      i('Royal crossbow',             { Ranged: 80 }),
      i('Zaryte bow',                 { Ranged: 80 }),
      i('Crystal bow',                { Ranged: 70 }, 'Roving Elves'),
      i('Rune crossbow',              { Ranged: 65 }),
    ],
    body: [
      i('Sirenic hauberk',            { Ranged: 90, Defence: 90 }),
      i('Pernix body',                { Ranged: 80, Defence: 80 }),
      i('Anima core body of Zamorak', { Ranged: 80, Defence: 80 }),
      i('Death lotus chestplate',     { Ranged: 85, Defence: 85 }),
      i('Armadyl chestplate',         { Ranged: 70, Defence: 70 }),
      i('Void ranger top',            { Ranged: 42, Defence: 42 }),
    ],
    offhand: [
      i('Off-hand ascension crossbow',{ Ranged: 90 }),
      i('Off-hand blightbound crossbow', { Ranged: 92 }),
      i('Off-hand chaotic crossbow',  { Ranged: 80, Dungeoneering: 80 }),
      i('Merciless kiteshield',       { Ranged: 75, Defence: 75 }),
      i('2H weapon (no off-hand)'),
    ],
    legs: [
      i('Sirenic chaps',              { Ranged: 90, Defence: 90 }),
      i('Pernix chaps',               { Ranged: 80, Defence: 80 }),
      i('Anima core legs of Zamorak', { Ranged: 80, Defence: 80 }),
      i('Death lotus chaps',          { Ranged: 85, Defence: 85 }),
      i('Armadyl chainskirt',         { Ranged: 70, Defence: 70 }),
      i('Void ranger robe',           { Ranged: 42, Defence: 42 }),
    ],
    gloves: [
      i('Swift gloves',               { Dungeoneering: 80 }),
      i('Pernix gloves',              { Ranged: 80 }),
      i('Armadyl gloves',             { Ranged: 70 }),
      i('Void gloves',                { Ranged: 42, Defence: 42 }),
    ],
    boots: [
      i('Flarefrost boots',           { Ranged: 90, Magic: 90 }),
      i('Glaiven boots',              { Ranged: 80 }),
      i('Pernix boots',               { Ranged: 80 }),
      i('Armadyl boots',              { Ranged: 70 }),
      i('Ranger boots',               { Ranged: 40 }),
    ],
    ring: [
      i("Archers' ring (i)"),
      i('Sixth-Age circuit',          null, 'The World Wakes'),
      i("Asylum surgeon's ring"),
    ],
    pocket: [
      i('Scripture of Jas'),
      i('Scripture of Bik'),
      i('Illuminated god book',       null, 'Horror from the Deep'),
      i('God book (any)',             null, 'Horror from the Deep'),
    ],
  },

  // ── MAGIC ──────────────────────────────────────────────────────────────────
  magic: {
    head: [
      i('Tectonic mask',              { Magic: 90, Defence: 90 }),
      i('Virtus mask',                { Magic: 80, Defence: 80 }),
      i("Seasinger's hood",           { Magic: 85, Defence: 85 }),
      i('Anima core helm of Seren',   { Magic: 80, Defence: 80 }),
      i("Ahrim's hood",               { Magic: 70, Defence: 70 }),
      i('Hood of subjugation',        { Magic: 70, Defence: 70 }),
      i('Corrupted slayer helmet',    { Slayer: 55 }, 'Smoking Kills'),
      i('Slayer helmet (i)',          { Slayer: 55 }, 'Smoking Kills'),
    ],
    cape: [
      i('Igneous Kal-Mej'),
      i('TokHaar-Kal-Mej'),
      i('Completionist cape',         { Magic: 99, Defence: 99 }),
      i('Max cape',                   { Magic: 99 }),
      i('Magic cape (t)',             { Magic: 99 }),
    ],
    neck: [
      i('Arcane stream necklace'),
      i('Blood necklace'),
      i('Amulet of fury'),
      i('Salve amulet (e)',           null, 'Haunted Mine'),
    ],
    ammo: [
      i('N/A — magic'),
    ],
    weapon: [
      i('Fractured staff of Armadyl', { Magic: 95 }),
      i('Wand of the Praesul',        { Magic: 92 }),
      i('Staff of Sliske',            { Magic: 92 }),
      i('Noxious staff',              { Magic: 90 }),
      i('Seismic wand',               { Magic: 90 }),
      i('Obliteration',               { Magic: 87 }),
      i('Wand of the Cywir Elders',   { Magic: 85 }),
      i('Virtus wand',                { Magic: 80 }),
      i('Chaotic staff',              { Magic: 80, Dungeoneering: 80 }),
      i('Staff of light',             { Magic: 75 }),
      i('Crystal wand',               { Magic: 70 }, 'Roving Elves'),
      i('Master wand',                { Magic: 70 }),
      i("Ahrim's wand",               { Magic: 70 }),
    ],
    body: [
      i('Tectonic robe top',          { Magic: 90, Defence: 90 }),
      i('Virtus robe top',            { Magic: 80, Defence: 80 }),
      i("Seasinger's robe top",       { Magic: 85, Defence: 85 }),
      i('Anima core body of Seren',   { Magic: 80, Defence: 80 }),
      i("Ahrim's robe top",           { Magic: 70, Defence: 70 }),
      i('Garb of subjugation',        { Magic: 70, Defence: 70 }),
    ],
    offhand: [
      i('Imperium core',              { Magic: 95 }),
      i('Virtus book',                { Magic: 80 }),
      i("Seasinger's wand (off-hand)", { Magic: 85 }),
      i('Arcane spirit shield',       { Magic: 75, Defence: 75 }),
      i('2H weapon (no off-hand)'),
    ],
    legs: [
      i('Tectonic robe bottom',       { Magic: 90, Defence: 90 }),
      i('Virtus robe bottom',         { Magic: 80, Defence: 80 }),
      i("Seasinger's robe bottom",    { Magic: 85, Defence: 85 }),
      i('Anima core legs of Seren',   { Magic: 80, Defence: 80 }),
      i("Ahrim's robe bottom",        { Magic: 70, Defence: 70 }),
      i('Gown of subjugation',        { Magic: 70, Defence: 70 }),
    ],
    gloves: [
      i('Spellcaster gloves',         { Dungeoneering: 80 }),
      i('Virtus gloves',              { Magic: 80 }),
      i("Seasinger's gloves",         { Magic: 85 }),
      i('Void gloves',                { Magic: 42, Defence: 42 }),
    ],
    boots: [
      i('Ragefire boots',             { Magic: 80 }),
      i('Virtus boots',               { Magic: 80 }),
      i('Tectonic boots',             { Magic: 90 }),
      i("Seasinger's boots",          { Magic: 85 }),
      i('Infinity boots',             { Magic: 50 }),
    ],
    ring: [
      i("Seers' ring (i)"),
      i('Sixth-Age circuit',          null, 'The World Wakes'),
      i("Asylum surgeon's ring"),
    ],
    pocket: [
      i('Scripture of Jas'),
      i('Scripture of Bik'),
      i('Illuminated god book',       null, 'Horror from the Deep'),
      i('God book (any)',             null, 'Horror from the Deep'),
    ],
  },

  // ── NECROMANCY ─────────────────────────────────────────────────────────────
  necromancy: {
    head: [
      i('Crown of the First Necromancer', { Necromancy: 95 }),
      i('Deathwarden nexus (T90)',     { Necromancy: 90, Defence: 90 }),
      i('Deathwarden hood (T80)',      { Necromancy: 80, Defence: 80 }),
      i('Deathwarden hood (T70)',      { Necromancy: 70, Defence: 70 }),
      i('Cryptbloom helm',            { Necromancy: 90, Defence: 90 }),
      i('Corrupted slayer helmet',    { Slayer: 55 }, 'Smoking Kills'),
    ],
    cape: [
      i('Igneous Kal-Mor'),
      i('TokHaar-Kal-Mor'),
      i('Completionist cape',         { Necromancy: 99 }),
      i('Max cape',                   { Necromancy: 99 }),
      i('Necromancy cape (t)',        { Necromancy: 99 }),
    ],
    neck: [
      i('Amulet of souls'),
      i('Essence of Finality (necromancy)'),
      i('Blood amulet of fury'),
      i('Amulet of fury'),
      i('Salve amulet (e)',           null, 'Haunted Mine'),
    ],
    ammo: [
      i('N/A — necromancy'),
    ],
    weapon: [
      i('Omni Guard',                 { Necromancy: 95 }),
      i('Devourer\'s Guard',          { Necromancy: 95 }),
      i('Death Guard (T90)',          { Necromancy: 90 }),
      i('Death Guard (T80)',          { Necromancy: 80 }),
      i('Death Guard (T70)',          { Necromancy: 70 }),
      i('Death Guard (T60)',          { Necromancy: 60 }),
    ],
    body: [
      i('Robe top of the First Necromancer', { Necromancy: 95 }),
      i('Deathdealer robe top (T90)', { Necromancy: 90, Defence: 90 }),
      i('Deathdealer robe top (T80)', { Necromancy: 80, Defence: 80 }),
      i('Deathdealer robe top (T70)', { Necromancy: 70, Defence: 70 }),
      i('Cryptbloom top',             { Necromancy: 90, Defence: 90 }),
    ],
    offhand: [
      i('Soulbound Lantern',          { Necromancy: 95 }),
      i('Skull Lantern (T90)',        { Necromancy: 90 }),
      i('Skull Lantern (T80)',        { Necromancy: 80 }),
      i('Skull Lantern (T70)',        { Necromancy: 70 }),
      i('Skull Lantern (T60)',        { Necromancy: 60 }),
    ],
    legs: [
      i('Robe bottom of the First Necromancer', { Necromancy: 95 }),
      i('Deathdealer robe bottom (T90)', { Necromancy: 90, Defence: 90 }),
      i('Deathdealer robe bottom (T80)', { Necromancy: 80, Defence: 80 }),
      i('Deathdealer robe bottom (T70)', { Necromancy: 70, Defence: 70 }),
      i('Cryptbloom bottom',          { Necromancy: 90, Defence: 90 }),
    ],
    gloves: [
      i('Hand wraps of the First Necromancer', { Necromancy: 95 }),
      i('Deathdealer gloves (T90)',   { Necromancy: 90 }),
      i('Deathdealer gloves (T80)',   { Necromancy: 80 }),
      i('Deathdealer gloves (T70)',   { Necromancy: 70 }),
      i('Cryptbloom gloves',          { Necromancy: 90 }),
      i('Spellcaster gloves',         { Dungeoneering: 80 }),
    ],
    boots: [
      i('Foot wraps of the First Necromancer', { Necromancy: 95 }),
      i('Deathdealer boots (T90)',    { Necromancy: 90 }),
      i('Deathdealer boots (T80)',    { Necromancy: 80 }),
      i('Deathdealer boots (T70)',    { Necromancy: 70 }),
      i('Cryptbloom boots',           { Necromancy: 90 }),
      i('Ragefire boots',             { Magic: 80 }),
    ],
    ring: [
      i('Seal of the Occultist'),
      i('Sixth-Age circuit',          null, 'The World Wakes'),
      i("Asylum surgeon's ring"),
    ],
    pocket: [
      i('Scripture of Jas'),
      i('Scripture of Bik'),
      i('Scripture of Ful'),
      i('Illuminated god book',       null, 'Horror from the Deep'),
    ],
  },

  // ── HYBRID ─────────────────────────────────────────────────────────────────
  hybrid: {
    head: [
      i('Anima core helm of Zaros',   { Defence: 80 }),
      i('Corrupted slayer helmet',    { Slayer: 55 }, 'Smoking Kills'),
      i('Slayer helmet (i)',          { Slayer: 55 }, 'Smoking Kills'),
      i('Void melee helm',            { Defence: 42 }),
    ],
    cape: [
      i('Completionist cape',         { Attack: 99, Ranged: 99, Magic: 99 }),
      i('Max cape',                   { Attack: 99 }),
      i('Igneous Kal-Ket'),
      i('Igneous Kal-Xil'),
      i('Igneous Kal-Mej'),
      i('Igneous Kal-Mor'),
    ],
    neck: [
      i('Amulet of souls'),
      i('Blood amulet of fury'),
      i('Amulet of fury'),
      i('Salve amulet (e)',           null, 'Haunted Mine'),
      i('Essence of Finality'),
    ],
    ammo: [
      i('Ruby bakriminel bolts (e)'),
      i('Hydrix bakriminel bolts (e)'),
      i('N/A'),
    ],
    weapon: [
      i('Zaros godsword',             { Attack: 92 }),
      i('Noxious staff',              { Magic: 90 }),
      i('Noxious longbow',            { Ranged: 90 }),
      i('Noxious scythe',             { Attack: 90 }),
      i('Staff of Sliske',            { Magic: 92 }),
      i('Seren godbow',               { Ranged: 92 }),
    ],
    body: [
      i('Anima core body of Zaros',   { Defence: 80 }),
      i('Elite sirenic hauberk',      { Ranged: 92 }),
      i('Elite tectonic robe top',    { Magic: 92 }),
      i('Elite malevolent cuirass',   { Defence: 92 }),
    ],
    offhand: [
      i('Elysian spirit shield',      { Defence: 75 }),
      i('Dragonfire shield',          { Defence: 75 }),
      i('Merciless kiteshield',       { Ranged: 75, Defence: 75 }),
      i('Malevolent kiteshield',      { Defence: 90 }),
    ],
    legs: [
      i('Anima core legs of Zaros',   { Defence: 80 }),
      i('Elite sirenic chaps',        { Ranged: 92 }),
      i('Elite tectonic robe bottom', { Magic: 92 }),
      i('Elite malevolent greaves',   { Defence: 92 }),
    ],
    gloves: [
      i('Goliath gloves',             { Dungeoneering: 80 }),
      i('Swift gloves',               { Dungeoneering: 80 }),
      i('Spellcaster gloves',         { Dungeoneering: 80 }),
    ],
    boots: [
      i('Steadfast boots',            { Defence: 80 }),
      i('Glaiven boots',              { Ranged: 80 }),
      i('Ragefire boots',             { Magic: 80 }),
      i('Dragon boots',               { Defence: 60 }),
    ],
    ring: [
      i('Sixth-Age circuit',          null, 'The World Wakes'),
      i("Asylum surgeon's ring"),
      i("Completionist's ring",       { Attack: 99 }),
    ],
    pocket: [
      i('Scripture of Jas'),
      i('Scripture of Bik'),
      i('Illuminated god book',       null, 'Horror from the Deep'),
    ],
  },
};
