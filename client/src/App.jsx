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

// Setup screen — shown when no group exists
function SetupScreen({ onCreated, onToast }) {
  const [name, setName] = useState('');
  const [groupRsn, setGroupRsn] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const group = await api.createGroup({ name: name.trim(), group_rsn: groupRsn.trim(), notes: notes.trim() });
      onCreated(group.id);
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="setup-screen">
      <div style={{fontSize:56,marginBottom:12}}>⚔️</div>
      <h1>RS3 GIM Companion</h1>
      <p>Track your Group Ironman progress — hiscores, XP gains, goals, and weakness maps for the whole group.</p>
      <div className="panel" style={{width:'100%',maxWidth:420,textAlign:'left'}}>
        <div className="panel-header"><span className="panel-title">Create Your Group</span></div>
        <form onSubmit={handleSubmit}>
          <div className="panel-body">
            <div className="form-group">
              <label className="form-label">Group Name *</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Iron Brotherhood" required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Group RSN <span className="text-muted">(optional)</span></label>
              <input className="form-input" value={groupRsn} onChange={e => setGroupRsn(e.target.value)}
                placeholder="Your GIM group name in-game" />
            </div>
            <div className="form-group" style={{marginBottom:0}}>
              <label className="form-label">Notes <span className="text-muted">(optional)</span></label>
              <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Goals, strategy, anything you want pinned to the dashboard..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
              {saving ? <><span className="spinner" style={{width:12,height:12}}/> Creating…</> : '🏰 Create Group'}
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
