import React, { useState, useEffect, useRef } from 'react';
import { api, setGroupContext, setOnUnauthorized } from './api/client';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import AddPlayerModal from './components/AddPlayerModal';
import WebhookSettings from './components/WebhookSettings';
import TourOverlay from './components/TourOverlay';
import useToasts from './hooks/useToasts';
import { loadStoredPasswords, loadMyGroupIds, saveMyGroupIds, loadFavoriteIds, saveFavoriteIds } from './lib/localPrefs';
import GimTypeLabel from './components/common/GimTypeLabel';
import ToastArea from './components/common/ToastArea';
import AnnouncementModal, { shouldShowAnnouncement } from './components/common/AnnouncementModal';
import SetRsnModal from './components/modals/SetRsnModal';
import UnlockModal from './components/modals/UnlockModal';
import ClaimModal from './components/modals/ClaimModal';
import SetupScreen from './components/setup/SetupScreen';
import SearchGroupModal from './components/groups/SearchGroupModal';
import Sidebar from './components/groups/Sidebar';

export default function App() {
  const [allGroups, setAllGroups] = useState([]);
  const [myGroupIds, setMyGroupIdsState] = useState(loadMyGroupIds);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [group, setGroup] = useState(null);
  const [goals, setGoals] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [toasts, pushToast] = useToasts();
  const [myRsn, setMyRsnState] = useState('');
  const [groupPasswords, setGroupPasswordsState] = useState(loadStoredPasswords);
  const [favoriteGroupIds, setFavoriteGroupIdsState] = useState(loadFavoriteIds);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showRsnModal, setShowRsnModal] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [pendingImport, setPendingImport] = useState(null); // pre-filled data from RS3 search
  const [showTour, setShowTour]             = useState(false);
  const tourShownRef                        = useRef(false); // prevent re-triggering on subsequent refreshes
  const [tabTourReplayKey, setTabTourReplayKey] = useState(0); // increment to replay current tab's tour
  const [showAnnouncement, setShowAnnouncement] = useState(shouldShowAnnouncement);

  const TAB_TOUR_IDS = ['goals', 'vault', 'achievements', 'leaderboards'];
  function handleTourClick() {
    if (TAB_TOUR_IDS.includes(activeTab)) {
      setTabTourReplayKey(k => k + 1);
    } else {
      setShowTour(true);
    }
  }

  // Only show groups this browser has explicitly added, favorites first
  const groups = allGroups
    .filter(g => myGroupIds.includes(g.id))
    .sort((a, b) => {
      const aFav = favoriteGroupIds.includes(a.id) ? 0 : 1;
      const bFav = favoriteGroupIds.includes(b.id) ? 0 : 1;
      return aFav - bFav;
    });

  const groupsRef = useRef(groups);
  groupsRef.current = groups;

  // Normalise an RSN: collapse any unicode whitespace (NBSP etc.) to regular space and trim
  function normalizeRsn(rsn) {
    return (rsn || '').replace(/\s/g, ' ').trim();
  }

  function setMyRsn(rsn) {
    const clean = normalizeRsn(rsn);
    setMyRsnState(clean);
    if (activeGroupId) localStorage.setItem(`myRsn_${activeGroupId}`, clean);
  }

  function pinGroup(id) {
    const updated = [...new Set([...loadMyGroupIds(), id])];
    saveMyGroupIds(updated);
    setMyGroupIdsState(updated);
  }

  function removeFromSidebar(id) {
    const updated = loadMyGroupIds().filter(x => x !== id);
    saveMyGroupIds(updated);
    setMyGroupIdsState(updated);
    // Also remove from favorites
    const updatedFavs = loadFavoriteIds().filter(x => x !== id);
    saveFavoriteIds(updatedFavs);
    setFavoriteGroupIdsState(updatedFavs);
    // If it was the active group, switch to first remaining
    if (id === activeGroupId) {
      const remaining = allGroups.filter(g => updated.includes(g.id));
      setActiveGroupId(remaining[0]?.id ?? null);
    }
  }

  function toggleFavorite(id) {
    const current = loadFavoriteIds();
    const updated = current.includes(id)
      ? current.filter(x => x !== id)
      : [...current, id];
    saveFavoriteIds(updated);
    setFavoriteGroupIdsState(updated);
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
      setAllGroups(data);
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
      // Derive pending item requests from goals (category = 'item_request', not yet complete/vaulted)
      // so the Overview banner and Goals tab stay in sync without a separate API call.
      const pendingItemGoals = g_goals.filter(
        g => g.category === 'item_request' && g.status !== 'complete' && g.status !== 'vaulted'
      );
      setPendingRequests(pendingItemGoals);
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
      const pinnedIds = loadMyGroupIds();
      const myGroups  = data.filter(g => pinnedIds.includes(g.id));
      const saved     = localStorage.getItem('activeGroupId');
      const savedId   = saved ? Number(saved) : null;

      if (myGroups.length > 0) {
        // Prefer last-used pinned group; fall back to first pinned
        const id = savedId && myGroups.find(g => g.id === savedId) ? savedId : myGroups[0].id;
        setActiveGroupId(id);
      } else if (savedId && data.find(g => g.id === savedId)) {
        // User was browsing an un-pinned group — restore it so they land on the dashboard
        setActiveGroupId(savedId);
      }
      setLoading(false);
    });
  }, []);

  // Load group and per-group RSN whenever activeGroupId changes
  useEffect(() => {
    if (activeGroupId) {
      localStorage.setItem('activeGroupId', activeGroupId);
      loadGroup(activeGroupId).then(() => {
        // Show tour on first-ever visit (once per browser)
        if (!tourShownRef.current && !localStorage.getItem('tourCompleted')) {
          tourShownRef.current = true;
          // Small delay so the UI settles before the overlay appears
          setTimeout(() => setShowTour(true), 600);
        }
      });
      setMyRsnState((localStorage.getItem(`myRsn_${activeGroupId}`) || '').replace(/\s/g, ' ').trim());
    }
  }, [activeGroupId]);

  function handleGroupCreated(id) {
    pinGroup(id);
    setCreatingGroup(false);
    loadGroups().then(() => setActiveGroupId(id));
  }

  // Browse a group without auto-pinning — just view it
  function selectGroup(id) {
    setActiveGroupId(id);
    setActiveTab('overview');
    setShowMobileSidebar(false);
  }

  // Explicitly save a group to "Your groups" sidebar
  function saveGroup(id) {
    pinGroup(id);
    pushToast('⭐ Saved to your groups!', 'success');
  }

  function handleSearchAddNew(prefill) {
    setPendingImport(prefill); // null = blank setup, or { name, type, size, members }
    setCreatingGroup(true);
  }

  async function handlePasswordSubmit(pw, rsn) {
    setGroupContext(activeGroupId, pw);
    await api.verifyGroup(activeGroupId); // throws if wrong
    saveGroupPassword(activeGroupId, pw);
    pinGroup(activeGroupId); // unlock = save to "Your groups"
    if (rsn) setMyRsn(rsn);
    setShowPasswordModal(false);
    pushToast('Unlocked! 🔓', 'success');
    // If no RSN was chosen, prompt them to pick one now
    if (!rsn) setTimeout(() => setShowRsnModal(true), 300);
  }

  async function handleClaimSubmit(rsn) {
    const result = await api.claimGroup(activeGroupId);
    saveGroupPassword(activeGroupId, result.secret);
    pinGroup(activeGroupId); // claim = save to "Your groups"
    if (rsn) setMyRsn(rsn);
    await loadGroups(); // refresh to get updated is_claimed
    return result; // returns { secret } so modal can display it
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
  // canWrite: must have a stored password (works for both claimed and future unclaimed groups you own)
  const canWrite = isUnlocked;

  // No group yet, or creating a new one
  // — allow browsing a non-pinned group (activeGroupId set) to fall through to the main layout
  if (creatingGroup || (groups.length === 0 && !activeGroupId)) {
    return (
      <div className="app">
        <Header group={null} onSynced={() => {}} onToast={pushToast} />
        <SetupScreen
          onCreated={handleGroupCreated}
          onToast={pushToast}
          prefill={pendingImport}
          onCancel={groups.length > 0 || activeGroupId ? () => { setCreatingGroup(false); setPendingImport(null); } : null}
          groups={allGroups}
          onSwitchToGroup={id => { setCreatingGroup(false); setPendingImport(null); selectGroup(id); }}
          onStar={saveGroup}
        />
        {showAnnouncement && <AnnouncementModal onClose={() => setShowAnnouncement(false)} />}
        <ToastArea toasts={toasts} />
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        group={group}
        onSynced={refresh}
        onToast={pushToast}
        isUnlocked={isUnlocked}
        isClaimed={!!group?.is_claimed}
        myRsn={myRsn}
        onLockClick={() => setShowPasswordModal(true)}
        onClaimClick={() => setShowClaimModal(true)}
        onSetRsnClick={() => setShowRsnModal(true)}
        onWebhookClick={() => setShowWebhookModal(true)}
        onMenuToggle={() => setShowMobileSidebar(s => !s)}
        mobileMenuOpen={showMobileSidebar}
        onTourClick={handleTourClick}
      />
      <div className="main-layout">
        {/* Mobile overlay — tapping closes the sidebar */}
        <div
          className={`mobile-overlay${showMobileSidebar ? ' active' : ''}`}
          onClick={() => setShowMobileSidebar(false)}
        />
        <Sidebar
          groups={groups}
          activeGroupId={activeGroupId}
          onSelect={selectGroup}
          onNewGroup={() => setCreatingGroup(true)}
          onSearch={() => { setShowSearchModal(true); setShowMobileSidebar(false); }}
          favoriteGroupIds={favoriteGroupIds}
          isOpen={showMobileSidebar}
        />
        <main className="content">
          {/* ── Guest banner: viewing a group that isn't saved to your sidebar ── */}
          {group && !myGroupIds.includes(activeGroupId) && (
            <div style={{
              display:'flex', alignItems:'center', gap:12, flexWrap:'wrap',
              padding:'10px 16px', marginBottom:16,
              background:'rgba(200,168,75,0.08)', border:'1px solid var(--gold-dark)',
              borderRadius:'var(--radius)', fontSize:13,
            }}>
              <span style={{flex:1, color:'var(--text-dim)', minWidth:200}}>
                👁️ Browsing <strong style={{color:'var(--text-bright)'}}>{group.name}</strong> as a guest — read-only.
              </span>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => saveGroup(activeGroupId)}>
                ⭐ Save to your groups
              </button>
            </div>
          )}
          {group ? (
            <>
              <div className="page-title">{group.name}</div>
              <div className="page-sub">
                {/* Group type badge */}
                {(() => {
                  const type = group.gim_type ?? 'regular';
                  if (type === 'custom') {
                    return (
                      <span title="Custom Group" style={{ marginRight: 10, display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: 'middle' }}>
                        <GimTypeLabel type="custom" size={16} />
                      </span>
                    );
                  }
                  const src = type === 'competitive'
                    ? 'https://runescape.wiki/images/Competitive_Group_Ironman_badge.png'
                    : 'https://runescape.wiki/images/Group_Ironman_badge.png';
                  const label = type === 'competitive' ? 'Competitive GIM'
                    : type === 'regular_unranked' ? 'Unranked GIM'
                    : 'Regular GIM';
                  return (
                    <span title={label} style={{ marginRight: 10, display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: 'middle' }}>
                      <img src={src} alt={label} width={16} height={16} style={{ imageRendering: 'crisp-edges', verticalAlign: 'middle' }} />
                      {type === 'regular_unranked' && (
                        <span style={{ fontSize: 10, color: 'var(--text-dim)', fontStyle: 'italic' }}>Unranked</span>
                      )}
                    </span>
                  );
                })()}
                {group.group_rsn && <span style={{marginRight:12}}>{group.group_rsn}</span>}
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
                pendingRequests={pendingRequests}
                onRefresh={refresh}
                onToast={pushToast}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onAddPlayer={() => setShowAddPlayer(true)}
                groupId={activeGroupId}
                myRsn={myRsn}
                onSetMyRsn={setMyRsn}
                canWrite={canWrite}
                tabTourReplayKey={tabTourReplayKey}
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
      {showWebhookModal && activeGroupId && (
        <WebhookSettings
          groupId={activeGroupId}
          onClose={() => setShowWebhookModal(false)}
          onToast={pushToast}
        />
      )}
      {showRsnModal && (
        <SetRsnModal
          group={group}
          myRsn={myRsn}
          onConfirm={rsn => { setMyRsn(rsn); setShowRsnModal(false); }}
          onCancel={() => setShowRsnModal(false)}
        />
      )}
      {showPasswordModal && (
        <UnlockModal
          group={group}
          onConfirm={handlePasswordSubmit}
          onCancel={() => setShowPasswordModal(false)}
        />
      )}
      {showClaimModal && (
        <ClaimModal
          group={group}
          onConfirm={handleClaimSubmit}
          onCancel={() => setShowClaimModal(false)}
        />
      )}
      {showSearchModal && (
        <SearchGroupModal
          groups={groups}
          allDbGroups={allGroups}
          onSelect={selectGroup}
          onAddNew={handleSearchAddNew}
          onClose={() => setShowSearchModal(false)}
          onToast={pushToast}
          onRemove={removeFromSidebar}
          onFavorite={toggleFavorite}
          favoriteGroupIds={favoriteGroupIds}
          onStar={saveGroup}
        />
      )}
      {/* Tour waits until the announcement has been closed */}
      {showTour && !showAnnouncement && (
        <TourOverlay
          onComplete={() => {
            localStorage.setItem('tourCompleted', '1');
            setShowTour(false);
          }}
        />
      )}
      {showAnnouncement && <AnnouncementModal onClose={() => setShowAnnouncement(false)} />}
      <ToastArea toasts={toasts} />
    </div>
  );
}

