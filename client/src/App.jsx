import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api, setGroupContext, setOnUnauthorized } from './api/client';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import AddPlayerModal from './components/AddPlayerModal';

// Toast notification system
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  return [toasts, push];
}

function fmtXp(n) {
  if (!n) return '0';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(n);
}

// Password modal — shown when group password is needed or incorrect
function PasswordModal({ groupName, onConfirm, onCancel, error }) {
  const [pw, setPw] = useState('');
  const [checking, setChecking] = useState(false);
  const [localError, setLocalError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!pw.trim()) return;
    setChecking(true);
    setLocalError('');
    try {
      await onConfirm(pw.trim());
    } catch (err) {
      setLocalError(err.message || 'Incorrect password');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{maxWidth:380}}>
        <div className="modal-header">
          <span className="modal-title">🔒 Group Password</span>
          {onCancel && <button className="btn btn-ghost btn-sm" onClick={onCancel}>✕</button>}
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p style={{color:'var(--text-dim)',fontSize:13,marginBottom:16}}>
              Enter the password for <strong style={{color:'var(--text-bright)'}}>{groupName}</strong> to make changes.
            </p>
            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">Password</label>
              <input className="form-input" type="password" value={pw}
                onChange={e => setPw(e.target.value)} autoFocus placeholder="Group password" />
            </div>
            {(localError || error) && (
              <div style={{color:'var(--danger)',fontSize:12,marginTop:8}}>{localError || error}</div>
            )}
          </div>
          <div className="modal-footer">
            {onCancel && <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>}
            <button type="submit" className="btn btn-primary" disabled={checking || !pw.trim()}>
              {checking ? <span className="spinner" style={{width:12,height:12}} /> : 'Unlock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ClaimToggle({ claimGroup, setClaimGroup, password, setPassword }) {
  return (
    <div style={{margin:'12px 0',padding:'10px 12px',background:'var(--bg-panel-alt)',border:'1px solid var(--border)',borderRadius:'var(--radius)'}}>
      <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',marginBottom: claimGroup ? 10 : 0}}>
        <input type="checkbox" checked={claimGroup} onChange={e => setClaimGroup(e.target.checked)}
          style={{accentColor:'var(--gold)',width:14,height:14}} />
        <span style={{fontWeight:600,fontSize:13,color:'var(--text-bright)'}}>🔒 Claim this group</span>
      </label>
      {claimGroup ? (
        <>
          <input className="form-input" type="password" value={password}
            onChange={e => setPassword(e.target.value)} placeholder="Choose a group password"
            style={{marginBottom:6}} />
          <div style={{fontSize:11,color:'var(--text-dim)'}}>
            Share this password with your group members. First to claim wins — once set it can't be changed without the password.
          </div>
        </>
      ) : (
        <div style={{fontSize:11,color:'var(--text-dim)'}}>
          Anyone can view and edit this group. You can claim it later from the group settings.
        </div>
      )}
    </div>
  );
}

// Setup screen — shown when no group exists
function SetupScreen({ onCreated, onToast, prefill, onCancel, groups, onSwitchToGroup }) {
  const [step, setStep] = useState(() => prefill ? 'preview' : 'search');
  const [gimType, setGimType] = useState(prefill?.type || 'regular');
  const [gimSize, setGimSize] = useState(prefill?.size || 5);
  const [groupName, setGroupName] = useState(prefill?.name || '');
  const [password, setPassword] = useState('');
  const [claimGroup, setClaimGroup] = useState(true);
  const [lookupResult, setLookupResult] = useState(prefill ? { found: true, groupName: prefill.name, type: prefill.type, size: prefill.size, members: prefill.members } : null);
  const [manualRsns, setManualRsns] = useState(prefill?.members?.map(m => m.rsn) || []);
  const [searching, setSearching] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');

  async function handleSearch(e) {
    e.preventDefault();
    if (!groupName.trim()) return;
    // If already tracked locally, just switch to it
    const existing = groups?.find(g => g.name.toLowerCase() === groupName.trim().toLowerCase());
    if (existing) {
      onSwitchToGroup?.(existing.id);
      return;
    }
    setSearching(true);
    try {
      const result = await api.lookupGroup(groupName.trim(), gimType, gimSize);
      if (result.found && result.members?.length) {
        setLookupResult(result);
        setStep('preview');
      } else {
        onToast(result.error || 'Group not found — enter members manually', 'error');
        setManualRsns(Array(gimSize).fill(''));
        setStep('manual');
      }
    } catch (err) {
      onToast(err.message, 'error');
      setManualRsns(Array(gimSize).fill(''));
      setStep('manual');
    } finally {
      setSearching(false);
    }
  }

  async function handleConfirm(memberRsns) {
    const rsns = memberRsns.map(r => r.trim()).filter(Boolean);
    if (!rsns.length) return onToast('Add at least one member RSN', 'error');
    if (claimGroup && !password.trim()) return onToast('Enter a password to claim this group, or uncheck "Claim this group"', 'error');
    setStep('setting-up');
    setSyncProgress(`Adding ${rsns.length} members and syncing hiscores…`);
    try {
      const pw = claimGroup ? password.trim() : undefined;
      const result = await api.setupGroup({ name: groupName.trim(), type: gimType, size: gimSize, member_rsns: rsns, password: pw });
      if (result.failed?.length) {
        onToast(`Setup done. ${result.failed.length} member(s) couldn't sync from RS3.`, 'error');
      }
      onCreated(result.id, pw);
    } catch (err) {
      onToast(err.message, 'error');
      setStep(lookupResult ? 'preview' : 'manual');
    }
  }

  const cardStyle = { width: '100%', maxWidth: 480, textAlign: 'left' };

  // ── Step: Setting up ──────────────────────────────────────────────────────
  if (step === 'setting-up') {
    return (
      <div className="setup-screen">
        <div style={{fontSize:56,marginBottom:12}}>⚔️</div>
        <h1>RS3 GIM Companion</h1>
        <div className="panel" style={cardStyle}>
          <div className="panel-body" style={{textAlign:'center',padding:'32px 24px'}}>
            <span className="spinner" style={{width:32,height:32,marginBottom:16,display:'block',margin:'0 auto 16px'}} />
            <div style={{fontWeight:700,fontSize:16,color:'var(--text-bright)',marginBottom:8}}>Setting up your group…</div>
            <div style={{color:'var(--text-dim)',fontSize:13}}>{syncProgress}</div>
            <div style={{color:'var(--text-dim)',fontSize:12,marginTop:8}}>This may take 10–20 seconds while we sync hiscores from RS3.</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Preview (auto-found members) ───────────────────────────────────
  if (step === 'preview' && lookupResult) {
    return (
      <div className="setup-screen">
        <div style={{fontSize:56,marginBottom:12}}>⚔️</div>
        <h1>RS3 GIM Companion</h1>
        <div className="panel" style={cardStyle}>
          <div className="panel-header">
            <span className="panel-title">✓ Group Found</span>
            <span className="tag">{lookupResult.type === 'competitive' ? '🏆 Competitive' : '⚔️ Regular'} · {lookupResult.size} members</span>
          </div>
          <div className="panel-body">
            <div style={{fontWeight:700,fontSize:15,color:'var(--gold)',marginBottom:12}}>{lookupResult.groupName}</div>
            <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:16}}>
              {lookupResult.members.map((m, i) => (
                <div key={i} style={{
                  display:'flex',alignItems:'center',justifyContent:'space-between',
                  padding:'8px 12px',background:'var(--bg-panel-alt)',
                  border:'1px solid var(--border)',borderRadius:'var(--radius)',
                }}>
                  <span style={{fontWeight:600,color:'var(--text-bright)'}}>👤 {m.rsn}</span>
                  <div style={{display:'flex',gap:12,fontSize:12,color:'var(--text-dim)'}}>
                    {m.totalLevel > 0 && <span>Lvl {m.totalLevel}</span>}
                    {m.totalXp > 0 && <span>{fmtXp(m.totalXp)} XP</span>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{fontSize:12,color:'var(--text-dim)',marginBottom:12}}>
              Hiscores will be synced automatically for all members.
            </div>
            <ClaimToggle claimGroup={claimGroup} setClaimGroup={setClaimGroup} password={password} setPassword={setPassword} />
            <div style={{display:'flex',gap:8,flexDirection:'column'}}>
              <button className="btn btn-primary" onClick={() => handleConfirm(lookupResult.members.map(m => m.rsn))}>
                ✓ Confirm & Start Tracking
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setManualRsns(lookupResult.members.map(m => m.rsn)); setStep('manual'); }}>
                Edit members manually instead
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setStep('search')}>← Back</button>
              {onCancel && <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Manual RSN entry ────────────────────────────────────────────────
  if (step === 'manual') {
    return (
      <div className="setup-screen">
        <div style={{fontSize:56,marginBottom:12}}>⚔️</div>
        <h1>RS3 GIM Companion</h1>
        <div className="panel" style={cardStyle}>
          <div className="panel-header">
            <span className="panel-title">Enter Member RSNs</span>
          </div>
          <div className="panel-body">
            <div style={{color:'var(--text-dim)',fontSize:13,marginBottom:14}}>
              Enter each group member's exact RuneScape name as shown on the hiscores.
            </div>
            {manualRsns.map((rsn, i) => (
              <div key={i} className="form-group" style={{marginBottom:8}}>
                <label className="form-label">Member {i + 1}</label>
                <input className="form-input" value={rsn} autoFocus={i === 0}
                  placeholder="Exact RSN"
                  onChange={e => {
                    const next = [...manualRsns];
                    next[i] = e.target.value;
                    setManualRsns(next);
                  }} />
              </div>
            ))}
            <div style={{display:'flex',gap:8,marginTop:4}}>
              <button className="btn btn-ghost btn-sm" onClick={() => setManualRsns(r => [...r, ''])}>+ Add member</button>
            </div>
            <ClaimToggle claimGroup={claimGroup} setClaimGroup={setClaimGroup} password={password} setPassword={setPassword} />
            <div style={{display:'flex',gap:8,flexDirection:'column',marginTop:16}}>
              <button className="btn btn-primary" onClick={() => handleConfirm(manualRsns)}>
                ✓ Confirm & Start Tracking
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setStep('search')}>← Back</button>
              {onCancel && <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Search ─────────────────────────────────────────────────────────
  return (
    <div className="setup-screen">
      <div style={{fontSize:56,marginBottom:12}}>⚔️</div>
      <h1>RS3 GIM Companion</h1>
      <p>Track your Group Ironman progress — hiscores, XP gains, goals, and weakness maps.</p>
      <div className="panel" style={cardStyle}>
        <div className="panel-header"><span className="panel-title">Find Your Group</span></div>
        <form onSubmit={handleSearch}>
          <div className="panel-body">

            <div className="form-group">
              <label className="form-label">Group Type</label>
              <div className="flex gap-8">
                {[['regular','⚔️ Regular'],['competitive','🏆 Competitive']].map(([val, label]) => (
                  <button key={val} type="button"
                    className={`btn btn-sm ${gimType === val ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setGimType(val)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Group Size</label>
              <div className="flex gap-8">
                {[2,3,4,5].map(n => (
                  <button key={n} type="button"
                    className={`btn btn-sm ${gimSize === n ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setGimSize(n)}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Group Name (exact in-game name)</label>
              <input className="form-input" value={groupName} onChange={e => setGroupName(e.target.value)}
                placeholder="e.g. True Deciples" required autoFocus />
              <div className="text-xs text-dim mt-8">
                Must match your group name on the{' '}
                <a href={`https://rs.runescape.com/hiscores/group-ironman/${gimType}/${gimSize}`}
                  target="_blank" rel="noopener noreferrer" style={{color:'var(--gold)'}}>
                  RS3 GIM hiscores
                </a> exactly.
              </div>
            </div>

            <ClaimToggle claimGroup={claimGroup} setClaimGroup={setClaimGroup} password={password} setPassword={setPassword} />
          </div>

          <div className="modal-footer" style={{flexDirection:'column',gap:8,alignItems:'stretch'}}>
            <button type="submit" className="btn btn-primary" disabled={searching || !groupName.trim()}>
              {searching
                ? <><span className="spinner" style={{width:12,height:12}}/> Searching RS3 hiscores…</>
                : '🔍 Search & Import Group'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm"
              onClick={() => { setManualRsns(Array(gimSize).fill('')); setStep('manual'); }}>
              Enter members manually instead
            </button>
            {onCancel && <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>}
          </div>
        </form>
      </div>
    </div>
  );
}

// Group search modal
function SearchGroupModal({ groups, onSelect, onAddNew, onClose, onToast }) {
  const [query, setQuery] = useState('');
  const [gimType, setGimType] = useState('regular');
  const [gimSize, setGimSize] = useState(5);
  const [searching, setSearching] = useState(false);
  const [rs3Result, setRs3Result] = useState(null);

  const localMatches = query.trim().length >= 1
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
    ? groups.find(g => g.name.toLowerCase() === rs3Result.groupName?.toLowerCase())
    : null;

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{maxWidth:500}}>
        <div className="modal-header">
          <span className="modal-title">🔍 Find Group</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{paddingTop:0}}>

          {/* Search input */}
          <div className="form-group" style={{marginBottom:12}}>
            <input className="form-input" value={query} onChange={e => { setQuery(e.target.value); setRs3Result(null); }}
              placeholder="Type group name…" autoFocus />
          </div>

          {/* Local results */}
          {localMatches.length > 0 && (
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,color:'var(--text-dim)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.5px'}}>
                {query.trim() ? 'Matching groups' : 'Your groups'}
              </div>
              {localMatches.map(g => (
                <div key={g.id} onClick={() => { onSelect(g.id); onClose(); }}
                  style={{
                    display:'flex',alignItems:'center',gap:10,
                    padding:'9px 12px',marginBottom:4,
                    background:'var(--bg-panel-alt)',border:'1px solid var(--border)',
                    borderRadius:'var(--radius)',cursor:'pointer',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='var(--gold-dark)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
                  <span>🏰</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,color:'var(--text-bright)'}}>{g.name}</div>
                    <div style={{fontSize:11,color:'var(--text-dim)'}}>
                      {g.member_count} member{g.member_count !== 1 ? 's' : ''}
                      {g.gim_type ? ` · ${g.gim_type}` : ''}
                    </div>
                  </div>
                  <span style={{fontSize:11,color:'var(--gold)'}}>Switch →</span>
                </div>
              ))}
            </div>
          )}

          {/* Separator */}
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
            <div style={{flex:1,height:1,background:'var(--border)'}} />
            <span style={{fontSize:11,color:'var(--text-dim)'}}>Search RS3 hiscores</span>
            <div style={{flex:1,height:1,background:'var(--border)'}} />
          </div>

          <form onSubmit={handleRs3Search}>
            <div style={{display:'flex',gap:6,marginBottom:6,justifyContent:'center'}}>
              {[['regular','⚔️ Regular'],['competitive','🏆 Competitive']].map(([val,label]) => (
                <button key={val} type="button"
                  className={`btn btn-sm ${gimType === val ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setGimType(val)}>{label}</button>
              ))}
            </div>
            <div style={{display:'flex',gap:6,marginBottom:10,justifyContent:'center'}}>
              {[2,3,4,5].map(n => (
                <button key={n} type="button"
                  className={`btn btn-sm ${gimSize === n ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setGimSize(n)}>{n} members</button>
              ))}
            </div>
            <div style={{textAlign:'center'}}>
              <button type="submit" className="btn btn-secondary btn-sm" style={{minWidth:180}}
                disabled={searching || !query.trim()}>
                {searching
                  ? <><span className="spinner" style={{width:12,height:12}} /> Searching RS3…</>
                  : '🔍 Search RS3 Hiscores'}
              </button>
            </div>
          </form>

          {/* RS3 result */}
          {rs3Result && (
            <div style={{marginTop:12,padding:'12px 14px',background:'var(--bg-panel-alt)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)'}}>
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
                <div style={{color:'var(--text-dim)',fontSize:13}}>{rs3Result.error || 'Group not found on RS3 hiscores'}</div>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-ghost" onClick={() => { onClose(); onAddNew(null); }}>➕ Create new group</button>
        </div>
      </div>
    </div>
  );
}

// Group switcher — shown in sidebar when multiple groups exist
function Sidebar({ groups, activeGroupId, onSelect, onNewGroup, onSearch }) {
  return (
    <nav className="sidebar">
      <div className="nav-group">
        <div className="nav-label" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span>Groups</span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onSearch} title="Find or import a group" style={{fontSize:13}}>🔍</button>
        </div>
        {groups.map(g => (
          <div
            key={g.id}
            className={`nav-item${g.id === activeGroupId ? ' active' : ''}`}
            onClick={() => onSelect(g.id)}>
            <span className="icon">🏰</span>
            <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.name}</span>
            {g.member_count != null && (
              <span className="tag" style={{marginLeft:'auto',fontSize:10}}>{g.member_count}</span>
            )}
          </div>
        ))}
        <div className="nav-item" onClick={onSearch} style={{marginTop:4}}>
          <span className="icon">🔍</span>
          <span>Find / Add Group</span>
        </div>
      </div>
    </nav>
  );
}

function loadStoredPasswords() {
  try { return JSON.parse(localStorage.getItem('groupPasswords') || '{}'); } catch { return {}; }
}

export default function App() {
  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [group, setGroup] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [toasts, pushToast] = useToasts();
  const [myRsn, setMyRsnState] = useState(() => localStorage.getItem('myRsn') || '');
  const [groupPasswords, setGroupPasswordsState] = useState(loadStoredPasswords);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [pendingImport, setPendingImport] = useState(null); // pre-filled data from RS3 search
  const groupsRef = useRef(groups);
  groupsRef.current = groups;

  function setMyRsn(rsn) {
    setMyRsnState(rsn);
    localStorage.setItem('myRsn', rsn);
  }

  function saveGroupPassword(groupId, pw) {
    const updated = { ...loadStoredPasswords(), [groupId]: pw };
    localStorage.setItem('groupPasswords', JSON.stringify(updated));
    setGroupPasswordsState(updated);
    setGroupContext(groupId, pw);
  }

  // Keep API group context in sync with active group + stored password
  useEffect(() => {
    const pw = groupPasswords[activeGroupId] || null;
    setGroupContext(activeGroupId, pw);
  }, [activeGroupId, groupPasswords]);

  // Register 401 handler once
  useEffect(() => {
    setOnUnauthorized(() => {
      setShowPasswordModal(true);
    });
  }, []);

  async function loadGroups() {
    try {
      const data = await api.getGroups();
      setGroups(data);
      return data;
    } catch {
      return [];
    }
  }

  async function loadGroup(id) {
    if (!id) return;
    try {
      const [g, g_goals] = await Promise.all([
        api.getGroup(id),
        api.getGoals(id),
      ]);
      setGroup(g);
      setGoals(g_goals);
    } catch (err) {
      pushToast(err.message, 'error');
    }
  }

  async function refresh() {
    await loadGroup(activeGroupId);
  }

  // Initial load
  useEffect(() => {
    setLoading(true);
    loadGroups().then(data => {
      if (data.length > 0) {
        const saved = localStorage.getItem('activeGroupId');
        const id = saved && data.find(g => g.id === Number(saved)) ? Number(saved) : data[0].id;
        setActiveGroupId(id);
      }
      setLoading(false);
    });
  }, []);

  // Load group whenever activeGroupId changes
  useEffect(() => {
    if (activeGroupId) {
      localStorage.setItem('activeGroupId', activeGroupId);
      loadGroup(activeGroupId);
    }
  }, [activeGroupId]);

  function handleGroupCreated(id, password) {
    if (password) saveGroupPassword(id, password);
    setCreatingGroup(false);
    loadGroups().then(() => setActiveGroupId(id));
  }

  function selectGroup(id) {
    setActiveGroupId(id);
    setActiveTab('overview');
  }

  function handleSearchAddNew(prefill) {
    setPendingImport(prefill); // null = blank setup, or { name, type, size, members }
    setCreatingGroup(true);
  }

  async function handlePasswordSubmit(pw) {
    // Verify password before saving
    setGroupContext(activeGroupId, pw);
    await api.verifyGroup(activeGroupId); // throws if wrong
    saveGroupPassword(activeGroupId, pw);
    setShowPasswordModal(false);
    pushToast('Password saved — you can now make changes', 'success');
  }

  if (loading) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:16}}>
        <span className="spinner" style={{width:32,height:32}} />
        <span className="text-dim">Loading…</span>
      </div>
    );
  }

  const isUnlocked = !!groupPasswords[activeGroupId];

  // No group yet, or creating a new one
  if (groups.length === 0 || creatingGroup) {
    return (
      <div className="app">
        <Header group={null} onSynced={() => {}} onToast={pushToast} />
        <SetupScreen
          onCreated={handleGroupCreated}
          onToast={pushToast}
          prefill={pendingImport}
          onCancel={groups.length > 0 ? () => { setCreatingGroup(false); setPendingImport(null); } : null}
          groups={groups}
          onSwitchToGroup={id => { setCreatingGroup(false); setPendingImport(null); selectGroup(id); }}
        />
        <ToastArea toasts={toasts} />
      </div>
    );
  }

  return (
    <div className="app">
      <Header group={group} onSynced={refresh} onToast={pushToast}
        isUnlocked={isUnlocked} onLockClick={() => setShowPasswordModal(true)} />
      <div className="main-layout">
        <Sidebar
          groups={groups}
          activeGroupId={activeGroupId}
          onSelect={selectGroup}
          onNewGroup={() => setCreatingGroup(true)}
          onSearch={() => setShowSearchModal(true)}
        />
        <main className="content">
          {group ? (
            <>
              <div className="page-title">{group.name}</div>
              <div className="page-sub">
                {group.group_rsn && <span style={{marginRight:12}}>🏰 {group.group_rsn}</span>}
                <span>{group.players?.length || 0} members</span>
                {group.group_total_xp > 0 && (
                  <span style={{marginLeft:12}}>
                    · Rank: {group.group_total_xp?.toLocaleString()} total XP
                  </span>
                )}
              </div>
              <Dashboard
                group={group}
                goals={goals}
                onRefresh={refresh}
                onToast={pushToast}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onAddPlayer={() => setShowAddPlayer(true)}
                groupId={activeGroupId}
                myRsn={myRsn}
                onSetMyRsn={setMyRsn}
              />
              {showAddPlayer && (
                <AddPlayerModal
                  groupId={group.id}
                  onClose={() => setShowAddPlayer(false)}
                  onAdded={refresh}
                  onToast={pushToast}
                />
              )}
            </>
          ) : (
            <div className="empty-state" style={{marginTop:80}}>
              <span className="spinner" style={{width:24,height:24,marginBottom:16}} />
              <p>Loading group…</p>
            </div>
          )}
        </main>
      </div>
      {showPasswordModal && (
        <PasswordModal
          groupName={group?.name || 'this group'}
          onConfirm={handlePasswordSubmit}
          onCancel={() => setShowPasswordModal(false)}
        />
      )}
      {showSearchModal && (
        <SearchGroupModal
          groups={groups}
          onSelect={selectGroup}
          onAddNew={handleSearchAddNew}
          onClose={() => setShowSearchModal(false)}
          onToast={pushToast}
        />
      )}
      <ToastArea toasts={toasts} />
    </div>
  );
}

function ToastArea({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-area">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>
      ))}
    </div>
  );
}
