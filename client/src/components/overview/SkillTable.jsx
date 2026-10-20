import React from 'react';
import { fmtXp } from '../../lib/rs3';
import SkillIcon from '../common/SkillIcon';
import { SKILL_ORDER } from './constants';

// ── Skill table ───────────────────────────────────────────────────────────────

export default function SkillTable({ player }) {
  const skillsMap = Object.fromEntries((player.skills || []).map(s => [s.skill_name, s]));
  const overall = skillsMap['Overall'];
  return (
    <div>
      {overall && (
        <div style={{ display: 'flex', gap: 20, padding: '10px 12px', background: 'var(--bg-panel-alt)', borderRadius: 'var(--radius)', marginBottom: 12, fontSize: 13 }}>
          <span><strong style={{ color: 'var(--gold)' }}>{overall.level}</strong> <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>Total lvl</span></span>
          <span><strong style={{ color: 'var(--gold)' }}>{fmtXp(overall.xp)}</strong> <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>XP</span></span>
          {overall.rank > 0 && <span><strong style={{ color: 'var(--text-bright)' }}>#{overall.rank.toLocaleString()}</strong> <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>Rank</span></span>}
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ color: 'var(--text-dim)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            <th align="left" style={{ padding: '4px 6px 8px', fontWeight: 600 }}>Skill</th>
            <th align="right" style={{ padding: '4px 6px 8px', fontWeight: 600 }}>Level</th>
            <th align="right" style={{ padding: '4px 6px 8px', fontWeight: 600 }}>XP</th>
            <th align="right" style={{ padding: '4px 6px 8px', fontWeight: 600 }}>Rank</th>
          </tr>
        </thead>
        <tbody>
          {SKILL_ORDER.filter(n => skillsMap[n]).map((name, i) => {
            const s = skillsMap[name];
            const elite = s.level >= 120, maxed = s.level >= 99;
            return (
              <tr key={name} style={{ borderTop: '1px solid var(--border)', background: i % 2 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                <td style={{ padding: '5px 6px' }}>
                  <span style={{ marginRight: 5 }}><SkillIcon name={name} /></span>
                  <span style={{ color: maxed ? 'var(--gold)' : 'var(--text)' }}>{name}</span>
                </td>
                <td align="right" style={{ padding: '5px 6px', fontWeight: 600, color: elite ? 'var(--gold)' : maxed ? 'var(--text-bright)' : 'var(--text)' }}>
                  {(elite || maxed) ? '★ ' : ''}{s.level}
                </td>
                <td align="right" style={{ padding: '5px 6px', color: 'var(--text-dim)' }}>{s.xp?.toLocaleString() ?? '—'}</td>
                <td align="right" style={{ padding: '5px 6px', color: 'var(--text-dim)' }}>{s.rank > 0 ? `#${s.rank.toLocaleString()}` : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
