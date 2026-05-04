import React, { useState } from 'react';
import { api } from '../api/client';

export default function AddPlayerModal({ groupId, onClose, onAdded, onToast }) {
  const [rsn, setRsn] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!rsn.trim()) return;
    setSaving(true);
    try {
      const player = await api.addPlayer({ rsn: rsn.trim(), group_id: groupId });
      // Immediately try to sync hiscores
      try {
        await api.syncPlayer(player.id);
      } catch {
        // Sync failure is non-fatal on add
      }
      onToast(`${rsn.trim()} added`, 'success');
      onAdded();
      onClose();
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{maxWidth:360}}>
        <div className="modal-header">
          <span className="modal-title">➕ Add Player</span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">RuneScape Name (RSN)</label>
              <input
                className="form-input"
                value={rsn}
                onChange={e => setRsn(e.target.value)}
                placeholder="Exact in-game name"
                autoFocus
                required
              />
              <div className="text-xs text-dim mt-8">
                Must match the name on the RS3 hiscores exactly. Hiscores will be fetched automatically.
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving || !rsn.trim()}>
              {saving ? <><span className="spinner" style={{width:12,height:12}}/> Adding…</> : '➕ Add Player'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
