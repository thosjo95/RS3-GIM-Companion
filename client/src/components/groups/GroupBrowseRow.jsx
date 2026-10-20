import React from 'react';
import GimTypeLabel from '../common/GimTypeLabel';

// Shared helper: renders one group row used in both the modal browse list and SetupScreen
export default function GroupBrowseRow({ g, isPinned, isFav, onSelect, onFavorite, onRemove, onClose, actionLabel = 'Browse →' }) {
  return (
    <div
      style={{
        display:'flex', alignItems:'center', gap:10,
        padding:'9px 12px', marginBottom:4,
        background:'var(--bg-panel-alt)', border:'1px solid var(--border)',
        borderRadius:'var(--radius)', cursor:'pointer',
        transition:'border-color 0.12s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor='var(--gold-dark)'}
      onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
      onClick={() => { onSelect(g.id); onClose?.(); }}
    >
      <span style={{flexShrink:0}}><GimTypeLabel type={g.gim_type} size={16} iconOnly /></span>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontWeight:600,color:'var(--text-bright)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
          {g.name}
        </div>
        <div style={{fontSize:11,color:'var(--text-dim)',display:'inline-flex',alignItems:'center',gap:3,flexWrap:'wrap'}}>
          {g.member_count ?? 0} member{(g.member_count ?? 0) !== 1 ? 's' : ''}
          {' · '}<GimTypeLabel type={g.gim_type} size={11} />
          {g.is_claimed ? ' · 🔒' : ''}
        </div>
      </div>
      {/* Action button */}
      <span
        style={{fontSize:11,color:'var(--gold)',cursor:'pointer',flexShrink:0,fontWeight:600}}
        onClick={e => { e.stopPropagation(); onSelect(g.id); onClose?.(); }}>
        {actionLabel}
      </span>
      {/* Favorite toggle — only for pinned groups */}
      {isPinned && onFavorite && (
        <button
          onClick={e => { e.stopPropagation(); onFavorite(g.id); }}
          title={isFav ? 'Unpin from top' : 'Pin to top of sidebar'}
          style={{
            background:'none', border:'1px solid var(--border)',
            borderRadius:'var(--radius)', cursor:'pointer',
            padding:'3px 7px', fontSize:13, lineHeight:1,
            color: isFav ? 'var(--gold)' : 'var(--text-dim)',
            flexShrink:0,
          }}>
          {isFav ? '★' : '☆'}
        </button>
      )}
      {/* Remove — only for pinned groups */}
      {isPinned && onRemove && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(g.id); }}
          title="Remove from sidebar"
          style={{
            background:'none', border:'1px solid var(--border)',
            borderRadius:'var(--radius)', cursor:'pointer',
            padding:'3px 7px', fontSize:12, lineHeight:1,
            color:'var(--text-dim)', flexShrink:0,
          }}>
          ✕
        </button>
      )}
    </div>
  );
}
