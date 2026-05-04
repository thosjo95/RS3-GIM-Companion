import React, { useMemo, useState } from 'react';

const SKILL_ICONS = {
  Attack: '⚔️', Defence: '🛡️', Strength: '💪', Constitution: '❤️',
  Ranged: '🏹', Prayer: '🙏', Magic: '🔮', Cooking: '🍳',
  Woodcutting: '🪵', Fletching: '🎯', Fishing: '🐟', Firemaking: '🔥',
  Crafting: '💎', Smithing: '⚒️', Mining: '⛏️', Herblore: '🌿',
  Agility: '🏃', Thieving: '🕵️', Slayer: '💀', Farming: '🌾',
  Runecrafting: '🔵', Hunter: '🦌', Construction: '🏠', Summoning: '🐉',
  Dungeoneering: '🏰', Divination: '✨', Invention: '🔬', Archaeology: '🦴',
  Necromancy: '☠️',
};

const SKILL_ORDER = [
  'Attack', 'Strength', 'Defence', 'Constitution', 'Ranged', 'Prayer', 'Magic',
  'Slayer', 'Herblore', 'Summoning', 'Dungeoneering', 'Invention', 'Necromancy',
  'Agility', 'Thieving', 'Fishing', 'Cooking', 'Woodcutting', 'Firemaking',
  'Fletching', 'Crafting', 'Smithing', 'Mining', 'Farming', 'Runecrafting',
  'Hunter', 'Construction', 'Divination', 'Archaeology',
];

export default function WeaknessMap({ players }) {
  const [threshold, setThreshold] = useState(70);

  const skillStats = useMemo(() => {
    const stats = {};
    for (const skill of SKILL_ORDER) {
      const levels = players
        .map(p => {
          const s = (p.skills || []).find(sk => sk.skill_name === skill);
          return s?.level ?? null;
        })
        .filter(l => l !== null);

      if (levels.length === 0) continue;
      stats[skill] = {
        avg: Math.round(levels.reduce((a, b) => a + b, 0) / levels.length),
        min: Math.min(...levels),
        max: Math.max(...levels),
        lowest: players
          .filter(p => {
            const s = (p.skills || []).find(sk => sk.skill_name === skill);
            return (s?.level ?? 1) === Math.min(...levels);
          })
          .map(p => p.rsn),
      };
    }
    return stats;
  }, [players]);

  const sortedSkills = SKILL_ORDER.filter(s => skillStats[s]);

  function cellClass(avg) {
    if (avg < threshold) return 'alert';
    if (avg < threshold + 15) return 'warn';
    return 'ok';
  }

  return (
    <div>
      <div className="flex align-center gap-12 mb-16" style={{flexWrap:'wrap'}}>
        <div className="section-title" style={{marginBottom:0}}>📊 Group Weakness Map</div>
        <div className="flex align-center gap-8 text-sm text-dim">
          Alert below level:
          <input
            type="number" min="1" max="120" value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            className="form-input" style={{width:60, padding:'4px 8px'}}
          />
        </div>
        <div className="flex gap-8 text-xs">
          <span style={{color:'var(--red-bright)'}}>🔴 Below {threshold}</span>
          <span style={{color:'var(--orange)'}}>🟠 {threshold}–{threshold+14}</span>
          <span style={{color:'var(--green-bright)'}}>🟢 {threshold+15}+</span>
        </div>
      </div>

      <div className="weakness-grid">
        {sortedSkills.map(skill => {
          const s = skillStats[skill];
          const cls = cellClass(s.avg);
          return (
            <div key={skill} className={`weakness-cell ${cls}`}>
              <div className="weakness-skill">
                {SKILL_ICONS[skill]} {skill}
              </div>
              <div className={`weakness-avg text-${cls === 'alert' ? 'red' : cls === 'warn' ? '' : 'green'}`}
                style={cls === 'warn' ? {color:'var(--orange)'} : {}}>
                {s.avg}
              </div>
              <div className="weakness-range">
                Range: {s.min}–{s.max}
              </div>
              {cls === 'alert' && s.lowest.length > 0 && (
                <div className="text-xs text-dim" style={{marginTop:2}}>
                  Lowest: {s.lowest.join(', ')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
