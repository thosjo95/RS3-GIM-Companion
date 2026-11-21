import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import RsIcon from './RsIcon';
import { fmtXp } from '../lib/rs3';

// The group's headline numbers as a compact strip in the top bar: members, rank on the official Group Ironman
// hiscores, total XP, total levels and how many members earned XP in the past 7 days.

// A small "XP" badge (drawn here, no image needed).
function XpBadge({ size = 15 }) {
  return <span style={{ width: size + 4, height: size, borderRadius: 4, background: 'linear-gradient(#e8d48a, #a98a2e)', color: '#2a1f08', fontSize: 9, fontWeight: 900, letterSpacing: '0.3px',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>XP</span>;
}

export default function HeaderStats({ group }) {
  const players = group?.players ?? [];
  const type = group?.gim_type ?? 'regular';
  const [rank, setRank] = useState(null);
  useEffect(() => {
    setRank(null);
    if (!group?.id || !['regular', 'competitive'].includes(type)) return undefined;
    let alive = true;
    api.getGroupRank(group.id).then(r => { if (alive) setRank(r); }).catch(() => {});
    return () => { alive = false; };
  }, [group?.id, type]);

  const s = useMemo(() => {
    let xp = 0, levels = 0;
    for (const p of players) {
      const ov = p.skills?.find(x => x.skill_name === 'Overall');
      xp += ov?.xp || 0; levels += ov?.level || 0;
    }
    const hasWeekly = players.some(p => p.weekly_xp_gain != null);
    const active = players.filter(p => (p.weekly_xp_gain ?? 0) > 0).length;
    return { xp, levels, hasWeekly, active };
  }, [players]);
  if (players.length === 0) return null;

  const items = [
    { node: <RsIcon name="group" fallback="👥" size={15} />, value: players.length, tip: 'Members' },
    ...(rank?.rank ? [{ node: <RsIcon name="leaderboards" fallback="🏆" size={15} />, value: `#${rank.rank.toLocaleString()}`, tip: `Rank on the official Group Ironman hiscores (of ${rank.total.toLocaleString()} groups). Click to open your group on RuneScape.com`,
      href: `https://rs.runescape.com/hiscores/group-ironman/${type}/${group.gim_size ?? 5}/${encodeURIComponent((group.group_rsn || group.name || '').trim())}` }] : []),
    { node: <XpBadge />, value: fmtXp(s.xp), tip: 'Total XP of the group' },
    { node: <RsIcon name="overview" fallback="📊" size={15} />, value: s.levels.toLocaleString(), tip: 'Total levels of the group' },
    { node: <RsIcon name="fire" fallback="🔥" size={15} />, value: s.hasWeekly ? `${s.active}/${players.length}` : '–', tip: 'Members who earned XP in the past 7 days' },
  ];
  return (
    <div className="header-stats" data-tour="header-stats" style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 12 }}>
      {items.map(it => {
        const Tag = it.href ? 'a' : 'div';
        return (
        <Tag key={it.tip} title={it.tip} {...(it.href ? { href: it.href, target: '_blank', rel: 'noopener noreferrer' } : {})} style={{ display: 'inline-flex', textDecoration: 'none', cursor: it.href ? 'pointer' : 'default', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999,
          background: 'var(--bg-panel-alt)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 700, color: 'var(--gold-light)', whiteSpace: 'nowrap' }}>
          {it.node}{it.value}
        </Tag>
        );
      })}
    </div>
  );
}
