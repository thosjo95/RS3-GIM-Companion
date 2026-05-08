import React, { useState } from 'react';
import { api } from '../api/client';
import GroupNotesOverlay from './GroupNotesOverlay';

export default function Header({ group, onSynced, onToast, isUnlocked, isClaimed, myRsn, onLockClick, onClaimClick, onSetRsnClick, onWebhookClick, onMenuToggle, mobileMenuOpen, onTourClick }) {
  const [syncing, setSyncing] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

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
        // SQLite CURRENT_TIMESTAMP has no timezone indicator — treat as UTC
        const utcStr = lastSync.includes('T') ? lastSync : lastSync.replace(' ', 'T') + 'Z';
        const diff = Math.floor((Date.now() - new Date(utcStr)) / 60000);
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
      {/* Hamburger — mobile only */}
      {onMenuToggle && (
        <button
          className="mobile-menu-btn btn btn-ghost btn-icon"
          onClick={onMenuToggle}
          title="Toggle groups menu"
          style={{ fontSize: 18, padding: '4px 6px', flexShrink: 0 }}>
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      )}
      <div className="header-logo" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img src="/logo.svg" alt="RS3 GIM Companion" style={{ height: 30, width: 'auto', flexShrink: 0 }} />
        <span>RS3 GIM Companion</span>
        {group && <span style={{ fontWeight: 400, opacity: 0.7 }}>— {group.name}</span>}
      </div>
      <div className="header-right">
        {lastSync && <span className="last-sync">Hiscores: {syncAgo}</span>}

        {/* ── Auth indicator ── */}

        {/* Group not claimed → prompt to claim */}
        {group && !isClaimed && (
          <button
            data-tour="lock"
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
            data-tour="lock"
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
            data-tour="lock"
            className="sync-btn"
            onClick={onSetRsnClick}
            title={myRsn ? `Logged in as ${myRsn} · Click to change character` : 'Set your character name'}
            style={{
              background: 'transparent',
              border: '1px solid var(--green)',
              color: myRsn ? 'var(--green-bright)' : 'var(--text-dim)',
              padding: '0 12px', fontSize: 12, fontWeight: myRsn ? 600 : 400,
            }}>
            {myRsn || 'Set your name'}
          </button>
        )}

        {/* Group Notes — always accessible when a group is loaded */}
        {group && (
          <button
            data-tour="notes"
            className="sync-btn"
            onClick={() => setNotesOpen(n => !n)}
            title="Group Notes"
            style={{
              background: notesOpen ? 'rgba(200,168,75,0.15)' : 'transparent',
              border: `1px solid ${notesOpen ? 'var(--gold)' : 'var(--border)'}`,
              color: 'var(--gold)',
              padding: '0 10px', fontSize: 18,
            }}>
            📝
          </button>
        )}

        {/* Notifications / webhook settings — only when unlocked */}
        {group && isClaimed && isUnlocked && onWebhookClick && (
          <button
            className="sync-btn"
            onClick={onWebhookClick}
            title="Discord notification settings"
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-dim)',
              padding: '0 10px', fontSize: 14,
            }}>
            🔔
          </button>
        )}

        {/* Docs link */}
        <a
          href="https://thosjo95.github.io/RS3-GIM-Companion/"
          target="_blank"
          rel="noopener noreferrer"
          title="Documentation"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '0 10px', height: 32, borderRadius: 'var(--radius)',
            background: 'rgba(200,168,75,0.10)',
            border: '1px solid rgba(200,168,75,0.35)',
            color: 'var(--gold)', fontSize: 12, fontWeight: 600,
            textDecoration: 'none', flexShrink: 0,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,168,75,0.22)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(200,168,75,0.10)'}
        >
          📖 Docs
        </a>

        {/* Discord link */}
        <a
          href="https://discord.gg/uZT4JDdtn2"
          target="_blank"
          rel="noopener noreferrer"
          title="Join our Discord — support & feedback"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '0 10px', height: 32, borderRadius: 'var(--radius)',
            background: 'rgba(88,101,242,0.15)',
            border: '1px solid rgba(88,101,242,0.45)',
            color: '#8b9afc', fontSize: 12, fontWeight: 600,
            textDecoration: 'none', flexShrink: 0,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(88,101,242,0.28)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(88,101,242,0.15)'}
        >
          <svg width="16" height="12" viewBox="0 0 24 18" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M20.317 1.492a19.84 19.84 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 1.492a.07.07 0 0 0-.032.027C.533 6.093-.32 10.555.099 14.961a.08.08 0 0 0 .031.055 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 12.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          Discord
        </a>

        {/* Tour replay button */}
        {group && onTourClick && (
          <button
            className="sync-btn"
            onClick={onTourClick}
            title="Show feature tour"
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-dim)',
              padding: '0 10px', fontSize: 14, fontWeight: 700,
            }}>
            ?
          </button>
        )}

        {group && (
          <button data-tour="sync" className="sync-btn" onClick={syncAll} disabled={syncing}>
            {syncing ? <><span className="spinner" style={{width:14,height:14}} /> Syncing…</> : '↻ Sync All'}
          </button>
        )}
      </div>
      {notesOpen && group?.id && (
        <GroupNotesOverlay
          groupId={group.id}
          canWrite={isUnlocked}
          onToast={onToast}
          onClose={() => setNotesOpen(false)}
        />
      )}
    </header>
  );
}
