import React, { useState, useMemo, useEffect } from 'react';
import { api } from '../../api/client';
import { MEMBER_COLORS, fmtXp, skillCap } from '../../lib/rs3';
import RsIcon from '../RsIcon';
import SkillIcon from '../common/SkillIcon';
import SkillTip, { useSkillTip } from './SkillTip';
import { QuestsPanel } from './QuestTables';
import { SKILL_ORDER } from './constants';

// ── Group stats (tabbed) ──────────────────────────────────────────────────────

export default function GroupStats({ players, goals, groupId }) {
  const [tab, setTab] = useState('skills');
  const colorMap = useMemo(() => Object.fromEntries(players.map((p, i) => [p.id, MEMBER_COLORS[i % MEMBER_COLORS.length]])), [players]);

  const skillLeaders = useMemo(() => {
    const map = {};
    for (const skill of SKILL_ORDER) {
      let best = null;
      for (const p of players) {
        const s = p.skills?.find(sk => sk.skill_name === skill);
        if (s && (!best || s.level > best.level)) best = { rsn: p.rsn, id: p.id, level: s.level };
      }
      if (best) map[skill] = best;
    }
    return map;
  }, [players]);

  const leadCounts = useMemo(() => {
    const counts = Object.fromEntries(players.map(p => [p.id, 0]));
    for (const leader of Object.values(skillLeaders)) {
      if (counts[leader.id] !== undefined) counts[leader.id]++;
    }
    return counts;
  }, [skillLeaders, players]);

  // Skills tab — skill filter/spotlight
  const [skillInput, setSkillInput] = useState('');
  const filteredSkill = useMemo(
    () => SKILL_ORDER.find(s => s.toLowerCase() === skillInput.toLowerCase().trim()) ?? '',
    [skillInput],
  );

  // Fetch per-skill XP gains from snapshots API
  const GAIN_PERIODS = [
    { label: 'Day',   days: 1  },
    { label: 'Week',  days: 7  },
    { label: 'Month', days: 30 },
    { label: 'Year',  days: 365 },
  ];
  const [gainPeriod, setGainPeriod] = useState(1);
  const { tip, bind } = useSkillTip();                  // the in-game style hover box for a skill
  const [metric, setMetric] = useState('level');         // 'level' | 'xp'
  const [closed, setClosed] = useState({});               // skill groups the user collapsed
  const [skillGains, setSkillGains] = useState([]);
  const [gainsLoading, setGainsLoading] = useState(false);
  useEffect(() => {
    if (!groupId) return;
    setGainsLoading(true);
    api.getGroupSnapshots(groupId, gainPeriod)
      .then(setSkillGains)
      .catch(() => {})
      .finally(() => setGainsLoading(false));
  }, [groupId, gainPeriod]);

  const TABS = [
    { id: 'skills', label: 'Skills', icon: 'https://runescape.wiki/images/Skills.png' },
    { id: 'quests', label: 'Quests', icon: 'https://runescape.wiki/images/Quest_points.png' },
  ];

  function pillStyle(active) {
    return {
      flex: 1, fontSize: 11, padding: '4px 6px', borderRadius: 'var(--radius)',
      background: active ? 'var(--gold)' : 'transparent',
      color: active ? '#111' : 'var(--text-dim)',
      border: 'none', cursor: 'pointer', fontWeight: active ? 700 : 400,
    };
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 3, marginBottom: 14, background: 'var(--bg-root)', borderRadius: 'var(--radius)', padding: 3 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ ...pillStyle(tab === t.id), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <img src={t.icon} alt="" width={13} height={13}
              style={{ imageRendering: 'crisp-edges', opacity: tab === t.id ? 0.9 : 0.65, flexShrink: 0 }}
              onError={e => { e.target.style.display = 'none'; }} />
            {t.label}
          </button>
        ))}
      </div>

      <SkillTip tip={tip} />
      {/* Skills tab — levels matrix + gains overlay */}
      {tab === 'skills' && (
        <div>
          {/* Controls: skill spotlight + period pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <input
                list="skill-spotlight-list"
                className="form-input"
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onFocus={e => e.target.select()}
                placeholder="Spotlight a skill…"
                style={{ fontSize: 12, padding: '4px 10px 4px 30px', height: 30, width: 190 }}
              />
              <span style={{ position: 'absolute', left: 9, top: 7, pointerEvents: 'none' }}><RsIcon name="search" size={14} /></span>
              <datalist id="skill-spotlight-list">
                {SKILL_ORDER.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            {filteredSkill && (
              <button type="button" className="btn btn-ghost btn-sm"
                onClick={() => setSkillInput('')}
                style={{ fontSize: 11, padding: '2px 8px' }}>Clear</button>
            )}
            <div style={{ display: 'flex', gap: 2, background: 'var(--bg-root)', borderRadius: 999, padding: 2 }}>
              {[['level', 'Levels'], ['xp', 'XP']].map(([id, label]) => (
                <button key={id} onClick={() => setMetric(id)} style={{ padding: '3px 12px', fontSize: 11, borderRadius: 999, border: 'none', cursor: 'pointer', fontWeight: metric === id ? 700 : 400, background: metric === id ? 'var(--gold)' : 'transparent', color: metric === id ? '#1a1508' : 'var(--text-dim)' }}>{label}</button>
              ))}
            </div>
            {/* Period pills — right-aligned */}
            <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', alignItems: 'center', flexWrap: 'wrap' }}>
              {GAIN_PERIODS.map(({ label, days }) => (
                <button
                  key={days}
                  onClick={() => setGainPeriod(days)}
                  style={{
                    padding: '3px 10px', fontSize: 11, fontWeight: gainPeriod === days ? 700 : 400,
                    borderRadius: 12, cursor: 'pointer',
                    background: gainPeriod === days ? 'var(--gold)' : 'transparent',
                    border: `1px solid ${gainPeriod === days ? 'var(--gold)' : 'var(--border)'}`,
                    color: gainPeriod === days ? '#1a1508' : 'var(--text-dim)',
                    transition: 'all 0.15s',
                  }}>
                  {label}
                </button>
              ))}
              {gainsLoading && <span className="spinner" style={{ width: 12, height: 12, alignSelf: 'center' }} />}
            </div>
          </div>

          {/* Leader banner when a skill is spotlit */}
          {filteredSkill && (() => {
            const ranked = players
              .map(p => ({ rsn: p.rsn, id: p.id, level: p.skills?.find(s => s.skill_name === filteredSkill)?.level ?? null }))
              .filter(p => p.level !== null)
              .sort((a, b) => b.level - a.level);
            if (!ranked.length) return null;
            const best = ranked[0];
            const is120 = best.level >= 120;
            const is99  = best.level >= 99;
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <SkillIcon name={filteredSkill} size={16} />
                  <strong style={{ color: 'var(--text-bright)' }}>{filteredSkill}</strong>
                </span>
                <span style={{ color: 'var(--text-dim)' }}>—</span>
                <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {ranked.map((p, idx) => (
                    <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {idx === 0 && <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700 }}>1st</span>}
                      {idx === 1 && <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 700 }}>2nd</span>}
                      {idx === 2 && <span style={{ fontSize: 10, color: 'var(--orange)', fontWeight: 700 }}>3rd</span>}
                      <span style={{ color: colorMap[p.id], fontWeight: idx === 0 ? 700 : 500 }}>{p.rsn}</span>
                      <span style={{
                        fontWeight: idx === 0 ? 800 : 600,
                        color: (idx === 0 && is120) ? 'var(--gold)' : (idx === 0 && is99) ? 'var(--text-bright)' : 'var(--text)',
                      }}>{p.level}</span>
                    </span>
                  ))}
                </span>
              </div>
            );
          })()}

          {/* ── Modern comparison grid: one column per member, skills grouped by type ── */}
          {(() => {
            const GROUPS = [
              ['Combat',    ['Attack', 'Strength', 'Defence', 'Constitution', 'Ranged', 'Prayer', 'Magic', 'Summoning', 'Necromancy']],
              ['Gathering', ['Woodcutting', 'Fishing', 'Mining', 'Divination', 'Hunter', 'Farming', 'Archaeology']],
              ['Artisan',   ['Cooking', 'Fletching', 'Crafting', 'Smithing', 'Herblore', 'Firemaking', 'Construction', 'Runecrafting', 'Invention']],
              ['Support',   ['Agility', 'Thieving', 'Slayer', 'Dungeoneering']],
            ];
            const cols = `minmax(120px, 150px) repeat(${players.length}, minmax(88px, 1fr))`;
            const skillOf = (p, name) => p.skills?.find(s => s.skill_name === name);
            const gainOf = p => skillGains.find(s => s.playerId === p.id);
            const totals = players.map(p => skillOf(p, 'Overall')?.level ?? null);
            const maxTotal = Math.max(...totals.filter(t => t !== null), 0);

            const Cell = ({ p, skill }) => {
              const s = skillOf(p, skill);
              const level = s?.level ?? null;
              const sg = gainOf(p);
              const lvlGain = sg?.levelGains?.[skill] ?? 0;
              const xpGain = sg?.gains?.[skill] ?? 0;
              const best = Math.max(...players.map(q => skillOf(q, skill)?.level ?? 0));
              const isLead = level != null && level === best && best > 1;
              const cap = Math.max(skillCap(skill), level ?? 0);                    // skills that go past 99 show their maximum (110 or 120)
              const pct = level ? Math.min(100, (level / cap) * 100) : 0;
              const tone = cap > 99 && level >= cap ? 'var(--gold)' : level >= 99 ? '#e8d48a' : 'var(--text-bright)';
              const bar = level >= 99 ? 'var(--gold)' : colorMap[p.id];
              return (
                <div {...bind({ skill, level, xp: s?.xp, rank: s?.rank, rsn: p.rsn, color: colorMap[p.id], gain: xpGain, period: GAIN_PERIODS.find(g => g.days === gainPeriod)?.label.toLowerCase() })}
                  style={{ margin: '3px 4px', padding: '5px 8px 6px', borderRadius: 8, background: isLead ? 'rgba(200,168,75,0.12)' : 'rgba(255,255,255,0.025)',
                    border: `1px solid ${isLead ? 'rgba(200,168,75,0.5)' : 'transparent'}` }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: level ? tone : 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
                      {metric === 'xp' ? (s?.xp != null ? fmtXp(s.xp) : '—') : (level ?? '—')}
                      {metric !== 'xp' && level != null && cap > 99 && <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-dim)' }}>/{cap}</span>}
                    </span>
                    {lvlGain > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--green-bright)' }}>+{lvlGain}</span>}
                  </div>
                  <div style={{ height: 3, borderRadius: 2, background: 'var(--bg-root)', marginTop: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: bar, opacity: 0.85 }} />
                  </div>
                </div>
              );
            };

            return (
              <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: 150 + players.length * 92 }}>
                  {/* member header: avatar, name, total level */}
                  <div style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'end', position: 'sticky', top: 0, zIndex: 3, background: 'var(--bg-panel)', padding: '4px 0 8px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '0 4px 4px' }}>Skill</div>
                    {players.map((p, i) => {
                      const total = totals[i];
                      const lead = total != null && total === maxTotal && maxTotal > 0;
                      const sg = gainOf(p);
                      const gain = Object.values(sg?.levelGains ?? {}).reduce((n, v) => n + v, 0);
                      return (
                        <div key={p.id} style={{ textAlign: 'center', padding: '0 4px' }}>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', margin: '0 auto 4px', background: colorMap[p.id], overflow: 'hidden', border: `2px solid ${lead ? 'var(--gold)' : 'transparent'}` }}>
                            <img src={`https://secure.runescape.com/m=avatar-rs/${encodeURIComponent(p.rsn)}/chat.png`} alt="" width={30} height={30} onError={e => { e.target.style.display = 'none'; }} />
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: colorMap[p.id], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.rsn}</div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: lead ? 'var(--gold)' : 'var(--text-bright)', fontVariantNumeric: 'tabular-nums' }}>
                            {total != null ? total.toLocaleString() : '—'}
                            {gain > 0 && <span style={{ color: 'var(--green-bright)', fontSize: 10, marginLeft: 4 }}>+{gain}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {GROUPS.map(([label, names]) => {
                    const shown = names.filter(n => !filteredSkill || n === filteredSkill);
                    if (shown.length === 0) return null;
                    const isClosed = !filteredSkill && closed[label];
                    return (
                      <div key={label}>
                        <button type="button" onClick={() => setClosed(c => ({ ...c, [label]: !c[label] }))} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', margin: '10px 0 2px', padding: '2px 4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 10, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                          <span style={{ width: 10 }}>{isClosed ? '▸' : '▾'}</span>{label}<span style={{ flex: 1, height: 1, background: 'var(--border)', marginLeft: 6 }} />
                        </button>
                        {!isClosed && shown.map(skill => (
                          <div key={skill} className="gs-row" style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'center', borderRadius: 8, transition: 'background 0.15s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 4px', whiteSpace: 'nowrap' }}>
                              <SkillIcon name={skill} size={20} />
                              <span style={{ fontSize: 12, color: filteredSkill === skill ? 'var(--gold)' : 'var(--text)' }}>{skill}</span>
                            </div>
                            {players.map(p => <Cell key={p.id} p={p} skill={skill} />)}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Quests tab — group-wide quest completion grid */}
      {tab === 'quests' && (
        <QuestsPanel players={players} colorMap={colorMap} />
      )}
    </div>
  );
}
