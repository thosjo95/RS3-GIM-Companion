import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../api/client';
import GoalModal from './GoalModal';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLS = [
  { id: 'not_started', label: 'Not Started', icon: '⏸',  color: 'var(--text-dim)',      border: 'var(--border)' },
  { id: 'in_progress', label: 'In Progress', icon: '▶',  color: 'var(--gold)',           border: 'rgba(200,168,75,0.4)' },
  { id: 'blocked',     label: 'Blocked',     icon: '🚫', color: 'var(--red-bright)',     border: 'rgba(192,64,64,0.4)' },
  { id: 'complete',    label: 'Done',        icon: '✓',  color: 'var(--green-bright)',   border: 'rgba(90,154,80,0.4)' },
];

const STATUS_CYCLE = ['not_started', 'in_progress', 'blocked', 'complete'];

const CAT_ICONS  = { skill: '📈', quest: '📜', item: '📦', boss: '⚔️', diary: '📋', other: '✏️' };
const PRI_COLORS = { high: 'var(--red-bright)', medium: 'var(--gold)', low: 'var(--green-bright)' };
const PRI_DOT    = { high: '🔴', medium: '🟠', low: '🟢' };

const SKILL_ICONS = {
  Attack:'https://runescape.wiki/images/Attack.png', Defence:'https://runescape.wiki/images/Defence.png',
  Strength:'https://runescape.wiki/images/Strength.png', Constitution:'https://runescape.wiki/images/Constitution.png',
  Ranged:'https://runescape.wiki/images/Ranged.png', Prayer:'https://runescape.wiki/images/Prayer.png',
  Magic:'https://runescape.wiki/images/Magic.png', Herblore:'https://runescape.wiki/images/Herblore.png',
  Agility:'https://runescape.wiki/images/Agility.png', Slayer:'https://runescape.wiki/images/Slayer.png',
  Farming:'https://runescape.wiki/images/Farming.png', Invention:'https://runescape.wiki/images/Invention.png',
  Dungeoneering:'https://runescape.wiki/images/Dungeoneering.png', Necromancy:'https://runescape.wiki/images/Necromancy.png',
};

// RS3 XP table
const XP_TABLE = (() => {
  const t = [0, 0];
  for (let lvl = 2; lvl <= 120; lvl++) {
    const pts = Math.floor(lvl - 1 + 300 * Math.pow(2, (lvl - 1) / 7));
    t[lvl] = Math.floor(t[lvl - 1] + pts / 4);
  }
  return t;
})();
function xpForLevel(lvl) { return XP_TABLE[Math.min(Math.max(lvl, 1), 120)] ?? 0; }

function fmtNum(n) {
  if (!n) return '0';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(n);
}

function parseDetails(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

// ── Goal Card (board) ─────────────────────────────────────────────────────────

function GoalCard({ goal, players, onCycle, onDelete, canWrite }) {
  const [expanded, setExpanded] = useState(false);
  const details  = parseDetails(goal.details_json);
  const owner    = players.find(p => p.id === goal.owner_id);
  const isGroup  = goal.type === 'group';
  const isHot    = goal.priority === 'high' && goal.status === 'blocked';

  // Skill progress bar
  let xpBar = null;
  if (goal.category === 'skill' && goal.skill && goal.target_value && owner) {
    const ownerSkill = owner.skills?.find(s => s.skill_name === goal.skill);
    const curLvl     = ownerSkill?.level ?? 1;
    const curXp      = ownerSkill?.xp    ?? 0;
    const tgtLvl     = Number(goal.target_value);
    const pct        = tgtLvl > 1 ? Math.min(100, Math.round(((curLvl - 1) / (tgtLvl - 1)) * 100)) : 100;
    const xpNeeded   = curLvl < tgtLvl ? xpForLevel(tgtLvl) - curXp : 0;
    xpBar = { curLvl, tgtLvl, pct, xpNeeded };
  }

  const questName = details?.questName;
  const wikiHref  = questName
    ? `https://runescape.wiki/w/${questName.replace(/ /g, '_')}`
    : null;

  return (
    <div style={{
      background: 'var(--bg-panel-alt)',
      border: `1px solid ${isHot ? 'rgba(192,64,64,0.5)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: '10px 12px',
      marginBottom: 6,
      boxShadow: isHot ? '0 0 8px rgba(192,64,64,0.2)' : undefined,
      cursor: 'default',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{CAT_ICONS[goal.category] ?? '✏️'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-bright)', lineHeight: 1.3, wordBreak: 'break-word' }}>
            {goal.title}
            {isHot && <span style={{ marginLeft: 5, fontSize: 11 }}>🔥</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {isGroup
              ? <span style={{ color: 'var(--gold)' }}>👥 Group</span>
              : owner && <span>{owner.rsn}</span>}
            <span>{PRI_DOT[goal.priority]}</span>
            {wikiHref && (
              <a href={wikiHref} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4,
                  background: 'rgba(74,136,184,0.15)', border: '1px solid rgba(74,136,184,0.3)',
                  color: '#6ab0e0', textDecoration: 'none' }}>
                📖
              </a>
            )}
          </div>
        </div>
        {canWrite && (
          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
            <button
              onClick={() => onCycle(goal)}
              title="Advance status"
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4,
                cursor: 'pointer', fontSize: 10, padding: '2px 5px', color: 'var(--text-dim)' }}>
              ▶
            </button>
            <button
              onClick={() => onDelete(goal.id)}
              title="Delete goal"
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4,
                cursor: 'pointer', fontSize: 10, padding: '2px 5px', color: 'var(--text-dim)' }}>
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Skill progress bar */}
      {xpBar && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)', marginBottom: 3 }}>
            {goal.skill && SKILL_ICONS[goal.skill] && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <img src={SKILL_ICONS[goal.skill]} alt={goal.skill} style={{ width: 12, height: 12 }} />
                {xpBar.curLvl} → {xpBar.tgtLvl}
              </span>
            )}
            <span>{xpBar.pct}%{xpBar.xpNeeded > 0 ? ` · ${fmtNum(xpBar.xpNeeded)} xp` : ''}</span>
          </div>
          <div style={{ height: 4, background: 'var(--bg-input)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${xpBar.pct}%`, height: '100%', background: 'var(--gold)', borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* Group contributors */}
      {isGroup && goal.contributors?.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-dim)' }}>
          {goal.contributors.map(c => c.rsn).join(' · ')}
        </div>
      )}
    </div>
  );
}

// ── Suggestions panel ─────────────────────────────────────────────────────────

function SuggestionsPanel({ groupId, goals, players, onAdded, onToast, canWrite, myRsn }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [adding, setAdding]           = useState({});

  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    api.getSuggestions(groupId)
      .then(setSuggestions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [groupId]);

  // Filter out suggestions that already exist as active goals
  const activeGoalKeys = useMemo(() => new Set(
    goals
      .filter(g => g.status !== 'complete')
      .map(g => `${g.skill ?? ''}_${g.target_value ?? ''}_${g.title}`)
  ), [goals]);

  const filtered = suggestions.filter(s => {
    const key = `${s.skill ?? ''}_${s.target_value ?? ''}_${s.title}`;
    return !activeGoalKeys.has(key);
  });

  async function addSuggestion(s) {
    if (!canWrite) return onToast('Unlock group to add goals', 'error');
    const key = s.title;
    setAdding(a => ({ ...a, [key]: true }));
    try {
      await api.createGoal({
        type: s.type || 'group',
        title: s.title,
        description: s.description,
        category: s.category || 'skill',
        skill: s.skill || null,
        target_value: s.target_value || null,
        priority: s.priority || 'medium',
      });
      onToast(`Added: ${s.title}`, 'success');
      onAdded();
    } catch (err) {
      if (!err.message?.includes('already exists')) onToast(err.message, 'error');
    } finally {
      setAdding(a => ({ ...a, [key]: false }));
    }
  }

  if (loading) return (
    <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
      <span className="spinner" style={{ width: 14, height: 14, marginRight: 6 }} />
      Loading suggestions…
    </div>
  );

  if (filtered.length === 0) return (
    <div style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>
      ✓ No new suggestions — great progress!
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {filtered.map((s, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px',
          background: 'var(--bg-panel-alt)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>
            {s.skill && SKILL_ICONS[s.skill]
              ? <img src={SKILL_ICONS[s.skill]} alt={s.skill} style={{ width: 20, height: 20 }} />
              : CAT_ICONS[s.category] ?? '🎯'}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-bright)' }}>{s.title}</div>
            {s.description && (
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, lineHeight: 1.4 }}>{s.description}</div>
            )}
          </div>
          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, flexShrink: 0,
            background: s.priority === 'high' ? 'rgba(192,64,64,0.15)' : 'rgba(200,168,75,0.1)',
            color: PRI_COLORS[s.priority] ?? 'var(--text-dim)',
            border: `1px solid ${s.priority === 'high' ? 'rgba(192,64,64,0.3)' : 'var(--border)'}` }}>
            {s.priority}
          </span>
          {canWrite && (
            <button
              onClick={() => addSuggestion(s)}
              disabled={adding[s.title]}
              className="btn btn-primary btn-sm"
              style={{ flexShrink: 0 }}>
              {adding[s.title] ? '…' : '+ Add'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar({ goals }) {
  const base       = goals.filter(g => g.status !== 'vaulted');
  const total      = base.length;
  const done       = base.filter(g => g.status === 'complete').length;
  const inProgress = base.filter(g => g.status === 'in_progress').length;
  const blocked    = base.filter(g => g.status === 'blocked').length;
  const pct        = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-dim)', alignItems: 'center' }}>
      <span><strong style={{ color: 'var(--text-bright)' }}>{total}</strong> goals</span>
      <span style={{ color: 'var(--green-bright)' }}>✓ {done} done ({pct}%)</span>
      <span style={{ color: 'var(--gold)' }}>▶ {inProgress} in progress</span>
      {blocked > 0 && <span style={{ color: 'var(--red-bright)' }}>🚫 {blocked} blocked</span>}
      {total > 0 && (
        <div style={{ flex: 1, minWidth: 120, maxWidth: 200, height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--green-bright)', borderRadius: 3, transition: 'width 0.4s' }} />
        </div>
      )}
    </div>
  );
}

// ── Board view ────────────────────────────────────────────────────────────────

function BoardView({ goals, players, onCycle, onDelete, canWrite }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, alignItems: 'start' }}>
      {STATUS_COLS.map(col => {
        const colGoals = goals.filter(g => g.status === col.id);
        return (
          <div key={col.id} style={{
            background: 'var(--bg-panel-alt)',
            border: `1px solid ${col.border}`,
            borderRadius: 'var(--radius-lg)',
            padding: '10px 10px 6px',
          }}>
            {/* Column header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: col.color }}>
                {col.icon} {col.label}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)',
                background: 'var(--bg-input)', borderRadius: 10, padding: '1px 7px' }}>
                {colGoals.length}
              </span>
            </div>

            {/* Goal cards */}
            {colGoals.length === 0
              ? <div style={{ color: 'var(--text-dim)', fontSize: 11, textAlign: 'center', padding: '12px 0', fontStyle: 'italic' }}>
                  Empty
                </div>
              : colGoals.map(g => (
                  <GoalCard key={g.id} goal={g} players={players}
                    onCycle={onCycle} onDelete={onDelete} canWrite={canWrite} />
                ))
            }
          </div>
        );
      })}
    </div>
  );
}

// ── List view ─────────────────────────────────────────────────────────────────

function ListView({ goals, players, onCycle, onDelete, canWrite }) {
  if (goals.length === 0) return (
    <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '32px 0', fontSize: 13 }}>
      No goals match the current filters.
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {goals.map(g => {
        const details   = parseDetails(g.details_json);
        const owner     = players.find(p => p.id === g.owner_id);
        const statusCol = STATUS_COLS.find(s => s.id === g.status);
        const questName = details?.questName;

        return (
          <div key={g.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px',
            background: 'var(--bg-panel-alt)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
          }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{CAT_ICONS[g.category] ?? '✏️'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-bright)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {g.title}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                {g.type === 'group' ? '👥 Group' : owner?.rsn ?? '—'}
              </div>
            </div>
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, flexShrink: 0,
              color: PRI_COLORS[g.priority], border: `1px solid ${PRI_COLORS[g.priority]}33`,
              background: `${PRI_COLORS[g.priority]}11` }}>
              {g.priority}
            </span>
            {questName && (
              <a href={`https://runescape.wiki/w/${questName.replace(/ /g, '_')}`}
                target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 10, padding: '2px 5px', borderRadius: 4,
                  background: 'rgba(74,136,184,0.15)', border: '1px solid rgba(74,136,184,0.3)',
                  color: '#6ab0e0', textDecoration: 'none', flexShrink: 0 }}>
                📖
              </a>
            )}
            <span style={{ fontSize: 11, fontWeight: 600, color: statusCol?.color, flexShrink: 0 }}>
              {statusCol?.icon} {statusCol?.label}
            </span>
            {canWrite && (
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button onClick={() => onCycle(g)} title="Advance status"
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4,
                    cursor: 'pointer', fontSize: 10, padding: '2px 6px', color: 'var(--text-dim)' }}>▶</button>
                <button onClick={() => onDelete(g.id)} title="Delete"
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4,
                    cursor: 'pointer', fontSize: 10, padding: '2px 6px', color: 'var(--text-dim)' }}>✕</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function GoalsTab({ group, goals, players, groupId, onRefresh, onToast, canWrite, myRsn }) {
  const [view,           setView]           = useState('board');
  const [filterPlayer,   setFilterPlayer]   = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterScope,    setFilterScope]    = useState('all');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showModal,      setShowModal]      = useState(false);
  const [prefill,        setPrefill]        = useState({});

  const normRsn = s => (s || '').replace(/[  �\s]+/g, ' ').trim().toLowerCase();
  const myPlayerId = useMemo(() =>
    myRsn ? players.find(p => normRsn(p.rsn) === normRsn(myRsn))?.id ?? null : null,
  [players, myRsn]);

  // Filter goals
  const filtered = useMemo(() => {
    let r = goals.filter(g => g.status !== 'vaulted');
    if (filterPlayer   !== 'all') r = r.filter(g => String(g.owner_id) === filterPlayer || g.type === 'group');
    if (filterCategory !== 'all') r = r.filter(g => g.category === filterCategory);
    if (filterPriority !== 'all') r = r.filter(g => g.priority === filterPriority);
    if (filterScope === 'personal') r = r.filter(g => g.type === 'personal');
    if (filterScope === 'group')    r = r.filter(g => g.type === 'group');
    return r;
  }, [goals, filterPlayer, filterCategory, filterPriority, filterScope]);

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

  function openAdd(overrides = {}) {
    setPrefill({ ...(myPlayerId ? { owner_id: myPlayerId } : {}), ...overrides });
    setShowModal(true);
  }

  // Unique categories present in goals
  const presentCategories = useMemo(() =>
    [...new Set(goals.map(g => g.category).filter(Boolean))],
  [goals]);

  const selStyle = {
    padding: '4px 8px', borderRadius: 'var(--radius)', fontSize: 12,
    background: 'var(--bg-input)', border: '1px solid var(--border)',
    color: 'var(--text)', cursor: 'pointer',
  };

  function pillStyle(active) {
    return {
      fontSize: 11, padding: '3px 10px', borderRadius: 'var(--radius)',
      background: active ? 'var(--gold)' : 'transparent',
      color: active ? '#111' : 'var(--text-dim)',
      border: 'none', cursor: 'pointer', fontWeight: active ? 700 : 400,
    };
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 16, color: 'var(--text-bright)' }}>🎯 Goals</h2>
        <div style={{ flex: 1 }} />
        {/* View toggle */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg-panel-alt)', borderRadius: 'var(--radius)', padding: 3 }}>
          {[['board','📋 Board'],['list','☰ List']].map(([id, label]) => (
            <button key={id} onClick={() => setView(id)} style={pillStyle(view === id)}>{label}</button>
          ))}
        </div>
        {canWrite
          ? <button className="btn btn-primary btn-sm" onClick={() => openAdd()}>+ Add Goal</button>
          : <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>🔒 Claim to add</span>}
      </div>

      {/* ── Stats bar ── */}
      <StatsBar goals={goals} />

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select style={selStyle} value={filterPlayer} onChange={e => setFilterPlayer(e.target.value)}>
          <option value="all">All players</option>
          {players.map(p => <option key={p.id} value={String(p.id)}>{p.rsn}</option>)}
        </select>
        <select style={selStyle} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="all">All types</option>
          {presentCategories.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
        </select>
        <select style={selStyle} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="all">All priorities</option>
          <option value="high">🔴 High</option>
          <option value="medium">🟠 Medium</option>
          <option value="low">🟢 Low</option>
        </select>
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg-panel-alt)', borderRadius: 'var(--radius)', padding: 3 }}>
          {[['all','All'],['personal','Personal'],['group','Group']].map(([id, label]) => (
            <button key={id} onClick={() => setFilterScope(id)} style={pillStyle(filterScope === id)}>{label}</button>
          ))}
        </div>
        {(filterPlayer !== 'all' || filterCategory !== 'all' || filterPriority !== 'all' || filterScope !== 'all') && (
          <button
            onClick={() => { setFilterPlayer('all'); setFilterCategory('all'); setFilterPriority('all'); setFilterScope('all'); }}
            style={{ fontSize: 11, color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>
            ✕ Clear filters
          </button>
        )}
      </div>

      {/* ── Board / List ── */}
      {view === 'board'
        ? <BoardView goals={filtered} players={players} onCycle={cycleStatus} onDelete={deleteGoal} canWrite={canWrite} />
        : <ListView  goals={filtered} players={players} onCycle={cycleStatus} onDelete={deleteGoal} canWrite={canWrite} />}

      {/* ── Suggested Goals ── */}
      <div style={{
        background: 'var(--bg-panel-alt)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        <button
          onClick={() => setShowSuggestions(s => !s)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
          }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-bright)' }}>
            💡 Suggested Goals <span style={{ fontWeight: 400, color: 'var(--text-dim)', fontSize: 11 }}>based on your group's current levels</span>
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{showSuggestions ? '▲' : '▼'}</span>
        </button>
        {showSuggestions && (
          <div style={{ padding: '0 16px 16px' }}>
            <SuggestionsPanel
              groupId={groupId}
              goals={goals}
              players={players}
              onAdded={onRefresh}
              onToast={onToast}
              canWrite={canWrite}
              myRsn={myRsn}
            />
          </div>
        )}
      </div>

      {/* ── Goal modal ── */}
      {showModal && (
        <GoalModal
          players={players}
          prefill={prefill}
          myRsn={myRsn}
          onClose={() => setShowModal(false)}
          onSaved={() => { onRefresh(); setShowModal(false); }}
          onToast={onToast}
        />
      )}
    </div>
  );
}
