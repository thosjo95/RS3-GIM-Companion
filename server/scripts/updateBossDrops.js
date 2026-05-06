/**
 * Corrects inaccurate boss drop data based on RS3 wiki research.
 * Uses UPDATE statements (idempotent — safe to re-run).
 *
 * Run: node server/scripts/updateBossDrops.js
 */

const path = require('path');
process.chdir(path.join(__dirname, '..'));
const db = require('../database');

function j(v) { return JSON.stringify(v); }

const updates = [

  // ── ED1: Temple of Aminishi ────────────────────────────────────────────────

  // Sanctum Guardian — no unique equippable gear; rare drops only via Lucky Charm
  {
    id: 'sanctum_guardian',
    drops: [
      { name: 'Death lotus extract (via Lucky Charm, ~1/1,000)' },
      { name: 'Tetsu sword upgrade kit (via Lucky Charm, ~1/1,000)' },
      { name: 'Seasinger weapon upgrade kit (via Lucky Charm, ~1/1,000)' },
      { name: 'Ancient scale (via Lucky Charm, ~1/5,000 — Superior Death Lotus upgrade)' },
    ],
  },

  // Masuta the Ascended — signature drop is warspear, not Hanto gear
  {
    id: 'masuta',
    drops: [
      { name: "Masuta's warspear (T82 two-handed Ranged, ~1/20 solo)" },
      { name: 'Seasinger weapon upgrade kit (via Lucky Charm)' },
      { name: 'Tetsu sword upgrade kit (via Lucky Charm)' },
    ],
  },

  // Seiryu — drops ancient scales (Death Lotus upgrade), no "Azure crystal" or "Seiryu's claw"
  {
    id: 'seiryu',
    drops: [
      { name: 'Ancient scales (upgrade Death Lotus to Superior Death Lotus T92)' },
      { name: 'Death lotus extract (via Lucky Charm, ~1/1,000)' },
      { name: 'Seasinger weapon upgrade kit (via Lucky Charm, ~1/1,000)' },
    ],
  },

  // ── ED2: Dragonkin Laboratory ──────────────────────────────────────────────

  // Astellarn — signature drop is Greater Flurry codex, NOT draconic energy
  {
    id: 'astellarn',
    drops: [
      { name: 'Greater Flurry ability codex (~69M gp, ~1/83 solo — unlocks Greater Flurry)' },
    ],
  },

  // Verak Lith — signature drop is Greater Fury codex (most valuable ability codex ~386M)
  {
    id: 'verak_lith',
    drops: [
      { name: 'Greater Fury ability codex (~386M gp, ~1/83 solo — unlocks Greater Fury)' },
      { name: 'Draconic energy (via Lucky Charm — Superior Dragonbone upgrade material)' },
    ],
  },

  // Black Stone Dragon — Greater Barge codex + draconic energy (NOT Alchemical hydrix)
  {
    id: 'black_stone_dragon',
    drops: [
      { name: 'Greater Barge ability codex (~1/83 solo — unlocks Greater Barge)' },
      { name: 'Draconic energy (Superior Dragonbone upgrade material)' },
    ],
  },

  // ── ED3: The Shadow Reef ───────────────────────────────────────────────────

  // Crassian Leviathan — NO unique gear drops (only lore book + common materials)
  {
    id: 'crassian_leviathan',
    drops: [
      { name: 'No unique gear drops — common materials and lore book only' },
    ],
  },

  // Taraket the Necromancer — NO unique drops at all (confirmed by wiki)
  {
    id: 'taraket',
    drops: [
      { name: 'No unique drops' },
    ],
  },

  // The Ambassador — Eldritch crossbow pieces are the ONLY unique (T92 Ranged MH)
  {
    id: 'ambassador',
    drops: [
      { name: 'Eldritch crossbow limb (~235M gp, ~1/55 solo)' },
      { name: 'Eldritch crossbow stock (~235M gp, ~1/55 solo)' },
      { name: 'Eldritch crossbow mechanism (~235M gp, ~1/55 solo)' },
      { name: '(Assemble all 3 pieces for Eldritch crossbow T92 Ranged main-hand)' },
    ],
  },

  // ── Rasial's Citadel ──────────────────────────────────────────────────────

  // Hermod — only Hermodic plate; "Elemental anima stone" is not a real drop
  {
    id: 'hermod',
    drops: [
      { name: 'Hermodic plate (~100K gp, ~1/10 — upgrades Deathdealer robes)' },
    ],
  },

  // ── Eclipse of the Heart ──────────────────────────────────────────────────

  // Amascut — correct armour set name; "Tumeken's shadow" is an OSRS item, not RS3
  {
    id: 'amascut',
    drops: [
      { name: "Devourer's Guard (T90 off-hand melee)" },
      { name: "Tumeken's Light (T90 Magic main-hand)" },
      { name: "Robes of Tumeken's resplendence (T90 Magic power armour set — 5 pieces)" },
      { name: 'Shard of Genesis Essence (hard mode only)' },
    ],
  },

  // ── Sanctum of Rebirth ────────────────────────────────────────────────────

  // Vermyx — correct (Divine Rage prayer codex, Scripture of Amascut) ✓ no change needed
  // Kezalam — correct (Divine Rage prayer codex, Scripture of Amascut, Key to the Crossing) ✓
  // Nakatra — correct (Roar of Awakening, Ode to Deceit, Shard of Genesis Essence, Scripture) ✓
  // Gate of Elidinis — correct (Eclipsed Soul codex, Memory dowser, Runic attuner, Scripture) ✓

  // ── Rex Matriarchs ────────────────────────────────────────────────────────

  // Osseous — "Calcified heart" is not real; correct drops are ring, savage spear, heart, key
  {
    id: 'osseous',
    drops: [
      { name: "Occultist's ring (T90 Magic ring, ~2/399)" },
      { name: 'Heart of the Berserker (~1/225 — ring upgrade component)' },
      { name: 'Savage spear parts (Tip/Cap/Plume/Shaft — assemble for Savage spear T95)' },
      { name: "Jail cell key (~1/399 — unlocks Rex pet variants)" },
      { name: "Skeka's hypnowand pieces (very rare — assemble for unique Ranged weapon)" },
    ],
  },

  // ── Wilderness ────────────────────────────────────────────────────────────

  // Flesh-hatcher Mhekarnahz — Hexhunter bow is NOT this boss's unique; Seeker's Charm is
  {
    id: 'flesh_hatcher_mhekarnahz',
    drops: [
      { name: "Dragon harpoon (T70 Fishing tool / weapon)" },
      { name: "Stalker's Charm (rare drop)" },
      { name: "Seeker's Charm (rare drop)" },
    ],
  },

  // ── Other bosses ──────────────────────────────────────────────────────────

  // Exiled Kalphite Queen — shared drop table with normal KQ, correct ✓
  // Abomination — Abomination cape + Dragon full helm correct ✓
  // GWD2 (Gregorovic, Twin Furies, Vindicta, Helwyr) — correct ✓

];

let changed = 0;
for (const u of updates) {
  const result = db.prepare('UPDATE rs3_bosses SET drops = ? WHERE id = ?')
    .run(j(u.drops), u.id);
  if (result.changes > 0) {
    console.log(`✓ Updated drops for ${u.id}`);
    changed++;
  } else {
    console.warn(`⚠ No row found for id="${u.id}" — skipped`);
  }
}

console.log(`\nDone: ${changed} / ${updates.length} bosses updated.`);
