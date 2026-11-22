import React, { useEffect, useState } from 'react';
import RsIcon from '../RsIcon';
import GimTypeLabel from '../common/GimTypeLabel';
import { fmtXp } from '../../lib/rs3';
import { loadGlobalStats } from './globalData';

// The way into the Global Leaderboard on the first-visit page: a card with a few live numbers.
export default function GlobalTeaser({ onOpen }) {
  const [data, setData] = useState(null);
  useEffect(() => { let live = true; loadGlobalStats().then(d => live && setData(d)).catch(() => {}); return () => { live = false; }; }, []);

  const groups = (data?.groups || []);
  const active = groups.filter(g => g.weekGain > 0).length;
  const top = groups.filter(g => !g.anon && g.weekGain > 0).sort((a, b) => b.weekGain - a.weekGain)[0];

  return (
    <div className="gl-teaser" role="button" tabIndex={0} onClick={onOpen} onKeyDown={e => { if (e.key === 'Enter') onOpen(); }}>
      <RsIcon name="leaderboards" size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold)' }}>Global Leaderboard</div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>
          How every tracked group is doing: top groups and players of the week, month and year, boss kills, clue scrolls and the latest 99s.
        </div>
        {data && (
          <div className="gl-teaser-facts">
            <span><b>{groups.length.toLocaleString('en-US')}</b> groups tracked</span>
            <span><b>{active.toLocaleString('en-US')}</b> active this week</span>
            {top && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                Group of the week: <GimTypeLabel type={top.type} size={14} iconOnly /><b>{top.name}</b>
                <span style={{ color: 'var(--green-bright)' }}>+{fmtXp(top.weekGain)} XP</span>
              </span>
            )}
          </div>
        )}
      </div>
      <span className="btn btn-primary" style={{ flexShrink: 0 }}>Open the leaderboard →</span>
    </div>
  );
}
