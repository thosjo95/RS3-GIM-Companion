import React from 'react';
import GimTypeLabel from './common/GimTypeLabel';

// The group's name, type, member count and rank, shown in the top bar (left side) instead of as a big heading on
// every page, which saves the vertical space.
export default function GroupHeaderInfo({ group }) {
  if (!group) return null;
  const type = group.gim_type ?? 'regular';

  const members = group.players?.length || 0;

  let badge;
  if (type === 'custom') {
    badge = <GimTypeLabel type="custom" size={14} />;
  } else {
    const src = type === 'competitive'
      ? 'https://runescape.wiki/images/Competitive_Group_Ironman_badge.png'
      : 'https://runescape.wiki/images/Group_Ironman_badge.png';
    const label = type === 'competitive' ? 'Competitive GIM' : type === 'regular_unranked' ? 'Unranked GIM' : 'Regular GIM';
    badge = <img src={src} alt={label} title={label} width={14} height={14} style={{ imageRendering: 'crisp-edges' }} />;
  }

  return (
    <div className="group-info" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1, minWidth: 0, paddingLeft: 14, borderLeft: '1px solid var(--border)' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gold-light)', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320 }} title={group.name}>
        {group.name}
      </div>
      <div className="group-info-sub" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {badge}
          {type === 'regular_unranked' && <em style={{ fontSize: 10 }}>Unranked</em>}
        </span>
        {group.group_rsn && group.group_rsn.toLowerCase() !== group.name.toLowerCase() && <span>{group.group_rsn}</span>}
        <span>{members} member{members === 1 ? '' : 's'}</span>
      </div>
    </div>
  );
}
