import React, { useState, useMemo } from 'react';

// ── Quest helpers ─────────────────────────────────────────────────────────────

export const DIFF_LABELS_MAP = { 0: 'Novice', 1: 'Intermediate', 2: 'Experienced', 3: 'Master', 4: 'Grandmaster' };

export const DIFF_COLORS     = { 0: '#7ef7a8', 1: '#7eb8f7', 2: '#f7c97e', 3: '#f77e7e', 4: '#d07ef7' };

export function QuestStatusIcon({ status }) {
  if (status === 'COMPLETED')  return <span style={{ color: 'var(--green-bright)', fontWeight: 700, fontSize: 14 }} title="Completed">✓</span>;
  if (status === 'STARTED')    return <span style={{ color: 'var(--gold)',         fontWeight: 600, fontSize: 13 }} title="Started">~</span>;
  return <span style={{ color: 'var(--border)', fontSize: 16, lineHeight: 1 }} title="Not started">·</span>;
}

export function DiffBadge({ difficulty }) {
  const label = DIFF_LABELS_MAP[difficulty] ?? '?';
  const color = DIFF_COLORS[difficulty]     ?? '#8a80a0';
  return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 3,
      background: color + '22', color, whiteSpace: 'nowrap', flexShrink: 0 }}>
      {label}
    </span>
  );
}

// ── Per-player quest table (shown in the player detail panel) ─────────────────

export function PlayerQuestTable({ player }) {
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [diffFilter,   setDiffFilter]   = useState('');

  const quests = useMemo(() => {
    try { return player.quests_json ? JSON.parse(player.quests_json) : []; } catch { return []; }
  }, [player.quests_json]);

  const sorted = useMemo(() =>
    [...quests].sort((a, b) => a.difficulty !== b.difficulty ? a.difficulty - b.difficulty : a.title.localeCompare(b.title)),
    [quests]);

  const filtered = useMemo(() => {
    let list = sorted;
    if (search.trim())    list = list.filter(q => q.title.toLowerCase().includes(search.toLowerCase()));
    if (diffFilter !== '') list = list.filter(q => q.difficulty === parseInt(diffFilter, 10));
    if (statusFilter === 'completed')   list = list.filter(q => q.status === 'COMPLETED');
    else if (statusFilter === 'started')     list = list.filter(q => q.status === 'STARTED');
    else if (statusFilter === 'not_started') list = list.filter(q => q.status === 'NOT_STARTED');
    return list;
  }, [sorted, search, diffFilter, statusFilter]);

  if (!quests.length) {
    return (
      <div className="empty-state">
        <div className="icon">📜</div>
        <p>No quest data yet.</p>
        <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          Requires a public RuneMetrics profile. Sync {player.rsn} to fetch quest data.
        </p>
      </div>
    );
  }

  const completed = quests.filter(q => q.status === 'COMPLETED');
  const totalQP   = completed.reduce((s, q) => s + (q.questPoints || 0), 0);

  return (
    <div>
      {/* Summary row */}
      <div style={{ display: 'flex', gap: 20, padding: '10px 12px', background: 'var(--bg-panel-alt)', borderRadius: 'var(--radius)', marginBottom: 12, fontSize: 13 }}>
        <span><strong style={{ color: 'var(--gold)' }}>{completed.length}</strong> <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>/ {quests.length} Completed</span></span>
        <span><strong style={{ color: 'var(--gold)' }}>{totalQP}</strong> <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>QP earned</span></span>
        <span><strong style={{ color: 'var(--text-bright)' }}>{filtered.length}</strong> <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>showing</span></span>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="form-input" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search quests…"
          style={{ flex: '1 1 130px', maxWidth: 200, fontSize: 12, padding: '4px 8px', height: 28 }} />
        {['all', 'completed', 'started', 'not_started'].map(s => (
          <button key={s} type="button"
            className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 10 }} onClick={() => setStatusFilter(s)}>
            {s === 'all' ? 'All' : s === 'completed' ? '✓ Done' : s === 'started' ? '~ Started' : '· Not started'}
          </button>
        ))}
      </div>

      {/* Quest table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ color: 'var(--text-dim)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            <th align="left"   style={{ padding: '4px 6px 8px', fontWeight: 600 }}>Quest</th>
            <th align="center" style={{ padding: '4px 6px 8px', fontWeight: 600 }}>QP</th>
            <th align="center" style={{ padding: '4px 6px 8px', fontWeight: 600 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((q, i) => (
            <tr key={q.title} style={{ borderTop: '1px solid var(--border)', background: i % 2 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
              <td style={{ padding: '5px 6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <DiffBadge difficulty={q.difficulty} />
                  <a href={`https://runescape.wiki/w/${encodeURIComponent(q.title.replace(/ /g, '_'))}`}
                    target="_blank" rel="noreferrer"
                    style={{ color: q.status === 'COMPLETED' ? 'var(--text-bright)' : 'var(--text)', textDecoration: 'none' }}>
                    {q.title}
                  </a>
                </div>
              </td>
              <td align="center" style={{ padding: '5px 6px', color: 'var(--gold)', fontWeight: 600 }}>{q.questPoints}</td>
              <td align="center" style={{ padding: '5px 6px' }}><QuestStatusIcon status={q.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Group-wide quest grid (shown in the Quests subtab of GroupStats) ───────────

export function QuestsPanel({ players, colorMap }) {
  const [search,       setSearch]       = useState('');
  const [diffFilter,   setDiffFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('not_all');
  const [playerFilter, setPlayerFilter] = useState(null);

  // Parse each player's quest data
  const playerQuests = useMemo(() => players.map(p => {
    let questList = [];
    try { questList = p.quests_json ? JSON.parse(p.quests_json) : []; } catch {}
    const questMap = new Map(questList.map(q => [q.title.toLowerCase(), q]));
    return { ...p, questList, questMap };
  }), [players]);

  const hasAnyData = playerQuests.some(p => p.questList.length > 0);

  // Build master quest list (union across all players, sorted by difficulty → title)
  const masterQuests = useMemo(() => {
    const seen = new Map();
    for (const p of playerQuests) {
      for (const q of p.questList) {
        if (!seen.has(q.title.toLowerCase())) seen.set(q.title.toLowerCase(), q);
      }
    }
    return [...seen.values()].sort((a, b) =>
      a.difficulty !== b.difficulty ? a.difficulty - b.difficulty : a.title.localeCompare(b.title));
  }, [playerQuests]);

  const visiblePlayers = useMemo(() =>
    playerFilter ? playerQuests.filter(p => p.id === playerFilter) : playerQuests.filter(p => p.questList.length > 0),
    [playerQuests, playerFilter]);

  const filteredQuests = useMemo(() => {
    let list = masterQuests;
    if (search.trim())     list = list.filter(q => q.title.toLowerCase().includes(search.toLowerCase()));
    if (diffFilter !== '') list = list.filter(q => q.difficulty === parseInt(diffFilter, 10));

    const checkPlayers = playerFilter
      ? playerQuests.filter(p => p.id === playerFilter)
      : playerQuests.filter(p => p.questList.length > 0);

    if (statusFilter === 'not_all') {
      list = list.filter(q => checkPlayers.some(p => (p.questMap.get(q.title.toLowerCase())?.status ?? 'NOT_STARTED') !== 'COMPLETED'));
    } else if (statusFilter === 'group_done') {
      list = list.filter(q => checkPlayers.length > 0 && checkPlayers.every(p => p.questMap.get(q.title.toLowerCase())?.status === 'COMPLETED'));
    }
    return list;
  }, [masterQuests, search, diffFilter, statusFilter, playerFilter, playerQuests]);

  if (!hasAnyData) {
    return (
      <div className="empty-state">
        <div className="icon">📜</div>
        <p>Quest data not yet loaded.</p>
        <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          Sync your players — quest lists are fetched from RuneMetrics (public profile required).
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="form-input" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search quests…"
          style={{ flex: '1 1 140px', maxWidth: 220, fontSize: 12, padding: '4px 8px', height: 28 }} />
        {/* Difficulty filter */}
        {[['', 'All'], ['0','Novice'], ['1','Intermediate'], ['2','Experienced'], ['3','Master'], ['4','Grandmaster']].map(([val, lbl]) => (
          <button key={val} type="button"
            className={`btn btn-sm ${diffFilter === val ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 10 }} onClick={() => setDiffFilter(val)}>{lbl}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Status filter */}
        {[['all','All quests'], ['not_all','Not all done'], ['group_done','Group complete']].map(([val, lbl]) => (
          <button key={val} type="button"
            className={`btn btn-sm ${statusFilter === val ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 10 }} onClick={() => setStatusFilter(val)}>{lbl}
          </button>
        ))}
        {/* Player filter pills */}
        {playerQuests.filter(p => p.questList.length > 0).map(p => (
          <button key={p.id} type="button"
            className={`btn btn-sm ${playerFilter === p.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 10, ...(playerFilter !== p.id && { color: colorMap[p.id] }) }}
            onClick={() => setPlayerFilter(playerFilter === p.id ? null : p.id)}>
            {p.rsn}
          </button>
        ))}
        <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 4 }}>{filteredQuests.length} quests</span>
      </div>

      {/* Grid table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
          <thead>
            <tr>
              <th align="left" style={{ padding: '4px 8px 8px 4px', fontWeight: 600, color: 'var(--text-dim)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4px', position: 'sticky', left: 0, background: 'var(--bg-panel)', zIndex: 3, minWidth: 200 }}>Quest</th>
              <th align="center" style={{ padding: '4px 6px 8px', fontWeight: 600, color: 'var(--text-dim)', fontSize: 10, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>QP</th>
              {visiblePlayers.map(p => (
                <th key={p.id} align="center" style={{ padding: '4px 10px 8px', fontWeight: 700, color: colorMap[p.id] ?? 'var(--text)', fontSize: 11, whiteSpace: 'nowrap' }}>{p.rsn}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredQuests.map((quest, rowIdx) => {
              const altBg = rowIdx % 2 ? 'rgba(255,255,255,0.018)' : 'transparent';
              const key   = quest.title.toLowerCase();
              return (
                <tr key={quest.title} style={{ borderTop: '1px solid var(--border)', background: altBg }}>
                  <td style={{ padding: '5px 8px 5px 4px', position: 'sticky', left: 0, background: altBg || 'var(--bg-panel)', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <DiffBadge difficulty={quest.difficulty} />
                      <a href={`https://runescape.wiki/w/${encodeURIComponent(quest.title.replace(/ /g, '_'))}`}
                        target="_blank" rel="noreferrer"
                        style={{ color: 'var(--text)', textDecoration: 'none' }}
                        onClick={e => e.stopPropagation()}>
                        {quest.title}
                      </a>
                    </div>
                  </td>
                  <td align="center" style={{ padding: '5px 6px', color: 'var(--gold)', fontWeight: 600, fontSize: 11 }}>{quest.questPoints}</td>
                  {visiblePlayers.map(p => (
                    <td key={p.id} align="center" style={{ padding: '5px 10px' }}>
                      <QuestStatusIcon status={p.questMap.get(key)?.status} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
