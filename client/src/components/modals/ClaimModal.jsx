import React, { useState } from 'react';

// Claim modal — auto-generates a secret, shows it for copying
export default function ClaimModal({ group, onConfirm, onCancel }) {
  const [rsn, setRsn] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [secret, setSecret] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const players = group?.players || [];

  async function handleClaim() {
    setClaiming(true);
    setError('');
    try {
      const result = await onConfirm(rsn || null);
      setSecret(result.secret);
    } catch (err) {
      setError(err.message || 'Failed to claim group');
    } finally {
      setClaiming(false);
    }
  }

  function copySecret() {
    navigator.clipboard.writeText(secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{maxWidth:420}}>
        <div className="modal-header">
          <span className="modal-title">🔒 Claim Group</span>
          {!secret && <button className="btn btn-ghost btn-sm" onClick={onCancel}>✕</button>}
        </div>
        <div className="modal-body">
          {!secret ? (
            <>
              <p style={{color:'var(--text-dim)',fontSize:13,marginBottom:12}}>
                Claiming <strong style={{color:'var(--text-bright)'}}>{group?.name}</strong> generates a group secret. Share it with your members on Discord so they can unlock and contribute.
              </p>

              {/* Warning */}
              <div style={{
                padding:'10px 12px', marginBottom:16, borderRadius:'var(--radius)',
                background:'rgba(192,64,64,0.10)', border:'1px solid rgba(192,64,64,0.4)',
                fontSize:12, color:'var(--text-dim)', lineHeight:1.5,
              }}>
                <span style={{fontWeight:700, color:'var(--red-bright)'}}>⚠️ Only claim groups you own.</span>
                {' '}Claiming locks the group to this secret — other members will need it to contribute.
                <br/><br/>
                If your group has already been claimed by someone else, or you've lost your secret,{' '}
                <strong style={{color:'var(--text-bright)'}}>contact the developer</strong> for help:
                {' '}<a href="mailto:support@example.com" style={{color:'var(--gold)'}}>Discord / GitHub issues</a>.
              </div>

              {players.length > 0 && (
                <div className="form-group" style={{marginBottom:0}}>
                  <label className="form-label">Who are you? (optional)</label>
                  <select className="form-input" value={rsn} onChange={e => setRsn(e.target.value)}>
                    <option value="">— Select your character —</option>
                    {players.map(p => <option key={p.id} value={p.rsn}>{p.rsn}</option>)}
                  </select>
                </div>
              )}
              {error && <div style={{color:'var(--danger)',fontSize:12,marginTop:8}}>{error}</div>}
            </>
          ) : (
            <>
              <p style={{color:'var(--text-dim)',fontSize:13,marginBottom:16}}>
                Group claimed! Here's your secret — copy it and share with your group members. <strong style={{color:'var(--gold)'}}>This is the only time it will be shown.</strong>
              </p>
              <div style={{
                display:'flex', alignItems:'center', gap:8,
                padding:'14px 16px', marginBottom:8,
                background:'rgba(200,168,75,0.08)',
                border:'1px solid var(--gold-dark)',
                borderRadius:'var(--radius-lg)',
              }}>
                <code style={{flex:1, fontSize:18, fontWeight:700, color:'var(--gold)', letterSpacing:'2px'}}>{secret}</code>
                <button onClick={copySecret} className="btn btn-primary btn-sm" style={{flexShrink:0}}>
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <p style={{color:'var(--text-dim)',fontSize:11}}>
                Members go to the site, find the group, and click the lock icon to enter this secret and identify themselves.
              </p>
            </>
          )}
        </div>
        <div className="modal-footer">
          {!secret ? (
            <>
              <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
              <button className="btn btn-primary" onClick={handleClaim} disabled={claiming}>
                {claiming ? <span className="spinner" style={{width:12,height:12}} /> : '🔒 Claim & Generate Secret'}
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={onCancel}>Done</button>
          )}
        </div>
      </div>
    </div>
  );
}
