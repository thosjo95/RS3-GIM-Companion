import React, { useMemo } from 'react';
import { MEMBER_COLORS, parseRMDate } from '../../lib/rs3';

// ── Activity feed ─────────────────────────────────────────────────────────────

export default function ActivityFeed({ players, filteredPlayerId }) {
  const colorMap = Object.fromEntries(players.map((p, i) => [p.id, MEMBER_COLORS[i % MEMBER_COLORS.length]]));

  const feed = useMemo(() => {
    const source = filteredPlayerId ? players.filter(p => p.id === filteredPlayerId) : players;
    const all = source.flatMap(p => {
      let acts = [];
      try { acts = p.activities_json ? JSON.parse(p.activities_json) : []; } catch {}
      return acts.map(a => ({ ...a, rsn: p.rsn, playerId: p.id }));
    });
    all.sort((a, b) => parseRMDate(b.date) - parseRMDate(a.date));
    return all.slice(0, 40);
  }, [players, filteredPlayerId]);

  if (feed.length === 0) {
    return (
      <div style={{
        display: 'flex', gap: 10, alignItems: 'flex-start',
        background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.25)',
        borderRadius: 8, padding: '12px 14px', margin: '4px 0',
      }}>
        <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚠️</span>
        <div>
          <div style={{ color: '#e07070', fontWeight: 600, fontSize: 12, marginBottom: 3 }}>
            Activity feed unavailable
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: 12, lineHeight: 1.5 }}>
            No activity data has been loaded yet. This is usually because the RuneMetrics API (Jagex) is
            temporarily down or unreachable. The feed refreshes automatically every 2 hours — check back later.
            Also make sure each player's RuneMetrics profile is set to{' '}
            <strong style={{ color: 'var(--text)' }}>Public</strong> in-game under{' '}
            <em>Settings → Gameplay → Chat &amp; Social → RuneMetrics Event Log</em>.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {feed.map((a, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px', background: 'var(--bg-panel-alt)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
            color: colorMap[a.playerId], border: `1px solid ${colorMap[a.playerId]}`,
            background: 'rgba(0,0,0,0.3)', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 1,
          }}>{a.rsn}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--text-bright)', fontWeight: 500 }}>{a.text}</div>
            {a.details && a.details !== a.text && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>{a.details}</div>}
          </div>
          {a.date && <span style={{ fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2 }}>{a.date}</span>}
        </div>
      ))}
    </div>
  );
}
