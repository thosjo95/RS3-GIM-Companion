import React from 'react';
import { fmtXp, xpForLevel } from '../../lib/rs3';
import SkillIcon from '../common/SkillIcon';
import SkillTip, { useSkillTip } from './SkillTip';

// ── One player's skills ───────────────────────────────────────────────────────
// Same grouping and look as the group comparison grid (Group Stats), but with what matters when you look at one
// person: XP, hiscores rank, and progress to the next level.

const GROUPS = [
  ['Combat',    ['Attack', 'Strength', 'Defence', 'Constitution', 'Ranged', 'Prayer', 'Magic', 'Summoning', 'Necromancy']],
  ['Gathering', ['Woodcutting', 'Fishing', 'Mining', 'Divination', 'Hunter', 'Farming', 'Archaeology']],
  ['Artisan',   ['Cooking', 'Fletching', 'Crafting', 'Smithing', 'Herblore', 'Firemaking', 'Construction', 'Runecrafting', 'Invention']],
  ['Support',   ['Agility', 'Thieving', 'Slayer', 'Dungeoneering']],
];

const Tile = ({ label, value, accent }) => (
  <div style={{ flex: '1 1 90px', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, minWidth: 90 }}>
    <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
    <div style={{ fontSize: 17, fontWeight: 800, color: accent ?? 'var(--text-bright)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
  </div>
);

function SkillCard({ name, s, bind, player }) {
  const level = s.level ?? 1, xp = s.xp ?? 0;
  const elite = name === 'Invention';                                   // elite skills use another XP curve: no progress figures
  const cap = level >= 100 || ['Herblore', 'Slayer', 'Farming', 'Dungeoneering', 'Archaeology', 'Necromancy'].includes(name) ? 120 : 99;
  const atCap = level >= cap;
  const from = xpForLevel(level), to = xpForLevel(level + 1);
  const pct = elite ? Math.min(100, (level / 150) * 100) : atCap ? 100 : Math.max(0, Math.min(100, ((xp - from) / Math.max(1, to - from)) * 100));
  const remainder = !elite && !atCap && xp < 200_000_000 ? Math.max(0, to - xp) : null;
  const tone = level >= 120 ? 'var(--gold)' : level >= 99 ? '#e8d48a' : 'var(--text-bright)';
  return (
    <div {...bind({ skill: name, level, xp, rank: s.rank, rsn: player?.rsn })}
      style={{ padding: '8px 10px 9px', borderRadius: 8, background: level >= 99 ? 'rgba(200,168,75,0.08)' : 'rgba(255,255,255,0.025)', border: `1px solid ${level >= 99 ? 'rgba(200,168,75,0.35)' : 'transparent'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <SkillIcon name={name} size={20} />
        <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: tone, fontVariantNumeric: 'tabular-nums' }}>{level >= 99 ? '★ ' : ''}{level}</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-root)', margin: '7px 0 5px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: level >= 99 ? 'var(--gold)' : 'var(--text-dim)', opacity: 0.85 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
        <span>{fmtXp(xp)} XP</span>
        <span>{s.rank > 0 ? `#${s.rank.toLocaleString()}` : '—'}</span>
      </div>
    </div>
  );
}

export default function SkillTable({ player }) {
  const { tip, bind } = useSkillTip();
  const skillsMap = Object.fromEntries((player.skills || []).map(s => [s.skill_name, s]));
  const overall = skillsMap.Overall;
  const real = Object.entries(skillsMap).filter(([k]) => k !== 'Overall').map(([, v]) => v);
  const n99 = real.filter(s => s.level >= 99).length, n120 = real.filter(s => s.level >= 120).length;
  const avatar = `https://secure.runescape.com/m=avatar-rs/${encodeURIComponent(player.rsn)}/chat.png`;
  return (
    <div>
      <SkillTip tip={tip} />
      {overall && (
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px 6px 6px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
            <img src={avatar} alt="" width={38} height={38} style={{ borderRadius: '50%', background: 'var(--bg-root)' }} onError={e => { e.target.style.visibility = 'hidden'; }} />
            <div style={{ fontWeight: 800, color: 'var(--text-bright)', fontSize: 14 }}>{player.rsn}</div>
          </div>
          <Tile label="Total level" value={overall.level?.toLocaleString()} accent="var(--gold)" />
          <Tile label="Total XP" value={fmtXp(overall.xp)} accent="var(--gold)" />
          {overall.rank > 0 && <Tile label="Hiscores rank" value={`#${overall.rank.toLocaleString()}`} />}
          {player.combat_level != null && <Tile label="Combat" value={player.combat_level} />}
          <Tile label="99s · 120s" value={`${n99} · ${n120}`} />
        </div>
      )}

      {GROUPS.map(([label, names]) => {
        const shown = names.filter(n => skillsMap[n]);
        if (shown.length === 0) return null;
        return (
          <div key={label}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '14px 0 6px', fontSize: 10, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
              {label}<span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6 }}>
              {shown.map(n => <SkillCard key={n} name={n} s={skillsMap[n]} bind={bind} player={player} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
