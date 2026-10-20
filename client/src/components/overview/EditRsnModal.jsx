import React, { useState } from 'react';
import { api } from '../../api/client';
import { normRsn } from '../../lib/rs3';

// ── Edit RSN modal ────────────────────────────────────────────────────────────

export default function EditRsnModal({ player, onClose, onSaved, onToast }) {
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
