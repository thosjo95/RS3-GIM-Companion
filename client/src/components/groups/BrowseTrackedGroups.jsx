import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api/client';
import GimTypeLabel from '../common/GimTypeLabel';

// Inline browse panel used by both the modal and SetupScreen
export default function BrowseTrackedGroups({ pinnedIds = new Set(), onSelect, onClose, onStar }) {
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

  const typeLabel = t => <GimTypeLabel type={t} size={12} />;

  return (
    <div style={{marginBottom: open ? 12 : 4}}>
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'center',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '8px 12px',
          background: open ? 'rgba(200,168,75,0.08)' : 'var(--bg-panel-alt)',
          border: `1px solid ${open ? 'var(--gold-dark)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)', cursor: 'pointer',
          color: open ? 'var(--gold)' : 'var(--text-dim)',
          fontSize: 13, fontWeight: 600,
          transition: 'all 0.15s',
          gap: 6,
        }}>
        <span>Browse groups already tracked</span>
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
                style={{
                  display:'flex', alignItems:'center', gap:8,
                  padding:'8px 10px',
                  background:'var(--bg-panel)', border:'1px solid var(--border)',
                  borderRadius:'var(--radius)',
                  transition:'border-color 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor='var(--gold-dark)'}
                onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
              >
                {/* Group info — click to browse */}
                <div
                  style={{flex:1, minWidth:0, cursor:'pointer'}}
                  onClick={() => { onSelect(g.id); onClose?.(); }}
                >
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
                {/* Browse → */}
                <span
                  onClick={() => { onSelect(g.id); onClose?.(); }}
                  style={{fontSize:11, color:'var(--gold)', fontWeight:600, flexShrink:0, cursor:'pointer'}}>
                  Browse →
                </span>
                {/* ⭐ Save to your groups */}
                {onStar && (
                  <button
                    type="button"
                    title="Save to your groups"
                    onClick={() => {
                      onStar(g.id);
                      setResults(r => r.filter(x => x.id !== g.id));
                    }}
                    style={{
                      background:'none', border:'1px solid var(--border)',
                      borderRadius:'var(--radius)', cursor:'pointer',
                      padding:'3px 7px', fontSize:13, lineHeight:1,
                      color:'var(--text-dim)', flexShrink:0,
                      transition:'color 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color='var(--gold)'; e.currentTarget.style.borderColor='var(--gold-dark)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color='var(--text-dim)'; e.currentTarget.style.borderColor='var(--border)'; }}>
                    ☆
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
