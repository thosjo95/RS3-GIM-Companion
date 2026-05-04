import React, { useState } from 'react';
import { api } from '../api/client';

export default function Header({ group, onSynced, onToast, isUnlocked, onLockClick }) {
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

  return (
    <header className="header">
      <div className="header-logo">
        ⚔️ RS3 GIM Companion
        {group && <span>— {group.name}</span>}
      </div>
      <div className="header-right">
        {lastSync && <span className="last-sync">Last sync: {syncAgo}</span>}
        {group && (
          <button
            className="sync-btn"
            onClick={onLockClick}
            title={isUnlocked ? 'Group unlocked — click to re-enter password' : 'Click to enter group password'}
            style={{background:'transparent',border:'1px solid var(--border)',color: isUnlocked ? 'var(--gold)' : 'var(--text-dim)',minWidth:36,padding:'0 10px'}}>
            {isUnlocked ? '🔓' : '🔒'}
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
