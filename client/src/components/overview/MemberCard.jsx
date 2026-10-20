import React, { useState } from 'react';

// ── Member card ───────────────────────────────────────────────────────────────

export default function MemberCard({ player, active, color, onClick, isMe, onEditRsn, onSync, canWrite, onRemove }) {
  const [avatarError, setAvatarError] = useState(false);
  const [syncing,     setSyncing]     = useState(false);
  const overall = player.skills?.find(s => s.skill_name === 'Overall');
  const hasSyncError = !!player.sync_error;

  async function handleSync(e) {
    e.stopPropagation();
    setSyncing(true);
    try { await onSync(player); } finally { setSyncing(false); }
  }
  const borderColor = active ? color : hasSyncError ? 'var(--red-bright)' : isMe ? 'var(--gold)' : 'var(--border)';
  const avatarUrl = `https://secure.runescape.com/m=avatar-rs/${encodeURIComponent(player.rsn)}/chat.png`;

  return (
    <div onClick={onClick} style={{
      cursor: 'pointer', width: 140, position: 'relative',
      padding: '14px 16px',
      background: active ? 'var(--bg-panel)' : 'var(--bg-panel-alt)',
      border: `2px solid ${borderColor}`,
      borderRadius: 'var(--radius-lg)',
      boxShadow: hasSyncError ? '0 0 8px rgba(192,64,64,0.3)' : isMe && !active ? `0 0 10px ${color}33` : undefined,
      transition: 'border-color 0.15s, background 0.15s',
      userSelect: 'none',
      flexShrink: 0,
    }}>
      {/* Sync error badge */}
      {hasSyncError && (
        <div
          title={`Sync error: ${player.sync_error}\nClick ✎ to correct the RSN`}
          style={{
            position: 'absolute', top: 6, right: 6,
            fontSize: 12, lineHeight: 1,
            color: 'var(--red-bright)',
          }}>⚠</div>
      )}

      <div style={{
        width: 40, height: 40, borderRadius: '50%', background: color,
        overflow: 'hidden', marginBottom: 10, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {!avatarError ? (
          <img
            src={avatarUrl}
            alt={player.rsn}
            onError={() => setAvatarError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontWeight: 800, fontSize: 16, color: '#111' }}>
            {player.rsn[0].toUpperCase()}
          </span>
        )}
      </div>
      <div style={{ fontWeight: 700, fontSize: 13, color: active ? color : 'var(--text-bright)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {player.rsn}
      </div>
      {overall
        ? <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 1, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text-dim)' }}>
              <img src="https://runescape.wiki/images/Multicombat.png" alt="Combat"
                width={12} height={12} style={{ imageRendering: 'crisp-edges', opacity: 0.85 }}
                onError={e => { e.target.style.display = 'none'; }} />
              {player.combat_level ?? '?'}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text-dim)' }}>
              <img src="https://runescape.wiki/images/Statistics.png" alt="Total Level"
                width={12} height={12} style={{ imageRendering: 'crisp-edges', opacity: 0.85 }}
                onError={e => { e.target.style.display = 'none'; }} />
              {overall.level}
            </span>
            {player.quest_points > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text-dim)' }}>
                <img src="https://runescape.wiki/images/Quest_points.png" alt="Quest Points"
                  width={12} height={12} style={{ imageRendering: 'crisp-edges', opacity: 0.85 }}
                  onError={e => { e.target.style.display = 'none'; }} />
                {player.quest_points}
              </span>
            )}
            {player.rune_score > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text-dim)' }}>
                <img src="https://runescape.wiki/images/RuneScore.png" alt="RuneScore"
                  width={12} height={12} style={{ imageRendering: 'crisp-edges', opacity: 0.85 }}
                  onError={e => { e.target.style.display = 'none'; }} />
                {player.rune_score.toLocaleString()}
              </span>
            )}
          </div>
        : <div style={{ fontSize: 11, color: hasSyncError ? 'var(--red-bright)' : 'var(--text-dim)' }}>
            {hasSyncError ? 'Sync failed' : 'Not synced'}
          </div>}
      {isMe && (
        <div style={{
          display: 'inline-block', marginTop: 5,
          fontSize: 9, fontWeight: 800, letterSpacing: '0.5px',
          background: 'var(--gold)', color: '#111',
          borderRadius: 4, padding: '1px 5px',
        }}>YOU</div>
      )}

      {/* Sync + Edit RSN buttons — visible when active or on sync error */}
      {(hasSyncError || active) && (
        <div style={{ position: 'absolute', bottom: 6, right: 6, display: 'flex', gap: 2 }}>
          {onSync && (
            <button
              title="Sync hiscores"
              onClick={handleSync}
              disabled={syncing}
              style={{
                background: 'none', border: 'none', cursor: syncing ? 'default' : 'pointer',
                fontSize: 13, color: hasSyncError ? 'var(--red-bright)' : 'var(--text-dim)',
                padding: '2px 4px', borderRadius: 4, lineHeight: 1,
                opacity: syncing ? 0.5 : 1,
              }}>
              {syncing ? <span className="spinner" style={{ width: 11, height: 11, display: 'inline-block' }} /> : '↻'}
            </button>
          )}
          {canWrite && onEditRsn && (
            <button
              title="Edit RSN"
              onClick={e => { e.stopPropagation(); onEditRsn(player); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: hasSyncError ? 'var(--red-bright)' : 'var(--text-dim)',
                padding: '2px 4px', borderRadius: 4, lineHeight: 1,
              }}>✎</button>
          )}
          {onRemove && (
            <button
              title={`Remove ${player.rsn} from group`}
              onClick={e => { e.stopPropagation(); onRemove(player); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: 'var(--red-bright)',
                padding: '2px 4px', borderRadius: 4, lineHeight: 1,
              }}>✕</button>
          )}
        </div>
      )}
    </div>
  );
}
