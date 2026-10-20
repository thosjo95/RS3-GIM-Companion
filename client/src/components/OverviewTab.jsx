import React, { useState, useMemo } from 'react';
import { api } from '../api/client';
import { fmtXp, MEMBER_COLORS, normRsn } from '../lib/rs3';
import EditRsnModal from './overview/EditRsnModal';
import MemberCard from './overview/MemberCard';
import SkillTable from './overview/SkillTable';
import SnapshotButton from './overview/SnapshotButton';
import { PlayerQuestTable } from './overview/QuestTables';
import GroupStats from './overview/GroupStats';
import RightPanel from './overview/RightPanel';

// ── Main export ───────────────────────────────────────────────────────────────

export default function OverviewTab({ group, goals, players, groupId, onRefresh, onToast, canWrite, myRsn, pendingRequests = [], onGoToRequests, onAddPlayer }) {
  const [selectedId, setSelectedId] = useState(null);
  const [editRsnPlayer, setEditRsnPlayer] = useState(null); // player being RSN-edited
  const [playerView, setPlayerView] = useState('skills'); // 'skills' | 'quests'

  const isUnranked = group?.gim_type === 'regular_unranked';
  const [rosterLoading, setRosterLoading] = useState(false);

  async function handleRemovePlayer(player) {
    if (!window.confirm(`Remove ${player.rsn} from this group?\n\nThis will permanently delete their skills, goals, gear and activity data.`)) return;
    try {
      await api.deletePlayer(player.id);
      await onRefresh();
      onToast?.(`${player.rsn} removed`, 'success');
    } catch (err) {
      onToast?.(err.message, 'error');
    }
  }

  async function handleRefreshRoster() {
    setRosterLoading(true);
    try {
      const result = await api.refreshRoster(groupId);
      await onRefresh();
      const parts = [];
      if (result.added?.length)   parts.push(`+${result.added.join(', +')}`);
      if (result.removed?.length) parts.push(`−${result.removed.join(', −')}`);
      onToast?.(parts.length ? `Roster updated: ${parts.join(' ')}` : 'Roster is up to date', 'success');
    } catch (err) {
      onToast?.(err.message || 'Roster refresh failed', 'error');
    } finally {
      setRosterLoading(false);
    }
  }
  const selectedPlayer = players.find(p => p.id === selectedId) ?? null;

  const groupTotals = useMemo(() => {
    let totalXp = 0, totalLevel = 0;
    for (const p of players) {
      const ov = p.skills?.find(s => s.skill_name === 'Overall');
      totalXp += ov?.xp || 0;
      totalLevel += ov?.level || 0;
    }
    return { totalXp, totalLevel };
  }, [players]);

  // Active players: weekly_xp_gain > 0 means they earned XP in the past 7 days
  const activePlayers = useMemo(
    () => players.filter(p => p.weekly_xp_gain != null && p.weekly_xp_gain > 0),
    [players]
  );
  const hasWeeklyData = players.some(p => p.weekly_xp_gain != null);

  async function syncOnePlayer(player) {
    try {
      await api.syncPlayer(player.id);
      onToast(`${player.rsn} synced`, 'success');
      onRefresh();
    } catch (err) {
      onToast(err.message || 'Sync failed', 'error');
      onRefresh(); // refresh anyway to show updated sync_error
    }
  }

  const selOverall = selectedPlayer?.skills?.find(s => s.skill_name === 'Overall');
  const selWeeklyXp = selectedPlayer?.weekly_xp_gain;

  // 4 stat boxes — same positions, last box swaps between group/player
  const statBoxes = selectedPlayer
    ? [
        { label: 'Combat Level', value: selectedPlayer.combat_level ?? '—' },
        { label: 'Total XP', value: fmtXp(selOverall?.xp) },
        { label: 'Total Level', value: selOverall?.level ?? '—' },
        {
          label: 'XP This Week',
          value: selWeeklyXp != null ? (selWeeklyXp > 0 ? `+${fmtXp(selWeeklyXp)}` : '—') : 'No data',
          dim: selWeeklyXp == null || selWeeklyXp === 0,
          tooltip: 'XP gained by this player in the past 7 days based on snapshots',
        },
      ]
    : [
        { label: 'Members', value: players.length },
        { label: 'Total XP', value: fmtXp(groupTotals.totalXp) },
        { label: 'Total Levels', value: groupTotals.totalLevel.toLocaleString() },
        {
          label: 'Active This Week',
          value: hasWeeklyData ? `${activePlayers.length} / ${players.length}` : 'Sync needed',
        },
      ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Member cards — centered, with space below the tab bar */}
      {(players.length > 0 || canWrite) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Manage members controls — shown when logged in (canWrite) */}
          {canWrite && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
              {!isUnranked && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleRefreshRoster}
                  disabled={rosterLoading}
                  title="Re-fetch member list from RS3 hiscores and apply changes"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  {rosterLoading
                    ? <><span className="spinner" style={{ width: 10, height: 10 }} /> Refreshing…</>
                    : '↻ Refresh Roster'}
                </button>
              )}
              <button className="btn btn-primary btn-sm" onClick={onAddPlayer}>
                ➕ Add Player
              </button>
            </div>
          )}

          {players.length === 0 && canWrite ? (
            <div className="empty-state" style={{ marginTop: 8 }}>
              <div className="icon">👤</div>
              <p>No members yet. Add your first player to get started.</p>
            </div>
          ) : (
            <div data-tour="members" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
              {players.map((p, i) => (
                <MemberCard
                  key={p.id}
                  player={p}
                  active={selectedId === p.id}
                  color={MEMBER_COLORS[i % MEMBER_COLORS.length]}
                  onClick={() => { setSelectedId(selectedId === p.id ? null : p.id); setPlayerView('skills'); }}
                  isMe={!!myRsn && normRsn(p.rsn) === normRsn(myRsn)}
                  canWrite={canWrite}
                  onEditRsn={setEditRsnPlayer}
                  onSync={syncOnePlayer}
                  onRemove={canWrite ? handleRemovePlayer : undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stat boxes */}
      <div className="grid-4">
        {statBoxes.map(b => (
          <div
            key={b.label}
            className="stat-box"
          >
            <div className="stat-label">{b.label}</div>
            <div className="stat-value" style={{ color: b.dim ? 'var(--text-dim)' : undefined }}>
              {b.value}
            </div>
          </div>
        ))}
      </div>

      {/* Pending item requests banner */}
      {pendingRequests.length > 0 && (
        <button
          onClick={onGoToRequests}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px', cursor: 'pointer',
            background: 'rgba(200,168,75,0.07)',
            border: '1px solid rgba(200,168,75,0.35)',
            borderRadius: 'var(--radius-lg)', textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 18, flexShrink: 0 }}>📦</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--gold)' }}>
              {pendingRequests.length} active item request{pendingRequests.length !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 8 }}>
              {[...new Set(pendingRequests.map(r => r.owner_rsn ?? r.rsn).filter(Boolean))].join(', ')}
            </span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--gold)', flexShrink: 0 }}>View in Active Goals →</span>
        </button>
      )}

      {/* Two-column content */}
      <div className="grid-2">
        {/* Left */}
        <div className="panel">
          <div className="panel-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="panel-title" style={{ flex: 1 }}>
              {selectedPlayer ? selectedPlayer.rsn : 'Group Stats'}
            </span>
            {selectedPlayer ? (
              <div style={{ display: 'flex', gap: 3 }}>
                {[
                  ['skills', 'Skills',  'https://runescape.wiki/images/Skills.png'],
                  ['quests', 'Quests',  'https://runescape.wiki/images/Quest_points.png'],
                ].map(([id, lbl, icon]) => (
                  <button key={id} type="button"
                    className={`btn btn-sm ${playerView === id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    onClick={() => setPlayerView(id)}>
                    <img src={icon} alt="" width={13} height={13}
                      style={{ imageRendering: 'crisp-edges', opacity: playerView === id ? 0.9 : 0.65, flexShrink: 0 }}
                      onError={e => { e.target.style.display = 'none'; }} />
                    {lbl}
                  </button>
                ))}
              </div>
            ) : !selectedPlayer && group ? (
              <SnapshotButton group={group} players={players} goals={goals} onToast={onToast} />
            ) : null}
          </div>
          <div className="panel-body">
            {selectedPlayer
              ? playerView === 'quests'
                ? <PlayerQuestTable player={selectedPlayer} />
                : selectedPlayer.skills?.length > 0
                  ? <SkillTable player={selectedPlayer} />
                  : <div className="empty-state"><p>No data — sync this player first.</p></div>
              : players.length > 0
                ? <GroupStats players={players} goals={goals} groupId={groupId} />
                : <div className="empty-state"><p>No players yet.</p></div>}
          </div>
        </div>

        {/* Right: Goals + Activity */}
        <div className="panel">
          <div className="panel-body">
            <RightPanel
              goals={goals}
              players={players}
              filteredPlayerId={selectedId}
              groupId={groupId}
              onRefresh={onRefresh}
              onToast={onToast}
              canWrite={canWrite}
              myRsn={myRsn}
            />
          </div>
        </div>
      </div>

      {/* Group notes */}
      {group?.notes && (
        <div className="panel">
          <div className="panel-header"><span className="panel-title">Notes</span></div>
          <div className="panel-body text-dim" style={{ fontSize: 13 }}>{group.notes}</div>
        </div>
      )}

      {/* Edit RSN modal */}
      {editRsnPlayer && (
        <EditRsnModal
          player={editRsnPlayer}
          onClose={() => setEditRsnPlayer(null)}
          onSaved={() => { setEditRsnPlayer(null); onRefresh(); }}
          onToast={onToast}
        />
      )}
    </div>
  );
}
