/**
 * One-time migration: adds bosses that were missing from the initial seed.
 * Safe to re-run (INSERT OR REPLACE is idempotent).
 *
 * Run: node server/scripts/addMissingBosses.js
 */

const path = require('path');
process.chdir(path.join(__dirname, '..'));
const db = require('../database');

function j(v) { return typeof v === 'string' ? v : JSON.stringify(v); }

function upsertBoss(b) {
  db.prepare(`INSERT OR REPLACE INTO rs3_bosses
    (id, name, difficulty, min_combat_level, requirements, drops, wiki_url, last_verified_at)
    VALUES (?,?,?,?,?,?,?,?)`)
  .run(b.id, b.name, b.difficulty, b.min_combat_level ?? 0,
       j(b.requirements ?? {}), j(b.drops ?? []),
       b.wiki_url ?? null, new Date().toISOString());
}

const MISSING_BOSSES = [

  // ── GWD2 individual bosses (currently only "gwd2" group entry exists) ─────

  { id: 'gregorovic',
    name: 'Gregorovic',
    difficulty: 'mid', min_combat_level: 90,
    requirements: { skills: { Attack: 80, Prayer: 80 }, quests: [] },
    drops: [
      { name: 'Shadow glaive (T85 Ranged main-hand)' },
      { name: 'Off-hand shadow glaive (T85 Ranged off-hand)' },
      { name: 'Anima core of Sliske helm/body/legs (T80 Melee power armour)' },
      { name: 'Crest of Sliske (Anima core upgrade component)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Gregorovic' },

  { id: 'twin_furies',
    name: 'Twin Furies (Nymora & Avaryss)',
    difficulty: 'mid', min_combat_level: 90,
    requirements: { skills: { Ranged: 80, Defence: 80 }, quests: [] },
    drops: [
      { name: 'Blade of Nymora (T85 Melee main-hand)' },
      { name: 'Blade of Avaryss (T85 Melee off-hand)' },
      { name: 'Anima core of Zamorak helm/body/legs (T80 Ranged power armour)' },
      { name: 'Crest of Zamorak (Anima core upgrade component)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Twin_Furies' },

  { id: 'vindicta',
    name: 'Vindicta & Gorvek',
    difficulty: 'mid', min_combat_level: 90,
    requirements: { skills: { Attack: 80, Defence: 80 }, quests: [] },
    drops: [
      { name: 'Dragon Rider lance (T85 stab weapon)' },
      { name: 'Anima core of Zaros helm/body/legs (T80 hybrid power armour)' },
      { name: 'Crest of Zaros (Anima core upgrade component)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Vindicta' },

  { id: 'helwyr',
    name: 'Helwyr',
    difficulty: 'mid', min_combat_level: 90,
    requirements: { skills: { Magic: 80, Defence: 80 }, quests: [] },
    drops: [
      { name: 'Wand of the Cywir elders (T80 Magic main-hand)' },
      { name: 'Orb of the Cywir elders (T80 Magic off-hand)' },
      { name: 'Anima core of Seren helm/body/legs (T80 Magic power armour)' },
      { name: 'Crest of Seren (Anima core upgrade component)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Helwyr' },

  // ── Elite Dungeons — Temple of Aminishi (ED1) ────────────────────────────

  { id: 'sanctum_guardian',
    name: 'The Sanctum Guardian',
    difficulty: 'end', min_combat_level: 90,
    requirements: { skills: { Attack: 90, Ranged: 90, Magic: 90, Dungeoneering: 95 }, quests: [] },
    drops: [
      { name: 'Hanto top / legs / gloves / boots (T82 hybrid armour pieces)' },
    ],
    wiki_url: 'https://runescape.wiki/w/The_Sanctum_Guardian' },

  { id: 'masuta',
    name: 'Masuta the Ascended',
    difficulty: 'end', min_combat_level: 90,
    requirements: { skills: { Attack: 90, Ranged: 90, Magic: 90, Dungeoneering: 95 }, quests: [] },
    drops: [
      { name: 'Hanto top / legs / gloves / boots (T82 hybrid armour pieces)' },
      { name: 'Serenist weaponry (T82 magic/ranged)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Masuta_the_Ascended' },

  { id: 'seiryu',
    name: 'Seiryu the Azure Serpent',
    difficulty: 'end', min_combat_level: 90,
    requirements: { skills: { Attack: 90, Ranged: 90, Magic: 90, Dungeoneering: 95 }, quests: [] },
    drops: [
      { name: 'Azure crystal (upgrades Death Lotus to Superior Death Lotus T92)' },
      { name: 'Seiryu\'s claw (T82 Magic off-hand)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Seiryu_the_Azure_Serpent' },

  // ── Elite Dungeons — Dragonkin Laboratory (ED2) ──────────────────────────

  { id: 'astellarn',
    name: 'Astellarn',
    difficulty: 'end', min_combat_level: 90,
    requirements: { skills: { Attack: 90, Ranged: 90, Magic: 90, Dungeoneering: 95 }, quests: [] },
    drops: [
      { name: 'Draconic energy (Superior Dragonbone upgrade material)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Astellarn' },

  { id: 'verak_lith',
    name: 'Verak Lith',
    difficulty: 'end', min_combat_level: 90,
    requirements: { skills: { Attack: 90, Ranged: 90, Magic: 90, Dungeoneering: 95 }, quests: [] },
    drops: [
      { name: 'Draconic energy (Superior Dragonbone upgrade material)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Verak_Lith' },

  { id: 'black_stone_dragon',
    name: 'Black Stone Dragon',
    difficulty: 'end', min_combat_level: 90,
    requirements: { skills: { Attack: 90, Ranged: 90, Magic: 90, Dungeoneering: 95 }, quests: [] },
    drops: [
      { name: 'Alchemical hydrix (upgrades Malevolent / Noxious / Tectonic to T92 Superior)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Black_stone_dragon' },

  // ── Elite Dungeons — The Shadow Reef (ED3) ───────────────────────────────

  { id: 'crassian_leviathan',
    name: 'Crassian Leviathan',
    difficulty: 'end', min_combat_level: 90,
    requirements: { skills: { Attack: 90, Ranged: 90, Magic: 90, Dungeoneering: 95 }, quests: [] },
    drops: [
      { name: 'ED3 reward chest (Eldritch crossbow piece, Inquisitor staff piece)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Crassian_Leviathan' },

  { id: 'taraket',
    name: 'Taraket the Necromancer',
    difficulty: 'end', min_combat_level: 90,
    requirements: { skills: { Attack: 90, Ranged: 90, Magic: 90, Dungeoneering: 95 }, quests: [] },
    drops: [
      { name: 'ED3 reward chest (Eldritch crossbow piece, Inquisitor staff piece)' },
      { name: 'Soulbound lantern (rare drop — T95 Necromancy off-hand)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Taraket_the_Necromancer' },

  // ── Rasial's Citadel ─────────────────────────────────────────────────────

  { id: 'hermod',
    name: 'Hermod, the Spirit of War',
    difficulty: 'end', min_combat_level: 90,
    requirements: { skills: { Necromancy: 90, Defence: 80 }, quests: ['The Spirit of War'] },
    drops: [
      { name: 'Hermodic plate (1/10 — Deathdealer robe upgrade material)' },
      { name: 'Elemental anima stone' },
    ],
    wiki_url: 'https://runescape.wiki/w/Hermod,_the_Spirit_of_War' },

  // ── Amascut — Eclipse of the Heart ──────────────────────────────────────

  { id: 'amascut',
    name: 'Amascut, the Devourer',
    difficulty: 'end', min_combat_level: 100,
    requirements: { skills: { Necromancy: 90, Attack: 90, Defence: 90 }, quests: ['Eclipse of the Heart'] },
    drops: [
      { name: 'Tumeken\'s shadow (T90 hybrid power armour set)' },
      { name: 'Devourer\'s guard (T90 off-hand melee)' },
      { name: 'Tumeken\'s light (T90 magic main-hand)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Amascut,_the_Devourer' },

  // ── Sanctum of Rebirth ───────────────────────────────────────────────────

  { id: 'vermyx',
    name: 'Vermyx, Brood Mother',
    difficulty: 'end', min_combat_level: 90,
    requirements: { skills: { Necromancy: 90 }, quests: ['Soul Searching'] },
    drops: [
      { name: 'Divine Rage prayer codex (T99 offensive prayer unlock)' },
      { name: 'Scripture of Amascut (pocket slot prayer restore)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Vermyx,_Brood_Mother' },

  { id: 'kezalam',
    name: 'Kezalam, the Wanderer',
    difficulty: 'end', min_combat_level: 90,
    requirements: { skills: { Necromancy: 90 }, quests: ['Soul Searching'] },
    drops: [
      { name: 'Divine Rage prayer codex (T99 offensive prayer unlock)' },
      { name: 'Scripture of Amascut' },
      { name: 'Key to the Crossing (required for The Magister)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Kezalam,_the_Wanderer' },

  { id: 'nakatra',
    name: 'Nakatra, Devourer Eternal',
    difficulty: 'end', min_combat_level: 100,
    requirements: { skills: { Necromancy: 95 }, quests: ['Soul Searching'] },
    drops: [
      { name: 'Roar of Awakening (~228M gp)' },
      { name: 'Ode to Deceit (~217M gp)' },
      { name: 'Shard of Genesis Essence (~833M gp, hard mode only)' },
      { name: 'Scripture of Amascut' },
    ],
    wiki_url: 'https://runescape.wiki/w/Nakatra,_Devourer_Eternal' },

  { id: 'gate_of_elidinis',
    name: 'The Gate of Elidinis',
    difficulty: 'end', min_combat_level: 90,
    requirements: {
      skills: { Necromancy: 75, Agility: 25, Archaeology: 86, Cooking: 20, Magic: 66, Prayer: 40, Construction: 54, Slayer: 10 },
      quests: ['Ode of the Devourer']
    },
    drops: [
      { name: 'Eclipsed Soul prayer codex (~89M gp)' },
      { name: 'Memory dowser (~664M gp)' },
      { name: 'Runic attuner (~61M gp)' },
      { name: 'Scripture of Elidinis (~214M gp)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Gate_of_Elidinis' },

  // ── Rex Matriarchs 4th (Osseous) ─────────────────────────────────────────

  { id: 'osseous',
    name: 'Osseous',
    difficulty: 'end', min_combat_level: 90,
    requirements: { skills: { Slayer: 96 }, quests: ['Osseous Rex'] },
    drops: [
      { name: 'Occultist\'s ring (T90 Magic ring)' },
      { name: 'Calcified heart (ring upgrade component)' },
      { name: 'Skeka\'s hypnowand components' },
    ],
    wiki_url: 'https://runescape.wiki/w/Osseous' },

  // ── Flesh-hatcher Mhekarnahz (Wilderness) ────────────────────────────────

  { id: 'flesh_hatcher_mhekarnahz',
    name: 'Flesh-hatcher Mhekarnahz',
    difficulty: 'mid', min_combat_level: 80,
    requirements: { skills: { Dungeoneering: 40 }, quests: [] },
    drops: [
      { name: 'Dragon harpoon (T70 Fishing tool / weapon)' },
      { name: 'Stalker\'s charm' },
      { name: 'Hexhunter bow (extremely rare, 1/1,000,000)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Flesh-hatcher_Mhekarnahz' },

  // ── Non-Reaper-Crew independent bosses (listed on Bosses page) ───────────

  { id: 'exiled_kalphite_queen',
    name: 'Exiled Kalphite Queen',
    difficulty: 'early', min_combat_level: 70,
    requirements: { skills: { Defence: 60 }, quests: [] },
    drops: [
      { name: 'Dragon chainbody' },
      { name: 'Dragon 2H sword' },
      { name: 'Kalphite queen head' },
    ],
    wiki_url: 'https://runescape.wiki/w/Exiled_Kalphite_Queen' },

  { id: 'abomination',
    name: 'Abomination',
    difficulty: 'mid', min_combat_level: 80,
    requirements: { skills: { Defence: 70 }, quests: ['Hero\'s Welcome'] },
    drops: [
      { name: 'Abomination cape (T75 hybrid cape)' },
      { name: 'Dragon full helm' },
    ],
    wiki_url: 'https://runescape.wiki/w/Abomination' },

];

let added = 0, updated = 0;
for (const boss of MISSING_BOSSES) {
  const existing = db.prepare('SELECT id FROM rs3_bosses WHERE id = ?').get(boss.id);
  upsertBoss(boss);
  if (existing) updated++; else added++;
}

console.log(`Done: ${added} bosses added, ${updated} updated.`);
console.log(`Total bosses now: ${db.prepare('SELECT COUNT(*) as n FROM rs3_bosses').get().n}`);
