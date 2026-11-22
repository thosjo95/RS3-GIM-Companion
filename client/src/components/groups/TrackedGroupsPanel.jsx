import React, { useEffect, useMemo, useState } from 'react';
import RsIcon from '../RsIcon';
import GimTypeLabel from '../common/GimTypeLabel';
import { fmtXp } from '../../lib/rs3';
import { loadGlobalStats } from '../global/globalData';
import BrowseTrackedGroups from './BrowseTrackedGroups';

// Every group already tracked on the site, ready to open: search, filter by mode and size, sort, a page at a time.
// It reads the Global Leaderboard numbers (one shared request), so each row can show the group's XP and this week's gain.
// Unlisted groups are not in those numbers, just as they are not in "Find groups". If the numbers cannot be loaded,
// the plain search list is shown instead.

const MODES = [['all', 'All'], ['regular', 'Regular'], ['competitive', 'Competitive'], ['regular_unranked', 'Unranked']];
const SORTS = [['active', 'Most active'], ['xp', 'Most XP'], ['newest', 'Newest'], ['name', 'A–Z']];
const PAGE = 8;
const norm = s => String(s || '').replace(/\s/g, ' ').toLowerCase().trim();

export default function TrackedGroupsPanel({ onSelect, onStar }) {
  const [groups, setGroups] = useState(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('all');
  const [size, setSize] = useState('all');
  const [sort, setSort] = useState('active');
  const [page, setPage] = useState(0);
  const [saved, setSaved] = useState(() => new Set());

  useEffect(() => {
    let live = true;
    loadGlobalStats().then(d => live && setGroups(d.groups.filter(g => !g.anon))).catch(() => live && setFailed(true));
    return () => { live = false; };
  }, []);
  useEffect(() => setPage(0), [query, mode, size, sort]);

  const list = useMemo(() => {
    if (!groups) return [];
    const q = norm(query);
    const by = {
      active: (a, b) => b.weekGain - a.weekGain || b.totalXp - a.totalXp,
      xp: (a, b) => b.totalXp - a.totalXp,
      newest: (a, b) => String(b.createdAt).localeCompare(String(a.createdAt)),
      name: (a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }),
    }[sort];
    return groups
      .filter(g => (!q || norm(g.name).includes(q)) && (mode === 'all' || g.type === mode) && (size === 'all' || g.size === size))
      .sort(by);
  }, [groups, query, mode, size, sort]);

  if (failed) return <BrowseTrackedGroups onSelect={onSelect} onStar={onStar} />;

  const sizes = [...new Set((groups || []).map(g => g.size).filter(Boolean))].sort((a, b) => a - b);
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const shown = list.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <div className="panel tg-panel">
      <div className="panel-header">
        <span className="panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <RsIcon name="group" size={18} />Groups already tracked
        </span>
        {groups && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{groups.length.toLocaleString('en-US')} groups</span>}
      </div>
      <div className="panel-body">
        <input className="form-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search a group by name…" />
        <div className="tg-controls">
          <div className="tg-chips">
            {MODES.map(([k, label]) => (
              <button key={k} type="button" className={`chip${mode === k ? ' active' : ''}`} onClick={() => setMode(k)}>
                {k !== 'all' && <GimTypeLabel type={k} size={12} iconOnly />}{label}
              </button>
            ))}
          </div>
          <div className="tg-chips">
            <button type="button" className={`chip${size === 'all' ? ' active' : ''}`} onClick={() => setSize('all')}>Any size</button>
            {sizes.map(s => (
              <button key={s} type="button" className={`chip${size === s ? ' active' : ''}`} onClick={() => setSize(s)}>{s === 1 ? 'Solo' : s}</button>
            ))}
          </div>
        </div>
        <div className="tg-sort">
          <span>Sort:</span>
          {SORTS.map(([k, label]) => (
            <button key={k} type="button" className={`tg-sort-btn${sort === k ? ' active' : ''}`} onClick={() => setSort(k)}>{label}</button>
          ))}
        </div>

        {!groups && <div style={{ textAlign: 'center', padding: 24 }}><span className="spinner" style={{ width: 18, height: 18 }} /></div>}
        {groups && list.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', padding: '18px 0' }}>
            {query.trim() ? <>No tracked group matches "{query}". Use <b>Find your group</b> to add it.</> : 'No groups here.'}
          </div>
        )}
        <div className="tg-list">
          {shown.map(g => (
            <div key={g.id} className="tg-row" role="button" tabIndex={0} onClick={() => onSelect(g.id)}
              onKeyDown={e => { if (e.key === 'Enter') onSelect(g.id); }} title={`Open ${g.name}`}>
              <GimTypeLabel type={g.type} size={20} iconOnly />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="tg-name">{g.name}</div>
                <div className="tg-sub">{g.members} member{g.members === 1 ? '' : 's'} · {fmtXp(g.totalXp)} XP</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {g.weekGain > 0
                  ? <><div className="tg-gain">+{fmtXp(g.weekGain)}</div><div className="tg-sub">this week</div></>
                  : <div className="tg-sub">quiet this week</div>}
              </div>
              {onStar && (
                <button type="button" className={`tg-star${saved.has(g.id) ? ' on' : ''}`} title={saved.has(g.id) ? 'Saved to your groups' : 'Save to your groups'}
                  onClick={e => { e.stopPropagation(); if (!saved.has(g.id)) { onStar(g.id); setSaved(s => new Set(s).add(g.id)); } }}>
                  {saved.has(g.id) ? '★' : '☆'}
                </button>
              )}
            </div>
          ))}
        </div>
        {list.length > PAGE && (
          <div className="gl-pager">
            <span>{page * PAGE + 1}–{Math.min(list.length, page * PAGE + PAGE)} of {list.length}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button type="button" className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} title="Previous page">‹</button>
              <span style={{ minWidth: 54, textAlign: 'center' }}>{page + 1} / {pages}</span>
              <button type="button" className="btn btn-ghost btn-sm" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)} title="Next page">›</button>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
