import React, { useMemo, useState } from 'react';
import { MEMBER_COLORS, SKILLS, fmtXp, parseRMDate } from '../../lib/rs3';
import SkillIcon from '../common/SkillIcon';
import RsIcon from '../RsIcon';
import { ItemIcon } from '../GameIcon';

// ── Activity feed ─────────────────────────────────────────────────────────────
// The Adventurer's Log events of the group, grouped by day, with an icon per kind, repeated events folded together
// and a few filters.

const FILTERS = [['all', 'All'], ['level', 'Levels'], ['quest', 'Quests'], ['milestone', 'XP'], ['other', 'Other']];
const PAGE = 30;

// "I killed X." -> "killed X" (it follows the player's name); other sentences just start with a small letter.
const asVerb = t => { const s = t.replace(/^I\s+/, '').replace(/\.$/, ''); return s.charAt(0).toLowerCase() + s.slice(1); };

/** What kind of event this is and the plain sentence for it. */
function describe(a) {
  const text = String(a.text ?? '');
  const details = String(a.details ?? '');
  let m;
  if ((m = /^Levelled up (.+?)\.?$/i.exec(text)) && SKILLS.includes(m[1])) {
    const lvl = /level (\d+)/i.exec(details)?.[1];
    return { kind: 'level', skill: m[1], verb: lvl ? `reached level ${lvl} in ${m[1]}` : `levelled up ${m[1]}`, level: lvl ? Number(lvl) : null, sub: null };
  }
  if ((m = /^(\d+)\s*XP in (.+?)\.?$/i.exec(text)) && SKILLS.includes(m[2])) {
    return { kind: 'milestone', skill: m[2], verb: `reached ${fmtXp(Number(m[1]))} XP in ${m[2]}`, sub: null };
  }
  if ((m = /^Quest complete:\s*(.+?)\.?$/i.exec(text))) {
    return { kind: 'quest', verb: `completed the quest ${m[1]}`, sub: details || null };
  }
  if ((m = /^(?:Item found|I found|Found)[:\s]+(.+?)\.?$/i.exec(text))) {
    return { kind: 'drop', item: m[1].replace(/^an? /i, ''), verb: `found ${m[1]}`, sub: details || null };
  }
  if (/killed|defeated|slain/i.test(text)) return { kind: 'boss', verb: asVerb(text), sub: details && details !== text ? details : null };
  if (/challenged by/i.test(text)) return { kind: 'boss', verb: asVerb(text), sub: details && details !== text ? details : null };
  return { kind: 'other', verb: asVerb(text), sub: details && details !== text ? details : null };
}

function Icon({ d }) {
  if (d.kind === 'level' || d.kind === 'milestone') return <SkillIcon name={d.skill} size={24} />;
  if (d.kind === 'quest') return <RsIcon name="quests" fallback="" size={24} />;
  if (d.kind === 'drop') return <ItemIcon name={d.item} size={24} />;
  if (d.kind === 'boss') return <RsIcon name="bosses" fallback="" size={24} />;
  return <RsIcon name="activeGoals" fallback="" size={22} />;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayKey = ts => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
function dayLabel(ts) {
  const d = new Date(ts), now = new Date();
  const k = dayKey(ts);
  if (k === dayKey(now)) return 'Today';
  if (k === dayKey(now.getTime() - 86400000)) return 'Yesterday';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : ''}`;
}
const clock = ts => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function ActivityFeed({ players, filteredPlayerId }) {
  const [filter, setFilter] = useState('all');
  const [shown, setShown] = useState(PAGE);
  const colorMap = Object.fromEntries(players.map((p, i) => [p.id, MEMBER_COLORS[i % MEMBER_COLORS.length]]));

  const events = useMemo(() => {
    const source = filteredPlayerId ? players.filter(p => p.id === filteredPlayerId) : players;
    const all = source.flatMap(p => {
      let acts = [];
      try { acts = p.activities_json ? JSON.parse(p.activities_json) : []; } catch { /* corrupt feed: ignore */ }
      return acts.map(a => ({ ...a, rsn: p.rsn, playerId: p.id, ts: parseRMDate(a.date), d: describe(a) }));
    });
    all.sort((a, b) => b.ts - a.ts);
    // fold the same event of the same player that happens again and again ("completed a tetracompass" x 5)
    const folded = [];
    for (const e of all) {
      const prev = folded[folded.length - 1];
      if (prev && prev.playerId === e.playerId && prev.text === e.text && dayKey(prev.ts) === dayKey(e.ts)) { prev.count++; prev.firstTs = e.ts; }
      else folded.push({ ...e, count: 1, firstTs: e.ts });
    }
    return folded;
  }, [players, filteredPlayerId]);

  const visible = events.filter(e => filter === 'all' || (filter === 'other' ? !['level', 'quest', 'milestone'].includes(e.d.kind) : e.d.kind === filter));

  if (events.length === 0) {
    return (
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'rgba(220,60,60,0.08)', border: '1px solid rgba(220,60,60,0.25)', borderRadius: 8, padding: '12px 14px', margin: '4px 0' }}>
        <div>
          <div style={{ color: '#e07070', fontWeight: 600, fontSize: 12, marginBottom: 3 }}>Activity feed unavailable</div>
          <div style={{ color: 'var(--text-dim)', fontSize: 12, lineHeight: 1.5 }}>
            No activity data has been loaded yet. This is usually because Jagex's Adventurer's Log API is temporarily down or unreachable.
            The feed refreshes automatically; check back later. Also make sure each player has the event types they want recorded switched{' '}
            <strong style={{ color: 'var(--text)' }}>on</strong> in-game under <em>Settings → Gameplay → Chat &amp; Social → RuneMetrics Event Log</em>.
          </div>
        </div>
      </div>
    );
  }

  const page = visible.slice(0, shown);
  let lastDay = null;
  return (
    <div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
        {FILTERS.map(([id, label]) => (
          <button key={id} type="button" className={`chip${filter === id ? ' active' : ''}`} onClick={() => { setFilter(id); setShown(PAGE); }} style={{ fontSize: 11, padding: '2px 10px' }}>{label}</button>
        ))}
      </div>

      {visible.length === 0 && <div style={{ color: 'var(--text-dim)', fontSize: 12, padding: '12px 4px' }}>Nothing of this kind yet.</div>}

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {page.map((e, i) => {
          const day = dayKey(e.ts);
          const header = day !== lastDay ? dayLabel(e.ts) : null;
          lastDay = day;
          return (
            <React.Fragment key={i}>
              {header && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--text-dim)', margin: '10px 2px 4px' }}>{header}</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 4px', borderRadius: 8 }} className="gs-row">
                <div style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 8, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon d={e.d} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.35 }}>
                    <strong style={{ color: colorMap[e.playerId], fontWeight: 700 }}>{e.rsn}</strong>{' '}
                    <span>{e.d.verb}</span>
                    {e.count > 1 && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: 'rgba(200,168,75,0.18)', color: 'var(--gold)' }}>×{e.count}</span>}
                  </div>
                  {e.d.sub && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.d.sub}>{e.d.sub}</div>}
                </div>
                <span title={e.date} style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{clock(e.ts)}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {visible.length > shown && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShown(s => s + PAGE)} style={{ width: '100%', marginTop: 8 }}>Show more ({visible.length - shown})</button>
      )}
    </div>
  );
}
