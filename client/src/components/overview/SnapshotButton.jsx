import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../api/client';

// ── Snapshot / Share button ───────────────────────────────────────────────────

export default function SnapshotButton({ group, players, goals, onToast }) {
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
