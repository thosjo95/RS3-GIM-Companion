import React, { useState } from 'react';
import { api } from '../api/client';

export default function Header({ group, onSynced, onToast, isUnlocked, isClaimed, myRsn, onLockClick, onClaimClick, onSetRsnClick }) {
  const [syncing, setSyncing] = useState(false);

  async function syncAll() {
    if (!group?.id) return;
    setSyncing(true);
    try {
      const results = await api.syncAll(group.id);
      const failed = results.filter(r => !r.success);
      if (failed.length === 0) {
        onToast(`All ${results.length} players synced`, 'success');
      } else {
        onToast(`${results.length - failed.length} synced, ${failed.length} failed`, 'error');
      }
      onSynced();
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSyncing(false);
    }
  }

  const lastSync = group?.players
    ?.map(p => p.last_synced)
    .filter(Boolean)
    .sort()
    .reverse()[0];

  const syncAgo = lastSync
    ? (() => {
        const diff = Math.floor((Date.now() - new Date(lastSync)) / 60000);
        if (diff < 1) return 'just now';
        if (diff < 60) return `${diff}m ago`;
        const h = Math.floor(diff / 60);
        if (h < 24) return `${h}h ago`;
        return `${Math.floor(h / 24)}d ago`;
      })()
    : 'never';

  const showClaimNudge = group && !isClaimed && !isUnlocked;

  return (
    <header className="header">
      <div className="header-logo">
        ⚔️ RS3 GIM Companion
        {group && <span>— {group.name}</span>}
      </div>
      <div className="header-right">
        {lastSync && <span className="last-sync">Last sync: {syncAgo}</span>}

        {/* ── Auth indicator ── */}

        {/* Group not claimed → prompt to claim */}
        {group && !isClaimed && (
          <button
            className="sync-btn"
            onClick={onClaimClick}
            title="Claim this group to protect it with a secret and enable editing"
            style={{
              background: 'transparent',
              border: '1px solid var(--gold)',
              color: 'var(--gold)',
              padding: '0 12px', fontSize: 12, fontWeight: 600,
              animation: 'pulse 2s ease-in-out infinite',
            }}>
            🔒 Claim group
          </button>
        )}

        {/* Claimed but not yet unlocked on this browser → unlock button */}
        {group && isClaimed && !isUnlocked && (
          <button
            className="sync-btn"
            onClick={onLockClick}
            title="Enter your group secret to enable editing"
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-dim)',
              padding: '0 12px', fontSize: 12,
            }}>
            🔒 Unlock
          </button>
        )}

        {/* Already unlocked → show player badge (no action required) */}
        {group && isClaimed && isUnlocked && (
          <button
            className="sync-btn"
            onClick={onSetRsnClick}
            title={myRsn ? `Logged in as ${myRsn} · Click to change character` : 'Set your character name'}
            style={{
              background: 'transparent',
              border: '1px solid var(--green)',
              color: myRsn ? 'var(--green-bright)' : 'var(--text-dim)',
              padding: '0 12px', fontSize: 12, fontWeight: myRsn ? 600 : 400,
            }}>
            👤 {myRsn || 'Set your name'}
          </button>
        )}

        {group && (
          <button className="sync-btn" onClick={syncAll} disabled={syncing}>
            {syncing ? <><span className="spinner" style={{width:14,height:14}} /> Syncing…</> : '↻ Sync All'}
          </button>
        )}
      </div>
    </header>
  );
}
