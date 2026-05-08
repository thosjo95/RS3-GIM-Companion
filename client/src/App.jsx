import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api, setGroupContext, setOnUnauthorized } from './api/client';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import AddPlayerModal from './components/AddPlayerModal';
import WebhookSettings from './components/WebhookSettings';
import TourOverlay from './components/TourOverlay';

// Toast notification system
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  return [toasts, push];
}

function fmtXp(n) {
  if (!n) return '0';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(n);
}

// Set RSN modal — just pick who you are (no password needed when already unlocked)
function SetRsnModal({ group, myRsn, onConfirm, onCancel }) {
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

// Unlock modal — enter secret + pick who you are
function UnlockModal({ group, onConfirm, onCancel }) {
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

// Claim modal — auto-generates a secret, shows it for copying
function ClaimModal({ group, onConfirm, onCancel }) {
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


// Setup screen — shown when no group exists
function SetupScreen({ onCreated, onToast, prefill, onCancel, groups, onSwitchToGroup }) {
  const [step, setStep] = useState(() => {
    if (!prefill) return 'search';
    // Unranked groups pre-filled from the search modal → skip straight to RSN entry
    if (prefill.type === 'regular_unranked') return 'manual';
    return 'preview';
  });
  const [gimType, setGimType] = useState(prefill?.type || 'regular');
  const [gimSize, setGimSize] = useState(prefill?.size || 5);
  const [groupName, setGroupName] = useState(prefill?.name || '');
  const [lookupResult, setLookupResult] = useState(
    prefill && prefill.type !== 'regular_unranked'
      ? { found: true, groupName: prefill.name, type: prefill.type, size: prefill.size, members: prefill.members }
      : null
  );
  const [manualRsns, setManualRsns] = useState(
    prefill?.type === 'regular_unranked'
      ? Array(prefill?.size || 2).fill('')
      : (prefill?.members?.map(m => m.rsn) || [])
  );
  const [searching, setSearching] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');

  async function handleSearch(e) {
    e.preventDefault();
    if (!groupName.trim()) return;

    // ── Unranked groups bypass hiscores entirely — go straight to manual RSN entry ──
    if (gimType === 'regular_unranked') {
      const existing = groups?.find(g => g.name.toLowerCase() === groupName.trim().toLowerCase());
      if (existing) { onSwitchToGroup?.(existing.id); return; }
      setSearching(true);
      try {
        const dbResults = await api.searchGroups(groupName.trim());
        const dbMatch = dbResults.find(g => g.name.toLowerCase() === groupName.trim().toLowerCase());
        if (dbMatch) { onSwitchToGroup?.(dbMatch.id); return; }
      } catch {} finally { setSearching(false); }
      setManualRsns(Array(gimSize).fill(''));
      setStep('manual');
      return;
    }

    // ── Ranked groups: search RS3 hiscores ───────────────────────────────────────
    // 1. Already in local sidebar — just switch
    const existing = groups?.find(g => g.name.toLowerCase() === groupName.trim().toLowerCase());
    if (existing) { onSwitchToGroup?.(existing.id); return; }
    setSearching(true);
    try {
      // 2. Already in DB (e.g. user cleared localStorage) — add to sidebar without re-creating
      const dbResults = await api.searchGroups(groupName.trim());
      const dbMatch = dbResults.find(g => g.name.toLowerCase() === groupName.trim().toLowerCase());
      if (dbMatch) { onSwitchToGroup?.(dbMatch.id); return; }
      // 3. Search RS3 hiscores
      const result = await api.lookupGroup(groupName.trim(), gimType, gimSize);
      if (result.found && result.members?.length) {
        setLookupResult(result);
        setStep('preview');
      } else {
        onToast(result.error || 'Group not found on RS3 hiscores. Check the exact group name and settings.', 'error');
      }
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSearching(false);
    }
  }

  async function handleConfirm(memberRsns) {
    const rsns = memberRsns.map(r => r.trim()).filter(Boolean);
    if (!rsns.length) return onToast('Add at least one member RSN', 'error');
    setStep('setting-up');
    setSyncProgress(`Adding ${rsns.length} members and syncing hiscores…`);
    try {
      // For unranked groups the size is just the number of members added
      const size = gimType === 'regular_unranked' ? rsns.length : gimSize;
      const result = await api.setupGroup({ name: groupName.trim(), type: gimType, size, member_rsns: rsns });
      if (result.failed?.length) {
        onToast(`Setup done. ${result.failed.length} member(s) couldn't sync from RS3.`, 'error');
      }
      onCreated(result.id);
    } catch (err) {
      onToast(err.message, 'error');
      setStep(lookupResult ? 'preview' : 'manual');
    }
  }

  const cardStyle = { width: '100%', maxWidth: 480, textAlign: 'left' };

  // ── Step: Setting up ──────────────────────────────────────────────────────
  if (step === 'setting-up') {
    return (
      <div className="setup-screen">
        <img src="/logo.svg" alt="RS3 GIM Companion" style={{height:84,width:'auto',marginBottom:8}} />
        <h1>RS3 GIM Companion</h1>
        <div className="panel" style={cardStyle}>
          <div className="panel-body" style={{textAlign:'center',padding:'32px 24px'}}>
            <span className="spinner" style={{width:32,height:32,marginBottom:16,display:'block',margin:'0 auto 16px'}} />
            <div style={{fontWeight:700,fontSize:16,color:'var(--text-bright)',marginBottom:8}}>Setting up your group…</div>
            <div style={{color:'var(--text-dim)',fontSize:13}}>{syncProgress}</div>
            <div style={{color:'var(--text-dim)',fontSize:12,marginTop:8}}>This may take 10–20 seconds while we sync hiscores from RS3.</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Preview (auto-found members) ───────────────────────────────────
  if (step === 'preview' && lookupResult) {
    return (
      <div className="setup-screen">
        <img src="/logo.svg" alt="RS3 GIM Companion" style={{height:84,width:'auto',marginBottom:8}} />
        <h1>RS3 GIM Companion</h1>
        <div className="panel" style={cardStyle}>
          <div className="panel-header">
            <span className="panel-title">✓ Group Found</span>
            <span className="tag">{lookupResult.type === 'competitive' ? '🏆 Competitive' : '⚔️ Regular'} · {lookupResult.size} members</span>
          </div>
          <div className="panel-body">
            <div style={{fontWeight:700,fontSize:15,color:'var(--gold)',marginBottom:12}}>{lookupResult.groupName}</div>
            <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:16}}>
              {lookupResult.members.map((m, i) => (
                <div key={i} style={{
                  display:'flex',alignItems:'center',justifyContent:'space-between',
                  padding:'8px 12px',background:'var(--bg-panel-alt)',
                  border:'1px solid var(--border)',borderRadius:'var(--radius)',
                }}>
                  <span style={{fontWeight:600,color:'var(--text-bright)'}}>👤 {m.rsn}</span>
                  <div style={{display:'flex',gap:12,fontSize:12,color:'var(--text-dim)'}}>
                    {m.totalLevel > 0 && <span>Lvl {m.totalLevel}</span>}
                    {m.totalXp > 0 && <span>{fmtXp(m.totalXp)} XP</span>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{fontSize:12,color:'var(--text-dim)',marginBottom:12}}>
              Hiscores will be synced automatically for all members.
            </div>
            <div style={{display:'flex',gap:8,flexDirection:'column'}}>
              <button className="btn btn-primary" onClick={() => handleConfirm(lookupResult.members.map(m => m.rsn))}>
                ✓ Confirm & Start Tracking
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setStep('search')}>← Back</button>
              {onCancel && <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Manual RSN entry ────────────────────────────────────────────────
  if (step === 'manual') {
    return (
      <div className="setup-screen">
        <img src="/logo.svg" alt="RS3 GIM Companion" style={{height:84,width:'auto',marginBottom:8}} />
        <h1>RS3 GIM Companion</h1>
        <div className="panel" style={cardStyle}>
          <div className="panel-header">
            <span className="panel-title">
              {gimType === 'regular_unranked' ? `Add Members — ${groupName}` : 'Enter Member RSNs'}
            </span>
          </div>
          <div className="panel-body">
            <div style={{color:'var(--text-dim)',fontSize:13,marginBottom:14}}>
              {gimType === 'regular_unranked'
                ? 'Enter each member\'s RuneScape name. Each will be verified individually on the RS3 hiscores and synced in.'
                : 'Enter each group member\'s exact RuneScape name as shown on the hiscores.'}
            </div>
            {manualRsns.map((rsn, i) => (
              <div key={i} className="form-group" style={{marginBottom:8}}>
                <label className="form-label">Member {i + 1}</label>
                <input className="form-input" value={rsn} autoFocus={i === 0}
                  placeholder="Exact RSN"
                  onChange={e => {
                    const next = [...manualRsns];
                    next[i] = e.target.value;
                    setManualRsns(next);
                  }} />
              </div>
            ))}
            <div style={{display:'flex',gap:8,marginTop:4}}>
              <button className="btn btn-ghost btn-sm" onClick={() => setManualRsns(r => [...r, ''])}>+ Add member</button>
            </div>
            <div style={{display:'flex',gap:8,flexDirection:'column',marginTop:16}}>
              <button className="btn btn-primary" onClick={() => handleConfirm(manualRsns)}>
                ✓ Confirm & Start Tracking
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setStep('search')}>← Back</button>
              {onCancel && <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Search ─────────────────────────────────────────────────────────
  return (
    <div className="setup-screen">
      <div style={{fontSize:56,marginBottom:12}}>⚔️</div>
      <h1>RS3 GIM Companion</h1>
      <p>Track your Group Ironman progress — hiscores, XP gains, goals, and weakness maps.</p>
      <div className="panel" style={cardStyle}>
        <div className="panel-header"><span className="panel-title">Find Your Group</span></div>
        <form onSubmit={handleSearch}>
          <div className="panel-body">

            <div className="form-group">
              <label className="form-label">Group Type</label>
              <div className="flex gap-8" style={{flexWrap:'wrap'}}>
                {[
                  ['regular',          '⚔️ Regular'],
                  ['competitive',      '🏆 Competitive'],
                  ['regular_unranked', '👥 Unranked'],
                ].map(([val, label]) => (
                  <button key={val} type="button"
                    className={`btn btn-sm ${gimType === val ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setGimType(val)}>
                    {label}
                  </button>
                ))}
              </div>
              {gimType === 'regular_unranked' && (
                <div className="text-xs text-dim mt-8">
                  For groups not on the RS3 GIM hiscores. Members are added manually by RSN in the next step.
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Group Size</label>
              <div className="flex gap-8">
                {[2,3,4,5].map(n => (
                  <button key={n} type="button"
                    className={`btn btn-sm ${gimSize === n ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setGimSize(n)}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Group Name (exact in-game name)</label>
              <input className="form-input" value={groupName} onChange={e => setGroupName(e.target.value)}
                placeholder="e.g. True Deciples" required autoFocus />
              {gimType === 'regular_unranked' ? (
                <div className="text-xs text-dim mt-8">
                  Choose any name to identify your group in the app.
                </div>
              ) : (
                <div className="text-xs text-dim mt-8">
                  Must match your group name on the{' '}
                  <a href={`https://rs.runescape.com/hiscores/group-ironman/${gimType}/${gimSize}`}
                    target="_blank" rel="noopener noreferrer" style={{color:'var(--gold)'}}>
                    RS3 GIM hiscores
                  </a> exactly.
                </div>
              )}
            </div>

          </div>

          <div className="modal-footer" style={{flexDirection:'column',gap:8,alignItems:'stretch'}}>
            <button type="submit" className="btn btn-primary" disabled={searching || !groupName.trim()}>
              {searching
                ? <><span className="spinner" style={{width:12,height:12}}/> Searching…</>
                : gimType === 'regular_unranked'
                  ? 'Next: Add Members →'
                  : '🔍 Search & Import Group'}
            </button>
            {onCancel && <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>}
          </div>
        </form>
      </div>

      {/* ── Browse groups already tracked in this app (collapsible) ── */}
      <div style={{...cardStyle, marginTop:12}}>
        <BrowseTrackedGroups
          onSelect={id => onSwitchToGroup?.(id)}
        />
      </div>
    </div>
  );
}

// Shared helper: renders one group row used in both the modal browse list and SetupScreen
function GroupBrowseRow({ g, isPinned, isFav, onSelect, onFavorite, onRemove, onClose, actionLabel = 'Browse →' }) {
  return (
    <div
      style={{
        display:'flex', alignItems:'center', gap:10,
        padding:'9px 12px', marginBottom:4,
        background:'var(--bg-panel-alt)', border:'1px solid var(--border)',
        borderRadius:'var(--radius)', cursor:'pointer',
        transition:'border-color 0.12s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor='var(--gold-dark)'}
      onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
      onClick={() => { onSelect(g.id); onClose?.(); }}
    >
      <span style={{fontSize:16,flexShrink:0}}>👥</span>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontWeight:600,color:'var(--text-bright)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
          {g.name}
        </div>
        <div style={{fontSize:11,color:'var(--text-dim)'}}>
          {g.member_count ?? 0} member{(g.member_count ?? 0) !== 1 ? 's' : ''}
          {g.gim_type && g.gim_type !== 'regular' ? ` · ${g.gim_type === 'regular_unranked' ? 'Unranked' : g.gim_type === 'competitive' ? 'Competitive' : g.gim_type}` : ''}
          {g.is_claimed ? ' · 🔒' : ''}
        </div>
      </div>
      {/* Action button */}
      <span
        style={{fontSize:11,color:'var(--gold)',cursor:'pointer',flexShrink:0,fontWeight:600}}
        onClick={e => { e.stopPropagation(); onSelect(g.id); onClose?.(); }}>
        {actionLabel}
      </span>
      {/* Favorite toggle — only for pinned groups */}
      {isPinned && onFavorite && (
        <button
          onClick={e => { e.stopPropagation(); onFavorite(g.id); }}
          title={isFav ? 'Unpin from top' : 'Pin to top of sidebar'}
          style={{
            background:'none', border:'1px solid var(--border)',
            borderRadius:'var(--radius)', cursor:'pointer',
            padding:'3px 7px', fontSize:13, lineHeight:1,
            color: isFav ? 'var(--gold)' : 'var(--text-dim)',
            flexShrink:0,
          }}>
          {isFav ? '★' : '☆'}
        </button>
      )}
      {/* Remove — only for pinned groups */}
      {isPinned && onRemove && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(g.id); }}
          title="Remove from sidebar"
          style={{
            background:'none', border:'1px solid var(--border)',
            borderRadius:'var(--radius)', cursor:'pointer',
            padding:'3px 7px', fontSize:12, lineHeight:1,
            color:'var(--text-dim)', flexShrink:0,
          }}>
          ✕
        </button>
      )}
    </div>
  );
}

// Inline browse panel used by both the modal and SetupScreen
function BrowseTrackedGroups({ pinnedIds = new Set(), onSelect, onClose }) {
  const [open,    setOpen]    = useState(false);
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debRef = useRef(null);

  // Fetch when panel opens or query changes
  useEffect(() => {
    if (!open) return;
    clearTimeout(debRef.current);
    debRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await (query.trim() ? api.searchGroups(query.trim()) : api.browseGroups(40));
        setResults(data.filter(g => !pinnedIds.has(g.id)));
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }, query.trim() ? 220 : 0);
    return () => clearTimeout(debRef.current);
  }, [open, query]); // eslint-disable-line react-hooks/exhaustive-deps

  const typeLabel = t => {
    if (t === 'competitive')      return '🏆 Competitive';
    if (t === 'regular_unranked') return '👥 Unranked';
    return '⚔️ Regular';
  };

  return (
    <div style={{marginBottom: open ? 12 : 4}}>
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px',
          background: open ? 'rgba(200,168,75,0.08)' : 'var(--bg-panel-alt)',
          border: `1px solid ${open ? 'var(--gold-dark)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)', cursor: 'pointer',
          color: open ? 'var(--gold)' : 'var(--text-dim)',
          fontSize: 13, fontWeight: 600,
          transition: 'all 0.15s',
        }}>
        <span>👥 Browse groups tracked in this app</span>
        <span style={{fontSize:11}}>{open ? '▲' : '▼'}</span>
      </button>

      {/* Expanded panel */}
      {open && (
        <div style={{
          border: '1px solid var(--gold-dark)', borderTop: 'none',
          borderRadius: '0 0 var(--radius) var(--radius)',
          background: 'var(--bg-panel-alt)',
          padding: '10px 12px',
        }}>
          {/* Search within tracked groups */}
          <input
            className="form-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Filter by group name…"
            autoFocus
            style={{marginBottom:10}}
          />

          {/* Scrollable list */}
          <div style={{maxHeight:260, overflowY:'auto', display:'flex', flexDirection:'column', gap:4}}>
            {loading && (
              <div style={{textAlign:'center',padding:8}}>
                <span className="spinner" style={{width:14,height:14}} />
              </div>
            )}
            {!loading && results.length === 0 && (
              <div style={{fontSize:12,color:'var(--text-dim)',textAlign:'center',padding:'8px 0'}}>
                {query.trim() ? `No groups match "${query}"` : 'No tracked groups found'}
              </div>
            )}
            {results.map(g => (
              <div
                key={g.id}
                onClick={() => { onSelect(g.id); onClose?.(); }}
                style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'8px 10px',
                  background:'var(--bg-panel)', border:'1px solid var(--border)',
                  borderRadius:'var(--radius)', cursor:'pointer',
                  transition:'border-color 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor='var(--gold-dark)'}
                onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
              >
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontWeight:600, color:'var(--text-bright)', fontSize:13,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                    {g.name}
                  </div>
                  <div style={{fontSize:11, color:'var(--text-dim)', marginTop:1}}>
                    {typeLabel(g.gim_type)}
                    {' · '}{g.member_count ?? 0} member{(g.member_count ?? 0) !== 1 ? 's' : ''}
                    {g.is_claimed ? ' · 🔒' : ''}
                  </div>
                </div>
                <span style={{fontSize:11, color:'var(--gold)', fontWeight:600, flexShrink:0}}>Browse →</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Group search modal
function SearchGroupModal({ groups, allDbGroups, onSelect, onAddNew, onClose, onToast, onRemove, onFavorite, favoriteGroupIds }) {
  const [query, setQuery] = useState('');
  const [gimType, setGimType] = useState('regular');
  const [gimSize, setGimSize] = useState(5);
  const [searching, setSearching] = useState(false);
  const [rs3Result, setRs3Result] = useState(null);

  // Pinned group matches
  const pinnedIds = new Set(groups.map(g => g.id));
  const pinnedMatches = query.trim()
    ? groups.filter(g => g.name.toLowerCase().includes(query.toLowerCase()))
    : groups;

  async function handleRs3Search(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setRs3Result(null);
    try {
      const result = await api.lookupGroup(query.trim(), gimType, gimSize);
      setRs3Result(result);
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSearching(false);
    }
  }

  const alreadyInDb = rs3Result?.found
    ? (allDbGroups ?? groups).find(g => g.name.toLowerCase() === rs3Result.groupName?.toLowerCase())
    : null;

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{maxWidth:500}}>
        <div className="modal-header">
          <span className="modal-title">👥 Find or Manage Groups</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{paddingTop:8, maxHeight:'85vh', overflowY:'auto'}}>

          {/* Search input */}
          <div className="form-group" style={{marginBottom:12,marginTop:0}}>
            <input className="form-input" value={query}
              onChange={e => { setQuery(e.target.value); setRs3Result(null); }}
              placeholder="Search by group name…" autoFocus />
          </div>

          {/* ── Your (pinned) groups ── */}
          {pinnedMatches.length > 0 && (
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:'var(--text-dim)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.5px'}}>
                {query.trim() ? 'Your matching groups' : 'Your groups'}
              </div>
              {pinnedMatches.map(g => (
                <GroupBrowseRow
                  key={g.id} g={g}
                  isPinned={true}
                  isFav={favoriteGroupIds?.includes(g.id)}
                  onSelect={onSelect}
                  onFavorite={onFavorite}
                  onRemove={onRemove}
                  onClose={onClose}
                  actionLabel="Switch →"
                />
              ))}
            </div>
          )}

          {/* ── Browse all tracked groups (collapsible) ── */}
          <BrowseTrackedGroups
            pinnedIds={pinnedIds}
            onSelect={id => { onSelect(id); }}
            onClose={onClose}
          />

          {/* Separator */}
          <div style={{display:'flex',alignItems:'center',gap:8,margin:'14px 0 12px'}}>
            <div style={{flex:1,height:1,background:'var(--border)'}} />
            <span style={{fontSize:11,color:'var(--text-dim)'}}>
              {gimType === 'regular_unranked' ? 'Create unranked group' : 'Add new from RS3 hiscores'}
            </span>
            <div style={{flex:1,height:1,background:'var(--border)'}} />
          </div>

          <form onSubmit={handleRs3Search}>
            {/* Type buttons */}
            <div style={{display:'flex',gap:6,marginBottom:6,justifyContent:'center',flexWrap:'wrap'}}>
              {[['regular','⚔️ Regular'],['competitive','🏆 Competitive'],['regular_unranked','👥 Unranked']].map(([val,label]) => (
                <button key={val} type="button"
                  className={`btn btn-sm ${gimType === val ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => { setGimType(val); setRs3Result(null); }}>{label}</button>
              ))}
            </div>

            {/* Size picker — always shown */}
            <div style={{display:'flex',gap:6,marginBottom:10,justifyContent:'center'}}>
              {[2,3,4,5].map(n => (
                <button key={n} type="button"
                  className={`btn btn-sm ${gimSize === n ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setGimSize(n)}>{n} members</button>
              ))}
            </div>

            {/* Action */}
            <div style={{textAlign:'center', marginTop: gimType === 'regular_unranked' ? 10 : 0}}>
              {gimType === 'regular_unranked' ? (
                <>
                  <div style={{fontSize:11,color:'var(--text-dim)',marginBottom:8}}>
                    Type your group name in the field above, then click Create.
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{minWidth:180}}
                    disabled={!query.trim()}
                    onClick={() => { onClose(); onAddNew({ name: query.trim(), type: 'regular_unranked', size: gimSize }); }}>
                    👥 Create Unranked Group →
                  </button>
                </>
              ) : (
                <button type="submit" className="btn btn-secondary btn-sm" style={{minWidth:180}}
                  disabled={searching || !query.trim()}>
                  {searching
                    ? <><span className="spinner" style={{width:12,height:12}} /> Searching RS3…</>
                    : '🔍 Search RS3 Hiscores'}
                </button>
              )}
            </div>
          </form>

          {/* RS3 result */}
          {rs3Result && (
            <div style={{marginTop:12,padding:'12px 14px',background:'var(--bg-panel-alt)',border:`1px solid ${rs3Result.found ? 'var(--border)' : 'rgba(192,64,64,0.4)'}`,borderRadius:'var(--radius-lg)'}}>
              {rs3Result.found ? (
                <>
                  <div style={{fontWeight:700,color:'var(--gold)',marginBottom:6}}>{rs3Result.groupName}</div>
                  <div style={{fontSize:12,color:'var(--text-dim)',marginBottom:10}}>
                    {rs3Result.members?.length} members found on RS3 hiscores
                  </div>
                  {alreadyInDb ? (
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                        <span style={{fontSize:12,color:'var(--green-bright)',flex:1}}>
                          ✓ Already tracked {alreadyInDb.is_claimed ? '🔒' : '🔓'}
                        </span>
                        <button className="btn btn-primary btn-sm" onClick={() => { onSelect(alreadyInDb.id); onClose(); }}>
                          Switch to it →
                        </button>
                      </div>
                      {!alreadyInDb.is_claimed && (
                        <div style={{fontSize:11,color:'var(--text-dim)'}}>
                          This group is unclaimed — switch to it and set a password to claim it.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <span style={{fontSize:12,color:'var(--text-dim)',flex:1}}>Not in your database yet</span>
                      <button className="btn btn-primary btn-sm" onClick={() => {
                        onClose();
                        onAddNew({ name: rs3Result.groupName, type: gimType, size: gimSize, members: rs3Result.members });
                      }}>
                        ➕ Add this group
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:5}}>
                    <span style={{fontSize:13,fontWeight:700,color:'var(--text-bright)'}}>Group not found</span>
                    {rs3Result.error && (
                      <span
                        title={rs3Result.error}
                        style={{
                          cursor: 'help', flexShrink: 0,
                          fontSize: 10, fontWeight: 700, color: 'var(--text-dim)',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border)', borderRadius: '50%',
                          width: 16, height: 16, display: 'inline-flex',
                          alignItems: 'center', justifyContent: 'center',
                          userSelect: 'none', lineHeight: 1,
                        }}>i</span>
                    )}
                  </div>
                  <div style={{fontSize:12,color:'var(--text-dim)',fontStyle:'italic',lineHeight:1.5}}>
                    Make sure the name is spelled exactly as it appears in-game, and that the correct type and member count are selected
                    {' '}(e.g. <em>4 members · Competitive</em>).
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// Group switcher — shown in sidebar when multiple groups exist
function Sidebar({ groups, activeGroupId, onSelect, onNewGroup, onSearch, favoriteGroupIds, isOpen }) {
  return (
    <nav className={`sidebar${isOpen ? ' open' : ''}`}>
      <div className="nav-group">
        <div className="nav-label" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span>Groups</span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onSearch} title="Find or manage groups" style={{fontSize:13}}>🔍</button>
        </div>
        {groups.map(g => {
          const isFav = favoriteGroupIds?.includes(g.id);
          return (
            <div
              key={g.id}
              className={`nav-item${g.id === activeGroupId ? ' active' : ''}`}
              onClick={() => onSelect(g.id)}>
              <span className="icon">👥</span>
              <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{g.name}</span>
              {isFav && <span style={{color:'var(--gold)',fontSize:11,flexShrink:0,marginLeft:2}}>★</span>}
              {g.member_count != null && (
                <span className="tag" style={{marginLeft: isFav ? 4 : 'auto',fontSize:10,flexShrink:0}}>{g.member_count}</span>
              )}
            </div>
          );
        })}
        <div className="nav-item" onClick={onSearch} style={{marginTop:4}}>
          <span className="icon">⚙️</span>
          <span>Find or Manage Groups</span>
        </div>
      </div>
    </nav>
  );
}

function loadStoredPasswords() {
  try { return JSON.parse(localStorage.getItem('groupPasswords') || '{}'); } catch { return {}; }
}

function loadMyGroupIds() {
  try { return JSON.parse(localStorage.getItem('myGroupIds') || '[]'); } catch { return []; }
}

function saveMyGroupIds(ids) {
  localStorage.setItem('myGroupIds', JSON.stringify([...new Set(ids)]));
}

function loadFavoriteIds() {
  try { return JSON.parse(localStorage.getItem('favoriteGroupIds') || '[]'); } catch { return []; }
}

function saveFavoriteIds(ids) {
  localStorage.setItem('favoriteGroupIds', JSON.stringify([...new Set(ids)]));
}

export default function App() {
  const [allGroups, setAllGroups] = useState([]);
  const [myGroupIds, setMyGroupIdsState] = useState(loadMyGroupIds);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [group, setGroup] = useState(null);
  const [goals, setGoals] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [toasts, pushToast] = useToasts();
  const [myRsn, setMyRsnState] = useState('');
  const [groupPasswords, setGroupPasswordsState] = useState(loadStoredPasswords);
  const [favoriteGroupIds, setFavoriteGroupIdsState] = useState(loadFavoriteIds);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showRsnModal, setShowRsnModal] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [pendingImport, setPendingImport] = useState(null); // pre-filled data from RS3 search
  const [showTour, setShowTour] = useState(false);
  const tourShownRef = useRef(false); // prevent re-triggering on subsequent refreshes

  // Only show groups this browser has explicitly added, favorites first
  const groups = allGroups
    .filter(g => myGroupIds.includes(g.id))
    .sort((a, b) => {
      const aFav = favoriteGroupIds.includes(a.id) ? 0 : 1;
      const bFav = favoriteGroupIds.includes(b.id) ? 0 : 1;
      return aFav - bFav;
    });

  const groupsRef = useRef(groups);
  groupsRef.current = groups;

  // Normalise an RSN: collapse any unicode whitespace (NBSP etc.) to regular space and trim
  function normalizeRsn(rsn) {
    return (rsn || '').replace(/\s/g, ' ').trim();
  }

  function setMyRsn(rsn) {
    const clean = normalizeRsn(rsn);
    setMyRsnState(clean);
    if (activeGroupId) localStorage.setItem(`myRsn_${activeGroupId}`, clean);
  }

  function pinGroup(id) {
    const updated = [...new Set([...loadMyGroupIds(), id])];
    saveMyGroupIds(updated);
    setMyGroupIdsState(updated);
  }

  function removeFromSidebar(id) {
    const updated = loadMyGroupIds().filter(x => x !== id);
    saveMyGroupIds(updated);
    setMyGroupIdsState(updated);
    // Also remove from favorites
    const updatedFavs = loadFavoriteIds().filter(x => x !== id);
    saveFavoriteIds(updatedFavs);
    setFavoriteGroupIdsState(updatedFavs);
    // If it was the active group, switch to first remaining
    if (id === activeGroupId) {
      const remaining = allGroups.filter(g => updated.includes(g.id));
      setActiveGroupId(remaining[0]?.id ?? null);
    }
  }

  function toggleFavorite(id) {
    const current = loadFavoriteIds();
    const updated = current.includes(id)
      ? current.filter(x => x !== id)
      : [...current, id];
    saveFavoriteIds(updated);
    setFavoriteGroupIdsState(updated);
  }

  function saveGroupPassword(groupId, pw) {
    const updated = { ...loadStoredPasswords(), [groupId]: pw };
    localStorage.setItem('groupPasswords', JSON.stringify(updated));
    setGroupPasswordsState(updated);
    setGroupContext(groupId, pw);
  }

  // Keep API group context in sync with active group + stored password
  useEffect(() => {
    const pw = groupPasswords[activeGroupId] || null;
    setGroupContext(activeGroupId, pw);
  }, [activeGroupId, groupPasswords]);

  // Register 401 handler once
  useEffect(() => {
    setOnUnauthorized(() => {
      setShowPasswordModal(true);
    });
  }, []);

  async function loadGroups() {
    try {
      const data = await api.getGroups();
      setAllGroups(data);
      return data;
    } catch {
      return [];
    }
  }

  async function loadGroup(id) {
    if (!id) return;
    try {
      const [g, g_goals, g_reqs] = await Promise.all([
        api.getGroup(id),
        api.getGoals(id),
        api.getRequests(id),
      ]);
      setGroup(g);
      setGoals(g_goals);
      setPendingRequests(g_reqs.filter(r => !r.obtained));
    } catch (err) {
      pushToast(err.message, 'error');
    }
  }

  async function refresh() {
    await loadGroup(activeGroupId);
  }

  // Initial load
  useEffect(() => {
    setLoading(true);
    loadGroups().then(data => {
      const pinnedIds = loadMyGroupIds();
      const myGroups = data.filter(g => pinnedIds.includes(g.id));
      if (myGroups.length > 0) {
        const saved = localStorage.getItem('activeGroupId');
        const id = saved && myGroups.find(g => g.id === Number(saved)) ? Number(saved) : myGroups[0].id;
        setActiveGroupId(id);
      }
      setLoading(false);
    });
  }, []);

  // Load group and per-group RSN whenever activeGroupId changes
  useEffect(() => {
    if (activeGroupId) {
      localStorage.setItem('activeGroupId', activeGroupId);
      loadGroup(activeGroupId).then(() => {
        // Show tour on first-ever visit (once per browser)
        if (!tourShownRef.current && !localStorage.getItem('tourCompleted')) {
          tourShownRef.current = true;
          // Small delay so the UI settles before the overlay appears
          setTimeout(() => setShowTour(true), 600);
        }
      });
      setMyRsnState((localStorage.getItem(`myRsn_${activeGroupId}`) || '').replace(/\s/g, ' ').trim());
    }
  }, [activeGroupId]);

  function handleGroupCreated(id) {
    pinGroup(id);
    setCreatingGroup(false);
    loadGroups().then(() => setActiveGroupId(id));
  }

  function selectGroup(id) {
    pinGroup(id);
    setActiveGroupId(id);
    setActiveTab('overview');
    setShowMobileSidebar(false);
  }

  function handleSearchAddNew(prefill) {
    setPendingImport(prefill); // null = blank setup, or { name, type, size, members }
    setCreatingGroup(true);
  }

  async function handlePasswordSubmit(pw, rsn) {
    setGroupContext(activeGroupId, pw);
    await api.verifyGroup(activeGroupId); // throws if wrong
    saveGroupPassword(activeGroupId, pw);
    if (rsn) setMyRsn(rsn);
    setShowPasswordModal(false);
    pushToast('Unlocked! 🔓', 'success');
    // If no RSN was chosen, prompt them to pick one now
    if (!rsn) setTimeout(() => setShowRsnModal(true), 300);
  }

  async function handleClaimSubmit(rsn) {
    const result = await api.claimGroup(activeGroupId);
    saveGroupPassword(activeGroupId, result.secret);
    if (rsn) setMyRsn(rsn);
    await loadGroups(); // refresh to get updated is_claimed
    return result; // returns { secret } so modal can display it
  }

  if (loading) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:16}}>
        <span className="spinner" style={{width:32,height:32}} />
        <span className="text-dim">Loading…</span>
      </div>
    );
  }

  const isUnlocked = !!groupPasswords[activeGroupId];
  // canWrite: must have a stored password (works for both claimed and future unclaimed groups you own)
  const canWrite = isUnlocked;

  // No group yet, or creating a new one
  if (groups.length === 0 || creatingGroup) {
    return (
      <div className="app">
        <Header group={null} onSynced={() => {}} onToast={pushToast} />
        <SetupScreen
          onCreated={handleGroupCreated}
          onToast={pushToast}
          prefill={pendingImport}
          onCancel={groups.length > 0 ? () => { setCreatingGroup(false); setPendingImport(null); } : null}
          groups={allGroups}
          onSwitchToGroup={id => { setCreatingGroup(false); setPendingImport(null); selectGroup(id); }}
        />
        <ToastArea toasts={toasts} />
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        group={group}
        onSynced={refresh}
        onToast={pushToast}
        isUnlocked={isUnlocked}
        isClaimed={!!group?.is_claimed}
        myRsn={myRsn}
        onLockClick={() => setShowPasswordModal(true)}
        onClaimClick={() => setShowClaimModal(true)}
        onSetRsnClick={() => setShowRsnModal(true)}
        onWebhookClick={() => setShowWebhookModal(true)}
        onMenuToggle={() => setShowMobileSidebar(s => !s)}
        mobileMenuOpen={showMobileSidebar}
        onTourClick={() => setShowTour(true)}
      />
      <div className="main-layout">
        {/* Mobile overlay — tapping closes the sidebar */}
        <div
          className={`mobile-overlay${showMobileSidebar ? ' active' : ''}`}
          onClick={() => setShowMobileSidebar(false)}
        />
        <Sidebar
          groups={groups}
          activeGroupId={activeGroupId}
          onSelect={selectGroup}
          onNewGroup={() => setCreatingGroup(true)}
          onSearch={() => { setShowSearchModal(true); setShowMobileSidebar(false); }}
          favoriteGroupIds={favoriteGroupIds}
          isOpen={showMobileSidebar}
        />
        <main className="content">
          {group ? (
            <>
              <div className="page-title">{group.name}</div>
              <div className="page-sub">
                {group.group_rsn && <span style={{marginRight:12}}>🏰 {group.group_rsn}</span>}
                <span>{group.players?.length || 0} members</span>
                {group.group_total_xp > 0 && (
                  <span style={{marginLeft:12}}>
                    · Rank: {group.group_total_xp?.toLocaleString()} total XP
                  </span>
                )}
              </div>
              <Dashboard
                group={group}
                goals={goals}
                pendingRequests={pendingRequests}
                onRefresh={refresh}
                onToast={pushToast}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onAddPlayer={() => setShowAddPlayer(true)}
                groupId={activeGroupId}
                myRsn={myRsn}
                onSetMyRsn={setMyRsn}
                canWrite={canWrite}
              />
              {showAddPlayer && (
                <AddPlayerModal
                  groupId={group.id}
                  onClose={() => setShowAddPlayer(false)}
                  onAdded={refresh}
                  onToast={pushToast}
                />
              )}
            </>
          ) : (
            <div className="empty-state" style={{marginTop:80}}>
              <span className="spinner" style={{width:24,height:24,marginBottom:16}} />
              <p>Loading group…</p>
            </div>
          )}
        </main>
      </div>
      {showWebhookModal && activeGroupId && (
        <WebhookSettings
          groupId={activeGroupId}
          onClose={() => setShowWebhookModal(false)}
          onToast={pushToast}
        />
      )}
      {showRsnModal && (
        <SetRsnModal
          group={group}
          myRsn={myRsn}
          onConfirm={rsn => { setMyRsn(rsn); setShowRsnModal(false); }}
          onCancel={() => setShowRsnModal(false)}
        />
      )}
      {showPasswordModal && (
        <UnlockModal
          group={group}
          onConfirm={handlePasswordSubmit}
          onCancel={() => setShowPasswordModal(false)}
        />
      )}
      {showClaimModal && (
        <ClaimModal
          group={group}
          onConfirm={handleClaimSubmit}
          onCancel={() => setShowClaimModal(false)}
        />
      )}
      {showSearchModal && (
        <SearchGroupModal
          groups={groups}
          allDbGroups={allGroups}
          onSelect={selectGroup}
          onAddNew={handleSearchAddNew}
          onClose={() => setShowSearchModal(false)}
          onToast={pushToast}
          onRemove={removeFromSidebar}
          onFavorite={toggleFavorite}
          favoriteGroupIds={favoriteGroupIds}
        />
      )}
      {showTour && (
        <TourOverlay
          onComplete={() => {
            localStorage.setItem('tourCompleted', '1');
            setShowTour(false);
          }}
        />
      )}
      <ToastArea toasts={toasts} />
    </div>
  );
}

function ToastArea({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-area">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>
      ))}
    </div>
  );
}
