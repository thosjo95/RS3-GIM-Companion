import React, { useEffect, useMemo, useState } from 'react';
import { loadGlobalStats } from './globalData';
import RsIcon from '../RsIcon';
import { BossIcon, ItemIcon } from '../GameIcon';
import SkillIcon from '../common/SkillIcon';
import GimTypeLabel from '../common/GimTypeLabel';
import { fmtXp } from '../../lib/rs3';
import { groupPath } from '../../lib/seo';

// The Global Leaderboard: every Group Ironman group tracked on the site, side by side. (The same file is used in 1.x and 2.0.)
// All numbers come from GET /api/global/stats (rebuilt by the server every 10 minutes). The Mode and Size filter at the
// top applies to every board; with "All" every group counts. Names only ever come from public data (hiscores,
// Adventurer's Log). In 2.0 the plugin strip shows totals over all groups only, never filtered (plugin data is private).

const PERIODS = [{ key: 'week', label: 'This week' }, { key: 'month', label: 'This month' }, { key: 'year', label: 'This year' }];
const MODES = [
  { key: 'all', label: 'All' }, { key: 'regular', label: 'Regular' },
  { key: 'competitive', label: 'Competitive' }, { key: 'regular_unranked', label: 'Unranked' },
];
const MEASURES = [
  { key: 'gain', label: 'XP gained' }, { key: 'perMember', label: 'Per member' }, { key: 'total', label: 'Total XP' },
  { key: 'clues', label: 'Clues' },
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

function Panel({ icon, title, right, children, side = false }) {
  return (
    <div className={`panel${side ? ' gl-side-panel' : ''}`} style={{ minWidth: 0 }}>
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

// page buttons under a long list: everyone who gained XP in the period, PAGE at a time
const PAGE = 10;
function Pager({ page, total, onPage, what }) {
  const pages = Math.ceil(total / PAGE);
  if (pages <= 1) return total > 0 ? <div className="gl-pager"><span>All {total} {what}</span></div> : null;
  const go = p => onPage(Math.max(0, Math.min(pages - 1, p)));
  return (
    <div className="gl-pager">
      <span>{page * PAGE + 1}–{Math.min(total, page * PAGE + PAGE)} of {total} {what}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => go(0)} title="First page">«</button>
        <button className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => go(page - 1)} title="Previous page">‹</button>
        <span style={{ minWidth: 54, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{page + 1} / {pages}</span>
        <button className="btn btn-ghost btn-sm" disabled={page >= pages - 1} onClick={() => go(page + 1)} title="Next page">›</button>
        <button className="btn btn-ghost btn-sm" disabled={page >= pages - 1} onClick={() => go(pages - 1)} title="Last page">»</button>
      </span>
    </div>
  );
}

// A row that opens a group is a real link (/group/<id>/<name>): search engines follow it and it opens in a new tab with
// Ctrl or the middle button; a plain click opens the group in place.
function Row({ onClick, href, children, title }) {
  if (href) {
    return (
      <a className="gl-row" href={href} title={title}
        onClick={e => { if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); onClick?.(); }}>
        {children}
      </a>
    );
  }
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

// A spotlight card: the winner big, then 2nd and 3rd place below. Every place has a bar against the winner's number,
// in gold, silver and bronze. Each place is a link to its group.
function Spotlight({ label, icon, podium, value, sub, onOpen }) {
  const [first, ...rest] = podium;
  const top = first ? value(first) : 0;
  const bar = (g, i) => (
    <div className="gl-bar" style={{ marginTop: 6 }}>
      <div style={{ width: `${top ? Math.max(3, (value(g) / top) * 100) : 0}%`, background: RANK_COLORS[i] }} />
    </div>
  );
  return (
    <div className="panel gl-spot">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--gold)' }}>
        <RsIcon name={icon} size={18} />{label}
      </div>
      {first ? (
        <>
          <a className="gl-spot-first" href={groupPath(first.id, first.name)}
            onClick={e => { if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); onOpen(first.id); }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span className="gl-place" style={{ '--place': RANK_COLORS[0] }}>1</span>
              <GimTypeLabel type={first.type} size={20} iconOnly />
              <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-bright)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{first.name}</span>
            </div>
            <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700, color: 'var(--green-bright)' }}>{value.label(first)}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{sub(first)}</div>
            {rest.length > 0 && bar(first, 0)}
          </a>
          {rest.length > 0 && (
            <div className="gl-spot-rest">
              {rest.map((g, k) => (
                <a key={g.id} className="gl-spot-row" href={groupPath(g.id, g.name)} title={`Open ${g.name}`}
                  onClick={e => { if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); onOpen(g.id); }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span className="gl-place gl-place-sm" style={{ '--place': RANK_COLORS[k + 1] }}>{k + 2}</span>
                    <GimTypeLabel type={g.type} size={16} iconOnly />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-bright)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green-bright)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{value.label(g)}</span>
                  </div>
                  {bar(g, k + 1)}
                </a>
              ))}
            </div>
          )}
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

// ── Clue scrolls: the five tiers side by side, then the top groups and players of the chosen tier ──
// From the public hiscores. 1.x only has the count completed (all time); 2.0 keeps dated snapshots, so there it follows
// the week / month / year switch. Follows the Mode and Size filter like every other board.
const CLUE_TIERS = [
  { name: 'Easy', file: 'Clue_scroll_%28easy%29.png', color: '#8fd18f' },
  { name: 'Medium', file: 'Clue_scroll_%28medium%29.png', color: '#7eb8f7' },
  { name: 'Hard', file: 'Clue_scroll_%28hard%29.png', color: '#d07ef7' },
  { name: 'Elite', file: 'Sealed_clue_scroll_%28elite%29.png', color: '#f7c97e' },
  { name: 'Master', file: 'Clue_scroll_%28master%29.png', color: '#f77e7e' },
];
const ClueIcon = ({ tier, size = 22 }) => (
  <img src={`https://runescape.wiki/images/${CLUE_TIERS[tier].file}`} alt="" width={size} height={size} loading="lazy" style={{ objectFit: 'contain', flexShrink: 0 }} />
);

function ClueBoard({ data, mode, size, period, periodWord, onOpenGroup }) {
  const [tier, setTier] = useState('all');
  const [groupPage, setGroupPage] = useState(0);
  const [playerPage, setPlayerPage] = useState(0);
  useEffect(() => { setGroupPage(0); setPlayerPage(0); }, [tier, mode, size, period]);

  const live = !!data.clueGains;                                    // 2.0: clues gained in the period; 1.x: all time
  const key = live ? { week: 'w', month: 'm', year: 'y' }[period] : 't';
  const view = useMemo(() => {
    const groupById = new Map(data.groups.filter(g => !g.anon).map(g => [g.id, g]));
    const pass = x => (mode === 'all' || x.type === mode) && (size === 'all' || x.size === size);
    const rows = (data.clues || []).map(c => {
      const g = c.g != null ? groupById.get(c.g) : null;
      return { rsn: c.r, group: g, type: g?.type ?? c.ty, size: g?.size ?? c.sz, v: c[key] || [0, 0, 0, 0, 0] };
    }).filter(pass);
    const pick = r => (tier === 'all' ? r.v.reduce((s, n) => s + n, 0) : r.v[tier]);
    const totals = CLUE_TIERS.map((_, i) => rows.reduce((s, r) => s + r.v[i], 0));
    const named = rows.filter(r => r.group && r.rsn);
    const topOfTier = CLUE_TIERS.map((_, i) => named.reduce((best, r) => (r.v[i] > (best?.v[i] ?? 0) ? r : best), null));
    const players = named.map(r => ({ ...r, value: pick(r) })).filter(r => r.value > 0).sort((a, b) => b.value - a.value);
    const byGroup = new Map();
    for (const r of named) {
      const n = pick(r); if (!n) continue;
      const e = byGroup.get(r.group.id) ?? { group: r.group, value: 0, best: null };
      e.value += n;
      if (!e.best || n > e.best.value) e.best = { rsn: r.rsn, value: n };
      byGroup.set(r.group.id, e);
    }
    return { totals, topOfTier, players, groups: [...byGroup.values()].sort((a, b) => b.value - a.value) };
  }, [data, mode, size, key, tier]);

  const all = view.totals.reduce((s, n) => s + n, 0);
  const what = tier === 'all' ? 'clue scrolls' : `${CLUE_TIERS[tier].name.toLowerCase()} clues`;
  const when = live ? periodWord : 'completed, all time';
  const tierChips = [{ key: 'all', label: 'All tiers' }, ...CLUE_TIERS.map((t, i) => ({ key: i, label: t.name }))];

  return (
    <div className="panel gl-clues" style={{ marginTop: 16, marginBottom: 24 }}>
      <div className="panel-header" style={{ flexWrap: 'wrap' }}>
        <span className="panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <RsIcon name="clues" size={18} />Clue scrolls <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text-dim)', fontWeight: 400 }}>· {when}</span>
        </span>
        <Chips options={tierChips} value={tier} onChange={setTier} />
      </div>
      <div className="panel-body">
        {/* the five tiers: how many, and who has done the most */}
        <div className="gl-clue-tiers">
          {CLUE_TIERS.map((t, i) => {
            const top = view.topOfTier[i];
            return (
              <button key={t.name} type="button" className={`gl-clue-tier${tier === i ? ' active' : ''}`} style={{ '--tier': t.color }}
                onClick={() => setTier(tier === i ? 'all' : i)} title={`Show the top ${t.name.toLowerCase()} clue solvers`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ClueIcon tier={i} size={32} />
                  <div style={{ minWidth: 0, textAlign: 'left' }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: t.color }}>{t.name}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-bright)', fontVariantNumeric: 'tabular-nums' }}>{fmtInt(view.totals[i])}</div>
                  </div>
                </div>
                <div className="gl-bar" style={{ marginTop: 8 }}><div style={{ width: `${all ? (view.totals[i] / all) * 100 : 0}%`, background: t.color }} /></div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {top ? <>Most: <span style={{ color: 'var(--text-bright)' }}>{top.rsn}</span> · {fmtInt(top.v[i])}</> : 'Nobody yet'}
                </div>
              </button>
            );
          })}
        </div>

        <div className="gl-clue-lists">
          <div style={{ minWidth: 0 }}>
            <div className="gl-clue-head">Top groups · {what} {when}</div>
            {view.groups.length === 0 && <Empty>None yet.</Empty>}
            {view.groups.slice(groupPage * PAGE, groupPage * PAGE + PAGE).map((e, i) => (
              <Row key={e.group.id} href={groupPath(e.group.id, e.group.name)} onClick={() => onOpenGroup(e.group.id)} title={`Open ${e.group.name}`}>
                <Rank i={groupPage * PAGE + i} />
                <GimTypeLabel type={e.group.type} size={18} iconOnly />
                <GroupLink name={e.group.name} sub={e.best && `Most: ${e.best.rsn} (${fmtInt(e.best.value)})`} />
                <span className="gl-num">{live ? '+' : ''}{fmtInt(e.value)}</span>
              </Row>
            ))}
            <Pager page={groupPage} total={view.groups.length} onPage={setGroupPage} what="groups" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="gl-clue-head">Top players · {what} {when}</div>
            {view.players.length === 0 && <Empty>None yet.</Empty>}
            {view.players.slice(playerPage * PAGE, playerPage * PAGE + PAGE).map((r, i) => (
              <Row key={r.rsn + r.group.id} href={groupPath(r.group.id, r.group.name)} onClick={() => onOpenGroup(r.group.id)} title={`Open ${r.group.name}`}>
                <Rank i={playerPage * PAGE + i} />
                <GroupLink name={r.rsn} sub={r.group.name} />
                {/* the tiers this player has, small, so the mix is visible at a glance */}
                {tier === 'all' && <span className="gl-clue-mix">
                  {CLUE_TIERS.map((t, k) => r.v[k] > 0 && (
                    <span key={t.name} title={`${t.name}: ${fmtInt(r.v[k])}`}><ClueIcon tier={k} size={14} />{fmtInt(r.v[k])}</span>
                  ))}
                </span>}
                <span className="gl-num">{live ? '+' : ''}{fmtInt(r.value)}</span>
              </Row>
            ))}
            <Pager page={playerPage} total={view.players.length} onPage={setPlayerPage} what="players" />
          </div>
        </div>
        {!live && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
            From the RuneScape hiscores: clue scrolls completed so far. Clues per week, month and year come with the new version.
          </div>
        )}
      </div>
    </div>
  );
}

export default function GlobalLeaderboard({ onOpenGroup }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('week');
  const [measure, setMeasure] = useState('gain');
  // the top groups and top players lists show PAGE at a time; any change of what is listed starts again at page 1
  const [groupPage, setGroupPage] = useState(0);
  const [playerPage, setPlayerPage] = useState(0);
  const [filter, setFilter] = useState(loadFilter);
  const { mode, size } = filter;

  useEffect(() => {
    let live = true;
    loadGlobalStats().then(d => live && setData(d)).catch(e => live && setError(e.message));
    return () => { live = false; };
  }, []);
  useEffect(() => { try { localStorage.setItem(FILTER_KEY, JSON.stringify(filter)); } catch { /* not kept */ } }, [filter]);
  useEffect(() => { setGroupPage(0); setPlayerPage(0); }, [filter, period, measure]);

  const gainKey = `${period}Gain`;                      // weekGain, monthGain, yearGain
  const periodWord = `this ${period}`;

  // everything below is worked out from the groups that pass the Mode and Size filter
  const v = useMemo(() => {
    if (!data) return null;
    const pass = x => (mode === 'all' || x.type === mode) && (size === 'all' || x.size === size);
    const groups = data.groups.filter(pass);
    const named = groups.filter(g => !g.anon);
    const sum = f => groups.reduce((s, g) => s + (f(g) ?? 0), 0);
    const podium = f => named.filter(g => f(g) > 0).sort((a, b) => f(b) - f(a)).slice(0, 3);   // 1st, 2nd and 3rd
    // clue scrolls: in 2.0 the clues gained in the period; in 1.x (no clue history) the all-time count
    const cluesOf = g => (data.clueGains ? g.clueGain?.[period] : g.clues) ?? 0;
    const measureOf = g => measure === 'total' ? g.totalXp : measure === 'clues' ? cluesOf(g)
      : measure === 'perMember' ? g[gainKey] / Math.max(1, g.members) : g[gainKey];
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
        clues: sum(cluesOf),
        drops: sum(g => g.drops[period]),
        newMonth: groups.filter(g => (g.createdAt ?? '') >= data.periods.month).length,
      },
      groupOfWeek: podium(g => g.weekGain),
      groupOfMonth: podium(g => g.monthGain),
      groupOfYear: podium(g => g.yearGain),
      bossHunters: podium(g => g.bossKills[period]),
      ranked: named.map(g => ({ ...g, value: measureOf(g) })).filter(g => g.value > 0).sort((a, b) => b.value - a.value),
      players: data.players.filter(p => pass(p) && p[period] > 0).sort((a, b) => b[period] - a[period]),
      skills: sumMaps(buckets.map(b => b.skills[period])).slice(0, 8),
      bosses: sumMaps(buckets.map(b => b.bosses[period])).slice(0, 8),
      milestones: data.milestones.filter(m => pass(m) && m.at >= data.periods[period]).slice(0, 8),
      drops: data.drops.filter(d => pass(d) && d.at >= data.periods[period]).slice(0, 8),
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
  const measureLabel = measure === 'total' ? 'total XP'
    : measure === 'clues' ? (data.clueGains ? `clue scrolls completed ${periodWord}` : 'clue scrolls completed, all time')
    : measure === 'perMember' ? `XP per member ${periodWord}` : `XP gained ${periodWord}`;
  const showValue = g => measure === 'total' ? fmtXp(g.value)
    : measure === 'clues' ? (data.clueGains ? `+${fmtInt(g.value)}` : fmtInt(g.value)) : `+${fmtXp(g.value)}`;
  // what a spotlight card ranks by: the number (for the bars) and how it is written
  const xpValue = key => Object.assign(g => g[key], { label: g => `+${fmtXp(g[key])} XP` });
  const killValue = Object.assign(g => g.bossKills[period], { label: g => `${fmtInt(g.bossKills[period])} kills` });
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
      </div>
      {/* the filter bar stays at the top of the screen while scrolling (see .gl-filter) */}
      <div className="panel gl-filter">
        <div className="gl-filter-part">
          <span className="gl-filter-label">Period</span>
          <Chips options={PERIODS} value={period} onChange={setPeriod} />
        </div>
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
        <Stat icon="clues" label={data.clueGains ? `Clue scrolls ${periodWord}` : 'Clue scrolls'} value={fmtInt(totals.clues)}
          sub={data.clueGains ? 'completed, from the hiscores' : 'completed, all time'} />
      </div>

      <div className="grid-3" style={{ marginTop: 16 }}>
        <Spotlight label="Group of the week" icon="leaderboards" podium={v.groupOfWeek} onOpen={onOpenGroup}
          value={xpValue('weekGain')} sub={g => each(g, 'weekGain')} />
        {period === 'year'
          ? <Spotlight label="Group of the year" icon="mastery" podium={v.groupOfYear} onOpen={onOpenGroup}
              value={xpValue('yearGain')} sub={g => each(g, 'yearGain')} />
          : <Spotlight label="Group of the month" icon="mastery" podium={v.groupOfMonth} onOpen={onOpenGroup}
              value={xpValue('monthGain')} sub={g => each(g, 'monthGain')} />}
        <Spotlight label={`Boss hunters of the ${period}`} icon="slayer" podium={v.bossHunters} onOpen={onOpenGroup}
          value={killValue} sub={() => "boss kills in the Adventurer's Log"} />
      </div>

      {data.plugin?.connectedPlayers > 0 && <PluginStrip plugin={data.plugin} period={period} periodWord={periodWord} />}

      <div className="gl-main" style={{ marginTop: 16 }}>
        <Panel icon="leaderboards" title="Top groups" right={<Chips options={MEASURES} value={measure} onChange={setMeasure} />}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Ranked by {measureLabel} · click a group to open it</div>
          {v.ranked.length === 0 && <Empty>No groups to rank here yet.</Empty>}
          {v.ranked.slice(groupPage * PAGE, groupPage * PAGE + PAGE).map((g, i) => (
            <Row key={g.id} href={groupPath(g.id, g.name)} onClick={() => onOpenGroup(g.id)}>
              <Rank i={groupPage * PAGE + i} />
              <GimTypeLabel type={g.type} size={18} iconOnly />
              <GroupLink name={g.name} sub={`${g.members} member${g.members === 1 ? '' : 's'}${g.activeWeek ? ` · ${g.activeWeek} active this week` : ''}`} />
              <span className="gl-num">{showValue(g)}</span>
            </Row>
          ))}
          <Pager page={groupPage} total={v.ranked.length} onPage={setGroupPage} what="groups" />
        </Panel>

        <Panel icon="player" title={`Top players ${periodWord}`}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Most XP gained by one player · click to open the group</div>
          {v.players.length === 0 && <Empty>No XP gained yet.</Empty>}
          {v.players.slice(playerPage * PAGE, playerPage * PAGE + PAGE).map((p, i) => (
            <Row key={p.rsn + p.groupId} href={groupPath(p.groupId, p.groupName)} onClick={() => onOpenGroup(p.groupId)} title={`Open ${p.groupName}`}>
              <Rank i={playerPage * PAGE + i} />
              <GroupLink name={p.rsn} sub={p.groupName} />
              <span className="gl-num">+{fmtXp(p[period])}</span>
            </Row>
          ))}
          <Pager page={playerPage} total={v.players.length} onPage={setPlayerPage} what="players" />
        </Panel>

        {/* general stats about every group, set apart from the boards */}
        <div className="gl-side">
          <Panel side icon="group" title="Newest groups">
            {v.newest.length === 0 && <Empty>No groups here yet.</Empty>}
            {v.newest.map(g => (
              <Row key={g.id} href={groupPath(g.id, g.name)} onClick={() => onOpenGroup(g.id)}>
                <GimTypeLabel type={g.type} size={18} iconOnly />
                <GroupLink name={g.name} sub={`${g.members} member${g.members === 1 ? '' : 's'} · ${fmtXp(g.totalXp)} XP`} />
                <span style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{ago(String(g.createdAt).replace(' ', 'T') + (String(g.createdAt).includes('Z') ? '' : 'Z'))}</span>
              </Row>
            ))}
          </Panel>

          <Panel side icon="overview" title="The community">
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

      <div className="gl-boards" style={{ marginTop: 16 }}>
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
            <Row key={i} href={groupPath(m.groupId, m.groupName)} onClick={() => onOpenGroup(m.groupId)} title={`Open ${m.groupName}`}>
              <SkillIcon name={m.skill} size={22} />
              <GroupLink name={<><b style={{ color: m.level >= 120 ? '#e8c35a' : 'var(--text-bright)' }}>{m.level}</b> {m.skill} · {m.rsn}</>} sub={m.groupName} />
              <span style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{ago(m.at)}</span>
            </Row>
          ))}
        </Panel>

        <Panel icon="drops" title="Latest drops">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
            {fmtInt(totals.drops)} drops in the Adventurer's Log {periodWord}
          </div>
          {v.drops.length === 0 && <Empty>None {periodWord} yet.</Empty>}
          {v.drops.map((d, i) => (
            <Row key={i} href={groupPath(d.groupId, d.groupName)} onClick={() => onOpenGroup(d.groupId)} title={`Open ${d.groupName}`}>
              <ItemIcon name={d.item} size={26} />
              <GroupLink name={d.item.charAt(0).toUpperCase() + d.item.slice(1)} sub={`${d.rsn} · ${d.groupName}`} />
              <span style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{ago(d.at)}</span>
            </Row>
          ))}
        </Panel>
      </div>

      <ClueBoard data={data} mode={mode} size={size} period={period} periodWord={periodWord} onOpenGroup={onOpenGroup} />
    </div>
  );
}
