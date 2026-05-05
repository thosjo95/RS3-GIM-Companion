import React from 'react';
import DropsTab from './DropsTab';
import VaultTab from './VaultTab';
import OverviewTab from './OverviewTab';
import TipsTab from './TipsTab';
import LeaderboardsTab from './LeaderboardsTab';
import AchievementsTab from './AchievementsTab';

export default function Dashboard({ group, goals, pendingRequests, onRefresh, onToast, activeTab, onTabChange, onAddPlayer, groupId, myRsn, canWrite }) {
  const players = group?.players || [];

  const TABS = [
    { id: 'overview',      label: '📊 Overview' },
    { id: 'drops',         label: '💎 Items & Drops' },
    { id: 'vault',         label: '🏆 Group Vault' },
    { id: 'tips',          label: '💡 Tips and Milestones' },
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
          onGoToRequests={() => onTabChange('drops')}
        />
      )}

      {/* DROPS TAB */}
      {activeTab === 'drops' && (
        players.length > 0
          ? <DropsTab players={players} groupId={groupId} onToast={onToast} canWrite={canWrite} />
          : <div className="empty-state">
              <div className="icon">💎</div>
              <p>Add players first to track drops and requests.</p>
            </div>
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

      {/* TIPS TAB */}
      {activeTab === 'tips' && (
        <TipsTab
          players={players}
          groupId={groupId}
          onRefresh={onRefresh}
          onToast={onToast}
          canWrite={canWrite}
        />
      )}

    </div>
  );
}
