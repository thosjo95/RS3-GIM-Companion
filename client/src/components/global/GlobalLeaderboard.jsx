import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import RsIcon from '../RsIcon';
import { BossIcon, ItemIcon } from '../GameIcon';
import SkillIcon from '../common/SkillIcon';
import GimTypeLabel from '../common/GimTypeLabel';
import { fmtXp } from '../../lib/rs3';

// The Global Leaderboard: every Group Ironman group tracked on the site, side by side. (The same file is used in 1.x and 2.0.)
// All numbers come from GET /api/global/stats (rebuilt by the server every 10 minutes). The Mode and Size filter at the
// top applies to every board; with "All" every group counts. Names only ever come from public data (hiscores,
// Adventurer's Log). In 2.0 the plugin strip shows totals over all groups only, never filtered (plugin data is private).

const PERIODS = [{ key: 'week', label: 'This week' }, { key: 'month', label: 'This month' }];
const MODES = [
  { key: 'all', label: 'All' }, { key: 'regular', label: 'Regular' },
  { key: 'competitive', label: 'Competitive' }, { key: 'regular_unranked', label: 'Unranked' },
];
const MEASURES = [
  { key: 'gain', label: 'XP gained' }, { key: 'perMember', label: 'Per member' }, { key: 'total', label: 'Total XP' },
];
const FILTER_KEY = 'globalLeaderboardFilter';

const fmtInt = n => Number(n ?? 0).toLocaleString('en-US');
const sizeLabel = s => (s === 1 ? 'Solo' : `${s} players`);
function ago(iso) {
  const t = Date.parse(iso); if (!t) return '';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 60) return `${Math.max(1, m)} min ago`;
  if (m < 48 * 60) return `${Math.round(m / 60)} h ago`;
  return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
const sumMaps = maps => {
  const out = {};
  for (const m of maps) for (const [k, v] of Object.entries(m || {})) out[k] = (out[k] ?? 0) + v;
  return Object.entries(out).sort((a, b) => b[1] - a[1]);
};
function loadFilter() {
  try { const f = JSON.parse(localStorage.getItem(FILTER_KEY) || 'null'); if (f) return { mode: f.mode ?? 'all', size: f.size ?? 'all' }; } catch { /* default */ }
  return { mode: 'all', size: 'all' };
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

function Panel({ icon, title, right, children }) {
  return (
    <div className="panel" style={{ minWidth: 0 }}>
      <div className="panel-header" style={{ flexWrap: 'wrap' }}>
        <span className="panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {icon && <RsIcon name={icon} size={18} />}{title}
        </span>
        {right}
      </div>
      <div className="panel-body">{children}</div>
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

const Empty = ({ children }) => <div className="text-dim" style={{ fontSize: 13 }}>{children}</div>;

function Spotlight({ label, icon, group, value, sub, onOpen }) {
  return (
    <div className="panel gl-spot" onClick={group ? () => onOpen(group.id) : undefined} role={group ? 'button' : undefined}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--gold)' }}>
        <RsIcon name={icon} size={18} />{label}
      </div>
      {group ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, minWidth: 0 }}>
            <GimTypeLabel type={group.type} size={20} iconOnly />
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-bright)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.name}</span>
          </div>
          <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700, color: 'var(--green-bright)' }}>{value}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{sub}</div>
        </>
      ) : <div className="text-dim" style={{ marginTop: 10 }}>Nobody yet</div>}
    </div>
  );
}

// 2.0: what the plugin adds, as totals over every group that uses it. Never per group, player, mode or size.
function PluginStrip({ plugin, period, periodWord }) {
  const p = plugin[period];
  const item = (icon, label, value) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <RsIcon name={icon} size={26} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-bright)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{label}</div>
      </div>
    </div>
  );
  return (
    <div className="panel" style={{ marginTop: 16, padding: '14px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <span className="panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><RsIcon name="journey" size={18} />Live from the plugin</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Totals over all {fmtInt(plugin.connectedPlayers)} players in {fmtInt(plugin.groupsUsing)} groups that use the plugin (not filtered). No group or player is named.
        </span>
      </div>
      <div className="gl-plugin">
        {item('player', 'online right now', fmtInt(plugin.onlineNow))}
        {item('bosses', `boss kills ${periodWord}`, fmtInt(p.bossKills))}
        {item('clues', `clue scrolls ${periodWord}`, fmtInt(p.clues))}
        {item('drops', `drops ${periodWord}`, fmtInt(p.drops))}
        {item('coins', 'worth of those drops', fmtXp(p.dropValue) + ' gp')}
        {item('achievements', `achievements ${periodWord}`, fmtInt(p.achievements))}
      </div>
    </div>
  );
}

export default function GlobalLeaderboard({ onOpenGroup }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('week');
  const [measure, setMeasure] = useState('gain');
  const [filter, setFilter] = useState(loadFilter);
  const { mode, size } = filter;

  useEffect(() => {
    let live = true;
    api.getGlobalStats().then(d => live && setData(d)).catch(e => live && setError(e.message));
    return () => { live = false; };
  }, []);
  useEffect(() => { try { localStorage.setItem(FILTER_KEY, JSON.stringify(filter)); } catch { /* not kept */ } }, [filter]);

  const gainKey = period === 'week' ? 'weekGain' : 'monthGain';
  const periodWord = period === 'week' ? 'this week' : 'this month';

  // everything below is worked out from the groups that pass the Mode and Size filter
  const v = useMemo(() => {
    if (!data) return null;
    const pass = x => (mode === 'all' || x.type === mode) && (size === 'all' || x.size === size);
    const groups = data.groups.filter(pass);
    const named = groups.filter(g => !g.anon);
    const sum = f => groups.reduce((s, g) => s + (f(g) ?? 0), 0);
    const best = f => named.filter(g => f(g) > 0).sort((a, b) => f(b) - f(a))[0] ?? null;
    const measureOf = g => measure === 'total' ? g.totalXp : measure === 'perMember' ? g[gainKey] / Math.max(1, g.members) : g[gainKey];
    const buckets = (data.buckets || []).filter(pass);
    return {
      totals: {
        groups: groups.length,
        active: groups.filter(g => g.weekGain > 0).length,
        players: sum(g => g.members),
        activePlayers: sum(g => g.activeWeek),
        totalXp: sum(g => g.totalXp),
        xp: sum(g => g[gainKey]),
        milestones: sum(g => g.milestones[period]),
        bossKills: sum(g => g.bossKills[period]),
        drops: sum(g => g.drops[period]),
        newMonth: groups.filter(g => (g.createdAt ?? '') >= data.periods.month).length,
      },
      groupOfWeek: best(g => g.weekGain),
      groupOfMonth: best(g => g.monthGain),
      bossHunters: best(g => g.bossKills[period]),
      ranked: named.map(g => ({ ...g, value: measureOf(g) })).filter(g => g.value > 0).sort((a, b) => b.value - a.value),
      players: data.players.filter(p => pass(p) && p[period] > 0).sort((a, b) => b[period] - a[period]).slice(0, 10),
      skills: sumMaps(buckets.map(b => b.skills[period])).slice(0, 8),
      bosses: sumMaps(buckets.map(b => b.bosses[period])).slice(0, 8),
      milestones: data.milestones.filter(m => pass(m) && (period === 'month' || m.at >= data.periods.week)).slice(0, 8),
      drops: data.drops.filter(d => pass(d) && (period === 'month' || d.at >= data.periods.week)).slice(0, 8),
      newest: [...named].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 6),
    };
  }, [data, mode, size, period, measure, gainKey]);

  if (error) return <div className="empty-state" style={{ marginTop: 80 }}><p>Could not load the global leaderboard: {error}</p></div>;
  if (!data || !v) return <div className="empty-state" style={{ marginTop: 80 }}><span className="spinner" style={{ width: 24, height: 24, marginBottom: 16 }} /><p>Loading the global leaderboard…</p></div>;

  const { totals } = v;
  const sizes = [...new Set(data.groups.map(g => g.size).filter(Boolean))].sort((a, b) => a - b);
  const filtered = mode !== 'all' || size !== 'all';
  const filterWords = [mode !== 'all' && MODES.find(m => m.key === mode)?.label, size !== 'all' && sizeLabel(size)].filter(Boolean).join(', ');
  const skillMax = v.skills[0]?.[1] || 1;
  // the community split always shows every group: it is the picture the filter chooses from
  const count = f => data.groups.filter(f).length;
  const modeSplit = MODES.slice(1).map(m => ({ ...m, n: count(g => g.type === m.key) }));
  const sizeSplit = sizes.map(s => ({ key: s, label: sizeLabel(s), n: count(g => g.size === s) }));
  const splitMax = Math.max(1, ...modeSplit.map(m => m.n), ...sizeSplit.map(s => s.n));
  const measureLabel = measure === 'total' ? 'total XP' : measure === 'perMember' ? `XP per member ${periodWord}` : `XP gained ${periodWord}`;
  const each = (g, key) => g && `${g.members} member${g.members === 1 ? '' : 's'} · ${fmtXp(g[key] / Math.max(1, g.members))} each`;

  return (
    <div className="gl-page">
      {/* title, the period switch, and the Mode / Size filter that applies to every board */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
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
      <div className="panel gl-filter">
        <div className="gl-filter-part">
          <span className="gl-filter-label">Mode</span>
          <Chips options={MODES} value={mode} onChange={m => setFilter(f => ({ ...f, mode: m }))} />
        </div>
        <div className="gl-filter-part">
          <span className="gl-filter-label">Size</span>
          <Chips options={[{ key: 'all', label: 'All' }, ...sizes.map(s => ({ key: s, label: sizeLabel(s) }))]} value={size}
            onChange={s => setFilter(f => ({ ...f, size: s }))} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 'auto' }}>
          {filtered
            ? <>Showing {fmtInt(totals.groups)} of {fmtInt(data.groups.length)} groups ({filterWords}) · <button className="btn btn-ghost btn-sm" style={{ padding: '0 4px' }} onClick={() => setFilter({ mode: 'all', size: 'all' })}>Show all</button></>
            : <>All {fmtInt(totals.groups)} groups</>}
        </span>
      </div>

      <div className="gl-stats" style={{ marginTop: 16 }}>
        <Stat icon="group" label="Groups tracked" value={fmtInt(totals.groups)} sub={`${totals.newMonth} new this month`} />
        <Stat icon="overview" label="Active this week" value={fmtInt(totals.active)} sub={`groups · ${fmtInt(totals.activePlayers)} players gaining XP`} />
        <Stat icon="player" label="Players" value={fmtInt(totals.players)} sub={`${fmtXp(totals.totalXp)} XP between them`} />
        <Stat icon="lamp" label={`XP gained ${periodWord}`} value={fmtXp(totals.xp)} sub="these groups together" />
        <Stat icon="maxCape" label={`99s and 120s ${periodWord}`} value={fmtInt(totals.milestones)} sub="from the Adventurer's Log" />
        <Stat icon="bosses" label={`Boss kills ${periodWord}`} value={fmtInt(totals.bossKills)} sub="from the Adventurer's Log" />
      </div>

      <div className="grid-3" style={{ marginTop: 16 }}>
        <Spotlight label="Group of the week" icon="leaderboards" group={v.groupOfWeek} onOpen={onOpenGroup}
          value={v.groupOfWeek && `+${fmtXp(v.groupOfWeek.weekGain)} XP`} sub={each(v.groupOfWeek, 'weekGain')} />
        <Spotlight label="Group of the month" icon="mastery" group={v.groupOfMonth} onOpen={onOpenGroup}
          value={v.groupOfMonth && `+${fmtXp(v.groupOfMonth.monthGain)} XP`} sub={each(v.groupOfMonth, 'monthGain')} />
        <Spotlight label={`Boss hunters of the ${period}`} icon="slayer" group={v.bossHunters} onOpen={onOpenGroup}
          value={v.bossHunters && `${fmtInt(v.bossHunters.bossKills[period])} kills`} sub="boss kills in the Adventurer's Log" />
      </div>

      {data.plugin?.connectedPlayers > 0 && <PluginStrip plugin={data.plugin} period={period} periodWord={periodWord} />}

      <div className="gl-main" style={{ marginTop: 16 }}>
        <Panel icon="leaderboards" title="Group rankings" right={<Chips options={MEASURES} value={measure} onChange={setMeasure} />}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Ranked by {measureLabel} · click a group to open it</div>
          {v.ranked.length === 0 && <Empty>No groups to rank here yet.</Empty>}
          {v.ranked.slice(0, 15).map((g, i) => (
            <Row key={g.id} onClick={() => onOpenGroup(g.id)}>
              <Rank i={i} />
              <GimTypeLabel type={g.type} size={18} iconOnly />
              <GroupLink name={g.name} sub={`${g.members} member${g.members === 1 ? '' : 's'}${g.activeWeek ? ` · ${g.activeWeek} active this week` : ''}`} />
              <span className="gl-num">{measure === 'total' ? fmtXp(g.value) : `+${fmtXp(g.value)}`}</span>
            </Row>
          ))}
        </Panel>

        <Panel icon="player" title={`Top players ${periodWord}`}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Most XP gained by one player</div>
          {v.players.length === 0 && <Empty>No XP gained yet.</Empty>}
          {v.players.map((p, i) => (
            <Row key={p.rsn + p.groupId} onClick={() => onOpenGroup(p.groupId)} title={`Open ${p.groupName}`}>
              <Rank i={i} />
              <GroupLink name={p.rsn} sub={p.groupName} />
              <span className="gl-num">+{fmtXp(p[period])}</span>
            </Row>
          ))}
        </Panel>
      </div>

      <div className="grid-3" style={{ marginTop: 16 }}>
        <Panel icon="skills" title={`Most trained skills ${periodWord}`}>
          {v.skills.length === 0 && <Empty>No XP gained yet.</Empty>}
          {v.skills.map(([skill, xp]) => (
            <div key={skill} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
              <SkillIcon name={skill} size={20} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span>{skill}</span><span className="gl-num" style={{ fontSize: 12 }}>{fmtXp(xp)}</span>
                </div>
                <div className="gl-bar"><div style={{ width: `${(xp / skillMax) * 100}%` }} /></div>
              </div>
            </div>
          ))}
        </Panel>

        <Panel icon="bosses" title={`Most killed bosses ${periodWord}`}>
          {v.bosses.length === 0 && <Empty>No boss kills logged yet.</Empty>}
          {v.bosses.map(([name, kills], i) => (
            <Row key={name}>
              <Rank i={i} />
              <BossIcon name={name} size={26} fallback={<RsIcon name="skull" size={22} />} />
              <GroupLink name={name} />
              <span className="gl-num">{fmtInt(kills)}</span>
            </Row>
          ))}
        </Panel>

        <Panel icon="maxCape" title="Latest 99s and 120s">
          {v.milestones.length === 0 && <Empty>None {periodWord} yet.</Empty>}
          {v.milestones.map((m, i) => (
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
            {fmtInt(totals.drops)} drops in the Adventurer's Log {periodWord}
          </div>
          {v.drops.length === 0 && <Empty>None {periodWord} yet.</Empty>}
          {v.drops.map((d, i) => (
            <Row key={i} onClick={() => onOpenGroup(d.groupId)} title={`Open ${d.groupName}`}>
              <ItemIcon name={d.item} size={26} />
              <GroupLink name={d.item.charAt(0).toUpperCase() + d.item.slice(1)} sub={`${d.rsn} · ${d.groupName}`} />
              <span style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{ago(d.at)}</span>
            </Row>
          ))}
        </Panel>

        <Panel icon="group" title="Newest groups">
          {v.newest.length === 0 && <Empty>No groups here yet.</Empty>}
          {v.newest.map(g => (
            <Row key={g.id} onClick={() => onOpenGroup(g.id)}>
              <GimTypeLabel type={g.type} size={18} iconOnly />
              <GroupLink name={g.name} sub={`${g.members} member${g.members === 1 ? '' : 's'} · ${fmtXp(g.totalXp)} XP`} />
              <span style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{ago(String(g.createdAt).replace(' ', 'T') + (String(g.createdAt).includes('Z') ? '' : 'Z'))}</span>
            </Row>
          ))}
        </Panel>

        <Panel icon="overview" title="The community">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Every tracked group, by mode (click to filter)</div>
          {modeSplit.map(m => (
            <div key={m.key} className="gl-split" role="button" onClick={() => setFilter(f => ({ ...f, mode: m.key }))}>
              <span style={{ width: 110 }}><GimTypeLabel type={m.key} size={16} /></span>
              <div className="gl-bar" style={{ flex: 1, marginTop: 0 }}><div style={{ width: `${(m.n / splitMax) * 100}%` }} /></div>
              <span className="gl-num" style={{ fontSize: 12, width: 34 }}>{m.n}</span>
            </div>
          ))}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', margin: '10px 0 4px' }}>By size</div>
          {sizeSplit.map(s => (
            <div key={s.key} className="gl-split" role="button" onClick={() => setFilter(f => ({ ...f, size: s.key }))}>
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
