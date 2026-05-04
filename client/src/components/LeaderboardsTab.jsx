import React, { useMemo, useState } from 'react';

// ── Constants ──────────────────────────────────────────────────────────────────

const SKILL_ICON = name =>
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

// Notable boss/achievement detection from RuneMetrics activity text
const MILESTONE_DEFS = [
  // Capes
  { key: 'fire_cape',     label: 'Fire Cape',              icon: '🔥', cat: 'Boss', patterns: [/fire cape/i, /tztok.jad/i, /jad/i] },
  { key: 'infernal_cape', label: 'Infernal Cape',          icon: '🌋', cat: 'Boss', patterns: [/infernal cape/i, /tzkal.zuk/i, /\bzuk\b/i, /inferno/i] },
  { key: 'max_cape',      label: 'Max Cape',               icon: '🎓', cat: 'Skill', patterns: [/max cape/i, /achieved.*max.*overall/i] },
  { key: 'comp_cape',     label: 'Completionist Cape',     icon: '🏅', cat: 'Skill', patterns: [/completionist cape/i] },
  // Bosses
  { key: 'kq',            label: 'Kalphite Queen',         icon: '🦂', cat: 'Boss', patterns: [/kalphite queen/i] },
  { key: 'kk',            label: 'Kalphite King',          icon: '🦂', cat: 'Boss', patterns: [/kalphite king/i] },
  { key: 'gwd',           label: 'God Wars Dungeon boss',  icon: '⚔️', cat: 'Boss', patterns: [/commander zilyana/i, /kree'arra/i, /general graardor/i, /k'ril tsutsaroth/i] },
  { key: 'nex',           label: 'Nex',                    icon: '❄️', cat: 'Boss', patterns: [/\bnex\b/i] },
  { key: 'aod',           label: 'Nex: Angel of Death',    icon: '⚗️', cat: 'Boss', patterns: [/angel of death/i] },
  { key: 'vorago',        label: 'Vorago',                 icon: '🪨', cat: 'Boss', patterns: [/\bvorago\b/i] },
  { key: 'rago',          label: 'Raids (Liberation)',     icon: '🏛️', cat: 'Boss', patterns: [/liberation of mazcab/i, /mazcab/i] },
  { key: 'telos',         label: 'Telos',                  icon: '🌿', cat: 'Boss', patterns: [/\btelos\b/i] },
  { key: 'solak',         label: 'Solak',                  icon: '🌳', cat: 'Boss', patterns: [/\bsolak\b/i] },
  { key: 'zammy',         label: 'Zamorak (LoE)',          icon: '🔺', cat: 'Boss', patterns: [/lord of erebus/i, /zamorak.*lord/i] },
  { key: 'ed1',           label: 'Elite Dungeon 1 (Temple of Aminishi)', icon: '🐉', cat: 'Boss', patterns: [/seiryu/i, /temple of aminishi/i] },
  { key: 'ed2',           label: 'Elite Dungeon 2 (Dragonkin Lab)',      icon: '🧪', cat: 'Boss', patterns: [/dragonkin laboratory/i, /black stone dragon/i] },
  { key: 'ed3',           label: 'Elite Dungeon 3 (Shadow Reef)',        icon: '🦑', cat: 'Boss', patterns: [/shadow reef/i, /ambassador/i] },
  { key: 'croesus',       label: 'Croesus',                icon: '🍄', cat: 'Boss', patterns: [/\bcroesus\b/i] },
  { key: 'rasial',        label: 'Rasial',                 icon: '☠️', cat: 'Boss', patterns: [/\brasial\b/i] },
  // Notable quests
  { key: 'rfq',           label: 'Recipe for Disaster',        icon: '🍽️', cat: 'Quest', patterns: [/recipe for disaster/i] },
  { key: 'wgs',           label: 'While Guthix Sleeps',        icon: '💤', cat: 'Quest', patterns: [/while guthix sleeps/i] },
  { key: 'elder_kiln',    label: 'The Elder Kiln',             icon: '🔥', cat: 'Quest', patterns: [/elder kiln/i] },
  { key: 'world_wakes',   label: 'The World Wakes',            icon: '🌅', cat: 'Quest', patterns: [/world wakes/i] },
  { key: 'rotm',          label: 'Ritual of the Mahjarrat',    icon: '🗿', cat: 'Quest', patterns: [/ritual of the mahjarrat/i] },
  { key: 'fotg',          label: 'Fate of the Gods',           icon: '⚡', cat: 'Quest', patterns: [/fate of the gods/i] },
  { key: 'com',           label: 'Children of Mah',            icon: '🌙', cat: 'Quest', patterns: [/children of mah/i] },
  { key: 'sliske',        label: "Sliske's Endgame",           icon: '🎭', cat: 'Quest', patterns: [/sliske.*endgame/i] },
  { key: 'plagues_end',   label: "Plague's End",               icon: '🏙️', cat: 'Quest', patterns: [/plague.*end/i] },
  { key: 'azzanadra',     label: "Azzanadra's Quest",          icon: '🏺', cat: 'Quest', patterns: [/azzanadra.*quest/i] },
  { key: 'coss',          label: 'City of Senntisten',         icon: '🏛️', cat: 'Quest', patterns: [/city of senntisten/i] },
  { key: 'extinction',    label: 'Extinction',                 icon: '💀', cat: 'Quest', patterns: [/\bextinction\b/i] },
  { key: 'desp',          label: 'Desperate Measures',         icon: '⚗️', cat: 'Quest', patterns: [/desperate measures/i] },
];

const ALL_SKILLS = [
  'Attack','Strength','Defence','Constitution','Ranged','Prayer','Magic','Summoning','Necromancy',
  'Cooking','Woodcutting','Fletching','Fishing','Firemaking','Crafting','Smithing','Mining',
  'Herblore','Agility','Thieving','Slayer','Farming','Runecrafting','Hunter','Construction',
  'Dungeoneering','Divination','Invention','Archaeology',
];

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
  if (!str) return '—';
  const t = parseRMDate(str);
  if (!t) return str;
  return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' });
}

// ── Section: Clue Scrolls ─────────────────────────────────────────────────────

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

  if (noData) return (
    <div style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
      No clue scroll data yet — sync players to load hiscores.
    </div>
  );

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

// ── Section: 99s / 120s board ─────────────────────────────────────────────────

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

      {rows.map((p, ri) => {
        const list = view === '120s' ? p.list120 : [...p.list120, ...p.list99];
        return (
          <div key={p.id} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: colorMap[p.id] }}>{p.rsn}</span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                {view === '120s'
                  ? `${p.count120} × 120`
                  : `${p.count120} × 120  ·  ${p.count99} × 99`}
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
                        <img src={SKILL_ICON(skill)} alt={skill} style={{ width: 14, height: 14, verticalAlign: 'middle' }} />
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

// ── Section: Milestones feed ──────────────────────────────────────────────────

function MilestonesFeed({ players, colorMap }) {
  const [filter, setFilter] = useState('All');

  const milestones = useMemo(() => {
    const found = [];

    for (const p of players) {
      const acts = parseActivities(p.activities_json);

      for (const act of acts) {
        const text  = (act.text    || '') + ' ' + (act.details || '');
        const combined = text.trim();

        // 99 / 120 skill achievement
        const maxMatch = combined.match(/I achieved the maximum level in (\w[\w\s]+?)!?\.?$/i)
          ?? combined.match(/I (?:levelled|reached) (?:my )?(\w[\w\s]+?) to (99|100|101|102|103|104|105|106|107|108|109|110|111|112|113|114|115|116|117|118|119|120)\b/i);
        if (maxMatch) {
          const skillName = maxMatch[1].trim();
          const lvl = maxMatch[2] ? parseInt(maxMatch[2]) : 99;
          if (ALL_SKILLS.includes(skillName) || skillName === 'Overall') {
            found.push({
              id: `${p.id}_skill_${skillName}_${act.date}`,
              cat: 'Skill',
              icon: <img src={SKILL_ICON(skillName)} alt={skillName} style={{ width: 18, height: 18, verticalAlign: 'middle' }} />,
              label: `${lvl >= 120 ? '★ 120' : '★ 99'} ${skillName}`,
              rsn: p.rsn,
              playerId: p.id,
              date: act.date,
              ts: parseRMDate(act.date),
              raw: combined,
            });
            continue;
          }
        }

        // Quest completion
        const questMatch = combined.match(/I completed the quest[: ]+(.+?)\.?\s*$/i);
        if (questMatch) {
          const questName = questMatch[1].trim();
          found.push({
            id: `${p.id}_quest_${questName}_${act.date}`,
            cat: 'Quest',
            icon: '📜',
            label: questName,
            rsn: p.rsn,
            playerId: p.id,
            date: act.date,
            ts: parseRMDate(act.date),
            raw: combined,
          });
          continue;
        }

        // Boss / notable milestones
        for (const def of MILESTONE_DEFS) {
          if (def.patterns.some(rx => rx.test(combined))) {
            found.push({
              id: `${p.id}_${def.key}_${act.date}`,
              cat: def.cat,
              icon: def.icon,
              label: def.label,
              rsn: p.rsn,
              playerId: p.id,
              date: act.date,
              ts: parseRMDate(act.date),
              raw: combined,
            });
            break;
          }
        }
      }
    }

    // Deduplicate by id, sort newest first
    const seen = new Set();
    return found
      .filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; })
      .sort((a, b) => b.ts - a.ts);
  }, [players]);

  const cats = ['All', ...['Boss', 'Quest', 'Skill'].filter(c => milestones.some(m => m.cat === c))];
  const visible = filter === 'All' ? milestones : milestones.filter(m => m.cat === filter);

  if (milestones.length === 0) {
    return (
      <div style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
        No milestones detected yet. Sync players — milestones are picked up from the RuneMetrics activity feed.
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
        {visible.map(m => (
          <div key={m.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '7px 12px', background: 'var(--bg-panel-alt)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          }}>
            <span style={{ fontSize: 18, flexShrink: 0, width: 22, textAlign: 'center', lineHeight: 1 }}>
              {m.icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 700, color: colorMap[m.playerId], marginRight: 6, fontSize: 12 }}>{m.rsn}</span>
              <span style={{ fontSize: 12, color: 'var(--text-bright)' }}>{m.label}</span>
            </div>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 8,
              background: m.cat === 'Quest' ? 'rgba(74,136,184,0.15)' : m.cat === 'Boss' ? 'rgba(192,64,64,0.15)' : 'rgba(200,168,75,0.12)',
              border: `1px solid ${m.cat === 'Quest' ? 'var(--blue)' : m.cat === 'Boss' ? 'var(--red)' : 'var(--gold-dark)'}`,
              color: m.cat === 'Quest' ? 'var(--blue)' : m.cat === 'Boss' ? 'var(--red-bright)' : 'var(--gold)',
              textTransform: 'uppercase', letterSpacing: '0.4px', flexShrink: 0,
            }}>{m.cat}</span>
            {m.date && (
              <span style={{ fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {fmtDate(m.date)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section: "Firsts" board ───────────────────────────────────────────────────

function FirstsBoard({ players, colorMap }) {
  const firsts = useMemo(() => {
    // Build event list: { key, label, rsn, playerId, ts, date }
    const events = [];

    for (const p of players) {
      const acts = parseActivities(p.activities_json);
      for (const act of acts) {
        const text = (act.text || '') + ' ' + (act.details || '');
        const ts = parseRMDate(act.date);

        // First 99 per skill
        const maxMatch = text.match(/I achieved the maximum level in (\w[\w\s]+?)!?\.?$/i);
        if (maxMatch) {
          const skillName = maxMatch[1].trim();
          if (ALL_SKILLS.includes(skillName)) {
            events.push({ key: `first99_${skillName}`, label: `First 99 ${skillName}`, rsn: p.rsn, playerId: p.id, ts, date: act.date, icon: <img src={SKILL_ICON(skillName)} alt={skillName} style={{ width: 16, height: 16, verticalAlign: 'middle' }} /> });
          }
        }

        // Quest firsts
        const questMatch = text.match(/I completed the quest[: ]+(.+?)\.?\s*$/i);
        if (questMatch) {
          events.push({ key: `quest_${questMatch[1].trim()}`, label: `Quest: ${questMatch[1].trim()}`, rsn: p.rsn, playerId: p.id, ts, date: act.date, icon: '📜' });
        }

        // Milestone firsts
        for (const def of MILESTONE_DEFS) {
          if (def.patterns.some(rx => rx.test(text))) {
            events.push({ key: `boss_${def.key}`, label: def.label, rsn: p.rsn, playerId: p.id, ts, date: act.date, icon: def.icon });
            break;
          }
        }
      }
    }

    // For each key, keep only the earliest occurrence (lowest ts > 0)
    const bestByKey = {};
    for (const e of events) {
      if (!e.ts) continue;
      if (!bestByKey[e.key] || e.ts < bestByKey[e.key].ts) bestByKey[e.key] = e;
    }

    return Object.values(bestByKey).sort((a, b) => b.ts - a.ts);
  }, [players]);

  if (firsts.length === 0) {
    return (
      <div style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
        No "firsts" detected yet — they're discovered from the RuneMetrics activity feed when you sync.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
      {firsts.map(f => (
        <div key={f.key} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', background: 'var(--bg-panel-alt)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        }}>
          <span style={{ fontSize: 16, flexShrink: 0, width: 20, textAlign: 'center' }}>{f.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--text-bright)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.label}</div>
            <div style={{ fontSize: 10, color: colorMap[f.playerId], fontWeight: 700 }}>
              🥇 {f.rsn} · {fmtDate(f.date)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function LeaderboardsTab({ players }) {
  const [section, setSection] = useState('firsts');
  const colorMap = Object.fromEntries(players.map((p, i) => [p.id, MEMBER_COLORS[i % MEMBER_COLORS.length]]));

  const SECTIONS = [
    { id: 'firsts',    label: '🥇 Firsts' },
    { id: 'milestones', label: '🏆 Milestones' },
    { id: 'mastery',   label: '⭐ Skill Mastery' },
    { id: 'clues',     label: '📜 Clue Scrolls' },
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
      {/* Sub-nav */}
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
          {section === 'firsts'     && <FirstsBoard   players={players} colorMap={colorMap} />}
          {section === 'milestones' && <MilestonesFeed players={players} colorMap={colorMap} />}
          {section === 'mastery'    && <SkillMastery   players={players} colorMap={colorMap} />}
          {section === 'clues'      && <ClueScrolls    players={players} colorMap={colorMap} />}
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
        Milestones and firsts are detected automatically from RuneMetrics activity feeds during sync.
        Clue scroll counts come from the RS3 hiscores.
      </div>
    </div>
  );
}
