import React, { useMemo, useState } from 'react';

// ── Constants ──────────────────────────────────────────────────────────────────

const SKILL_ICON_URL = name =>
  `https://runescape.wiki/images/${encodeURIComponent(name)}.png`;

const MEMBER_COLORS = ['#c8a84b', '#7eb8f7', '#7ef7a8', '#f77e7e', '#d07ef7', '#f7c97e'];

const CLUE_TYPES = [
  { key: 'Clue Scrolls All',    label: 'All',    icon: '📜' },
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

// ── Predefined milestone definitions ──────────────────────────────────────────
// actMatch  : fn(combinedText) – match RuneMetrics activity text
// dropMatch : fn(combinedText) – match drop-style activity ("I found/received a X")
// skillCheck: fn(player)       – fallback: check current skill data

const PREDEFINED_FIRSTS = [
  // ── PvM ───────────────────────────────────────────────────────────────────
  {
    key: 'fire_cape', label: 'Fire Cape', sub: 'TzTok-Jad', cat: 'PvM', icon: '🔥',
    actMatch: t => /fire cape/i.test(t) || /tztok.jad/i.test(t) || /\bjad\b.*defeat/i.test(t),
    dropMatch: t => /fire cape/i.test(t),
  },
  {
    key: 'infernal_cape', label: 'Infernal Cape', sub: 'TzKal-Zuk · Inferno', cat: 'PvM', icon: '🌋',
    actMatch: t => /infernal cape/i.test(t) || /tzkal.zuk/i.test(t) || /\bzuk\b/i.test(t),
    dropMatch: t => /infernal cape/i.test(t),
  },
  {
    key: 'araxxi', label: 'Araxxi Kill', sub: "Araxxor's Lair", cat: 'PvM', icon: '🕷️',
    actMatch: t => /\baraxxi\b/i.test(t),
  },
  {
    key: 'telos', label: 'First Telos Kill', sub: 'Heart of Gielinor', cat: 'PvM', icon: '🌿',
    actMatch: t => /\btelos\b/i.test(t),
  },
  {
    key: 'telos_100', label: 'Telos 100%+ Enrage', sub: 'Heart of Gielinor', cat: 'PvM', icon: '💥',
    actMatch: t => /\btelos\b/i.test(t) && /100[%+]/i.test(t),
  },
  {
    key: 'vorago', label: 'Vorago Kill', sub: 'Burthorpe', cat: 'PvM', icon: '🪨',
    actMatch: t => /\bvorago\b/i.test(t),
  },
  {
    key: 'nex', label: 'Nex Kill', sub: 'God Wars Dungeon', cat: 'PvM', icon: '❄️',
    actMatch: t => /\bnex\b/i.test(t) && !/nexus/i.test(t) && !/next/i.test(t),
  },
  {
    key: 'kk', label: 'Kalphite King Kill', sub: 'Exiled Kalphite Hive', cat: 'PvM', icon: '🦂',
    actMatch: t => /kalphite king/i.test(t),
  },
  {
    key: 'aod', label: 'Nex: Angel of Death', sub: 'Heart of Gielinor', cat: 'PvM', icon: '⚗️',
    actMatch: t => /angel of death/i.test(t),
  },
  {
    key: 'solak', label: 'Solak Kill', sub: 'Lost Grove', cat: 'PvM', icon: '🌳',
    actMatch: t => /\bsolak\b/i.test(t),
  },
  {
    key: 'zammy_loe', label: 'Zamorak (Lord of Erebus)', sub: 'Zamorak boss fight', cat: 'PvM', icon: '🔺',
    actMatch: t => /lord of erebus/i.test(t) || /zamorak.*boss/i.test(t),
  },
  {
    key: 'rasial', label: 'Rasial Kill', sub: 'City of Um', cat: 'PvM', icon: '☠️',
    actMatch: t => /\brasial\b/i.test(t),
  },
  {
    key: 'ed1', label: 'Temple of Aminishi (ED1)', sub: 'Elite Dungeon 1', cat: 'PvM', icon: '🐉',
    actMatch: t => /temple of aminishi/i.test(t) || /\bseiryu\b/i.test(t),
  },
  {
    key: 'ed3', label: 'Shadow Reef (ED3)', sub: 'Elite Dungeon 3', cat: 'PvM', icon: '🦑',
    actMatch: t => /shadow reef/i.test(t) || /\bambassador\b/i.test(t),
  },

  // ── Notable Drops / Items ─────────────────────────────────────────────────
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
    key: 'zaros_gs', label: 'Zaros Godsword', sub: 'T92 melee — Nex: AoD', cat: 'Item', icon: '🗡️',
    dropMatch: t => /zaros godsword/i.test(t),
  },
  {
    key: 'eldritch_xbow', label: 'Eldritch Crossbow', sub: 'T92 ranged — Seiryu', cat: 'Item', icon: '🏹',
    dropMatch: t => /eldritch crossbow/i.test(t),
  },
  {
    key: 'seren_godbow', label: 'Seren Godbow', sub: 'T92 ranged — Solak', cat: 'Item', icon: '🌿',
    dropMatch: t => /seren godbow/i.test(t),
  },
  {
    key: 'tectonic', label: 'First Tectonic Armour', sub: 'T90 magic — Vorago', cat: 'Item', icon: '🌀',
    dropMatch: t => /tectonic/i.test(t),
  },
  {
    key: 'sirenic', label: 'First Sirenic Armour', sub: 'T90 ranged — Legiones', cat: 'Item', icon: '🐚',
    dropMatch: t => /sirenic/i.test(t),
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

  // ── Skills ────────────────────────────────────────────────────────────────
  {
    key: 'max_cape', label: 'Max Cape', sub: 'All skills 99+', cat: 'Skill', icon: '🎓',
    actMatch: t => /max cape/i.test(t),
    skillCheck: p => (p.skills?.filter(s => s.skill_name !== 'Overall' && s.level >= 99).length ?? 0) >= 29,
  },
  {
    key: 'first99_slayer', label: 'First 99 Slayer', sub: '', cat: 'Skill', skillIcon: 'Slayer',
    actMatch: t => /maximum level in slayer/i.test(t) || /level 99.*slayer/i.test(t),
    skillCheck: p => (p.skills?.find(s => s.skill_name === 'Slayer')?.level ?? 0) >= 99,
  },
  {
    key: 'first99_herblore', label: 'First 99 Herblore', sub: '', cat: 'Skill', skillIcon: 'Herblore',
    actMatch: t => /maximum level in herblore/i.test(t),
    skillCheck: p => (p.skills?.find(s => s.skill_name === 'Herblore')?.level ?? 0) >= 99,
  },
  {
    key: 'first99_invention', label: 'First 99 Invention', sub: '', cat: 'Skill', skillIcon: 'Invention',
    actMatch: t => /maximum level in invention/i.test(t),
    skillCheck: p => (p.skills?.find(s => s.skill_name === 'Invention')?.level ?? 0) >= 99,
  },
  {
    key: 'first99_summoning', label: 'First 99 Summoning', sub: '', cat: 'Skill', skillIcon: 'Summoning',
    actMatch: t => /maximum level in summoning/i.test(t),
    skillCheck: p => (p.skills?.find(s => s.skill_name === 'Summoning')?.level ?? 0) >= 99,
  },
  {
    key: 'first99_dungeoneering', label: 'First 99 Dungeoneering', sub: '', cat: 'Skill', skillIcon: 'Dungeoneering',
    actMatch: t => /maximum level in dungeoneering/i.test(t),
    skillCheck: p => (p.skills?.find(s => s.skill_name === 'Dungeoneering')?.level ?? 0) >= 99,
  },
  {
    key: 'first120_slayer', label: 'First 120 Slayer', sub: 'Requires 104M XP', cat: 'Skill', skillIcon: 'Slayer',
    actMatch: t => /maximum level in slayer/i.test(t) && /120/i.test(t),
    skillCheck: p => (p.skills?.find(s => s.skill_name === 'Slayer')?.level ?? 0) >= 120,
  },
  {
    key: 'first120_dung', label: 'First 120 Dungeoneering', sub: '', cat: 'Skill', skillIcon: 'Dungeoneering',
    actMatch: t => /maximum level in dungeoneering/i.test(t) && /120/i.test(t),
    skillCheck: p => (p.skills?.find(s => s.skill_name === 'Dungeoneering')?.level ?? 0) >= 120,
  },
  {
    key: 'first120_nec', label: 'First 120 Necromancy', sub: '', cat: 'Skill', skillIcon: 'Necromancy',
    actMatch: t => /maximum level in necromancy/i.test(t),
    skillCheck: p => (p.skills?.find(s => s.skill_name === 'Necromancy')?.level ?? 0) >= 120,
  },
  {
    key: 'first120_invention', label: 'First 120 Invention', sub: '', cat: 'Skill', skillIcon: 'Invention',
    actMatch: t => /maximum level in invention/i.test(t) && /120/i.test(t),
    skillCheck: p => (p.skills?.find(s => s.skill_name === 'Invention')?.level ?? 0) >= 120,
  },
];

const CAT_STYLE = {
  PvM:   { badge: 'PvM',   bg: 'rgba(192,64,64,0.15)',    border: 'var(--red)',      color: 'var(--red-bright)' },
  Quest: { badge: 'Quest', bg: 'rgba(74,136,184,0.15)',   border: 'var(--blue)',     color: '#7eb8f7' },
  Skill: { badge: 'Skill', bg: 'rgba(200,168,75,0.12)',   border: 'var(--gold-dark)',color: 'var(--gold)' },
  Item:  { badge: 'Item',  bg: 'rgba(90,154,80,0.12)',    border: 'var(--green)',    color: 'var(--green-bright)' },
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

function parseRMDate(str) {
  if (!str) return 0;
  try { return new Date(str.replace(/(\d+)-(\w+)-(\d+)/, '$2 $1 $3')).getTime(); } catch { return 0; }
}

function fmtDate(str) {
  if (!str) return null;
  const t = parseRMDate(str);
  if (!t) return null;
  return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' });
}

// ── Firsts board ──────────────────────────────────────────────────────────────

function FirstsBoard({ players, colorMap }) {
  const [catFilter, setCatFilter] = useState('All');
  const [showAll, setShowAll] = useState(false);

  const results = useMemo(() => {
    return PREDEFINED_FIRSTS.map(def => {
      // Scan each player's activity feed for this milestone
      const candidates = [];

      for (const p of players) {
        const acts = parseActivities(p.activities_json);
        for (const act of acts) {
          const combined = ((act.text || '') + ' ' + (act.details || '')).trim();
          const ts = parseRMDate(act.date);

          let matched = false;
          if (def.actMatch && def.actMatch(combined)) matched = true;
          if (!matched && def.dropMatch) {
            const isDropText = /I (?:found|received) (?:a |an )/i.test(combined);
            if (isDropText && def.dropMatch(combined)) matched = true;
          }

          if (matched && ts > 0) {
            candidates.push({ rsn: p.rsn, playerId: p.id, ts, date: act.date });
            break; // earliest match per player is enough for now
          }
        }
      }

      if (candidates.length > 0) {
        // Pick the player with the smallest (earliest) timestamp
        candidates.sort((a, b) => a.ts - b.ts);
        const winner = candidates[0];
        return { ...def, status: 'achieved', winner, allCandidates: candidates };
      }

      // Fallback: check current skill data (no date available)
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
  }, [players]);

  const cats = ['All', 'PvM', 'Quest', 'Skill', 'Item'];
  const visible = results.filter(r => catFilter === 'All' || r.cat === catFilter);
  const achieved = visible.filter(r => r.status !== 'pending');
  const pending  = visible.filter(r => r.status === 'pending');

  const MILESTONE_DEFS = [
    // activity-based milestone patterns for the old milestone feed
  ];

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
            🏆 Achieved ({achieved.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 6 }}>
            {achieved.map(r => <MilestoneCard key={r.key} result={r} colorMap={colorMap} />)}
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
            {(showAll ? pending : pending.slice(0, 6)).map(r => <MilestoneCard key={r.key} result={r} colorMap={colorMap} />)}
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
        Firsts are detected from RuneMetrics activity feeds (last ~100 entries per player). Skill milestones without a date come from current hiscores data.
      </div>
    </div>
  );
}

function MilestoneCard({ result, colorMap }) {
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
        position: 'absolute', top: 8, right: 8,
        fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 6,
        background: isAchieved ? cs.bg : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isAchieved ? cs.border : 'var(--border)'}`,
        color: isAchieved ? cs.color : 'var(--text-dim)',
        textTransform: 'uppercase', letterSpacing: '0.4px',
      }}>{cs.badge}</span>

      {/* Icon + title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, paddingRight: 40 }}>
        <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>
          {result.skillIcon
            ? <img src={SKILL_ICON_URL(result.skillIcon)} alt={result.skillIcon} style={{ width: 22, height: 22, verticalAlign: 'middle' }} />
            : result.icon}
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
        {result.status === 'achieved' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14 }}>🥇</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: colorMap[result.winner.playerId] }}>{result.winner.rsn}</span>
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
        const text = ((act.text || '') + ' ' + (act.details || '')).trim();

        // 99 / 120 skill achievement
        const maxMatch = text.match(/I achieved the maximum level in ([\w\s]+?)!?\.?$/i)
          ?? text.match(/I (?:levelled|reached) (?:my )?([\w\s]+?) to (99|1[01]\d|120)\b/i);
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

        // Quest completion
        const questMatch = text.match(/I completed the quest[: ]+(.+?)\.?\s*$/i);
        if (questMatch) {
          found.push({
            id: `${p.id}_quest_${questMatch[1]}_${act.date}`,
            cat: 'Quest', icon: '📜', label: questMatch[1].trim(),
            rsn: p.rsn, playerId: p.id, date: act.date, ts: parseRMDate(act.date),
          });
          continue;
        }

        // Boss / notable activity
        for (const def of ACTIVITY_MILESTONE_DEFS) {
          if (def.patterns.some(rx => rx.test(text))) {
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
        No milestones detected yet. Sync players — milestones are picked up automatically from RuneMetrics activity feeds.
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
              <span style={{ fontSize: 18, flexShrink: 0, width: 22, textAlign: 'center', lineHeight: 1 }}>{m.icon}</span>
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

function SkillMastery({ players, colorMap }) {
  const [view, setView] = useState('99s');

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
                    return (
                      <span key={skill} title={`${skill} ${sk?.level}`} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 7px', borderRadius: 10, fontSize: 11,
                        background: is120 ? 'rgba(200,168,75,0.15)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${is120 ? 'var(--gold-dark)' : 'var(--border)'}`,
                        color: is120 ? 'var(--gold)' : 'var(--text)',
                      }}>
                        <img src={SKILL_ICON_URL(skill)} alt={skill} style={{ width: 14, height: 14, verticalAlign: 'middle' }} />
                        {is120 ? '★ ' : ''}{skill}
                      </span>
                    );
                  })}
                </div>
              )}
          </div>
        );
      })}
    </div>
  );
}

// ── Clue Scrolls ──────────────────────────────────────────────────────────────

function ClueScrolls({ players, colorMap }) {
  const rows = useMemo(() => players.map(p => {
    const stats = parseStats(p.stats_json);
    const acts = stats?.activities ?? {};
    return {
      ...p,
      clues: {
        all:    acts['Clue Scrolls All']    ?? null,
        easy:   acts['Clue Scrolls Easy']   ?? null,
        medium: acts['Clue Scrolls Medium'] ?? null,
        hard:   acts['Clue Scrolls Hard']   ?? null,
        elite:  acts['Clue Scrolls Elite']  ?? null,
        master: acts['Clue Scrolls Master'] ?? null,
      },
    };
  }).sort((a, b) => (b.clues.all ?? -1) - (a.clues.all ?? -1)), [players]);

  const colKeys = ['all', 'easy', 'medium', 'hard', 'elite', 'master'];
  const maxPerCol = Object.fromEntries(colKeys.map(k => [k, Math.max(...rows.map(r => r.clues[k] ?? 0), 0)]));
  const noData = rows.every(r => r.clues.all === null);

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
                {c.icon} {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p, ri) => (
            <tr key={p.id} style={{ borderTop: '1px solid var(--border)', background: ri % 2 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
              <td style={{ padding: '6px 8px 6px 4px', fontWeight: 700, color: colorMap[p.id], whiteSpace: 'nowrap' }}>{p.rsn}</td>
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

export default function LeaderboardsTab({ players }) {
  const [section, setSection] = useState('firsts');
  const colorMap = Object.fromEntries(players.map((p, i) => [p.id, MEMBER_COLORS[i % MEMBER_COLORS.length]]));

  const SECTIONS = [
    { id: 'firsts',     label: '🥇 Firsts' },
    { id: 'milestones', label: '🏆 Milestones' },
    { id: 'mastery',    label: '⭐ Skill Mastery' },
    { id: 'clues',      label: '📜 Clue Scrolls' },
  ];

  if (players.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">🏆</div>
        <p>Add and sync players to see leaderboards.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: 'var(--bg-panel)', borderRadius: 'var(--radius-lg)', padding: 4 }}>
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

      <div className="panel">
        <div className="panel-body">
          {section === 'firsts'     && <FirstsBoard    players={players} colorMap={colorMap} />}
          {section === 'milestones' && <MilestonesFeed players={players} colorMap={colorMap} />}
          {section === 'mastery'    && <SkillMastery   players={players} colorMap={colorMap} />}
          {section === 'clues'      && <ClueScrolls    players={players} colorMap={colorMap} />}
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
        Firsts and milestones are auto-detected from RuneMetrics activity feeds during sync · Clue scroll counts from RS3 hiscores
      </div>
    </div>
  );
}
