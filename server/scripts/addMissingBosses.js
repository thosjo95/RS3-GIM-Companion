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

function bossIconUrl(wikiUrl) {
  if (!wikiUrl) return null;
  return `https://runescape.wiki/images/${wikiUrl.split('/w/').pop()}.png`;
}

function upsertBoss(b) {
  const iconUrl = b.icon_url ?? bossIconUrl(b.wiki_url);
  db.prepare(`INSERT OR REPLACE INTO rs3_bosses
    (id, name, difficulty, min_combat_level, requirements, drops, wiki_url, icon_url, last_verified_at)
    VALUES (?,?,?,?,?,?,?,?,?)`)
  .run(b.id, b.name, b.difficulty, b.min_combat_level ?? 0,
       j(b.requirements ?? {}), j(b.drops ?? []),
       b.wiki_url ?? null, iconUrl, new Date().toISOString());
}

const MISSING_BOSSES = [

  // ── GWD2 individual bosses (currently only "gwd2" group entry exists) ─────

  { id: 'gregorovic',
    name: 'Gregorovic',
    difficulty: 'mid', min_combat_level: 90,
    requirements: { skills: { Prayer: 80 }, quests: [] },
    drops: [
      { name: 'Shadow glaive (T85 Ranged main-hand)' },
      { name: 'Off-hand shadow glaive (T85 Ranged off-hand)' },
      { name: 'Dormant anima core helm/body/legs (upgrades into Anima core of Sliske, T80 Ranged power armour)' },
      { name: 'Crest of Sliske (anima core upgrade component)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Gregorovic' },

  { id: 'twin_furies',
    name: 'Twin Furies (Nymora & Avaryss)',
    difficulty: 'mid', min_combat_level: 90,
    requirements: { skills: { Ranged: 80 }, quests: [] },
    drops: [
      { name: 'Blade of Nymora (T85 Melee main-hand)' },
      { name: 'Blade of Avaryss (T85 Melee off-hand)' },
      { name: 'Dormant anima core helm/body/legs (upgrades into Anima core of Zamorak, T80 Ranged power armour)' },
      { name: 'Crest of Zamorak (anima core upgrade component)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Twin_Furies' },

  { id: 'vindicta',
    name: 'Vindicta & Gorvek',
    difficulty: 'mid', min_combat_level: 90,
    requirements: { skills: { Attack: 80 }, quests: [] },
    drops: [
      { name: 'Dragon Rider lance (T85 stab weapon)' },
      { name: 'Dormant anima core helm/body/legs (upgrades into Anima core of Zaros, T80 hybrid power armour)' },
      { name: 'Crest of Zaros (anima core upgrade component)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Vindicta' },

  { id: 'helwyr',
    name: 'Helwyr',
    difficulty: 'mid', min_combat_level: 90,
    requirements: { skills: { Magic: 80 }, quests: [] },
    drops: [
      { name: 'Wand of the Cywir elders (T80 Magic main-hand)' },
      { name: 'Orb of the Cywir elders (T80 Magic off-hand)' },
      { name: 'Dormant anima core helm/body/legs (upgrades into Anima core of Seren, T80 Magic power armour)' },
      { name: 'Crest of Seren (anima core upgrade component)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Helwyr' },

  // ── Elite Dungeons — Temple of Aminishi (ED1) ────────────────────────────

  { id: 'sanctum_guardian',
    name: 'The Sanctum Guardian',
    difficulty: 'end', min_combat_level: 90,
    requirements: { skills: {}, quests: ['Impressing the Locals'] },
    drops: [
      { name: 'Crassian Allegiance (lore book)' },
      { name: 'Fishy treat (allows skipping this fight)' },
      { name: "Sanctum Guardian's head (pet drop)" },
    ],
    wiki_url: 'https://runescape.wiki/w/The_Sanctum_Guardian' },

  { id: 'masuta',
    name: 'Masuta the Ascended',
    difficulty: 'end', min_combat_level: 90,
    requirements: { skills: {}, quests: ['Impressing the Locals'] },
    drops: [
      { name: "Masuta's warspear (unique weapon)" },
      { name: "Himiko's Vision (lore book)" },
    ],
    wiki_url: 'https://runescape.wiki/w/Masuta_the_Ascended' },

  { id: 'seiryu',
    name: 'Seiryu the Azure Serpent',
    difficulty: 'end', min_combat_level: 90,
    requirements: { skills: {}, quests: ['Impressing the Locals'] },
    drops: [
      { name: 'Ancient scales (unique material)' },
      { name: 'Chipped black stone crystal (pet drop)' },
      { name: "Seiryu's horns" },
    ],
    wiki_url: 'https://runescape.wiki/w/Seiryu_the_Azure_Serpent' },

  // ── Elite Dungeons — Dragonkin Laboratory (ED2) ──────────────────────────

  { id: 'astellarn',
    name: 'Astellarn',
    difficulty: 'end', min_combat_level: 90,
    requirements: { skills: {}, quests: [] },
    drops: [
      { name: 'Greater Flurry ability codex' },
      { name: 'Diary of an Overzealous Gnome (lore book)' },
      { name: "Astellarn's head (pet drop)" },
    ],
    wiki_url: 'https://runescape.wiki/w/Astellarn' },

  { id: 'verak_lith',
    name: 'Verak Lith',
    difficulty: 'end', min_combat_level: 90,
    requirements: { skills: {}, quests: [] },
    drops: [
      { name: 'Greater Fury ability codex' },
      { name: 'Redacted Dragonkin Research (lore book)' },
      { name: 'Draconic visage (rare)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Verak_Lith' },

  { id: 'black_stone_dragon',
    name: 'Black Stone Dragon',
    difficulty: 'end', min_combat_level: 90,
    requirements: { skills: {}, quests: [] },
    drops: [
      { name: 'Greater Barge ability codex' },
      { name: 'Inert black stone crystal (pet drop)' },
      { name: 'Lucky dragonkin coin (extremely rare)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Black_stone_dragon' },

  // ── Elite Dungeons — The Shadow Reef (ED3) ───────────────────────────────

  { id: 'crassian_leviathan',
    name: 'Crassian Leviathan',
    difficulty: 'end', min_combat_level: 90,
    requirements: { skills: {}, quests: [] },
    drops: [
      { name: 'The Last Offering (lore book)' },
      { name: "Crassian Leviathan's head (pet drop)" },
      { name: 'Black stone heart' },
    ],
    wiki_url: 'https://runescape.wiki/w/Crassian_Leviathan' },

  { id: 'taraket',
    name: 'Taraket the Necromancer',
    difficulty: 'end', min_combat_level: 90,
    requirements: { skills: {}, quests: [] },
    drops: [
      { name: "Kranon's Ancient Journal (lore book)" },
      { name: "Taraket's head (pet drop)" },
      { name: 'Black stone heart' },
    ],
    wiki_url: 'https://runescape.wiki/w/Taraket_the_Necromancer' },

  // ── Rasial's Citadel ─────────────────────────────────────────────────────

  { id: 'hermod',
    name: 'Hermod, the Spirit of War',
    difficulty: 'end', min_combat_level: 90,
    requirements: { skills: {}, quests: ['The Spirit of War'] },
    drops: [
      { name: 'Hermodic plate (unique material)' },
      { name: "Hermod's armour spike" },
      { name: "Hermod's helmet (pet drop)" },
      { name: 'Animated drumsticks' },
    ],
    wiki_url: 'https://runescape.wiki/w/Hermod,_the_Spirit_of_War' },

  // ── Amascut — Eclipse of the Heart ──────────────────────────────────────

  { id: 'amascut',
    name: 'Amascut, the Devourer',
    difficulty: 'end', min_combat_level: 100,
    requirements: { skills: {}, quests: ['Eclipse of the Heart'] },
    drops: [
      { name: "Tumeken's light (T90 Magic main-hand)" },
      { name: "Devourer's guard (T90 Melee off-hand)" },
      { name: "Tumeken's resplendence armour set (mask, robe top/bottom, gloves, boots)" },
      { name: 'Shard of Genesis Essence' },
    ],
    wiki_url: 'https://runescape.wiki/w/Amascut,_the_Devourer' },

  // ── Sanctum of Rebirth ───────────────────────────────────────────────────

  { id: 'vermyx',
    name: 'Vermyx, Brood Mother',
    difficulty: 'end', min_combat_level: 90,
    requirements: { skills: {}, quests: ['Necromancy!', 'Soul Searching'] },
    drops: [
      { name: 'Divine Rage prayer codex (T99 offensive prayer unlock)' },
      { name: 'Scripture of Amascut (pocket slot prayer restore)' },
      { name: 'Manuscript of Amascut' },
      { name: "Vermyx's head (pet drop)" },
    ],
    wiki_url: 'https://runescape.wiki/w/Vermyx,_Brood_Mother' },

  { id: 'kezalam',
    name: 'Kezalam, the Wanderer',
    difficulty: 'end', min_combat_level: 90,
    requirements: { skills: {}, quests: ['Necromancy!', 'Soul Searching'] },
    drops: [
      { name: 'Divine Rage prayer codex (T99 offensive prayer unlock)' },
      { name: 'Scripture of Amascut' },
      { name: 'The Beast of Darkness (lore book)' },
      { name: "Kezalam's head (pet drop)" },
    ],
    wiki_url: 'https://runescape.wiki/w/Kezalam,_the_Wanderer' },

  { id: 'nakatra',
    name: 'Nakatra, Devourer Eternal',
    difficulty: 'end', min_combat_level: 100,
    requirements: { skills: {}, quests: ['Necromancy!', 'Soul Searching'] },
    drops: [
      { name: 'Divine Rage prayer codex (T99 offensive prayer unlock)' },
      { name: 'Scripture of Amascut' },
      { name: 'Roar of Awakening' },
      { name: 'Ode to Deceit' },
      { name: 'Shard of Genesis Essence (hard mode only)' },
      { name: "Nefthys' tooth (pet drop)" },
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
      { name: 'Eclipsed Soul prayer codex' },
      { name: 'Memory dowser' },
      { name: 'Runic attuner' },
      { name: 'Scripture of Elidinis' },
      { name: 'Fragment of the Gate (pet component)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Gate_of_Elidinis' },

  // ── Rex Matriarchs 4th (Osseous) ─────────────────────────────────────────

  { id: 'osseous',
    name: 'Osseous',
    difficulty: 'end', min_combat_level: 90,
    requirements: { skills: { Necromancy: 70, Archaeology: 30 }, quests: ['Osseous Rex'] },
    drops: [
      { name: "Occultist's ring" },
      { name: "Skeka's hypnowand components (focus, projector, handle, base)" },
      { name: 'Savage spear components' },
      { name: 'Jail cell key' },
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
    requirements: { skills: {}, quests: [] },
    drops: [
      { name: 'Dragon chainbody' },
      { name: 'Dragon 2h sword' },
      { name: 'Lava battlestaff' },
      { name: 'Kalphite queen head (pet drop)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Exiled_Kalphite_Queen' },

  { id: 'abomination',
    name: 'Abomination',
    difficulty: 'mid', min_combat_level: 80,
    requirements: { skills: {}, quests: ['Hero\'s Welcome'] },
    drops: [
      { name: 'Abomination cape (T75 Melee cape)' },
      { name: 'Dragon full helm' },
      { name: 'Draconic visage' },
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
