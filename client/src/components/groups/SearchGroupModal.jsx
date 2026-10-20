import React, { useState } from 'react';
import { api } from '../../api/client';
import GimTypeLabel from '../common/GimTypeLabel';
import BrowseTrackedGroups from './BrowseTrackedGroups';
import GroupBrowseRow from './GroupBrowseRow';

// Group search modal
export default function SearchGroupModal({ groups, allDbGroups, onSelect, onAddNew, onClose, onToast, onRemove, onFavorite, favoriteGroupIds, onStar }) {
  const [query, setQuery] = useState('');
  const [gimType, setGimType] = useState('regular');
  const [gimSize, setGimSize] = useState(5);
  const [searching, setSearching] = useState(false);
  const [rs3Result, setRs3Result] = useState(null);

  // Pinned group matches
  const pinnedIds = new Set(groups.map(g => g.id));
  const pinnedMatches = query.trim()
    ? groups.filter(g => g.name.toLowerCase().includes(query.toLowerCase()))
    : groups;

  async function handleRs3Search(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setRs3Result(null);
    try {
      const result = await api.lookupGroup(query.trim(), gimType, gimSize);
      setRs3Result(result);
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSearching(false);
    }
  }

  const alreadyInDb = rs3Result?.found
    ? (allDbGroups ?? groups).find(g => g.name.toLowerCase() === rs3Result.groupName?.toLowerCase())
    : null;

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{maxWidth:500}}>
        <div className="modal-header">
          <span className="modal-title">Find or Manage Groups</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{paddingTop:8, maxHeight:'85vh', overflowY:'auto'}}>

          {/* Search input */}
          <div className="form-group" style={{marginBottom:12,marginTop:0}}>
            <input className="form-input" value={query}
              onChange={e => { setQuery(e.target.value); setRs3Result(null); }}
              placeholder="Enter group name…" autoFocus />
          </div>

          {/* ── Your (pinned) groups ── */}
          {pinnedMatches.length > 0 && (
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:'var(--text-dim)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.5px'}}>
                {query.trim() ? 'Your matching groups' : 'Your groups'}
              </div>
              {pinnedMatches.map(g => (
                <GroupBrowseRow
                  key={g.id} g={g}
                  isPinned={true}
                  isFav={favoriteGroupIds?.includes(g.id)}
                  onSelect={onSelect}
                  onFavorite={onFavorite}
                  onRemove={onRemove}
                  onClose={onClose}
                  actionLabel="Switch →"
                />
              ))}
            </div>
          )}

          {/* ── Browse all tracked groups (collapsible) ── */}
          <BrowseTrackedGroups
            pinnedIds={pinnedIds}
            onSelect={id => { onSelect(id); }}
            onClose={onClose}
            onStar={onStar}
          />

          {/* Separator */}
          <div style={{display:'flex',alignItems:'center',gap:8,margin:'14px 0 12px'}}>
            <div style={{flex:1,height:1,background:'var(--border)'}} />
            <span style={{fontSize:11,color: gimType === 'custom' ? '#38bdf8' : 'var(--text-dim)'}}>
              {gimType === 'regular_unranked' ? 'Create unranked group' : gimType === 'custom' ? 'Create custom group' : 'Add new from RS3 hiscores'}
            </span>
            <div style={{flex:1,height:1,background:'var(--border)'}} />
          </div>

          <form onSubmit={handleRs3Search}>
            {/* Type buttons */}
            <div style={{display:'flex',gap:6,marginBottom:6,justifyContent:'center',flexWrap:'wrap'}}>
              {[
                ['regular','Regular'],
                ['competitive','Competitive'],
                ['regular_unranked','Unranked'],
                ['custom','Custom Group'],
              ].map(([val,label]) => (
                <button key={val} type="button"
                  className={`btn btn-sm ${gimType === val ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => { setGimType(val); setRs3Result(null); }}
                  style={{display:'inline-flex',alignItems:'center',gap:5}}>
                  <GimTypeLabel type={val} size={12} iconOnly /> {label}
                </button>
              ))}
            </div>

            {/* Size picker — hidden for custom groups (flexible member count) */}
            {gimType !== 'custom' && (
            <div style={{display:'flex',gap:6,marginBottom:10,justifyContent:'center'}}>
              {[2,3,4,5].map(n => (
                <button key={n} type="button"
                  className={`btn btn-sm ${gimSize === n ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setGimSize(n)}>{n} members</button>
              ))}
            </div>
            )}

            {/* Action */}
            <div style={{textAlign:'center', marginTop: (gimType === 'regular_unranked' || gimType === 'custom') ? 10 : 0}}>
              {gimType === 'regular_unranked' ? (
                <>
                  <div style={{fontSize:11,color:'var(--text-dim)',marginBottom:8}}>
                    Type your group name in the field above, then click Create.
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{minWidth:180}}
                    disabled={!query.trim()}
                    onClick={() => { onClose(); onAddNew({ name: query.trim(), type: 'regular_unranked', size: gimSize }); }}>
                    👥 Create Unranked Group →
                  </button>
                </>
              ) : gimType === 'custom' ? (
                <>
                  <div style={{fontSize:11,color:'#38bdf8',marginBottom:8}}>
                    Type your group name above, then click Create. Members are added manually.
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{minWidth:180,display:'inline-flex',alignItems:'center',gap:6}}
                    disabled={!query.trim()}
                    onClick={() => { onClose(); onAddNew({ name: query.trim(), type: 'custom', size: 2 }); }}>
                    <GimTypeLabel type="custom" size={12} iconOnly /> Create Custom Group →
                  </button>
                </>
              ) : (
                <button type="submit" className="btn btn-secondary btn-sm" style={{minWidth:180, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto'}}
                  disabled={searching || !query.trim()}>
                  {searching
                    ? <><span className="spinner" style={{width:12,height:12}} /> Searching RS3…</>
                    : 'Look up group'}
                </button>
              )}
            </div>
          </form>

          {/* RS3 result */}
          {rs3Result && (
            <div style={{marginTop:12,padding:'12px 14px',background:'var(--bg-panel-alt)',border:`1px solid ${rs3Result.found ? 'var(--border)' : 'rgba(192,64,64,0.4)'}`,borderRadius:'var(--radius-lg)'}}>
              {rs3Result.found ? (
                <>
                  <div style={{fontWeight:700,color:'var(--gold)',marginBottom:6}}>{rs3Result.groupName}</div>
                  <div style={{fontSize:12,color:'var(--text-dim)',marginBottom:10}}>
                    {rs3Result.members?.length} members found on RS3 hiscores
                  </div>
                  {alreadyInDb ? (
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                        <span style={{fontSize:12,color:'var(--green-bright)',flex:1}}>
                          ✓ Already tracked {alreadyInDb.is_claimed ? '🔒' : '🔓'}
                        </span>
                        <button className="btn btn-primary btn-sm" onClick={() => { onSelect(alreadyInDb.id); onClose(); }}>
                          Switch to it →
                        </button>
                      </div>
                      {!alreadyInDb.is_claimed && (
                        <div style={{fontSize:11,color:'var(--text-dim)'}}>
                          This group is unclaimed — switch to it and set a password to claim it.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <span style={{fontSize:12,color:'var(--text-dim)',flex:1}}>Not in your database yet</span>
                      <button className="btn btn-primary btn-sm" onClick={() => {
                        onClose();
                        onAddNew({ name: rs3Result.groupName, type: gimType, size: gimSize, members: rs3Result.members });
                      }}>
                        ➕ Add this group
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:5}}>
                    <span style={{fontSize:13,fontWeight:700,color:'var(--text-bright)'}}>Group not found</span>
                    {rs3Result.error && (
                      <span
                        title={rs3Result.error}
                        style={{
                          cursor: 'help', flexShrink: 0,
                          fontSize: 10, fontWeight: 700, color: 'var(--text-dim)',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border)', borderRadius: '50%',
                          width: 16, height: 16, display: 'inline-flex',
                          alignItems: 'center', justifyContent: 'center',
                          userSelect: 'none', lineHeight: 1,
                        }}>i</span>
                    )}
                  </div>
                  <div style={{fontSize:12,color:'var(--text-dim)',fontStyle:'italic',lineHeight:1.5}}>
                    Make sure the name is spelled exactly as it appears in-game, and that the correct type and member count are selected
                    {' '}(e.g. <em>4 members · Competitive</em>).
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
