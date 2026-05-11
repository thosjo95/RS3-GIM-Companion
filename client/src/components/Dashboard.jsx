import React, { useState, useEffect, useRef, useCallback } from 'react';

function CustomGroupBanner({ groupId }) {
  const [dismissed, setDismissed] = useState(false);
  const dismiss = useCallback(() => {
    localStorage.setItem(`customGroupBanner_${groupId}`, '1');
    setDismissed(true);
  }, [groupId]);
  if (dismissed) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 14px', marginBottom: 14,
      background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.3)',
      borderRadius: 'var(--radius)', fontSize: 13,
    }}>
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>ℹ️</span>
      <span style={{ flex: 1, color: 'var(--text-dim)', lineHeight: 1.5 }}>
        <strong style={{ color: '#38bdf8' }}>Custom Group</strong> — for regular RS3 players tracking shared progress together.
        Stats sync from the RS3 hiscores just like a GIM group.{' '}
        <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>
          Note: activity feed &amp; drops require a public RuneMetrics profile.
        </span>
      </span>
      <button
        onClick={dismiss}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 16, flexShrink: 0, padding: 0 }}
        title="Dismiss">✕</button>
    </div>
  );
}
import VaultTab from './VaultTab';
import OverviewTab from './OverviewTab';
import LeaderboardsTab from './LeaderboardsTab';
import AchievementsTab from './AchievementsTab';
import GoalsTab from './GoalsTab';
import TourOverlay from './TourOverlay';

// ── Per-tab tour step definitions ─────────────────────────────────────────────

const TAB_TOURS = {
  goals: [
    {
      target: null,
      title: '🎯 Goals Tab',
      body: "This is your group's planning board. Let's walk through the key parts — it only takes a moment!",
    },
    {
      target: '[data-tour="goals-sections"]',
      title: '💡 Goal Browser vs Active Goals',
      body: 'Switch between the Goal Browser (220+ pre-built suggestions across quests, skills, bosses, and items) and Active Goals (your group\'s live tracking board).',
    },
    {
      target: '[data-tour="goals-browser"]',
      title: '📚 Goal Browser',
      body: 'Browse pre-built suggestions filtered by category and priority. Each card shows XP requirements, wiki links, and player readiness. Hit Add to move any suggestion to your active board.',
    },
    {
      target: '[data-tour="goals-filters"]',
      title: '🔍 Filters & Views',
      body: 'On the Active Goals board, filter by player, category, priority, or scope. Toggle between 📋 Board (Kanban columns) and ☰ List views to suit your style.',
    },
  ],

  vault: [
    {
      target: null,
      title: '🏆 Vault & Gear Loadouts',
      body: "Two panels in one: the Group Vault for logging drops, and Gear Loadouts for tracking each player's equipment. Here's a quick tour.",
    },
    {
      target: '[data-tour="vault-panel"]',
      title: '🏆 Group Vault',
      body: 'Every drop your group has logged shown as an icon tile grid. Dupe indicators highlight when multiple members own the same item. Click any tile to see who has it, when they got it, and its GE value.',
    },
    {
      target: '[data-tour="vault-gear"]',
      title: '⚔️ Gear Loadouts',
      body: "Track each player's equipped gear across 5 combat styles: Melee, Ranged, Magic, Necromancy, and Hybrid. Requirements are verified against the RS3 wiki so you can see who's ready to upgrade.",
    },
  ],

  achievements: [
    {
      target: null,
      title: '📋 Achievement Diaries',
      body: 'Track diary completion across all 14 RS3 regions × 4 tiers (Easy → Elite). Auto-detected from RuneMetrics, or toggle manually.',
    },
    {
      target: '[data-tour="achievements-progress"]',
      title: '📊 Player Progress',
      body: "Each player gets a summary card showing how many diaries they've completed out of the total. The colour-coded bar updates as completions are recorded.",
    },
    {
      target: '[data-tour="achievements-view"]',
      title: '🗂️ Grid vs By Player',
      body: 'Grid view shows all regions × tiers in one table with coloured dots per player. By Player view focuses on a single player\'s completion status across every tier.',
    },
  ],

  leaderboards: [
    {
      target: null,
      title: '🏅 Leaderboards',
      body: "Five automatic leaderboards built from your group's synced activity feeds and hiscores — no manual tracking needed.",
    },
    {
      target: '[data-tour="leaderboards-nav"]',
      title: '📑 Leaderboard Sections',
      body: "Browse 5 categories: 🥇 Firsts (who hit a milestone first), 📈 Milestones (XP goals), ⚔️ Boss Kills, 🗺️ Clue Scrolls, and 🎓 Skill Mastery (99s/120s per player).",
    },
    {
      target: '[data-tour="leaderboards-panel"]',
      title: '🤖 Auto-Updated Data',
      body: 'Firsts and Milestones are detected from RuneMetrics activity feeds (updates every ~2 hours). Boss kills, clue counts, and XP pull from RS3 hiscores every time you sync (~5 min delay).',
    },
  ],
};

const TAB_TOUR_KEY = {
  goals:         'tourCompleted_goals',
  vault:         'tourCompleted_vault',
  achievements:  'tourCompleted_achievements',
  leaderboards:  'tourCompleted_leaderboards',
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard({ group, goals, pendingRequests, onRefresh, onToast, activeTab, onTabChange, onAddPlayer, groupId, myRsn, canWrite, tabTourReplayKey }) {
  const players = group?.players || [];
  const isCustomGroup = group?.gim_type === 'custom';

  const [tabTour, setTabTour]       = useState(null); // null | 'goals' | 'vault' | ...
  const [goalsJumpKey, setGoalsJumpKey] = useState(0); // incremented to force GoalsTab → Active Goals
  const shownRef                    = useRef({});      // tracks which tours have fired this session
  const prevReplayKey               = useRef(0);

  const TABS = [
    { id: 'overview',      label: '📊 Overview' },
    { id: 'goals',         label: '🎯 Goals',               tour: 'tab-goals' },
    { id: 'vault',         label: '🏆 Group Vault',         tour: 'tab-vault' },
    { id: 'achievements',  label: '📋 Achievement Diaries', tour: 'tab-achievements' },
    { id: 'leaderboards',  label: '🏅 Leaderboards',        tour: 'tab-leaderboards' },
  ];

  // Auto-trigger per-tab tour on first visit
  useEffect(() => {
    if (!TAB_TOURS[activeTab]) return;
    if (shownRef.current[activeTab]) return;
    if (localStorage.getItem(TAB_TOUR_KEY[activeTab])) return;
    shownRef.current[activeTab] = true;
    const t = setTimeout(() => setTabTour(activeTab), 500);
    return () => clearTimeout(t);
  }, [activeTab]);

  // Replay signal from the global ? button in the header
  useEffect(() => {
    if (!tabTourReplayKey || tabTourReplayKey === prevReplayKey.current) return;
    prevReplayKey.current = tabTourReplayKey;
    if (TAB_TOURS[activeTab]) {
      shownRef.current[activeTab] = true; // prevent auto-trigger from re-firing
      setTabTour(activeTab);
    }
  }, [tabTourReplayKey, activeTab]);

  function completeTour(tab) {
    localStorage.setItem(TAB_TOUR_KEY[tab], '1');
    setTabTour(null);
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-8 mb-20 tab-bar-scroll" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 1 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className="btn btn-ghost"
            {...(t.tour ? { 'data-tour': t.tour } : {})}
            style={{
              borderBottom: activeTab === t.id ? '2px solid var(--gold)' : '2px solid transparent',
              borderRadius: 0,
              color: activeTab === t.id ? 'var(--gold)' : 'var(--text-dim)',
              paddingBottom: 8,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Custom group info banner — dismissable */}
      {isCustomGroup && !localStorage.getItem(`customGroupBanner_${groupId}`) && (
        <CustomGroupBanner groupId={groupId} />
      )}

      {/* Tab content — universal top gap */}
      <div style={{ paddingTop: 12 }}>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <OverviewTab
          group={group}
          goals={goals}
          players={players}
          groupId={groupId}
          onRefresh={onRefresh}
          onToast={onToast}
          canWrite={canWrite}
          myRsn={myRsn}
          pendingRequests={pendingRequests ?? []}
          onGoToRequests={() => { onTabChange('goals'); setGoalsJumpKey(k => k + 1); }}
          onAddPlayer={onAddPlayer}
        />
      )}

      {/* GOALS TAB */}
      {activeTab === 'goals' && (
        <GoalsTab
          group={group}
          goals={goals}
          players={players}
          groupId={groupId}
          onRefresh={onRefresh}
          onToast={onToast}
          canWrite={canWrite}
          myRsn={myRsn}
          jumpToActiveKey={goalsJumpKey}
        />
      )}

      {/* VAULT TAB */}
      {activeTab === 'vault' && (
        players.length > 0
          ? <VaultTab players={players} groupId={groupId} goals={goals} onToast={onToast} canWrite={canWrite} myRsn={myRsn} />
          : <div className="empty-state">
              <div className="icon">🏆</div>
              <p>Add players first to use the vault.</p>
            </div>
      )}

      {/* ACHIEVEMENTS TAB */}
      {activeTab === 'achievements' && (
        <AchievementsTab
          players={players}
          groupId={groupId}
          canWrite={canWrite}
          onToast={onToast}
        />
      )}

      {/* LEADERBOARDS TAB */}
      {activeTab === 'leaderboards' && (
        <LeaderboardsTab players={players} groupId={groupId} />
      )}

      </div>{/* end tab content */}

      {/* Per-tab tour overlay */}
      {tabTour && (
        <TourOverlay
          key={tabTour}
          steps={TAB_TOURS[tabTour]}
          onComplete={() => completeTour(tabTour)}
        />
      )}
    </div>
  );
}
