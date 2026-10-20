import React, { useState } from 'react';

// Unlock modal — enter secret + pick who you are
export default function UnlockModal({ group, onConfirm, onCancel }) {
  const [pw, setPw] = useState('');
  const [rsn, setRsn] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const players = group?.players || [];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!pw.trim()) return;
    setChecking(true);
    setError('');
    try {
      await onConfirm(pw.trim(), rsn || null);
    } catch (err) {
      setError(err.message || 'Incorrect password');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{maxWidth:400}}>
        <div className="modal-header">
          <span className="modal-title">🔓 Unlock Group</span>
          {onCancel && <button className="btn btn-ghost btn-sm" onClick={onCancel}>✕</button>}
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p style={{color:'var(--text-dim)',fontSize:13,marginBottom:16}}>
              Enter the secret for <strong style={{color:'var(--text-bright)'}}>{group?.name}</strong> to make changes.
            </p>
            <div className="form-group">
              <label className="form-label">Group secret</label>
              <input className="form-input" type="password" value={pw}
                onChange={e => setPw(e.target.value)} autoFocus placeholder="Group password" />
            </div>
            {players.length > 0 && (
              <div className="form-group" style={{marginBottom:0}}>
                <label className="form-label">Who are you? (optional)</label>
                <input
                  className="form-input"
                  list="unlock-rsn-suggestions"
                  value={rsn}
                  onChange={e => setRsn(e.target.value)}
                  placeholder="Type or select your RSN…"
                  autoComplete="off"
                />
                <datalist id="unlock-rsn-suggestions">
                  {players.map(p => <option key={p.id} value={p.rsn} />)}
                </datalist>
              </div>
            )}
            {error && <div style={{color:'var(--danger)',fontSize:12,marginTop:8}}>{error}</div>}
          </div>
          <div className="modal-footer">
            {onCancel && <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>}
            <button type="submit" className="btn btn-primary" disabled={checking || !pw.trim()}>
              {checking ? <span className="spinner" style={{width:12,height:12}} /> : '🔓 Unlock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
