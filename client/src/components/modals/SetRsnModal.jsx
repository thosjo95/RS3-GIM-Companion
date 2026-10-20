import React, { useState } from 'react';

// Set RSN modal — just pick who you are (no password needed when already unlocked)
export default function SetRsnModal({ group, myRsn, onConfirm, onCancel }) {
  const [rsn, setRsn] = useState(myRsn || '');
  const players = group?.players || [];

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal" style={{ maxWidth: 360 }}>
        <div className="modal-header">
          <span className="modal-title">👤 Who are you?</span>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>
            Enter your character name in <strong style={{ color: 'var(--text-bright)' }}>{group?.name}</strong>.
            This is saved to this browser only.
          </p>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Your RuneScape name</label>
            <input
              className="form-input"
              list="rsn-suggestions"
              value={rsn}
              onChange={e => setRsn(e.target.value)}
              placeholder="Type or select your RSN…"
              autoFocus
              autoComplete="off"
            />
            <datalist id="rsn-suggestions">
              {players.map(p => <option key={p.id} value={p.rsn} />)}
            </datalist>
            {players.length > 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
                Group members: {players.map(p => p.rsn).join(', ')}
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onConfirm(rsn.trim())} disabled={!rsn.trim()}>
            ✓ Save
          </button>
        </div>
      </div>
    </div>
  );
}
