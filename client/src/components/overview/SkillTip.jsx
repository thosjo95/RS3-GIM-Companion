import React, { useState } from 'react';
import SkillIcon from '../common/SkillIcon';
import { xpForLevel, skillCap } from '../../lib/rs3';

// The hover box for a skill, like the one in the game: level, current XP, XP of the next level and what is left.
// Usage:  const { tip, bind } = useSkillTip();   <div {...bind({ skill, level, xp, rank, rsn, color, gain, period })}>   <SkillTip tip={tip} />
// (the box follows the mouse and never takes the mouse itself, so it cannot flicker)

const MAX_XP = 200_000_000;
const fmt = n => Number(n).toLocaleString('en-US');

export function useSkillTip() {
  const [tip, setTip] = useState(null);
  const bind = data => ({
    onMouseEnter: e => setTip({ ...data, x: e.clientX, y: e.clientY }),
    onMouseMove: e => setTip(t => (t ? { ...t, x: e.clientX, y: e.clientY } : t)),
    onMouseLeave: () => setTip(null),
  });
  return { tip, bind };
}

export default function SkillTip({ tip }) {
  if (!tip || tip.xp == null) return null;
  const { skill, level, xp, rank, rsn, color, gain, period } = tip;
  const elite = skill === 'Invention';                  // elite skills use another XP curve: no "next level" figures
  // the level the XP is worth: skills go on past 99 (to 120), the hiscores level stops at 99
  let virt = level ?? 1;
  if (!elite) while (virt < 120 && xp >= xpForLevel(virt + 1)) virt++;
  const maxed = xp >= MAX_XP;
  const next = !elite && !maxed && virt < 120 ? xpForLevel(virt + 1) : null;
  const W = 250, H = 175;
  const left = Math.max(8, Math.min(tip.x + 16, window.innerWidth - W - 8));
  const top = Math.max(8, Math.min(tip.y + 18, window.innerHeight - H - 8));
  const row = (label, value, tone) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
      <span style={{ color: '#d8c48a' }}>{label}</span><span style={{ color: tone ?? '#fff', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
  return (
    <div role="tooltip" style={{
      position: 'fixed', left, top, width: W, zIndex: 2000, pointerEvents: 'none',
      background: 'linear-gradient(#241a0e, #17110a)', border: '2px solid #6b5630', borderRadius: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
      padding: '8px 10px', fontSize: 12, lineHeight: 1.55, color: '#fff', display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      {rsn && <div style={{ fontSize: 11, fontWeight: 700, color: color ?? 'var(--gold)', marginBottom: 2 }}>{rsn}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, marginBottom: 3, borderBottom: '1px solid #3e3220', paddingBottom: 4 }}>
        <SkillIcon name={skill} size={20} />
        <span style={{ color: '#ffd75e' }}>{skill}: {virt}/{Math.max(skillCap(skill), virt)}{virt !== level && level ? <span style={{ color: '#a89870', fontWeight: 400 }}> (hiscores {level})</span> : null}</span>
      </div>
      {row('Current XP:', fmt(xp))}
      {next != null && row('Next level:', fmt(next))}
      {next != null && row('Remainder:', fmt(Math.max(0, next - xp)))}
      {maxed && <div style={{ color: '#8fe08f' }}>200M XP reached</div>}
      {!maxed && !elite && virt >= 120 && <div style={{ color: '#8fe08f' }}>Maximum level reached</div>}
      {elite && <div style={{ color: '#a89870', fontSize: 11 }}>Elite skill: next-level XP not shown</div>}
      {rank > 0 && row('Hiscores rank:', '#' + fmt(rank), '#9cc7ff')}
      {gain > 0 && row(period ? `Gained (${period}):` : 'Gained:', '+' + fmt(gain) + ' XP', '#8fe08f')}
    </div>
  );
}
