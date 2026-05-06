import React from 'react';
import VaultTab from './VaultTab';
import OverviewTab from './OverviewTab';
import LeaderboardsTab from './LeaderboardsTab';
import AchievementsTab from './AchievementsTab';
import GoalsTab from './GoalsTab';

export default function Dashboard({ group, goals, pendingRequests, onRefresh, onToast, activeTab, onTabChange, onAddPlayer, groupId, myRsn, canWrite }) {
  const players = group?.players || [];

  const TABS = [
    { id: 'overview',      label: '📊 Overview' },
    { id: 'goals',         label: '🎯 Goals' },
    { id: 'vault',         label: '🏆 Group Vault' },
    { id: 'achievements',  label: '📋 Achievement Diaries' },
    { id: 'leaderboards',  label: '🏅 Leaderboards' },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-8 mb-20 tab-bar-scroll" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 1 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className="btn btn-ghost"
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
          onGoToRequests={() => onTabChange('goals')}
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
    </div>
  );
}
