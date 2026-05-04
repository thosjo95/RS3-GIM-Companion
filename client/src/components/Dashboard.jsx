import React from 'react';
import PlayerCard from './PlayerCard';
import WeaknessMap from './WeaknessMap';
import DropsTab from './DropsTab';
import VaultTab from './VaultTab';
import OverviewTab from './OverviewTab';
import TipsTab from './TipsTab';

export default function Dashboard({ group, goals, onRefresh, onToast, activeTab, onTabChange, onAddPlayer, groupId, myRsn, onSetMyRsn, canWrite }) {
  const players = group?.players || [];
  const sortedPlayers = myRsn
    ? [...players].sort((a, b) => (b.rsn === myRsn) - (a.rsn === myRsn))
    : players;

  const TABS = [
    { id: 'overview',  label: '📊 Overview' },
    { id: 'drops',     label: '💎 Drops' },
    { id: 'vault',     label: '🏆 Vault' },
    { id: 'tips',      label: '💡 Tips' },
    { id: 'players',   label: '👥 Players' },
    { id: 'weakness',  label: '⚠️ Weakness Map' },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-8 mb-20" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 1 }}>
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
          ? <VaultTab players={players} groupId={groupId} goals={goals} onToast={onToast} />
          : <div className="empty-state">
              <div className="icon">🏆</div>
              <p>Add players first to use the vault.</p>
            </div>
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

      {/* PLAYERS TAB */}
      {activeTab === 'players' && (
        <div>
          <div className="flex align-center justify-between mb-16">
            <div className="section-title" style={{ marginBottom: 0 }}>
              👥 Players <span className="text-dim text-sm" style={{ fontWeight: 400, textTransform: 'none' }}>({players.length})</span>
            </div>
            {canWrite && <button className="btn btn-primary btn-sm" onClick={onAddPlayer}>➕ Add Player</button>}
          </div>
          {players.length > 0 ? (
            <div className="grid-2">
              {sortedPlayers.map(p => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  isMe={myRsn === p.rsn}
                  onSetMe={() => onSetMyRsn(myRsn === p.rsn ? '' : p.rsn)}
                  onRefresh={onRefresh}
                  onToast={onToast}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="icon">👤</div>
              <p>No players yet.</p>
              {canWrite && <button className="btn btn-primary mt-12" onClick={onAddPlayer}>➕ Add First Player</button>}
            </div>
          )}
        </div>
      )}

      {/* WEAKNESS MAP TAB */}
      {activeTab === 'weakness' && (
        players.length > 0
          ? <WeaknessMap players={players} />
          : <div className="empty-state">
              <div className="icon">⚠️</div>
              <p>Add players and sync hiscores to see the weakness map.</p>
            </div>
      )}
    </div>
  );
}
