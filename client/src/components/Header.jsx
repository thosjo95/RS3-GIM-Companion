import React, { useState } from 'react';
import { api } from '../api/client';

export default function Header({ group, onSynced, onToast, isUnlocked, isClaimed, myRsn, onLockClick, onClaimClick }) {
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

        {/* "Claim now" nudge — visible only when unclaimed */}
        {showClaimNudge && (
          <span style={{
            fontSize: 11, color: 'var(--gold)', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 4,
            animation: 'pulse 2s ease-in-out infinite',
          }}>
            Claim now →
          </span>
        )}

        {/* Lock button — always shown when a group is loaded */}
        {group && (
          <button
            className="sync-btn"
            onClick={isClaimed ? onLockClick : onClaimClick}
            title={
              !isClaimed ? 'Claim this group to protect it with a secret'
              : isUnlocked ? `Unlocked as ${myRsn || 'unknown'} — click to re-enter secret`
              : 'Enter group secret to unlock'
            }
            style={{
              background: 'transparent',
              border: `1px solid ${isUnlocked ? 'var(--gold)' : showClaimNudge ? 'var(--gold)' : 'var(--border)'}`,
              color: isUnlocked ? 'var(--gold)' : showClaimNudge ? 'var(--gold)' : 'var(--text-dim)',
              minWidth: 36, padding: '0 10px', fontSize: 13,
            }}>
            {isUnlocked ? `🔓 ${myRsn || 'Unlocked'}` : '🔒'}
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
