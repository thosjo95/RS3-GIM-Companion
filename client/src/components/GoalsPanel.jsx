import React, { useState, useMemo } from 'react';
import { api } from '../api/client';
import GoalModal from './GoalModal';
import { QUESTS } from '../data/quests';

const STATUS_LABELS = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  complete: '✓ Complete',
};

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

const XP_TABLE = (() => {
  const t = [0, 0];
  for (let lvl = 2; lvl <= 120; lvl++) {
    const points = Math.floor(lvl - 1 + 300 * Math.pow(2, (lvl - 1) / 7));
    t[lvl] = Math.floor(t[lvl - 1] + points / 4);
  }
  return t;
})();

function xpForLevel(lvl) { return XP_TABLE[Math.min(Math.max(lvl, 1), 120)] ?? 0; }

function fmtNum(n) {
  if (!n && n !== 0) return '0';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(n);
}

function parseDetails(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

function getPlayerSkillLevel(players, ownerId, skillName) {
  const player = players.find(p => p.id === ownerId);
  if (!player?.skills) return null;
  return player.skills.find(s => s.skill_name === skillName)?.level ?? null;
}

// ── Inline visuals per goal type ──────────────────────────────────────────────

function LevelGoalDetail({ goal, players }) {
  const details = parseDetails(goal.details_json);
  if (!details || details.goalType !== 'level') return null;
  const targetLevel = goal.target_value;
  const currentLevel = getPlayerSkillLevel(players, goal.owner_id, goal.skill);
  if (!targetLevel || !goal.skill) return null;

  const pct = currentLevel && targetLevel > 1
    ? Math.min(100, Math.round(((currentLevel - 1) / (targetLevel - 1)) * 100))
    : 0;
  const xpNeeded = currentLevel && targetLevel > currentLevel
    ? xpForLevel(targetLevel) - xpForLevel(currentLevel)
    : 0;
  const done = currentLevel && currentLevel >= targetLevel;

  return (
    <div style={{ marginTop: 6 }}>
      <div className="flex align-center justify-between" style={{ fontSize: 11, marginBottom: 4 }}>
        <span style={{ color: 'var(--text-dim)' }}>
          {SKILL_ICONS[goal.skill]} {goal.skill}:{' '}
          <strong style={{ color: 'var(--text-bright)' }}>{currentLevel ?? '?'}</strong>
          {' '}→{' '}
          <strong style={{ color: 'var(--gold)' }}>{targetLevel}</strong>
        </span>
        {done
          ? <span style={{ color: 'var(--green-bright)', fontSize: 11 }}>✓ Done!</span>
          : xpNeeded > 0
            ? <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>{fmtNum(xpNeeded)} XP left</span>
            : null}
      </div>
      <div className="xp-bar" style={{ height: 5 }}>
        <div className="xp-bar-fill" style={{ width: `${pct}%`, background: done ? 'var(--green)' : undefined }} />
      </div>
    </div>
  );
}

function QuestGoalDetail({ goal, players }) {
  const details = parseDetails(goal.details_json);
  if (!details || details.goalType !== 'quest') return null;
  const [expanded, setExpanded] = useState(false);

  const questName = details.questName;
  const quest = QUESTS[questName];
  const skillReqs = details.requirements?.skills ?? {};
  const questReqs = details.requirements?.quests ?? [];

  const player = players.find(p => p.id === goal.owner_id);

  const reqStatus = useMemo(() => {
    if (!player) return {};
    return Object.fromEntries(
      Object.entries(skillReqs).map(([skill, needed]) => {
        const have = player.skills?.find(s => s.skill_name === skill)?.level ?? 1;
        return [skill, { needed, have, met: have >= needed }];
      })
    );
  }, [player, skillReqs]);

  const totalReqs = Object.keys(reqStatus).length;
  const metCount = Object.values(reqStatus).filter(r => r.met).length;
  const allMet = totalReqs === 0 || metCount === totalReqs;

  return (
    <div style={{ marginTop: 6 }}>
      <div className="flex align-center gap-8">
        {totalReqs > 0 && (
          <div style={{
            fontSize: 11, padding: '2px 7px', borderRadius: 'var(--radius)',
            background: allMet ? 'rgba(90,154,80,0.15)' : 'rgba(192,64,64,0.1)',
            border: `1px solid ${allMet ? 'var(--green)' : 'var(--red)'}`,
            color: allMet ? 'var(--green-bright)' : 'var(--red-bright)',
          }}>
            {allMet ? '✓ All skills met' : `${metCount}/${totalReqs} skills met`}
          </div>
        )}
        {quest?.difficulty && (
          <span className="tag" style={{ fontSize: 10 }}>{quest.difficulty}</span>
        )}
        {(totalReqs > 0 || questReqs.length > 0) && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 10, padding: '1px 6px', marginLeft: 'auto' }}
            onClick={e => { e.stopPropagation(); setExpanded(x => !x); }}>
            {expanded ? 'Hide' : 'Details'}
          </button>
        )}
      </div>

      {expanded && (
        <div style={{
          marginTop: 6, padding: '8px 10px',
          background: 'var(--bg-panel-alt)', borderRadius: 'var(--radius)',
          border: '1px solid var(--border)', fontSize: 11,
        }}>
          {/* Unmet skills */}
          {totalReqs > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: questReqs.length > 0 ? 8 : 0 }}>
              {Object.entries(reqStatus).map(([skill, r]) => (
                <span key={skill} style={{
                  padding: '2px 6px', borderRadius: 'var(--radius)',
                  background: r.met ? 'rgba(90,154,80,0.12)' : 'rgba(192,64,64,0.12)',
                  border: `1px solid ${r.met ? 'var(--green)' : 'var(--red)'}`,
                  color: r.met ? 'var(--green-bright)' : 'var(--red-bright)',
                }}>
                  {SKILL_ICONS[skill]} {skill}: {r.met ? `✓${r.have}` : `${r.have}/${r.needed}`}
                </span>
              ))}
            </div>
          )}
          {/* Quest prereqs */}
          {questReqs.length > 0 && (
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Quest prereqs: </span>
              {questReqs.map(q => (
                <span key={q} className="tag" style={{ fontSize: 10, marginRight: 3 }}>📜 {q}</span>
              ))}
            </div>
          )}
          {/* Unlocks */}
          {details.unlocks?.length > 0 && (
            <div style={{ marginTop: 5, color: 'var(--text-dim)' }}>
              Unlocks: {details.unlocks.join(' · ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ItemGoalDetail({ goal }) {
  const details = parseDetails(goal.details_json);
  if (!details || details.goalType !== 'item') return null;
  const [expanded, setExpanded] = useState(false);

  const { itemName, quantity, recipe, method, skill, skillLevel } = details;

  return (
    <div style={{ marginTop: 6 }}>
      <div className="flex align-center gap-8">
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          📦 {fmtNum(quantity)}x {itemName}
          {method && <span style={{ marginLeft: 6 }}>· {method}{skill ? ` (${skill} ${skillLevel})` : ''}</span>}
        </span>
        {recipe?.length > 0 && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 10, padding: '1px 6px', marginLeft: 'auto' }}
            onClick={e => { e.stopPropagation(); setExpanded(x => !x); }}>
            {expanded ? 'Hide' : `${recipe.length} materials`}
          </button>
        )}
      </div>

      {expanded && recipe?.length > 0 && (
        <div style={{
          marginTop: 6, padding: '8px 10px',
          background: 'var(--bg-panel-alt)', borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          display: 'flex', flexWrap: 'wrap', gap: 4,
        }}>
          {recipe.map((m, i) => (
            <span key={i} style={{
              padding: '2px 7px', borderRadius: 'var(--radius)', fontSize: 11,
              background: m.raw ? 'rgba(90,74,50,0.35)' : 'rgba(74,136,184,0.12)',
              border: `1px solid ${m.raw ? 'var(--border)' : 'var(--blue)'}`,
              color: 'var(--text)',
            }}>
              {m.raw ? '🪨' : '⚙️'} {m.item}: <strong style={{ color: 'var(--gold)' }}>{fmtNum(m.quantity)}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Goal Row ──────────────────────────────────────────────────────────────────

function GoalRow({ goal, players, onCycle, onDelete, canWrite }) {
  const details = parseDetails(goal.details_json);
  const goalType = details?.goalType;

  return (
    <div className="goal-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
      <div className="flex align-center gap-8">
        <div className={`priority-dot priority-${goal.priority}`} title={`Priority: ${goal.priority}`} />
        <span className={`goal-badge badge-${goal.type}`}>{goal.type}</span>
        {goalType && goalType !== 'custom' && (
          <span className="tag" style={{ fontSize: 10 }}>
            {goalType === 'level' ? '📈' : goalType === 'quest' ? '📜' : '📦'} {goalType}
          </span>
        )}
        <div className="goal-info" style={{ flex: 1, minWidth: 0 }}>
          <div className="goal-title">{goal.title}</div>
          {goal.description && <div className="goal-desc">{goal.description}</div>}
        </div>
        <div className="goal-actions" style={{ flexShrink: 0 }}>
          {goal.owner_rsn && (
            <span style={{ fontSize: 11, color: 'var(--text-dim)', marginRight: 6 }}>👤 {goal.owner_rsn}</span>
          )}
          <button
            className={`goal-status status-${goal.status}`}
            onClick={() => onCycle(goal)}
            title="Click to advance status">
            {STATUS_LABELS[goal.status]}
          </button>
          {canWrite && <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--red-bright)' }} onClick={() => onDelete(goal.id)}>✕</button>}
        </div>
      </div>

      {/* Rich detail per goal type */}
      {goalType === 'level' && <LevelGoalDetail goal={goal} players={players} />}
      {goalType === 'quest' && <QuestGoalDetail goal={goal} players={players} />}
      {goalType === 'item'  && <ItemGoalDetail goal={goal} />}

      {/* Contributors */}
      {goal.contributors?.length > 0 && (
        <div className="goal-owner" style={{ marginTop: 4 }}>
          Contributors: {goal.contributors.map(c => c.rsn).join(', ')}
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function GoalsPanel({ goals, players, groupId, onRefresh, onToast, canWrite }) {
  const [showModal, setShowModal] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSugg, setLoadingSugg] = useState(false);
  const [showSugg, setShowSugg] = useState(false);
  const [prefill, setPrefill] = useState({});
  const [filter, setFilter] = useState('all');

  async function loadSuggestions() {
    if (!groupId) return;
    setLoadingSugg(true);
    try {
      const data = await api.getSuggestions(groupId);
      setSuggestions(data);
      setShowSugg(true);
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setLoadingSugg(false);
    }
  }

  async function cycleStatus(goal) {
    const order = ['not_started', 'in_progress', 'blocked', 'complete'];
    const next = order[(order.indexOf(goal.status) + 1) % order.length];
    try {
      await api.updateGoal(goal.id, { status: next });
      onRefresh();
    } catch (err) {
      onToast(err.message, 'error');
    }
  }

  async function deleteGoal(id) {
    if (!confirm('Delete this goal?')) return;
    try {
      await api.deleteGoal(id);
      onRefresh();
    } catch (err) {
      onToast(err.message, 'error');
    }
  }

  function addFromSuggestion(s) {
    setPrefill(s);
    setShowModal(true);
    setShowSugg(false);
  }

  const filtered = goals.filter(g => filter === 'all' || g.type === filter || g.status === filter);
  const grouped = {
    group: filtered.filter(g => g.type === 'group'),
    personal: filtered.filter(g => g.type === 'personal'),
  };

  return (
    <div>
      <div className="flex align-center justify-between mb-16" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div className="section-title" style={{ marginBottom: 0 }}>🎯 Goals</div>
        <div className="flex gap-8 align-center" style={{ flexWrap: 'wrap' }}>
          <select className="form-select" style={{ width: 'auto' }} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All Goals</option>
            <option value="group">Group Only</option>
            <option value="personal">Personal Only</option>
            <option value="in_progress">In Progress</option>
            <option value="not_started">Not Started</option>
            <option value="complete">Completed</option>
          </select>
          <button className="btn btn-secondary btn-sm" onClick={loadSuggestions} disabled={loadingSugg}>
            {loadingSugg ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '💡'} Suggestions
          </button>
          {canWrite
            ? <button className="btn btn-primary btn-sm" onClick={() => { setPrefill({}); setShowModal(true); }}>+ Add Goal</button>
            : <span style={{fontSize:12,color:'var(--text-dim)'}}>🔒 Claim group to add</span>
          }
        </div>
      </div>

      {/* Suggestions panel */}
      {showSugg && suggestions.length > 0 && (
        <div className="panel mb-16">
          <div className="panel-header">
            <span className="panel-title">💡 Suggested Goals</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowSugg(false)}>✕</button>
          </div>
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {suggestions.map((s, i) => (
              <div key={i} className="goal-item" style={{ cursor: 'pointer' }} onClick={() => addFromSuggestion(s)}>
                <div className={`priority-dot priority-${s.priority || 'medium'}`} />
                <div className="goal-info">
                  <div className="goal-title">{s.title}</div>
                  <div className="goal-desc">{s.description}</div>
                </div>
                <button className="btn btn-secondary btn-sm">+ Add</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Group goals */}
      {grouped.group.length > 0 && (
        <div className="mb-16">
          <div className="text-dim text-xs font-bold mb-8" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Group Goals</div>
          {grouped.group.map(goal => (
            <GoalRow key={goal.id} goal={goal} players={players} onCycle={cycleStatus} onDelete={deleteGoal} canWrite={canWrite} />
          ))}
        </div>
      )}

      {/* Personal goals */}
      {grouped.personal.length > 0 && (
        <div>
          <div className="text-dim text-xs font-bold mb-8" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Personal Goals</div>
          {grouped.personal.map(goal => (
            <GoalRow key={goal.id} goal={goal} players={players} onCycle={cycleStatus} onDelete={deleteGoal} canWrite={canWrite} />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="icon">🎯</div>
          <p>No goals yet. Add your first group or personal goal.</p>
        </div>
      )}

      {showModal && (
        <GoalModal
          players={players}
          prefill={prefill}
          onClose={() => setShowModal(false)}
          onSaved={onRefresh}
          onToast={onToast}
        />
      )}
    </div>
  );
}
