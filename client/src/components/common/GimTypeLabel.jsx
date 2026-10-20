import React from 'react';

export default function GimTypeLabel({ type, size = 14, iconOnly = false }) {
  // Custom groups: teal badge icon instead of GIM wiki images
  if (type === 'custom') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: iconOnly ? 0 : 5 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: size, height: size, borderRadius: '50%',
          background: 'rgba(56,189,248,0.18)', border: '1.5px solid rgba(56,189,248,0.55)',
          color: '#38bdf8', fontSize: Math.round(size * 0.56), fontWeight: 800, flexShrink: 0,
          lineHeight: 1, userSelect: 'none',
        }}>C</span>
        {!iconOnly && <span style={{ color: '#38bdf8' }}>Custom</span>}
      </span>
    );
  }
  const isCompetitive = type === 'competitive';
  const isUnranked    = type === 'regular_unranked';
  const src = isCompetitive
    ? 'https://runescape.wiki/images/Competitive_Group_Ironman_badge.png'
    : 'https://runescape.wiki/images/Group_Ironman_badge.png';
  const label = isCompetitive ? 'Competitive' : isUnranked ? 'Unranked' : 'Regular';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: iconOnly ? 0 : 4 }}>
      <img src={src} alt={label} width={size} height={size} style={{ imageRendering: 'crisp-edges', verticalAlign: 'middle', flexShrink: 0 }} />
      {!iconOnly && label}
    </span>
  );
}
