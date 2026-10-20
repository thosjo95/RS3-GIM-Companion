import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/client';
import { fmtXp } from '../../lib/rs3';
import GimTypeLabel from '../common/GimTypeLabel';
import BrowseTrackedGroups from '../groups/BrowseTrackedGroups';

// ── Custom group name generator ───────────────────────────────────────────────
const CUSTOM_NAME_ADJECTIVES = [
  'Iron', 'Steel', 'Bronze', 'Dragon', 'Ancient', 'Chaos', 'Holy', 'Shadow',
  'Crystal', 'Arcane', 'Gilded', 'Blessed', 'Swift', 'Bold', 'Grim', 'Lunar',
  'Sacred', 'Dark', 'Frozen', 'Infernal', 'Runic', 'Silent', 'Eternal', 'Lost',
  'Cursed', 'Golden', 'Primal', 'Storm', 'Silver', 'Crimson', 'Verdant', 'Ashen',
];

const CUSTOM_NAME_NOUNS = [
  'Squad', 'Clan', 'Order', 'Alliance', 'Legion', 'Vanguard', 'Rangers',
  'Slayers', 'Hunters', 'Warriors', 'Champions', 'Brotherhood', 'Guild',
  'Band', 'Crew', 'Sentinels', 'Wanderers', 'Outlaws', 'Pioneers', 'Keepers',
  'Guardians', 'Raiders', 'Seekers', 'Disciples', 'Reapers', 'Companions',
];

function generateCustomGroupName(existingGroups = []) {
  const taken = new Set((existingGroups).map(g => g.name?.toLowerCase()));
  // Shuffle both lists and try every combination until we find a free name
  const adjs  = [...CUSTOM_NAME_ADJECTIVES].sort(() => Math.random() - 0.5);
  const nouns = [...CUSTOM_NAME_NOUNS].sort(() => Math.random() - 0.5);
  for (const adj of adjs) {
    for (const noun of nouns) {
      const candidate = `${adj} ${noun}`;
      if (!taken.has(candidate.toLowerCase())) return candidate;
    }
  }
  // Extremely unlikely to exhaust all combos — fallback with a number suffix
  return `Iron Squad ${Math.floor(Math.random() * 900) + 100}`;
}

// Setup screen — shown when no group exists
export default function SetupScreen({ onCreated, onToast, prefill, onCancel, groups, onSwitchToGroup, onStar }) {
  const [step, setStep] = useState(() => {
    if (!prefill) return 'search';
    // Unranked groups pre-filled from the search modal → skip straight to RSN entry
    if (prefill.type === 'regular_unranked') return 'manual';
    return 'preview';
  });
  const [gimType, setGimType] = useState(prefill?.type || 'regular');
  const [gimSize, setGimSize] = useState(prefill?.size || 5);
  const [groupName, setGroupName] = useState(prefill?.name || '');

  // For GIM types: random existing group name as hint
  const namePlaceholder = useMemo(() => {
    const names = (groups || []).map(g => g.name).filter(Boolean);
    if (names.length === 0) return 'e.g. True Deciples';
    return `e.g. ${names[Math.floor(Math.random() * names.length)]}`;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // For custom type: pre-generate a guaranteed-free name suggestion
  const customNameSuggestion = useMemo(() => generateCustomGroupName(groups), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fill the name input when the user picks custom type (and hasn't typed anything yet)
  useEffect(() => {
    if (gimType === 'custom' && !groupName) {
      setGroupName(customNameSuggestion);
    }
    if (gimType !== 'custom' && groupName === customNameSuggestion) {
      setGroupName(''); // clear the auto-fill if they switch away
    }
  }, [gimType]); // eslint-disable-line react-hooks/exhaustive-deps
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

    // ── Unranked & custom groups bypass hiscores — go straight to manual RSN entry ──
    if (gimType === 'regular_unranked' || gimType === 'custom') {
      const existing = groups?.find(g => g.name.toLowerCase() === groupName.trim().toLowerCase());
      if (existing) { onSwitchToGroup?.(existing.id); return; }
      setSearching(true);
      try {
        const dbResults = await api.searchGroups(groupName.trim());
        const dbMatch = dbResults.find(g => g.name.toLowerCase() === groupName.trim().toLowerCase());
        if (dbMatch) { onSwitchToGroup?.(dbMatch.id); return; }
      } catch {} finally { setSearching(false); }
      setManualRsns(Array(gimType === 'custom' ? 2 : gimSize).fill(''));
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
      // For unranked/custom groups the size is just the number of members added
      const size = (gimType === 'regular_unranked' || gimType === 'custom') ? rsns.length : gimSize;
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
        <img src="/logo-banner.png" alt="Group Ironman RS3 Companion" width={960} height={462} fetchPriority="high" style={{maxWidth:420,width:'100%',height:'auto',marginBottom:20}} />
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
        <img src="/logo-banner.png" alt="Group Ironman RS3 Companion" width={960} height={462} fetchPriority="high" style={{maxWidth:420,width:'100%',height:'auto',marginBottom:20}} />
        <div className="panel" style={cardStyle}>
          <div className="panel-header">
            <span className="panel-title">✓ Group Found</span>
            <span className="tag" style={{display:'inline-flex',alignItems:'center',gap:5}}><GimTypeLabel type={lookupResult.type} size={12} /> · {lookupResult.size} members</span>
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
        <img src="/logo-banner.png" alt="Group Ironman RS3 Companion" width={960} height={462} fetchPriority="high" style={{maxWidth:420,width:'100%',height:'auto',marginBottom:20}} />
        <div className="panel" style={cardStyle}>
          <div className="panel-header">
            <span className="panel-title">
              {gimType === 'custom' ? `Add Members — ${groupName}` : gimType === 'regular_unranked' ? `Add Members — ${groupName}` : 'Enter Member RSNs'}
            </span>
          </div>
          <div className="panel-body">
            <div style={{color:'var(--text-dim)',fontSize:13,marginBottom:14}}>
              {gimType === 'custom'
                ? 'Enter each player\'s RuneScape name. Stats will be synced from the RS3 hiscores automatically.'
                : gimType === 'regular_unranked'
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
      <img src="/logo-banner.png" alt="Group Ironman RS3 Companion" width={960} height={462} fetchPriority="high" style={{maxWidth:480,width:'100%',height:'auto',marginBottom:0}} />
      <p style={{maxWidth:460,textAlign:'center',lineHeight:1.7,color:'var(--text-dim)',fontSize:14,marginTop:0}}>
        Auto-sync hiscores · track weekly XP gains · manage group goals · log drops · share progress to Discord
      </p>
      <div className="panel" style={cardStyle}>
        <div className="panel-header"><span className="panel-title">Find Your Group</span></div>
        <form onSubmit={handleSearch}>
          <div className="panel-body" style={{textAlign:'center'}}>

            <div className="form-group">
              <label className="form-label" style={{display:'block',textAlign:'center'}}>Group Type</label>
              <div className="flex gap-8" style={{flexWrap:'wrap',justifyContent:'center'}}>
                {[
                  ['regular',          'Regular'],
                  ['competitive',      'Competitive'],
                  ['regular_unranked', 'Unranked'],
                  ['custom', 'Custom Group'],
                ].map(([val, label]) => (
                  <button key={val} type="button"
                    className={`btn btn-sm ${gimType === val ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setGimType(val)}
                    style={{display:'inline-flex',alignItems:'center',gap:5}}>
                    <GimTypeLabel type={val} size={12} iconOnly /> {label}
                  </button>
                ))}
              </div>
              {gimType === 'regular_unranked' && (
                <div className="text-xs text-dim mt-8" style={{textAlign:'center'}}>
                  For groups not on the RS3 GIM hiscores. Members are added manually by RSN in the next step.
                </div>
              )}
              {gimType === 'custom' && (
                <div className="text-xs mt-8" style={{textAlign:'center',color:'#38bdf8'}}>
                  For regular RS3 players tracking progress together — no GIM required.
                </div>
              )}
            </div>

            {gimType !== 'custom' && (
            <div className="form-group">
              <label className="form-label" style={{display:'block',textAlign:'center'}}>Group Size</label>
              <div className="flex gap-8" style={{justifyContent:'center'}}>
                {[2,3,4,5].map(n => (
                  <button key={n} type="button"
                    className={`btn btn-sm ${gimSize === n ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setGimSize(n)}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            )}

            <div className="form-group">
              <label className="form-label" style={{display:'block',textAlign:'center'}}>Group Name (exact in-game name)</label>
              <input className="form-input" value={groupName} onChange={e => setGroupName(e.target.value)}
                placeholder={namePlaceholder} required autoFocus style={{textAlign:'center'}} />
              {gimType === 'regular_unranked' ? (
                <div className="text-xs text-dim mt-8" style={{textAlign:'center'}}>
                  Choose any name to identify your group in the app.
                </div>
              ) : (
                <div className="text-xs text-dim mt-8" style={{textAlign:'center'}}>
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
            <button type="submit" className="btn btn-primary" disabled={searching || !groupName.trim()} style={{textAlign:'center',justifyContent:'center'}}>
              {searching
                ? <><span className="spinner" style={{width:12,height:12}}/> Searching…</>
                : gimType === 'regular_unranked'
                  ? 'Next: Add Members →'
                  : 'Search & Import Group'}
            </button>
            {onCancel && <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>}
          </div>
        </form>
      </div>

      {/* ── Browse groups already tracked in this app (collapsible) ── */}
      <div style={{...cardStyle, marginTop:12}}>
        <BrowseTrackedGroups
          onSelect={id => onSwitchToGroup?.(id)}
          onStar={onStar}
        />
      </div>
    </div>
  );
}
