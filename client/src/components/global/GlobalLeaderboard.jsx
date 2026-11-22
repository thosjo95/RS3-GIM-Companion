import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import RsIcon from '../RsIcon';
import { BossIcon, ItemIcon } from '../GameIcon';
import SkillIcon from '../common/SkillIcon';
import GimTypeLabel from '../common/GimTypeLabel';
import { fmtXp } from '../../lib/rs3';

// The Global Leaderboard: every Group Ironman group tracked on the site, side by side.
// All numbers come from GET /api/global/stats (public data only, rebuilt by the server every 10 minutes).

const PERIODS = [{ key: 'week', label: 'This week' }, { key: 'month', label: 'This month' }];
const MODES = [
  { key: 'all', label: 'All modes' }, { key: 'regular', label: 'Regular' },
  { key: 'competitive', label: 'Competitive' }, { key: 'regular_unranked', label: 'Unranked' },
];
const SIZES = ['all', 2, 3, 4, 5];
const MEASURES = [
  { key: 'gain', label: 'XP gained' }, { key: 'perMember', label: 'Per member' }, { key: 'total', label: 'Total XP' },
];

const fmtInt = n => Number(n ?? 0).toLocaleString('en-US');
function ago(iso) {
  const t = Date.parse(iso); if (!t) return '';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 60) return `${Math.max(1, m)} min ago`;
  if (m < 48 * 60) return `${Math.round(m / 60)} h ago`;
  return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function Chips({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map(o => (
        <button key={o.key} className={`chip${value === o.key ? ' active' : ''}`} onClick={() => onChange(o.key)}>{o.label}</button>
      ))}
    </div>
  );
}

function Panel({ icon, title, right, children, bodyStyle }) {
  return (
    <div className="panel" style={{ minWidth: 0 }}>
      <div className="panel-header" style={{ flexWrap: 'wrap' }}>
        <span className="panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {icon && <RsIcon name={icon} size={18} />}{title}
        </span>
        {right}
      </div>
      <div className="panel-body" style={bodyStyle}>{children}</div>
    </div>
  );
}

function Stat({ icon, label, value, sub }) {
  return (
    <div className="stat-box" style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
      <RsIcon name={icon} size={30} />
      <div style={{ minWidth: 0 }}>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

// a rank number: gold, silver and bronze for the first three
const RANK_COLORS = ['#e8c35a', '#c9d1d9', '#d38a4f'];
const Rank = ({ i }) => (
  <span style={{ width: 26, flexShrink: 0, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: RANK_COLORS[i] ?? 'var(--text-dim)' }}>{i + 1}</span>
);

function Row({ onClick, children, title }) {
  return (
    <div className="gl-row" onClick={onClick} title={title} role={onClick ? 'button' : undefined}>
      {children}
    </div>
  );
}

const GroupLink = ({ name, sub }) => (
  <span style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
    <span style={{ display: 'block', color: 'var(--text-bright)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
    {sub && <span style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>}
  </span>
);

function Spotlight({ label, icon, group, value, sub, onOpen }) {
  return (
    <div className="panel gl-spot" onClick={group ? () => onOpen(group.id) : undefined} role={group ? 'button' : undefined}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--gold)' }}>
        <RsIcon name={icon} size={18} />{label}
      </div>
      {group ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, minWidth: 0 }}>
            {group.type && <GimTypeLabel type={group.type} size={20} iconOnly />}
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-bright)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.name}</span>
          </div>
          <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700, color: 'var(--green-bright)' }}>{value}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{sub}</div>
        </>
      ) : <div className="text-dim" style={{ marginTop: 10 }}>Nobody yet</div>}
    </div>
  );
}

export default function GlobalLeaderboard({ onOpenGroup }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('week');
  const [measure, setMeasure] = useState('gain');
  const [mode, setMode] = useState('all');
  const [size, setSize] = useState('all');

  useEffect(() => {
    let live = true;
    api.getGlobalStats().then(d => live && setData(d)).catch(e => live && setError(e.message));
    return () => { live = false; };
  }, []);

  const gainKey = period === 'week' ? 'weekGain' : 'monthGain';
  const periodWord = period === 'week' ? 'this week' : 'this month';

  const ranked = useMemo(() => {
    if (!data) return [];
    const value = g => measure === 'total' ? g.totalXp : measure === 'perMember' ? g[gainKey] / Math.max(1, g.members) : g[gainKey];
    return data.groups
      .filter(g => (mode === 'all' || g.type === mode) && (size === 'all' || g.size === size))
      .map(g => ({ ...g, value: value(g) }))
      .filter(g => g.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data, measure, mode, size, gainKey]);

  if (error) return <div className="empty-state" style={{ marginTop: 80 }}><p>Could not load the global leaderboard: {error}</p></div>;
  if (!data) return <div className="empty-state" style={{ marginTop: 80 }}><span className="spinner" style={{ width: 24, height: 24, marginBottom: 16 }} /><p>Loading the global leaderboard…</p></div>;

  const { totals } = data;
  const best = key => [...data.groups].sort((a, b) => b[key] - a[key])[0];
  const gw = best('weekGain'), gm = best('monthGain');
  const bossTop = data.bosses.week.topGroup;
  const skills = data.skills[period].slice(0, 8);
  const skillMax = skills[0]?.xp || 1;
  const bosses = data.bosses[period].top.slice(0, 8);
  const newest = [...data.groups].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 6);
  const count = (list, f) => list.filter(f).length;
  const modeSplit = MODES.slice(1).map(m => ({ ...m, n: count(data.groups, g => g.type === m.key) }));
  const sizeSplit = [2, 3, 4, 5].map(s => ({ key: s, label: `${s} players`, n: count(data.groups, g => g.size === s) }));
  const splitMax = Math.max(1, ...modeSplit.map(m => m.n), ...sizeSplit.map(s => s.n));
  const measureLabel = measure === 'total' ? 'total XP' : measure === 'perMember' ? `XP per member ${periodWord}` : `XP gained ${periodWord}`;

  return (
    <div className="gl-page">
      {/* title and the one period switch for the whole page */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <RsIcon name="leaderboards" size={38} />
          <div>
            <h1 style={{ margin: 0, fontSize: 22, color: 'var(--gold)' }}>Global Leaderboard</h1>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              Every Group Ironman group tracked on groupiron.com · updated {ago(data.updatedAt)}
            </div>
          </div>
        </div>
        <Chips options={PERIODS} value={period} onChange={setPeriod} />
      </div>

      <div className="gl-stats">
        <Stat icon="group" label="Groups tracked" value={fmtInt(totals.groups)} sub={`${totals.newGroupsMonth} new this month`} />
        <Stat icon="overview" label="Active this week" value={fmtInt(totals.activeGroups)} sub={`groups · ${fmtInt(totals.activePlayers)} players gaining XP`} />
        <Stat icon="player" label="Players" value={fmtInt(totals.players)} sub={`${fmtXp(totals.totalXp)} XP between them`} />
        <Stat icon="lamp" label={`XP gained ${periodWord}`} value={fmtXp(period === 'week' ? totals.weekXp : totals.monthXp)} sub="all groups together" />
        <Stat icon="maxCape" label={`99s and 120s ${periodWord}`} value={fmtInt(period === 'week' ? data.milestones.weekCount : data.milestones.monthCount)} sub="from the Adventurer's Log" />
        <Stat icon="bosses" label={`Boss kills ${periodWord}`} value={fmtInt(data.bosses[period].total)} sub="from the Adventurer's Log" />
      </div>

      <div className="grid-3" style={{ marginTop: 16 }}>
        <Spotlight label="Group of the week" icon="leaderboards" group={gw?.weekGain > 0 ? gw : null} onOpen={onOpenGroup}
          value={`+${fmtXp(gw?.weekGain)} XP`} sub={gw && `${gw.members} members · ${fmtXp(gw.weekGain / Math.max(1, gw.members))} each`} />
        <Spotlight label="Group of the month" icon="mastery" group={gm?.monthGain > 0 ? gm : null} onOpen={onOpenGroup}
          value={`+${fmtXp(gm?.monthGain)} XP`} sub={gm && `${gm.members} members · ${fmtXp(gm.monthGain / Math.max(1, gm.members))} each`} />
        <Spotlight label="Boss hunters of the week" icon="slayer" group={bossTop} onOpen={onOpenGroup}
          value={bossTop && `${fmtInt(bossTop.kills)} kills`} sub="boss kills in the Adventurer's Log" />
      </div>

      <div className="gl-main" style={{ marginTop: 16 }}>
        <Panel icon="leaderboards" title="Group rankings"
          right={<Chips options={MEASURES} value={measure} onChange={setMeasure} />}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, justifyContent: 'space-between' }}>
            <Chips options={MODES} value={mode} onChange={setMode} />
            <Chips options={SIZES.map(s => ({ key: s, label: s === 'all' ? 'Any size' : `${s}-player` }))} value={size} onChange={setSize} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Ranked by {measureLabel} · click a group to open it</div>
          {ranked.length === 0 && <div className="text-dim">No groups match these filters.</div>}
          {ranked.slice(0, 15).map((g, i) => (
            <Row key={g.id} onClick={() => onOpenGroup(g.id)}>
              <Rank i={i} />
              <GimTypeLabel type={g.type} size={18} iconOnly />
              <GroupLink name={g.name} sub={`${g.members} member${g.members === 1 ? '' : 's'}${g.activeMembers ? ` · ${g.activeMembers} active this week` : ''}`} />
              <span className="gl-num">{measure === 'total' ? fmtXp(g.value) : `+${fmtXp(g.value)}`}</span>
            </Row>
          ))}
        </Panel>

        <Panel icon="player" title={`Top players ${periodWord}`}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Most XP gained by one player</div>
          {data.players[period].length === 0 && <div className="text-dim">No XP gained yet.</div>}
          {data.players[period].slice(0, 10).map((p, i) => (
            <Row key={p.rsn + p.groupId} onClick={() => onOpenGroup(p.groupId)} title={`Open ${p.groupName}`}>
              <Rank i={i} />
              <GroupLink name={p.rsn} sub={p.groupName} />
              <span className="gl-num">+{fmtXp(p.gain)}</span>
            </Row>
          ))}
        </Panel>
      </div>

      <div className="grid-3" style={{ marginTop: 16 }}>
        <Panel icon="skills" title={`Most trained skills ${periodWord}`}>
          {skills.length === 0 && <div className="text-dim">No XP gained yet.</div>}
          {skills.map(s => (
            <div key={s.skill} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
              <SkillIcon name={s.skill} size={20} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span>{s.skill}</span><span className="gl-num" style={{ fontSize: 12 }}>{fmtXp(s.xp)}</span>
                </div>
                <div className="gl-bar"><div style={{ width: `${(s.xp / skillMax) * 100}%` }} /></div>
              </div>
            </div>
          ))}
        </Panel>

        <Panel icon="bosses" title={`Most killed bosses ${periodWord}`}>
          {bosses.length === 0 && <div className="text-dim">No boss kills logged yet.</div>}
          {bosses.map((b, i) => (
            <Row key={b.name}>
              <Rank i={i} />
              <BossIcon name={b.name} size={26} fallback={<RsIcon name="skull" size={22} />} />
              <GroupLink name={b.name} />
              <span className="gl-num">{fmtInt(b.kills)}</span>
            </Row>
          ))}
        </Panel>

        <Panel icon="maxCape" title="Latest 99s and 120s">
          {data.milestones.recent.length === 0 && <div className="text-dim">None this month yet.</div>}
          {data.milestones.recent.slice(0, 8).map((m, i) => (
            <Row key={i} onClick={() => onOpenGroup(m.groupId)} title={`Open ${m.groupName}`}>
              <SkillIcon name={m.skill} size={22} />
              <GroupLink name={<><b style={{ color: m.level >= 120 ? '#e8c35a' : 'var(--text-bright)' }}>{m.level}</b> {m.skill} · {m.rsn}</>} sub={m.groupName} />
              <span style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{ago(m.at)}</span>
            </Row>
          ))}
        </Panel>
      </div>

      <div className="grid-3" style={{ marginTop: 16, marginBottom: 24 }}>
        <Panel icon="drops" title="Latest drops">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
            {fmtInt(period === 'week' ? data.drops.weekCount : data.drops.monthCount)} drops in the Adventurer's Log {periodWord}
          </div>
          {data.drops.recent.slice(0, 8).map((d, i) => (
            <Row key={i} onClick={() => onOpenGroup(d.groupId)} title={`Open ${d.groupName}`}>
              <ItemIcon name={d.item} size={26} />
              <GroupLink name={d.item.charAt(0).toUpperCase() + d.item.slice(1)} sub={`${d.rsn} · ${d.groupName}`} />
              <span style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{ago(d.at)}</span>
            </Row>
          ))}
        </Panel>

        <Panel icon="group" title="Newest groups">
          {newest.map(g => (
            <Row key={g.id} onClick={() => onOpenGroup(g.id)}>
              <GimTypeLabel type={g.type} size={18} iconOnly />
              <GroupLink name={g.name} sub={`${g.members} member${g.members === 1 ? '' : 's'} · ${fmtXp(g.totalXp)} XP`} />
              <span style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{ago(g.createdAt?.replace(' ', 'T') + 'Z')}</span>
            </Row>
          ))}
        </Panel>

        <Panel icon="overview" title="The community">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Group mode</div>
          {modeSplit.map(m => (
            <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: 12 }}>
              <span style={{ width: 110 }}><GimTypeLabel type={m.key} size={16} /></span>
              <div className="gl-bar" style={{ flex: 1, marginTop: 0 }}><div style={{ width: `${(m.n / splitMax) * 100}%` }} /></div>
              <span className="gl-num" style={{ fontSize: 12, width: 34 }}>{m.n}</span>
            </div>
          ))}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', margin: '10px 0 4px' }}>Group size</div>
          {sizeSplit.map(s => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: 12 }}>
              <span style={{ width: 110 }}>{s.label}</span>
              <div className="gl-bar" style={{ flex: 1, marginTop: 0 }}><div style={{ width: `${(s.n / splitMax) * 100}%` }} /></div>
              <span className="gl-num" style={{ fontSize: 12, width: 34 }}>{s.n}</span>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}
