import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api/client';
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

// Setup screen — shown when no group exists
function SetupScreen({ onCreated, onToast }) {
  const [step, setStep] = useState('search'); // 'search' | 'preview' | 'manual' | 'setting-up'
  const [gimType, setGimType] = useState('regular');
  const [gimSize, setGimSize] = useState(5);
  const [groupName, setGroupName] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [manualRsns, setManualRsns] = useState([]);
  const [searching, setSearching] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');

  async function handleSearch(e) {
    e.preventDefault();
    if (!groupName.trim()) return;
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
    setStep('setting-up');
    setSyncProgress(`Adding ${rsns.length} members and syncing hiscores…`);
    try {
      const result = await api.setupGroup({ name: groupName.trim(), type: gimType, size: gimSize, member_rsns: rsns });
      if (result.failed?.length) {
        onToast(`Setup done. ${result.failed.length} member(s) couldn't sync from RS3.`, 'error');
      }
      onCreated(result.id);
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
            <div style={{fontSize:12,color:'var(--text-dim)',marginBottom:16}}>
              Hiscores will be synced automatically for all members.
            </div>
            <div style={{display:'flex',gap:8,flexDirection:'column'}}>
              <button className="btn btn-primary" onClick={() => handleConfirm(lookupResult.members.map(m => m.rsn))}>
                ✓ Confirm & Start Tracking
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setManualRsns(lookupResult.members.map(m => m.rsn)); setStep('manual'); }}>
                Edit members manually instead
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setStep('search')}>← Back</button>
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
            <div style={{display:'flex',gap:8,flexDirection:'column',marginTop:16}}>
              <button className="btn btn-primary" onClick={() => handleConfirm(manualRsns)}>
                ✓ Confirm & Start Tracking
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setStep('search')}>← Back</button>
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

            <div className="form-group" style={{marginBottom:0}}>
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
          </div>
        </form>
      </div>
    </div>
  );
}

// Group switcher — shown in sidebar when multiple groups exist
function Sidebar({ groups, activeGroupId, onSelect, onNewGroup }) {
  return (
    <nav className="sidebar">
      <div className="nav-group">
        <div className="nav-label">Groups</div>
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
        <div className="nav-item" onClick={onNewGroup} style={{marginTop:4}}>
          <span className="icon">➕</span>
          <span>New Group</span>
        </div>
      </div>
    </nav>
  );
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

  function setMyRsn(rsn) {
    setMyRsnState(rsn);
    localStorage.setItem('myRsn', rsn);
  }

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

  function handleGroupCreated(id) {
    setCreatingGroup(false);
    loadGroups().then(() => setActiveGroupId(id));
  }

  function selectGroup(id) {
    setActiveGroupId(id);
    setActiveTab('overview');
  }

  if (loading) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:16}}>
        <span className="spinner" style={{width:32,height:32}} />
        <span className="text-dim">Loading…</span>
      </div>
    );
  }

  // No group yet, or creating a new one
  if (groups.length === 0 || creatingGroup) {
    return (
      <div className="app">
        <Header group={null} onSynced={() => {}} onToast={pushToast} />
        <SetupScreen onCreated={handleGroupCreated} onToast={pushToast} />
        <ToastArea toasts={toasts} />
      </div>
    );
  }

  return (
    <div className="app">
      <Header group={group} onSynced={refresh} onToast={pushToast} />
      <div className="main-layout">
        <Sidebar
          groups={groups}
          activeGroupId={activeGroupId}
          onSelect={selectGroup}
          onNewGroup={() => setCreatingGroup(true)}
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
