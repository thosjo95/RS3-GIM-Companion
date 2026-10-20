import React, { useState } from 'react';
import { api } from '../../api/client';
import { normRsn } from '../../lib/rs3';
import GoalModal from '../GoalModal';
import ActivityFeed from './ActivityFeed';
import GoalItem from './GoalItem';
import { STATUS_CYCLE } from './constants';

// ── Right panel: Goals + Activity ─────────────────────────────────────────────

export default function RightPanel({ goals, players, filteredPlayerId, groupId, onRefresh, onToast, canWrite, myRsn }) {
  const [view, setView] = useState('both');
  const [showModal, setShowModal] = useState(false);
  const [prefill, setPrefill] = useState({});

  // Resolve "me" — the player whose RSN matches what the user set as their character
  const myPlayerId = myRsn
    ? (players.find(p => normRsn(p.rsn) === normRsn(myRsn))?.id ?? null)
    : null;

  const filtered = filteredPlayerId
    ? goals.filter(g => g.owner_id === filteredPlayerId || g.type === 'group')
    : goals;

  // Exclude vaulted goals from both lists — they belong in the Vault tab
  const active = filtered.filter(g => g.status !== 'complete' && g.status !== 'vaulted');
  const done   = filtered.filter(g => g.status === 'complete');

  async function cycleStatus(goal) {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(goal.status) + 1) % STATUS_CYCLE.length];
    try { await api.updateGoal(goal.id, { status: next }); onRefresh(); }
    catch (err) { onToast(err.message, 'error'); }
  }

  async function deleteGoal(id) {
    if (!confirm('Delete this goal?')) return;
    try { await api.deleteGoal(id); onRefresh(); }
    catch (err) { onToast(err.message, 'error'); }
  }

  async function updateCount(id, value) {
    try { await api.updateGoal(id, { current_value: value }); onRefresh(); }
    catch (err) { onToast(err.message, 'error'); }
  }

  async function vaultGoal(id) {
    try { await api.updateGoal(id, { status: 'vaulted' }); onRefresh(); onToast('Moved to Vault! 🏆', 'success'); }
    catch (err) { onToast(err.message, 'error'); }
  }

  const hasActivity = players.some(p => p.activities_json);

  const viewBtns = [
    { id: 'goals',    label: '🎯 Goals' },
    ...(hasActivity ? [{ id: 'activity', label: '📋 Activity' }, { id: 'both', label: 'Both' }] : []),
  ];

  function pillStyle(active) {
    return {
      fontSize: 11, padding: '3px 10px', borderRadius: 'var(--radius)',
      background: active ? 'var(--gold)' : 'transparent',
      color: active ? '#111' : 'var(--text-dim)',
      border: 'none', cursor: 'pointer', fontWeight: active ? 700 : 400,
      transition: 'background 0.15s',
    };
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg-panel-alt)', borderRadius: 'var(--radius)', padding: 3 }}>
          {viewBtns.map(v => (
            <button key={v.id} onClick={() => setView(v.id)} style={pillStyle(view === v.id)}>{v.label}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {(view === 'goals' || view === 'both') && (canWrite
          ? <button className="btn btn-primary btn-sm" onClick={() => {
              // Priority: active player card → myRsn match → nothing (GoalModal will use first player)
              const defaultOwner = filteredPlayerId ?? myPlayerId ?? null;
              setPrefill(defaultOwner ? { owner_id: defaultOwner } : {});
              setShowModal(true);
            }}>+ Add Goal</button>
          : <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>🔒 Claim to add</span>
        )}
      </div>

      {(view === 'goals' || view === 'both') && (
        <div style={{ marginBottom: view === 'both' ? 20 : 0 }}>
          {view === 'both' && <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Goals</div>}
          {active.map(g => (
            <GoalItem key={g.id} goal={g} players={players} onCycle={cycleStatus} onDelete={deleteGoal} onUpdateCount={updateCount} onVault={vaultGoal} canWrite={canWrite} />
          ))}
          {done.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ fontSize: 11, color: 'var(--text-dim)', cursor: 'pointer', userSelect: 'none', marginBottom: 6 }}>
                ✓ {done.length} completed
              </summary>
              {done.map(g => (
                <GoalItem key={g.id} goal={g} players={players} onCycle={cycleStatus} onDelete={deleteGoal} onUpdateCount={updateCount} onVault={vaultGoal} canWrite={canWrite} />
              ))}
            </details>
          )}
          {active.length === 0 && done.length === 0 && (
            <div style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
              No goals yet. {canWrite ? 'Add your first one!' : ''}
            </div>
          )}
        </div>
      )}

      {(view === 'activity' || view === 'both') && (
        <div>
          {view === 'both' && <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Recent Activity</div>}
          <ActivityFeed players={players} filteredPlayerId={filteredPlayerId} />
        </div>
      )}

      {showModal && (
        <GoalModal
          players={players}
          prefill={filteredPlayerId ? { ...prefill, owner_id: filteredPlayerId } : prefill}
          myRsn={myRsn}
          onClose={() => setShowModal(false)}
          onSaved={onRefresh}
          onToast={onToast}
        />
      )}
    </div>
  );
}
