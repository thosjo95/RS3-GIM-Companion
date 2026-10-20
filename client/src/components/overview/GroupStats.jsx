import React, { useState, useMemo, useEffect } from 'react';
import { api } from '../../api/client';
import { MEMBER_COLORS } from '../../lib/rs3';
import SkillIcon from '../common/SkillIcon';
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
                placeholder="🔍 Spotlight a skill…"
                style={{ fontSize: 12, padding: '4px 10px', height: 30, width: 190 }}
              />
              <datalist id="skill-spotlight-list">
                {SKILL_ORDER.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            {filteredSkill && (
              <button type="button" className="btn btn-ghost btn-sm"
                onClick={() => setSkillInput('')}
                style={{ fontSize: 11, padding: '2px 8px' }}>✕ Clear</button>
            )}
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
                      {idx === 0 && <span style={{ fontSize: 10 }}>🥇</span>}
                      {idx === 1 && <span style={{ fontSize: 10 }}>🥈</span>}
                      {idx === 2 && <span style={{ fontSize: 10 }}>🥉</span>}
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

          <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
            <thead>
              <tr>
                <th align="left" style={{
                  padding: '4px 8px 8px 4px', fontWeight: 600, color: 'var(--text-dim)',
                  fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4px',
                  position: 'sticky', left: 0, background: 'var(--bg-panel)', zIndex: 2,
                  whiteSpace: 'nowrap', minWidth: 110,
                }}>Skill</th>
                {players.map(p => (
                  <th key={p.id} align="center" style={{
                    padding: '4px 8px 8px', fontWeight: 700, color: colorMap[p.id],
                    fontSize: 11, whiteSpace: 'nowrap',
                  }}>{p.rsn}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Total Level row */}
              {(() => {
                const totals   = players.map(p => p.skills?.find(s => s.skill_name === 'Overall')?.level ?? null);
                const maxTotal = Math.max(...totals.filter(t => t !== null), 0);
                const stickyBg = 'color-mix(in srgb, var(--bg-panel) 88%, #c8a84b 12%)';
                return (
                  <tr style={{
                    borderTop: '1px solid var(--border)',
                    background: 'rgba(200,168,75,0.07)',
                    opacity: filteredSkill ? 0.25 : 1,
                    transition: 'opacity 0.2s',
                  }}>
                    <td style={{ padding: '6px 8px 6px 4px', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: stickyBg, zIndex: 1 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <img src="https://runescape.wiki/images/Statistics.png" alt="Total Level" width={18} height={18} style={{ imageRendering: 'crisp-edges', verticalAlign: 'middle' }} />
                        <span style={{ color: 'var(--gold)', fontSize: 11, fontWeight: 700, letterSpacing: '0.2px' }}>Total Level</span>
                      </span>
                    </td>
                    {players.map((p, i) => {
                      const total = totals[i];
                      const isSharedMax = total !== null && total === maxTotal && maxTotal > 0;
                      const sg = skillGains.find(s => s.playerId === p.id);
                      const totalLvlGain = Object.values(sg?.levelGains ?? {}).reduce((sum, v) => sum + v, 0);
                      return (
                        <td key={p.id} align="center" style={{
                          padding: '6px 6px',
                          background: isSharedMax ? 'rgba(200,168,75,0.22)' : undefined,
                          color: 'var(--gold)',
                          fontWeight: isSharedMax ? 800 : 600,
                          fontSize: 13,
                          whiteSpace: 'nowrap',
                        }}>
                          {total ?? '—'}
                          {totalLvlGain > 0 && (
                            <span style={{ color: 'var(--green-bright)', fontWeight: 700, fontSize: 10, marginLeft: 3 }}>+{totalLvlGain}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })()}
              {SKILL_ORDER.map((skill, rowIdx) => {
                const isSpotlit = filteredSkill === skill;
                const isFaded   = !!filteredSkill && !isSpotlit;
                const levels    = players.map(p => p.skills?.find(s => s.skill_name === skill)?.level ?? null);
                const maxLevel  = Math.max(...levels.filter(l => l !== null), 0);
                const altBg     = rowIdx % 2 ? 'rgba(255,255,255,0.018)' : 'transparent';
                const stickyBg  = rowIdx % 2 ? 'color-mix(in srgb, var(--bg-panel) 92%, white 8%)' : 'var(--bg-panel)';
                const rowBg     = isSpotlit ? 'rgba(200,168,75,0.1)' : altBg;
                const rowStickyBg = isSpotlit ? 'color-mix(in srgb, var(--bg-panel) 85%, #c8a84b 15%)' : stickyBg;
                // Highest level gain in this row → winner highlight
                const maxLvlGain = Math.max(...players.map(p => {
                  const sg = skillGains.find(s => s.playerId === p.id);
                  return sg?.levelGains?.[skill] ?? 0;
                }));
                return (
                  <tr key={skill} style={{
                    borderTop: isSpotlit ? '1px solid rgba(200,168,75,0.4)' : '1px solid var(--border)',
                    background: rowBg,
                    opacity: isFaded ? 0.22 : 1,
                    transition: 'opacity 0.2s, background 0.2s',
                    outline: isSpotlit ? '1px solid rgba(200,168,75,0.3)' : undefined,
                  }}>
                    <td style={{
                      padding: '5px 8px 5px 4px', whiteSpace: 'nowrap',
                      position: 'sticky', left: 0, background: rowStickyBg, zIndex: 1,
                    }}>
                      <span style={{ marginRight: 5 }}><SkillIcon name={skill} size={18} /></span>
                      <span style={{ color: isSpotlit ? 'var(--gold)' : 'var(--text-dim)', fontSize: 11, fontWeight: isSpotlit ? 700 : 400 }}>{skill}</span>
                    </td>
                    {players.map((p, i) => {
                      const level = levels[i];
                      const sg = skillGains.find(s => s.playerId === p.id);
                      const lvlGain = sg?.levelGains?.[skill] ?? 0;
                      const xpGain  = sg?.gains?.[skill] ?? 0;
                      const isSharedMax = level !== null && level === maxLevel && maxLevel > 0;
                      const isTop = maxLvlGain > 0 && lvlGain === maxLvlGain;
                      const is120 = level >= 120;
                      const is99  = level >= 99;
                      return (
                        <td key={p.id} align="center"
                          title={xpGain > 0 ? `+${xpGain.toLocaleString()} XP` : undefined}
                          style={{
                            padding: '5px 6px',
                            background: (isTop || isSharedMax) ? 'rgba(200,168,75,0.18)' : undefined,
                            color: is120 ? 'var(--gold)' : is99 ? 'var(--text-bright)' : level ? 'var(--text)' : 'var(--text-dim)',
                            fontWeight: (isSharedMax || isTop) ? 700 : 400,
                            fontSize: isSpotlit ? 13 : 12,
                            whiteSpace: 'nowrap',
                          }}>
                          {level ?? '—'}
                          {lvlGain > 0 && (
                            <span style={{ color: 'var(--green-bright)', fontWeight: 700, fontSize: 10, marginLeft: 3 }}>+{lvlGain}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Quests tab — group-wide quest completion grid */}
      {tab === 'quests' && (
        <QuestsPanel players={players} colorMap={colorMap} />
      )}
    </div>
  );
}
