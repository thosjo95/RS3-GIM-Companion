import RsIcon from '../RsIcon';
import React from 'react';
import GimTypeLabel from '../common/GimTypeLabel';

// Group switcher — shown in sidebar when multiple groups exist
export default function Sidebar({ groups, activeGroupId, onSelect, onNewGroup, onSearch, favoriteGroupIds, isOpen, onGlobal, globalActive }) {
  return (
    <nav className={`sidebar${isOpen ? ' open' : ''}`}>
      {/* the page for everyone: every tracked group side by side */}
      <div className="nav-group">
        <div className="nav-label">Everyone</div>
        <div className={`nav-item${globalActive ? ' active' : ''}`} onClick={onGlobal}>
          <span className="icon" style={{display:'inline-flex',alignItems:'center'}}><RsIcon name="leaderboards" size={18} /></span>
          <span>Global Leaderboard</span>
        </div>
      </div>
      <div className="nav-group">
        <div className="nav-label" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span>Groups</span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onSearch} title="Find or manage groups" style={{fontSize:13}}><RsIcon name="search" size={16} /></button>
        </div>
        {groups.map(g => {
          const isFav = favoriteGroupIds?.includes(g.id);
          return (
            <div
              key={g.id}
              className={`nav-item${g.id === activeGroupId && !globalActive ? ' active' : ''}`}
              onClick={() => onSelect(g.id)}>
              <span className="icon" style={{display:'inline-flex',alignItems:'center'}}><GimTypeLabel type={g.gim_type} size={15} iconOnly /></span>
              <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{g.name}</span>
              {isFav && <span style={{color:'var(--gold)',fontSize:11,flexShrink:0,marginLeft:2}}>★</span>}
              {g.member_count != null && (
                <span className="tag" style={{marginLeft: isFav ? 4 : 'auto',fontSize:10,flexShrink:0}}>{g.member_count}</span>
              )}
            </div>
          );
        })}
        <div className="nav-item" onClick={onSearch} style={{marginTop:4}}>
          <span className="icon"><RsIcon name="setup" size={18} /></span>
          <span>Find or Manage Groups</span>
        </div>
      </div>
    </nav>
  );
}
