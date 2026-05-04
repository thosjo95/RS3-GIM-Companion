import React, { useState, useMemo } from 'react';

// RuneMetrics dates come as "04-May-2024 01:03" — parse to a comparable timestamp
function parseRMDate(str) {
  if (!str) return 0;
  try {
    return new Date(str.replace(/(\d+)-(\w+)-(\d+)/, '$2 $1 $3')).getTime();
  } catch {
    return 0;
  }
}

const PLAYER_COLORS = [
  'var(--gold)',
  '#7eb8f7',
  '#7ef7a8',
  '#f77e7e',
  '#d07ef7',
  '#f7c97e',
];

export default function ActivityTab({ players }) {
  const [filter, setFilter] = useState(null); // null = all players

  const playersWithActivity = useMemo(() =>
    players
      .map((p, i) => {
        let acts = [];
        try { acts = p.activities_json ? JSON.parse(p.activities_json) : []; } catch {}
        return { ...p, acts, color: PLAYER_COLORS[i % PLAYER_COLORS.length] };
      })
      .filter(p => p.acts.length > 0),
    [players]
  );

  const feed = useMemo(() => {
    const source = filter ? playersWithActivity.filter(p => p.id === filter) : playersWithActivity;
    const all = source.flatMap(p =>
      p.acts.map(a => ({ ...a, rsn: p.rsn, color: p.color, playerId: p.id }))
    );
    all.sort((a, b) => parseRMDate(b.date) - parseRMDate(a.date));
    return all.slice(0, 100);
  }, [playersWithActivity, filter]);

  if (playersWithActivity.length === 0) {
    return (
      <div className="empty-state" style={{ paddingTop: 48 }}>
        <div className="icon">📋</div>
        <p>No recent activity found. Sync players to load their RuneMetrics feed.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Player filter chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        <button
          className={`btn btn-sm ${filter === null ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilter(null)}>
          All players
        </button>
        {playersWithActivity.map(p => (
          <button
            key={p.id}
            className={`btn btn-sm ${filter === p.id ? 'btn-primary' : 'btn-secondary'}`}
            style={filter === p.id ? {} : { borderColor: p.color, color: p.color }}
            onClick={() => setFilter(filter === p.id ? null : p.id)}>
            {p.rsn}
            <span style={{ marginLeft: 4, opacity: 0.7, fontSize: 10 }}>({p.acts.length})</span>
          </button>
        ))}
      </div>

      {/* Activity feed */}
      {feed.length === 0 ? (
        <div className="empty-state"><p>No activity for this player.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {feed.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '9px 12px',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
            }}>
              {/* Player tag */}
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px',
                background: 'rgba(0,0,0,0.3)', borderRadius: 10,
                color: a.color, border: `1px solid ${a.color}`,
                whiteSpace: 'nowrap', flexShrink: 0, marginTop: 1,
              }}>
                {a.rsn}
              </span>

              {/* Activity text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text-bright)', fontWeight: 500 }}>
                  {a.text}
                </div>
                {a.details && a.details !== a.text && (
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                    {a.details}
                  </div>
                )}
              </div>

              {/* Date */}
              {a.date && (
                <span style={{ fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2 }}>
                  {a.date}
                </span>
              )}
            </div>
          ))}
          {feed.length === 100 && (
            <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-dim)', paddingTop: 8 }}>
              Showing 100 most recent activities
            </div>
          )}
        </div>
      )}
    </div>
  );
}
