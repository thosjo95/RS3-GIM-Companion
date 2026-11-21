import React, { useMemo, useState, useEffect } from 'react';
import { api } from '../api/client';
import RsIcon, { IconLabel } from './RsIcon';
import { BossIcon } from './GameIcon';

import { MEMBER_COLORS, parseRMDate } from '../lib/rs3';

// ── Constants ──────────────────────────────────────────────────────────────────

const SKILL_ICON_URL = name =>
  `https://runescape.wiki/images/${encodeURIComponent(name)}.png`;

// RS3 hiscores has no "All" row — only the 5 individual tiers
const CLUE_TYPES = [
  { key: 'Clue Scrolls Easy',   label: 'Easy',   icon: '🟢' },
  { key: 'Clue Scrolls Medium', label: 'Medium', icon: '🔵' },
  { key: 'Clue Scrolls Hard',   label: 'Hard',   icon: '🟠' },
  { key: 'Clue Scrolls Elite',  label: 'Elite',  icon: '🟣' },
  { key: 'Clue Scrolls Master', label: 'Master', icon: '🔴' },
];

const ALL_SKILLS = [
  'Attack','Strength','Defence','Constitution','Ranged','Prayer','Magic','Summoning','Necromancy',
  'Cooking','Woodcutting','Fletching','Fishing','Firemaking','Crafting','Smithing','Mining',
  'Herblore','Agility','Thieving','Slayer','Farming','Runecrafting','Hunter','Construction',
  'Dungeoneering','Divination','Invention','Archaeology',
];

// Skills with a true level-120 cap, per runescape.wiki/w/Skills. Everything else caps
// at 99 (Defence, Constitution, Prayer, Summoning, Cooking, Agility, Hunter, Divination)
// or 110 (Mining, Smithing, Woodcutting, Fletching, Firemaking, Runecrafting, Crafting).
const TRUE_120_SKILLS = [
  'Attack','Strength','Ranged','Magic','Necromancy','Herblore','Farming',
  'Archaeology','Thieving','Slayer','Dungeoneering','Invention','Construction',
];

// ── Predefined milestone definitions ──────────────────────────────────────────
// actMatch  : fn(combinedText) – match Adventurer's Log activity text
// dropMatch : fn(combinedText) – match drop-style activity ("I found/received a X")
// skillCheck: fn(player)       – fallback: check current skill data

const PREDEFINED_FIRSTS = [
  // ── PvM — Fight Caves / Kiln ─────────────────────────────────────────────
  {
    key: 'ghrazi_blood_knights', label: 'The Ghrazi Blood Knights', sub: 'Havenhythe · duo/solo endgame boss', cat: 'PvM', icon: '🩸',
    actMatch: t => /ghrazi blood knight/i.test(t),
  },
  {
    key: 'silverquill', label: 'Silverquill, the Dreadhog', sub: 'Havenhythe · members boss', cat: 'PvM', icon: '🐗',
    actMatch: t => /silverquill/i.test(t),
  },
  {
    key: 'ivar', label: 'Ivar, King of Bones', sub: 'Havenhythe · free-to-play boss', cat: 'PvM', icon: '🦴',
    actMatch: t => /ivar,? (?:the )?king of bones/i.test(t),
  },
  {
    key: 'fire_cape', label: 'Fire Cape', sub: 'TzTok-Jad', cat: 'PvM', icon: '🔥',
    actMatch: t => /fire cape/i.test(t) || /tztok.jad/i.test(t) || /\bjad\b.*defeat/i.test(t),
    dropMatch: t => /fire cape/i.test(t),
  },
  {
    key: 'har_aken', label: 'Har-Aken Kill', sub: 'Fight Kiln — required for Kiln cape', cat: 'PvM', icon: '🦑',
    actMatch: t => /har.aken/i.test(t),
  },
  {
    key: 'infernal_cape', label: 'Infernal Cape', sub: 'TzKal-Zuk · Fight Cauldron', cat: 'PvM', icon: '🌋',
    actMatch: t => /infernal cape/i.test(t) || /tzkal.zuk/i.test(t) || /\bzuk\b/i.test(t),
    dropMatch: t => /infernal cape/i.test(t),
  },

  // ── PvM — God Wars Dungeon 1 ─────────────────────────────────────────────
  {
    key: 'gwd_graardor', label: 'General Graardor', sub: 'GWD — Bandos', cat: 'PvM', icon: '🛡️',
    actMatch: t => /general graardor/i.test(t),
  },
  {
    key: 'gwd_kril', label: "K'ril Tsutsaroth", sub: 'GWD — Zamorak', cat: 'PvM', icon: '🔺',
    actMatch: t => /k.?ril tsutsaroth/i.test(t),
  },
  {
    key: 'gwd_zilyana', label: 'Commander Zilyana', sub: 'GWD — Saradomin', cat: 'PvM', icon: '🌟',
    actMatch: t => /commander zilyana/i.test(t),
  },
  {
    key: 'gwd_kreearra', label: "Kree'arra", sub: 'GWD — Armadyl', cat: 'PvM', icon: '🦅',
    actMatch: t => /kree.?arra/i.test(t),
  },
  {
    key: 'nex', label: 'Nex Kill', sub: 'GWD — Ancient Prison', cat: 'PvM', icon: '❄️',
    actMatch: t => /\bnex\b/i.test(t) && !/nexus/i.test(t) && !/next/i.test(t),
  },

  // ── PvM — Heart of Gielinor (GWD2) ──────────────────────────────────────
  {
    key: 'helwyr', label: 'Helwyr', sub: "Heart of Gielinor — Seren's Realm", cat: 'PvM', icon: '🌿',
    actMatch: t => /\bhelwyr\b/i.test(t),
  },
  {
    key: 'vindicta', label: 'Vindicta & Gorvek', sub: 'Heart of Gielinor — Zaros', cat: 'PvM', icon: '🐉',
    actMatch: t => /\bvindicta\b/i.test(t),
  },
  {
    key: 'gregorovic', label: 'Gregorovic', sub: 'Heart of Gielinor — Sliske', cat: 'PvM', icon: '💀',
    actMatch: t => /\bgregorovic\b/i.test(t),
  },
  {
    key: 'twin_furies', label: 'Twin Furies', sub: 'Heart of Gielinor — Zamorak', cat: 'PvM', icon: '⚡',
    actMatch: t => /twin furies/i.test(t),
  },
  {
    key: 'telos', label: 'First Telos Kill', sub: 'Heart of Gielinor', cat: 'PvM', icon: '🍃',
    actMatch: t => /\btelos\b/i.test(t),
  },
  {
    key: 'telos_100', label: 'Telos 100%+ Enrage', sub: 'Heart of Gielinor', cat: 'PvM', icon: '💥',
    actMatch: t => /\btelos\b/i.test(t) && /100[%+]/i.test(t),
  },
  {
    key: 'aod', label: 'Nex: Angel of Death', sub: 'Heart of Gielinor', cat: 'PvM', icon: '⚗️',
    actMatch: t => /angel of death/i.test(t),
  },

  // ── PvM — Other notable bosses ───────────────────────────────────────────
  {
    key: 'kk', label: 'Kalphite King Kill', sub: 'Exiled Kalphite Hive', cat: 'PvM', icon: '🦂',
    actMatch: t => /kalphite king/i.test(t),
  },
  {
    key: 'dagannoth_kings', label: 'Dagannoth Kings', sub: 'Waterbirth Island', cat: 'PvM', icon: '👑',
    actMatch: t => /dagannoth (rex|prime|supreme)/i.test(t),
  },
  {
    key: 'vorago', label: 'Vorago Kill', sub: 'Burthorpe', cat: 'PvM', icon: '🪨',
    actMatch: t => /\bvorago\b/i.test(t),
  },
  {
    key: 'araxxi', label: 'Araxxi Kill', sub: "Araxxor's Lair", cat: 'PvM', icon: '🕷️',
    actMatch: t => /\baraxxi\b/i.test(t),
  },
  {
    key: 'solak', label: 'Solak Kill', sub: 'Lost Grove', cat: 'PvM', icon: '🌳',
    actMatch: t => /\bsolak\b/i.test(t),
  },
  {
    key: 'legiones', label: 'Legio (Ascension)', sub: 'Ascension Dungeon', cat: 'PvM', icon: '🏹',
    actMatch: t => /legio (primus|secundus|tertius|quartus|quintus|sextus)/i.test(t),
  },
  {
    key: 'magister', label: 'The Magister', sub: 'Kharidian Catacombs', cat: 'PvM', icon: '🏺',
    actMatch: t => /\bthe magister\b/i.test(t) || (/\bmagister\b/i.test(t) && !/grandmaster/i.test(t)),
  },
  {
    key: 'zammy_loe', label: 'Zamorak (Lord of Erebus)', sub: 'City of Senntisten', cat: 'PvM', icon: '🔥',
    actMatch: t => /lord of erebus/i.test(t) || /zamorak.*boss/i.test(t),
  },
  {
    key: 'rasial', label: 'Rasial Kill', sub: 'City of Um', cat: 'PvM', icon: '☠️',
    actMatch: t => /\brasial\b/i.test(t),
  },
  {
    key: 'osseous_rex', label: 'Osseous Rex', sub: 'Senntisten Asylum', cat: 'PvM', icon: '🦴',
    actMatch: t => /osseous rex/i.test(t),
  },

  // ── PvM — Elite Dungeons ─────────────────────────────────────────────────
  {
    key: 'ed1', label: 'Temple of Aminishi (ED1)', sub: 'Elite Dungeon 1', cat: 'PvM', icon: '🐉',
    actMatch: t => /temple of aminishi/i.test(t) || /\bseiryu\b/i.test(t),
  },
  {
    key: 'ed2', label: 'Dragonkin Lab (ED2)', sub: 'Elite Dungeon 2', cat: 'PvM', icon: '🐲',
    actMatch: t => /dragonkin lab/i.test(t) || /black stone dragon/i.test(t) || /\bverak lith\b/i.test(t) || /\bastellarn\b/i.test(t),
  },
  {
    key: 'ed3', label: 'Shadow Reef (ED3)', sub: 'Elite Dungeon 3', cat: 'PvM', icon: '🦑',
    actMatch: t => /shadow reef/i.test(t) || /\bambassador\b/i.test(t),
  },

  // ── Notable Drops / Items ─────────────────────────────────────────────────
  {
    key: 'quest_cape', label: 'Quest Cape', sub: 'All RS3 quests complete — Wise Old Man', cat: 'Item', icon: '🎓',
    dropMatch: t => /quest (?:point )?cape/i.test(t),
  },
  {
    key: 'comp_cape', label: 'Completionist Cape', sub: 'Ultimate achievement cape', cat: 'Item', icon: '🌟',
    dropMatch: t => /completionist cape/i.test(t),
  },
  {
    key: 'ekzekkil', label: 'Ek-ZekKil', sub: 'T92 melee — TzKal-Zuk', cat: 'Item', icon: '🌋',
    dropMatch: t => /ek.?zekkil/i.test(t),
  },
  {
    key: 'drygore', label: 'First Drygore Weapon', sub: 'T90 melee — Kalphite King', cat: 'Item', icon: '⚔️',
    dropMatch: t => /drygore/i.test(t),
  },
  {
    key: 'ascension_xbow', label: 'First Ascension Crossbow', sub: 'T90 ranged — Legiones', cat: 'Item', icon: '🏹',
    dropMatch: t => /ascension crossbow/i.test(t),
  },
  {
    key: 'seismic', label: 'First Seismic Weapon', sub: 'T90 magic — Vorago', cat: 'Item', icon: '🔮',
    dropMatch: t => /seismic wand/i.test(t) || /seismic singularity/i.test(t),
  },
  {
    key: 'nox', label: 'First Noxious Weapon', sub: 'T90 all styles — Araxxi', cat: 'Item', icon: '🕷️',
    dropMatch: t => /noxious scythe/i.test(t) || /noxious longbow/i.test(t) || /noxious staff/i.test(t),
  },
  {
    key: 'tectonic', label: 'First Tectonic Armour', sub: 'T90 magic — Vorago', cat: 'Item', icon: '🌀',
    dropMatch: t => /tectonic/i.test(t),
  },
  {
    key: 'sirenic', label: 'First Sirenic Armour', sub: 'T90 ranged — Legiones', cat: 'Item', icon: '🐚',
    dropMatch: t => /sirenic/i.test(t),
  },
  {
    key: 'zaros_gs', label: 'Zaros Godsword', sub: 'T92 melee — Nex: AoD', cat: 'Item', icon: '🗡️',
    dropMatch: t => /zaros godsword/i.test(t),
  },
  {
    key: 'eldritch_xbow', label: 'Eldritch Crossbow', sub: 'T92 ranged — Ambassador (ED3)', cat: 'Item', icon: '🏹',
    dropMatch: t => /eldritch crossbow/i.test(t),
  },
  {
    key: 'seren_godbow', label: 'Seren Godbow', sub: 'T92 ranged — Solak', cat: 'Item', icon: '🌿',
    dropMatch: t => /seren godbow/i.test(t),
  },
  {
    key: 'praesul_wand', label: 'Praesul Wand', sub: 'T92 magic — Nex: AoD', cat: 'Item', icon: '🔮',
    dropMatch: t => /praesul wand/i.test(t),
  },
  {
    key: 'cinderbane', label: 'Cinderbane Gloves', sub: 'BiS gloves for poisoning — ED1', cat: 'Item', icon: '🧤',
    dropMatch: t => /cinderbane/i.test(t),
  },
  // Count-based: first player to accumulate ≥N T90+ drops in the activity log
  {
    key: 'first_t90_unique', label: 'First T90+ Unique Drop', sub: 'Any T90+ weapon or armour piece', cat: 'Item', icon: '💎',
    countMatch: t => /drygore|ascension crossbow|seismic wand|seismic singularity|noxious scythe|noxious longbow|noxious staff|zaros godsword|eldritch crossbow|seren godbow|tectonic|sirenic|ek.?zekkil|praesul wand|cinderbane/i.test(t),
    countThreshold: 1,
  },
  {
    key: 'five_t90_uniques', label: 'First 5 T90+ Unique Drops', sub: '5 high-tier unique drops total', cat: 'Item', icon: '💎',
    countMatch: t => /drygore|ascension crossbow|seismic wand|seismic singularity|noxious scythe|noxious longbow|noxious staff|zaros godsword|eldritch crossbow|seren godbow|tectonic|sirenic|ek.?zekkil|praesul wand|cinderbane/i.test(t),
    countThreshold: 5,
  },

  // ── Quests ────────────────────────────────────────────────────────────────
  {
    key: 'desert_treasure', label: 'Desert Treasure', sub: 'Grandmaster quest', cat: 'Quest', icon: '🏺',
    actMatch: t => /desert treasure/i.test(t),
  },
  {
    key: 'monkey_madness', label: 'Monkey Madness', sub: 'Ape Atoll / The Grand Tree', cat: 'Quest', icon: '🐒',
    actMatch: t => /monkey madness/i.test(t),
  },
  {
    key: 'recipe_for_disaster', label: 'Recipe for Disaster', sub: 'Grandmaster quest', cat: 'Quest', icon: '🍽️',
    actMatch: t => /recipe for disaster/i.test(t),
  },
  {
    key: 'elder_kiln', label: 'The Elder Kiln', sub: 'Unlocks TzTok-Jad', cat: 'Quest', icon: '🔥',
    actMatch: t => /elder kiln/i.test(t),
  },
  {
    key: 'while_guthix_sleeps', label: 'While Guthix Sleeps', sub: 'Grandmaster quest', cat: 'Quest', icon: '💤',
    actMatch: t => /while guthix sleeps/i.test(t),
  },
  {
    key: 'rotm', label: 'Ritual of the Mahjarrat', sub: 'Grandmaster quest', cat: 'Quest', icon: '🗿',
    actMatch: t => /ritual of the mahjarrat/i.test(t),
  },
  {
    key: 'world_wakes', label: 'The World Wakes', sub: 'Master quest', cat: 'Quest', icon: '🌅',
    actMatch: t => /world wakes/i.test(t),
  },
  {
    key: 'fate_of_the_gods', label: 'Fate of the Gods', sub: 'Master quest', cat: 'Quest', icon: '⚡',
    actMatch: t => /fate of the gods/i.test(t),
  },
  {
    key: 'children_of_mah', label: 'Children of Mah', sub: 'Master quest', cat: 'Quest', icon: '🌙',
    actMatch: t => /children of mah/i.test(t),
  },
  {
    key: 'plagues_end', label: "Plague's End", sub: 'Unlocks Prifddinas', cat: 'Quest', icon: '🏙️',
    actMatch: t => /plague.*end/i.test(t),
  },
  {
    key: 'sliskes_endgame', label: "Sliske's Endgame", sub: 'Grandmaster quest', cat: 'Quest', icon: '🎭',
    actMatch: t => /sliske.*endgame/i.test(t),
  },
  {
    key: 'extinction', label: 'Extinction', sub: 'Elder God Wars finale', cat: 'Quest', icon: '💀',
    actMatch: t => /\bextinction\b/i.test(t),
  },
  {
    key: 'azzanadras_quest', label: "Azzanadra's Quest", sub: 'Master quest — Elder God Wars', cat: 'Quest', icon: '📜',
    actMatch: t => /azzanadra.s quest/i.test(t),
  },
  {
    key: 'city_senntisten', label: 'City of Senntisten', sub: 'Master quest — Elder God Wars', cat: 'Quest', icon: '🏛️',
    actMatch: t => /city of senntisten/i.test(t),
  },
  {
    key: 'needle_skips', label: 'The Needle Skips', sub: 'Master quest — Elder God Wars', cat: 'Quest', icon: '🧵',
    actMatch: t => /needle skips/i.test(t),
  },
  {
    key: 'daughter_chaos', label: 'Daughter of Chaos', sub: 'Master quest — Elder God Wars', cat: 'Quest', icon: '🔥',
    actMatch: t => /daughter of chaos/i.test(t),
  },
  {
    key: 'twilight_of_gods', label: 'Twilight of the Gods', sub: 'Grandmaster quest — Elder God Wars', cat: 'Quest', icon: '🌌',
    actMatch: t => /twilight of the gods/i.test(t),
  },

  // ── Skills ────────────────────────────────────────────────────────────────
  {
    key: 'max_cape', label: 'Max Cape', sub: 'All skills 99+', cat: 'Skill', icon: '🎓',
    actMatch: t => /max cape/i.test(t),
    skillCheck: p => (p.skills?.filter(s => s.skill_name !== 'Overall' && s.level >= 99).length ?? 0) >= 29,
  },
  // ── 99s — every skill, generated so none get left out
  ...ALL_SKILLS.map(skill => ({
    key: `first99_${skill.toLowerCase()}`, label: `First 99 ${skill}`, sub: '', cat: 'Skill', skillIcon: skill,
    actMatch: t => new RegExp(`maximum level in ${skill}`, 'i').test(t)
      || new RegExp(`I levelled my ${skill} skill, I am now level 99\\b`, 'i').test(t),
    skillCheck: p => (p.skills?.find(s => s.skill_name === skill)?.level ?? 0) >= 99,
  })),
  // ── 120s — only the 13 skills with a true 120 cap
  ...TRUE_120_SKILLS.map(skill => ({
    key: `first120_${skill.toLowerCase()}`, label: `First 120 ${skill}`, sub: 'True 120', cat: 'Skill', skillIcon: skill,
    actMatch: t => (new RegExp(`maximum level in ${skill}`, 'i').test(t) && /120/.test(t))
      || new RegExp(`I levelled my ${skill} skill, I am now level 120\\b`, 'i').test(t),
    skillCheck: p => (p.skills?.find(s => s.skill_name === skill)?.level ?? 0) >= 120,
  })),

  // ── Clue Scrolls — count milestones (from hiscores, date unknown) ─────────
  {
    key: 'clue_easy_50', label: 'First 50 Easy Clues', sub: 'Clue scroll milestone', cat: 'Clue', icon: '🟢',
    skillCheck: p => (parseStats(p.stats_json)?.activities?.['Clue Scrolls Easy'] ?? 0) >= 50,
  },
  {
    key: 'clue_medium_25', label: 'First 25 Medium Clues', sub: 'Clue scroll milestone', cat: 'Clue', icon: '🔵',
    skillCheck: p => (parseStats(p.stats_json)?.activities?.['Clue Scrolls Medium'] ?? 0) >= 25,
  },
  {
    key: 'clue_hard_50', label: 'First 50 Hard Clues', sub: 'Clue scroll milestone', cat: 'Clue', icon: '🟠',
    skillCheck: p => (parseStats(p.stats_json)?.activities?.['Clue Scrolls Hard'] ?? 0) >= 50,
  },
  {
    key: 'clue_elite_10', label: 'First 10 Elite Clues', sub: 'Clue scroll milestone', cat: 'Clue', icon: '🟣',
    skillCheck: p => (parseStats(p.stats_json)?.activities?.['Clue Scrolls Elite'] ?? 0) >= 10,
  },
  {
    key: 'clue_elite_50', label: 'First 50 Elite Clues', sub: 'Clue scroll milestone', cat: 'Clue', icon: '🟣',
    skillCheck: p => (parseStats(p.stats_json)?.activities?.['Clue Scrolls Elite'] ?? 0) >= 50,
  },
  {
    key: 'clue_master_5', label: 'First 5 Master Clues', sub: 'Clue scroll milestone', cat: 'Clue', icon: '🔴',
    skillCheck: p => (parseStats(p.stats_json)?.activities?.['Clue Scrolls Master'] ?? 0) >= 5,
  },
  {
    key: 'clue_master_25', label: 'First 25 Master Clues', sub: 'Clue scroll milestone', cat: 'Clue', icon: '🔴',
    skillCheck: p => (parseStats(p.stats_json)?.activities?.['Clue Scrolls Master'] ?? 0) >= 25,
  },
];

const CAT_STYLE = {
  PvM:   { badge: 'PvM',   bg: 'rgba(192,64,64,0.15)',    border: 'var(--red)',      color: 'var(--red-bright)' },
  Quest: { badge: 'Quest', bg: 'rgba(74,136,184,0.15)',   border: 'var(--blue)',     color: '#7eb8f7' },
  Skill: { badge: 'Skill', bg: 'rgba(200,168,75,0.12)',   border: 'var(--gold-dark)',color: 'var(--gold)' },
  Item:  { badge: 'Item',  bg: 'rgba(90,154,80,0.12)',    border: 'var(--green)',    color: 'var(--green-bright)' },
  Clue:  { badge: 'Clue',  bg: 'rgba(160,100,200,0.12)', border: 'rgba(160,100,200,0.5)', color: '#c07ef7' },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseStats(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

function parseActivities(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

// Manual/server-set dates come through as plain ISO ("2026-06-12" or a full
// timestamp) rather than RuneMetrics' "12-Jun-2026" format — detect which shape
// it is rather than guessing, since Date.parse is unreliable on the RM format.
function anyDateToTs(str) {
  if (!str) return 0;
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const iso = Date.parse(str);
    if (!isNaN(iso)) return iso;
  }
  return parseRMDate(str);
}

function fmtDate(str) {
  const t = anyDateToTs(str);
  if (!t) return null;
  return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' });
}

// ── Firsts board ──────────────────────────────────────────────────────────────

function FirstsBoard({ players, colorMap, groupId, canWrite, onToast }) {
  const [catFilter, setCatFilter] = useState('All');
  const [showAll, setShowAll] = useState(false);
  const [manualFirsts, setManualFirsts] = useState([]);
  const [editingKey, setEditingKey] = useState(null); // milestone def being edited, or null

  const loadManualFirsts = () => {
    if (!groupId) return;
    api.getManualFirsts(groupId).then(setManualFirsts).catch(() => {});
  };
  useEffect(loadManualFirsts, [groupId]);

  const manualByKey = useMemo(() => Object.fromEntries(manualFirsts.map(m => [m.key, m])), [manualFirsts]);
  const playersById  = useMemo(() => Object.fromEntries(players.map(p => [p.id, p])), [players]);

  const results = useMemo(() => {
    return PREDEFINED_FIRSTS.map(def => {
      // A manual override always wins — it exists specifically to correct or
      // backfill a milestone the activity-feed scan missed or got wrong.
      const manual = manualByKey[def.key];
      if (manual && playersById[manual.player_id]) {
        return {
          ...def, status: 'manual',
          winner: { rsn: playersById[manual.player_id].rsn, playerId: manual.player_id, date: manual.achieved_at },
          note: manual.note,
        };
      }

      const candidates = [];

      for (const p of players) {
        const acts = parseActivities(p.activities_json);

        if (def.countMatch && def.countThreshold) {
          // ── Count-based milestone ──────────────────────────────────────────
          // Walk ALL activities oldest-first, count matches; push when Nth match found.
          const sorted = [...acts].sort((a, b) => parseRMDate(a.date) - parseRMDate(b.date));
          let cnt = 0;
          for (const act of sorted) {
            const combined = ((act.text || '') + ' ' + (act.details || '')).trim();
            if (def.countMatch(combined)) {
              cnt++;
              if (cnt >= def.countThreshold) {
                const ts = parseRMDate(act.date);
                if (ts > 0) candidates.push({ rsn: p.rsn, playerId: p.id, ts, date: act.date });
                break;
              }
            }
          }
        } else {
          // ── Regular single-event milestone ────────────────────────────────
          for (const act of acts) {
            const actText    = (act.text    || '').trim();
            const actDetails = (act.details || '').trim();
            const combined   = (actText + ' ' + actDetails).trim();
            const ts = parseRMDate(act.date);

            let matched = false;
            if (def.actMatch) {
              // For PvM milestones only test against the activity text field (not details),
              // so quest cutscene flavour text that names a boss doesn't create false positives.
              // Also require a kill verb in the text when the milestone category is PvM.
              const testStr = def.cat === 'PvM' ? actText : combined;
              if (def.cat === 'PvM' && !/defeat|kill|slay|vanquish/i.test(actText)) {
                // no-op: not a kill activity
              } else if (def.actMatch(testStr)) {
                matched = true;
              }
            }
            if (!matched && def.dropMatch) {
              const isDropText = /I (?:found|received) (?:a |an )/i.test(combined);
              if (isDropText && def.dropMatch(combined)) matched = true;
            }

            if (matched && ts > 0) {
              candidates.push({ rsn: p.rsn, playerId: p.id, ts, date: act.date });
              break; // earliest match per player
            }
          }
        }
      }

      if (candidates.length > 0) {
        candidates.sort((a, b) => a.ts - b.ts);
        const winner = candidates[0];
        return { ...def, status: 'achieved', winner, allCandidates: candidates };
      }

      // Fallback: check current skill/stats data (no date available)
      if (def.skillCheck) {
        const holders = players.filter(def.skillCheck);
        if (holders.length > 0) {
          return {
            ...def, status: 'skill_fallback',
            holders: holders.map(p => ({ rsn: p.rsn, playerId: p.id })),
          };
        }
      }

      return { ...def, status: 'pending' };
    });
  }, [players, manualByKey, playersById]);

  const cats = ['All', 'PvM', 'Quest', 'Skill', 'Item', 'Clue'];
  const visible = results.filter(r => catFilter === 'All' || r.cat === catFilter);
  const achieved = visible.filter(r => r.status !== 'pending');
  const pending  = visible.filter(r => r.status === 'pending');


  return (
    <div>
      {/* Category filter */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--bg-root)', borderRadius: 'var(--radius)', padding: 3, width: 'fit-content' }}>
        {cats.map(c => (
          <button key={c} onClick={() => setCatFilter(c)} style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 'var(--radius)', border: 'none', cursor: 'pointer',
            background: catFilter === c ? 'var(--gold)' : 'transparent',
            color: catFilter === c ? '#111' : 'var(--text-dim)',
            fontWeight: catFilter === c ? 700 : 400,
          }}>{c}</button>
        ))}
      </div>

      {/* Achieved */}
      {achieved.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
            <RsIcon name="leaderboards" size={13} style={{ marginRight: 5 }} />Achieved ({achieved.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 6 }}>
            {achieved.map(r => <MilestoneCard key={r.key} result={r} colorMap={colorMap} canWrite={canWrite} onEdit={() => setEditingKey(r.key)} />)}
          </div>
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ⏳ Not Yet Achieved ({pending.length})
            </div>
            {pending.length > 6 && (
              <button onClick={() => setShowAll(s => !s)} style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer',
              }}>{showAll ? 'Show less' : 'Show all'}</button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 6 }}>
            {(showAll ? pending : pending.slice(0, 6)).map(r => <MilestoneCard key={r.key} result={r} colorMap={colorMap} canWrite={canWrite} onEdit={() => setEditingKey(r.key)} />)}
          </div>
          {!showAll && pending.length > 6 && (
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
              {pending.length - 6} more hidden —{' '}
              <button onClick={() => setShowAll(true)} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 11 }}>show all</button>
            </div>
          )}
        </div>
      )}

      {achieved.length === 0 && pending.length === 0 && (
        <div style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', padding: '30px 0' }}>
          No milestones found for this filter.
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 10, color: 'var(--text-dim)', textAlign: 'center' }}>
        Firsts are detected from the Adventurer's Log activity feed (events are stored permanently as players sync). Skill &amp; Clue milestones fall back to current hiscores data (date shown as unknown) when the feed has no matching entry. Drop count milestones count across all stored activities. Any entry can be corrected or backfilled by hand — click ✎ (unlocked groups only).
      </div>

      {editingKey && (
        <ManualFirstModal
          def={PREDEFINED_FIRSTS.find(d => d.key === editingKey)}
          players={players}
          existing={manualByKey[editingKey]}
          groupId={groupId}
          onClose={() => setEditingKey(null)}
          onSaved={() => { loadManualFirsts(); setEditingKey(null); }}
          onToast={onToast}
        />
      )}
    </div>
  );
}

function MilestoneCard({ result, colorMap, canWrite, onEdit }) {
  const cs = CAT_STYLE[result.cat] ?? CAT_STYLE.Skill;
  const isAchieved = result.status !== 'pending';
  const isFallback = result.status === 'skill_fallback';

  return (
    <div style={{
      padding: '10px 12px',
      background: isAchieved ? cs.bg : 'var(--bg-panel-alt)',
      border: `1px solid ${isAchieved ? cs.border : 'var(--border)'}`,
      borderRadius: 'var(--radius)',
      opacity: isAchieved ? 1 : 0.55,
      transition: 'opacity 0.15s',
      position: 'relative',
    }}>
      {/* Cat badge */}
      <span style={{
        position: 'absolute', top: 8, right: canWrite ? 26 : 8,
        fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 6,
        background: isAchieved ? cs.bg : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isAchieved ? cs.border : 'var(--border)'}`,
        color: isAchieved ? cs.color : 'var(--text-dim)',
        textTransform: 'uppercase', letterSpacing: '0.4px',
      }}>{cs.badge}</span>

      {/* Manual edit — set/correct who got this first, in case the activity feed missed it */}
      {canWrite && (
        <button onClick={onEdit} title="Manually set who got this first"
          style={{
            position: 'absolute', top: 6, right: 6, width: 16, height: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: 'var(--text-dim)', padding: 0, lineHeight: 1,
          }}>✎</button>
      )}

      {/* Icon + title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, paddingRight: 40 }}>
        <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>
          {result.skillIcon
            ? <img src={SKILL_ICON_URL(result.skillIcon)} alt={result.skillIcon} style={{ width: 22, height: 22, verticalAlign: 'middle' }} />
            : <FirstIcon id={result.key} emoji={result.icon} />}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: isAchieved ? 'var(--text-bright)' : 'var(--text-dim)', lineHeight: 1.3 }}>
            {result.label}
          </div>
          {result.sub && (
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>{result.sub}</div>
          )}
        </div>
      </div>

      {/* Winner / holders / pending */}
      <div style={{ marginTop: 8, paddingTop: 7, borderTop: `1px solid ${isAchieved ? cs.border : 'var(--border)'}` }}>
        {(result.status === 'achieved' || result.status === 'manual') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }} title={result.note || undefined}>
            <RsIcon name="leaderboards" size={15} />
            <span style={{ fontSize: 12, fontWeight: 700, color: colorMap[result.winner.playerId] }}>{result.winner.rsn}</span>
            {result.status === 'manual' && (
              <span style={{ fontSize: 9, color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 6, padding: '0 4px' }}>✎ manual</span>
            )}
            {result.winner.date && (
              <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 'auto' }}>{fmtDate(result.winner.date)}</span>
            )}
          </div>
        )}
        {result.status === 'skill_fallback' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {result.holders.map(h => (
              <span key={h.playerId} style={{ fontSize: 12, fontWeight: 700, color: colorMap[h.playerId] }}>{h.rsn}</span>
            ))}
            <span style={{ fontSize: 10, color: 'var(--text-dim)', fontStyle: 'italic' }}>date unknown</span>
          </div>
        )}
        {result.status === 'pending' && (
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic' }}>Not yet achieved</span>
        )}
      </div>
    </div>
  );
}

// ── Manual "first" override modal ──────────────────────────────────────────────

function ManualFirstModal({ def, players, existing, groupId, onClose, onSaved, onToast }) {
  const [playerId, setPlayerId] = useState(existing?.player_id ?? players[0]?.id ?? '');
  const [date, setDate]   = useState(existing?.achieved_at ? existing.achieved_at.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [note, setNote]   = useState(existing?.note ?? '');
  const [saving, setSaving] = useState(false);

  if (!def) return null;

  async function submit(e) {
    e.preventDefault();
    if (!playerId) return onToast?.('Pick a player', 'error');
    setSaving(true);
    try {
      await api.setManualFirst(groupId, def.key, { player_id: Number(playerId), achieved_at: date, note });
      onSaved();
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    setSaving(true);
    try {
      await api.clearManualFirst(groupId, def.key);
      onSaved();
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <span className="modal-title">✎ Set First — {def.label}</span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 0 }}>
              Use this if the activity feed didn't catch it — e.g. it happened before the group started tracking, or the wording didn't match.
            </p>
            <div className="form-group">
              <label className="form-label">Player</label>
              <select className="form-select" value={playerId} onChange={e => setPlayerId(e.target.value)}>
                {players.map(p => <option key={p.id} value={p.id}>{p.rsn}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date achieved</label>
              <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)} />
            </div>
            <div className="form-group">
              <label className="form-label">Note (optional)</label>
              <input className="form-input" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. achieved before we started tracking" />
            </div>
          </div>
          <div className="modal-footer">
            {existing && (
              <button type="button" className="btn btn-ghost" onClick={clear} disabled={saving}>Clear override</button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '✓ Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Milestones feed ───────────────────────────────────────────────────────────

const ACTIVITY_MILESTONE_DEFS = [
  { key: 'firecape',    label: 'Fire Cape',       icon: '🔥', cat: 'PvM',   patterns: [/fire cape/i, /tztok.jad/i] },
  { key: 'infernal',    label: 'Infernal Cape',   icon: '🌋', cat: 'PvM',   patterns: [/infernal cape/i, /tzkal.zuk/i, /\bzuk\b/i] },
  { key: 'araxxi',      label: 'Araxxi',          icon: '🕷️', cat: 'PvM',   patterns: [/\baraxxi\b/i] },
  { key: 'telos',       label: 'Telos',           icon: '🌿', cat: 'PvM',   patterns: [/\btelos\b/i] },
  { key: 'vorago',      label: 'Vorago',          icon: '🪨', cat: 'PvM',   patterns: [/\bvorago\b/i] },
  { key: 'nex',         label: 'Nex',             icon: '❄️', cat: 'PvM',   patterns: [/\bnex\b/i] },
  { key: 'kk',          label: 'Kalphite King',   icon: '🦂', cat: 'PvM',   patterns: [/kalphite king/i] },
  { key: 'aod',         label: 'AoD',             icon: '⚗️', cat: 'PvM',   patterns: [/angel of death/i] },
  { key: 'solak',       label: 'Solak',           icon: '🌳', cat: 'PvM',   patterns: [/\bsolak\b/i] },
  { key: 'rasial',      label: 'Rasial',          icon: '☠️', cat: 'PvM',   patterns: [/\brasial\b/i] },
];

function MilestonesFeed({ players, colorMap }) {
  const [filter, setFilter] = useState('All');

  const milestones = useMemo(() => {
    const found = [];
    for (const p of players) {
      const acts = parseActivities(p.activities_json);
      for (const act of acts) {
        const actText    = (act.text    || '').trim();
        const actDetails = (act.details || '').trim();
        const combined   = (actText + ' ' + actDetails).trim();

        // 99 / 120 skill achievement
        const maxMatch = combined.match(/I achieved the maximum level in ([\w\s]+?)!?\.?$/i)
          ?? combined.match(/I (?:levelled|reached) (?:my )?([\w\s]+?) to (99|1[01]\d|120)\b/i)
          ?? combined.match(/I levelled my ([\w\s]+?) skill, I am now level (99|120)\b/i);
        if (maxMatch) {
          const skillName = maxMatch[1].trim();
          if (ALL_SKILLS.includes(skillName)) {
            const lvl = maxMatch[2] ? parseInt(maxMatch[2]) : 99;
            found.push({
              id: `${p.id}_skill_${skillName}_${act.date}`,
              cat: 'Skill',
              icon: <img src={SKILL_ICON_URL(skillName)} alt={skillName} style={{ width: 18, height: 18, verticalAlign: 'middle' }} />,
              label: `${lvl >= 120 ? '★ 120' : '★ 99'} ${skillName}`,
              rsn: p.rsn, playerId: p.id, date: act.date, ts: parseRMDate(act.date),
            });
            continue;
          }
        }

        // Quest completion — also catches "Quest complete: X" style entries
        const questMatch = combined.match(/I completed the quest[: ]+(.+?)\.?\s*$/i)
          ?? actText.match(/^Quest complete[d]?[:\s]+(.+?)\.?\s*$/i);
        if (questMatch) {
          found.push({
            id: `${p.id}_quest_${questMatch[1]}_${act.date}`,
            cat: 'Quest', icon: '📜', label: questMatch[1].trim(),
            rsn: p.rsn, playerId: p.id, date: act.date, ts: parseRMDate(act.date),
          });
          continue;
        }

        // Boss / notable PvM activity
        // Guard: the activity TEXT (not details) must contain a kill verb.
        // This prevents quest cutscenes / flavour text that merely names a boss
        // (e.g. "Quest complete: Necromancy!" whose details mention Rasial) from
        // being counted as a PvM milestone.
        if (!/defeat|kill|slay|vanquish/i.test(actText)) continue;

        for (const def of ACTIVITY_MILESTONE_DEFS) {
          // Test against the text field only — details may name bosses in non-kill contexts
          if (def.patterns.some(rx => rx.test(actText))) {
            found.push({
              id: `${p.id}_${def.key}_${act.date}`,
              cat: def.cat, icon: def.icon, label: def.label,
              rsn: p.rsn, playerId: p.id, date: act.date, ts: parseRMDate(act.date),
            });
            break;
          }
        }
      }
    }

    const seen = new Set();
    return found
      .filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; })
      .sort((a, b) => b.ts - a.ts);
  }, [players]);

  const cats = ['All', ...['Boss', 'Quest', 'Skill', 'PvM'].filter(c => milestones.some(m => m.cat === c))];
  const visible = filter === 'All' ? milestones : milestones.filter(m => m.cat === filter);

  if (milestones.length === 0) {
    return (
      <div style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
        No milestones detected yet. Sync players — milestones are picked up automatically from the Adventurer's Log feed.
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, background: 'var(--bg-root)', borderRadius: 'var(--radius)', padding: 3, width: 'fit-content' }}>
        {cats.map(c => (
          <button key={c} onClick={() => setFilter(c)} style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 'var(--radius)', border: 'none', cursor: 'pointer',
            background: filter === c ? 'var(--gold)' : 'transparent',
            color: filter === c ? '#111' : 'var(--text-dim)', fontWeight: filter === c ? 700 : 400,
          }}>{c}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {visible.map(m => {
          const cs = CAT_STYLE[m.cat] ?? CAT_STYLE.Skill;
          return (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 12px', background: 'var(--bg-panel-alt)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            }}>
              <span style={{ fontSize: 18, flexShrink: 0, width: 22, textAlign: 'center', lineHeight: 1 }}><FirstIcon id={m.key} emoji={m.icon} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 700, color: colorMap[m.playerId], marginRight: 6, fontSize: 12 }}>{m.rsn}</span>
                <span style={{ fontSize: 12, color: 'var(--text-bright)' }}>{m.label}</span>
              </div>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 8,
                background: cs.bg, border: `1px solid ${cs.border}`, color: cs.color,
                textTransform: 'uppercase', letterSpacing: '0.4px', flexShrink: 0,
              }}>{cs.badge}</span>
              {m.date && <span style={{ fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap', flexShrink: 0 }}>{fmtDate(m.date)}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Skill Mastery ─────────────────────────────────────────────────────────────

function SkillMastery({ players, colorMap, groupId, canWrite, onToast }) {
  const [view, setView] = useState('99s');
  const [milestones, setMilestones] = useState([]);
  const [editing, setEditing] = useState(null); // { playerId, rsn, skill, level } or null

  const loadMilestones = () => {
    if (!groupId) return;
    api.getSkillMilestones(groupId).then(setMilestones).catch(() => {});
  };
  useEffect(loadMilestones, [groupId]);

  // dateFor[playerId][skill][level] = achieved_at
  const dateFor = useMemo(() => {
    const map = {};
    for (const m of milestones) {
      (map[m.player_id] ??= {});
      (map[m.player_id][m.skill] ??= {});
      map[m.player_id][m.skill][m.level] = m.achieved_at;
    }
    return map;
  }, [milestones]);

  const rows = useMemo(() => players.map(p => {
    const skills = p.skills || [];
    const list99  = ALL_SKILLS.filter(s => { const sk = skills.find(x => x.skill_name === s); return sk && sk.level >= 99 && sk.level < 120; });
    const list120 = ALL_SKILLS.filter(s => { const sk = skills.find(x => x.skill_name === s); return sk && sk.level >= 120; });
    return { ...p, list99, list120, count99: list99.length, count120: list120.length };
  }).sort((a, b) => view === '120s'
    ? b.count120 - a.count120 || b.count99 - a.count99
    : b.count99 + b.count120 - a.count99 - a.count120
  ), [players, view]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, background: 'var(--bg-root)', borderRadius: 'var(--radius)', padding: 3, width: 'fit-content' }}>
        {['99s', '120s'].map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 'var(--radius)', border: 'none', cursor: 'pointer',
            background: view === v ? 'var(--gold)' : 'transparent',
            color: view === v ? '#111' : 'var(--text-dim)', fontWeight: view === v ? 700 : 400,
          }}>{v}</button>
        ))}
      </div>
      {rows.map(p => {
        const list = view === '120s' ? p.list120 : [...p.list120, ...p.list99];
        return (
          <div key={p.id} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: colorMap[p.id] }}>{p.rsn}</span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                {view === '120s' ? `${p.count120} × 120` : `${p.count120} × 120  ·  ${p.count99} × 99`}
              </span>
            </div>
            {list.length === 0
              ? <span style={{ fontSize: 11, color: 'var(--text-dim)', paddingLeft: 4 }}>None yet</span>
              : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {list.map(skill => {
                    const sk = p.skills?.find(s => s.skill_name === skill);
                    const is120 = sk?.level >= 120;
                    const level = is120 ? 120 : 99;
                    const achievedAt = dateFor[p.id]?.[skill]?.[level];
                    const dateLabel = achievedAt ? fmtDate(achievedAt) : null;
                    const title = `${skill} ${sk?.level}` + (dateLabel ? ` — achieved ${dateLabel}` : ' — date unknown')
                      + (canWrite ? ' (click to set/correct date)' : '');
                    return (
                      <span key={skill} title={title}
                        onClick={canWrite ? () => setEditing({ playerId: p.id, rsn: p.rsn, skill, level, achievedAt }) : undefined}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 7px', borderRadius: 10, fontSize: 11,
                          background: is120 ? 'rgba(200,168,75,0.15)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${is120 ? 'var(--gold-dark)' : 'var(--border)'}`,
                          color: is120 ? 'var(--gold)' : 'var(--text)',
                          cursor: canWrite ? 'pointer' : 'default',
                        }}>
                        <img src={SKILL_ICON_URL(skill)} alt={skill} style={{ width: 14, height: 14, verticalAlign: 'middle' }} />
                        {is120 ? '★ ' : ''}{skill}
                        {dateLabel && <span style={{ opacity: 0.65, fontSize: 10 }}>· {dateLabel}</span>}
                      </span>
                    );
                  })}
                </div>
              )}
          </div>
        );
      })}

      {editing && (
        <SetSkillDateModal
          {...editing}
          onClose={() => setEditing(null)}
          onSaved={() => { loadMilestones(); setEditing(null); }}
          onToast={onToast}
        />
      )}
    </div>
  );
}

function SetSkillDateModal({ playerId, rsn, skill, level, achievedAt, onClose, onSaved, onToast }) {
  const [date, setDate] = useState(achievedAt ? achievedAt.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.setSkillMilestone(playerId, skill, level, date);
      onSaved();
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    setSaving(true);
    try {
      await api.clearSkillMilestone(playerId, skill, level);
      onSaved();
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 360 }}>
        <div className="modal-header">
          <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <img src={SKILL_ICON_URL(skill)} alt={skill} style={{ width: 16, height: 16 }} />
            {rsn} — Level {level} {skill}
          </span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 0 }}>
              Auto-detected from the activity feed going forward. Set this by hand to backfill a date the feed missed (e.g. reached before joining the group).
            </p>
            <div className="form-group">
              <label className="form-label">Date achieved</label>
              <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)} />
            </div>
          </div>
          <div className="modal-footer">
            {achievedAt && (
              <button type="button" className="btn btn-ghost" onClick={clear} disabled={saving}>Clear</button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '✓ Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Boss Kills ────────────────────────────────────────────────────────────────

function BossKills({ players, colorMap, groupId }) {
  const [rawKills, setRawKills] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [bossFilter, setBossFilter] = useState('All');

  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    api.getBossKills(groupId)
      .then(data => { setRawKills(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [groupId]);

  // Build map: { playerId: { bossKey: kills } }
  const killMap = useMemo(() => {
    const map = {};
    for (const row of rawKills) {
      if (!map[row.player_id]) map[row.player_id] = {};
      map[row.player_id][row.boss_key] = row.kills;
    }
    return map;
  }, [rawKills]);

  // All bosses that have at least one kill, in the order they appear in rawKills
  const activeBosses = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const row of rawKills) {
      if (!seen.has(row.boss_key)) {
        seen.add(row.boss_key);
        result.push({ key: row.boss_key, label: row.boss_label });
      }
    }
    return result;
  }, [rawKills]);

  const displayBosses = bossFilter === 'All'
    ? activeBosses
    : activeBosses.filter(b => b.key === bossFilter);

  // Total kills per player across all active bosses
  const playerTotals = useMemo(() =>
    Object.fromEntries(players.map(p => [
      p.id,
      activeBosses.reduce((s, b) => s + (killMap[p.id]?.[b.key] ?? 0), 0),
    ])),
  [players, killMap, activeBosses]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>;
  }

  if (activeBosses.length === 0) {
    return (
      <div style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
        <p>No boss kills detected yet.</p>
        <p style={{ marginTop: 8, fontSize: 11, lineHeight: 1.6 }}>
          Kill counts are built from the Adventurer's Log feed — they accumulate every time a player is synced.<br />
          Sync your players and check back shortly. Only kills the game logged are counted — each player can switch event types on under Settings → Gameplay → Chat &amp; Social → RuneMetrics Event Log.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Boss filter dropdown */}
      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>Filter boss:</label>
        <select
          value={bossFilter}
          onChange={e => setBossFilter(e.target.value)}
          style={{
            background: 'var(--bg-panel-alt)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: 12,
            padding: '4px 8px', cursor: 'pointer', minWidth: 200,
          }}>
          <option value="All">All bosses ({activeBosses.length})</option>
          {activeBosses.map(b => <option key={b.key} value={b.key}>{b.label}</option>)}
        </select>
      </div>

      {/* Table: boss rows × player columns */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th align="left" style={{ padding: '4px 12px 8px 4px', fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                Boss
              </th>
              {players.map(p => (
                <th key={p.id} align="center" style={{ padding: '4px 12px 8px', fontSize: 12, fontWeight: 700, color: colorMap[p.id], whiteSpace: 'nowrap' }}>
                  {p.rsn}
                  <div style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-dim)' }}>
                    {(playerTotals[p.id] ?? 0).toLocaleString()} total
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayBosses.map((boss, bi) => {
              const values = players.map(p => killMap[p.id]?.[boss.key] ?? 0);
              const maxVal = Math.max(...values);
              return (
                <tr key={boss.key} style={{
                  borderTop: '1px solid var(--border)',
                  background: bi % 2 ? 'rgba(255,255,255,0.015)' : 'transparent',
                }}>
                  <td style={{ padding: '7px 12px 7px 4px', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--text-bright)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><BossIcon name={boss.label} size={24} fallback={<span style={{ width: 24 }} />} />{boss.label}</span>
                  </td>
                  {players.map((p, pi) => {
                    const val = values[pi];
                    const isTop = val > 0 && val === maxVal;
                    return (
                      <td key={p.id} align="center" style={{
                        padding: '7px 12px',
                        borderLeft: '1px solid var(--border)',
                        background: isTop ? 'rgba(200,168,75,0.18)' : undefined,
                        fontWeight: isTop ? 700 : 400,
                        color: isTop ? 'var(--gold)' : val > 0 ? 'var(--text)' : 'var(--text-dim)',
                      }}>
                        {val > 0 ? val.toLocaleString() : '—'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text-dim)' }}>
        Counted from the Adventurer's Log feed — accumulates each sync (the game batches kills, e.g. “I killed 17 Hermods”). Only kills since a player was added are counted.
      </div>
    </div>
  );
}

// ── Clue Scrolls ──────────────────────────────────────────────────────────────

function ClueScrolls({ players, colorMap }) {
  const rows = useMemo(() => {
    const mapped = players.map(p => {
      const stats = parseStats(p.stats_json);
      const acts = stats?.activities ?? {};
      const clues = {
        easy:   acts['Clue Scrolls Easy']   ?? null,
        medium: acts['Clue Scrolls Medium'] ?? null,
        hard:   acts['Clue Scrolls Hard']   ?? null,
        elite:  acts['Clue Scrolls Elite']  ?? null,
        master: acts['Clue Scrolls Master'] ?? null,
      };
      const total = Object.values(clues).reduce((s, v) => s + (v ?? 0), 0);
      return { ...p, clues, total };
    });
    return mapped.sort((a, b) => b.total - a.total);
  }, [players]);

  const colKeys = ['easy', 'medium', 'hard', 'elite', 'master'];
  const maxPerCol = Object.fromEntries(colKeys.map(k => [k, Math.max(...rows.map(r => r.clues[k] ?? 0), 0)]));
  const noData = rows.every(r => Object.values(r.clues).every(v => v === null));

  if (noData) {
    return (
      <div style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
        No clue scroll data yet — sync players to load hiscores.
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
        <thead>
          <tr style={{ color: 'var(--text-dim)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            <th align="left" style={{ padding: '4px 8px 8px 4px', fontWeight: 600 }}>Player</th>
            {CLUE_TYPES.map(c => (
              <th key={c.key} align="center" style={{ padding: '4px 8px 8px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><ClueIcon tier={c.key.split(' ').pop().toLowerCase()} size={16} />{c.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p, ri) => (
            <tr key={p.id} style={{ borderTop: '1px solid var(--border)', background: ri % 2 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
              <td style={{ padding: '6px 8px 6px 4px', fontWeight: 700, color: colorMap[p.id], whiteSpace: 'nowrap' }}>
                {p.rsn}
                <span style={{ fontWeight: 400, fontSize: 10, color: 'var(--text-dim)', marginLeft: 6 }}>
                  ({p.total.toLocaleString()} total)
                </span>
              </td>
              {colKeys.map(k => {
                const val = p.clues[k];
                const isTop = val !== null && val > 0 && val === maxPerCol[k];
                return (
                  <td key={k} align="center" style={{
                    padding: '6px 8px',
                    background: isTop ? 'rgba(200,168,75,0.18)' : undefined,
                    fontWeight: isTop ? 700 : 400,
                    color: isTop ? 'var(--gold)' : val ? 'var(--text)' : 'var(--text-dim)',
                  }}>
                    {val != null ? val.toLocaleString() : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

// Official RuneScape images (runescape.wiki) for the Firsts: boss chatheads / NPC images and item images. An entry
// without one, or whose image fails to load, keeps its emoji.
const FIRST_WIKI_IMG = {
  ghrazi_blood_knights: 'Ghrazi venator', silverquill: 'Silverquill, the Dreadhog', ivar: 'Ivar, King of Bones',
  fire_cape: 'Fire cape', har_aken: 'Har-Aken', infernal_cape: 'TzKal-Zuk chathead',
  gwd_graardor: 'General Graardor chathead', gwd_kril: "K'ril Tsutsaroth chathead", gwd_zilyana: 'Commander Zilyana chathead',
  gwd_kreearra: "Kree'arra chathead", nex: 'Nex chathead', helwyr: 'Helwyr chathead', vindicta: 'Vindicta chathead',
  gregorovic: 'Gregorovic chathead', telos: 'Telos, the Warden', telos_100: 'Telos, the Warden', kk: 'Kalphite King (Melee)',
  dagannoth_kings: 'Dagannoth Prime', vorago: 'Vorago chathead', araxxi: 'Araxxi', solak: 'Solak chathead',
  legiones: 'Legio Primus', zammy_loe: 'Zamorak, Lord of Chaos chathead', rasial: 'Rasial, the First Necromancer', osseous_rex: 'Osseous Rex',
  quest_cape: 'Quest point cape (2012)', comp_cape: 'Completionist cape', max_cape: 'Max cape',
  ekzekkil: 'Ek-ZekKil', drygore: 'Drygore longsword', ascension_xbow: 'Ascension crossbow', seismic: 'Seismic wand',
  nox: 'Noxious longbow', tectonic: 'Tectonic robe top', sirenic: 'Sirenic hauberk', zaros_gs: 'Zaros godsword',
  eldritch_xbow: 'Eldritch crossbow', seren_godbow: 'Seren godbow', cinderbane: 'Cinderbane gloves',
};
function FirstIcon({ id, emoji, size = 22 }) {
  const [bad, setBad] = useState(false);
  const file = FIRST_WIKI_IMG[id];
  if (!file || bad) return <>{emoji}</>;
  return <img src={`https://runescape.wiki/images/${file.replace(/ /g, '_')}.png`} alt="" onError={() => setBad(true)}
    style={{ width: size, height: size, objectFit: 'contain', verticalAlign: 'middle' }} />;
}

const CLUE_IMG = { easy: 'Clue_scroll_%28easy%29.png', medium: 'Clue_scroll_%28medium%29.png', hard: 'Clue_scroll_%28hard%29.png',
  elite: 'Sealed_clue_scroll_%28elite%29.png', master: 'Clue_scroll_%28master%29.png' };
function ClueIcon({ tier, size = 20 }) {
  const [failed, setFailed] = useState(false);
  if (failed || !CLUE_IMG[tier]) return <span style={{ width: size }} />;
  return <img src={`https://runescape.wiki/images/${CLUE_IMG[tier]}`} alt={`${tier} clue`} onError={() => setFailed(true)} style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />;
}

export default function LeaderboardsTab({ players, groupId, canWrite, onToast }) {
  const [section, setSection] = useState('bosses');
  const colorMap = Object.fromEntries(players.map((p, i) => [p.id, MEMBER_COLORS[i % MEMBER_COLORS.length]]));

  const SECTIONS = [
    { id: 'firsts',     label: <IconLabel name="firsts" size={14}>Firsts</IconLabel> },
    { id: 'milestones', label: <IconLabel name="milestones" size={14}>Milestones</IconLabel> },
    { id: 'bosses',     label: <IconLabel name="bosses" size={14}>Boss Kills</IconLabel> },
    { id: 'clues',      label: <IconLabel name="clues" size={14}>Clue Scrolls</IconLabel> },
    { id: 'mastery',    label: <IconLabel name="mastery" size={14}>Skill Mastery</IconLabel> },
  ];

  if (players.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon"><RsIcon name="leaderboards" size={40} /></div>
        <p>Add and sync players to see leaderboards.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div data-tour="leaderboards-nav" className="tab-bar-scroll" style={{ display: 'flex', gap: 2, marginBottom: 20, background: 'var(--bg-panel)', borderRadius: 'var(--radius-lg)', padding: 4 }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            flex: 1, fontSize: 12, padding: '6px 8px', borderRadius: 'var(--radius)', border: 'none', cursor: 'pointer',
            background: section === s.id ? 'var(--gold)' : 'transparent',
            color: section === s.id ? '#111' : 'var(--text-dim)',
            fontWeight: section === s.id ? 700 : 400,
            transition: 'background 0.15s',
          }}>{s.label}</button>
        ))}
      </div>

      <div data-tour="leaderboards-panel" className="panel">
        <div className="panel-body">
          {section === 'firsts'     && <FirstsBoard    players={players} colorMap={colorMap} groupId={groupId} canWrite={canWrite} onToast={onToast} />}
          {section === 'milestones' && <MilestonesFeed players={players} colorMap={colorMap} />}
          {section === 'bosses'     && <BossKills      players={players} colorMap={colorMap} groupId={groupId} />}
          {section === 'clues'      && <ClueScrolls    players={players} colorMap={colorMap} />}
          {section === 'mastery'    && <SkillMastery   players={players} colorMap={colorMap} groupId={groupId} canWrite={canWrite} onToast={onToast} />}
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
        Firsts/Milestones and boss kills come from the Adventurer's Log feed (updates every ~2 hours) · Clue counts &amp; XP from RS3 hiscores (syncs within ~5 min)
      </div>
    </div>
  );
}
