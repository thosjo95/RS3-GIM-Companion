import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { api } from '../api/client';
import { GOAL_SUGGESTIONS } from '../data/goalSuggestions';
import GoalModal from './GoalModal';

// ── Constants ─────────────────────────────────────────────────────────────────

const SKILL_ICONS = {
  Attack:       'https://runescape.wiki/images/Attack.png',
  Defence:      'https://runescape.wiki/images/Defence.png',
  Strength:     'https://runescape.wiki/images/Strength.png',
  Constitution: 'https://runescape.wiki/images/Constitution.png',
  Ranged:       'https://runescape.wiki/images/Ranged.png',
  Prayer:       'https://runescape.wiki/images/Prayer.png',
  Magic:        'https://runescape.wiki/images/Magic.png',
  Cooking:      'https://runescape.wiki/images/Cooking.png',
  Woodcutting:  'https://runescape.wiki/images/Woodcutting.png',
  Fletching:    'https://runescape.wiki/images/Fletching.png',
  Fishing:      'https://runescape.wiki/images/Fishing.png',
  Firemaking:   'https://runescape.wiki/images/Firemaking.png',
  Crafting:     'https://runescape.wiki/images/Crafting.png',
  Smithing:     'https://runescape.wiki/images/Smithing.png',
  Mining:       'https://runescape.wiki/images/Mining.png',
  Herblore:     'https://runescape.wiki/images/Herblore.png',
  Agility:      'https://runescape.wiki/images/Agility.png',
  Thieving:     'https://runescape.wiki/images/Thieving.png',
  Slayer:       'https://runescape.wiki/images/Slayer.png',
  Farming:      'https://runescape.wiki/images/Farming.png',
  Runecrafting: 'https://runescape.wiki/images/Runecrafting.png',
  Hunter:       'https://runescape.wiki/images/Hunter.png',
  Construction: 'https://runescape.wiki/images/Construction.png',
  Summoning:    'https://runescape.wiki/images/Summoning.png',
  Dungeoneering:'https://runescape.wiki/images/Dungeoneering.png',
  Divination:   'https://runescape.wiki/images/Divination.png',
  Invention:    'https://runescape.wiki/images/Invention.png',
  Archaeology:  'https://runescape.wiki/images/Archaeology.png',
  Necromancy:   'https://runescape.wiki/images/Necromancy.png',
};

function SkillIcon({ name, size = 18 }) {
  const url = SKILL_ICONS[name];
  if (!url) return null;
  return (
    <img
      src={url} alt={name} title={name}
      style={{ width: size, height: size, verticalAlign: 'middle', imageRendering: 'auto' }}
    />
  );
}

const SKILL_ORDER = [
  'Attack', 'Strength', 'Defence', 'Constitution', 'Ranged', 'Prayer',
  'Magic', 'Summoning', 'Necromancy',
  'Cooking', 'Woodcutting', 'Fletching', 'Fishing', 'Firemaking', 'Crafting',
  'Smithing', 'Mining', 'Herblore', 'Agility', 'Thieving', 'Slayer',
  'Farming', 'Runecrafting', 'Hunter', 'Construction',
  'Dungeoneering', 'Divination', 'Invention', 'Archaeology',
];

const MEMBER_COLORS = ['#c8a84b', '#7eb8f7', '#7ef7a8', '#f77e7e', '#d07ef7', '#f7c97e'];

const STATUS_CYCLE = ['not_started', 'in_progress', 'blocked', 'complete'];
const STATUS_LABELS = {
  not_started: 'Not started',
  in_progress: 'In progress',
  blocked: 'Blocked',
  complete: '✓ Done',
};
const STATUS_COLORS = {
  not_started: 'var(--text-dim)',
  in_progress: 'var(--gold)',
  blocked: 'var(--red-bright)',
  complete: 'var(--green-bright)',
};

// RS3 XP table (levels 1-120)
const XP_TABLE = (() => {
  const t = [0, 0];
  for (let lvl = 2; lvl <= 120; lvl++) {
    const pts = Math.floor(lvl - 1 + 300 * Math.pow(2, (lvl - 1) / 7));
    t[lvl] = Math.floor(t[lvl - 1] + pts / 4);
  }
  return t;
})();
function xpForLevel(lvl) { return XP_TABLE[Math.min(Math.max(lvl, 1), 120)] ?? 0; }

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtXp(n) {
  if (!n) return '0';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(n);
}

function fmtNum(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(n);
}

function parseDetails(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

function parseRMDate(str) {
  if (!str) return 0;
  try { return new Date(str.replace(/(\d+)-(\w+)-(\d+)/, '$2 $1 $3')).getTime(); } catch { return 0; }
}

function wikiUrl(name) {
  return `https://runescape.wiki/w/${encodeURIComponent((name || '').replace(/ /g, '_'))}`;
}

function getPlayerSkill(players, ownerId, skillName) {
  return players.find(p => p.id === ownerId)?.skills?.find(s => s.skill_name === skillName);
}

// Normalize RSN for comparison — collapses any whitespace variant (non-breaking space,
// unicode replacement char, etc.) to a regular space before lowercasing.
function normRsn(s) {
  // Collapse ALL unicode whitespace variants (NBSP U+00A0, thin-space, etc.) to a plain space
  return (s || '').replace(/\s/g, ' ').trim().toLowerCase();
}

// ── Edit RSN modal ────────────────────────────────────────────────────────────

function EditRsnModal({ player, onClose, onSaved, onToast }) {
  const [rsn, setRsn] = useState(player.rsn);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    // normRsn collapses NBSP / unicode spaces so the DB always gets a clean value
    const trimmed = normRsn(rsn);
    if (!trimmed || trimmed === player.rsn) { onClose(); return; }
    setSaving(true);
    setError('');
    try {
      await api.updatePlayer(player.id, { rsn: trimmed });
      // Re-sync immediately with the corrected name
      try { await api.syncPlayer(player.id); } catch {}
      onToast(`RSN updated to "${trimmed}"`, 'success');
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const lastError = player.sync_error;

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 360 }}>
        <div className="modal-header">
          <span className="modal-title">✎ Edit RSN — {player.rsn}</span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {lastError && (
              <div style={{
                marginBottom: 12, padding: '8px 12px', borderRadius: 'var(--radius)',
                background: 'rgba(192,64,64,0.1)', border: '1px solid var(--red)',
                fontSize: 12, color: 'var(--red-bright)',
              }}>
                ⚠ Last sync error: {lastError}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Correct RuneScape Name</label>
              <input
                className="form-input"
                value={rsn}
                onChange={e => { setRsn(e.target.value); setError(''); }}
                placeholder="Exact in-game name"
                autoFocus
                required
              />
              {error
                ? <div className="text-xs mt-8" style={{ color: 'var(--red-bright)' }}>{error}</div>
                : <div className="text-xs text-dim mt-8">
                    Must match the RS3 hiscores exactly. Stats will re-sync automatically.
                  </div>}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving || !rsn.trim()}>
              {saving ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Saving…</> : '✓ Save & Sync'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Member card ───────────────────────────────────────────────────────────────

function MemberCard({ player, active, color, onClick, isMe, onEditRsn, onSync, canWrite, onRemove }) {
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

      {/* Remove player button — unranked groups only */}
      {onRemove && (
        <button
          title={`Remove ${player.rsn} from group`}
          onClick={e => { e.stopPropagation(); onRemove(player); }}
          style={{
            position: 'absolute', top: 4, left: 4,
            background: 'rgba(192,64,64,0.18)',
            border: '1px solid rgba(192,64,64,0.4)',
            borderRadius: 4, cursor: 'pointer',
            fontSize: 10, fontWeight: 700,
            color: 'var(--red-bright)',
            padding: '1px 5px', lineHeight: 1,
          }}>✕</button>
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
        </div>
      )}
    </div>
  );
}

// ── Skill table ───────────────────────────────────────────────────────────────

function SkillTable({ player }) {
  const skillsMap = Object.fromEntries((player.skills || []).map(s => [s.skill_name, s]));
  const overall = skillsMap['Overall'];
  return (
    <div>
      {overall && (
        <div style={{ display: 'flex', gap: 20, padding: '10px 12px', background: 'var(--bg-panel-alt)', borderRadius: 'var(--radius)', marginBottom: 12, fontSize: 13 }}>
          <span><strong style={{ color: 'var(--gold)' }}>{overall.level}</strong> <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>Total lvl</span></span>
          <span><strong style={{ color: 'var(--gold)' }}>{fmtXp(overall.xp)}</strong> <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>XP</span></span>
          {overall.rank > 0 && <span><strong style={{ color: 'var(--text-bright)' }}>#{overall.rank.toLocaleString()}</strong> <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>Rank</span></span>}
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ color: 'var(--text-dim)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            <th align="left" style={{ padding: '4px 6px 8px', fontWeight: 600 }}>Skill</th>
            <th align="right" style={{ padding: '4px 6px 8px', fontWeight: 600 }}>Level</th>
            <th align="right" style={{ padding: '4px 6px 8px', fontWeight: 600 }}>XP</th>
            <th align="right" style={{ padding: '4px 6px 8px', fontWeight: 600 }}>Rank</th>
          </tr>
        </thead>
        <tbody>
          {SKILL_ORDER.filter(n => skillsMap[n]).map((name, i) => {
            const s = skillsMap[name];
            const elite = s.level >= 120, maxed = s.level >= 99;
            return (
              <tr key={name} style={{ borderTop: '1px solid var(--border)', background: i % 2 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                <td style={{ padding: '5px 6px' }}>
                  <span style={{ marginRight: 5 }}><SkillIcon name={name} /></span>
                  <span style={{ color: maxed ? 'var(--gold)' : 'var(--text)' }}>{name}</span>
                </td>
                <td align="right" style={{ padding: '5px 6px', fontWeight: 600, color: elite ? 'var(--gold)' : maxed ? 'var(--text-bright)' : 'var(--text)' }}>
                  {(elite || maxed) ? '★ ' : ''}{s.level}
                </td>
                <td align="right" style={{ padding: '5px 6px', color: 'var(--text-dim)' }}>{s.xp?.toLocaleString() ?? '—'}</td>
                <td align="right" style={{ padding: '5px 6px', color: 'var(--text-dim)' }}>{s.rank > 0 ? `#${s.rank.toLocaleString()}` : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Snapshot / Share button ───────────────────────────────────────────────────

function SnapshotButton({ group, players, goals, onToast }) {
  const [sharing, setSharing] = useState(false);
  const canvasRef = useRef(null);

  function drawSnapshot() {
    const W = 800, H = 420;
    const canvas = document.createElement('canvas');
    canvas.width = W * 2; canvas.height = H * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    // Background
    ctx.fillStyle = '#0d0b14';
    ctx.fillRect(0, 0, W, H);

    // Gold border
    ctx.strokeStyle = '#c8a84b44';
    ctx.lineWidth = 1;
    ctx.strokeRect(12, 12, W - 24, H - 24);

    // Header
    ctx.fillStyle = '#c8a84b';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(group.name ?? 'Group Snapshot', 28, 50);
    ctx.fillStyle = '#8a80a0';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`RS3 GIM Companion · groupiron.com · ${new Date().toLocaleDateString()}`, 28, 70);

    // Divider
    ctx.strokeStyle = '#2e2840';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(28, 82); ctx.lineTo(W - 28, 82); ctx.stroke();

    // Player stats
    const colW = (W - 56) / Math.max(players.length, 1);
    players.forEach((p, i) => {
      const x = 28 + i * colW;
      const overall = p.skills?.find(s => s.skill_name === 'Overall');
      const COLORS = ['#c8a84b', '#7eb8f7', '#7ef7a8', '#f77e7e', '#d07ef7', '#f7c97e'];
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillText(p.rsn, x, 112);
      ctx.fillStyle = '#e2ddf0';
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(`Cmb ${p.combat_level ?? '?'}`, x, 132);
      ctx.fillStyle = '#8a80a0';
      ctx.fillText(`Lvl ${overall?.level ?? '?'}`, x, 150);
      const xpStr = overall?.xp ? (overall.xp >= 1e9 ? (overall.xp/1e9).toFixed(2)+'B' : overall.xp >= 1e6 ? (overall.xp/1e6).toFixed(1)+'M' : String(overall.xp)) : '—';
      ctx.fillText(`${xpStr} XP`, x, 168);
    });

    // Goals summary
    ctx.strokeStyle = '#2e2840';
    ctx.beginPath(); ctx.moveTo(28, 188); ctx.lineTo(W - 28, 188); ctx.stroke();
    const active = goals.filter(g => g.status === 'in_progress').length;
    const done   = goals.filter(g => g.status === 'complete' || g.status === 'vaulted').length;
    const total  = goals.length;
    ctx.fillStyle = '#c8a84b';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('Goals', 28, 212);
    ctx.fillStyle = '#8a80a0';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`${done}/${total} complete · ${active} in progress`, 28, 230);

    // Progress bar
    const barW = W - 56;
    ctx.fillStyle = '#1c1826';
    ctx.fillRect(28, 238, barW, 8);
    if (total > 0) {
      ctx.fillStyle = '#4caf50';
      ctx.fillRect(28, 238, Math.round((done / total) * barW), 8);
    }

    // Active quest goals list
    const questGoals = goals.filter(g => g.category === 'quest' && g.status !== 'complete' && g.status !== 'vaulted').slice(0, 8);
    if (questGoals.length > 0) {
      ctx.fillStyle = '#c8a84b';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText('Active Quest Goals', 28, 268);
      ctx.fillStyle = '#8a80a0';
      ctx.font = '11px system-ui, sans-serif';
      questGoals.forEach((g, i) => {
        ctx.fillText(`• ${g.title}`, 28, 286 + i * 16);
      });
    }

    // Footer
    ctx.fillStyle = '#2e2840';
    ctx.fillRect(0, H - 32, W, 32);
    ctx.fillStyle = '#8a80a0';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText('RS3 GIM Companion · groupiron.com · Not affiliated with Jagex Ltd.', 28, H - 12);

    return canvas;
  }

  function download() {
    const canvas = drawSnapshot();
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${(group.name ?? 'group').replace(/\s+/g, '-')}-snapshot.png`;
    a.click();
    onToast?.('Snapshot saved!', 'success');
  }

  async function shareToDiscord() {
    setSharing(true);
    try {
      const canvas = drawSnapshot();
      const imageData = canvas.toDataURL('image/png');
      await api.shareSnapshot(group.id, { imageData });
      onToast?.('Snapshot shared to Discord!', 'success');
    } catch (err) {
      onToast?.(err.message || 'Share failed', 'error');
    } finally {
      setSharing(false);
    }
  }

  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          fontSize: 11, padding: '3px 10px', borderRadius: 'var(--radius)',
          background: 'rgba(200,168,75,0.10)', border: '1px solid rgba(200,168,75,0.3)',
          color: 'var(--gold)', cursor: 'pointer', fontWeight: 600,
        }}>
        📸 Share
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 100,
          background: 'var(--bg-panel)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', overflow: 'hidden', minWidth: 160,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
          <button onClick={() => { download(); setOpen(false); }} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 12, background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-panel-alt)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            ⬇ Download PNG
          </button>
          <button onClick={() => { shareToDiscord(); setOpen(false); }} disabled={sharing} style={{ width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 12, background: 'none', border: 'none', color: 'var(--text)', cursor: sharing ? 'default' : 'pointer', opacity: sharing ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 8 }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-panel-alt)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            {sharing ? '…' : '📤'} Post to Discord
          </button>
        </div>
      )}
    </div>
  );
}

// ── Quest helpers ─────────────────────────────────────────────────────────────

const DIFF_LABELS_MAP = { 0: 'Novice', 1: 'Intermediate', 2: 'Experienced', 3: 'Master', 4: 'Grandmaster' };
const DIFF_COLORS     = { 0: '#7ef7a8', 1: '#7eb8f7', 2: '#f7c97e', 3: '#f77e7e', 4: '#d07ef7' };

function QuestStatusIcon({ status }) {
  if (status === 'COMPLETED')  return <span style={{ color: 'var(--green-bright)', fontWeight: 700, fontSize: 14 }} title="Completed">✓</span>;
  if (status === 'STARTED')    return <span style={{ color: 'var(--gold)',         fontWeight: 600, fontSize: 13 }} title="Started">~</span>;
  return <span style={{ color: 'var(--border)', fontSize: 16, lineHeight: 1 }} title="Not started">·</span>;
}

function DiffBadge({ difficulty }) {
  const label = DIFF_LABELS_MAP[difficulty] ?? '?';
  const color = DIFF_COLORS[difficulty]     ?? '#8a80a0';
  return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 3,
      background: color + '22', color, whiteSpace: 'nowrap', flexShrink: 0 }}>
      {label}
    </span>
  );
}

// ── Per-player quest table (shown in the player detail panel) ─────────────────

function PlayerQuestTable({ player }) {
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [diffFilter,   setDiffFilter]   = useState('');

  const quests = useMemo(() => {
    try { return player.quests_json ? JSON.parse(player.quests_json) : []; } catch { return []; }
  }, [player.quests_json]);

  const sorted = useMemo(() =>
    [...quests].sort((a, b) => a.difficulty !== b.difficulty ? a.difficulty - b.difficulty : a.title.localeCompare(b.title)),
    [quests]);

  const filtered = useMemo(() => {
    let list = sorted;
    if (search.trim())    list = list.filter(q => q.title.toLowerCase().includes(search.toLowerCase()));
    if (diffFilter !== '') list = list.filter(q => q.difficulty === parseInt(diffFilter, 10));
    if (statusFilter === 'completed')   list = list.filter(q => q.status === 'COMPLETED');
    else if (statusFilter === 'started')     list = list.filter(q => q.status === 'STARTED');
    else if (statusFilter === 'not_started') list = list.filter(q => q.status === 'NOT_STARTED');
    return list;
  }, [sorted, search, diffFilter, statusFilter]);

  if (!quests.length) {
    return (
      <div className="empty-state">
        <div className="icon">📜</div>
        <p>No quest data yet.</p>
        <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          Requires a public RuneMetrics profile. Sync {player.rsn} to fetch quest data.
        </p>
      </div>
    );
  }

  const completed = quests.filter(q => q.status === 'COMPLETED');
  const totalQP   = completed.reduce((s, q) => s + (q.questPoints || 0), 0);

  return (
    <div>
      {/* Summary row */}
      <div style={{ display: 'flex', gap: 20, padding: '10px 12px', background: 'var(--bg-panel-alt)', borderRadius: 'var(--radius)', marginBottom: 12, fontSize: 13 }}>
        <span><strong style={{ color: 'var(--gold)' }}>{completed.length}</strong> <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>/ {quests.length} Completed</span></span>
        <span><strong style={{ color: 'var(--gold)' }}>{totalQP}</strong> <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>QP earned</span></span>
        <span><strong style={{ color: 'var(--text-bright)' }}>{filtered.length}</strong> <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>showing</span></span>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="form-input" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search quests…"
          style={{ flex: '1 1 130px', maxWidth: 200, fontSize: 12, padding: '4px 8px', height: 28 }} />
        {['all', 'completed', 'started', 'not_started'].map(s => (
          <button key={s} type="button"
            className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 10 }} onClick={() => setStatusFilter(s)}>
            {s === 'all' ? 'All' : s === 'completed' ? '✓ Done' : s === 'started' ? '~ Started' : '· Not started'}
          </button>
        ))}
      </div>

      {/* Quest table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ color: 'var(--text-dim)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            <th align="left"   style={{ padding: '4px 6px 8px', fontWeight: 600 }}>Quest</th>
            <th align="center" style={{ padding: '4px 6px 8px', fontWeight: 600 }}>QP</th>
            <th align="center" style={{ padding: '4px 6px 8px', fontWeight: 600 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((q, i) => (
            <tr key={q.title} style={{ borderTop: '1px solid var(--border)', background: i % 2 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
              <td style={{ padding: '5px 6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <DiffBadge difficulty={q.difficulty} />
                  <a href={`https://runescape.wiki/w/${encodeURIComponent(q.title.replace(/ /g, '_'))}`}
                    target="_blank" rel="noreferrer"
                    style={{ color: q.status === 'COMPLETED' ? 'var(--text-bright)' : 'var(--text)', textDecoration: 'none' }}>
                    {q.title}
                  </a>
                </div>
              </td>
              <td align="center" style={{ padding: '5px 6px', color: 'var(--gold)', fontWeight: 600 }}>{q.questPoints}</td>
              <td align="center" style={{ padding: '5px 6px' }}><QuestStatusIcon status={q.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Group-wide quest grid (shown in the Quests subtab of GroupStats) ───────────

function QuestsPanel({ players, colorMap }) {
  const [search,       setSearch]       = useState('');
  const [diffFilter,   setDiffFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('not_all');
  const [playerFilter, setPlayerFilter] = useState(null);

  // Parse each player's quest data
  const playerQuests = useMemo(() => players.map(p => {
    let questList = [];
    try { questList = p.quests_json ? JSON.parse(p.quests_json) : []; } catch {}
    const questMap = new Map(questList.map(q => [q.title.toLowerCase(), q]));
    return { ...p, questList, questMap };
  }), [players]);

  const hasAnyData = playerQuests.some(p => p.questList.length > 0);

  // Build master quest list (union across all players, sorted by difficulty → title)
  const masterQuests = useMemo(() => {
    const seen = new Map();
    for (const p of playerQuests) {
      for (const q of p.questList) {
        if (!seen.has(q.title.toLowerCase())) seen.set(q.title.toLowerCase(), q);
      }
    }
    return [...seen.values()].sort((a, b) =>
      a.difficulty !== b.difficulty ? a.difficulty - b.difficulty : a.title.localeCompare(b.title));
  }, [playerQuests]);

  const visiblePlayers = useMemo(() =>
    playerFilter ? playerQuests.filter(p => p.id === playerFilter) : playerQuests.filter(p => p.questList.length > 0),
    [playerQuests, playerFilter]);

  const filteredQuests = useMemo(() => {
    let list = masterQuests;
    if (search.trim())     list = list.filter(q => q.title.toLowerCase().includes(search.toLowerCase()));
    if (diffFilter !== '') list = list.filter(q => q.difficulty === parseInt(diffFilter, 10));

    const checkPlayers = playerFilter
      ? playerQuests.filter(p => p.id === playerFilter)
      : playerQuests.filter(p => p.questList.length > 0);

    if (statusFilter === 'not_all') {
      list = list.filter(q => checkPlayers.some(p => (p.questMap.get(q.title.toLowerCase())?.status ?? 'NOT_STARTED') !== 'COMPLETED'));
    } else if (statusFilter === 'group_done') {
      list = list.filter(q => checkPlayers.length > 0 && checkPlayers.every(p => p.questMap.get(q.title.toLowerCase())?.status === 'COMPLETED'));
    }
    return list;
  }, [masterQuests, search, diffFilter, statusFilter, playerFilter, playerQuests]);

  if (!hasAnyData) {
    return (
      <div className="empty-state">
        <div className="icon">📜</div>
        <p>Quest data not yet loaded.</p>
        <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          Sync your players — quest lists are fetched from RuneMetrics (public profile required).
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="form-input" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search quests…"
          style={{ flex: '1 1 140px', maxWidth: 220, fontSize: 12, padding: '4px 8px', height: 28 }} />
        {/* Difficulty filter */}
        {[['', 'All'], ['0','Novice'], ['1','Intermediate'], ['2','Experienced'], ['3','Master'], ['4','Grandmaster']].map(([val, lbl]) => (
          <button key={val} type="button"
            className={`btn btn-sm ${diffFilter === val ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 10 }} onClick={() => setDiffFilter(val)}>{lbl}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Status filter */}
        {[['all','All quests'], ['not_all','Not all done'], ['group_done','Group complete']].map(([val, lbl]) => (
          <button key={val} type="button"
            className={`btn btn-sm ${statusFilter === val ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 10 }} onClick={() => setStatusFilter(val)}>{lbl}
          </button>
        ))}
        {/* Player filter pills */}
        {playerQuests.filter(p => p.questList.length > 0).map(p => (
          <button key={p.id} type="button"
            className={`btn btn-sm ${playerFilter === p.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 10, ...(playerFilter !== p.id && { color: colorMap[p.id] }) }}
            onClick={() => setPlayerFilter(playerFilter === p.id ? null : p.id)}>
            {p.rsn}
          </button>
        ))}
        <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 4 }}>{filteredQuests.length} quests</span>
      </div>

      {/* Grid table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
          <thead>
            <tr>
              <th align="left" style={{ padding: '4px 8px 8px 4px', fontWeight: 600, color: 'var(--text-dim)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4px', position: 'sticky', left: 0, background: 'var(--bg-panel)', zIndex: 3, minWidth: 200 }}>Quest</th>
              <th align="center" style={{ padding: '4px 6px 8px', fontWeight: 600, color: 'var(--text-dim)', fontSize: 10, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>QP</th>
              {visiblePlayers.map(p => (
                <th key={p.id} align="center" style={{ padding: '4px 10px 8px', fontWeight: 700, color: colorMap[p.id] ?? 'var(--text)', fontSize: 11, whiteSpace: 'nowrap' }}>{p.rsn}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredQuests.map((quest, rowIdx) => {
              const altBg = rowIdx % 2 ? 'rgba(255,255,255,0.018)' : 'transparent';
              const key   = quest.title.toLowerCase();
              return (
                <tr key={quest.title} style={{ borderTop: '1px solid var(--border)', background: altBg }}>
                  <td style={{ padding: '5px 8px 5px 4px', position: 'sticky', left: 0, background: altBg || 'var(--bg-panel)', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <DiffBadge difficulty={quest.difficulty} />
                      <a href={`https://runescape.wiki/w/${encodeURIComponent(quest.title.replace(/ /g, '_'))}`}
                        target="_blank" rel="noreferrer"
                        style={{ color: 'var(--text)', textDecoration: 'none' }}
                        onClick={e => e.stopPropagation()}>
                        {quest.title}
                      </a>
                    </div>
                  </td>
                  <td align="center" style={{ padding: '5px 6px', color: 'var(--gold)', fontWeight: 600, fontSize: 11 }}>{quest.questPoints}</td>
                  {visiblePlayers.map(p => (
                    <td key={p.id} align="center" style={{ padding: '5px 10px' }}>
                      <QuestStatusIcon status={p.questMap.get(key)?.status} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Group stats (tabbed) ──────────────────────────────────────────────────────

function GroupStats({ players, goals, groupId }) {
  const [tab, setTab] = useState('skills');
  const colorMap = useMemo(() => Object.fromEntries(players.map((p, i) => [p.id, MEMBER_COLORS[i % MEMBER_COLORS.length]])), [players]);

  const skillLeaders = useMemo(() => {
    const map = {};
    for (const skill of SKILL_ORDER) {
      let best = null;
      for (const p of players) {
        const s = p.skills?.find(sk => sk.skill_name === skill);
        if (s && (!best || s.level > best.level)) best = { rsn: p.rsn, id: p.id, level: s.level };
      }
      if (best) map[skill] = best;
    }
    return map;
  }, [players]);

  const leadCounts = useMemo(() => {
    const counts = Object.fromEntries(players.map(p => [p.id, 0]));
    for (const leader of Object.values(skillLeaders)) {
      if (counts[leader.id] !== undefined) counts[leader.id]++;
    }
    return counts;
  }, [skillLeaders, players]);

  // Skills that require other skills to unlock (not unlocked via quests)
  const SKILL_UNLOCK_REQS = {
    Invention:     { Crafting: 80, Divination: 80, Smithing: 80 },
    Dungeoneering: { Attack: 1, Strength: 1, Defence: 1, Magic: 1, Ranged: 1 }, // no hard reqs, placeholder
  };

  // Skills tab — skill filter/spotlight
  const [skillInput, setSkillInput] = useState('');
  const filteredSkill = useMemo(
    () => SKILL_ORDER.find(s => s.toLowerCase() === skillInput.toLowerCase().trim()) ?? '',
    [skillInput],
  );

  // Gaps tab filter state
  const [gapsSkill, setGapsSkill] = useState('');       // '' = all skills
  const [gapsLevel, setGapsLevel] = useState('');       // '' = use GOAL_SUGGESTIONS threshold
  const [gapsSort,  setGapsSort]  = useState('affected-desc'); // 'affected-desc' | 'level-desc' | 'level-asc'
  const GAPS_SORT_CYCLE = ['affected-desc', 'level-desc', 'level-asc'];
  const GAPS_SORT_LABEL = { 'affected-desc': '👥 Most affected', 'level-desc': '⬆ Level: high → low', 'level-asc': '⬇ Level: low → high' };

  // Fetch per-skill XP gains from snapshots API
  const GAIN_PERIODS = [
    { label: 'Day',   days: 1  },
    { label: 'Week',  days: 7  },
    { label: 'Month', days: 30 },
    { label: 'Year',  days: 365 },
  ];
  const [gainPeriod, setGainPeriod] = useState(1);
  const [skillGains, setSkillGains] = useState([]);
  const [gainsLoading, setGainsLoading] = useState(false);
  useEffect(() => {
    if (!groupId) return;
    setGainsLoading(true);
    api.getGroupSnapshots(groupId, gainPeriod)
      .then(setSkillGains)
      .catch(() => {})
      .finally(() => setGainsLoading(false));
  }, [groupId, gainPeriod]);

  const TABS = [
    { id: 'skills', label: 'Skills', icon: 'https://runescape.wiki/images/Skills.png' },
    { id: 'gaps',   label: 'Gaps',   icon: 'https://runescape.wiki/images/Magnifying_glass.png' },
    { id: 'quests', label: 'Quests', icon: 'https://runescape.wiki/images/Quest_points.png' },
  ];

  function pillStyle(active) {
    return {
      flex: 1, fontSize: 11, padding: '4px 6px', borderRadius: 'var(--radius)',
      background: active ? 'var(--gold)' : 'transparent',
      color: active ? '#111' : 'var(--text-dim)',
      border: 'none', cursor: 'pointer', fontWeight: active ? 700 : 400,
    };
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 3, marginBottom: 14, background: 'var(--bg-root)', borderRadius: 'var(--radius)', padding: 3 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ ...pillStyle(tab === t.id), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <img src={t.icon} alt="" width={13} height={13}
              style={{ imageRendering: 'crisp-edges', opacity: tab === t.id ? 0.9 : 0.65, flexShrink: 0 }}
              onError={e => { e.target.style.display = 'none'; }} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Skills tab — levels matrix + gains overlay */}
      {tab === 'skills' && (
        <div>
          {/* Controls: skill spotlight + period pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <input
                list="skill-spotlight-list"
                className="form-input"
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onFocus={e => e.target.select()}
                placeholder="🔍 Spotlight a skill…"
                style={{ fontSize: 12, padding: '4px 10px', height: 30, width: 190 }}
              />
              <datalist id="skill-spotlight-list">
                {SKILL_ORDER.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            {filteredSkill && (
              <button type="button" className="btn btn-ghost btn-sm"
                onClick={() => setSkillInput('')}
                style={{ fontSize: 11, padding: '2px 8px' }}>✕ Clear</button>
            )}
            {/* Period pills — right-aligned */}
            <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', alignItems: 'center', flexWrap: 'wrap' }}>
              {GAIN_PERIODS.map(({ label, days }) => (
                <button
                  key={days}
                  onClick={() => setGainPeriod(days)}
                  style={{
                    padding: '3px 10px', fontSize: 11, fontWeight: gainPeriod === days ? 700 : 400,
                    borderRadius: 12, cursor: 'pointer',
                    background: gainPeriod === days ? 'var(--gold)' : 'transparent',
                    border: `1px solid ${gainPeriod === days ? 'var(--gold)' : 'var(--border)'}`,
                    color: gainPeriod === days ? '#1a1508' : 'var(--text-dim)',
                    transition: 'all 0.15s',
                  }}>
                  {label}
                </button>
              ))}
              {gainsLoading && <span className="spinner" style={{ width: 12, height: 12, alignSelf: 'center' }} />}
            </div>
          </div>

          {/* Leader banner when a skill is spotlit */}
          {filteredSkill && (() => {
            const ranked = players
              .map(p => ({ rsn: p.rsn, id: p.id, level: p.skills?.find(s => s.skill_name === filteredSkill)?.level ?? null }))
              .filter(p => p.level !== null)
              .sort((a, b) => b.level - a.level);
            if (!ranked.length) return null;
            const best = ranked[0];
            const is120 = best.level >= 120;
            const is99  = best.level >= 99;
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <SkillIcon name={filteredSkill} size={16} />
                  <strong style={{ color: 'var(--text-bright)' }}>{filteredSkill}</strong>
                </span>
                <span style={{ color: 'var(--text-dim)' }}>—</span>
                <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {ranked.map((p, idx) => (
                    <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {idx === 0 && <span style={{ fontSize: 10 }}>🥇</span>}
                      {idx === 1 && <span style={{ fontSize: 10 }}>🥈</span>}
                      {idx === 2 && <span style={{ fontSize: 10 }}>🥉</span>}
                      <span style={{ color: colorMap[p.id], fontWeight: idx === 0 ? 700 : 500 }}>{p.rsn}</span>
                      <span style={{
                        fontWeight: idx === 0 ? 800 : 600,
                        color: (idx === 0 && is120) ? 'var(--gold)' : (idx === 0 && is99) ? 'var(--text-bright)' : 'var(--text)',
                      }}>{p.level}</span>
                    </span>
                  ))}
                </span>
              </div>
            );
          })()}

          <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
            <thead>
              <tr>
                <th align="left" style={{
                  padding: '4px 8px 8px 4px', fontWeight: 600, color: 'var(--text-dim)',
                  fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4px',
                  position: 'sticky', left: 0, background: 'var(--bg-panel)', zIndex: 2,
                  whiteSpace: 'nowrap', minWidth: 110,
                }}>Skill</th>
                {players.map(p => (
                  <th key={p.id} align="center" style={{
                    padding: '4px 8px 8px', fontWeight: 700, color: colorMap[p.id],
                    fontSize: 11, whiteSpace: 'nowrap',
                  }}>{p.rsn}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Total Level row */}
              {(() => {
                const totals   = players.map(p => p.skills?.find(s => s.skill_name === 'Overall')?.level ?? null);
                const maxTotal = Math.max(...totals.filter(t => t !== null), 0);
                const stickyBg = 'color-mix(in srgb, var(--bg-panel) 88%, #c8a84b 12%)';
                return (
                  <tr style={{
                    borderTop: '1px solid var(--border)',
                    background: 'rgba(200,168,75,0.07)',
                    opacity: filteredSkill ? 0.25 : 1,
                    transition: 'opacity 0.2s',
                  }}>
                    <td style={{ padding: '6px 8px 6px 4px', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: stickyBg, zIndex: 1 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <img src="https://runescape.wiki/images/Statistics.png" alt="Total Level" width={18} height={18} style={{ imageRendering: 'crisp-edges', verticalAlign: 'middle' }} />
                        <span style={{ color: 'var(--gold)', fontSize: 11, fontWeight: 700, letterSpacing: '0.2px' }}>Total Level</span>
                      </span>
                    </td>
                    {players.map((p, i) => {
                      const total = totals[i];
                      const isSharedMax = total !== null && total === maxTotal && maxTotal > 0;
                      const sg = skillGains.find(s => s.playerId === p.id);
                      const totalLvlGain = Object.values(sg?.levelGains ?? {}).reduce((sum, v) => sum + v, 0);
                      return (
                        <td key={p.id} align="center" style={{
                          padding: '6px 6px',
                          background: isSharedMax ? 'rgba(200,168,75,0.22)' : undefined,
                          color: 'var(--gold)',
                          fontWeight: isSharedMax ? 800 : 600,
                          fontSize: 13,
                          whiteSpace: 'nowrap',
                        }}>
                          {total ?? '—'}
                          {totalLvlGain > 0 && (
                            <span style={{ color: 'var(--green-bright)', fontWeight: 700, fontSize: 10, marginLeft: 3 }}>+{totalLvlGain}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })()}
              {SKILL_ORDER.map((skill, rowIdx) => {
                const isSpotlit = filteredSkill === skill;
                const isFaded   = !!filteredSkill && !isSpotlit;
                const levels    = players.map(p => p.skills?.find(s => s.skill_name === skill)?.level ?? null);
                const maxLevel  = Math.max(...levels.filter(l => l !== null), 0);
                const altBg     = rowIdx % 2 ? 'rgba(255,255,255,0.018)' : 'transparent';
                const stickyBg  = rowIdx % 2 ? 'color-mix(in srgb, var(--bg-panel) 92%, white 8%)' : 'var(--bg-panel)';
                const rowBg     = isSpotlit ? 'rgba(200,168,75,0.1)' : altBg;
                const rowStickyBg = isSpotlit ? 'color-mix(in srgb, var(--bg-panel) 85%, #c8a84b 15%)' : stickyBg;
                // Highest level gain in this row → winner highlight
                const maxLvlGain = Math.max(...players.map(p => {
                  const sg = skillGains.find(s => s.playerId === p.id);
                  return sg?.levelGains?.[skill] ?? 0;
                }));
                return (
                  <tr key={skill} style={{
                    borderTop: isSpotlit ? '1px solid rgba(200,168,75,0.4)' : '1px solid var(--border)',
                    background: rowBg,
                    opacity: isFaded ? 0.22 : 1,
                    transition: 'opacity 0.2s, background 0.2s',
                    outline: isSpotlit ? '1px solid rgba(200,168,75,0.3)' : undefined,
                  }}>
                    <td style={{
                      padding: '5px 8px 5px 4px', whiteSpace: 'nowrap',
                      position: 'sticky', left: 0, background: rowStickyBg, zIndex: 1,
                    }}>
                      <span style={{ marginRight: 5 }}><SkillIcon name={skill} size={18} /></span>
                      <span style={{ color: isSpotlit ? 'var(--gold)' : 'var(--text-dim)', fontSize: 11, fontWeight: isSpotlit ? 700 : 400 }}>{skill}</span>
                    </td>
                    {players.map((p, i) => {
                      const level = levels[i];
                      const sg = skillGains.find(s => s.playerId === p.id);
                      const lvlGain = sg?.levelGains?.[skill] ?? 0;
                      const xpGain  = sg?.gains?.[skill] ?? 0;
                      const isSharedMax = level !== null && level === maxLevel && maxLevel > 0;
                      const isTop = maxLvlGain > 0 && lvlGain === maxLvlGain;
                      const is120 = level >= 120;
                      const is99  = level >= 99;
                      return (
                        <td key={p.id} align="center"
                          title={xpGain > 0 ? `+${xpGain.toLocaleString()} XP` : undefined}
                          style={{
                            padding: '5px 6px',
                            background: (isTop || isSharedMax) ? 'rgba(200,168,75,0.18)' : undefined,
                            color: is120 ? 'var(--gold)' : is99 ? 'var(--text-bright)' : level ? 'var(--text)' : 'var(--text-dim)',
                            fontWeight: (isSharedMax || isTop) ? 700 : 400,
                            fontSize: isSpotlit ? 13 : 12,
                            whiteSpace: 'nowrap',
                          }}>
                          {level ?? '—'}
                          {lvlGain > 0 && (
                            <span style={{ color: 'var(--green-bright)', fontWeight: 700, fontSize: 10, marginLeft: 3 }}>+{lvlGain}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Gaps tab — automatic skill gap analysis across all quest suggestions */}
      {tab === 'gaps' && (() => {
        const customLevel = gapsLevel !== '' ? parseInt(gapsLevel, 10) : null;

        // ── Build gap map from GOAL_SUGGESTIONS (default mode) ──────────────
        const questSuggestions = GOAL_SUGGESTIONS.filter(s =>
          s.requirements?.skills && Object.keys(s.requirements.skills).length > 0
        );
        const skillGapMap = {};
        for (const sugg of questSuggestions) {
          for (const [skill, need] of Object.entries(sugg.requirements.skills)) {
            if (gapsSkill && skill !== gapsSkill) continue;
            for (const player of players) {
              const have = player.skills?.find(s => s.skill_name === skill)?.level ?? 1;
              if (have < need) {
                if (!skillGapMap[skill]) skillGapMap[skill] = { skill, maxNeed: 0, quests: new Set(), players: {} };
                if (need > skillGapMap[skill].maxNeed) skillGapMap[skill].maxNeed = need;
                skillGapMap[skill].quests.add(sugg.title);
                const existing = skillGapMap[skill].players[player.rsn];
                if (!existing || need > existing.need)
                  skillGapMap[skill].players[player.rsn] = { rsn: player.rsn, have, need, gap: need - have };
              }
            }
          }
        }

        // ── If selected skill has unlock prerequisites, inject them ──────────
        if (gapsSkill && SKILL_UNLOCK_REQS[gapsSkill] && customLevel === null) {
          // Clear the direct skill gap and instead show the unlock prerequisites
          delete skillGapMap[gapsSkill];
          for (const [prereqSkill, prereqLevel] of Object.entries(SKILL_UNLOCK_REQS[gapsSkill])) {
            const entry = { skill: prereqSkill, maxNeed: prereqLevel, quests: new Set([`Unlock ${gapsSkill}`]), players: {} };
            for (const player of players) {
              const have = player.skills?.find(s => s.skill_name === prereqSkill)?.level ?? 1;
              if (have < prereqLevel)
                entry.players[player.rsn] = { rsn: player.rsn, have, need: prereqLevel, gap: prereqLevel - have };
            }
            if (Object.keys(entry.players).length > 0) skillGapMap[prereqSkill] = entry;
          }
        }

        // ── If a custom level is set for a specific skill, override/inject ──
        if (gapsSkill && customLevel !== null && customLevel >= 1 && customLevel <= 120) {
          const entry = skillGapMap[gapsSkill] || { skill: gapsSkill, maxNeed: customLevel, quests: new Set(), players: {} };
          entry.maxNeed = customLevel;
          entry.players = {};
          for (const player of players) {
            const have = player.skills?.find(s => s.skill_name === gapsSkill)?.level ?? 1;
            if (have < customLevel)
              entry.players[player.rsn] = { rsn: player.rsn, have, need: customLevel, gap: customLevel - have };
          }
          skillGapMap[gapsSkill] = entry;
        }

        const gapList = Object.values(skillGapMap).sort((a, b) => {
          if (gapsSort === 'level-desc') return b.maxNeed - a.maxNeed;
          if (gapsSort === 'level-asc')  return a.maxNeed - b.maxNeed;
          // default: most players affected, then highest level
          const diff = Object.keys(b.players).length - Object.keys(a.players).length;
          return diff !== 0 ? diff : b.maxNeed - a.maxNeed;
        });

        if (!players.length) return (
          <div style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No players loaded.</div>
        );

        const isFiltered = !!gapsSkill;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* ── Filter bar ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <select
                value={gapsSkill}
                onChange={e => { setGapsSkill(e.target.value); setGapsLevel(''); }}
                style={{
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', color: gapsSkill ? 'var(--text-bright)' : 'var(--text-dim)',
                  fontSize: 11, padding: '4px 8px', cursor: 'pointer',
                }}>
                <option value="">All skills</option>
                {SKILL_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              {gapsSkill && (
                <>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>level</span>
                  <input
                    type="number" min={1} max={120}
                    value={gapsLevel}
                    onChange={e => setGapsLevel(e.target.value)}
                    placeholder={skillGapMap[gapsSkill] ? String(skillGapMap[gapsSkill].maxNeed) : '—'}
                    style={{
                      width: 60, background: 'var(--bg-input)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)', color: 'var(--text-bright)',
                      fontSize: 11, padding: '4px 8px', textAlign: 'center',
                    }}
                  />
                </>
              )}

              {isFiltered && (
                <button
                  onClick={() => { setGapsSkill(''); setGapsLevel(''); }}
                  style={{
                    background: 'transparent', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)', color: 'var(--text-dim)',
                    fontSize: 10, padding: '3px 8px', cursor: 'pointer',
                  }}>
                  ✕ Clear
                </button>
              )}

              {/* Sort toggle — cycles through modes on each click */}
              <button
                onClick={() => {
                  const idx = GAPS_SORT_CYCLE.indexOf(gapsSort);
                  setGapsSort(GAPS_SORT_CYCLE[(idx + 1) % GAPS_SORT_CYCLE.length]);
                }}
                style={{
                  background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', color: 'var(--text-dim)',
                  fontSize: 10, padding: '3px 8px', cursor: 'pointer',
                  marginLeft: 'auto', whiteSpace: 'nowrap',
                }}>
                {GAPS_SORT_LABEL[gapsSort]}
              </button>
            </div>

            {gapList.length === 0 ? (
              <div style={{ color: 'var(--green-bright)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                ✓ {SKILL_UNLOCK_REQS[gapsSkill] && customLevel === null
                  ? `All players meet every prerequisite to unlock ${gapsSkill}!`
                  : isFiltered
                    ? `All players are at or above the required ${gapsSkill} level!`
                    : 'All players meet every skill requirement across all quest suggestions!'}
              </div>
            ) : gapList.map(({ skill, maxNeed, quests, players: affPlayers }) => {
              const affected = Object.values(affPlayers);
              const questList = [...quests].slice(0, 4);
              const extra = quests.size - questList.length;
              return (
                <div key={skill} style={{ background: 'var(--bg-panel-alt)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <SkillIcon name={skill} size={18} />
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-bright)' }}>{skill}</span>
                    <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 10, background: 'rgba(200,168,75,0.12)', border: '1px solid rgba(200,168,75,0.3)', color: 'var(--gold)' }}>
                      {customLevel && gapsSkill === skill ? `target ${customLevel}` : `up to ${maxNeed}`}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 'auto' }}>
                      {affected.length} player{affected.length !== 1 ? 's' : ''}{quests.size > 0 ? ` · ${quests.size} quest${quests.size !== 1 ? 's' : ''}` : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: quests.size > 0 ? 6 : 0 }}>
                    {affected.map(({ rsn, have, need }) => {
                      const pColor = colorMap[players.find(p => p.rsn === rsn)?.id] ?? 'var(--text)';
                      return (
                        <span key={rsn} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(192,64,64,0.10)', border: '1px solid rgba(192,64,64,0.3)', color: 'var(--red-bright)' }}>
                          <span style={{ color: pColor, fontWeight: 700 }}>{rsn}</span>
                          <span style={{ opacity: 0.7 }}> ({have})</span>
                          <span style={{ color: 'var(--gold)', fontWeight: 600 }}> +{need - have}</span>
                        </span>
                      );
                    })}
                  </div>
                  {quests.size > 0 && (
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                      Blocks: {questList.join(' · ')}{extra > 0 ? ` +${extra} more` : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Quests tab — group-wide quest completion grid */}
      {tab === 'quests' && (
        <QuestsPanel players={players} colorMap={colorMap} />
      )}
    </div>
  );
}

// ── Rich goal item ────────────────────────────────────────────────────────────

function GoalItem({ goal, players, onCycle, onDelete, onUpdateCount, onVault, canWrite }) {
  const [expanded, setExpanded] = useState(false);
  const [editingCount, setEditingCount] = useState(false);
  const [countDraft, setCountDraft] = useState(goal.current_value ?? 0);
  const [vaultPrompt, setVaultPrompt] = useState(false);

  const details = parseDetails(goal.details_json);
  const goalType = details?.goalType;

  // Level goal data
  const skillEntry = goalType === 'level' && goal.skill
    ? getPlayerSkill(players, goal.owner_id, goal.skill)
    : null;
  const currentLvl = skillEntry?.level ?? null;
  const targetLvl = goalType === 'level' ? goal.target_value : null;
  const levelDone = currentLvl && targetLvl && currentLvl >= targetLvl;
  const levelPct = currentLvl && targetLvl && targetLvl > 1
    ? Math.min(100, Math.round(((currentLvl - 1) / (targetLvl - 1)) * 100))
    : 0;
  const xpLeft = currentLvl && targetLvl && targetLvl > currentLvl
    ? (xpForLevel(targetLvl) - (skillEntry?.xp ?? xpForLevel(currentLvl))).toLocaleString()
    : null;

  // Item goal data
  const itemTarget = goalType === 'item' ? (details.quantity ?? goal.target_value ?? 1) : null;
  const itemCurrent = goal.current_value ?? 0;
  const itemPct = itemTarget ? Math.min(100, Math.round((itemCurrent / itemTarget) * 100)) : 0;

  // Skill requirement for item goal
  const reqSkillEntry = goalType === 'item' && details.skill
    ? getPlayerSkill(players, goal.owner_id, details.skill)
    : null;
  const reqMet = reqSkillEntry && details.skillLevel
    ? reqSkillEntry.level >= details.skillLevel
    : null;

  function saveCount(e) {
    e.preventDefault();
    const v = Math.max(0, Number(countDraft));
    onUpdateCount(goal.id, v);
    setEditingCount(false);
  }

  const isComplete = goal.status === 'complete';
  const barColor = isComplete ? 'var(--green)' : 'var(--gold)';

  return (
    <div style={{
      padding: '10px 12px', marginBottom: 6,
      background: 'var(--bg-panel-alt)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
    }}>
      {/* Row 1: title + actions */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-bright)', lineHeight: 1.3 }}>
            {goal.type === 'group' ? '👥 ' : '👤 '}{goal.title}
          </div>
          {goal.owner_rsn && goal.type !== 'group' && (
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>{goal.owner_rsn}</div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {(goalType === 'level' || goalType === 'item' || goalType === 'quest') && (
            <button onClick={() => setExpanded(x => !x)} style={{
              fontSize: 10, padding: '2px 6px', borderRadius: 6, cursor: 'pointer',
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text-dim)',
            }}>
              {expanded ? '▲' : '▼'}
            </button>
          )}
          {/* Wiki icon — always visible for quest goals */}
          {goalType === 'quest' && details?.questName && (
            <a
              href={`https://runescape.wiki/w/${details.questName.replace(/ /g, '_')}`}
              target="_blank"
              rel="noopener noreferrer"
              title={`${details.questName} on RS Wiki`}
              onClick={e => e.stopPropagation()}
              style={{
                fontSize: 12, padding: '2px 5px', borderRadius: 6,
                background: 'transparent', border: '1px solid var(--border)',
                color: 'var(--text-dim)', textDecoration: 'none', lineHeight: 1.4,
              }}>📖</a>
          )}
          <button onClick={() => onCycle(goal)} style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 10, cursor: 'pointer',
            background: 'transparent', border: `1px solid ${STATUS_COLORS[goal.status] || 'var(--border)'}`,
            color: STATUS_COLORS[goal.status] || 'var(--text-dim)', whiteSpace: 'nowrap',
          }}>
            {STATUS_LABELS[goal.status] || goal.status}
          </button>
          {/* Vault button — only when complete */}
          {isComplete && canWrite && (
            <button onClick={() => setVaultPrompt(v => !v)} title="Move to Vault" style={{
              fontSize: 12, padding: '2px 4px', background: 'transparent',
              border: 'none', color: vaultPrompt ? 'var(--gold)' : 'var(--text-dim)', cursor: 'pointer',
            }}>🏆</button>
          )}
          {canWrite && (
            <button onClick={() => onDelete(goal.id)} style={{
              fontSize: 11, padding: '2px 5px', background: 'transparent',
              border: 'none', color: 'var(--text-dim)', cursor: 'pointer',
            }}>✕</button>
          )}
        </div>
      </div>

      {/* Level goal progress */}
      {goalType === 'level' && currentLvl !== null && targetLvl && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginBottom: 3 }}>
            <span><SkillIcon name={goal.skill} size={14} /> {goal.skill}: <strong style={{ color: 'var(--text-bright)' }}>{currentLvl}</strong> → <strong style={{ color: 'var(--gold)' }}>{targetLvl}</strong></span>
            {levelDone
              ? <span style={{ color: 'var(--green-bright)' }}>✓ Done!</span>
              : xpLeft ? <span>{xpLeft} XP left</span> : null}
          </div>
          <div style={{ height: 5, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${levelPct}%`, height: '100%', background: barColor, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* Item goal progress */}
      {goalType === 'item' && itemTarget && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--text-dim)', marginBottom: 3 }}>
            <span>📦 {details.itemName}</span>
            {canWrite && !editingCount ? (
              <button onClick={() => { setCountDraft(itemCurrent); setEditingCount(true); }} style={{
                fontSize: 10, padding: '1px 6px', background: 'transparent',
                border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-dim)', cursor: 'pointer',
              }}>
                {itemCurrent}/{itemTarget} ✎
              </button>
            ) : editingCount ? (
              <form onSubmit={saveCount} style={{ display: 'flex', gap: 4 }}>
                <input type="number" value={countDraft} onChange={e => setCountDraft(e.target.value)}
                  min={0} max={itemTarget} autoFocus
                  style={{ width: 52, padding: '1px 4px', fontSize: 11, background: 'var(--bg-input)', border: '1px solid var(--gold)', borderRadius: 4, color: 'var(--text-bright)' }} />
                <span style={{ color: 'var(--text-dim)' }}>/{itemTarget}</span>
                <button type="submit" style={{ fontSize: 10, padding: '1px 6px', background: 'var(--gold)', border: 'none', borderRadius: 4, color: '#111', cursor: 'pointer', fontWeight: 700 }}>✓</button>
                <button type="button" onClick={() => setEditingCount(false)} style={{ fontSize: 10, padding: '1px 5px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-dim)', cursor: 'pointer' }}>✕</button>
              </form>
            ) : (
              <span>{itemCurrent}/{itemTarget}</span>
            )}
          </div>
          <div style={{ height: 5, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${itemPct}%`, height: '100%', background: barColor, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--bg-root)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 12 }}>
          {goalType === 'level' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {xpLeft && <div style={{ color: 'var(--text-dim)' }}>XP needed: <strong style={{ color: 'var(--text-bright)' }}>{xpLeft}</strong></div>}
              {goal.description && <div style={{ color: 'var(--text-dim)' }}>{goal.description}</div>}
              <a href={wikiUrl(goal.skill)} target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--gold)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                📖 {goal.skill} on RS Wiki
              </a>
            </div>
          )}

          {goalType === 'item' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {details.skill && details.skillLevel && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--text-dim)' }}>Requires:</span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                    background: reqMet ? 'rgba(90,154,80,0.15)' : 'rgba(192,64,64,0.12)',
                    border: `1px solid ${reqMet ? 'var(--green)' : 'var(--red)'}`,
                    color: reqMet ? 'var(--green-bright)' : 'var(--red-bright)',
                  }}>
                    <SkillIcon name={details.skill} size={14} /> {details.skill} {details.skillLevel}
                    {reqSkillEntry ? ` (you: ${reqSkillEntry.level})` : ''}
                  </span>
                </div>
              )}
              {details.method && (
                <div style={{ color: 'var(--text-dim)' }}>Method: <strong style={{ color: 'var(--text-bright)' }}>{details.method}</strong></div>
              )}
              {details.recipe?.length > 0 && (
                <div>
                  <div style={{ color: 'var(--text-dim)', marginBottom: 4 }}>Materials per batch:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {details.recipe.map((m, i) => (
                      <span key={i} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 10, fontSize: 11,
                        background: m.raw ? 'rgba(90,74,50,0.35)' : 'rgba(74,136,184,0.12)',
                        border: `1px solid ${m.raw ? 'var(--border)' : 'var(--blue)'}`,
                        color: 'var(--text)',
                      }}>
                        {m.raw ? '🪨' : '⚙️'} {m.item}: <strong style={{ color: 'var(--gold)' }}>{fmtNum(m.quantity * (details.quantity || 1))}</strong>
                        <a href={wikiUrl(m.item)} target="_blank" rel="noopener noreferrer"
                          title={`${m.item} on RS Wiki`}
                          style={{ color: 'var(--text-dim)', textDecoration: 'none', fontSize: 10, lineHeight: 1 }}>📖</a>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {goal.description && <div style={{ color: 'var(--text-dim)' }}>{goal.description}</div>}
              <a href={wikiUrl(details.itemName)} target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--gold)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                📖 {details.itemName} on RS Wiki
              </a>
            </div>
          )}

          {goalType === 'quest' && (
            <div>
              {goal.description && <div style={{ color: 'var(--text-dim)', marginBottom: 6 }}>{goal.description}</div>}
              <a href={wikiUrl(details.questName || goal.title)} target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--gold)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                📖 {details.questName || goal.title} on RS Wiki
              </a>
            </div>
          )}

          {goalType === 'custom' && goal.description && (
            <div style={{ color: 'var(--text-dim)' }}>{goal.description}</div>
          )}
        </div>
      )}

      {/* Vault prompt */}
      {vaultPrompt && (
        <div style={{
          marginTop: 8, padding: '8px 12px',
          background: 'rgba(200,168,75,0.08)',
          border: '1px solid var(--gold-dark)',
          borderRadius: 'var(--radius)',
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', flex: 1 }}>🏆 Showcase this in the Vault?</span>
          <button
            onClick={() => { onVault(goal.id); setVaultPrompt(false); }}
            className="btn btn-primary btn-sm"
            style={{ fontSize: 11 }}
          >Move to Vault</button>
          <button
            onClick={() => setVaultPrompt(false)}
            style={{ fontSize: 11, background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
          >Keep private</button>
        </div>
      )}
    </div>
  );
}

// ── Activity feed ─────────────────────────────────────────────────────────────

function ActivityFeed({ players, filteredPlayerId }) {
  const colorMap = Object.fromEntries(players.map((p, i) => [p.id, MEMBER_COLORS[i % MEMBER_COLORS.length]]));

  const feed = useMemo(() => {
    const source = filteredPlayerId ? players.filter(p => p.id === filteredPlayerId) : players;
    const all = source.flatMap(p => {
      let acts = [];
      try { acts = p.activities_json ? JSON.parse(p.activities_json) : []; } catch {}
      return acts.map(a => ({ ...a, rsn: p.rsn, playerId: p.id }));
    });
    all.sort((a, b) => parseRMDate(b.date) - parseRMDate(a.date));
    return all.slice(0, 40);
  }, [players, filteredPlayerId]);

  if (feed.length === 0) {
    return (
      <div style={{
        display: 'flex', gap: 10, alignItems: 'flex-start',
        background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.25)',
        borderRadius: 8, padding: '12px 14px', margin: '4px 0',
      }}>
        <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚠️</span>
        <div>
          <div style={{ color: '#e07070', fontWeight: 600, fontSize: 12, marginBottom: 3 }}>
            Activity feed unavailable
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: 12, lineHeight: 1.5 }}>
            No activity data has been loaded yet. This is usually because the RuneMetrics API (Jagex) is
            temporarily down or unreachable. The feed refreshes automatically every 2 hours — check back later.
            Also make sure each player's RuneMetrics profile is set to{' '}
            <strong style={{ color: 'var(--text)' }}>Public</strong> in-game under{' '}
            <em>Settings → Gameplay → Chat &amp; Social → RuneMetrics Event Log</em>.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {feed.map((a, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px', background: 'var(--bg-panel-alt)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
            color: colorMap[a.playerId], border: `1px solid ${colorMap[a.playerId]}`,
            background: 'rgba(0,0,0,0.3)', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 1,
          }}>{a.rsn}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--text-bright)', fontWeight: 500 }}>{a.text}</div>
            {a.details && a.details !== a.text && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>{a.details}</div>}
          </div>
          {a.date && <span style={{ fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2 }}>{a.date}</span>}
        </div>
      ))}
    </div>
  );
}

// ── Right panel: Goals + Activity ─────────────────────────────────────────────

function RightPanel({ goals, players, filteredPlayerId, groupId, onRefresh, onToast, canWrite, myRsn }) {
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

// ── Main export ───────────────────────────────────────────────────────────────

export default function OverviewTab({ group, goals, players, groupId, onRefresh, onToast, canWrite, myRsn, pendingRequests = [], onGoToRequests, onAddPlayer }) {
  const [selectedId, setSelectedId] = useState(null);
  const [editRsnPlayer, setEditRsnPlayer] = useState(null); // player being RSN-edited
  const [playerView, setPlayerView] = useState('skills'); // 'skills' | 'quests'

  const isUnranked = group?.gim_type === 'regular_unranked';

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
      {(players.length > 0 || (isUnranked && canWrite)) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Unranked group controls */}
          {isUnranked && canWrite && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                👥 Unranked group — manage members freely
              </span>
              <button className="btn btn-primary btn-sm" onClick={onAddPlayer}>
                ➕ Add Player
              </button>
            </div>
          )}

          {players.length === 0 && isUnranked && canWrite ? (
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
                  onRemove={isUnranked && canWrite ? handleRemovePlayer : undefined}
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
