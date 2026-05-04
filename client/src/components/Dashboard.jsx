import React, { useMemo } from 'react';
import PlayerCard from './PlayerCard';
import GoalsPanel from './GoalsPanel';
import WeaknessMap from './WeaknessMap';
import DropsTab from './DropsTab';
import VaultTab from './VaultTab';

function fmtXp(n) {
  if (!n) return '0';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(n);
}

function ContribBar({ players, field, label, fmt }) {
  const max = Math.max(...players.map(p => p[field] || 0), 1);
  return (
    <div>
      {players
        .slice()
        .sort((a, b) => (b[field] || 0) - (a[field] || 0))
        .map(p => (
          <div key={p.id} className="contrib-row">
            <div className="contrib-name">{p.rsn}</div>
            <div className="contrib-bar">
              <div className="contrib-fill" style={{ width: `${((p[field] || 0) / max) * 100}%` }} />
            </div>
            <div className="contrib-val">{fmt ? fmt(p[field] || 0) : (p[field] || 0)}</div>
          </div>
        ))}
    </div>
  );
}

export default function Dashboard({ group, goals, onRefresh, onToast, activeTab, onTabChange, onAddPlayer, groupId, myRsn, onSetMyRsn }) {
  const players = group?.players || [];
  const sortedPlayers = myRsn
    ? [...players].sort((a, b) => (b.rsn === myRsn) - (a.rsn === myRsn))
    : players;

  const groupTotals = useMemo(() => {
    let totalXp = 0, totalLevel = 0, totalQp = 0;
    for (const p of players) {
      const overall = (p.skills || []).find(s => s.skill_name === 'Overall');
      totalXp += overall?.xp || 0;
      totalLevel += overall?.level || 0;
      totalQp += p.quest_points || 0;
    }
    return { totalXp, totalLevel, totalQp };
  }, [players]);

  const avgCombat = players.length
    ? Math.round(players.reduce((a, p) => a + (p.combat_level || 0), 0) / players.length)
    : 0;

  const TABS = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'players', label: '👥 Players' },
    { id: 'goals', label: '🎯 Goals' },
    { id: 'drops', label: '💎 Drops' },
    { id: 'vault', label: '🏆 Vault' },
    { id: 'weakness', label: '⚠️ Weakness Map' },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-8 mb-20" style={{borderBottom:'1px solid var(--border)',paddingBottom:1}}>
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
        <div>
          <div className="grid-4 mb-20">
            <div className="stat-box">
              <div className="stat-label">Members</div>
              <div className="stat-value">{players.length}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Group Total XP</div>
              <div className="stat-value">{fmtXp(groupTotals.totalXp)}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Total Levels</div>
              <div className="stat-value">{groupTotals.totalLevel.toLocaleString()}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Quest Points</div>
              <div className="stat-value">{groupTotals.totalQp}</div>
              <div className="stat-sub">Avg: {players.length ? Math.round(groupTotals.totalQp / players.length) : 0}</div>
            </div>
          </div>

          <div className="grid-2 mb-20">
            {/* XP Contribution */}
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">XP Contribution</span>
              </div>
              <div className="panel-body">
                {players.length > 0 ? (
                  <ContribBar
                    players={players.map(p => ({
                      ...p,
                      _xp: (p.skills || []).find(s => s.skill_name === 'Overall')?.xp || 0,
                    }))}
                    field="_xp"
                    fmt={fmtXp}
                  />
                ) : <div className="empty-state"><p>No players yet</p></div>}
              </div>
            </div>

            {/* Quest Points Contribution */}
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Quest Points</span>
              </div>
              <div className="panel-body">
                {players.length > 0 ? (
                  <ContribBar players={players} field="quest_points" />
                ) : <div className="empty-state"><p>No players yet</p></div>}
              </div>
            </div>
          </div>

          {/* Recent Goals progress */}
          <div className="panel mb-20">
            <div className="panel-header">
              <span className="panel-title">Active Goals</span>
              <button className="btn btn-ghost btn-sm" onClick={() => onTabChange('goals')}>View all →</button>
            </div>
            <div className="panel-body">
              {goals.filter(g => g.status !== 'complete').slice(0, 5).map(goal => (
                <div key={goal.id} className="goal-item">
                  <span className={`goal-badge badge-${goal.type}`}>{goal.type}</span>
                  <div className="goal-info">
                    <div className="goal-title">{goal.title}</div>
                    {goal.owner_rsn && <div className="goal-owner">👤 {goal.owner_rsn}</div>}
                  </div>
                  <span className={`goal-status status-${goal.status}`}>
                    {goal.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
              {goals.filter(g => g.status !== 'complete').length === 0 && (
                <div className="empty-state"><p>No active goals. Add some!</p></div>
              )}
            </div>
          </div>

          {/* Group notes */}
          {group?.notes && (
            <div className="panel">
              <div className="panel-header"><span className="panel-title">Notes</span></div>
              <div className="panel-body text-dim" style={{fontSize:13}}>{group.notes}</div>
            </div>
          )}
        </div>
      )}

      {/* PLAYERS TAB */}
      {activeTab === 'players' && (
        <div>
          <div className="flex align-center justify-between mb-16">
            <div className="section-title" style={{marginBottom:0}}>
              👥 Players <span className="text-dim text-sm font-bold" style={{fontWeight:400,textTransform:'none'}}>({players.length})</span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={onAddPlayer}>➕ Add Player</button>
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
              <p>No players yet. Add your group members by RSN.</p>
              <button className="btn btn-primary mt-12" onClick={onAddPlayer}>➕ Add First Player</button>
            </div>
          )}
        </div>
      )}

      {/* GOALS TAB */}
      {activeTab === 'goals' && (
        <GoalsPanel
          goals={goals}
          players={players}
          groupId={group?.id}
          onRefresh={onRefresh}
          onToast={onToast}
        />
      )}

      {/* DROPS TAB */}
      {activeTab === 'drops' && (
        players.length > 0
          ? <DropsTab players={players} groupId={groupId} onToast={onToast} />
          : <div className="empty-state">
              <div className="icon">💎</div>
              <p>Add players first to track drops and requests.</p>
            </div>
      )}

      {/* VAULT TAB */}
      {activeTab === 'vault' && (
        players.length > 0
          ? <VaultTab players={players} groupId={groupId} onToast={onToast} />
          : <div className="empty-state">
              <div className="icon">🏆</div>
              <p>Add players first to use the vault.</p>
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
