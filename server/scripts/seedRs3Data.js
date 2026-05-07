/**
 * Seed script — populates RS3 reference tables from goalSuggestions.js data
 * and adds comprehensive milestone items, skill milestones, and gear paths.
 *
 * Run once: node server/scripts/seedRs3Data.js
 * Safe to re-run: uses INSERT OR REPLACE (idempotent).
 *
 * Also creates the admin user (username: admin, password shown below).
 */

const path = require('path');
const crypto = require('crypto');

// Load DB from the server directory
process.chdir(path.join(__dirname, '..'));
const db = require('../database');

// ── Admin credentials ─────────────────────────────────────────────────────────
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'GIM$Vault_Adm1n!2025';   // <-- shown once at bottom

function hashPassword(password, saltHex) {
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(32);
  const hash = crypto.pbkdf2Sync(password, salt, 600_000, 64, 'sha512');
  return { hash: hash.toString('hex'), salt: salt.toString('hex') };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function j(v) { return typeof v === 'string' ? v : JSON.stringify(v); }

function bossIconUrl(wikiUrl) {
  if (!wikiUrl) return null;
  return `https://runescape.wiki/images/${wikiUrl.split('/w/').pop()}.png`;
}

function upsertBoss(b) {
  const iconUrl = b.icon_url ?? bossIconUrl(b.wiki_url);
  db.prepare(`INSERT OR REPLACE INTO rs3_bosses (id, name, difficulty, min_combat_level, requirements, drops, wiki_url, icon_url, last_verified_at)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(
    b.id, b.name, b.difficulty, b.min_combat_level ?? 0,
    j(b.requirements ?? {}), j(b.drops ?? []), b.wiki_url ?? null,
    iconUrl, new Date().toISOString()
  );
}

function upsertMilestone(m) {
  db.prepare(`INSERT OR REPLACE INTO rs3_milestone_items (id, name, category, tier_impact, why_important, how_to_obtain, gim_notes, wiki_url, last_verified_at)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(
    m.id, m.name, m.category, m.tier_impact,
    m.why_important ?? null, m.how_to_obtain ?? null, m.gim_notes ?? null,
    m.wiki_url ?? null, new Date().toISOString()
  );
}

function upsertSkillMilestone(m) {
  db.prepare(`INSERT OR REPLACE INTO rs3_skill_milestones (id, skill, level, description, unlock_type, wiki_url)
    VALUES (?,?,?,?,?,?)`).run(
    m.id, m.skill, m.level, m.description ?? null, m.unlock_type ?? 'ability', m.wiki_url ?? null
  );
}

function upsertGearPath(p) {
  db.prepare(`INSERT OR REPLACE INTO rs3_gear_paths (id, style, slot, progression, last_updated_at)
    VALUES (?,?,?,?,?)`).run(p.id, p.style, p.slot, j(p.progression), new Date().toISOString());
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. BOSSES (derived from goalSuggestions.js boss entries)
// ══════════════════════════════════════════════════════════════════════════════
const BOSSES = [
  // ── Early ─────────────────────────────────────────────────────────────────
  { id: 'giant_mole',       name: 'Giant Mole',                difficulty: 'early', min_combat_level: 50,
    requirements: { skills: { Attack: 40, Defence: 40 }, quests: [] },
    drops: [{ name: "Mole skin" }, { name: "Mole claw" }],
    wiki_url: 'https://runescape.wiki/w/Giant_Mole' },

  { id: 'king_black_dragon', name: 'King Black Dragon',         difficulty: 'early', min_combat_level: 70,
    requirements: { skills: { Attack: 60, Defence: 60 }, quests: [] },
    drops: [{ name: "Draconic visage" }, { name: "Dragon pickaxe" }],
    wiki_url: 'https://runescape.wiki/w/King_Black_Dragon' },

  { id: 'chaos_elemental',  name: 'Chaos Elemental',           difficulty: 'early', min_combat_level: 60,
    requirements: { skills: {}, quests: [] },
    drops: [{ name: "Dragon pickaxe" }, { name: "Dragon 2H sword" }, { name: "Dragon platebody components" }],
    wiki_url: 'https://runescape.wiki/w/Chaos_Elemental' },

  { id: 'kalphite_queen',   name: 'Kalphite Queen',            difficulty: 'early', min_combat_level: 70,
    requirements: { skills: { Defence: 60 }, quests: [] },
    drops: [{ name: "Dragon chainbody" }, { name: "Dragon 2H sword" }],
    wiki_url: 'https://runescape.wiki/w/Kalphite_Queen' },

  { id: 'barrows',          name: 'Barrows',                   difficulty: 'early', min_combat_level: 70,
    requirements: { skills: { Attack: 70, Magic: 70 }, quests: ['Priest in Peril'] },
    drops: [
      { name: "Dharok's armour set" }, { name: "Guthan's armour set" },
      { name: "Karil's armour set" }, { name: "Verac's armour set" },
      { name: "Ahrim's armour set" }, { name: "Torag's armour set" },
    ],
    wiki_url: 'https://runescape.wiki/w/Barrows' },

  { id: 'dagannoth_kings',  name: 'Dagannoth Kings',           difficulty: 'early', min_combat_level: 80,
    requirements: { skills: { Attack: 70, Ranged: 70, Magic: 70 }, quests: ['Waterbirth Island'] },
    drops: [
      { name: "Berserker ring" }, { name: "Archers ring" },
      { name: "Seers ring" }, { name: "Warrior ring" },
      { name: "Dagannoth hide" }, { name: "Dragon axe" },
    ],
    wiki_url: 'https://runescape.wiki/w/Dagannoth_Kings' },

  { id: 'tztok_jad',        name: 'TzTok-Jad (Fight Caves)',   difficulty: 'early', min_combat_level: 80,
    requirements: { skills: { Attack: 60, Defence: 60 }, quests: [] },
    drops: [{ name: "Fire cape" }],
    wiki_url: 'https://runescape.wiki/w/TzTok-Jad' },

  // ── Mid ───────────────────────────────────────────────────────────────────
  { id: 'general_graardor', name: 'General Graardor (Bandos)', difficulty: 'mid', min_combat_level: 90,
    requirements: { skills: { Attack: 70, Strength: 70, Defence: 70, Slayer: 40 }, quests: ['The Temple at Senntisten'] },
    drops: [
      { name: "Bandos chestplate (T70 Melee)" }, { name: "Bandos tassets (T70 Melee)" },
      { name: "Bandos boots (T70 Melee)" }, { name: "Bandos hilt → Bandos godsword" },
    ],
    wiki_url: 'https://runescape.wiki/w/General_Graardor' },

  { id: 'kreearra',         name: "Kree'arra (Armadyl)",        difficulty: 'mid', min_combat_level: 90,
    requirements: { skills: { Ranged: 70, Defence: 70, Slayer: 40 }, quests: ['The Temple at Senntisten'] },
    drops: [
      { name: "Armadyl helmet (T70 Ranged)" }, { name: "Armadyl chestplate (T70 Ranged)" },
      { name: "Armadyl chainskirt (T70 Ranged)" }, { name: "Armadyl hilt → Armadyl godsword" },
    ],
    wiki_url: "https://runescape.wiki/w/Kree'arra" },

  { id: 'zilyana',          name: 'Commander Zilyana (Saradomin)', difficulty: 'mid', min_combat_level: 90,
    requirements: { skills: { Magic: 70, Defence: 70, Slayer: 40 }, quests: ['The Temple at Senntisten'] },
    drops: [
      { name: "Saradomin sword (T70 Melee)" }, { name: "Saradomin hilt → Saradomin godsword" },
      { name: "Armadyl crossbow (T70 Ranged)" },
    ],
    wiki_url: 'https://runescape.wiki/w/Commander_Zilyana' },

  { id: 'kril_tsutsaroth',  name: "K'ril Tsutsaroth (Zamorak)", difficulty: 'mid', min_combat_level: 90,
    requirements: { skills: { Attack: 70, Magic: 70, Defence: 70, Slayer: 40 }, quests: ['The Temple at Senntisten'] },
    drops: [
      { name: "Zamorak spear (T70 Melee)" }, { name: "Steam battlestaff" },
      { name: "Zamorak hilt → Zamorak godsword" },
    ],
    wiki_url: "https://runescape.wiki/w/K'ril_Tsutsaroth" },

  { id: 'corporeal_beast',  name: 'Corporeal Beast',           difficulty: 'mid', min_combat_level: 90,
    requirements: { skills: { Attack: 80, Strength: 80, Defence: 80, Magic: 80 }, quests: [] },
    drops: [
      { name: "Spirit shield" }, { name: "Holy elixir → Spirit shields (T75 shields)" },
      { name: "Arcane sigil → Arcane spirit shield" }, { name: "Divine sigil → Divine spirit shield" },
      { name: "Elysian sigil → Elysian spirit shield" },
    ],
    wiki_url: 'https://runescape.wiki/w/Corporeal_Beast' },

  { id: 'qbd',              name: 'Queen Black Dragon',        difficulty: 'mid', min_combat_level: 90,
    requirements: { skills: { Attack: 80, Ranged: 80, Magic: 80 }, quests: [] },
    drops: [
      { name: "Royal crossbow (T80 Ranged, assembled)" },
      { name: "Dragonrider armour set (T75 tank)" },
      { name: "Gemstone kavjet (Ranged off-hand)" },
    ],
    wiki_url: 'https://runescape.wiki/w/Queen_Black_Dragon' },

  { id: 'glacors',          name: 'Glacors',                   difficulty: 'mid', min_combat_level: 90,
    requirements: { skills: { Magic: 80 }, quests: ['Ritual of the Mahjarrat'] },
    drops: [
      { name: "Steadfast boots (T80 Melee)" },
      { name: "Ragefire boots (T80 Magic)" },
      { name: "Glaiven boots (T80 Ranged)" },
    ],
    wiki_url: 'https://runescape.wiki/w/Glacor' },

  { id: 'har_aken',         name: 'Har-Aken (Fight Kiln)',     difficulty: 'mid', min_combat_level: 90,
    requirements: { skills: { Attack: 80, Defence: 80 }, quests: [] },
    drops: [
      { name: "TokHaar-Kal-Ket (T80 Melee cape)" },
      { name: "TokHaar-Kal-Mej (T80 Magic cape)" },
      { name: "TokHaar-Kal-Xil (T80 Ranged cape)" },
    ],
    wiki_url: 'https://runescape.wiki/w/Har-Aken' },

  { id: 'tormented_demons', name: 'Tormented Demons',          difficulty: 'mid', min_combat_level: 85,
    requirements: { skills: { Slayer: 81 }, quests: ['While Guthix Sleeps'] },
    drops: [{ name: "Dragon claws (T60 special attack)" }, { name: "Off-hand dragon claws" }],
    wiki_url: 'https://runescape.wiki/w/Tormented_demon' },

  { id: 'magister',         name: 'The Magister',              difficulty: 'mid', min_combat_level: 100,
    requirements: { skills: { Slayer: 115, Attack: 82 }, quests: [] },
    drops: [
      { name: "Khopesh of the Kharidian (T82 Melee)" },
      { name: "Off-hand Khopesh of the Kharidian (T82 Melee)" },
    ],
    wiki_url: 'https://runescape.wiki/w/The_Magister' },

  { id: 'gwd2',             name: 'Heart of Gielinor (GWD2)',  difficulty: 'mid', min_combat_level: 90,
    requirements: { skills: { Attack: 80, Magic: 80, Ranged: 80 }, quests: [] },
    drops: [
      { name: "Anima core of Zaros armour (T80 Ranged power)" },
      { name: "Anima core of Seren armour (T80 Magic power)" },
      { name: "Anima core of Sliske armour (T80 Melee power)" },
      { name: "Dragon Rider lance (T85 stab)" },
      { name: "Cywir wand + orb (T80 Magic)" },
    ],
    wiki_url: 'https://runescape.wiki/w/Heart_of_Gielinor' },

  { id: 'legiones',         name: 'Legiones',                  difficulty: 'mid', min_combat_level: 100,
    requirements: { skills: { Slayer: 95, Ranged: 90 }, quests: [] },
    drops: [
      { name: "Ascension crossbow (T90 Ranged main-hand)" },
      { name: "Off-hand Ascension crossbow (T90 Ranged off-hand)" },
    ],
    wiki_url: 'https://runescape.wiki/w/Legiones' },

  // ── End ───────────────────────────────────────────────────────────────────
  { id: 'nex',              name: 'Nex',                       difficulty: 'end', min_combat_level: 100,
    requirements: { skills: { Attack: 80, Ranged: 80, Magic: 80, Defence: 80, Slayer: 40 }, quests: ['The Temple at Senntisten'] },
    drops: [
      { name: "Torva full helm / platebody / platelegs (T80 Melee)" },
      { name: "Pernix cowl / body / chaps (T80 Ranged)" },
      { name: "Virtus mask / robe top / robe legs (T80 Magic)" },
      { name: "Zaryte bow (T80 Ranged)" },
    ],
    wiki_url: 'https://runescape.wiki/w/Nex' },

  { id: 'kalphite_king',    name: 'Kalphite King',             difficulty: 'end', min_combat_level: 100,
    requirements: { skills: { Attack: 90, Defence: 80, Slayer: 80 }, quests: [] },
    drops: [
      { name: "Drygore rapier (T90 Melee)" }, { name: "Drygore longsword (T90 Melee)" },
      { name: "Drygore mace (T90 Melee)" }, { name: "Off-hand drygore variants" },
    ],
    wiki_url: 'https://runescape.wiki/w/Kalphite_King' },

  { id: 'araxxi',           name: 'Araxxor / Araxxi',          difficulty: 'end', min_combat_level: 100,
    requirements: { skills: { Slayer: 92, Attack: 90 }, quests: [] },
    drops: [
      { name: "Noxious scythe (T90 2H Melee)" },
      { name: "Noxious staff (T90 2H Magic)" },
      { name: "Noxious longbow (T90 2H Ranged)" },
    ],
    wiki_url: 'https://runescape.wiki/w/Araxxi' },

  { id: 'vorago',           name: 'Vorago',                    difficulty: 'end', min_combat_level: 100,
    requirements: { skills: { Magic: 90, Defence: 80 }, quests: [] },
    drops: [
      { name: "Tectonic mask / robe top / robe legs (T90 Magic armour)" },
      { name: "Seismic wand (T90 Magic main-hand)" },
      { name: "Seismic singularity (T90 Magic off-hand)" },
    ],
    wiki_url: 'https://runescape.wiki/w/Vorago' },

  { id: 'solak',            name: 'Solak',                     difficulty: 'end', min_combat_level: 100,
    requirements: { skills: { Ranged: 90, Magic: 90, Defence: 90 }, quests: [] },
    drops: [
      { name: "Inquisitor's staff (T80 magic, +20% dmg vs kneeling)" },
      { name: "Blightbound crossbow (T82 Ranged off-hand)" },
      { name: "Limitless sigil → Limitless ability" },
      { name: "Erethdor's grimoire (magic accuracy pocket)" },
    ],
    wiki_url: 'https://runescape.wiki/w/Solak' },

  { id: 'nex_aod',          name: 'Nex: Angel of Death',       difficulty: 'end', min_combat_level: 100,
    requirements: { skills: { Magic: 95, Ranged: 90, Defence: 90, Slayer: 40 }, quests: ['The Temple at Senntisten'] },
    drops: [
      { name: "Wand of the praesul (T95 Magic main-hand)" },
      { name: "Imperium core (T95 Magic off-hand)" },
      { name: "Tempest top/bottom (T95 Ranged armour)" },
      { name: "Blight top/bottom (T95 Magic armour)" },
    ],
    wiki_url: 'https://runescape.wiki/w/Nex:_Angel_of_Death' },

  { id: 'rasial',           name: 'Rasial, the First Necromancer', difficulty: 'end', min_combat_level: 100,
    requirements: { skills: { Necromancy: 90, Defence: 80 }, quests: ['Unwelcome Guests'] },
    drops: [
      { name: "Deathdealer robes (T90 Necromancy armour)" },
      { name: "Death Lotus darts (T92 Necromancy ranged ammo)" },
      { name: "Soulbound lantern (T95 Necromancy off-hand)" },
    ],
    wiki_url: 'https://runescape.wiki/w/Rasial,_the_First_Necromancer' },

  { id: 'telos',            name: 'Telos, the Warden',         difficulty: 'end', min_combat_level: 100,
    requirements: { skills: { Attack: 90, Ranged: 90, Magic: 90, Defence: 90 }, quests: [] },
    drops: [
      { name: "Zaros godsword (T92 2H Melee — best-in-slot)" },
      { name: "Seren godbow (T92 2H Ranged — best-in-slot)" },
      { name: "Staff of Sliske (T92 2H Magic — best-in-slot)" },
    ],
    wiki_url: 'https://runescape.wiki/w/Telos,_the_Warden' },

  { id: 'rise_of_the_six',  name: 'Rise of the Six',           difficulty: 'end', min_combat_level: 100,
    requirements: { skills: { Attack: 90, Defence: 80 }, quests: ['Ritual of the Mahjarrat'] },
    drops: [
      { name: "Malevolent energy → Malevolent armour (T90 power Melee)" },
      { name: "Sirenic scales → Sirenic armour (T90 power Ranged)" },
      { name: "Tectonic energy → Tectonic armour (T90 power Magic)" },
    ],
    wiki_url: 'https://runescape.wiki/w/Rise_of_the_Six' },

  { id: 'zamorak_loe',      name: 'Zamorak, Lord of Erebus',   difficulty: 'end', min_combat_level: 100,
    requirements: { skills: { Attack: 90, Defence: 90 }, quests: ['City of Senntisten'] },
    drops: [
      { name: "Vestments of Havoc top/bottom/helmet/gloves/boots (T90 power Melee)" },
      { name: "Hexhunter bow (T80 Ranged, +15% dmg vs magic foes)" },
    ],
    wiki_url: 'https://runescape.wiki/w/Zamorak,_Lord_of_Erebus' },

  { id: 'raksha',           name: 'Raksha, the Shadow Colossus', difficulty: 'end', min_combat_level: 100,
    requirements: { skills: { Slayer: 96, Ranged: 90 }, quests: ['Extinction'] },
    drops: [
      { name: "Cinderbane gloves (best-in-slot for poisonable content)" },
      { name: "Fleeting boots (T90 Ranged)" },
      { name: "Laceration boots (T90 Melee)" },
      { name: "Greater Ricochet codex" },
      { name: "Greater Chain codex" },
    ],
    wiki_url: 'https://runescape.wiki/w/Raksha,_the_Shadow_Colossus' },

  { id: 'kerapac',          name: 'Kerapac, the Bound',        difficulty: 'end', min_combat_level: 100,
    requirements: { skills: { Magic: 95, Defence: 90 }, quests: ['Extinction'] },
    drops: [
      { name: "Fractured Staff of Armadyl (T95 2H Magic — best-in-slot)" },
      { name: "Kerapac's wrist wraps (T90 Magic gloves)" },
    ],
    wiki_url: 'https://runescape.wiki/w/Kerapac,_the_Bound' },

  { id: 'arch_glacor',      name: 'Arch-Glacor',               difficulty: 'end', min_combat_level: 100,
    requirements: { skills: { Attack: 90, Magic: 90, Ranged: 90 }, quests: ['Extinction'] },
    drops: [
      { name: "Dark ice shard + sliver → Dark Ice Sword / Bow / Staff (T90)" },
      { name: "Piercing Shot codex" },
      { name: "Frozen core of Sliske" },
    ],
    wiki_url: 'https://runescape.wiki/w/Arch-Glacor' },

  { id: 'ambassador',       name: 'The Ambassador (ED3)',      difficulty: 'end', min_combat_level: 100,
    requirements: { skills: { Ranged: 90, Magic: 90 }, quests: [] },
    drops: [
      { name: "Eldritch crossbow (T92 Ranged off-hand — best-in-slot)" },
      { name: "Shadow gem → Shadow glaive (T85 Ranged)" },
      { name: "Inquisitor staff components" },
    ],
    wiki_url: 'https://runescape.wiki/w/The_Ambassador' },

  { id: 'raids',            name: 'Liberation of Mazcab Raids', difficulty: 'end', min_combat_level: 100,
    requirements: { skills: { Attack: 90, Defence: 90 }, quests: [] },
    drops: [
      { name: "Achto Teralith armour (T90 hybrid tank Melee)" },
      { name: "Achto Primeval armour (T90 hybrid tank Magic)" },
      { name: "Achto Tempestuous armour (T90 hybrid tank Ranged)" },
      { name: "Greater Flurry codex / Greater Fury codex" },
    ],
    wiki_url: 'https://runescape.wiki/w/Liberation_of_Mazcab' },

  { id: 'tzkal_zuk',        name: 'TzKal-Zuk (Fight Cauldron)', difficulty: 'end', min_combat_level: 100,
    requirements: { skills: { Attack: 95, Defence: 90 }, quests: [] },
    drops: [
      { name: "Igneous stone → Igneous Kal-Zuk (T95 all-style cape)" },
      { name: "Igneous Kal-Mej (T95 Magic cape)" },
      { name: "Igneous Kal-Xil (T95 Ranged cape)" },
      { name: "Igneous Kal-Ket (T95 Melee cape)" },
    ],
    wiki_url: 'https://runescape.wiki/w/TzKal-Zuk' },

  { id: 'croesus',          name: 'Croesus',                   difficulty: 'end', min_combat_level: 0,
    requirements: { skills: { Woodcutting: 90, Mining: 90, Fishing: 90, Farming: 90 }, quests: ['Extinction'] },
    drops: [
      { name: "Animate Dead codex (powerful defensive magic ability)" },
      { name: "Cryptbloom armour (T90 tank Magic)" },
    ],
    wiki_url: 'https://runescape.wiki/w/Croesus' },

  { id: 'rex_matriarchs',   name: 'Rex Matriarchs',            difficulty: 'end', min_combat_level: 95,
    requirements: { skills: { Slayer: 96 }, quests: [] },
    drops: [
      { name: "Magma Tempest codex" }, { name: "Plantcall codex" },
      { name: "Blastbox codex" }, { name: "Chromatic partyhat pieces (valuable cosmetics)" },
    ],
    wiki_url: 'https://runescape.wiki/w/Rex_Matriarchs' },

  { id: 'zemouregal_vorkath', name: 'Zemouregal & Vorkath',    difficulty: 'end', min_combat_level: 90,
    requirements: { skills: { Necromancy: 80, Defence: 70 }, quests: ['Fort Forinthry'] },
    drops: [
      { name: "Zemouregal's amulet (T80 Necromancy neck — +15% Necro dmg)" },
      { name: "Vorkath's head (Dragonbone necklace component)" },
    ],
    wiki_url: 'https://runescape.wiki/w/Zemouregal_%26_Vorkath' },

  // ── GWD2 individual bosses (Heart of Gielinor) ────────────────────────────
  { id: 'vindicta',          name: 'Vindicta & Gorvek',         difficulty: 'mid', min_combat_level: 90,
    requirements: { skills: { Attack: 80 }, quests: ['Azzanadra\'s Quest'] },
    drops: [
      { name: 'Dragon Rider lance (T85 melee stab)' },
      { name: 'Anima core of Zaros armour (T80 ranged power)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Vindicta' },

  { id: 'helwyr',            name: 'Helwyr',                    difficulty: 'mid', min_combat_level: 90,
    requirements: { skills: { Magic: 80 }, quests: ['Azzanadra\'s Quest'] },
    drops: [
      { name: 'Wand of the Cywir Elders (T85 magic)' },
      { name: 'Cywir orb (T85 magic offhand)' },
      { name: 'Anima core of Seren armour (T80 magic power)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Helwyr' },

  { id: 'twin_furies',       name: 'Twin Furies',               difficulty: 'mid', min_combat_level: 90,
    requirements: { skills: { Ranged: 80 }, quests: ['Azzanadra\'s Quest'] },
    drops: [
      { name: 'Blade of Nymora (T85 melee main-hand)' },
      { name: 'Blade of Avaryss (T85 melee off-hand)' },
      { name: 'Anima core of Zamorak armour (T80 melee power)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Twin_Furies' },

  { id: 'gregorovic',        name: 'Gregorovic',                difficulty: 'mid', min_combat_level: 90,
    requirements: { skills: { Ranged: 80 }, quests: ['Azzanadra\'s Quest'] },
    drops: [
      { name: 'Shadow glaive (T75 ranged main-hand)' },
      { name: 'Off-hand shadow glaive (T75 ranged off-hand)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Gregorovic' },

  // ── Other sources ─────────────────────────────────────────────────────────
  { id: 'barrows_rots',      name: 'Barrows: Rise of the Six',  difficulty: 'end', min_combat_level: 100,
    requirements: { skills: { Attack: 80, Ranged: 80, Magic: 80 }, quests: ['Ritual of the Mahjarrat'] },
    drops: [
      { name: 'Malevolent energy (→ Malevolent armour T90 melee)' },
      { name: 'Sirenic scales (→ Sirenic armour T90 ranged)' },
      { name: 'Tectonic energy (→ Tectonic armour T90 magic) — via Vorago also' },
      { name: 'Merciless kiteshield (T90 magic offhand)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Barrows:_Rise_of_the_Six' },

  { id: 'rune_dragons',      name: 'Rune Dragons',              difficulty: 'end', min_combat_level: 100,
    requirements: { skills: { Defence: 80, Slayer: 1 }, quests: ['Dragon Slayer'] },
    drops: [
      { name: 'Flarefrost boots (upgrade from Glaiven boots + Glaiven wing-tips)' },
      { name: 'Steadfast scale (→ upgrades Steadfast boots)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Rune_dragon' },

  { id: 'adamant_dragons',   name: 'Adamant Dragons',           difficulty: 'end', min_combat_level: 100,
    requirements: { skills: { Defence: 80 }, quests: ['Dragon Slayer'] },
    drops: [
      { name: 'Dragon full helm (rare, 1/5000)' },
    ],
    wiki_url: 'https://runescape.wiki/w/Adamant_dragon' },

  { id: 'wilderness_slayer', name: 'Wilderness Slayer (Mandrith)', difficulty: 'end', min_combat_level: 80,
    requirements: { skills: { Slayer: 1 }, quests: [] },
    drops: [
      { name: 'Decimation (T87 ranged bow) — Wilderness Slayer chest' },
      { name: 'Obliteration (T87 melee whip) — Wilderness Slayer chest' },
      { name: 'Annihilation (T87 magic staff) — Wilderness Slayer chest' },
    ],
    wiki_url: 'https://runescape.wiki/w/Wilderness_Slayer_chest' },
];

// ══════════════════════════════════════════════════════════════════════════════
// 2. MILESTONE ITEMS (comprehensive RS3 important items for GIM)
// ══════════════════════════════════════════════════════════════════════════════
const MILESTONES = [
  // ── Cape milestones ───────────────────────────────────────────────────────
  { id: 'fire_cape', name: 'Fire Cape', category: 'pvm_drop', tier_impact: 'medium',
    why_important: 'First major combat cape. Required to access the Fight Kiln for TokHaar-Kal capes.',
    how_to_obtain: 'Defeat TzTok-Jad in the Fight Caves.',
    gim_notes: 'Every group member should aim to get this early. Each player needs their own.',
    wiki_url: 'https://runescape.wiki/w/Fire_cape' },

  { id: 'quest_cape', name: 'Quest Cape', category: 'achievement', tier_impact: 'high',
    why_important: 'Completing all quests unlocks every quest reward and skill requirement. Grants the Quest point cape (cosmetic), access to the Legends Guild, and proves mastery of RS3 lore and mechanics.',
    how_to_obtain: 'Complete all available quests in RuneScape 3.',
    gim_notes: 'GIM groups share quest point requirements — completing quests enables group-wide content access.',
    wiki_url: 'https://runescape.wiki/w/Quest_point_cape' },

  { id: 'completionist_cape', name: 'Completionist Cape', category: 'achievement', tier_impact: 'critical',
    why_important: 'The Completionist Cape is the ultimate prestige cape, requiring all quests, achievements, diaries, and major milestones. Has excellent stats including +4 to all prayers.',
    how_to_obtain: 'Complete all quests, Achievement Diaries, minigames, and most major activities in RS3.',
    gim_notes: 'A long-term group goal. Each member working toward it drives progression across all content areas.',
    wiki_url: 'https://runescape.wiki/w/Completionist_cape' },

  // ── Overloads / Prayer ────────────────────────────────────────────────────
  { id: 'overloads', name: 'Overloads (Herblore 96)', category: 'skilling', tier_impact: 'critical',
    why_important: 'Overloads boost all combat stats by 15% above their boosted level, massively increasing DPS and defence. Considered the single most impactful combat consumable in RS3. Supreme overloads (99 Herblore) are even stronger.',
    how_to_obtain: 'Mix at 96 Herblore. Requires 4-dose extreme attack, strength, defence, ranged, and magic potions.',
    gim_notes: 'GIM groups can pool herbs and potions for efficient Herblore training. Getting one member to 96 Herblore first allows the whole group to benefit.',
    wiki_url: 'https://runescape.wiki/w/Overload' },

  { id: 'soul_split', name: 'Soul Split (Prayer 92)', category: 'skilling', tier_impact: 'critical',
    why_important: "Soul Split is the curses equivalent of a healing prayer, restoring life points equal to a fraction of damage dealt. It's the most used prayer in high-level PvM, enabling near-infinite sustain without food at most bosses.",
    how_to_obtain: "Complete 'The Temple at Senntisten' quest to unlock the Ancient Curses, then train Prayer to 92.",
    gim_notes: 'Getting every member to 92 Prayer is a top group priority. Allows efficient bossing without expensive food.',
    wiki_url: 'https://runescape.wiki/w/Soul_Split' },

  { id: 'turmoil', name: 'Turmoil / Anguish / Torment (Prayer 95)', category: 'skilling', tier_impact: 'high',
    why_important: 'The T95 curses (Turmoil for Melee, Anguish for Ranged, Torment for Magic) provide a massive 10–15% damage boost and are essential for high-level PvM.',
    how_to_obtain: 'Train Prayer to 95 (unlocked via the Ancient Curses after Temple at Senntisten).',
    gim_notes: 'Combined with Soul Split, 95 Prayer makes every member significantly stronger at bosses.',
    wiki_url: 'https://runescape.wiki/w/Turmoil' },

  // ── Invention ─────────────────────────────────────────────────────────────
  { id: 'invention_unlock', name: 'Invention Unlocked', category: 'skilling', tier_impact: 'critical',
    why_important: 'Invention (the elite skill) allows augmenting weapons, armour, and tools with powerful perks. Augmented gear with correct perks can increase DPS by 15–30% or more. Every high-level player needs Invention.',
    how_to_obtain: 'Train Attack, Ranged, and Magic to 80, plus Smithing and Crafting to 80, then complete the Invention tutorial.',
    gim_notes: 'All group members should unlock Invention as soon as possible. Augmenting weapons and armour is the biggest single DPS upgrade available.',
    wiki_url: 'https://runescape.wiki/w/Invention' },

  { id: 'biting_4', name: 'Biting 4 Perk (Invention)', category: 'skilling', tier_impact: 'high',
    why_important: "Biting 4 is the strongest weapon perk in the game, adding up to +8% critical hit chance. Combined with other perks (Aftershock, Precise, Equilibrium), it forms the optimal weapon perk setup that most high-level players aspire to.",
    how_to_obtain: 'Created via Invention at a Workbench using 9 Noxious components (extremely rare, ~1 in 34,000 chance each roll).',
    gim_notes: "Biting 4 on a weapon is a major milestone. GIM groups should note that Noxious weapons (from Araxxi) are disassembled for Noxious components — check who needs the weapon first.",
    wiki_url: 'https://runescape.wiki/w/Biting' },

  // ── Archaeology ───────────────────────────────────────────────────────────
  { id: 'archaeology_relics', name: 'Archaeology Relic Powers', category: 'skilling', tier_impact: 'high',
    why_important: 'Archaeology allows equipping Relic Powers that provide passive combat and skilling bonuses. Key relics include: Wisdom (XP boost), Fury of the Small (ability damage boost), Berserker\'s Fury (+2.5% max hit), and Death Ward (death protection). These are permanent passive boosts that require no prayer points.',
    how_to_obtain: 'Train Archaeology to various levels to excavate and restore artefacts that unlock relics.',
    gim_notes: 'Getting group members key Archaeology relics (especially combat relics) is a significant DPS boost with no upkeep cost.',
    wiki_url: 'https://runescape.wiki/w/Relic_power' },

  // ── Amulets ───────────────────────────────────────────────────────────────
  { id: 'amulet_fury', name: 'Amulet of Fury', category: 'pvm_drop', tier_impact: 'medium',
    why_important: 'The Amulet of Fury is the best all-around mid-game amulet before the Saradomin\'s hiss/farsight/murmur and provides strong bonuses for all combat styles.',
    how_to_obtain: 'Craft an Onyx amulet (90 Crafting) or purchase from Grand Exchange.',
    gim_notes: 'A priority item before GWD-tier content. Each member should aim to have one.',
    wiki_url: 'https://runescape.wiki/w/Amulet_of_fury' },

  { id: 'amulet_souls', name: "Amulet of Souls (T80 Necromancy)", category: 'pvm_drop', tier_impact: 'high',
    why_important: "The Amulet of Souls is the best Necromancy amulet and one of the top amulets overall. Provides +15% Necromancy bonus damage and enhances Soul Split's healing — a huge quality-of-life upgrade for any prayer-sustaining playstyle.",
    how_to_obtain: 'Obtained from Slayer creatures (Edimmu, found in Daemonheim) or the Grand Exchange.',
    gim_notes: 'Excellent for Necromancy users and anyone who relies on Soul Split extensively.',
    wiki_url: 'https://runescape.wiki/w/Amulet_of_souls' },

  // ── Dungeoneering rewards ─────────────────────────────────────────────────
  { id: 'chaotic_weapons', name: 'Chaotic Weapons (T80 via Dungeoneering)', category: 'skilling', tier_impact: 'medium',
    why_important: 'Chaotic weapons (rapier, longsword, maul, crossbow, staff, spear) were the first T80 weapons available and are still a significant power spike over T70 GWD weapons. Require 80 Dungeoneering and 80 in the relevant combat skill.',
    how_to_obtain: 'Purchase from the Dungeoneering rewards shop for Dungeoneering tokens (80 Dungeoneering required).',
    gim_notes: 'Group Dungeoneering speeds up token gain significantly. Great GIM group activity with shared benefits.',
    wiki_url: 'https://runescape.wiki/w/Chaotic_weapons' },

  { id: 'demon_horn_necklace', name: 'Demon Horn Necklace (Dungeoneering)', category: 'skilling', tier_impact: 'medium',
    why_important: 'The Demon Horn Necklace restores prayer points when killing demons. When combined with the Bonecrusher (auto-buries bones), it enables infinite prayer at demon slayer tasks and many bosses — completely eliminating prayer upkeep costs.',
    how_to_obtain: 'Purchase from the Dungeoneering rewards shop (80 Dungeoneering required).',
    gim_notes: 'Combined with Bonecrusher, allows group members to train Slayer or boss with nearly free prayer.',
    wiki_url: 'https://runescape.wiki/w/Demon_horn_necklace' },

  // ── Dragon tier ───────────────────────────────────────────────────────────
  { id: 'dragon_pickaxe', name: 'Dragon Pickaxe', category: 'pvm_drop', tier_impact: 'medium',
    why_important: 'The Dragon Pickaxe is the best pickaxe before the Pickaxe of Earth and Song (T70 equivalent). Its special attack temporarily boosts Mining by 3 levels, useful for reaching ore nodes. Essential for group Mining goals.',
    how_to_obtain: 'Drops from Chaos Elemental (Wilderness) or purchased from Grand Exchange.',
    gim_notes: 'GIM groups only need 1-2 to share Mining boosts. A priority early Wilderness drop.',
    wiki_url: 'https://runescape.wiki/w/Dragon_pickaxe' },

  { id: 'abyssal_whip', name: 'Abyssal Whip', category: 'pvm_drop', tier_impact: 'medium',
    why_important: 'The Abyssal Whip is a T70 1H melee weapon and the best pre-GWD main-hand weapon for Slayer and mid-game bossing. Fast, accurate, and effective against most enemies.',
    how_to_obtain: 'Drops from Abyssal demons (85 Slayer required) in the Slayer Tower or Abyss.',
    gim_notes: 'Each melee member should aim for this before attempting GWD. Can be shared via Group Storage.',
    wiki_url: 'https://runescape.wiki/w/Abyssal_whip' },

  // ── First T90/T92 weapons ─────────────────────────────────────────────────
  { id: 'first_t90_weapon', name: 'First T90 Weapon', category: 'pvm_drop', tier_impact: 'critical',
    why_important: 'Upgrading to T90 weapons (Drygore, Ascension crossbow, Noxious weapons, or Chaotic+) is the single biggest DPS upgrade a player can make moving into end-game content. A group milestone that unlocks viable high-level PvM.',
    how_to_obtain: 'Sources: Drygore (Kalphite King), Ascension crossbow (Legiones), Noxious weapons (Araxxor/Araxxi), Seismic weapons (Vorago).',
    gim_notes: 'Prioritise getting at least one member to T90 weapons so the group can farm end-game content more efficiently.',
    wiki_url: 'https://runescape.wiki/w/Weapons' },

  { id: 'first_t92_weapon', name: 'First T92 Weapon', category: 'pvm_drop', tier_impact: 'critical',
    why_important: 'T92 weapons (Zaros godsword, Seren godbow, Staff of Sliske from Telos; Eldritch crossbow from ED3; FSoA from Kerapac) represent the pinnacle of RS3 combat equipment for most content.',
    how_to_obtain: 'Various end-game bosses. Telos drops ZGS/SGB/SoS. Kerapac drops FSoA. Ambassador drops Eldritch crossbow.',
    gim_notes: 'A defining group milestone. Each style\'s T92 weapon should be a long-term group goal.',
    wiki_url: 'https://runescape.wiki/w/Weapons' },

  // ── Max cape ──────────────────────────────────────────────────────────────
  { id: 'max_cape', name: 'Max Cape', category: 'achievement', tier_impact: 'critical',
    why_important: 'The Max Cape requires all skills to be level 99. It provides excellent combat stats and the ability to combine with skillcapes for additional perks. A major personal prestige milestone.',
    how_to_obtain: 'Achieve level 99 in all skills (27 skills total).',
    gim_notes: 'A long-term goal for dedicated group members. Shared skilling activities speed up many of these 99s.',
    wiki_url: 'https://runescape.wiki/w/Max_cape' },

  // ── Cinderbane + utility ──────────────────────────────────────────────────
  { id: 'cinderbane_gloves', name: 'Cinderbane Gloves', category: 'pvm_drop', tier_impact: 'high',
    why_important: "Cinderbane Gloves (T70) apply poison on every hit, stacking with existing poisons. Against poisonable enemies, they outperform T90 gloves. Best-in-slot for most Slayer tasks and many bosses including Nex, KK, and others.",
    how_to_obtain: 'Drops from Raksha, the Shadow Colossus (requires 96 Slayer and Extinction quest).',
    gim_notes: 'A high priority for all group members. Even Raksha trash loot can fund other gear.',
    wiki_url: 'https://runescape.wiki/w/Cinderbane_gloves' },

  { id: 'animate_dead', name: 'Animate Dead Codex', category: 'pvm_drop', tier_impact: 'high',
    why_important: "Animate Dead is a magic ability that creates spectral undead providing a persistent damage reduction shield based on tank armour rating. Dramatically increases survivability in high-level PvM for magic users or anyone wearing tank armour.",
    how_to_obtain: 'Drops from Croesus (skilling boss). Requires Extinction quest.',
    gim_notes: 'A group priority — having even one member with Animate Dead makes group bossing significantly safer.',
    wiki_url: 'https://runescape.wiki/w/Animate_Dead' },

  // ── Full Barrows ──────────────────────────────────────────────────────────
  { id: 'full_guthan', name: "Full Guthan's Armour Set", category: 'pvm_drop', tier_impact: 'medium',
    why_important: "Guthan's 4-piece set effect heals the wearer when dealing melee damage. Excellent for low-effort Slayer tasks, afk training, and healing between kills without food.",
    how_to_obtain: 'Obtained piece-by-piece from Barrows (requires 70 Attack/Strength/Defence and completion of Priest in Peril).',
    gim_notes: 'Worth having one set in the group vault for shared use during Slayer or training.',
    wiki_url: "https://runescape.wiki/w/Guthan's_armour" },

  // ── Spirit shields ────────────────────────────────────────────────────────
  { id: 'elysian_spirit_shield', name: 'Elysian Spirit Shield', category: 'pvm_drop', tier_impact: 'high',
    why_important: 'The Elysian Spirit Shield has a 70% chance to reduce incoming damage by 25%. It is the best-in-slot defensive shield for protecting against large hits at challenging bosses.',
    how_to_obtain: 'Combine a Spirit shield with an Elysian sigil (from the Corporeal Beast) using 90 Prayer and 85 Smithing.',
    gim_notes: 'An excellent group investment for use during learning phases at hard bosses.',
    wiki_url: 'https://runescape.wiki/w/Elysian_spirit_shield' },
];

// ══════════════════════════════════════════════════════════════════════════════
// 3. SKILL MILESTONES (key levels per skill that unlock important content)
// ══════════════════════════════════════════════════════════════════════════════
const SKILL_MILESTONES = [

  // ── ATTACK (max 99) ───────────────────────────────────────────────────────
  { id: 'attack_50',  skill: 'Attack',  level: 50,  description: 'Rune weapons usable (T50) — best weapons before Dragon; significant early milestone', unlock_type: 'item',    wiki_url: 'https://runescape.wiki/w/Rune_scimitar' },
  { id: 'attack_60',  skill: 'Attack',  level: 60,  description: 'Dragon weapons usable (Dragon scimitar, longsword, etc.) — significant mid-early upgrade', unlock_type: 'item',    wiki_url: 'https://runescape.wiki/w/Dragon_scimitar' },
  { id: 'attack_70',  skill: 'Attack',  level: 70,  description: 'T70 weapons: Abyssal whip (85 Slayer), Godsword variants, Saradomin sword', unlock_type: 'item',    wiki_url: 'https://runescape.wiki/w/Abyssal_whip' },
  { id: 'attack_80',  skill: 'Attack',  level: 80,  description: 'Chaotic rapier/longsword/maul (80 Dungeoneering) — best pre-GWD2 melee weapons', unlock_type: 'item',    wiki_url: 'https://runescape.wiki/w/Chaotic_rapier' },
  { id: 'attack_85',  skill: 'Attack',  level: 85,  description: 'Dragon Rider lance (T85, best-in-slot 2H melee before T90)', unlock_type: 'item',    wiki_url: 'https://runescape.wiki/w/Dragon_Rider_lance' },
  { id: 'attack_90',  skill: 'Attack',  level: 90,  description: 'Drygore weapons (T90, Kalphite King) — top-tier melee until Zaros godsword', unlock_type: 'item',    wiki_url: 'https://runescape.wiki/w/Drygore_rapier' },
  { id: 'attack_92',  skill: 'Attack',  level: 92,  description: 'Zaros godsword (T92, best-in-slot melee + powerful spec attack)', unlock_type: 'item',    wiki_url: 'https://runescape.wiki/w/Zaros_godsword' },

  // ── STRENGTH (max 99) ─────────────────────────────────────────────────────
  { id: 'strength_60', skill: 'Strength', level: 60, description: 'Dragon dagger special attack (poison+, high burst damage)', unlock_type: 'ability',  wiki_url: 'https://runescape.wiki/w/Dragon_dagger' },
  { id: 'strength_80', skill: 'Strength', level: 80, description: 'Access to Strength-requirement T80 melee weapons and armour effects', unlock_type: 'item',    wiki_url: 'https://runescape.wiki/w/Strength' },

  // ── DEFENCE (max 99) ──────────────────────────────────────────────────────
  { id: 'defence_50',  skill: 'Defence',  level: 50,  description: 'Rune armour usable (T50) — full Rune set; significant early defence upgrade', unlock_type: 'item',    wiki_url: 'https://runescape.wiki/w/Rune_platebody' },
  { id: 'defence_60',  skill: 'Defence',  level: 60,  description: 'Dragon armour usable (full dragon set)', unlock_type: 'item',    wiki_url: 'https://runescape.wiki/w/Dragon_platebody' },
  { id: 'defence_70',  skill: 'Defence',  level: 70,  description: 'T70 power armour: Bandos (melee), Armadyl (ranged), Subjugation (magic) — core GWD1 armour tier', unlock_type: 'item',    wiki_url: 'https://runescape.wiki/w/Bandos_chestplate' },
  { id: 'defence_80',  skill: 'Defence',  level: 80,  description: 'Anima core armour (GWD2) — T80 power armour from Zaros/Seren/Zaros bosses', unlock_type: 'item',    wiki_url: 'https://runescape.wiki/w/Anima_core_of_Zaros' },
  { id: 'defence_90',  skill: 'Defence',  level: 90,  description: 'T90 power armour: Malevolent (melee), Sirenic (ranged), Tectonic (magic) via crafting', unlock_type: 'item',    wiki_url: 'https://runescape.wiki/w/Malevolent_armour' },

  // ── RANGED (max 99) ───────────────────────────────────────────────────────
  { id: 'ranged_70',  skill: 'Ranged',  level: 70,  description: 'Armadyl crossbow + armour (T70 ranged power armour from GWD1)', unlock_type: 'item',    wiki_url: 'https://runescape.wiki/w/Armadyl_crossbow' },
  { id: 'ranged_80',  skill: 'Ranged',  level: 80,  description: 'Chaotic crossbow (T80, 80 Dungeoneering) — best pre-Ascension ranged weapon', unlock_type: 'item',    wiki_url: 'https://runescape.wiki/w/Chaotic_crossbow' },
  { id: 'ranged_90',  skill: 'Ranged',  level: 90,  description: 'Ascension crossbow (T90, Legiones 95 Slayer) — premier ranged weapon', unlock_type: 'item',    wiki_url: 'https://runescape.wiki/w/Ascension_crossbow' },
  { id: 'ranged_92',  skill: 'Ranged',  level: 92,  description: 'Sirenic armour (T90 power ranged armour via crafting)', unlock_type: 'item',    wiki_url: 'https://runescape.wiki/w/Sirenic_hauberk' },

  // ── MAGIC (max 99) ────────────────────────────────────────────────────────
  { id: 'magic_70',   skill: 'Magic',   level: 70,  description: 'Ancient Magicks (Desert Treasure) — Ice Barrage, Shadow Barrage; T70 magic weapons usable', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Ancient_Magicks' },
  { id: 'magic_80',   skill: 'Magic',   level: 80,  description: 'Invention prerequisite (80 Attack + Defence + Magic); Polypore staff (T75)', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Invention' },
  { id: 'magic_92',   skill: 'Magic',   level: 92,  description: 'Animate Dead — summon skeletal armour from worn equipment, powerful defensive proc', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Animate_Dead' },
  { id: 'magic_99',   skill: 'Magic',   level: 99,  description: 'Magic cape (teleport to any altar once per day); max magic damage cap', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Magic_cape' },

  // ── PRAYER (max 120) ──────────────────────────────────────────────────────
  { id: 'prayer_70',  skill: 'Prayer',  level: 70,  description: 'Piety / Rigour / Augury — T2 combat prayers (boost stats by 8–10%); need Knight Waves quest', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Piety' },
  { id: 'prayer_71',  skill: 'Prayer',  level: 71,  description: 'Deflect Melee — active melee protection curse (Ancient Curses)', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Deflect_Melee' },
  { id: 'prayer_73',  skill: 'Prayer',  level: 73,  description: 'Deflect Ranged — active ranged protection curse', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Deflect_Ranged' },
  { id: 'prayer_75',  skill: 'Prayer',  level: 75,  description: 'Deflect Magic — active magic protection curse; full protection set complete', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Deflect_Magic' },
  { id: 'prayer_89',  skill: 'Prayer',  level: 89,  description: 'Wrath — on death, deal AoE damage proportional to your Prayer level (useful in group scenarios)', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Wrath' },
  { id: 'prayer_92',  skill: 'Prayer',  level: 92,  description: 'Soul Split — heal from damage dealt; enables near-infinite sustain at most bosses', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Soul_Split' },
  { id: 'prayer_95',  skill: 'Prayer',  level: 95,  description: 'Turmoil / Anguish / Torment — T3 curses that drain opponent stats; massive DPS gain over Piety', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Turmoil' },
  { id: 'prayer_99',  skill: 'Prayer',  level: 99,  description: 'Malevolence (melee) / Affliction (ranged) / Desolation (magic) — strongest combat curses; significant upgrade over Turmoil tier', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Malevolence' },
  { id: 'prayer_120', skill: 'Prayer',  level: 120, description: 'True skill mastery — Prayer master cape', unlock_type: 'reward',  wiki_url: 'https://runescape.wiki/w/Prayer_master_cape' },

  // ── SLAYER (max 120) ──────────────────────────────────────────────────────
  { id: 'slayer_58',  skill: 'Slayer',  level: 58,  description: 'Cave Horror → Black mask — upgraded to Slayer helmet (+12.5% melee accuracy/damage on task)', unlock_type: 'creature', wiki_url: 'https://runescape.wiki/w/Cave_horror' },
  { id: 'slayer_67',  skill: 'Slayer',  level: 67,  description: 'Automatons → Static/Tracking/Pneumatic gloves (T70 BiS gloves all styles) + Cresbot', unlock_type: 'creature', wiki_url: 'https://runescape.wiki/w/Automaton_Guardian' },
  { id: 'slayer_72',  skill: 'Slayer',  level: 72,  description: 'Skeletal Wyvern → Granite legs (T50 power armour legs)', unlock_type: 'creature', wiki_url: 'https://runescape.wiki/w/Skeletal_wyvern' },
  { id: 'slayer_75',  skill: 'Slayer',  level: 75,  description: 'Gargoyle → Granite maul (T50, popular fast special attack weapon)', unlock_type: 'creature', wiki_url: 'https://runescape.wiki/w/Gargoyle' },
  { id: 'slayer_83',  skill: 'Slayer',  level: 83,  description: 'Spiritual Mage (GWD) → Dragon boots — best-in-slot melee boots before T70 gloves', unlock_type: 'creature', wiki_url: 'https://runescape.wiki/w/Spiritual_mage' },
  { id: 'slayer_85',  skill: 'Slayer',  level: 85,  description: 'Abyssal Demon → Abyssal whip/wand/orb (T70); access to Morvran slayer master (Prifddinas)', unlock_type: 'creature', wiki_url: 'https://runescape.wiki/w/Abyssal_demon' },
  { id: 'slayer_88',  skill: 'Slayer',  level: 88,  description: 'Sophanem Slayer Dungeon access — corrupted creatures drop Vital sparks for Khopesh (T82)', unlock_type: 'creature', wiki_url: 'https://runescape.wiki/w/Sophanem_Slayer_Dungeon' },
  { id: 'slayer_90',  skill: 'Slayer',  level: 90,  description: 'Dark Beast (Dark bow), Edimmu (Blood necklace shard); Laniakea slayer master (Anachronia)', unlock_type: 'creature', wiki_url: 'https://runescape.wiki/w/Dark_beast' },
  { id: 'slayer_92',  skill: 'Slayer',  level: 92,  description: 'Airut → Razorback gauntlets (T75); Araxxor/Araxxi fully accessible (T90 Noxious weapons)', unlock_type: 'boss',     wiki_url: 'https://runescape.wiki/w/Araxxor' },
  { id: 'slayer_93',  skill: 'Slayer',  level: 93,  description: 'Ice Strykewyrm → Staff of light (T75 magic, halves melee damage special attack)', unlock_type: 'creature', wiki_url: 'https://runescape.wiki/w/Ice_strykewyrm' },
  { id: 'slayer_94',  skill: 'Slayer',  level: 94,  description: 'Lava Strykewyrm (Wilderness) → Wyrm spike/heart/scalp — used to upgrade T90 weapons', unlock_type: 'creature', wiki_url: 'https://runescape.wiki/w/Lava_strykewyrm' },
  { id: 'slayer_95',  skill: 'Slayer',  level: 95,  description: 'Legiones → Ascension crossbow (T90 ranged main-hand); Morvran tasks now fully unlocked', unlock_type: 'boss',     wiki_url: 'https://runescape.wiki/w/Legiones' },
  { id: 'slayer_96',  skill: 'Slayer',  level: 96,  description: 'Ripper Demon (claw), Wyvern (crossbow), Camel Warrior (staff), Acheron Mammoth (tusk) — Raptor Key set', unlock_type: 'creature', wiki_url: 'https://runescape.wiki/w/Ripper_demon' },
  { id: 'slayer_99',  skill: 'Slayer',  level: 99,  description: 'Soulgazer → Hexhunter bow (T80, +dmg vs magic users); Slayer cape; Slayer codex souls', unlock_type: 'creature', wiki_url: 'https://runescape.wiki/w/Soulgazer' },
  { id: 'slayer_104', skill: 'Slayer',  level: 104, description: 'Lost Grove creatures → Cinderbane gloves (BiS all-style gloves, passive poison) + Ancient ritual shard', unlock_type: 'creature', wiki_url: 'https://runescape.wiki/w/Cinderbane_gloves' },
  { id: 'slayer_105', skill: 'Slayer',  level: 105, description: 'Abyssal Beast → Jaws of the Abyss (T85 melee helmet with passive)', unlock_type: 'creature', wiki_url: 'https://runescape.wiki/w/Abyssal_beast' },
  { id: 'slayer_115', skill: 'Slayer',  level: 115, description: 'Abyssal Lord → Abyssal scourge (T92 melee off-hand, BiS); The Magister (Khopesh T82)', unlock_type: 'boss',     wiki_url: 'https://runescape.wiki/w/Abyssal_lord' },
  { id: 'slayer_120', skill: 'Slayer',  level: 120, description: 'True mastery — Slayer master cape, doubled soul-capture chance in the Slayer Codex', unlock_type: 'reward',   wiki_url: 'https://runescape.wiki/w/Slayer_master_cape' },

  // ── HERBLORE (max 120) ────────────────────────────────────────────────────
  { id: 'herblore_81',  skill: 'Herblore', level: 81,  description: 'Saradomin brew — heal without losing combat levels (stat restore with super restore); enables safer learning at bosses', unlock_type: 'consumable', wiki_url: 'https://runescape.wiki/w/Saradomin_brew' },
  { id: 'herblore_85',  skill: 'Herblore', level: 85,  description: 'Super antifire potion — full protection from dragonfire without an antifire shield; frees up offhand slot for dragons', unlock_type: 'consumable', wiki_url: 'https://runescape.wiki/w/Super_antifire' },
  { id: 'herblore_88',  skill: 'Herblore', level: 88,  description: 'Extreme attack — ingredient for Overload; +14 Attack bonus', unlock_type: 'consumable', wiki_url: 'https://runescape.wiki/w/Extreme_attack' },
  { id: 'herblore_90',  skill: 'Herblore', level: 90,  description: 'Extreme defence — all three Extreme potions (88–91) are Overload prerequisites', unlock_type: 'consumable', wiki_url: 'https://runescape.wiki/w/Extreme_defence' },
  { id: 'herblore_91',  skill: 'Herblore', level: 91,  description: 'Extreme magic and Extreme ranging — complete the Overload prerequisite chain', unlock_type: 'consumable', wiki_url: 'https://runescape.wiki/w/Extreme_magic' },
  { id: 'herblore_96',  skill: 'Herblore', level: 96,  description: 'Overload — boosts all combat stats by 15% + 3 for 6 minutes; the most important bossing consumable', unlock_type: 'consumable', wiki_url: 'https://runescape.wiki/w/Overload' },
  { id: 'herblore_97',  skill: 'Herblore', level: 97,  description: 'Overload salve (prayer restore on drink) + Holy overload (add prayer renewal)', unlock_type: 'consumable', wiki_url: 'https://runescape.wiki/w/Overload_salve' },
  { id: 'herblore_98',  skill: 'Herblore', level: 98,  description: 'Supreme overload salve — strongest overload variant; adds Prayer renewal + bonus combat stats', unlock_type: 'consumable', wiki_url: 'https://runescape.wiki/w/Supreme_overload_salve' },
  { id: 'herblore_106', skill: 'Herblore', level: 106, description: 'Elder overload — +17% + 3 to combat stats; strongest possible combat potion in the game', unlock_type: 'consumable', wiki_url: 'https://runescape.wiki/w/Elder_overload_potion' },
  { id: 'herblore_107', skill: 'Herblore', level: 107, description: 'Elder overload salve — Elder overload + Prayer renewal + stat restore combined', unlock_type: 'consumable', wiki_url: 'https://runescape.wiki/w/Elder_overload_salve' },
  { id: 'herblore_120', skill: 'Herblore', level: 120, description: 'True mastery — Herblore master cape; batch Elder overload creation via cape perk', unlock_type: 'reward',    wiki_url: 'https://runescape.wiki/w/Herblore_master_cape' },

  // ── FARMING (max 120) ─────────────────────────────────────────────────────
  { id: 'farming_75',  skill: 'Farming',  level: 75,  description: 'Harmony moss trees (Prifddinas pillars) — useful for combo farming runs', unlock_type: 'item',    wiki_url: 'https://runescape.wiki/w/Harmony_moss_seed' },
  { id: 'farming_83',  skill: 'Farming',  level: 83,  description: 'Spirit trees (1 patch) — free teleport to any Spirit tree globally; expands travel options', unlock_type: 'item',    wiki_url: 'https://runescape.wiki/w/Spirit_tree_patch' },
  { id: 'farming_85',  skill: 'Farming',  level: 85,  description: 'Torstol herb — required for Overloads; final standard herb tier', unlock_type: 'item',    wiki_url: 'https://runescape.wiki/w/Torstol' },
  { id: 'farming_90',  skill: 'Farming',  level: 90,  description: 'Elder trees + Croesus skilling boss access; elder logs for elder rune smithing', unlock_type: 'boss',    wiki_url: 'https://runescape.wiki/w/Croesus' },
  { id: 'farming_99',  skill: 'Farming',  level: 99,  description: 'Farming cape + Money tree seeds (passive GP via farming runs)', unlock_type: 'reward',  wiki_url: 'https://runescape.wiki/w/Money_tree' },
  { id: 'farming_110', skill: 'Farming',  level: 110, description: 'Plant Power tier 4 (Sydekix\'s Shop of Balance) — passive farming XP bonuses', unlock_type: 'reward',  wiki_url: 'https://runescape.wiki/w/Farming' },
  { id: 'farming_115', skill: 'Farming',  level: 115, description: '4th simultaneous Spirit tree patch (requires Plague\'s End + Prisoner of Glouphrie)', unlock_type: 'item',    wiki_url: 'https://runescape.wiki/w/Spirit_tree_patch' },
  { id: 'farming_120', skill: 'Farming',  level: 120, description: 'True mastery — Farming master cape; triple Master farmer fragment collection', unlock_type: 'reward',  wiki_url: 'https://runescape.wiki/w/Farming_master_cape' },

  // ── DUNGEONEERING (max 120) ───────────────────────────────────────────────
  { id: 'dungeoneering_48',  skill: 'Dungeoneering', level: 48,  description: 'Tome of frost — unlimited water runes for magic; massive magic cost reduction', unlock_type: 'reward',  wiki_url: 'https://runescape.wiki/w/Tome_of_frost' },
  { id: 'dungeoneering_60',  skill: 'Dungeoneering', level: 60,  description: 'Ring of vigour (saves 10% adrenaline after ultimates) + Scroll of life + Scroll of cleansing', unlock_type: 'reward',  wiki_url: 'https://runescape.wiki/w/Ring_of_vigour' },
  { id: 'dungeoneering_75',  skill: 'Dungeoneering', level: 75,  description: 'Demon horn necklace — prayer points restored on burying bones/ashes; near-infinite prayer', unlock_type: 'reward',  wiki_url: 'https://runescape.wiki/w/Demon_horn_necklace' },
  { id: 'dungeoneering_80',  skill: 'Dungeoneering', level: 80,  description: 'Chaotic weapons (T80) — rapier, longsword, maul, crossbow, staff; best pre-GWD2 weapons for all styles', unlock_type: 'reward',  wiki_url: 'https://runescape.wiki/w/Chaotic_rapier' },
  { id: 'dungeoneering_95',  skill: 'Dungeoneering', level: 95,  description: 'Warped floors — highest tier Dungeoneering floors; best tokens/XP per hour', unlock_type: 'reward',  wiki_url: 'https://runescape.wiki/w/Dungeoneering' },
  { id: 'dungeoneering_99',  skill: 'Dungeoneering', level: 99,  description: 'Full reward shop access (Bonecrusher, Blood necklace shard, Slayer cape reroll); DG cape', unlock_type: 'reward',  wiki_url: 'https://runescape.wiki/w/Dungeoneering_cape' },
  { id: 'dungeoneering_120', skill: 'Dungeoneering', level: 120, description: 'True mastery — bind 5 equipment pieces; Primal armour/weapons (highest in-dungeon tier); DG master cape', unlock_type: 'reward',  wiki_url: 'https://runescape.wiki/w/Dungeoneering_master_cape' },

  // ── INVENTION (max 120) ───────────────────────────────────────────────────
  { id: 'invention_1',  skill: 'Invention', level: 1,   description: 'Disassemble + Charge pack — start converting gear into materials; unlock the augmentation system', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Invention' },
  { id: 'invention_2',  skill: 'Invention', level: 2,   description: 'Augment weapons and armour — gear can now be levelled up for XP and eventually siphoned/disassembled for materials', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Augmentation' },
  { id: 'invention_22', skill: 'Invention', level: 22,  description: 'First major DPS perks: Precise (improves minimum damage) and Equilibrium (flat damage range) available', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Precise' },
  { id: 'invention_27', skill: 'Invention', level: 27,  description: 'Equipment siphon — extract XP from augmented gear at item level 12+ without destroying it', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Equipment_siphon' },
  { id: 'invention_36', skill: 'Invention', level: 36,  description: 'Planted Feet perk (Aftershock base), Venomblood perk — core meta perks for PvM', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Planted_Feet' },
  { id: 'invention_55', skill: 'Invention', level: 55,  description: 'Aftershock, Biting (25% chance to apply a critical hit modifier) — crucial DPS perks', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Biting' },
  { id: 'invention_80', skill: 'Invention', level: 80,  description: 'Full perk system available; augment every gear slot; Crackling, Caroming, Devoted perks', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Crackling' },
  { id: 'invention_99', skill: 'Invention', level: 99,  description: 'Max augmented item level 20 (maximum XP per siphon); Invention cape; triple material drops', unlock_type: 'reward',  wiki_url: 'https://runescape.wiki/w/Invention_cape' },
  { id: 'invention_120',skill: 'Invention', level: 120, description: 'True mastery — Invention master cape; quad material disassembly chance', unlock_type: 'reward',  wiki_url: 'https://runescape.wiki/w/Invention_master_cape' },

  // ── ARCHAEOLOGY (max 120) ─────────────────────────────────────────────────
  { id: 'archaeology_5',   skill: 'Archaeology', level: 5,   description: 'Kharid-et dig site access; Font of Life relic (+500 max LP permanently)', unlock_type: 'relic',  wiki_url: 'https://runescape.wiki/w/Font_of_Life' },
  { id: 'archaeology_20',  skill: 'Archaeology', level: 20,  description: 'Infernal Source dig site (Zamorak lore artefacts)', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Infernal_Source_Dig_Site' },
  { id: 'archaeology_40',  skill: 'Archaeology', level: 40,  description: 'Research teams — dispatch crews for artefacts passively; Assistant qualification', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Research' },
  { id: 'archaeology_56',  skill: 'Archaeology', level: 56,  description: 'Berserker\'s Fury relic — deal up to +5.5% damage the lower your LP is; powerful passive for all styles', unlock_type: 'relic',  wiki_url: 'https://runescape.wiki/w/Berserker\'s_Fury' },
  { id: 'archaeology_60',  skill: 'Archaeology', level: 60,  description: 'Senntisten dig site; Pontifex shadow ring (artefact) — required for some elder god content', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Pontifex_shadow_ring' },
  { id: 'archaeology_70',  skill: 'Archaeology', level: 70,  description: 'Stormguard Citadel dig site; Inquisitor staff artefacts; Associate qualification', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Inquisitor_staff' },
  { id: 'archaeology_80',  skill: 'Archaeology', level: 80,  description: 'Bane mattock + Imcando mattock — high-tier excavation tools', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Archaeology' },
  { id: 'archaeology_81',  skill: 'Archaeology', level: 81,  description: 'Death Ward relic — 5% damage reduction below 50% LP; 10% below 25% LP; huge survivability boost', unlock_type: 'relic',  wiki_url: 'https://runescape.wiki/w/Death_Ward' },
  { id: 'archaeology_90',  skill: 'Archaeology', level: 90,  description: 'Orthen dig site — highest tier artefacts; Professor qualification; Elder rune mattock', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Orthen_Dig_Site' },
  { id: 'archaeology_97',  skill: 'Archaeology', level: 97,  description: 'Fury of the Small relic — all basic abilities generate +1% more adrenaline; top-tier adrenaline efficiency', unlock_type: 'relic',  wiki_url: 'https://runescape.wiki/w/Fury_of_the_Small' },
  { id: 'archaeology_98',  skill: 'Archaeology', level: 98,  description: 'Persistent Rage relic — adrenaline regenerates at 5%/1.2s outside combat; enter encounters with full adrenaline', unlock_type: 'relic',  wiki_url: 'https://runescape.wiki/w/Persistent_Rage' },
  { id: 'archaeology_99',  skill: 'Archaeology', level: 99,  description: 'Mattock of Time and Space (best excavation tool); Archaeology cape', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Mattock_of_Time_and_Space' },
  { id: 'archaeology_105', skill: 'Archaeology', level: 105, description: 'Heightened Senses relic — increases maximum adrenaline cap from 100% to 110%; massive combo with ring of vigour', unlock_type: 'relic',  wiki_url: 'https://runescape.wiki/w/Heightened_Senses' },
  { id: 'archaeology_118', skill: 'Archaeology', level: 118, description: 'Conservation of Energy relic — regain 10% adrenaline after using an ultimate ability; pairs with Heightened Senses', unlock_type: 'relic',  wiki_url: 'https://runescape.wiki/w/Conservation_of_Energy' },
  { id: 'archaeology_119', skill: 'Archaeology', level: 119, description: 'Inspire Awe relic — +2% XP in all combat skills; useful for skilling but primarily a cosmetic milestone', unlock_type: 'relic',  wiki_url: 'https://runescape.wiki/w/Inspire_Awe' },
  { id: 'archaeology_120', skill: 'Archaeology', level: 120, description: 'True mastery — Archaeology master cape; completion of all excavation sites', unlock_type: 'reward',  wiki_url: 'https://runescape.wiki/w/Archaeology_master_cape' },

  // ── NECROMANCY (max 120) ──────────────────────────────────────────────────
  { id: 'necromancy_2',   skill: 'Necromancy', level: 2,   description: 'Conjure Skeleton Warrior — first summoned undead; starts the Necromancy combat style', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Conjure_Skeleton_Warrior' },
  { id: 'necromancy_13',  skill: 'Necromancy', level: 13,  description: 'Touch of Death — basic adrenaline ability; Soul Sap foundation', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Touch_of_Death' },
  { id: 'necromancy_40',  skill: 'Necromancy', level: 40,  description: 'Conjure Putrid Zombie + Vengeful Ghost; T40 Necromancy weapons — first viable multi-conjure setup', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Conjure_Putrid_Zombie' },
  { id: 'necromancy_54',  skill: 'Necromancy', level: 54,  description: 'Soul Sap + Soul Strike — adrenaline generation abilities; core Necromancy rotation pieces', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Soul_Sap' },
  { id: 'necromancy_60',  skill: 'Necromancy', level: 60,  description: 'Tier 2 ritual site + T60 Deathdealer gear; Command abilities; 35% critical strike damage', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Necromancy' },
  { id: 'necromancy_70',  skill: 'Necromancy', level: 70,  description: 'T70 Deathdealer robes (power armour); Leech curses available; 40% crit damage — Necromancy becomes competitive', unlock_type: 'item',    wiki_url: 'https://runescape.wiki/w/Deathdealer_robe_top' },
  { id: 'necromancy_80',  skill: 'Necromancy', level: 80,  description: 'T80 Necromancy gear; Invoke Death incantation; 45% critical strike damage; Zemouregal\'s nexus', unlock_type: 'item',    wiki_url: 'https://runescape.wiki/w/Invoke_Death' },
  { id: 'necromancy_84',  skill: 'Necromancy', level: 84,  description: 'Maintain 4 simultaneous conjures — full conjure army (Warrior, Zombie, Ghost, + 1 more)', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Necromancy' },
  { id: 'necromancy_90',  skill: 'Necromancy', level: 90,  description: 'Tier 3 ritual site; Sorrow curse; 50% critical strike damage — Necromancy competitive with other styles at max', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Sorrow' },
  { id: 'necromancy_99',  skill: 'Necromancy', level: 99,  description: 'Conjure Undead Army (conjure all 4 at once in 1 global cooldown); Necromancy cape', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Conjure_Undead_Army' },
  { id: 'necromancy_120', skill: 'Necromancy', level: 120, description: 'True mastery — Necromancy master cape; max DPS through conjures and soul stack mechanics', unlock_type: 'reward',  wiki_url: 'https://runescape.wiki/w/Necromancy_master_cape' },

  // ── RUNECRAFTING (max 120) ────────────────────────────────────────────────
  { id: 'runecrafting_60',  skill: 'Runecrafting', level: 60,  description: 'Miasma runes (used for certain Necromancy rituals and alchemy)', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Miasma_rune' },
  { id: 'runecrafting_75',  skill: 'Runecrafting', level: 75,  description: 'Giant pouches (carry 12 essence per fill) — significantly speeds up RC runs', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Giant_pouch' },
  { id: 'runecrafting_77',  skill: 'Runecrafting', level: 77,  description: 'Blood runes — highest-value craftable rune; required for Ancient Magicks blood spells', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Blood_rune' },
  { id: 'runecrafting_90',  skill: 'Runecrafting', level: 90,  description: 'Soul runes (requires \'Phite Club quest) — highest value rune, used for Soul Split and high magic', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Soul_rune' },
  { id: 'runecrafting_99',  skill: 'Runecrafting', level: 99,  description: 'Runecrafting cape — enter Abyss without being skulled; teleport to any RC altar once per day', unlock_type: 'reward', wiki_url: 'https://runescape.wiki/w/Runecrafting_cape' },
  { id: 'runecrafting_100', skill: 'Runecrafting', level: 100, description: 'Time runes — new rune type unlocked at true level 100', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Time_rune' },
  { id: 'runecrafting_120', skill: 'Runecrafting', level: 120, description: 'True mastery — Runecrafting master cape; triple ethereal fragment collection rate', unlock_type: 'reward', wiki_url: 'https://runescape.wiki/w/Runecrafting_master_cape' },

  // ── SMITHING (max 120) ────────────────────────────────────────────────────
  { id: 'smithing_80',  skill: 'Smithing', level: 80,  description: 'Godsword blade smithing; Obsidian bars; Kethsian equipment; foundation for T80+ crafted gear', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Godsword_blade' },
  { id: 'smithing_90',  skill: 'Smithing', level: 90,  description: 'Elder rune equipment (T80+); Dragonfire shield/ward/deflector; Tetsu armour (ports upgrade)', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Elder_rune_equipment' },
  { id: 'smithing_99',  skill: 'Smithing', level: 99,  description: 'Full Masterwork armour (T90 melee power armour) + Trimmed Masterwork (add 99 Slayer); Smithing cape', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Masterwork_armour' },
  { id: 'smithing_120', skill: 'Smithing', level: 120, description: 'True mastery — Smithing master cape; double ore smelting perk', unlock_type: 'reward',  wiki_url: 'https://runescape.wiki/w/Smithing_master_cape' },

  // ── CRAFTING (max 120) ────────────────────────────────────────────────────
  { id: 'crafting_80',  skill: 'Crafting', level: 80,  description: 'Onyx jewellery including Amulet of fury (T70 neck, best general-purpose neck for most content)', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Amulet_of_fury' },
  { id: 'crafting_87',  skill: 'Crafting', level: 87,  description: 'Hydrix bolt tips and Onyx bracelets; key crafting levels for high-end jewellery', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Onyx_bracelet' },
  { id: 'crafting_90',  skill: 'Crafting', level: 90,  description: 'Hydrix gem jewellery — Amulet of souls (T90 neck, best for Soul Split efficiency)', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Amulet_of_souls' },
  { id: 'crafting_99',  skill: 'Crafting', level: 99,  description: 'Crafting cape; access to all gem/leather crafting; key for Sirenic/Malevolent/Tectonic armour assembly', unlock_type: 'reward',  wiki_url: 'https://runescape.wiki/w/Crafting_cape' },
  { id: 'crafting_120', skill: 'Crafting', level: 120, description: 'True mastery — Crafting master cape', unlock_type: 'reward',  wiki_url: 'https://runescape.wiki/w/Crafting_master_cape' },

  // ── AGILITY (max 120) ─────────────────────────────────────────────────────
  { id: 'agility_5',   skill: 'Agility',  level: 5,   description: 'Anachronia Agility Course entry — Double Surge / Double Escape codex pages drop from any section from level 5', unlock_type: 'course',  wiki_url: 'https://runescape.wiki/w/Anachronia_Agility_Course' },
  { id: 'agility_60',  skill: 'Agility',  level: 60,  description: 'Werewolf Agility Course; God Wars Dungeon agility shortcut (skip combat in GWD)', unlock_type: 'course',  wiki_url: 'https://runescape.wiki/w/Werewolf_Agility_Course' },
  { id: 'agility_70',  skill: 'Agility',  level: 70,  description: 'Advanced Anachronia sections; Anachronia base camp tier upgrades', unlock_type: 'course',  wiki_url: 'https://runescape.wiki/w/Anachronia_Agility_Course' },
  { id: 'agility_75',  skill: 'Agility',  level: 75,  description: 'Flash Powder Factory; stop failing Ape Atoll Agility Course — consistent XP rates', unlock_type: 'course',  wiki_url: 'https://runescape.wiki/w/Flash_Powder_Factory' },
  { id: 'agility_85',  skill: 'Agility',  level: 85,  description: 'Advanced Gnome Stronghold Course — best XP/hr before 90; Agile legs reward', unlock_type: 'course',  wiki_url: 'https://runescape.wiki/w/Advanced_Gnome_Stronghold_Agility_Course' },
  { id: 'agility_90',  skill: 'Agility',  level: 90,  description: 'Advanced Barbarian Outpost Course; Agile top reward — best-in-slot XP/hr training method', unlock_type: 'course',  wiki_url: 'https://runescape.wiki/w/Advanced_Barbarian_Outpost_Agility_Course' },
  { id: 'agility_99',  skill: 'Agility',  level: 99,  description: 'Agility cape (increased run energy restore rate); stop failing Wilderness Agility Course', unlock_type: 'reward',  wiki_url: 'https://runescape.wiki/w/Agility_cape' },
  { id: 'agility_120', skill: 'Agility',  level: 120, description: 'True mastery — Agility master cape', unlock_type: 'reward',  wiki_url: 'https://runescape.wiki/w/Agility_master_cape' },

  // ── MINING (max 120) ──────────────────────────────────────────────────────
  { id: 'mining_80',  skill: 'Mining',  level: 80,  description: 'Banite ore + Imcando pickaxe option; key smithing material tier', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Banite_ore' },
  { id: 'mining_90',  skill: 'Mining',  level: 90,  description: 'Light and dark animica — primary ingredient for elder rune bars and T90+ crafted armours; Elder rune pickaxe; Croesus access', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Light_animica' },
  { id: 'mining_99',  skill: 'Mining',  level: 99,  description: 'Mining cape; +5% critical swing chance (rockertunity); double gem fragment collection', unlock_type: 'reward', wiki_url: 'https://runescape.wiki/w/Mining_cape' },
  { id: 'mining_100', skill: 'Mining',  level: 100, description: 'Primal ore + Primal pickaxe — highest tier ore available at standard levels', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Primal_ore' },
  { id: 'mining_120', skill: 'Mining',  level: 120, description: 'True mastery — Mining master cape; triple gem golem fragment collection', unlock_type: 'reward', wiki_url: 'https://runescape.wiki/w/Mining_master_cape' },

  // ── WOODCUTTING (max 120) ─────────────────────────────────────────────────
  { id: 'woodcutting_80',  skill: 'Woodcutting', level: 80,  description: 'Magic trees — solid XP/hr; magic logs needed for fletching bows and construction', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Magic_tree' },
  { id: 'woodcutting_90',  skill: 'Woodcutting', level: 90,  description: 'Elder trees + Croesus skilling boss access; elder logs for elder rune smithing', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Elder_tree' },
  { id: 'woodcutting_94',  skill: 'Woodcutting', level: 94,  description: 'Crystal trees (Prifddinas) — best standard XP/hr method', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Crystal_tree' },
  { id: 'woodcutting_99',  skill: 'Woodcutting', level: 99,  description: 'Woodcutting cape; double bird nest chance (passive farming resources)', unlock_type: 'reward', wiki_url: 'https://runescape.wiki/w/Woodcutting_cape' },
  { id: 'woodcutting_100', skill: 'Woodcutting', level: 100, description: 'Eternal magic trees; Primal hatchet — highest-tier woodcutting', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Eternal_magic_tree' },
  { id: 'woodcutting_120', skill: 'Woodcutting', level: 120, description: 'True mastery — Woodcutting master cape; triple sentinel fragment collection', unlock_type: 'reward', wiki_url: 'https://runescape.wiki/w/Woodcutting_master_cape' },

  // ── FISHING (max 120) ─────────────────────────────────────────────────────
  { id: 'fishing_80',  skill: 'Fishing',  level: 80,  description: 'Rocktail — best food in the game (up to 2,400 + 10% max LP heal per bite); used for all high-end PvM', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Rocktail' },
  { id: 'fishing_90',  skill: 'Fishing',  level: 90,  description: 'Croesus skilling boss access; cavefish for additional food options', unlock_type: 'boss',   wiki_url: 'https://runescape.wiki/w/Croesus' },
  { id: 'fishing_99',  skill: 'Fishing',  level: 99,  description: 'Fishing cape; double fish chance from spots', unlock_type: 'reward', wiki_url: 'https://runescape.wiki/w/Fishing_cape' },
  { id: 'fishing_120', skill: 'Fishing',  level: 120, description: 'True mastery — Fishing master cape; passive fish healing while skilling', unlock_type: 'reward', wiki_url: 'https://runescape.wiki/w/Fishing_master_cape' },

  // ── COOKING (max 120) ─────────────────────────────────────────────────────
  { id: 'cooking_91',  skill: 'Cooking',  level: 91,  description: 'Cook Rocktails without burning (with gauntlets); unlocks the best food supply for all PvM', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Rocktail' },
  { id: 'cooking_94',  skill: 'Cooking',  level: 94,  description: 'Sailfish — high healing food, some content requires sailfish over rocktail', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Sailfish' },
  { id: 'cooking_99',  skill: 'Cooking',  level: 99,  description: 'Cooking cape — passive bonus: never burn food without the gauntlets; max efficiency food production', unlock_type: 'reward', wiki_url: 'https://runescape.wiki/w/Cooking_cape' },
  { id: 'cooking_120', skill: 'Cooking',  level: 120, description: 'True mastery — Cooking master cape', unlock_type: 'reward', wiki_url: 'https://runescape.wiki/w/Cooking_master_cape' },

  // ── DIVINATION (max 120) ──────────────────────────────────────────────────
  { id: 'divination_70',  skill: 'Divination', level: 70,  description: 'Hall of Memories access — best Divination training location; Simulacrum fragments for Combat XP lamps', unlock_type: 'course',  wiki_url: 'https://runescape.wiki/w/Hall_of_Memories' },
  { id: 'divination_80',  skill: 'Divination', level: 80,  description: 'Invention prerequisite (80 Attack + Defence + Magic + Divination); Brilliant wisps', unlock_type: 'ability', wiki_url: 'https://runescape.wiki/w/Invention' },
  { id: 'divination_90',  skill: 'Divination', level: 90,  description: 'Luminous wisps — high-tier energy; requirement for several Fate of the Gods story missions', unlock_type: 'item',    wiki_url: 'https://runescape.wiki/w/Luminous_energy' },
  { id: 'divination_95',  skill: 'Divination', level: 95,  description: 'Incandescent wisps — highest standard Divination training wisp; Ancestral energy for divine charges', unlock_type: 'item',    wiki_url: 'https://runescape.wiki/w/Incandescent_energy' },
  { id: 'divination_99',  skill: 'Divination', level: 99,  description: 'Divination cape; double enriched memory chance; 10% enriched rate', unlock_type: 'reward',  wiki_url: 'https://runescape.wiki/w/Divination_cape' },
  { id: 'divination_120', skill: 'Divination', level: 120, description: 'True mastery — Divination master cape; triple chronicle fragment collection', unlock_type: 'reward',  wiki_url: 'https://runescape.wiki/w/Divination_master_cape' },

  // ── THIEVING (max 120) ────────────────────────────────────────────────────
  { id: 'thieving_65', skill: 'Thieving', level: 65, description: 'Master Farmer pickpocket — herb seeds for Herblore (torstol seeds at high level)', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Master_Farmer' },
  { id: 'thieving_75', skill: 'Thieving', level: 75, description: 'Prifddinas worker clan pickpockets — best XP and Thieving contract access', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Worker_worker' },
  { id: 'thieving_99', skill: 'Thieving', level: 99, description: 'Thieving cape; passively gain extra loot from pickpocketing; access to all thieving content', unlock_type: 'reward', wiki_url: 'https://runescape.wiki/w/Thieving_cape' },
  { id: 'thieving_120',skill: 'Thieving', level: 120, description: 'True mastery — Thieving master cape', unlock_type: 'reward', wiki_url: 'https://runescape.wiki/w/Thieving_master_cape' },

  // ── HUNTER (max 120) ──────────────────────────────────────────────────────
  { id: 'hunter_60', skill: 'Hunter', level: 60, description: 'Jadinkos (Jadinko Lair access) — moderate XP; drops Whip vine if at 86 Slayer', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Jadinko_Lair' },
  { id: 'hunter_80', skill: 'Hunter', level: 80, description: 'Grenwalls (high XP/hr) + Prifddinas hunting contracts for bonus rewards', unlock_type: 'item',   wiki_url: 'https://runescape.wiki/w/Grenwall' },
  { id: 'hunter_99', skill: 'Hunter', level: 99, description: 'Hunter cape; access to all hunting content; catch multiple creatures per trap more reliably', unlock_type: 'reward', wiki_url: 'https://runescape.wiki/w/Hunter_cape' },
  { id: 'hunter_120',skill: 'Hunter', level: 120, description: 'True mastery — Hunter master cape', unlock_type: 'reward', wiki_url: 'https://runescape.wiki/w/Hunter_master_cape' },
];

// ══════════════════════════════════════════════════════════════════════════════
// 4. GEAR PATHS (recommended upgrade progressions per style/slot)
// ══════════════════════════════════════════════════════════════════════════════
const GEAR_PATHS = [
  { id: 'melee_weapon_2h', style: 'melee', slot: 'weapon_2h', progression: [
    { tier: 60, name: 'Dragon 2H sword', note: 'Early upgrade, cheap' },
    { tier: 75, name: 'Godsword (any)', note: 'GWD1 drop or GE purchase' },
    { tier: 80, name: 'Chaotic maul', note: '80 Dungeoneering tokens' },
    { tier: 90, name: 'Drygore weapons (any)', note: 'Kalphite King' },
    { tier: 92, name: 'Zaros godsword', note: 'Telos (T92, best-in-slot)' },
  ]},
  { id: 'melee_weapon_oh', style: 'melee', slot: 'weapon_oh', progression: [
    { tier: 70, name: 'Abyssal whip', note: '85 Slayer, best mid-game 1H' },
    { tier: 75, name: 'Saradomin sword', note: 'Commander Zilyana' },
    { tier: 80, name: 'Chaotic rapier / longsword', note: '80 Dungeoneering' },
    { tier: 85, name: 'Dragon Rider lance', note: 'Vindicta (GWD2)' },
    { tier: 90, name: 'Drygore rapier / longsword / mace', note: 'Kalphite King' },
  ]},
  { id: 'ranged_weapon_2h', style: 'ranged', slot: 'weapon_2h', progression: [
    { tier: 70, name: 'Magic shortbow / Rune crossbow', note: 'GE purchase' },
    { tier: 75, name: 'Armadyl crossbow', note: "Commander Zilyana or GE" },
    { tier: 80, name: 'Chaotic crossbow', note: '80 Dungeoneering' },
    { tier: 90, name: 'Ascension crossbow', note: 'Legiones (95 Slayer)' },
    { tier: 92, name: 'Seren godbow', note: 'Telos (T92, best-in-slot)' },
  ]},
  { id: 'magic_weapon_2h', style: 'magic', slot: 'weapon_2h', progression: [
    { tier: 70, name: 'Armadyl battlestaff', note: 'GE purchase' },
    { tier: 80, name: 'Chaotic staff', note: '80 Dungeoneering' },
    { tier: 90, name: 'Noxious staff', note: 'Araxxor/Araxxi (92 Slayer)' },
    { tier: 92, name: 'Staff of Sliske', note: 'Telos (best-in-slot general)' },
    { tier: 95, name: 'Fractured Staff of Armadyl', note: 'Kerapac (best-in-slot special)' },
  ]},
  { id: 'melee_armour_body', style: 'melee', slot: 'body', progression: [
    { tier: 60, name: 'Rune platebody', note: 'Smith or buy' },
    { tier: 65, name: 'Barrows (Dharok / Torag chestplate)', note: 'Barrows' },
    { tier: 70, name: 'Bandos chestplate', note: 'General Graardor (power armour)' },
    { tier: 80, name: 'Anima core of Sliske body', note: 'Gregorovic (GWD2)' },
    { tier: 90, name: 'Malevolent cuirass', note: 'Rise of the Six crafting' },
    { tier: 90, name: 'Vestments of Havoc top', note: 'Zamorak LoE (best power melee)' },
  ]},
  { id: 'ranged_armour_body', style: 'ranged', slot: 'body', progression: [
    { tier: 65, name: "Karil's top", note: 'Barrows' },
    { tier: 70, name: 'Armadyl chestplate', note: "Kree'arra (power armour)" },
    { tier: 80, name: 'Anima core of Zaros body', note: 'Vindicta (GWD2)' },
    { tier: 90, name: 'Sirenic hauberk', note: 'Rise of the Six crafting' },
    { tier: 95, name: 'Tempest top', note: 'Nex: AoD (best-in-slot)' },
  ]},
  { id: 'magic_armour_body', style: 'magic', slot: 'body', progression: [
    { tier: 65, name: "Ahrim's robe top", note: 'Barrows' },
    { tier: 70, name: 'Subjugation gown', note: "K'ril Tsutsaroth (power armour)" },
    { tier: 80, name: 'Anima core of Seren body', note: 'Helwyr (GWD2)' },
    { tier: 90, name: 'Tectonic robe top', note: 'Vorago crafting' },
    { tier: 95, name: 'Blight robe top', note: 'Nex: AoD (best-in-slot)' },
  ]},
  { id: 'cape', style: 'all', slot: 'cape', progression: [
    { tier: null, name: 'Skill cape (any 99)', note: 'First milestone' },
    { tier: null, name: 'Fire cape', note: 'TzTok-Jad (Fight Caves)' },
    { tier: 80, name: 'TokHaar-Kal (Ket/Mej/Xil)', note: 'Har-Aken (Fight Kiln)' },
    { tier: 95, name: 'Igneous Kal (Zuk/Mej/Xil/Ket)', note: 'TzKal-Zuk (Fight Cauldron)' },
  ]},
];

// ══════════════════════════════════════════════════════════════════════════════
// 5. QUESTS (important RS3 quests — boss prerequisites, skill unlocks, content gates)
// ══════════════════════════════════════════════════════════════════════════════
function upsertQuest(q) {
  db.prepare(`INSERT OR REPLACE INTO rs3_quests (id, name, series, members_only, quest_points, requirements, rewards, wiki_url, last_verified_at)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(
    q.id, q.name, q.series ?? null, q.members_only ?? 1, q.quest_points ?? 1,
    j(q.requirements ?? {}), j(q.rewards ?? []), q.wiki_url ?? null, new Date().toISOString()
  );
}

const QUESTS = [
  // ── Essential unlock quests ───────────────────────────────────────────────
  { id: 'priest_in_peril', name: 'Priest in Peril', series: 'Myreque', quest_points: 1,
    requirements: {},
    rewards: ['Morytania access', 'Barrows access'],
    wiki_url: 'https://runescape.wiki/w/Priest_in_Peril' },

  { id: 'temple_at_senntisten', name: 'The Temple at Senntisten', series: 'Mahjarrat', quest_points: 2,
    requirements: { skills: { Magic: 50 }, quests: ['Desert Treasure'] },
    rewards: ['Ancient Curses (Soul Split, Turmoil, Anguish, Torment)', 'GWD1 access (Nex, generals)', 'Nex area access'],
    wiki_url: 'https://runescape.wiki/w/The_Temple_at_Senntisten' },

  { id: 'desert_treasure', name: 'Desert Treasure', series: 'Mahjarrat', quest_points: 3,
    requirements: { skills: { Magic: 50, Thieving: 53, Firemaking: 50, Slayer: 10 } },
    rewards: ['Ancient Magicks spellbook', 'Access to Ancient Pyramid'],
    wiki_url: 'https://runescape.wiki/w/Desert_Treasure' },

  { id: 'ritual_of_the_mahjarrat', name: 'Ritual of the Mahjarrat', series: 'Mahjarrat', quest_points: 2,
    requirements: { skills: { Magic: 76, Agility: 76, Firemaking: 74, Crafting: 74 }, quests: ['Enakhra\'s Lament', 'Fairy Tale III', 'Temple of Senntisten'] },
    rewards: ['Glacors access', 'Rise of the Six access', 'Dragonkin weapon research'],
    wiki_url: 'https://runescape.wiki/w/Ritual_of_the_Mahjarrat' },

  { id: 'while_guthix_sleeps', name: 'While Guthix Sleeps', series: 'Mahjarrat', quest_points: 5,
    requirements: { skills: { Slayer: 55, Hunter: 55, Agility: 65, Thieving: 60, Herblore: 65 } },
    rewards: ['Tormented Demons access', 'Dragon claws drop'],
    wiki_url: 'https://runescape.wiki/w/While_Guthix_Sleeps' },

  { id: 'city_of_senntisten', name: 'City of Senntisten', series: 'Elder Gods', quest_points: 2,
    requirements: { skills: { Archaeology: 70 }, quests: ['Azzanadra\'s Quest'] },
    rewards: ['Zamorak, Lord of Erebus access', 'Elder God artefacts'],
    wiki_url: 'https://runescape.wiki/w/City_of_Senntisten' },

  { id: 'extinction', name: 'Extinction', series: 'Elder Gods', quest_points: 4,
    requirements: { skills: { Slayer: 96, Archaeology: 97, Mining: 102 }, quests: ['Azzanadra\'s Quest', 'Battle of the Monolith', 'City of Senntisten', 'Daughter of Chaos'] },
    rewards: ['Kerapac access', 'Arch-Glacor access', 'Croesus access', 'Raksha access (partial)', 'Rex Matriarchs access'],
    wiki_url: 'https://runescape.wiki/w/Extinction' },

  { id: 'unwelcome_guests', name: 'Unwelcome Guests', series: 'Necromancy', quest_points: 3,
    requirements: { skills: { Necromancy: 70 }, quests: ['You Are It'] },
    rewards: ['Rasial access', 'Necromancy story progression'],
    wiki_url: 'https://runescape.wiki/w/Unwelcome_Guests' },

  { id: 'fort_forinthry', name: 'Fort Forinthry (quest series)', series: 'Fort Forinthry', quest_points: 6,
    requirements: { skills: { Construction: 52, Firemaking: 52 }, quests: ['Shield of Arrav'] },
    rewards: ['Fort Forinthry base camp', 'Zemouregal & Vorkath access', 'Sneakerpeeper pet'],
    wiki_url: 'https://runescape.wiki/w/Fort_Forinthry_(quest)' },

  { id: 'waterbirth_island', name: 'Waterbirth Island', series: null, quest_points: 1,
    requirements: {},
    rewards: ['Dagannoth Kings access', 'Dagannoth slayer tasks'],
    wiki_url: 'https://runescape.wiki/w/Waterbirth_Island_(quest)' },

  // ── Skill / gear unlock quests ────────────────────────────────────────────
  { id: 'smoking_kills', name: 'Smoking Kills', series: 'Menaphos', quest_points: 1,
    requirements: { skills: { Slayer: 35, Crafting: 25 } },
    rewards: ['Slayer helmet', 'Slayer helmet (i)', 'Double Slayer points from Nieve/Steve'],
    wiki_url: 'https://runescape.wiki/w/Smoking_Kills' },

  { id: 'haunted_mine', name: 'Haunted Mine', series: null, quest_points: 2,
    requirements: { skills: { Agility: 15, Crafting: 35 } },
    rewards: ['Salve amulet', 'Salve amulet (e) (via Tarn Razorlor)'],
    wiki_url: 'https://runescape.wiki/w/Haunted_Mine' },

  { id: 'lair_of_tarn_razorlor', name: 'Lair of Tarn Razorlor', series: null, quest_points: 1,
    requirements: { skills: { Slayer: 40 }, quests: ['Haunted Mine'] },
    rewards: ['Salve amulet (e) — best-in-slot for undead', 'Tarn\'s diary'],
    wiki_url: 'https://runescape.wiki/w/Lair_of_Tarn_Razorlor' },

  { id: 'recipe_for_disaster', name: 'Recipe for Disaster', series: null, quest_points: 10,
    requirements: { skills: { Cooking: 70, Agility: 48, Firemaking: 20 }, quests: ['Cook\'s Assistant'] },
    rewards: ['Culinaromancer\'s gloves 10 (best-in-slot melee gloves)', 'Access to chest near Cook'],
    wiki_url: 'https://runescape.wiki/w/Recipe_for_Disaster' },

  { id: 'horror_from_the_deep', name: 'Horror from the Deep', series: null, quest_points: 4,
    requirements: { skills: { Agility: 35 } },
    rewards: ['God books (pocket slot items)', 'Saradomin/Zamorak/Guthix god books'],
    wiki_url: 'https://runescape.wiki/w/Horror_from_the_Deep' },

  { id: 'the_world_wakes', name: 'The World Wakes', series: 'Sixth Age', quest_points: 3,
    requirements: { quests: ['Chosen Commander', 'As a First Resort...', 'Ritual of the Mahjarrat'] },
    rewards: ['Sixth-Age circuit ring', 'Access to Sixth Age arc quests'],
    wiki_url: 'https://runescape.wiki/w/The_World_Wakes' },

  { id: 'the_elder_kiln', name: 'The Elder Kiln', series: 'TzHaar', quest_points: 4,
    requirements: { skills: { Attack: 60, Defence: 60 }, quests: ['The Brink of Extinction'] },
    rewards: ['Fight Kiln access', 'TokHaar-Kal capes (T80 all styles)'],
    wiki_url: 'https://runescape.wiki/w/The_Elder_Kiln' },

  { id: 'roving_elves', name: 'Roving Elves', series: 'Elf', quest_points: 1,
    requirements: { quests: ['Regicide'] },
    rewards: ['Crystal bow / Crystal wand access', 'Elf area access'],
    wiki_url: 'https://runescape.wiki/w/Roving_Elves' },

  { id: 'plagues_end', name: "Plague's End", series: 'Elf', quest_points: 2,
    requirements: { skills: { Agility: 75, Construction: 75, Crafting: 75, Dungeoneering: 75, Herblore: 75, Magic: 75, Mining: 75, Prayer: 75, Ranging: 75, Slayer: 75, Smithing: 75, Summoning: 75, Woodcutting: 75 } },
    rewards: ['Prifddinas city access', 'Crystal equipment enhanced', 'Clan citadels unlocked'],
    wiki_url: "https://runescape.wiki/w/Plague's_End" },

  // ── Major storyline quests ────────────────────────────────────────────────
  { id: 'missing_presumed_death', name: 'Missing, Presumed Death', series: 'Sliske', quest_points: 1,
    requirements: {},
    rewards: ['Sliske\'s Grand Tournament begins', 'Gateway to Sliske questline'],
    wiki_url: 'https://runescape.wiki/w/Missing,_Presumed_Death' },

  { id: 'children_of_mah', name: 'Children of Mah', series: 'Mahjarrat', quest_points: 2,
    requirements: { skills: { Magic: 69, Slayer: 69 }, quests: ['Fate of the Gods', 'Ritual of the Mahjarrat'] },
    rewards: ['Mahjarrat story completion', 'Kharshai companion', 'Codex Ultimatus'],
    wiki_url: 'https://runescape.wiki/w/Children_of_Mah' },

  { id: 'fate_of_the_gods', name: 'Fate of the Gods', series: 'Sixth Age', quest_points: 2,
    requirements: { skills: { Magic: 73, Agility: 73, Divination: 73 }, quests: ['Missing, Presumed Death'] },
    rewards: ['Zaros lore', 'Divination training area', 'Shadow realm items'],
    wiki_url: 'https://runescape.wiki/w/Fate_of_the_Gods' },

  { id: 'sliskes_endgame', name: "Sliske's Endgame", series: 'Sliske', quest_points: 4,
    requirements: { skills: { Agility: 80, Divination: 80, Herblore: 80, Magic: 80, Prayer: 80, Runecrafting: 80, Slayer: 80, Strength: 80, Thieving: 80 } },
    rewards: ['Conclusion of Sliske storyline', 'Stone of Jas aftermath', 'Artefacts'],
    wiki_url: "https://runescape.wiki/w/Sliske's_Endgame" },

  { id: 'azzanadras_quest', name: "Azzanadra's Quest", series: 'Elder Gods', quest_points: 1,
    requirements: { skills: { Archaeology: 50 }, quests: ['Children of Mah'] },
    rewards: ['Nidas access', 'Archaeology story content', 'Required for City of Senntisten'],
    wiki_url: "https://runescape.wiki/w/Azzanadra's_Quest" },

  { id: 'monkey_madness', name: 'Monkey Madness', series: 'Gnome', quest_points: 3,
    requirements: { skills: { Agility: 43 }, quests: ['The Grand Tree'] },
    rewards: ['Ape Atoll access', 'Greegree (monkey disguise)', 'Dragon scimitar access'],
    wiki_url: 'https://runescape.wiki/w/Monkey_Madness' },

  { id: 'nomads_requiem', name: "Nomad's Requiem", series: null, quest_points: 2,
    requirements: { skills: { Prayer: 65, Slayer: 65, Defence: 65 } },
    rewards: ['Soul Wars access (Zeal tokens)', 'Nomad\'s diary'],
    wiki_url: "https://runescape.wiki/w/Nomad's_Requiem" },
];

// ══════════════════════════════════════════════════════════════════════════════
// 6. GEAR ITEMS (all notable RS3 gear with wiki icon URLs)
//    Covers every item appearing in gearSuggestions.js + notable boss drops
// ══════════════════════════════════════════════════════════════════════════════
function upsertGearItem(g) {
  db.prepare(`INSERT OR REPLACE INTO rs3_gear_items
    (id, name, tier, style, slot, is_power_armour, stats, acquisition_source, source_id, icon_url, requirements_json, quest, wiki_url, last_verified_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    g.id, g.name, g.tier ?? 0, g.style ?? 'all', g.slot ?? 'weapon',
    g.is_power_armour ?? 1, j(g.stats ?? {}),
    g.acquisition_source ?? 'ge', g.source_id ?? null,
    g.icon_url ?? null, j(g.requirements_json ?? {}), g.quest ?? null,
    g.wiki_url ?? null, new Date().toISOString()
  );
}

// Helper: generate RS3 wiki item image URL
const wi = name => `https://runescape.wiki/images/${name.replace(/ /g, '_').replace(/'/g, '%27').replace(/\//g, '')}.png`;
// Helper: slug from item name
const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const GEAR_ITEMS = [
  // ══ MELEE WEAPONS ══════════════════════════════════════════════════════════
  { id: 'zaros_godsword',         name: 'Zaros godsword',           tier: 92, style: 'melee', slot: 'weapon',  is_power_armour: 0, requirements_json: { Attack: 92 },       acquisition_source: 'boss', source_id: 'telos',         wiki_url: 'https://runescape.wiki/w/Zaros_godsword' },
  { id: 'noxious_scythe',         name: 'Noxious scythe',           tier: 90, style: 'melee', slot: 'weapon',  is_power_armour: 0, requirements_json: { Attack: 90 },       acquisition_source: 'boss', source_id: 'araxxi',        wiki_url: 'https://runescape.wiki/w/Noxious_scythe' },
  { id: 'dragon_rider_lance',     name: 'Dragon Rider lance',        tier: 85, style: 'melee', slot: 'weapon',  is_power_armour: 0, requirements_json: { Attack: 85 },       acquisition_source: 'boss', source_id: 'vindicta',      wiki_url: 'https://runescape.wiki/w/Dragon_Rider_lance' },
  { id: 'drygore_rapier',         name: 'Drygore rapier',            tier: 90, style: 'melee', slot: 'weapon',  is_power_armour: 0, requirements_json: { Attack: 90 },       acquisition_source: 'boss', source_id: 'kalphite_king', wiki_url: 'https://runescape.wiki/w/Drygore_rapier' },
  { id: 'drygore_longsword',      name: 'Drygore longsword',         tier: 90, style: 'melee', slot: 'weapon',  is_power_armour: 0, requirements_json: { Attack: 90 },       acquisition_source: 'boss', source_id: 'kalphite_king', wiki_url: 'https://runescape.wiki/w/Drygore_longsword' },
  { id: 'drygore_mace',           name: 'Drygore mace',              tier: 90, style: 'melee', slot: 'weapon',  is_power_armour: 0, requirements_json: { Attack: 90 },       acquisition_source: 'boss', source_id: 'kalphite_king', wiki_url: 'https://runescape.wiki/w/Drygore_mace' },
  { id: 'oh_drygore_rapier',      name: 'Off-hand drygore rapier',   tier: 90, style: 'melee', slot: 'offhand', is_power_armour: 0, requirements_json: { Attack: 90 },       acquisition_source: 'boss', source_id: 'kalphite_king', wiki_url: 'https://runescape.wiki/w/Off-hand_drygore_rapier' },
  { id: 'oh_drygore_longsword',   name: 'Off-hand drygore longsword',tier: 90, style: 'melee', slot: 'offhand', is_power_armour: 0, requirements_json: { Attack: 90 },       acquisition_source: 'boss', source_id: 'kalphite_king', wiki_url: 'https://runescape.wiki/w/Off-hand_drygore_longsword' },
  { id: 'oh_drygore_mace',        name: 'Off-hand drygore mace',     tier: 90, style: 'melee', slot: 'offhand', is_power_armour: 0, requirements_json: { Attack: 90 },       acquisition_source: 'boss', source_id: 'kalphite_king', wiki_url: 'https://runescape.wiki/w/Off-hand_drygore_mace' },
  { id: 'chaotic_maul',           name: 'Chaotic maul',              tier: 80, style: 'melee', slot: 'weapon',  is_power_armour: 0, requirements_json: { Attack: 80, Dungeoneering: 80 }, acquisition_source: 'dungeoneering', wiki_url: 'https://runescape.wiki/w/Chaotic_maul' },
  { id: 'chaotic_longsword',      name: 'Chaotic longsword',         tier: 80, style: 'melee', slot: 'weapon',  is_power_armour: 0, requirements_json: { Attack: 80, Dungeoneering: 80 }, acquisition_source: 'dungeoneering', wiki_url: 'https://runescape.wiki/w/Chaotic_longsword' },
  { id: 'chaotic_rapier',         name: 'Chaotic rapier',            tier: 80, style: 'melee', slot: 'weapon',  is_power_armour: 0, requirements_json: { Attack: 80, Dungeoneering: 80 }, acquisition_source: 'dungeoneering', wiki_url: 'https://runescape.wiki/w/Chaotic_rapier' },
  { id: 'abyssal_vine_whip',      name: 'Abyssal vine whip',         tier: 75, style: 'melee', slot: 'weapon',  is_power_armour: 0, requirements_json: { Attack: 75 },       acquisition_source: 'slayer', source_id: 'jadinko_guard',  wiki_url: 'https://runescape.wiki/w/Abyssal_vine_whip' },
  { id: 'abyssal_whip',           name: 'Abyssal whip',              tier: 70, style: 'melee', slot: 'weapon',  is_power_armour: 0, requirements_json: { Attack: 70 },       acquisition_source: 'slayer', source_id: 'abyssal_demon',  wiki_url: 'https://runescape.wiki/w/Abyssal_whip' },
  { id: 'saradomin_sword',        name: 'Saradomin sword',           tier: 70, style: 'melee', slot: 'weapon',  is_power_armour: 0, requirements_json: { Attack: 75 },       acquisition_source: 'boss', source_id: 'zilyana',       wiki_url: 'https://runescape.wiki/w/Saradomin_sword' },
  { id: 'dragon_2h_sword',        name: 'Dragon 2H sword',           tier: 60, style: 'melee', slot: 'weapon',  is_power_armour: 0, requirements_json: { Attack: 60 },       acquisition_source: 'boss', source_id: 'kril_tsutsaroth',  wiki_url: 'https://runescape.wiki/w/Dragon_2H_sword' },
  { id: 'malevolent_kiteshield',  name: 'Malevolent kiteshield',     tier: 90, style: 'melee', slot: 'offhand', is_power_armour: 1, requirements_json: { Defence: 90 },     acquisition_source: 'crafting', source_id: 'barrows_rots', wiki_url: 'https://runescape.wiki/w/Malevolent_kiteshield' },
  // T92/T95 from GWD2/Solak
  { id: 'khopesh_main',           name: 'Khopesh of the Kharidian',  tier: 82, style: 'melee', slot: 'weapon',  is_power_armour: 0, requirements_json: { Attack: 82 },       acquisition_source: 'boss', source_id: 'magister',      wiki_url: 'https://runescape.wiki/w/Khopesh_of_the_Kharidian' },
  { id: 'khopesh_oh',             name: 'Off-hand Khopesh of the Kharidian', tier: 82, style: 'melee', slot: 'offhand', is_power_armour: 0, requirements_json: { Attack: 82 }, acquisition_source: 'boss', source_id: 'magister', wiki_url: 'https://runescape.wiki/w/Off-hand_Khopesh_of_the_Kharidian' },
  { id: 'hexhunter_bow',          name: 'Hexhunter bow',             tier: 80, style: 'ranged', slot: 'weapon', is_power_armour: 0, requirements_json: { Ranged: 80 },       acquisition_source: 'slayer', source_id: 'soulgazer',    wiki_url: 'https://runescape.wiki/w/Hexhunter_bow' },
  { id: 'blade_of_nymora',        name: 'Blade of Nymora',           tier: 85, style: 'melee', slot: 'weapon',  is_power_armour: 0, requirements_json: { Attack: 85 },       acquisition_source: 'boss', source_id: 'twin_furies',    wiki_url: 'https://runescape.wiki/w/Blade_of_Nymora' },
  { id: 'blade_of_avaryss',       name: 'Blade of Avaryss',          tier: 85, style: 'melee', slot: 'offhand', is_power_armour: 0, requirements_json: { Attack: 85 },       acquisition_source: 'boss', source_id: 'twin_furies',    wiki_url: 'https://runescape.wiki/w/Blade_of_Avaryss' },

  // ══ MELEE ARMOUR ═══════════════════════════════════════════════════════════
  // Vestments of Havoc (T95, Zamorak Lord of Erebus)
  { id: 'vestments_hood',         name: 'Vestments of Havoc hood',   tier: 95, style: 'melee', slot: 'head',   is_power_armour: 1, requirements_json: { Defence: 95 },     acquisition_source: 'boss', source_id: 'zamorak_loe', wiki_url: 'https://runescape.wiki/w/Vestments_of_Havoc_hood' },
  { id: 'vestments_top',          name: 'Vestments of Havoc top',    tier: 95, style: 'melee', slot: 'body',   is_power_armour: 1, requirements_json: { Defence: 95 },     acquisition_source: 'boss', source_id: 'zamorak_loe', wiki_url: 'https://runescape.wiki/w/Vestments_of_Havoc_top' },
  { id: 'vestments_bottom',       name: 'Vestments of Havoc bottom', tier: 95, style: 'melee', slot: 'legs',   is_power_armour: 1, requirements_json: { Defence: 95 },     acquisition_source: 'boss', source_id: 'zamorak_loe', wiki_url: 'https://runescape.wiki/w/Vestments_of_Havoc_bottom' },
  // Trimmed Masterwork (T92)
  { id: 'tmw_helm',               name: 'Trimmed Masterwork helm',   tier: 92, style: 'melee', slot: 'head',   is_power_armour: 1, requirements_json: { Defence: 92 },     acquisition_source: 'crafting',      wiki_url: 'https://runescape.wiki/w/Trimmed_Masterwork_helm' },
  { id: 'tmw_platebody',          name: 'Trimmed Masterwork platebody', tier: 92, style: 'melee', slot: 'body', is_power_armour: 1, requirements_json: { Defence: 92 },    acquisition_source: 'crafting',      wiki_url: 'https://runescape.wiki/w/Trimmed_Masterwork_platebody' },
  { id: 'tmw_platelegs',          name: 'Trimmed Masterwork platelegs', tier: 92, style: 'melee', slot: 'legs', is_power_armour: 1, requirements_json: { Defence: 92 },    acquisition_source: 'crafting',      wiki_url: 'https://runescape.wiki/w/Trimmed_Masterwork_platelegs' },
  // Malevolent (T90, crafted from Barrows: Rise of the Six malevolent energy)
  { id: 'malevolent_helm',        name: 'Malevolent helm',           tier: 90, style: 'melee', slot: 'head',   is_power_armour: 1, requirements_json: { Defence: 90 },     acquisition_source: 'crafting', source_id: 'barrows_rots',   wiki_url: 'https://runescape.wiki/w/Malevolent_helm' },
  { id: 'malevolent_cuirass',     name: 'Malevolent cuirass',        tier: 90, style: 'melee', slot: 'body',   is_power_armour: 1, requirements_json: { Defence: 90 },     acquisition_source: 'crafting', source_id: 'barrows_rots',   wiki_url: 'https://runescape.wiki/w/Malevolent_cuirass' },
  { id: 'malevolent_greaves',     name: 'Malevolent greaves',        tier: 90, style: 'melee', slot: 'legs',   is_power_armour: 1, requirements_json: { Defence: 90 },     acquisition_source: 'crafting', source_id: 'barrows_rots',   wiki_url: 'https://runescape.wiki/w/Malevolent_greaves' },
  // Masterwork (T90)
  { id: 'masterwork_helm',        name: 'Masterwork helm',           tier: 90, style: 'melee', slot: 'head',   is_power_armour: 0, requirements_json: { Defence: 90 },     acquisition_source: 'crafting',      wiki_url: 'https://runescape.wiki/w/Masterwork_helm' },
  { id: 'masterwork_platebody',   name: 'Masterwork platebody',      tier: 90, style: 'melee', slot: 'body',   is_power_armour: 0, requirements_json: { Defence: 90 },     acquisition_source: 'crafting',      wiki_url: 'https://runescape.wiki/w/Masterwork_platebody' },
  { id: 'masterwork_platelegs',   name: 'Masterwork platelegs',      tier: 90, style: 'melee', slot: 'legs',   is_power_armour: 0, requirements_json: { Defence: 90 },     acquisition_source: 'crafting',      wiki_url: 'https://runescape.wiki/w/Masterwork_platelegs' },
  // Torva (T80, Nex)
  { id: 'torva_full_helm',        name: 'Torva full helm',           tier: 80, style: 'melee', slot: 'head',   is_power_armour: 1, requirements_json: { Defence: 80 },     acquisition_source: 'boss', source_id: 'nex', wiki_url: 'https://runescape.wiki/w/Torva_full_helm' },
  { id: 'torva_platebody',        name: 'Torva platebody',           tier: 80, style: 'melee', slot: 'body',   is_power_armour: 1, requirements_json: { Defence: 80 },     acquisition_source: 'boss', source_id: 'nex', wiki_url: 'https://runescape.wiki/w/Torva_platebody' },
  { id: 'torva_platelegs',        name: 'Torva platelegs',           tier: 80, style: 'melee', slot: 'legs',   is_power_armour: 1, requirements_json: { Defence: 80 },     acquisition_source: 'boss', source_id: 'nex', wiki_url: 'https://runescape.wiki/w/Torva_platelegs' },
  // Bandos (T70, GWD1)
  { id: 'bandos_helmet',          name: 'Bandos helmet',             tier: 70, style: 'melee', slot: 'head',   is_power_armour: 1, requirements_json: { Defence: 70 },     acquisition_source: 'boss', source_id: 'general_graardor', wiki_url: 'https://runescape.wiki/w/Bandos_helmet' },
  { id: 'bandos_chestplate',      name: 'Bandos chestplate',         tier: 70, style: 'melee', slot: 'body',   is_power_armour: 1, requirements_json: { Defence: 70 },     acquisition_source: 'boss', source_id: 'general_graardor', wiki_url: 'https://runescape.wiki/w/Bandos_chestplate' },
  { id: 'bandos_tassets',         name: 'Bandos tassets',            tier: 70, style: 'melee', slot: 'legs',   is_power_armour: 1, requirements_json: { Defence: 70 },     acquisition_source: 'boss', source_id: 'general_graardor', wiki_url: 'https://runescape.wiki/w/Bandos_tassets' },
  { id: 'bandos_boots',           name: 'Bandos boots',              tier: 70, style: 'melee', slot: 'boots',  is_power_armour: 1, requirements_json: { Defence: 70 },     acquisition_source: 'boss', source_id: 'general_graardor', wiki_url: 'https://runescape.wiki/w/Bandos_boots' },
  // Barrows melee
  { id: 'dharoks_helm',           name: "Dharok's helm",             tier: 65, style: 'melee', slot: 'head',   is_power_armour: 0, requirements_json: { Defence: 70 },     acquisition_source: 'boss', source_id: 'barrows',       wiki_url: "https://runescape.wiki/w/Dharok's_helm" },
  { id: 'dharoks_platebody',      name: "Dharok's platebody",        tier: 65, style: 'melee', slot: 'body',   is_power_armour: 0, requirements_json: { Defence: 70 },     acquisition_source: 'boss', source_id: 'barrows',       wiki_url: "https://runescape.wiki/w/Dharok's_platebody" },
  { id: 'dharoks_platelegs',      name: "Dharok's platelegs",        tier: 65, style: 'melee', slot: 'legs',   is_power_armour: 0, requirements_json: { Defence: 70 },     acquisition_source: 'boss', source_id: 'barrows',       wiki_url: "https://runescape.wiki/w/Dharok's_platelegs" },
  { id: 'guthans_helm',           name: "Guthan's helm",             tier: 65, style: 'melee', slot: 'head',   is_power_armour: 0, requirements_json: { Defence: 70 },     acquisition_source: 'boss', source_id: 'barrows',       wiki_url: "https://runescape.wiki/w/Guthan's_helm" },
  { id: 'guthans_platebody',      name: "Guthan's platebody",        tier: 65, style: 'melee', slot: 'body',   is_power_armour: 0, requirements_json: { Defence: 70 },     acquisition_source: 'boss', source_id: 'barrows',       wiki_url: "https://runescape.wiki/w/Guthan's_platebody" },
  { id: 'guthans_chainskirt',     name: "Guthan's chainskirt",       tier: 65, style: 'melee', slot: 'legs',   is_power_armour: 0, requirements_json: { Defence: 70 },     acquisition_source: 'boss', source_id: 'barrows',       wiki_url: "https://runescape.wiki/w/Guthan's_chainskirt" },
  { id: 'guthans_warspear',       name: "Guthan's warspear",         tier: 65, style: 'melee', slot: 'weapon', is_power_armour: 0, requirements_json: { Attack: 70 },       acquisition_source: 'boss', source_id: 'barrows',       wiki_url: "https://runescape.wiki/w/Guthan's_warspear" },

  // ══ RANGED WEAPONS ═════════════════════════════════════════════════════════
  { id: 'bow_of_the_last_guardian', name: 'Bow of the Last Guardian', tier: 95, style: 'ranged', slot: 'weapon', is_power_armour: 0, requirements_json: { Ranged: 95 },    acquisition_source: 'boss', source_id: 'zamorak_loe',   wiki_url: 'https://runescape.wiki/w/Bow_of_the_Last_Guardian' },
  { id: 'seren_godbow',           name: 'Seren godbow',              tier: 92, style: 'ranged', slot: 'weapon', is_power_armour: 0, requirements_json: { Ranged: 92 },       acquisition_source: 'boss', source_id: 'telos',         wiki_url: 'https://runescape.wiki/w/Seren_godbow' },
  { id: 'eldritch_crossbow',      name: 'Eldritch crossbow',         tier: 92, style: 'ranged', slot: 'offhand',is_power_armour: 0, requirements_json: { Ranged: 92 },       acquisition_source: 'boss', source_id: 'ambassador',    wiki_url: 'https://runescape.wiki/w/Eldritch_crossbow' },
  { id: 'blightbound_crossbow',   name: 'Blightbound crossbow',      tier: 82, style: 'ranged', slot: 'offhand',is_power_armour: 0, requirements_json: { Ranged: 82 },       acquisition_source: 'boss', source_id: 'solak',         wiki_url: 'https://runescape.wiki/w/Blightbound_crossbow' },
  { id: 'noxious_longbow',        name: 'Noxious longbow',           tier: 90, style: 'ranged', slot: 'weapon', is_power_armour: 0, requirements_json: { Ranged: 90 },       acquisition_source: 'boss', source_id: 'araxxi',        wiki_url: 'https://runescape.wiki/w/Noxious_longbow' },
  { id: 'ascension_crossbow',     name: 'Ascension crossbow',        tier: 90, style: 'ranged', slot: 'weapon', is_power_armour: 0, requirements_json: { Ranged: 90 },       acquisition_source: 'boss', source_id: 'legiones',      wiki_url: 'https://runescape.wiki/w/Ascension_crossbow' },
  { id: 'oh_ascension_crossbow',  name: 'Off-hand ascension crossbow', tier: 90, style: 'ranged', slot: 'offhand', is_power_armour: 0, requirements_json: { Ranged: 90 },   acquisition_source: 'boss', source_id: 'legiones',      wiki_url: 'https://runescape.wiki/w/Off-hand_ascension_crossbow' },
  { id: 'zaryte_bow',             name: 'Zaryte bow',                tier: 80, style: 'ranged', slot: 'weapon', is_power_armour: 0, requirements_json: { Ranged: 80 },       acquisition_source: 'boss', source_id: 'nex',           wiki_url: 'https://runescape.wiki/w/Zaryte_bow' },
  { id: 'royal_crossbow',         name: 'Royal crossbow',            tier: 80, style: 'ranged', slot: 'weapon', is_power_armour: 0, requirements_json: { Ranged: 80 },       acquisition_source: 'boss', source_id: 'qbd',           wiki_url: 'https://runescape.wiki/w/Royal_crossbow' },
  { id: 'chaotic_crossbow',       name: 'Chaotic crossbow',          tier: 80, style: 'ranged', slot: 'weapon', is_power_armour: 0, requirements_json: { Ranged: 80, Dungeoneering: 80 }, acquisition_source: 'dungeoneering', wiki_url: 'https://runescape.wiki/w/Chaotic_crossbow' },
  { id: 'armadyl_crossbow',       name: 'Armadyl crossbow',          tier: 70, style: 'ranged', slot: 'weapon', is_power_armour: 0, requirements_json: { Ranged: 70 },       acquisition_source: 'boss', source_id: 'zilyana',       wiki_url: 'https://runescape.wiki/w/Armadyl_crossbow' },

  // ══ RANGED ARMOUR ══════════════════════════════════════════════════════════
  // Sirenic (T90)
  { id: 'sirenic_mask',           name: 'Sirenic mask',              tier: 90, style: 'ranged', slot: 'head',   is_power_armour: 1, requirements_json: { Defence: 90 },     acquisition_source: 'crafting',      wiki_url: 'https://runescape.wiki/w/Sirenic_mask' },
  { id: 'sirenic_hauberk',        name: 'Sirenic hauberk',           tier: 90, style: 'ranged', slot: 'body',   is_power_armour: 1, requirements_json: { Defence: 90 },     acquisition_source: 'crafting',      wiki_url: 'https://runescape.wiki/w/Sirenic_hauberk' },
  { id: 'sirenic_chaps',          name: 'Sirenic chaps',             tier: 90, style: 'ranged', slot: 'legs',   is_power_armour: 1, requirements_json: { Defence: 90 },     acquisition_source: 'crafting',      wiki_url: 'https://runescape.wiki/w/Sirenic_chaps' },
  // Tempest (T95, Nex AoD)
  { id: 'tempest_top',            name: 'Tempest top',               tier: 95, style: 'ranged', slot: 'body',   is_power_armour: 1, requirements_json: { Defence: 95 },     acquisition_source: 'boss', source_id: 'nex_aod', wiki_url: 'https://runescape.wiki/w/Tempest_top' },
  { id: 'tempest_bottom',         name: 'Tempest bottom',            tier: 95, style: 'ranged', slot: 'legs',   is_power_armour: 1, requirements_json: { Defence: 95 },     acquisition_source: 'boss', source_id: 'nex_aod', wiki_url: 'https://runescape.wiki/w/Tempest_bottom' },
  // Pernix (T80, Nex)
  { id: 'pernix_cowl',            name: 'Pernix cowl',               tier: 80, style: 'ranged', slot: 'head',   is_power_armour: 1, requirements_json: { Defence: 80, Constitution: 80 }, acquisition_source: 'boss', source_id: 'nex', wiki_url: 'https://runescape.wiki/w/Pernix_cowl' },
  { id: 'pernix_body',            name: 'Pernix body',               tier: 80, style: 'ranged', slot: 'body',   is_power_armour: 1, requirements_json: { Defence: 80, Constitution: 80 }, acquisition_source: 'boss', source_id: 'nex', wiki_url: 'https://runescape.wiki/w/Pernix_body' },
  { id: 'pernix_chaps',           name: 'Pernix chaps',              tier: 80, style: 'ranged', slot: 'legs',   is_power_armour: 1, requirements_json: { Defence: 80, Constitution: 80 }, acquisition_source: 'boss', source_id: 'nex', wiki_url: 'https://runescape.wiki/w/Pernix_chaps' },
  // Armadyl (T70, GWD1)
  { id: 'armadyl_helmet',         name: 'Armadyl helmet',            tier: 70, style: 'ranged', slot: 'head',   is_power_armour: 1, requirements_json: { Defence: 70 },     acquisition_source: 'boss', source_id: 'kreearra',      wiki_url: 'https://runescape.wiki/w/Armadyl_helmet' },
  { id: 'armadyl_chestplate',     name: 'Armadyl chestplate',        tier: 70, style: 'ranged', slot: 'body',   is_power_armour: 1, requirements_json: { Defence: 70 },     acquisition_source: 'boss', source_id: 'kreearra',      wiki_url: 'https://runescape.wiki/w/Armadyl_chestplate' },
  { id: 'armadyl_chainskirt',     name: 'Armadyl chainskirt',        tier: 70, style: 'ranged', slot: 'legs',   is_power_armour: 1, requirements_json: { Defence: 70 },     acquisition_source: 'boss', source_id: 'kreearra',      wiki_url: 'https://runescape.wiki/w/Armadyl_chainskirt' },
  // Barrows ranged
  { id: 'karils_coif',            name: "Karil's coif",              tier: 65, style: 'ranged', slot: 'head',   is_power_armour: 0, requirements_json: { Defence: 70 },     acquisition_source: 'boss', source_id: 'barrows',       wiki_url: "https://runescape.wiki/w/Karil's_coif" },
  { id: 'karils_top',             name: "Karil's top",               tier: 65, style: 'ranged', slot: 'body',   is_power_armour: 0, requirements_json: { Defence: 70 },     acquisition_source: 'boss', source_id: 'barrows',       wiki_url: "https://runescape.wiki/w/Karil's_top" },
  { id: 'karils_skirt',           name: "Karil's skirt",             tier: 65, style: 'ranged', slot: 'legs',   is_power_armour: 0, requirements_json: { Defence: 70 },     acquisition_source: 'boss', source_id: 'barrows',       wiki_url: "https://runescape.wiki/w/Karil's_skirt" },

  // ══ MAGIC WEAPONS ══════════════════════════════════════════════════════════
  { id: 'fractured_staff_of_armadyl', name: 'Fractured Staff of Armadyl', tier: 95, style: 'magic', slot: 'weapon', is_power_armour: 0, requirements_json: { Magic: 95 }, acquisition_source: 'boss', source_id: 'kerapac', wiki_url: 'https://runescape.wiki/w/Fractured_Staff_of_Armadyl' },
  { id: 'wand_of_the_praesul',    name: 'Wand of the Praesul',       tier: 95, style: 'magic', slot: 'weapon', is_power_armour: 0, requirements_json: { Magic: 95 },         acquisition_source: 'boss', source_id: 'nex_aod',       wiki_url: 'https://runescape.wiki/w/Wand_of_the_Praesul' },
  { id: 'imperium_core',          name: 'Imperium core',             tier: 95, style: 'magic', slot: 'offhand',is_power_armour: 0, requirements_json: { Magic: 95 },         acquisition_source: 'boss', source_id: 'nex_aod',       wiki_url: 'https://runescape.wiki/w/Imperium_core' },
  { id: 'staff_of_sliske',        name: 'Staff of Sliske',           tier: 92, style: 'magic', slot: 'weapon', is_power_armour: 0, requirements_json: { Magic: 92 },         acquisition_source: 'boss', source_id: 'telos',         wiki_url: 'https://runescape.wiki/w/Staff_of_Sliske' },
  { id: 'seismic_wand',           name: 'Seismic wand',              tier: 90, style: 'magic', slot: 'weapon', is_power_armour: 0, requirements_json: { Magic: 90 },         acquisition_source: 'boss', source_id: 'vorago',        wiki_url: 'https://runescape.wiki/w/Seismic_wand' },
  { id: 'seismic_singularity',    name: 'Seismic singularity',       tier: 90, style: 'magic', slot: 'offhand',is_power_armour: 0, requirements_json: { Magic: 90 },         acquisition_source: 'boss', source_id: 'vorago',        wiki_url: 'https://runescape.wiki/w/Seismic_singularity' },
  { id: 'noxious_staff',          name: 'Noxious staff',             tier: 90, style: 'magic', slot: 'weapon', is_power_armour: 0, requirements_json: { Magic: 90 },         acquisition_source: 'boss', source_id: 'araxxi',        wiki_url: 'https://runescape.wiki/w/Noxious_staff' },
  { id: 'cywir_wand',             name: 'Wand of the Cywir Elders',  tier: 85, style: 'magic', slot: 'weapon', is_power_armour: 0, requirements_json: { Magic: 85 },         acquisition_source: 'boss', source_id: 'helwyr',        wiki_url: 'https://runescape.wiki/w/Wand_of_the_Cywir_Elders' },
  { id: 'cywir_orb',              name: 'Cywir orb',                 tier: 85, style: 'magic', slot: 'offhand',is_power_armour: 0, requirements_json: { Magic: 85 },         acquisition_source: 'boss', source_id: 'helwyr',        wiki_url: 'https://runescape.wiki/w/Cywir_orb' },
  { id: 'chaotic_staff',          name: 'Chaotic staff',             tier: 80, style: 'magic', slot: 'weapon', is_power_armour: 0, requirements_json: { Magic: 80, Dungeoneering: 80 }, acquisition_source: 'dungeoneering', wiki_url: 'https://runescape.wiki/w/Chaotic_staff' },
  { id: 'virtus_wand',            name: 'Virtus wand',               tier: 80, style: 'magic', slot: 'weapon', is_power_armour: 0, requirements_json: { Magic: 80 },         acquisition_source: 'boss', source_id: 'nex',           wiki_url: 'https://runescape.wiki/w/Virtus_wand' },
  { id: 'virtus_book',            name: 'Virtus book',               tier: 80, style: 'magic', slot: 'offhand',is_power_armour: 0, requirements_json: { Magic: 80 },         acquisition_source: 'boss', source_id: 'nex',           wiki_url: 'https://runescape.wiki/w/Virtus_book' },
  { id: 'arcane_spirit_shield',   name: 'Arcane spirit shield',      tier: 75, style: 'magic', slot: 'offhand',is_power_armour: 0, requirements_json: { Magic: 75, Defence: 75 }, acquisition_source: 'boss', source_id: 'corporeal_beast', wiki_url: 'https://runescape.wiki/w/Arcane_spirit_shield' },
  { id: 'inquisitors_staff',      name: "Inquisitor's staff",        tier: 80, style: 'magic', slot: 'weapon', is_power_armour: 0, requirements_json: { Magic: 80 },         acquisition_source: 'boss', source_id: 'solak',         wiki_url: "https://runescape.wiki/w/Inquisitor's_staff" },

  // ══ MAGIC ARMOUR ═══════════════════════════════════════════════════════════
  // Tectonic (T90, crafted from Vorago tectonic scales)
  { id: 'tectonic_mask',          name: 'Tectonic mask',             tier: 90, style: 'magic', slot: 'head',   is_power_armour: 1, requirements_json: { Defence: 90 },     acquisition_source: 'crafting', source_id: 'vorago',         wiki_url: 'https://runescape.wiki/w/Tectonic_mask' },
  { id: 'tectonic_robe_top',      name: 'Tectonic robe top',         tier: 90, style: 'magic', slot: 'body',   is_power_armour: 1, requirements_json: { Defence: 90 },     acquisition_source: 'crafting', source_id: 'vorago',         wiki_url: 'https://runescape.wiki/w/Tectonic_robe_top' },
  { id: 'tectonic_robe_bottom',   name: 'Tectonic robe bottom',      tier: 90, style: 'magic', slot: 'legs',   is_power_armour: 1, requirements_json: { Defence: 90 },     acquisition_source: 'crafting', source_id: 'vorago',         wiki_url: 'https://runescape.wiki/w/Tectonic_robe_bottom' },
  // Blight (T95, Nex AoD)
  { id: 'blight_robe_top',        name: 'Blight robe top',           tier: 95, style: 'magic', slot: 'body',   is_power_armour: 1, requirements_json: { Defence: 95 },     acquisition_source: 'boss', source_id: 'nex_aod', wiki_url: 'https://runescape.wiki/w/Blight_robe_top' },
  { id: 'blight_robe_bottom',     name: 'Blight robe bottom',        tier: 95, style: 'magic', slot: 'legs',   is_power_armour: 1, requirements_json: { Defence: 95 },     acquisition_source: 'boss', source_id: 'nex_aod', wiki_url: 'https://runescape.wiki/w/Blight_robe_bottom' },
  // Virtus (T80, Nex)
  { id: 'virtus_mask',            name: 'Virtus mask',               tier: 80, style: 'magic', slot: 'head',   is_power_armour: 1, requirements_json: { Defence: 80, Constitution: 80 }, acquisition_source: 'boss', source_id: 'nex', wiki_url: 'https://runescape.wiki/w/Virtus_mask' },
  { id: 'virtus_robe_top',        name: 'Virtus robe top',           tier: 80, style: 'magic', slot: 'body',   is_power_armour: 1, requirements_json: { Defence: 80, Constitution: 80 }, acquisition_source: 'boss', source_id: 'nex', wiki_url: 'https://runescape.wiki/w/Virtus_robe_top' },
  { id: 'virtus_robe_legs',       name: 'Virtus robe legs',          tier: 80, style: 'magic', slot: 'legs',   is_power_armour: 1, requirements_json: { Defence: 80, Constitution: 80 }, acquisition_source: 'boss', source_id: 'nex', wiki_url: 'https://runescape.wiki/w/Virtus_robe_legs' },
  // Subjugation (T70, GWD1)
  { id: 'hood_of_subjugation',    name: 'Hood of subjugation',       tier: 70, style: 'magic', slot: 'head',   is_power_armour: 1, requirements_json: { Defence: 70 },     acquisition_source: 'boss', source_id: 'kril_tsutsaroth', wiki_url: 'https://runescape.wiki/w/Hood_of_subjugation' },
  { id: 'garb_of_subjugation',    name: 'Garb of subjugation',       tier: 70, style: 'magic', slot: 'body',   is_power_armour: 1, requirements_json: { Defence: 70 },     acquisition_source: 'boss', source_id: 'kril_tsutsaroth', wiki_url: 'https://runescape.wiki/w/Garb_of_subjugation' },
  { id: 'gown_of_subjugation',    name: 'Gown of subjugation',       tier: 70, style: 'magic', slot: 'legs',   is_power_armour: 1, requirements_json: { Defence: 70 },     acquisition_source: 'boss', source_id: 'kril_tsutsaroth', wiki_url: 'https://runescape.wiki/w/Gown_of_subjugation' },
  // Barrows magic
  { id: 'ahrims_hood',            name: "Ahrim's hood",              tier: 65, style: 'magic', slot: 'head',   is_power_armour: 0, requirements_json: { Magic: 70, Defence: 70 }, acquisition_source: 'boss', source_id: 'barrows', wiki_url: "https://runescape.wiki/w/Ahrim's_hood" },
  { id: 'ahrims_robe_top',        name: "Ahrim's robe top",          tier: 65, style: 'magic', slot: 'body',   is_power_armour: 0, requirements_json: { Magic: 70, Defence: 70 }, acquisition_source: 'boss', source_id: 'barrows', wiki_url: "https://runescape.wiki/w/Ahrim's_robe_top" },
  { id: 'ahrims_robe_skirt',      name: "Ahrim's robe skirt",        tier: 65, style: 'magic', slot: 'legs',   is_power_armour: 0, requirements_json: { Magic: 70, Defence: 70 }, acquisition_source: 'boss', source_id: 'barrows', wiki_url: "https://runescape.wiki/w/Ahrim's_robe_skirt" },

  // ══ NECROMANCY ══════════════════════════════════════════════════════════════
  { id: 'soulbound_lantern',      name: 'Soulbound Lantern',         tier: 95, style: 'necromancy', slot: 'offhand', is_power_armour: 0, requirements_json: { Necromancy: 95 }, acquisition_source: 'boss', source_id: 'rasial', wiki_url: 'https://runescape.wiki/w/Soulbound_Lantern' },
  { id: 'deathdealer_top_t90',    name: 'Deathdealer robe top (T90)',tier: 90, style: 'necromancy', slot: 'body',   is_power_armour: 1, requirements_json: { Necromancy: 90, Defence: 90 }, acquisition_source: 'boss', source_id: 'rasial', wiki_url: 'https://runescape.wiki/w/Deathdealer_robe_top_(tier_90)' },
  { id: 'deathdealer_bottom_t90', name: 'Deathdealer robe bottom (T90)', tier: 90, style: 'necromancy', slot: 'legs', is_power_armour: 1, requirements_json: { Necromancy: 90, Defence: 90 }, acquisition_source: 'boss', source_id: 'rasial', wiki_url: 'https://runescape.wiki/w/Deathdealer_robe_bottom_(tier_90)' },
  { id: 'cryptbloom_helm',        name: 'Cryptbloom helm',           tier: 90, style: 'magic',  slot: 'head',   is_power_armour: 0, requirements_json: { Magic: 90, Defence: 90 }, acquisition_source: 'boss', source_id: 'croesus', wiki_url: 'https://runescape.wiki/w/Cryptbloom_helm' },
  { id: 'cryptbloom_top',         name: 'Cryptbloom top',            tier: 90, style: 'magic',  slot: 'body',   is_power_armour: 0, requirements_json: { Magic: 90, Defence: 90 }, acquisition_source: 'boss', source_id: 'croesus', wiki_url: 'https://runescape.wiki/w/Cryptbloom_top' },
  { id: 'zemouregal_amulet',      name: "Zemouregal's amulet",       tier: 80, style: 'necromancy', slot: 'neck',   is_power_armour: 0, requirements_json: { Necromancy: 80 }, acquisition_source: 'boss', source_id: 'zemouregal_vorkath', wiki_url: "https://runescape.wiki/w/Zemouregal's_amulet" },

  // ══ ACCESSORIES (all styles) ════════════════════════════════════════════════
  // Boots
  { id: 'laceration_boots',       name: 'Laceration boots',          tier: 90, style: 'melee',  slot: 'boots',  is_power_armour: 0, requirements_json: { Defence: 80 },     acquisition_source: 'boss', source_id: 'raksha',        wiki_url: 'https://runescape.wiki/w/Laceration_boots' },
  { id: 'steadfast_boots',        name: 'Steadfast boots',           tier: 85, style: 'melee',  slot: 'boots',  is_power_armour: 0, requirements_json: { Defence: 85 },     acquisition_source: 'boss', source_id: 'glacors',       wiki_url: 'https://runescape.wiki/w/Steadfast_boots' },
  { id: 'fleeting_boots',         name: 'Fleeting boots',            tier: 90, style: 'ranged', slot: 'boots',  is_power_armour: 0, requirements_json: { Defence: 80 },     acquisition_source: 'boss', source_id: 'raksha',        wiki_url: 'https://runescape.wiki/w/Fleeting_boots' },
  { id: 'glaiven_boots',          name: 'Glaiven boots',             tier: 85, style: 'ranged', slot: 'boots',  is_power_armour: 0, requirements_json: { Defence: 85 },     acquisition_source: 'boss', source_id: 'glacors',       wiki_url: 'https://runescape.wiki/w/Glaiven_boots' },
  { id: 'ragefire_boots',         name: 'Ragefire boots',            tier: 85, style: 'magic',  slot: 'boots',  is_power_armour: 0, requirements_json: { Defence: 85 },     acquisition_source: 'boss', source_id: 'glacors',       wiki_url: 'https://runescape.wiki/w/Ragefire_boots' },
  { id: 'dragon_boots',           name: 'Dragon boots',              tier: 60, style: 'melee',  slot: 'boots',  is_power_armour: 0, requirements_json: { Defence: 60 },     acquisition_source: 'slayer', source_id: 'spiritual_mage', wiki_url: 'https://runescape.wiki/w/Dragon_boots' },
  // Gloves
  { id: 'cinderbane_gloves',      name: 'Cinderbane gloves',         tier: 70, style: 'all',   slot: 'gloves', is_power_armour: 0, requirements_json: {},                  acquisition_source: 'boss', source_id: 'raksha',        wiki_url: 'https://runescape.wiki/w/Cinderbane_gloves' },
  { id: 'goliath_gloves',         name: 'Goliath gloves',            tier: 80, style: 'melee', slot: 'gloves', is_power_armour: 0, requirements_json: { Attack: 80, Defence: 80 }, acquisition_source: 'minigame', source_id: 'dominion_tower', wiki_url: 'https://runescape.wiki/w/Goliath_gloves' },
  { id: 'swift_gloves',           name: 'Swift gloves',              tier: 80, style: 'ranged',slot: 'gloves', is_power_armour: 0, requirements_json: { Ranged: 80, Defence: 80 }, acquisition_source: 'minigame', source_id: 'dominion_tower', wiki_url: 'https://runescape.wiki/w/Swift_gloves' },
  { id: 'spellcaster_gloves',     name: 'Spellcaster gloves',        tier: 80, style: 'magic', slot: 'gloves', is_power_armour: 0, requirements_json: { Magic: 80, Defence: 80 }, acquisition_source: 'minigame', source_id: 'dominion_tower', wiki_url: 'https://runescape.wiki/w/Spellcaster_gloves' },
  { id: 'kerapac_wrist_wraps',    name: "Kerapac's wrist wraps",     tier: 90, style: 'magic', slot: 'gloves', is_power_armour: 0, requirements_json: { Defence: 90 },     acquisition_source: 'boss', source_id: 'kerapac',       wiki_url: "https://runescape.wiki/w/Kerapac's_wrist_wraps" },
  // Amulets / neck
  { id: 'amulet_of_souls',        name: 'Amulet of souls',           tier: 80, style: 'all',  slot: 'neck',   is_power_armour: 0, requirements_json: {},                  acquisition_source: 'slayer', source_id: 'soulgazer',     wiki_url: 'https://runescape.wiki/w/Amulet_of_souls' },
  { id: 'amulet_of_fury',         name: 'Amulet of fury',            tier: 70, style: 'all',  slot: 'neck',   is_power_armour: 0, requirements_json: {},                  acquisition_source: 'crafting',                         wiki_url: 'https://runescape.wiki/w/Amulet_of_fury' },
  { id: 'reaper_necklace',        name: 'Reaper necklace',           tier: 90, style: 'all',  slot: 'neck',   is_power_armour: 0, requirements_json: {},                  acquisition_source: 'crafting',                         wiki_url: 'https://runescape.wiki/w/Reaper_necklace' },
  { id: 'salve_amulet_e',         name: 'Salve amulet (e)',          tier: 70, style: 'all',  slot: 'neck',   is_power_armour: 0, requirements_json: { Slayer: 40 },       acquisition_source: 'quest', quest: 'Lair of Tarn Razorlor', wiki_url: 'https://runescape.wiki/w/Salve_amulet_(e)' },
  { id: 'arcane_stream',          name: 'Arcane stream necklace',    tier: 80, style: 'magic',slot: 'neck',   is_power_armour: 0, requirements_json: { Dungeoneering: 80 }, acquisition_source: 'dungeoneering',                    wiki_url: 'https://runescape.wiki/w/Arcane_stream_necklace' },
  // Rings
  { id: 'berserker_ring_i',       name: 'Berserker ring (i)',        tier: 70, style: 'melee', slot: 'ring',   is_power_armour: 0, requirements_json: {},                  acquisition_source: 'boss', source_id: 'dagannoth_kings', wiki_url: 'https://runescape.wiki/w/Berserker_ring_(i)' },
  { id: 'archers_ring_i',         name: "Archers' ring (i)",         tier: 70, style: 'ranged',slot: 'ring',   is_power_armour: 0, requirements_json: {},                  acquisition_source: 'boss', source_id: 'dagannoth_kings', wiki_url: 'https://runescape.wiki/w/Archers%27_ring_(i)' },
  { id: 'seers_ring_i',           name: "Seers' ring (i)",           tier: 70, style: 'magic', slot: 'ring',   is_power_armour: 0, requirements_json: {},                  acquisition_source: 'boss', source_id: 'dagannoth_kings', wiki_url: "https://runescape.wiki/w/Seers'_ring_(i)" },
  { id: 'asylum_surgeons_ring',   name: "Asylum surgeon's ring",     tier: 0,  style: 'all',  slot: 'ring',   is_power_armour: 0, requirements_json: {},                  acquisition_source: 'minigame',                         wiki_url: "https://runescape.wiki/w/Asylum_surgeon's_ring" },
  // Capes
  { id: 'igneous_kal_zuk',        name: 'Igneous Kal-Zuk',           tier: 95, style: 'all',  slot: 'cape',   is_power_armour: 0, requirements_json: {},                  acquisition_source: 'boss', source_id: 'tzkal_zuk',     wiki_url: 'https://runescape.wiki/w/Igneous_Kal-Zuk' },
  { id: 'igneous_kal_ket',        name: 'Igneous Kal-Ket',           tier: 95, style: 'melee', slot: 'cape',  is_power_armour: 0, requirements_json: {},                  acquisition_source: 'boss', source_id: 'tzkal_zuk',     wiki_url: 'https://runescape.wiki/w/Igneous_Kal-Ket' },
  { id: 'igneous_kal_xil',        name: 'Igneous Kal-Xil',           tier: 95, style: 'ranged',slot: 'cape',  is_power_armour: 0, requirements_json: {},                  acquisition_source: 'boss', source_id: 'tzkal_zuk',     wiki_url: 'https://runescape.wiki/w/Igneous_Kal-Xil' },
  { id: 'igneous_kal_mej',        name: 'Igneous Kal-Mej',           tier: 95, style: 'magic', slot: 'cape',  is_power_armour: 0, requirements_json: {},                  acquisition_source: 'boss', source_id: 'tzkal_zuk',     wiki_url: 'https://runescape.wiki/w/Igneous_Kal-Mej' },
  { id: 'igneous_kal_mor',        name: 'Igneous Kal-Mor',           tier: 95, style: 'necromancy', slot: 'cape', is_power_armour: 0, requirements_json: {},              acquisition_source: 'boss', source_id: 'tzkal_zuk',     wiki_url: 'https://runescape.wiki/w/Igneous_Kal-Mor' },
  { id: 'tokhaar_kal_ket',        name: 'TokHaar-Kal-Ket',           tier: 80, style: 'melee', slot: 'cape',  is_power_armour: 0, requirements_json: {},                  acquisition_source: 'boss', source_id: 'har_aken', quest: 'The Elder Kiln', wiki_url: 'https://runescape.wiki/w/TokHaar-Kal-Ket' },
  { id: 'tokhaar_kal_xil',        name: 'TokHaar-Kal-Xil',           tier: 80, style: 'ranged',slot: 'cape',  is_power_armour: 0, requirements_json: {},                  acquisition_source: 'boss', source_id: 'har_aken', quest: 'The Elder Kiln', wiki_url: 'https://runescape.wiki/w/TokHaar-Kal-Xil' },
  { id: 'tokhaar_kal_mej',        name: 'TokHaar-Kal-Mej',           tier: 80, style: 'magic', slot: 'cape',  is_power_armour: 0, requirements_json: {},                  acquisition_source: 'boss', source_id: 'har_aken', quest: 'The Elder Kiln', wiki_url: 'https://runescape.wiki/w/TokHaar-Kal-Mej' },
  { id: 'fire_cape_item',         name: 'Fire cape',                 tier: 0,  style: 'all',  slot: 'cape',   is_power_armour: 0, requirements_json: {},                  acquisition_source: 'boss', source_id: 'tztok_jad',     wiki_url: 'https://runescape.wiki/w/Fire_cape' },
  { id: 'completionist_cape',     name: 'Completionist cape',        tier: 0,  style: 'all',  slot: 'cape',   is_power_armour: 0, requirements_json: { Attack: 99 },       acquisition_source: 'achievement',                      wiki_url: 'https://runescape.wiki/w/Completionist_cape' },
  { id: 'max_cape',               name: 'Max cape',                  tier: 0,  style: 'all',  slot: 'cape',   is_power_armour: 0, requirements_json: { Attack: 99 },       acquisition_source: 'achievement',                      wiki_url: 'https://runescape.wiki/w/Max_cape' },
  // Shields
  { id: 'elysian_spirit_shield',  name: 'Elysian spirit shield',     tier: 75, style: 'all',  slot: 'offhand',is_power_armour: 0, requirements_json: { Defence: 75 },     acquisition_source: 'boss', source_id: 'corporeal_beast', wiki_url: 'https://runescape.wiki/w/Elysian_spirit_shield' },
  { id: 'divine_spirit_shield',   name: 'Divine spirit shield',      tier: 75, style: 'all',  slot: 'offhand',is_power_armour: 0, requirements_json: { Defence: 75 },     acquisition_source: 'boss', source_id: 'corporeal_beast', wiki_url: 'https://runescape.wiki/w/Divine_spirit_shield' },
  // Pocket
  { id: 'scripture_of_jas',       name: 'Scripture of Jas',          tier: 0,  style: 'all',  slot: 'pocket', is_power_armour: 0, requirements_json: {},                  acquisition_source: 'ge',                               wiki_url: 'https://runescape.wiki/w/Scripture_of_Jas' },
  { id: 'scripture_of_bik',       name: 'Scripture of Bik',          tier: 0,  style: 'all',  slot: 'pocket', is_power_armour: 0, requirements_json: {},                  acquisition_source: 'ge',                               wiki_url: 'https://runescape.wiki/w/Scripture_of_Bik' },
  { id: 'grimoire_erethdor',      name: "Erethdor's grimoire",        tier: 0,  style: 'all',  slot: 'pocket', is_power_armour: 0, requirements_json: {},                  acquisition_source: 'boss', source_id: 'solak',         wiki_url: "https://runescape.wiki/w/Erethdor's_grimoire" },
  { id: 'scripture_of_ful',      name: 'Scripture of Ful',           tier: 0,  style: 'all',  slot: 'pocket', is_power_armour: 0, requirements_json: {},                  acquisition_source: 'boss', source_id: 'tzkal_zuk',     wiki_url: 'https://runescape.wiki/w/Scripture_of_Ful' },
  // Dragon tier
  { id: 'dragon_claws',           name: 'Dragon claws',              tier: 60, style: 'melee', slot: 'weapon', is_power_armour: 0, requirements_json: { Attack: 60 },       acquisition_source: 'boss', source_id: 'tormented_demons', wiki_url: 'https://runescape.wiki/w/Dragon_claws' },
  { id: 'dragon_pickaxe',         name: 'Dragon pickaxe',            tier: 70, style: 'melee', slot: 'weapon', is_power_armour: 0, requirements_json: { Attack: 60 },       acquisition_source: 'boss', source_id: 'chaos_elemental',  wiki_url: 'https://runescape.wiki/w/Dragon_pickaxe' },

  // ══ SLAYER — WEAPONS ══════════════════════════════════════════════════════
  { id: 'abyssal_wand',           name: 'Abyssal wand',              tier: 70, style: 'magic',  slot: 'weapon',  is_power_armour: 0, requirements_json: { Magic: 70 },              acquisition_source: 'slayer', source_id: 'abyssal_demon',     wiki_url: 'https://runescape.wiki/w/Abyssal_wand' },
  { id: 'abyssal_orb',            name: 'Abyssal orb',               tier: 70, style: 'magic',  slot: 'offhand', is_power_armour: 0, requirements_json: { Magic: 70 },              acquisition_source: 'slayer', source_id: 'abyssal_demon',     wiki_url: 'https://runescape.wiki/w/Abyssal_orb' },
  { id: 'abyssal_scourge',        name: 'Abyssal scourge',           tier: 87, style: 'melee',  slot: 'weapon',  is_power_armour: 0, requirements_json: { Attack: 87 },             acquisition_source: 'slayer', source_id: 'abyssal_lord',      wiki_url: 'https://runescape.wiki/w/Abyssal_scourge' },
  { id: 'ripper_claw',            name: 'Ripper claw',               tier: 92, style: 'melee',  slot: 'weapon',  is_power_armour: 0, requirements_json: { Attack: 90 },             acquisition_source: 'slayer', source_id: 'ripper_demon',      wiki_url: 'https://runescape.wiki/w/Ripper_claw' },
  { id: 'oh_ripper_claw',         name: 'Off-hand Ripper claw',      tier: 92, style: 'melee',  slot: 'offhand', is_power_armour: 0, requirements_json: { Attack: 90 },             acquisition_source: 'slayer', source_id: 'ripper_demon',      wiki_url: 'https://runescape.wiki/w/Off-hand_Ripper_claw' },
  { id: 'granite_maul',           name: 'Granite maul',              tier: 50, style: 'melee',  slot: 'weapon',  is_power_armour: 0, requirements_json: { Attack: 50, Strength: 50 }, acquisition_source: 'slayer', source_id: 'gargoyle',        wiki_url: 'https://runescape.wiki/w/Granite_maul' },
  { id: 'dark_bow',               name: 'Dark bow',                  tier: 60, style: 'ranged', slot: 'weapon',  is_power_armour: 0, requirements_json: { Ranged: 60 },             acquisition_source: 'slayer', source_id: 'dark_beast',        wiki_url: 'https://runescape.wiki/w/Dark_bow' },
  { id: 'staff_of_light',         name: 'Staff of light',            tier: 75, style: 'magic',  slot: 'weapon',  is_power_armour: 0, requirements_json: { Magic: 75 },              acquisition_source: 'slayer', source_id: 'ice_strykewyrm',    wiki_url: 'https://runescape.wiki/w/Staff_of_light' },
  { id: 'wyvern_crossbow',        name: 'Wyvern crossbow',           tier: 85, style: 'ranged', slot: 'weapon',  is_power_armour: 0, requirements_json: { Ranged: 85 },             acquisition_source: 'slayer', source_id: 'wyvern',            wiki_url: 'https://runescape.wiki/w/Wyvern_crossbow' },
  { id: 'camel_staff',            name: 'Camel staff',               tier: 82, style: 'magic',  slot: 'weapon',  is_power_armour: 0, requirements_json: { Magic: 82 },              acquisition_source: 'slayer', source_id: 'camel_warrior',     wiki_url: 'https://runescape.wiki/w/Camel_staff' },
  { id: 'polypore_staff',         name: 'Polypore staff',            tier: 75, style: 'magic',  slot: 'weapon',  is_power_armour: 0, requirements_json: { Magic: 75 },              acquisition_source: 'slayer', source_id: 'ganodermic_beast',  wiki_url: 'https://runescape.wiki/w/Polypore_staff' },

  // ══ SLAYER — ARMOUR & ACCESSORIES ═════════════════════════════════════════
  // Abyssal Beast (Slayer 105) → T80 melee helm
  { id: 'jaws_of_the_abyss',      name: 'Jaws of the Abyss',         tier: 80, style: 'melee',  slot: 'head',    is_power_armour: 1, requirements_json: { Defence: 80 },            acquisition_source: 'slayer', source_id: 'abyssal_beast',     wiki_url: 'https://runescape.wiki/w/Jaws_of_the_Abyss' },
  // Automaton Guardian (Slayer 67) → T70 style-specific gloves
  { id: 'static_gloves',          name: 'Static gloves',             tier: 70, style: 'magic',  slot: 'gloves',  is_power_armour: 0, requirements_json: { Magic: 70, Defence: 70 }, acquisition_source: 'slayer', source_id: 'automaton_guardian', wiki_url: 'https://runescape.wiki/w/Static_gloves' },
  { id: 'tracking_gloves',        name: 'Tracking gloves',           tier: 70, style: 'ranged', slot: 'gloves',  is_power_armour: 0, requirements_json: { Ranged: 70, Defence: 70 }, acquisition_source: 'slayer', source_id: 'automaton_guardian', wiki_url: 'https://runescape.wiki/w/Tracking_gloves' },
  { id: 'pneumatic_gloves',       name: 'Pneumatic gloves',          tier: 70, style: 'melee',  slot: 'gloves',  is_power_armour: 0, requirements_json: { Attack: 70, Defence: 70 }, acquisition_source: 'slayer', source_id: 'automaton_guardian', wiki_url: 'https://runescape.wiki/w/Pneumatic_gloves' },
  // Airut (Slayer 92) → T75 ranged gloves
  { id: 'razorback_gauntlets',    name: 'Razorback gauntlets',       tier: 75, style: 'ranged', slot: 'gloves',  is_power_armour: 0, requirements_json: { Defence: 75 },            acquisition_source: 'slayer', source_id: 'airut',             wiki_url: 'https://runescape.wiki/w/Razorback_gauntlets' },
  // Ganodermic (Slayer 95/112) → T75 magic set
  { id: 'ganodermic_poncho',      name: 'Ganodermic poncho',         tier: 75, style: 'magic',  slot: 'body',    is_power_armour: 1, requirements_json: { Defence: 75 },            acquisition_source: 'slayer', source_id: 'ganodermic_beast',  wiki_url: 'https://runescape.wiki/w/Ganodermic_poncho' },
  { id: 'ganodermic_leggings',    name: 'Ganodermic leggings',       tier: 75, style: 'magic',  slot: 'legs',    is_power_armour: 1, requirements_json: { Defence: 75 },            acquisition_source: 'slayer', source_id: 'ganodermic_beast',  wiki_url: 'https://runescape.wiki/w/Ganodermic_leggings' },
  { id: 'ganodermic_boots',       name: 'Ganodermic boots',          tier: 75, style: 'magic',  slot: 'boots',   is_power_armour: 1, requirements_json: { Defence: 75 },            acquisition_source: 'slayer', source_id: 'ganodermic_runt',   wiki_url: 'https://runescape.wiki/w/Ganodermic_boots' },
  { id: 'ganodermic_gloves',      name: 'Ganodermic gloves',         tier: 75, style: 'magic',  slot: 'gloves',  is_power_armour: 1, requirements_json: { Defence: 75 },            acquisition_source: 'slayer', source_id: 'ganodermic_runt',   wiki_url: 'https://runescape.wiki/w/Ganodermic_gloves' },
  // Gemstone Dragons (Slayer 95–101) → T80 all-style set
  { id: 'gemstone_gauntlets',     name: 'Gemstone gauntlets',        tier: 80, style: 'all',    slot: 'gloves',  is_power_armour: 0, requirements_json: { Defence: 80 },            acquisition_source: 'slayer', source_id: 'dragonstone_dragon', wiki_url: 'https://runescape.wiki/w/Gemstone_gauntlets' },
  { id: 'gemstone_boots',         name: 'Gemstone boots',            tier: 80, style: 'all',    slot: 'boots',   is_power_armour: 0, requirements_json: { Defence: 80 },            acquisition_source: 'slayer', source_id: 'dragonstone_dragon', wiki_url: 'https://runescape.wiki/w/Gemstone_boots' },
  { id: 'gemstone_helm',          name: 'Gemstone helm',             tier: 80, style: 'all',    slot: 'head',    is_power_armour: 0, requirements_json: { Defence: 80 },            acquisition_source: 'slayer', source_id: 'onyx_dragon',       wiki_url: 'https://runescape.wiki/w/Gemstone_helm' },
  { id: 'gemstone_greaves',       name: 'Gemstone greaves',          tier: 80, style: 'all',    slot: 'legs',    is_power_armour: 0, requirements_json: { Defence: 80 },            acquisition_source: 'slayer', source_id: 'onyx_dragon',       wiki_url: 'https://runescape.wiki/w/Gemstone_greaves' },
  { id: 'gemstone_hauberk',       name: 'Gemstone hauberk',          tier: 80, style: 'all',    slot: 'body',    is_power_armour: 0, requirements_json: { Defence: 80 },            acquisition_source: 'slayer', source_id: 'hydrix_dragon',     wiki_url: 'https://runescape.wiki/w/Gemstone_hauberk' },
  { id: 'gemstone_amulet',        name: 'Gemstone amulet',           tier: 80, style: 'all',    slot: 'neck',    is_power_armour: 0, requirements_json: {},                         acquisition_source: 'slayer', source_id: 'hydrix_dragon',     wiki_url: 'https://runescape.wiki/w/Gemstone_amulet' },

  // ══ SKILL-UNLOCK GEAR ════════════════════════════════════════════════════
  // Crafting — Slayer helmet (Black mask + Slayer items, 55 Crafting)
  { id: 'slayer_helmet',          name: 'Slayer helmet',             tier: 55, style: 'all',    slot: 'head',    is_power_armour: 0, requirements_json: { Slayer: 1, Crafting: 55 }, acquisition_source: 'crafting', wiki_url: 'https://runescape.wiki/w/Slayer_helmet' },
  // Crafting — Dragonhide armour
  { id: 'black_dhide_body',       name: 'Black dragonhide body',     tier: 70, style: 'ranged', slot: 'body',    is_power_armour: 0, requirements_json: { Defence: 70, Crafting: 77 }, acquisition_source: 'crafting', wiki_url: 'https://runescape.wiki/w/Black_dragonhide_body' },
  { id: 'royal_dhide_body',       name: 'Royal dragonhide body',     tier: 65, style: 'ranged', slot: 'body',    is_power_armour: 0, requirements_json: { Defence: 65, Crafting: 93 }, acquisition_source: 'crafting', wiki_url: 'https://runescape.wiki/w/Royal_dragonhide_body' },
  // Prifddinas crystal weapons — require 90 Smithing + 90 Crafting to sing from crystal seeds
  { id: 'crystal_bow',            name: 'Crystal bow',               tier: 70, style: 'ranged', slot: 'weapon',  is_power_armour: 0, requirements_json: { Ranged: 70, Smithing: 90, Crafting: 90 }, acquisition_source: 'crafting', wiki_url: 'https://runescape.wiki/w/Crystal_bow' },
  { id: 'crystal_shield',         name: 'Crystal shield',            tier: 70, style: 'all',    slot: 'offhand', is_power_armour: 0, requirements_json: { Defence: 70, Smithing: 90, Crafting: 90 }, acquisition_source: 'crafting', wiki_url: 'https://runescape.wiki/w/Crystal_shield' },
  { id: 'crystal_halberd',        name: 'Crystal halberd',           tier: 70, style: 'melee',  slot: 'weapon',  is_power_armour: 0, requirements_json: { Attack: 70, Smithing: 90, Crafting: 90 }, acquisition_source: 'crafting', wiki_url: 'https://runescape.wiki/w/Crystal_halberd' },
  // Hunter — Black chinchompa (T55 thrown ranged, requires 73 Hunter to catch)
  { id: 'black_chinchompa',       name: 'Black chinchompa',          tier: 55, style: 'ranged', slot: 'weapon',  is_power_armour: 0, requirements_json: { Ranged: 55, Hunter: 73 }, acquisition_source: 'skilling',  wiki_url: 'https://runescape.wiki/w/Black_chinchompa' },
  // Necromancy — Deathdealer robes lower tiers (from Death's Shop, bought with Slayer points/Necromancy training)
  { id: 'deathdealer_top_t60',    name: 'Deathdealer robe top (T60)',    tier: 60, style: 'necromancy', slot: 'body',  is_power_armour: 1, requirements_json: { Necromancy: 60, Defence: 60 }, acquisition_source: 'shop', wiki_url: 'https://runescape.wiki/w/Deathdealer_robe_top_(tier_60)' },
  { id: 'deathdealer_bottom_t60', name: 'Deathdealer robe bottom (T60)', tier: 60, style: 'necromancy', slot: 'legs',  is_power_armour: 1, requirements_json: { Necromancy: 60, Defence: 60 }, acquisition_source: 'shop', wiki_url: 'https://runescape.wiki/w/Deathdealer_robe_bottom_(tier_60)' },
  { id: 'deathdealer_top_t70',    name: 'Deathdealer robe top (T70)',    tier: 70, style: 'necromancy', slot: 'body',  is_power_armour: 1, requirements_json: { Necromancy: 70, Defence: 70 }, acquisition_source: 'shop', wiki_url: 'https://runescape.wiki/w/Deathdealer_robe_top_(tier_70)' },
  { id: 'deathdealer_bottom_t70', name: 'Deathdealer robe bottom (T70)', tier: 70, style: 'necromancy', slot: 'legs',  is_power_armour: 1, requirements_json: { Necromancy: 70, Defence: 70 }, acquisition_source: 'shop', wiki_url: 'https://runescape.wiki/w/Deathdealer_robe_bottom_(tier_70)' },
  { id: 'deathdealer_top_t80',    name: 'Deathdealer robe top (T80)',    tier: 80, style: 'necromancy', slot: 'body',  is_power_armour: 1, requirements_json: { Necromancy: 80, Defence: 80 }, acquisition_source: 'boss', source_id: 'rasial', wiki_url: 'https://runescape.wiki/w/Deathdealer_robe_top_(tier_80)' },
  { id: 'deathdealer_bottom_t80', name: 'Deathdealer robe bottom (T80)', tier: 80, style: 'necromancy', slot: 'legs',  is_power_armour: 1, requirements_json: { Necromancy: 80, Defence: 80 }, acquisition_source: 'boss', source_id: 'rasial', wiki_url: 'https://runescape.wiki/w/Deathdealer_robe_bottom_(tier_80)' },
  // Necromancy — Cryptbloom (T90, Croesus) — missing legs piece
  { id: 'cryptbloom_bottom',      name: 'Cryptbloom bottom',         tier: 90, style: 'magic',  slot: 'legs',   is_power_armour: 0, requirements_json: { Magic: 90, Defence: 90 }, acquisition_source: 'boss', source_id: 'croesus', wiki_url: 'https://runescape.wiki/w/Cryptbloom_bottom' },

  // ── MELEE (new from PvM wiki scrape) ──
  { id: 'masterwork_spear_of_annihilation', name: "Masterwork spear of annihilation", tier: 92, style: 'melee', slot: 'weapon', is_power_armour: 0, requirements_json: { Attack: 92, Smithing: 99 }, acquisition_source: 'crafted', source_id: null, wiki_url: 'https://runescape.wiki/w/Masterwork_spear_of_annihilation' },
  { id: 'khopesh_of_tumeken', name: "Khopesh of Tumeken", tier: 92, style: 'melee', slot: 'weapon', is_power_armour: 0, requirements_json: { Attack: 92 }, acquisition_source: 'crafted', source_id: 'khopesh_of_the_kharidian', wiki_url: 'https://runescape.wiki/w/Khopesh_of_Tumeken' },
  { id: 'off_hand_khopesh_of_tumeken', name: "Off-hand khopesh of Tumeken", tier: 92, style: 'melee', slot: 'offhand', is_power_armour: 0, requirements_json: { Attack: 92 }, acquisition_source: 'crafted', source_id: 'off_hand_khopesh_of_the_kharidian', wiki_url: 'https://runescape.wiki/w/Off-hand_khopesh_of_Tumeken' },
  { id: 'armadyl_godsword', name: "Armadyl godsword", tier: 75, style: 'melee', slot: 'weapon', is_power_armour: 0, requirements_json: { Attack: 75 }, acquisition_source: 'boss_drop', source_id: 'kreearra', wiki_url: 'https://runescape.wiki/w/Armadyl_godsword' },
  { id: 'bandos_godsword', name: "Bandos godsword", tier: 75, style: 'melee', slot: 'weapon', is_power_armour: 0, requirements_json: { Attack: 75 }, acquisition_source: 'boss_drop', source_id: 'general_graardor', wiki_url: 'https://runescape.wiki/w/Bandos_godsword' },
  { id: 'saradomin_godsword', name: "Saradomin godsword", tier: 75, style: 'melee', slot: 'weapon', is_power_armour: 0, requirements_json: { Attack: 75 }, acquisition_source: 'boss_drop', source_id: 'commander_zilyana', wiki_url: 'https://runescape.wiki/w/Saradomin_godsword' },
  { id: 'zamorak_godsword', name: "Zamorak godsword", tier: 75, style: 'melee', slot: 'weapon', is_power_armour: 0, requirements_json: { Attack: 75 }, acquisition_source: 'boss_drop', source_id: 'kril_tsutsaroth', wiki_url: 'https://runescape.wiki/w/Zamorak_godsword' },
  { id: 'zamorakian_spear', name: "Zamorakian spear", tier: 75, style: 'melee', slot: 'weapon', is_power_armour: 0, requirements_json: { Attack: 75 }, acquisition_source: 'boss_drop', source_id: 'kril_tsutsaroth', wiki_url: 'https://runescape.wiki/w/Zamorakian_spear' },
  { id: 'attuned_crystal_dagger', name: "Attuned crystal dagger", tier: 80, style: 'melee', slot: 'weapon', is_power_armour: 0, requirements_json: { Attack: 80, Agility: 50 }, acquisition_source: 'crafted', source_id: 'singing_bowl', wiki_url: 'https://runescape.wiki/w/Attuned_crystal_dagger' },
  { id: 'off_hand_attuned_crystal_dagger', name: "Off-hand attuned crystal dagger", tier: 80, style: 'melee', slot: 'offhand', is_power_armour: 0, requirements_json: { Attack: 80, Agility: 50 }, acquisition_source: 'crafted', source_id: 'singing_bowl', wiki_url: 'https://runescape.wiki/w/Off-hand_attuned_crystal_dagger' },
  { id: 'attuned_crystal_halberd', name: "Attuned crystal halberd", tier: 80, style: 'melee', slot: 'weapon', is_power_armour: 0, requirements_json: { Attack: 80, Agility: 50 }, acquisition_source: 'crafted', source_id: 'singing_bowl', wiki_url: 'https://runescape.wiki/w/Attuned_crystal_halberd' },
  { id: 'dragon_defender', name: "Dragon defender", tier: 60, style: 'melee', slot: 'offhand', is_power_armour: 0, requirements_json: { Attack: 60, Defence: 60 }, acquisition_source: 'monster_drop', source_id: 'cyclops_warriors_guild', wiki_url: 'https://runescape.wiki/w/Dragon_defender' },
  { id: 'vestments_of_havoc_boots', name: "Vestments of Havoc boots", tier: 95, style: 'melee', slot: 'boots', is_power_armour: 1, requirements_json: { Defence: 95 }, acquisition_source: 'boss_drop', source_id: 'zamorak_lord_of_chaos', wiki_url: 'https://runescape.wiki/w/Vestments_of_Havoc_boots' },
  { id: 'trimmed_masterwork_gloves', name: "Trimmed masterwork gloves", tier: 92, style: 'melee', slot: 'gloves', is_power_armour: 1, requirements_json: { Defence: 92, Smithing: 99 }, acquisition_source: 'crafted', source_id: null, wiki_url: 'https://runescape.wiki/w/Trimmed_masterwork_gloves' },
  { id: 'trimmed_masterwork_boots', name: "Trimmed masterwork boots", tier: 92, style: 'melee', slot: 'boots', is_power_armour: 1, requirements_json: { Defence: 92, Smithing: 99 }, acquisition_source: 'crafted', source_id: null, wiki_url: 'https://runescape.wiki/w/Trimmed_masterwork_boots' },
  { id: 'masterwork_gloves', name: "Masterwork gloves", tier: 90, style: 'melee', slot: 'gloves', is_power_armour: 1, requirements_json: { Defence: 90, Smithing: 99 }, acquisition_source: 'crafted', source_id: null, wiki_url: 'https://runescape.wiki/w/Masterwork_gloves' },
  { id: 'masterwork_boots', name: "Masterwork boots", tier: 90, style: 'melee', slot: 'boots', is_power_armour: 1, requirements_json: { Defence: 90, Smithing: 99 }, acquisition_source: 'crafted', source_id: null, wiki_url: 'https://runescape.wiki/w/Masterwork_boots' },
  { id: 'refined_anima_core_helm_of_zaros', name: "Refined anima core helm of Zaros", tier: 80, style: 'melee', slot: 'head', is_power_armour: 1, requirements_json: { Defence: 80 }, acquisition_source: 'crafted', source_id: 'anima_core_helm_of_zaros', wiki_url: 'https://runescape.wiki/w/Refined_anima_core_helm_of_Zaros' },
  { id: 'refined_anima_core_body_of_zaros', name: "Refined anima core body of Zaros", tier: 80, style: 'melee', slot: 'body', is_power_armour: 1, requirements_json: { Defence: 80 }, acquisition_source: 'crafted', source_id: 'anima_core_body_of_zaros', wiki_url: 'https://runescape.wiki/w/Refined_anima_core_body_of_Zaros' },
  { id: 'refined_anima_core_legs_of_zaros', name: "Refined anima core legs of Zaros", tier: 80, style: 'melee', slot: 'legs', is_power_armour: 1, requirements_json: { Defence: 80 }, acquisition_source: 'crafted', source_id: 'anima_core_legs_of_zaros', wiki_url: 'https://runescape.wiki/w/Refined_anima_core_legs_of_Zaros' },
  { id: 'reaver_ring', name: "Reaver's ring", tier: 0, style: 'melee', slot: 'ring', is_power_armour: 0, requirements_json: { Crafting: 70 }, acquisition_source: 'crafted', source_id: 'heart_of_berserker', wiki_url: "https://runescape.wiki/w/Reaver's_ring" },
  { id: 'champions_ring', name: "Champion's ring", tier: 0, style: 'melee', slot: 'ring', is_power_armour: 0, requirements_json: { Crafting: 70 }, acquisition_source: 'crafted', source_id: 'heart_of_warrior', wiki_url: "https://runescape.wiki/w/Champion's_ring" },
  { id: 'scrimshaw_of_vampyrism', name: "Scrimshaw of vampyrism", tier: 0, style: 'all', slot: 'pocket', is_power_armour: 0, requirements_json: { Strength: 80, Fletching: 92 }, acquisition_source: 'crafted', source_id: 'player_owned_ports', wiki_url: 'https://runescape.wiki/w/Scrimshaw_of_vampyrism' },
  { id: 'superior_scrimshaw_of_vampyrism', name: "Superior scrimshaw of vampyrism", tier: 0, style: 'all', slot: 'pocket', is_power_armour: 0, requirements_json: { Strength: 80, Fletching: 92 }, acquisition_source: 'crafted', source_id: 'player_owned_ports', wiki_url: 'https://runescape.wiki/w/Superior_scrimshaw_of_vampyrism' },
  { id: 'scrimshaw_of_attack', name: "Scrimshaw of attack", tier: 0, style: 'all', slot: 'pocket', is_power_armour: 0, requirements_json: { Attack: 85, Fletching: 95 }, acquisition_source: 'crafted', source_id: 'player_owned_ports', wiki_url: 'https://runescape.wiki/w/Scrimshaw_of_attack' },
  { id: 'superior_scrimshaw_of_attack', name: "Superior scrimshaw of attack", tier: 0, style: 'all', slot: 'pocket', is_power_armour: 0, requirements_json: { Attack: 85, Fletching: 95 }, acquisition_source: 'crafted', source_id: 'player_owned_ports', wiki_url: 'https://runescape.wiki/w/Superior_scrimshaw_of_attack' },

  // ── RANGED (new from PvM wiki scrape) ──
  { id: 'off_hand_shadow_glaive', name: "Off-hand shadow glaive", tier: 85, style: 'ranged', slot: 'offhand', is_power_armour: 0, requirements_json: { Ranged: 85 }, acquisition_source: 'boss_drop', source_id: 'gregorovic', wiki_url: 'https://runescape.wiki/w/Off-hand_shadow_glaive' },
  { id: 'attuned_crystal_chakram', name: "Attuned crystal chakram", tier: 80, style: 'ranged', slot: 'weapon', is_power_armour: 0, requirements_json: { Ranged: 80, Agility: 50 }, acquisition_source: 'crafted', source_id: 'singing_bowl', wiki_url: 'https://runescape.wiki/w/Attuned_crystal_chakram' },
  { id: 'off_hand_attuned_crystal_chakram', name: "Off-hand attuned crystal chakram", tier: 80, style: 'ranged', slot: 'offhand', is_power_armour: 0, requirements_json: { Ranged: 80, Agility: 50 }, acquisition_source: 'crafted', source_id: 'singing_bowl', wiki_url: 'https://runescape.wiki/w/Off-hand_attuned_crystal_chakram' },
  { id: 'attuned_crystal_bow', name: "Attuned crystal bow", tier: 80, style: 'ranged', slot: 'weapon', is_power_armour: 0, requirements_json: { Ranged: 80, Agility: 50 }, acquisition_source: 'crafted', source_id: 'singing_bowl', wiki_url: 'https://runescape.wiki/w/Attuned_crystal_bow' },
  { id: 'elite_sirenic_mask', name: "Elite sirenic mask", tier: 92, style: 'ranged', slot: 'head', is_power_armour: 1, requirements_json: { Defence: 92, Crafting: 91 }, acquisition_source: 'crafted', source_id: 'sirenic_mask', wiki_url: 'https://runescape.wiki/w/Elite_sirenic_mask' },
  { id: 'vengeful_kiteshield', name: "Vengeful kiteshield", tier: 90, style: 'ranged', slot: 'offhand', is_power_armour: 0, requirements_json: { Defence: 90 }, acquisition_source: 'boss_drop', source_id: 'barrows_rise_of_the_six', wiki_url: 'https://runescape.wiki/w/Vengeful_kiteshield' },
  { id: 'refined_anima_core_helm_of_zamorak', name: "Refined anima core helm of Zamorak", tier: 80, style: 'ranged', slot: 'head', is_power_armour: 1, requirements_json: { Defence: 80 }, acquisition_source: 'crafted', source_id: 'anima_core_helm_of_zamorak', wiki_url: 'https://runescape.wiki/w/Refined_anima_core_helm_of_Zamorak' },
  { id: 'refined_anima_core_body_of_zamorak', name: "Refined anima core body of Zamorak", tier: 80, style: 'ranged', slot: 'body', is_power_armour: 1, requirements_json: { Defence: 80 }, acquisition_source: 'crafted', source_id: 'anima_core_body_of_zamorak', wiki_url: 'https://runescape.wiki/w/Refined_anima_core_body_of_Zamorak' },
  { id: 'refined_anima_core_legs_of_zamorak', name: "Refined anima core legs of Zamorak", tier: 80, style: 'ranged', slot: 'legs', is_power_armour: 1, requirements_json: { Defence: 80 }, acquisition_source: 'crafted', source_id: 'anima_core_legs_of_zamorak', wiki_url: 'https://runescape.wiki/w/Refined_anima_core_legs_of_Zamorak' },
  { id: 'tempest_cowl', name: "Tempest cowl", tier: 90, style: 'ranged', slot: 'head', is_power_armour: 0, requirements_json: { Ranged: 90 }, acquisition_source: 'raid_drop', source_id: 'liberation_of_mazcab', wiki_url: 'https://runescape.wiki/w/Tempest_cowl' },
  { id: 'tempest_body', name: "Tempest body", tier: 90, style: 'ranged', slot: 'body', is_power_armour: 0, requirements_json: { Ranged: 90 }, acquisition_source: 'raid_drop', source_id: 'liberation_of_mazcab', wiki_url: 'https://runescape.wiki/w/Tempest_body' },
  { id: 'tempest_chaps', name: "Tempest chaps", tier: 90, style: 'ranged', slot: 'legs', is_power_armour: 0, requirements_json: { Ranged: 90 }, acquisition_source: 'raid_drop', source_id: 'liberation_of_mazcab', wiki_url: 'https://runescape.wiki/w/Tempest_chaps' },
  { id: 'tempest_gloves', name: "Tempest gloves", tier: 90, style: 'ranged', slot: 'gloves', is_power_armour: 0, requirements_json: { Ranged: 90 }, acquisition_source: 'raid_drop', source_id: 'liberation_of_mazcab', wiki_url: 'https://runescape.wiki/w/Tempest_gloves' },
  { id: 'tempest_boots', name: "Tempest boots", tier: 90, style: 'ranged', slot: 'boots', is_power_armour: 0, requirements_json: { Ranged: 90 }, acquisition_source: 'raid_drop', source_id: 'liberation_of_mazcab', wiki_url: 'https://runescape.wiki/w/Tempest_boots' },
  { id: 'achto_tempest_cowl', name: "Achto tempest cowl", tier: 90, style: 'ranged', slot: 'head', is_power_armour: 0, requirements_json: { Ranged: 90 }, acquisition_source: 'boss_drop', source_id: 'yakamaru', wiki_url: 'https://runescape.wiki/w/Achto_tempest_cowl' },
  { id: 'achto_tempest_body', name: "Achto tempest body", tier: 90, style: 'ranged', slot: 'body', is_power_armour: 0, requirements_json: { Ranged: 90 }, acquisition_source: 'boss_drop', source_id: 'yakamaru', wiki_url: 'https://runescape.wiki/w/Achto_tempest_body' },
  { id: 'achto_tempest_chaps', name: "Achto tempest chaps", tier: 90, style: 'ranged', slot: 'legs', is_power_armour: 0, requirements_json: { Ranged: 90 }, acquisition_source: 'boss_drop', source_id: 'yakamaru', wiki_url: 'https://runescape.wiki/w/Achto_tempest_chaps' },
  { id: 'pernix_quiver', name: "Pernix's quiver", tier: 0, style: 'ranged', slot: 'ammo', is_power_armour: 0, requirements_json: { Fletching: 99 }, acquisition_source: 'crafted', source_id: 'nex', wiki_url: "https://runescape.wiki/w/Pernix's_quiver" },
  { id: 'tirannwn_quiver_4', name: "Tirannwn quiver 4", tier: 0, style: 'ranged', slot: 'ammo', is_power_armour: 0, requirements_json: null, acquisition_source: 'achievement', source_id: 'tirannwn_elite_diary', wiki_url: 'https://runescape.wiki/w/Tirannwn_quiver_4' },
  { id: 'tirannwn_quiver_3', name: "Tirannwn quiver 3", tier: 0, style: 'ranged', slot: 'ammo', is_power_armour: 0, requirements_json: null, acquisition_source: 'achievement', source_id: 'tirannwn_hard_diary', wiki_url: 'https://runescape.wiki/w/Tirannwn_quiver_3' },
  { id: 'tirannwn_quiver_2', name: "Tirannwn quiver 2", tier: 0, style: 'ranged', slot: 'ammo', is_power_armour: 0, requirements_json: null, acquisition_source: 'achievement', source_id: 'tirannwn_medium_diary', wiki_url: 'https://runescape.wiki/w/Tirannwn_quiver_2' },
  { id: 'tirannwn_quiver_1', name: "Tirannwn quiver 1", tier: 0, style: 'ranged', slot: 'ammo', is_power_armour: 0, requirements_json: null, acquisition_source: 'achievement', source_id: 'tirannwn_easy_diary', wiki_url: 'https://runescape.wiki/w/Tirannwn_quiver_1' },
  { id: 'black_stone_arrow', name: "Black stone arrow", tier: 92, style: 'ranged', slot: 'ammo', is_power_armour: 0, requirements_json: { Ranged: 92, Fletching: 92 }, acquisition_source: 'crafted', source_id: null, wiki_url: 'https://runescape.wiki/w/Black_stone_arrow' },
  { id: 'ascendri_bolts_e', name: "Ascendri bolts (e)", tier: 94, style: 'ranged', slot: 'ammo', is_power_armour: 0, requirements_json: { Ranged: 90, Magic: 90 }, acquisition_source: 'crafted', source_id: 'ascendri_bolts', wiki_url: 'https://runescape.wiki/w/Ascendri_bolts_(e)' },
  { id: 'ascendri_bolts', name: "Ascendri bolts", tier: 94, style: 'ranged', slot: 'ammo', is_power_armour: 0, requirements_json: { Ranged: 90, Fletching: 80 }, acquisition_source: 'crafted', source_id: null, wiki_url: 'https://runescape.wiki/w/Ascendri_bolts' },
  { id: 'araxyte_arrow', name: "Araxyte arrow", tier: 90, style: 'ranged', slot: 'ammo', is_power_armour: 0, requirements_json: { Ranged: 90 }, acquisition_source: 'boss_drop', source_id: 'araxxi', wiki_url: 'https://runescape.wiki/w/Araxyte_arrow' },
  { id: 'onyx_bolts_e', name: "Onyx bolts (e)", tier: 80, style: 'ranged', slot: 'ammo', is_power_armour: 0, requirements_json: { Ranged: 80, Magic: 87 }, acquisition_source: 'crafted', source_id: null, wiki_url: 'https://runescape.wiki/w/Onyx_bolts_(e)' },
  { id: 'wyvern_spines', name: "Wyvern spines", tier: 85, style: 'ranged', slot: 'ammo', is_power_armour: 0, requirements_json: { Ranged: 85 }, acquisition_source: 'monster_drop', source_id: 'wyvern', wiki_url: 'https://runescape.wiki/w/Wyvern_spines' },
  { id: 'diamond_bolts_e', name: "Diamond bolts (e)", tier: 70, style: 'ranged', slot: 'ammo', is_power_armour: 0, requirements_json: { Ranged: 70, Magic: 57 }, acquisition_source: 'crafted', source_id: null, wiki_url: 'https://runescape.wiki/w/Diamond_bolts_(e)' },
  { id: 'ruby_bolts_e', name: "Ruby bolts (e)", tier: 60, style: 'ranged', slot: 'ammo', is_power_armour: 0, requirements_json: { Ranged: 60, Magic: 49 }, acquisition_source: 'crafted', source_id: null, wiki_url: 'https://runescape.wiki/w/Ruby_bolts_(e)' },
  { id: 'superior_scrimshaw_of_ranging', name: "Superior scrimshaw of ranging", tier: 0, style: 'all', slot: 'pocket', is_power_armour: 0, requirements_json: { Ranged: 85, Fletching: 95 }, acquisition_source: 'crafted', source_id: 'player_owned_ports', wiki_url: 'https://runescape.wiki/w/Superior_scrimshaw_of_ranging' },
  { id: 'scrimshaw_of_ranging', name: "Scrimshaw of ranging", tier: 0, style: 'all', slot: 'pocket', is_power_armour: 0, requirements_json: { Ranged: 85, Fletching: 95 }, acquisition_source: 'crafted', source_id: 'player_owned_ports', wiki_url: 'https://runescape.wiki/w/Scrimshaw_of_ranging' },
  { id: 'stalkers_ring', name: "Stalker's ring", tier: 0, style: 'ranged', slot: 'ring', is_power_armour: 0, requirements_json: { Crafting: 70 }, acquisition_source: 'crafted', source_id: 'heart_of_archer', wiki_url: "https://runescape.wiki/w/Stalker's_ring" },

  // ── MAGIC (new from PvM wiki scrape) ──
  { id: 'attuned_crystal_wand', name: "Attuned crystal wand", tier: 80, style: 'magic', slot: 'weapon', is_power_armour: 0, requirements_json: { Magic: 80, Agility: 50 }, acquisition_source: 'crafted', source_id: 'singing_bowl', wiki_url: 'https://runescape.wiki/w/Attuned_crystal_wand' },
  { id: 'attuned_crystal_orb', name: "Attuned crystal orb", tier: 80, style: 'magic', slot: 'offhand', is_power_armour: 0, requirements_json: { Magic: 80, Agility: 50 }, acquisition_source: 'crafted', source_id: 'singing_bowl', wiki_url: 'https://runescape.wiki/w/Attuned_crystal_orb' },
  { id: 'attuned_crystal_staff', name: "Attuned crystal staff", tier: 80, style: 'magic', slot: 'weapon', is_power_armour: 0, requirements_json: { Magic: 80, Agility: 50 }, acquisition_source: 'crafted', source_id: 'singing_bowl', wiki_url: 'https://runescape.wiki/w/Attuned_crystal_staff' },
  { id: 'seasinger_kiba', name: "Seasinger kiba", tier: 85, style: 'magic', slot: 'weapon', is_power_armour: 0, requirements_json: { Magic: 85 }, acquisition_source: 'player_owned_ports', source_id: null, wiki_url: 'https://runescape.wiki/w/Seasinger_kiba' },
  { id: 'seasinger_makigai', name: "Seasinger makigai", tier: 85, style: 'magic', slot: 'offhand', is_power_armour: 0, requirements_json: { Magic: 85 }, acquisition_source: 'player_owned_ports', source_id: null, wiki_url: 'https://runescape.wiki/w/Seasinger_makigai' },
  { id: 'elite_seasinger_kiba', name: "Elite seasinger kiba", tier: 85, style: 'magic', slot: 'weapon', is_power_armour: 0, requirements_json: { Magic: 85 }, acquisition_source: 'dungeoneering', source_id: 'temple_of_aminishi', wiki_url: 'https://runescape.wiki/w/Elite_seasinger_kiba' },
  { id: 'elite_seasinger_makigai', name: "Elite seasinger makigai", tier: 85, style: 'magic', slot: 'offhand', is_power_armour: 0, requirements_json: { Magic: 85 }, acquisition_source: 'dungeoneering', source_id: 'temple_of_aminishi', wiki_url: 'https://runescape.wiki/w/Elite_seasinger_makigai' },
  { id: 'elite_tectonic_robe_mask', name: "Elite tectonic robe mask", tier: 92, style: 'magic', slot: 'head', is_power_armour: 1, requirements_json: { Defence: 92, Runecrafting: 91 }, acquisition_source: 'crafted', source_id: 'tectonic_mask', wiki_url: 'https://runescape.wiki/w/Elite_tectonic_robe_mask' },
  { id: 'primeval_mask', name: "Primeval mask", tier: 90, style: 'magic', slot: 'head', is_power_armour: 0, requirements_json: { Magic: 90 }, acquisition_source: 'raid_drop', source_id: 'liberation_of_mazcab', wiki_url: 'https://runescape.wiki/w/Primeval_mask' },
  { id: 'primeval_robe_top', name: "Primeval robe top", tier: 90, style: 'magic', slot: 'body', is_power_armour: 0, requirements_json: { Magic: 90 }, acquisition_source: 'raid_drop', source_id: 'liberation_of_mazcab', wiki_url: 'https://runescape.wiki/w/Primeval_robe_top' },
  { id: 'primeval_robe_legs', name: "Primeval robe legs", tier: 90, style: 'magic', slot: 'legs', is_power_armour: 0, requirements_json: { Magic: 90 }, acquisition_source: 'raid_drop', source_id: 'liberation_of_mazcab', wiki_url: 'https://runescape.wiki/w/Primeval_robe_legs' },
  { id: 'primeval_gloves', name: "Primeval gloves", tier: 90, style: 'magic', slot: 'gloves', is_power_armour: 0, requirements_json: { Magic: 90 }, acquisition_source: 'raid_drop', source_id: 'liberation_of_mazcab', wiki_url: 'https://runescape.wiki/w/Primeval_gloves' },
  { id: 'primeval_boots', name: "Primeval boots", tier: 90, style: 'magic', slot: 'boots', is_power_armour: 0, requirements_json: { Magic: 90 }, acquisition_source: 'raid_drop', source_id: 'liberation_of_mazcab', wiki_url: 'https://runescape.wiki/w/Primeval_boots' },
  { id: 'achto_primeval_mask', name: "Achto primeval mask", tier: 90, style: 'magic', slot: 'head', is_power_armour: 0, requirements_json: { Magic: 90 }, acquisition_source: 'boss_drop', source_id: 'yakamaru', wiki_url: 'https://runescape.wiki/w/Achto_primeval_mask' },
  { id: 'achto_primeval_robe_top', name: "Achto primeval robe top", tier: 90, style: 'magic', slot: 'body', is_power_armour: 0, requirements_json: { Magic: 90 }, acquisition_source: 'boss_drop', source_id: 'yakamaru', wiki_url: 'https://runescape.wiki/w/Achto_primeval_robe_top' },
  { id: 'achto_primeval_robe_legs', name: "Achto primeval robe legs", tier: 90, style: 'magic', slot: 'legs', is_power_armour: 0, requirements_json: { Magic: 90 }, acquisition_source: 'boss_drop', source_id: 'yakamaru', wiki_url: 'https://runescape.wiki/w/Achto_primeval_robe_legs' },
  { id: 'seasinger_hood', name: "Seasinger hood", tier: 85, style: 'magic', slot: 'head', is_power_armour: 1, requirements_json: { Magic: 85, Defence: 85 }, acquisition_source: 'player_owned_ports', source_id: null, wiki_url: 'https://runescape.wiki/w/Seasinger_hood' },
  { id: 'seasinger_robe_top', name: "Seasinger robe top", tier: 85, style: 'magic', slot: 'body', is_power_armour: 1, requirements_json: { Magic: 85, Defence: 85 }, acquisition_source: 'player_owned_ports', source_id: null, wiki_url: 'https://runescape.wiki/w/Seasinger_robe_top' },
  { id: 'seasinger_robe_bottom', name: "Seasinger robe bottom", tier: 85, style: 'magic', slot: 'legs', is_power_armour: 1, requirements_json: { Magic: 85, Defence: 85 }, acquisition_source: 'player_owned_ports', source_id: null, wiki_url: 'https://runescape.wiki/w/Seasinger_robe_bottom' },
  { id: 'seasinger_aonori', name: "Seasinger aonori", tier: 85, style: 'magic', slot: 'gloves', is_power_armour: 1, requirements_json: { Magic: 85, Defence: 85 }, acquisition_source: 'player_owned_ports', source_id: null, wiki_url: 'https://runescape.wiki/w/Seasinger_aonori' },
  { id: 'seasinger_asari', name: "Seasinger asari", tier: 85, style: 'magic', slot: 'boots', is_power_armour: 1, requirements_json: { Magic: 85, Defence: 85 }, acquisition_source: 'player_owned_ports', source_id: null, wiki_url: 'https://runescape.wiki/w/Seasinger_asari' },
  { id: 'refined_anima_core_helm_of_seren', name: "Refined anima core helm of Seren", tier: 80, style: 'magic', slot: 'head', is_power_armour: 1, requirements_json: { Defence: 80 }, acquisition_source: 'crafted', source_id: 'anima_core_helm_of_seren', wiki_url: 'https://runescape.wiki/w/Refined_anima_core_helm_of_Seren' },
  { id: 'refined_anima_core_body_of_seren', name: "Refined anima core body of Seren", tier: 80, style: 'magic', slot: 'body', is_power_armour: 1, requirements_json: { Defence: 80 }, acquisition_source: 'crafted', source_id: 'anima_core_body_of_seren', wiki_url: 'https://runescape.wiki/w/Refined_anima_core_body_of_Seren' },
  { id: 'refined_anima_core_legs_of_seren', name: "Refined anima core legs of Seren", tier: 80, style: 'magic', slot: 'legs', is_power_armour: 1, requirements_json: { Defence: 80 }, acquisition_source: 'crafted', source_id: 'anima_core_legs_of_seren', wiki_url: 'https://runescape.wiki/w/Refined_anima_core_legs_of_Seren' },
  { id: 'large_rune_pouch', name: "Large rune pouch", tier: 66, style: 'magic', slot: 'ammo', is_power_armour: 0, requirements_json: { Magic: 66, Runecrafting: 90 }, acquisition_source: 'crafted', source_id: null, wiki_url: 'https://runescape.wiki/w/Large_rune_pouch' },
  { id: 'grasping_rune_pouch', name: "Grasping rune pouch", tier: 66, style: 'magic', slot: 'ammo', is_power_armour: 0, requirements_json: { Magic: 66, Runecrafting: 90 }, acquisition_source: 'crafted', source_id: 'large_rune_pouch', wiki_url: 'https://runescape.wiki/w/Grasping_rune_pouch' },
  { id: 'superior_scrimshaw_of_magic', name: "Superior scrimshaw of magic", tier: 0, style: 'all', slot: 'pocket', is_power_armour: 0, requirements_json: { Magic: 85, Fletching: 95 }, acquisition_source: 'crafted', source_id: 'player_owned_ports', wiki_url: 'https://runescape.wiki/w/Superior_scrimshaw_of_magic' },
  { id: 'scrimshaw_of_magic', name: "Scrimshaw of magic", tier: 0, style: 'all', slot: 'pocket', is_power_armour: 0, requirements_json: { Magic: 85, Fletching: 95 }, acquisition_source: 'crafted', source_id: 'player_owned_ports', wiki_url: 'https://runescape.wiki/w/Scrimshaw_of_magic' },
  { id: 'channellers_ring', name: "Channeller's ring", tier: 0, style: 'magic', slot: 'ring', is_power_armour: 0, requirements_json: { Crafting: 70 }, acquisition_source: 'crafted', source_id: 'heart_of_seer', wiki_url: "https://runescape.wiki/w/Channeller's_ring" },

  // ── NECROMANCY (new from PvM wiki scrape) ──
  { id: 'devourer_guard', name: "Devourer's guard", tier: 95, style: 'necromancy', slot: 'weapon', is_power_armour: 0, requirements_json: { Necromancy: 95 }, acquisition_source: 'boss_drop', source_id: 'amascut_the_devourer', wiki_url: "https://runescape.wiki/w/Devourer's_guard" },
  { id: 'death_guard_90', name: "Death guard (tier 90)", tier: 90, style: 'necromancy', slot: 'weapon', is_power_armour: 0, requirements_json: { Necromancy: 90 }, acquisition_source: 'crafted', source_id: 'soul_forge', wiki_url: 'https://runescape.wiki/w/Death_guard' },
  { id: 'death_guard_80', name: "Death guard (tier 80)", tier: 80, style: 'necromancy', slot: 'weapon', is_power_armour: 0, requirements_json: { Necromancy: 80 }, acquisition_source: 'crafted', source_id: 'soul_forge', wiki_url: 'https://runescape.wiki/w/Death_guard' },
  { id: 'death_guard_70', name: "Death guard (tier 70)", tier: 70, style: 'necromancy', slot: 'weapon', is_power_armour: 0, requirements_json: { Necromancy: 70 }, acquisition_source: 'crafted', source_id: 'soul_forge', wiki_url: 'https://runescape.wiki/w/Death_guard' },
  { id: 'skull_lantern_90', name: "Skull lantern (tier 90)", tier: 90, style: 'necromancy', slot: 'offhand', is_power_armour: 0, requirements_json: { Necromancy: 90 }, acquisition_source: 'crafted', source_id: 'soul_forge', wiki_url: 'https://runescape.wiki/w/Skull_lantern' },
  { id: 'skull_lantern_80', name: "Skull lantern (tier 80)", tier: 80, style: 'necromancy', slot: 'offhand', is_power_armour: 0, requirements_json: { Necromancy: 80 }, acquisition_source: 'crafted', source_id: 'soul_forge', wiki_url: 'https://runescape.wiki/w/Skull_lantern' },
  { id: 'skull_lantern_70', name: "Skull lantern (tier 70)", tier: 70, style: 'necromancy', slot: 'offhand', is_power_armour: 0, requirements_json: { Necromancy: 70 }, acquisition_source: 'crafted', source_id: 'soul_forge', wiki_url: 'https://runescape.wiki/w/Skull_lantern' },
  { id: 'hand_wrap_of_first_necromancer', name: "Hand wrap of the First Necromancer", tier: 95, style: 'necromancy', slot: 'gloves', is_power_armour: 1, requirements_json: { Necromancy: 95, Defence: 95 }, acquisition_source: 'boss_drop', source_id: 'rasial', wiki_url: 'https://runescape.wiki/w/Hand_wrap_of_the_First_Necromancer' },
  { id: 'deathwarden_nexus', name: "Deathwarden nexus", tier: 60, style: 'necromancy', slot: 'ammo', is_power_armour: 0, requirements_json: { Necromancy: 60, Crafting: 55 }, acquisition_source: 'crafted', source_id: 'soul_forge', wiki_url: 'https://runescape.wiki/w/Deathwarden_nexus' },

  // ── ALL STYLES — Neck / Ring / Pocket (new from PvM wiki scrape) ──
  { id: 'essence_of_finality_amulet', name: "Essence of Finality amulet", tier: 0, style: 'all', slot: 'neck', is_power_armour: 0, requirements_json: { Crafting: 99 }, acquisition_source: 'crafted', source_id: 'alchemical_hydrix', wiki_url: 'https://runescape.wiki/w/Essence_of_Finality_amulet' },
  { id: 'amulet_of_zealots', name: "Amulet of zealots", tier: 0, style: 'all', slot: 'neck', is_power_armour: 0, requirements_json: { Prayer: 48, Dungeoneering: 48 }, acquisition_source: 'dungeoneering', source_id: null, wiki_url: 'https://runescape.wiki/w/Amulet_of_zealots' },
  { id: 'ring_of_vigour', name: "Ring of vigour", tier: 0, style: 'all', slot: 'ring', is_power_armour: 0, requirements_json: { Attack: 62, Dungeoneering: 62 }, acquisition_source: 'dungeoneering', source_id: null, wiki_url: 'https://runescape.wiki/w/Ring_of_vigour' },
  { id: 'ring_of_death', name: "Ring of death", tier: 0, style: 'all', slot: 'ring', is_power_armour: 0, requirements_json: { Magic: 87 }, acquisition_source: 'crafted', source_id: 'hydrix_ring', wiki_url: 'https://runescape.wiki/w/Ring_of_death' },
  { id: 'luck_of_the_dwarves', name: "Luck of the dwarves", tier: 0, style: 'all', slot: 'ring', is_power_armour: 0, requirements_json: { Magic: 87, Crafting: 91 }, acquisition_source: 'crafted', source_id: 'alchemical_onyx_ring', wiki_url: 'https://runescape.wiki/w/Luck_of_the_dwarves' },
  { id: 'pontifex_shadow_ring', name: "Pontifex shadow ring", tier: 0, style: 'all', slot: 'ring', is_power_armour: 0, requirements_json: { Archaeology: 58 }, acquisition_source: 'crafted', source_id: 'pontifex_observation_ring', wiki_url: 'https://runescape.wiki/w/Pontifex_shadow_ring' },
  { id: 'scripture_of_wen', name: "Scripture of Wen", tier: 0, style: 'all', slot: 'pocket', is_power_armour: 0, requirements_json: null, acquisition_source: 'boss', source_id: 'arch_glacor', wiki_url: 'https://runescape.wiki/w/Scripture_of_Wen' },
  { id: 'scripture_of_amascut', name: "Scripture of Amascut", tier: 0, style: 'all', slot: 'pocket', is_power_armour: 0, requirements_json: null, acquisition_source: 'boss', source_id: 'sanctum_of_rebirth', wiki_url: 'https://runescape.wiki/w/Scripture_of_Amascut' },
  { id: 'illuminated_book_of_law', name: "Illuminated Book of Law", tier: 0, style: 'all', slot: 'pocket', is_power_armour: 0, requirements_json: { Crafting: 60, Prayer: 60 }, acquisition_source: 'crafted', source_id: 'abbey_of_st_elspeth', wiki_url: 'https://runescape.wiki/w/Illuminated_Book_of_Law' },
  { id: 'illuminated_book_of_war', name: "Illuminated Book of War", tier: 0, style: 'all', slot: 'pocket', is_power_armour: 0, requirements_json: { Crafting: 60, Prayer: 60 }, acquisition_source: 'crafted', source_id: 'abbey_of_st_elspeth', wiki_url: 'https://runescape.wiki/w/Illuminated_Book_of_War' },
  { id: 'illuminated_book_of_balance', name: "Illuminated Book of Balance", tier: 0, style: 'all', slot: 'pocket', is_power_armour: 0, requirements_json: { Crafting: 60, Prayer: 60 }, acquisition_source: 'crafted', source_id: 'abbey_of_st_elspeth', wiki_url: 'https://runescape.wiki/w/Illuminated_Book_of_Balance' },
  { id: 'illuminated_book_of_wisdom', name: "Illuminated Book of Wisdom", tier: 0, style: 'all', slot: 'pocket', is_power_armour: 0, requirements_json: { Crafting: 60, Prayer: 60 }, acquisition_source: 'crafted', source_id: 'abbey_of_st_elspeth', wiki_url: 'https://runescape.wiki/w/Illuminated_Book_of_Wisdom' },
  { id: 'illuminated_book_of_chaos', name: "Illuminated Book of Chaos", tier: 0, style: 'all', slot: 'pocket', is_power_armour: 0, requirements_json: { Crafting: 60, Prayer: 60 }, acquisition_source: 'crafted', source_id: 'abbey_of_st_elspeth', wiki_url: 'https://runescape.wiki/w/Illuminated_Book_of_Chaos' },
  { id: 'illuminated_ancient_book', name: "Illuminated Ancient book", tier: 0, style: 'all', slot: 'pocket', is_power_armour: 0, requirements_json: { Crafting: 60, Prayer: 60 }, acquisition_source: 'crafted', source_id: 'abbey_of_st_elspeth', wiki_url: 'https://runescape.wiki/w/Illuminated_Ancient_book' },
];

// Auto-fill icon_url from wiki item name where not set
for (const g of GEAR_ITEMS) {
  if (!g.icon_url) g.icon_url = wi(g.name);
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. SLAYER CREATURES
// ══════════════════════════════════════════════════════════════════════════════
function upsertSlayerCreature(c) {
  db.prepare(`INSERT OR REPLACE INTO rs3_slayer_creatures
    (id, name, slayer_level_req, combat_level, location, notable_drops, is_boss, wiki_url, icon_url)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(
    c.id, c.name, c.slayer_level_req ?? 1, c.combat_level ?? 1,
    c.location ?? null, j(c.notable_drops ?? []), c.is_boss ?? 0,
    c.wiki_url ?? null, c.icon_url ?? null
  );
}

// Auto-generate icon URL from monster name (RS Wiki image convention)
const swi = name => `https://runescape.wiki/images/${name.replace(/ /g, '_').replace(/'/g, '%27')}.png`;

const SLAYER_CREATURES = [
  // ── Slayer level 1–59 (Early game) ─────────────────────────────────────────
  { id: 'crawling_hand',      name: 'Crawling Hand',       slayer_level_req: 5,  combat_level: 8,   location: 'Slayer Tower (Morytania)',        notable_drops: ['Crawling hand (item)'],                           is_boss: 0, wiki_url: 'https://runescape.wiki/w/Crawling_hand' },
  { id: 'banshee',            name: 'Banshee',             slayer_level_req: 15, combat_level: 24,  location: 'Slayer Tower (Morytania)',        notable_drops: ['Dark mystic gloves'],                             is_boss: 0, wiki_url: 'https://runescape.wiki/w/Banshee' },
  { id: 'cockatrice',         name: 'Cockatrice',          slayer_level_req: 25, combat_level: 31,  location: 'Fremennik Slayer Dungeon',        notable_drops: ['Cockatrice head', 'Light mystic boots'],          is_boss: 0, wiki_url: 'https://runescape.wiki/w/Cockatrice' },
  { id: 'mogre',              name: 'Mogre',               slayer_level_req: 32, combat_level: 45,  location: 'Mudskipper Point',               notable_drops: ['Flippers', 'Mudskipper hat'],                     is_boss: 0, wiki_url: 'https://runescape.wiki/w/Mogre' },
  { id: 'basilisk',           name: 'Basilisk',            slayer_level_req: 40, combat_level: 49,  location: 'Fremennik Slayer Dungeon',        notable_drops: ['Basilisk boots', 'Basilisk head'],                is_boss: 0, wiki_url: 'https://runescape.wiki/w/Basilisk' },
  { id: 'infernal_mage',      name: 'Infernal Mage',       slayer_level_req: 45, combat_level: 70,  location: 'Slayer Tower (Morytania)',        notable_drops: ['Dark mystic hat', 'Lava battlestaff'],            is_boss: 0, wiki_url: 'https://runescape.wiki/w/Infernal_mage' },
  { id: 'bloodveld',          name: 'Bloodveld',           slayer_level_req: 50, combat_level: 52,  location: 'Slayer Tower / God Wars Dungeon', notable_drops: [],                                                is_boss: 0, wiki_url: 'https://runescape.wiki/w/Bloodveld' },
  { id: 'turoth',             name: 'Turoth',              slayer_level_req: 55, combat_level: 64,  location: 'Fremennik Slayer Dungeon',        notable_drops: ['Leaf-bladed sword', 'Turoth boots'],              is_boss: 0, wiki_url: 'https://runescape.wiki/w/Turoth' },
  { id: 'cave_horror',        name: 'Cave Horror',         slayer_level_req: 58, combat_level: 80,  location: "Mos Le'Harmless Caves",           notable_drops: ['Black mask (→ Slayer helmet)'],                   is_boss: 0, wiki_url: 'https://runescape.wiki/w/Cave_horror' },

  // ── Slayer level 60–89 (Mid game) ──────────────────────────────────────────
  { id: 'aberrant_spectre',   name: 'Aberrant Spectre',    slayer_level_req: 60, combat_level: 75,  location: 'Slayer Tower / Pollnivneach',     notable_drops: ['Lava battlestaff'],                               is_boss: 0, wiki_url: 'https://runescape.wiki/w/Aberrant_spectre' },
  { id: 'dust_devil',         name: 'Dust Devil',          slayer_level_req: 65, combat_level: 90,  location: 'Smoke Dungeon / Chaos Tunnels',   notable_drops: ['Dragon chainbody'],                               is_boss: 0, wiki_url: 'https://runescape.wiki/w/Dust_devil' },
  { id: 'automaton_guardian', name: 'Automaton Guardian',  slayer_level_req: 67, combat_level: 115, location: "Guthix's Resting Place (Karamja)", notable_drops: ['Static gloves', 'Tracking gloves', 'Pneumatic gloves', 'Cresbot'], is_boss: 0, wiki_url: 'https://runescape.wiki/w/Automaton_Guardian' },
  { id: 'kurask',             name: 'Kurask',              slayer_level_req: 70, combat_level: 78,  location: 'Fremennik Slayer Dungeon',        notable_drops: ['Leaf-bladed sword', 'Kurask boots'],              is_boss: 0, wiki_url: 'https://runescape.wiki/w/Kurask' },
  { id: 'skeletal_wyvern',    name: 'Skeletal Wyvern',     slayer_level_req: 72, combat_level: 109, location: 'Asgarnian Ice Dungeon',           notable_drops: ['Granite legs', 'Wyvern bones'],                   is_boss: 0, wiki_url: 'https://runescape.wiki/w/Skeletal_wyvern' },
  { id: 'gargoyle',           name: 'Gargoyle',            slayer_level_req: 75, combat_level: 100, location: "Slayer Tower / Kuradal's Dungeon", notable_drops: ['Granite maul', 'Dark mystic robe top'],           is_boss: 0, wiki_url: 'https://runescape.wiki/w/Gargoyle' },
  { id: 'aquanite',           name: 'Aquanite',            slayer_level_req: 78, combat_level: 100, location: 'Fremennik Slayer Dungeon',        notable_drops: ['Amulet of ranging'],                              is_boss: 0, wiki_url: 'https://runescape.wiki/w/Aquanite' },
  { id: 'nechryael',          name: 'Nechryael',           slayer_level_req: 80, combat_level: 100, location: "Slayer Tower / Kuradal's Dungeon", notable_drops: ['Death talisman', 'Rune boots'],                   is_boss: 0, wiki_url: 'https://runescape.wiki/w/Nechryael' },
  { id: 'rorarius',           name: 'Rorarius',            slayer_level_req: 81, combat_level: 84,  location: 'Monastery of Ascension',          notable_drops: ['Ascension Keystone Prima', 'Ascension Keystone Secunda', 'Ascension Keystone Tertia', 'Ascension Keystone Quartus', 'Ascension Keystone Quintus', 'Ascension Keystone Sextus'], is_boss: 0, wiki_url: 'https://runescape.wiki/w/Rorarius' },
  { id: 'spiritual_mage',     name: 'Spiritual Mage',      slayer_level_req: 83, combat_level: 98,  location: 'God Wars Dungeon',                notable_drops: ['Dragon boots', 'Dragon gauntlets'],               is_boss: 0, wiki_url: 'https://runescape.wiki/w/Spiritual_mage' },
  { id: 'abyssal_demon',      name: 'Abyssal Demon',       slayer_level_req: 85, combat_level: 100, location: "Slayer Tower / Kuradal's Dungeon", notable_drops: ['Abyssal whip', 'Abyssal wand', 'Abyssal orb', 'Abyssal head'], is_boss: 0, wiki_url: 'https://runescape.wiki/w/Abyssal_demon' },
  { id: 'jadinko_guard',      name: 'Mutated Jadinko Guard', slayer_level_req: 86, combat_level: 96, location: 'Jadinko Lair',                   notable_drops: ['Whip vine'],                                      is_boss: 0, wiki_url: 'https://runescape.wiki/w/Mutated_Jadinko_Guard' },
  { id: 'corrupted_scorpion', name: 'Corrupted Scorpion',  slayer_level_req: 88, combat_level: 98,  location: 'Sophanem Slayer Dungeon',         notable_drops: ['Vital spark', 'Key to the Crossing'],             is_boss: 0, wiki_url: 'https://runescape.wiki/w/Corrupted_scorpion' },

  // ── Slayer level 90–95 (Mid-High / Early End) ───────────────────────────────
  { id: 'dark_beast',         name: 'Dark Beast',          slayer_level_req: 90, combat_level: 105, location: "Underground Pass / Kuradal's",     notable_drops: ['Dark bow'],                                       is_boss: 0, wiki_url: 'https://runescape.wiki/w/Dark_beast' },
  { id: 'edimmu',             name: 'Edimmu',              slayer_level_req: 90, combat_level: 122, location: 'Daemonheim resource dungeon',      notable_drops: ['Blood necklace shard'],                           is_boss: 0, wiki_url: 'https://runescape.wiki/w/Edimmu' },
  { id: 'feral_dinosaur',     name: 'Feral Dinosaur',      slayer_level_req: 90, combat_level: 160, location: 'Northern Anachronia',              notable_drops: ['Laceration boots', 'Blowpipe chisel', 'Blowpipe feather', 'Blowpipe shaft'], is_boss: 0, wiki_url: 'https://runescape.wiki/w/Feral_dinosaur' },
  { id: 'airut',              name: 'Airut',               slayer_level_req: 92, combat_level: 122, location: 'Piscatoris / Mazcab',              notable_drops: ['Razorback gauntlets', 'Tuska mask piece'],        is_boss: 0, wiki_url: 'https://runescape.wiki/w/Airut' },
  { id: 'ice_strykewyrm',     name: 'Ice Strykewyrm',      slayer_level_req: 93, combat_level: 106, location: 'Ice Strykewyrm cave',              notable_drops: ['Staff of light', 'Glacyte boots'],                is_boss: 0, wiki_url: 'https://runescape.wiki/w/Ice_strykewyrm' },
  { id: 'lava_strykewyrm',    name: 'Lava Strykewyrm',     slayer_level_req: 94, combat_level: 115, location: 'Lava Maze (Wilderness)',           notable_drops: ['Wyrm spike', 'Wyrm heart', 'Wyrm scalp'],         is_boss: 0, wiki_url: 'https://runescape.wiki/w/Lava_strykewyrm' },

  // ── Slayer level 95+ (End game) ─────────────────────────────────────────────
  { id: 'dragonstone_dragon', name: 'Dragonstone Dragon',  slayer_level_req: 95, combat_level: 119, location: 'Gemstone cavern (Shilo Village)', notable_drops: ['Gemstone gauntlets', 'Gemstone boots'],           is_boss: 0, wiki_url: 'https://runescape.wiki/w/Dragonstone_dragon' },
  { id: 'ganodermic_runt',    name: 'Ganodermic Runt',     slayer_level_req: 95, combat_level: 112, location: 'Polypore Dungeon',                notable_drops: ['Ganodermic boots', 'Ganodermic gloves'],          is_boss: 0, wiki_url: 'https://runescape.wiki/w/Ganodermic_runt' },
  { id: 'legiones',           name: 'Legiones',            slayer_level_req: 95, combat_level: 304, location: 'Monastery of Ascension',           notable_drops: ['Ascension Keystone Prima', 'Ascension Keystone Secunda', 'Ascension Keystone Tertia', 'Ascension Keystone Quartus', 'Ascension Keystone Quintus', 'Ascension Keystone Sextus', 'Ascension crossbow (T90)'], is_boss: 1, wiki_url: 'https://runescape.wiki/w/Legiones' },
  { id: 'wyvern',             name: 'Wyvern',              slayer_level_req: 96, combat_level: 125, location: 'Asgarnian Ice Dungeon / Frozen Waste', notable_drops: ['Wyvern crossbow', 'Raptor key part 1'],       is_boss: 0, wiki_url: 'https://runescape.wiki/w/Wyvern' },
  { id: 'ripper_demon',       name: 'Ripper Demon',        slayer_level_req: 96, combat_level: 131, location: 'Ripper Demon cave (Wilderness)',   notable_drops: ['Ripper claw', 'Raptor key part 2'],               is_boss: 0, wiki_url: 'https://runescape.wiki/w/Ripper_demon' },
  { id: 'camel_warrior',      name: 'Camel Warrior',       slayer_level_req: 96, combat_level: 132, location: 'Camel Warriors island',            notable_drops: ['Camel staff', 'Raptor key part 3'],               is_boss: 0, wiki_url: 'https://runescape.wiki/w/Camel_warrior' },
  { id: 'acheron_mammoth',    name: 'Acheron Mammoth',     slayer_level_req: 96, combat_level: 131, location: 'Mammoth iceberg (Wilderness)',     notable_drops: ['Mammoth tusk', 'Raptor key part 4'],              is_boss: 0, wiki_url: 'https://runescape.wiki/w/Acheron_mammoth' },
  { id: 'onyx_dragon',        name: 'Onyx Dragon',         slayer_level_req: 98, combat_level: 126, location: 'Gemstone cavern / Wilderness',     notable_drops: ['Gemstone helm', 'Gemstone greaves'],              is_boss: 0, wiki_url: 'https://runescape.wiki/w/Onyx_dragon' },
  { id: 'soulgazer',          name: 'Soulgazer',           slayer_level_req: 99, combat_level: 130, location: "Daemonheim / Stalker's dungeon",   notable_drops: ['Hexhunter bow', "Soulgazer's charm"],             is_boss: 0, wiki_url: 'https://runescape.wiki/w/Soulgazer' },
  { id: 'brutish_dinosaur',   name: 'Brutish Dinosaur',    slayer_level_req: 99, combat_level: 164, location: 'Anachronia',                      notable_drops: ['Laceration boots', 'Blowpipe chisel', 'Blowpipe feather', 'Blowpipe shaft'], is_boss: 0, wiki_url: 'https://runescape.wiki/w/Brutish_dinosaur' },
  { id: 'hydrix_dragon',      name: 'Hydrix Dragon',       slayer_level_req: 101, combat_level: 133, location: 'Gemstone cavern / Deep Wilderness', notable_drops: ['Gemstone hauberk', 'Gemstone amulet'],          is_boss: 0, wiki_url: 'https://runescape.wiki/w/Hydrix_dragon' },
  { id: 'vinecrawler',        name: 'Vinecrawler',         slayer_level_req: 104, combat_level: 140, location: 'The Lost Grove',                  notable_drops: ['Cinderbane gloves', 'Ancient ritual shard'],      is_boss: 0, wiki_url: 'https://runescape.wiki/w/Vinecrawler' },
  { id: 'bulbous_crawler',    name: 'Bulbous Crawler',     slayer_level_req: 106, combat_level: 140, location: 'The Lost Grove',                  notable_drops: ['Cinderbane gloves', 'Ancient ritual shard'],      is_boss: 0, wiki_url: 'https://runescape.wiki/w/Bulbous_crawler' },
  { id: 'moss_golem',         name: 'Moss Golem',          slayer_level_req: 108, combat_level: 140, location: 'The Lost Grove',                  notable_drops: ['Cinderbane gloves', 'Ancient ritual shard'],      is_boss: 0, wiki_url: 'https://runescape.wiki/w/Moss_golem' },
  { id: 'abyssal_beast',      name: 'Abyssal Beast',       slayer_level_req: 105, combat_level: 119, location: "Senntisten Asylum / Wilderness",  notable_drops: ['Jaws of the Abyss'],                              is_boss: 0, wiki_url: 'https://runescape.wiki/w/Abyssal_beast' },
  { id: 'venomous_dinosaur',  name: 'Venomous Dinosaur',   slayer_level_req: 105, combat_level: 172, location: 'Anachronia',                      notable_drops: ['Laceration boots', 'Blowpipe chisel', 'Blowpipe feather', 'Blowpipe shaft'], is_boss: 0, wiki_url: 'https://runescape.wiki/w/Venomous_dinosaur' },
  { id: 'ganodermic_beast',   name: 'Ganodermic Beast',    slayer_level_req: 112, combat_level: 112, location: 'Polypore Dungeon',                notable_drops: ['Ganodermic boots', 'Ganodermic gloves', 'Polypore stick'], is_boss: 0, wiki_url: 'https://runescape.wiki/w/Ganodermic_beast' },
  { id: 'ripper_dinosaur',    name: 'Ripper Dinosaur',     slayer_level_req: 114, combat_level: 176, location: 'Anachronia',                      notable_drops: ['Laceration boots', 'Blowpipe chisel', 'Blowpipe feather', 'Blowpipe shaft'], is_boss: 0, wiki_url: 'https://runescape.wiki/w/Ripper_dinosaur' },
  { id: 'abyssal_lord',       name: 'Abyssal Lord',        slayer_level_req: 115, combat_level: 133, location: 'Senntisten Asylum',               notable_drops: ['Abyssal scourge'],                                is_boss: 0, wiki_url: 'https://runescape.wiki/w/Abyssal_lord' },
  { id: 'the_magister',       name: 'The Magister',        slayer_level_req: 115, combat_level: 899, location: 'Sophanem Slayer Dungeon',          notable_drops: ['Vital spark', 'Key to the Crossing', 'Heart of rebirth (pet)'], is_boss: 1, wiki_url: 'https://runescape.wiki/w/The_Magister' },
];

// Auto-fill icon_url from monster name
for (const c of SLAYER_CREATURES) {
  if (!c.icon_url) c.icon_url = swi(c.name);
}

// ══════════════════════════════════════════════════════════════════════════════
// SEED — run everything
// ══════════════════════════════════════════════════════════════════════════════
console.log('🌱 Seeding RS3 reference data...\n');

// Admin user
const existing = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(ADMIN_USERNAME);
if (!existing) {
  const { hash, salt } = hashPassword(ADMIN_PASSWORD);
  db.prepare('INSERT INTO admin_users (username, password_hash, salt) VALUES (?,?,?)').run(ADMIN_USERNAME, hash, salt);
  console.log('✅ Admin user created');
} else {
  console.log('ℹ️  Admin user already exists (skipped)');
}

// Bosses
console.log(`\n⚔️  Seeding ${BOSSES.length} bosses...`);
let bossCount = 0;
for (const b of BOSSES) { upsertBoss(b); bossCount++; }
console.log(`   ${bossCount} bosses inserted/updated`);

// Milestones
console.log(`\n🏆 Seeding ${MILESTONES.length} milestone items...`);
let msCount = 0;
for (const m of MILESTONES) { upsertMilestone(m); msCount++; }
console.log(`   ${msCount} milestones inserted/updated`);

// Skill milestones
console.log(`\n📈 Seeding ${SKILL_MILESTONES.length} skill milestones...`);
let smCount = 0;
for (const m of SKILL_MILESTONES) { upsertSkillMilestone(m); smCount++; }
console.log(`   ${smCount} skill milestones inserted/updated`);

// Gear paths
console.log(`\n🛡️  Seeding ${GEAR_PATHS.length} gear paths...`);
let gpCount = 0;
for (const p of GEAR_PATHS) { upsertGearPath(p); gpCount++; }
console.log(`   ${gpCount} gear paths inserted/updated`);

// Quests
console.log(`\n📜 Seeding ${QUESTS.length} quests...`);
let qCount = 0;
for (const q of QUESTS) { upsertQuest(q); qCount++; }
console.log(`   ${qCount} quests inserted/updated`);

// Gear items
console.log(`\n⚔️  Seeding ${GEAR_ITEMS.length} gear items...`);
let giCount = 0;
for (const g of GEAR_ITEMS) { upsertGearItem(g); giCount++; }
console.log(`   ${giCount} gear items inserted/updated`);

// Slayer creatures
console.log(`\n🦎 Seeding ${SLAYER_CREATURES.length} slayer creatures...`);
let scCount = 0;
for (const c of SLAYER_CREATURES) { upsertSlayerCreature(c); scCount++; }
console.log(`   ${scCount} slayer creatures inserted/updated`);

// ══════════════════════════════════════════════════════════════════════════════
// SOURCE-ID PATCHES — backfill source_id for items seeded by earlier runs
// Safe to re-run: UPDATE only touches source_id / acquisition_source.
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n🔗 Patching source_ids on existing gear items...');
const patchSourceId = db.prepare('UPDATE rs3_gear_items SET source_id = ? WHERE id = ? AND source_id IS NULL');
const patchSourceAndType = db.prepare('UPDATE rs3_gear_items SET source_id = ?, acquisition_source = ? WHERE id = ?');
let patchCount = 0;

const SOURCE_PATCHES = [
  // ── GWD2 specific bosses (previously all used generic 'gwd2') ─────────────
  ['vindicta',          'anima_core_helm_of_zaros'],
  ['vindicta',          'anima_core_body_of_zaros'],
  ['vindicta',          'anima_core_legs_of_zaros'],
  ['helwyr',            'anima_core_helm_of_seren'],
  ['helwyr',            'anima_core_body_of_seren'],
  ['helwyr',            'anima_core_legs_of_seren'],
  ['twin_furies',       'anima_core_helm_of_zamorak'],
  ['twin_furies',       'anima_core_body_of_zamorak'],
  ['twin_furies',       'anima_core_legs_of_zamorak'],
  ['twin_furies',       'blade_of_nymora_avaryss'],
  ['gregorovic',        'shadow_glaive'],
  // ── Kalphite King ─────────────────────────────────────────────────────────
  ['kalphite_king',     'dual_drygore_rapiers'],
  ['kalphite_king',     'dual_drygore_longswords'],
  ['kalphite_king',     'dual_drygore_maces'],
  // ── Legiones ──────────────────────────────────────────────────────────────
  ['legiones',          'ascension_crossbow_dual'],
  // ── Araxxi / Araxxor ──────────────────────────────────────────────────────
  ['araxxi',            'araxyte_arrows'],
  ['araxxi',            'decimation'],
  ['araxxi',            'obliteration'],
  // ── Solak ─────────────────────────────────────────────────────────────────
  ['solak',             'oh_blightbound_crossbow'],
  ['solak',             'blightbound_crossbow_dual'],
  // ── Rasial (First Necromancer) ────────────────────────────────────────────
  ['rasial',            'crown_of_the_first_necromancer'],
  ['rasial',            'robe_top_of_the_first_necromancer'],
  ['rasial',            'robe_bottom_of_the_first_necromancer'],
  ['rasial',            'hand_wraps_of_the_first_necromancer'],
  ['rasial',            'foot_wraps_of_the_first_necromancer'],
  ['rasial',            'omni_guard'],
  ['rasial',            'deathwarden_nexus_t90'],
  ['rasial',            'deathdealer_gloves_t90'],
  ['rasial',            'deathdealer_boots_t90'],
  ['rasial',            'death_guard_t90'],
  ['rasial',            'skull_lantern_t90'],
  ['rasial',            'deathdealer_robe_top_t80'],
  ['rasial',            'deathdealer_robe_bottom_t80'],
  ['rasial',            'deathdealer_gloves_t80'],
  ['rasial',            'deathdealer_boots_t80'],
  ['rasial',            'death_guard_t80'],
  ['rasial',            'skull_lantern_t80'],
  // ── Croesus ───────────────────────────────────────────────────────────────
  ['croesus',           'cryptbloom_gloves'],
  ['croesus',           'cryptbloom_boots'],
  // ── Nex ───────────────────────────────────────────────────────────────────
  ['nex',               'virtus_robe_bottom'],
  ['nex',               'virtus_gloves'],
  ['nex',               'virtus_boots'],
  ['nex',               'pernix_gloves'],
  ['nex',               'pernix_boots'],
  // ── GWD1 bosses ───────────────────────────────────────────────────────────
  ['kreearra',          'armadyl_gloves'],
  ['kreearra',          'armadyl_boots'],
  // ── Slayer creatures ──────────────────────────────────────────────────────
  ['edimmu',            'blood_necklace'],
  ['spiritual_mage',    'dragon_gauntlets'],
  // ── Dragon sources ────────────────────────────────────────────────────────
  ['adamant_dragons',   'dragon_full_helm'],
  ['queen_black_dragon','dragon_kiteshield'],
  ['king_black_dragon', 'dragonfire_shield'],
  // ── Wilderness Slayer chest ───────────────────────────────────────────────
  ['wilderness_slayer', 'decimation'],
  ['wilderness_slayer', 'obliteration'],
  // ── Barrows RoTS ──────────────────────────────────────────────────────────
  ['barrows_rots',      'merciless_kiteshield'],
  // ── Rune Dragons ──────────────────────────────────────────────────────────
  ['rune_dragons',      'flarefrost_boots'],
  // ── TokHaar ───────────────────────────────────────────────────────────────
  ['har_aken',          'tokhaar_kal_mor'],
];

for (const [source_id, id] of SOURCE_PATCHES) {
  const r = patchSourceId.run(source_id, id);
  if (r.changes) patchCount++;
}

// Items that also need acquisition_source fixed
const TYPE_PATCHES = [
  // Arcane stream: crafted with DG tokens, not a direct boss drop
  [null, 'dungeoneering', 'arcane_stream'],
  // Farsight sniper necklace: same — DG token crafting
  [null, 'dungeoneering', 'farsight_sniper_necklace'],
  // Rune boots: smithable, not a boss drop
  [null, 'crafting',      'rune_boots'],
  // Ranger boots: clue scroll reward
  [null, 'clue_scroll',   'ranger_boots'],
  // Dragon arrows: fletched from arrowheads
  [null, 'skilling',      'dragon_arrows'],
  // Deathwarden nexus + lower-tier Necromancy weapons: quest/crafting chain
  [null, 'crafting',      'deathwarden_nexus_t90'],
  [null, 'crafting',      'deathwarden_hood_t80'],
  [null, 'crafting',      'deathwarden_hood_t70'],
  [null, 'crafting',      'death_guard_t60'],
  [null, 'crafting',      'skull_lantern_t60'],
  [null, 'crafting',      'death_guard_t70'],
  [null, 'crafting',      'skull_lantern_t70'],
  [null, 'crafting',      'deathdealer_robe_top_t70'],
  [null, 'crafting',      'deathdealer_robe_bottom_t70'],
  [null, 'crafting',      'deathdealer_gloves_t70'],
  [null, 'crafting',      'deathdealer_boots_t70'],
  // Amulet of strength: crafted (gold bar + sapphire/topaz on furnace)
  [null, 'crafting',      'amulet_of_strength'],
];

for (const [source_id, acq, id] of TYPE_PATCHES) {
  patchSourceAndType.run(source_id, acq, id);
  patchCount++;
}

console.log(`   ${patchCount} items patched`);

console.log('\n✅ Seed complete!\n');
console.log('═══════════════════════════════════════════════════════');
console.log('  ADMIN CREDENTIALS');
console.log('  Username : admin');
console.log(`  Password : ${ADMIN_PASSWORD}`);
console.log('  Portal   : http://localhost:5173/admin');
console.log('  Keep this password safe — it will not be shown again.');
console.log('═══════════════════════════════════════════════════════\n');

process.exit(0);
