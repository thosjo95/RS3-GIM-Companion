import React, { useState, useMemo, useCallback } from 'react';
import { api } from '../api/client';
import GoalModal from './GoalModal';

// ── Constants ─────────────────────────────────────────────────────────────────

const SKILL_ICONS = {
  Attack: '⚔️', Defence: '🛡️', Strength: '💪', Constitution: '❤️',
  Ranged: '🏹', Prayer: '🙏', Magic: '🔮', Cooking: '🍳',
  Woodcutting: '🪵', Fletching: '🎯', Fishing: '🐟', Firemaking: '🔥',
  Crafting: '💎', Smithing: '⚒️', Mining: '⛏️', Herblore: '🌿',
  Agility: '🏃', Thieving: '🕵️', Slayer: '💀', Farming: '🌾',
  Runecrafting: '🔵', Hunter: '🦌', Construction: '🏠', Summoning: '🐉',
  Dungeoneering: '🏰', Divination: '✨', Invention: '🔬', Archaeology: '🦴',
  Necromancy: '☠️',
};

const SKILL_ORDER = [
  'Attack', 'Strength', 'Defence', 'Constitution', 'Ranged', 'Prayer',
  'Magic', 'Summoning', 'Necromancy',
  'Cooking', 'Woodcutting', 'Fletching', 'Fishing', 'Firemaking', 'Crafting',
  'Smithing', 'Mining', 'Herblore', 'Agility', 'Thieving', 'Slayer',
  'Farming', 'Runecrafting', 'Hunter', 'Construction',
  'Dungeoneering', 'Divination', 'Invention', 'Archaeology',
];

const MEMBER_COLORS = ['#c8a84b', '#7eb8f7', '#7ef7a8', '#f77e7e', '#d07ef7', '#f7c97e'];

const STATUS_CYCLE = ['not_started', 'in_progress', 'blocked', 'complete'];
const STATUS_LABELS = {
  not_started: 'Not started',
  in_progress: 'In progress',
  blocked: 'Blocked',
  complete: '✓ Done',
};
const STATUS_COLORS = {
  not_started: 'var(--text-dim)',
  in_progress: 'var(--gold)',
  blocked: 'var(--red-bright)',
  complete: 'var(--green-bright)',
};

// RS3 XP table (levels 1-120)
const XP_TABLE = (() => {
  const t = [0, 0];
  for (let lvl = 2; lvl <= 120; lvl++) {
    const pts = Math.floor(lvl - 1 + 300 * Math.pow(2, (lvl - 1) / 7));
    t[lvl] = Math.floor(t[lvl - 1] + pts / 4);
  }
  return t;
})();
function xpForLevel(lvl) { return XP_TABLE[Math.min(Math.max(lvl, 1), 120)] ?? 0; }

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtXp(n) {
  if (!n) return '0';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(n);
}

function fmtNum(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(n);
}

function parseDetails(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

function parseRMDate(str) {
  if (!str) return 0;
  try { return new Date(str.replace(/(\d+)-(\w+)-(\d+)/, '$2 $1 $3')).getTime(); } catch { return 0; }
}

function wikiUrl(name) {
  return `https://runescape.wiki/w/${encodeURIComponent((name || '').replace(/ /g, '_'))}`;
}

function getPlayerSkill(players, ownerId, skillName) {
  return players.find(p => p.id === ownerId)?.skills?.find(s => s.skill_name === skillName);
}

// ── Member card ───────────────────────────────────────────────────────────────

function MemberCard({ player, active, color, onClick }) {
  const overall = player.skills?.find(s => s.skill_name === 'Overall');
  return (
    <div onClick={onClick} style={{
      cursor: 'pointer', width: 140,
      padding: '14px 16px',
      background: active ? 'var(--bg-panel)' : 'var(--bg-panel-alt)',
      border: `2px solid ${active ? color : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      transition: 'border-color 0.15s, background 0.15s',
      userSelect: 'none',
      flexShrink: 0,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%', background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 10, fontWeight: 800, fontSize: 16, color: '#111',
      }}>
        {player.rsn[0].toUpperCase()}
      </div>
      <div style={{ fontWeight: 700, fontSize: 13, color: active ? color : 'var(--text-bright)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {player.rsn}
      </div>
      {overall
        ? <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Cmb {player.combat_level ?? '?'} · Lvl {overall.level}</div>
        : <div style={{ fontSize: 11, color: 'var(--red-bright)' }}>Not synced</div>}
    </div>
  );
}

// ── Skill table ───────────────────────────────────────────────────────────────

function SkillTable({ player }) {
  const skillsMap = Object.fromEntries((player.skills || []).map(s => [s.skill_name, s]));
  const overall = skillsMap['Overall'];
  return (
    <div>
      {overall && (
        <div style={{ display: 'flex', gap: 20, padding: '10px 12px', background: 'var(--bg-panel-alt)', borderRadius: 'var(--radius)', marginBottom: 12, fontSize: 13 }}>
          <span><strong style={{ color: 'var(--gold)' }}>{overall.level}</strong> <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>Total lvl</span></span>
          <span><strong style={{ color: 'var(--gold)' }}>{fmtXp(overall.xp)}</strong> <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>XP</span></span>
          {overall.rank > 0 && <span><strong style={{ color: 'var(--text-bright)' }}>#{overall.rank.toLocaleString()}</strong> <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>Rank</span></span>}
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ color: 'var(--text-dim)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            <th align="left" style={{ padding: '4px 6px 8px', fontWeight: 600 }}>Skill</th>
            <th align="right" style={{ padding: '4px 6px 8px', fontWeight: 600 }}>Level</th>
            <th align="right" style={{ padding: '4px 6px 8px', fontWeight: 600 }}>XP</th>
            <th align="right" style={{ padding: '4px 6px 8px', fontWeight: 600 }}>Rank</th>
          </tr>
        </thead>
        <tbody>
          {SKILL_ORDER.filter(n => skillsMap[n]).map((name, i) => {
            const s = skillsMap[name];
            const elite = s.level >= 120, maxed = s.level >= 99;
            return (
              <tr key={name} style={{ borderTop: '1px solid var(--border)', background: i % 2 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                <td style={{ padding: '5px 6px' }}>
                  <span style={{ marginRight: 5 }}>{SKILL_ICONS[name] ?? '📊'}</span>
                  <span style={{ color: maxed ? 'var(--gold)' : 'var(--text)' }}>{name}</span>
                </td>
                <td align="right" style={{ padding: '5px 6px', fontWeight: 600, color: elite ? 'var(--gold)' : maxed ? 'var(--text-bright)' : 'var(--text)' }}>
                  {(elite || maxed) ? '★ ' : ''}{s.level}
                </td>
                <td align="right" style={{ padding: '5px 6px', color: 'var(--text-dim)' }}>{s.xp?.toLocaleString() ?? '—'}</td>
                <td align="right" style={{ padding: '5px 6px', color: 'var(--text-dim)' }}>{s.rank > 0 ? `#${s.rank.toLocaleString()}` : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── XP contribution bars ──────────────────────────────────────────────────────

function ContribBars({ players }) {
  const sorted = [...players]
    .map(p => ({ ...p, xp: p.skills?.find(s => s.skill_name === 'Overall')?.xp || 0 }))
    .sort((a, b) => b.xp - a.xp);
  const max = Math.max(...sorted.map(p => p.xp), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sorted.map(p => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 90, fontSize: 12, color: 'var(--text-bright)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{p.rsn}</div>
          <div style={{ flex: 1, height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${(p.xp / max) * 100}%`, height: '100%', background: 'var(--gold)', borderRadius: 3 }} />
          </div>
          <div style={{ width: 60, fontSize: 12, color: 'var(--text-dim)', textAlign: 'right', flexShrink: 0 }}>{fmtXp(p.xp)}</div>
        </div>
      ))}
    </div>
  );
}

// ── Rich goal item ────────────────────────────────────────────────────────────

function GoalItem({ goal, players, onCycle, onDelete, onUpdateCount, canWrite }) {
  const [expanded, setExpanded] = useState(false);
  const [editingCount, setEditingCount] = useState(false);
  const [countDraft, setCountDraft] = useState(goal.current_value ?? 0);

  const details = parseDetails(goal.details_json);
  const goalType = details?.goalType;

  // Level goal data
  const skillEntry = goalType === 'level' && goal.skill
    ? getPlayerSkill(players, goal.owner_id, goal.skill)
    : null;
  const currentLvl = skillEntry?.level ?? null;
  const targetLvl = goalType === 'level' ? goal.target_value : null;
  const levelDone = currentLvl && targetLvl && currentLvl >= targetLvl;
  const levelPct = currentLvl && targetLvl && targetLvl > 1
    ? Math.min(100, Math.round(((currentLvl - 1) / (targetLvl - 1)) * 100))
    : 0;
  const xpLeft = currentLvl && targetLvl && targetLvl > currentLvl
    ? (xpForLevel(targetLvl) - (skillEntry?.xp ?? xpForLevel(currentLvl))).toLocaleString()
    : null;

  // Item goal data
  const itemTarget = goalType === 'item' ? (details.quantity ?? goal.target_value ?? 1) : null;
  const itemCurrent = goal.current_value ?? 0;
  const itemPct = itemTarget ? Math.min(100, Math.round((itemCurrent / itemTarget) * 100)) : 0;

  // Skill requirement for item goal
  const reqSkillEntry = goalType === 'item' && details.skill
    ? getPlayerSkill(players, goal.owner_id, details.skill)
    : null;
  const reqMet = reqSkillEntry && details.skillLevel
    ? reqSkillEntry.level >= details.skillLevel
    : null;

  function saveCount(e) {
    e.preventDefault();
    const v = Math.max(0, Number(countDraft));
    onUpdateCount(goal.id, v);
    setEditingCount(false);
  }

  const barColor = goal.status === 'complete' ? 'var(--green)' : 'var(--gold)';

  return (
    <div style={{
      padding: '10px 12px', marginBottom: 6,
      background: 'var(--bg-panel-alt)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
    }}>
      {/* Row 1: title + actions */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-bright)', lineHeight: 1.3 }}>
            {goal.type === 'group' ? '👥 ' : '👤 '}{goal.title}
          </div>
          {goal.owner_rsn && goal.type !== 'group' && (
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>{goal.owner_rsn}</div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {/* Expand toggle */}
          {(goalType === 'level' || goalType === 'item' || goalType === 'quest') && (
            <button onClick={() => setExpanded(x => !x)} style={{
              fontSize: 10, padding: '2px 6px', borderRadius: 6, cursor: 'pointer',
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text-dim)',
            }}>
              {expanded ? '▲' : '▼'}
            </button>
          )}
          {/* Status cycle */}
          <button onClick={() => onCycle(goal)} style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 10, cursor: 'pointer',
            background: 'transparent', border: `1px solid ${STATUS_COLORS[goal.status]}`,
            color: STATUS_COLORS[goal.status], whiteSpace: 'nowrap',
          }}>
            {STATUS_LABELS[goal.status]}
          </button>
          {canWrite && (
            <button onClick={() => onDelete(goal.id)} style={{
              fontSize: 11, padding: '2px 5px', background: 'transparent',
              border: 'none', color: 'var(--text-dim)', cursor: 'pointer',
            }}>✕</button>
          )}
        </div>
      </div>

      {/* Level goal progress */}
      {goalType === 'level' && currentLvl !== null && targetLvl && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginBottom: 3 }}>
            <span>{SKILL_ICONS[goal.skill]} {goal.skill}: <strong style={{ color: 'var(--text-bright)' }}>{currentLvl}</strong> → <strong style={{ color: 'var(--gold)' }}>{targetLvl}</strong></span>
            {levelDone
              ? <span style={{ color: 'var(--green-bright)' }}>✓ Done!</span>
              : xpLeft ? <span>{xpLeft} XP left</span> : null}
          </div>
          <div style={{ height: 5, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${levelPct}%`, height: '100%', background: barColor, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* Item goal progress */}
      {goalType === 'item' && itemTarget && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--text-dim)', marginBottom: 3 }}>
            <span>📦 {details.itemName}</span>
            {canWrite && !editingCount ? (
              <button onClick={() => { setCountDraft(itemCurrent); setEditingCount(true); }} style={{
                fontSize: 10, padding: '1px 6px', background: 'transparent',
                border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-dim)', cursor: 'pointer',
              }}>
                {itemCurrent}/{itemTarget} ✎
              </button>
            ) : editingCount ? (
              <form onSubmit={saveCount} style={{ display: 'flex', gap: 4 }}>
                <input type="number" value={countDraft} onChange={e => setCountDraft(e.target.value)}
                  min={0} max={itemTarget} autoFocus
                  style={{ width: 52, padding: '1px 4px', fontSize: 11, background: 'var(--bg-input)', border: '1px solid var(--gold)', borderRadius: 4, color: 'var(--text-bright)' }} />
                <span style={{ color: 'var(--text-dim)' }}>/{itemTarget}</span>
                <button type="submit" style={{ fontSize: 10, padding: '1px 6px', background: 'var(--gold)', border: 'none', borderRadius: 4, color: '#111', cursor: 'pointer', fontWeight: 700 }}>✓</button>
                <button type="button" onClick={() => setEditingCount(false)} style={{ fontSize: 10, padding: '1px 5px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-dim)', cursor: 'pointer' }}>✕</button>
              </form>
            ) : (
              <span>{itemCurrent}/{itemTarget}</span>
            )}
          </div>
          <div style={{ height: 5, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${itemPct}%`, height: '100%', background: barColor, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--bg-root)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 12 }}>

          {/* Level goal expand: XP info + wiki */}
          {goalType === 'level' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {xpLeft && <div style={{ color: 'var(--text-dim)' }}>XP needed: <strong style={{ color: 'var(--text-bright)' }}>{xpLeft}</strong></div>}
              {goal.description && <div style={{ color: 'var(--text-dim)' }}>{goal.description}</div>}
              <a href={wikiUrl(goal.skill)} target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--gold)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                📖 {goal.skill} on RS Wiki
              </a>
            </div>
          )}

          {/* Item goal expand: requirements + recipe + wiki */}
          {goalType === 'item' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Skill requirement */}
              {details.skill && details.skillLevel && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--text-dim)' }}>Requires:</span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                    background: reqMet ? 'rgba(90,154,80,0.15)' : 'rgba(192,64,64,0.12)',
                    border: `1px solid ${reqMet ? 'var(--green)' : 'var(--red)'}`,
                    color: reqMet ? 'var(--green-bright)' : 'var(--red-bright)',
                  }}>
                    {SKILL_ICONS[details.skill]} {details.skill} {details.skillLevel}
                    {reqSkillEntry ? ` (you: ${reqSkillEntry.level})` : ''}
                  </span>
                </div>
              )}
              {/* Method */}
              {details.method && (
                <div style={{ color: 'var(--text-dim)' }}>Method: <strong style={{ color: 'var(--text-bright)' }}>{details.method}</strong></div>
              )}
              {/* Recipe/materials */}
              {details.recipe?.length > 0 && (
                <div>
                  <div style={{ color: 'var(--text-dim)', marginBottom: 4 }}>Materials per batch:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {details.recipe.map((m, i) => (
                      <span key={i} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 10, fontSize: 11,
                        background: m.raw ? 'rgba(90,74,50,0.35)' : 'rgba(74,136,184,0.12)',
                        border: `1px solid ${m.raw ? 'var(--border)' : 'var(--blue)'}`,
                        color: 'var(--text)',
                      }}>
                        {m.raw ? '🪨' : '⚙️'} {m.item}: <strong style={{ color: 'var(--gold)' }}>{fmtNum(m.quantity * (details.quantity || 1))}</strong>
                        <a href={wikiUrl(m.item)} target="_blank" rel="noopener noreferrer"
                          title={`${m.item} on RS Wiki`}
                          style={{ color: 'var(--text-dim)', textDecoration: 'none', fontSize: 10, lineHeight: 1 }}>📖</a>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {goal.description && <div style={{ color: 'var(--text-dim)' }}>{goal.description}</div>}
              <a href={wikiUrl(details.itemName)} target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--gold)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                📖 {details.itemName} on RS Wiki
              </a>
            </div>
          )}

          {/* Quest goal expand */}
          {goalType === 'quest' && (
            <div>
              {goal.description && <div style={{ color: 'var(--text-dim)', marginBottom: 6 }}>{goal.description}</div>}
              <a href={wikiUrl(details.questName || goal.title)} target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--gold)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                📖 {details.questName || goal.title} on RS Wiki
              </a>
            </div>
          )}

          {/* Custom goal */}
          {goalType === 'custom' && goal.description && (
            <div style={{ color: 'var(--text-dim)' }}>{goal.description}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Activity feed ─────────────────────────────────────────────────────────────

function ActivityFeed({ players, filteredPlayerId }) {
  const PLAYER_COLORS = ['#c8a84b', '#7eb8f7', '#7ef7a8', '#f77e7e', '#d07ef7', '#f7c97e'];
  const colorMap = Object.fromEntries(players.map((p, i) => [p.id, PLAYER_COLORS[i % PLAYER_COLORS.length]]));

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
    return <div style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No recent activity. Sync players to load their feed.</div>;
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

// ── Right panel: Goals + Activity ─────────────────────────────────────────────

function RightPanel({ goals, players, filteredPlayerId, groupId, onRefresh, onToast, canWrite }) {
  const [view, setView] = useState('goals'); // 'goals' | 'activity' | 'both'
  const [showModal, setShowModal] = useState(false);
  const [prefill, setPrefill] = useState({});

  const filtered = filteredPlayerId
    ? goals.filter(g => g.owner_id === filteredPlayerId || g.type === 'group')
    : goals;
  const active = filtered.filter(g => g.status !== 'complete');
  const done = filtered.filter(g => g.status === 'complete');

  async function cycleStatus(goal) {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(goal.status) + 1) % STATUS_CYCLE.length];
    try { await api.updateGoal(goal.id, { status: next }); onRefresh(); }
    catch (err) { onToast(err.message, 'error'); }
  }

  async function deleteGoal(id) {
    if (!confirm('Delete this goal?')) return;
    try { await api.deleteGoal(id); onRefresh(); }
    catch (err) { onToast(err.message, 'error'); }
  }

  async function updateCount(id, value) {
    try { await api.updateGoal(id, { current_value: value }); onRefresh(); }
    catch (err) { onToast(err.message, 'error'); }
  }

  const hasActivity = players.some(p => p.activities_json);

  return (
    <div>
      {/* Header: view toggle + Add Goal */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-panel-alt)', borderRadius: 'var(--radius)', padding: 3 }}>
          {[
            { id: 'goals', label: '🎯 Goals' },
            ...(hasActivity ? [{ id: 'activity', label: '📋 Activity' }, { id: 'both', label: 'Both' }] : []),
          ].map(v => (
            <button key={v.id} onClick={() => setView(v.id)} style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 'var(--radius)',
              background: view === v.id ? 'var(--gold)' : 'transparent',
              color: view === v.id ? '#111' : 'var(--text-dim)',
              border: 'none', cursor: 'pointer', fontWeight: view === v.id ? 700 : 400,
              transition: 'background 0.15s',
            }}>{v.label}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {(view === 'goals' || view === 'both') && (canWrite
          ? <button className="btn btn-primary btn-sm" onClick={() => { setPrefill({}); setShowModal(true); }}>+ Add Goal</button>
          : <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>🔒 Claim to add</span>
        )}
      </div>

      {/* Goals section */}
      {(view === 'goals' || view === 'both') && (
        <div style={{ marginBottom: view === 'both' ? 20 : 0 }}>
          {view === 'both' && <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Goals</div>}
          {active.map(g => (
            <GoalItem key={g.id} goal={g} players={players} onCycle={cycleStatus} onDelete={deleteGoal} onUpdateCount={updateCount} canWrite={canWrite} />
          ))}
          {done.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ fontSize: 11, color: 'var(--text-dim)', cursor: 'pointer', userSelect: 'none', marginBottom: 6 }}>
                ✓ {done.length} completed
              </summary>
              {done.map(g => (
                <GoalItem key={g.id} goal={g} players={players} onCycle={cycleStatus} onDelete={deleteGoal} onUpdateCount={updateCount} canWrite={canWrite} />
              ))}
            </details>
          )}
          {active.length === 0 && done.length === 0 && (
            <div style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
              No goals yet. {canWrite ? 'Add your first one!' : ''}
            </div>
          )}
        </div>
      )}

      {/* Activity section */}
      {(view === 'activity' || view === 'both') && (
        <div>
          {view === 'both' && <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Recent Activity</div>}
          <ActivityFeed players={players} filteredPlayerId={filteredPlayerId} />
        </div>
      )}

      {showModal && (
        <GoalModal
          players={players}
          prefill={filteredPlayerId ? { ...prefill, owner_id: filteredPlayerId } : prefill}
          onClose={() => setShowModal(false)}
          onSaved={onRefresh}
          onToast={onToast}
        />
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function OverviewTab({ group, goals, players, groupId, onRefresh, onToast, canWrite }) {
  const [selectedId, setSelectedId] = useState(null);
  const selectedPlayer = players.find(p => p.id === selectedId) ?? null;

  const groupTotals = useMemo(() => {
    let totalXp = 0, totalLevel = 0, totalQp = 0;
    for (const p of players) {
      const ov = p.skills?.find(s => s.skill_name === 'Overall');
      totalXp += ov?.xp || 0;
      totalLevel += ov?.level || 0;
      totalQp += p.quest_points || 0;
    }
    return { totalXp, totalLevel, totalQp };
  }, [players]);

  const selOverall = selectedPlayer?.skills?.find(s => s.skill_name === 'Overall');

  // Stat boxes: same 4 positions always, names adjust slightly
  const statBoxes = selectedPlayer
    ? [
        { label: 'Combat Level', value: selectedPlayer.combat_level ?? '—' },
        { label: 'Total XP', value: fmtXp(selOverall?.xp) },
        { label: 'Total Level', value: selOverall?.level ?? '—' },
        { label: 'Quest Points', value: selectedPlayer.quest_points ?? 0 },
      ]
    : [
        { label: 'Members', value: players.length },
        { label: 'Total XP', value: fmtXp(groupTotals.totalXp) },
        { label: 'Total Levels', value: groupTotals.totalLevel.toLocaleString() },
        { label: 'Quest Points', value: groupTotals.totalQp },
      ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Member cards — centered */}
      {players.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {players.map((p, i) => (
            <MemberCard
              key={p.id}
              player={p}
              active={selectedId === p.id}
              color={MEMBER_COLORS[i % MEMBER_COLORS.length]}
              onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}
            />
          ))}
        </div>
      )}

      {/* Stat boxes */}
      <div className="grid-4">
        {statBoxes.map(b => (
          <div key={b.label} className="stat-box">
            <div className="stat-label">{b.label}</div>
            <div className="stat-value">{b.value}</div>
          </div>
        ))}
      </div>

      {/* Two-column content */}
      <div className="grid-2">
        {/* Left */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">
              {selectedPlayer ? `${selectedPlayer.rsn} — Skills` : 'XP Contribution'}
            </span>
          </div>
          <div className="panel-body">
            {selectedPlayer
              ? selectedPlayer.skills?.length > 0
                ? <SkillTable player={selectedPlayer} />
                : <div className="empty-state"><p>No data — sync this player first.</p></div>
              : players.length > 0
                ? <ContribBars players={players} />
                : <div className="empty-state"><p>No players yet.</p></div>}
          </div>
        </div>

        {/* Right: Goals + Activity */}
        <div className="panel">
          <div className="panel-body">
            <RightPanel
              goals={goals}
              players={players}
              filteredPlayerId={selectedId}
              groupId={groupId}
              onRefresh={onRefresh}
              onToast={onToast}
              canWrite={canWrite}
            />
          </div>
        </div>
      </div>

      {/* Group notes */}
      {group?.notes && (
        <div className="panel">
          <div className="panel-header"><span className="panel-title">Notes</span></div>
          <div className="panel-body text-dim" style={{ fontSize: 13 }}>{group.notes}</div>
        </div>
      )}
    </div>
  );
}
