import React, { useState, useMemo } from 'react';
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
const STATUS_LABELS = { not_started: 'Not started', in_progress: 'In progress', blocked: 'Blocked', complete: '✓ Done' };
const STATUS_COLORS = {
  not_started: 'var(--text-dim)',
  in_progress: 'var(--gold)',
  blocked: 'var(--red-bright)',
  complete: 'var(--green-bright)',
};

function fmtXp(n) {
  if (!n) return '0';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(n);
}

// ── Member card (top row) ─────────────────────────────────────────────────────

function MemberCard({ player, active, color, onClick }) {
  const overall = player.skills?.find(s => s.skill_name === 'Overall');
  const synced = !!overall;
  return (
    <div onClick={onClick} style={{
      cursor: 'pointer', flex: '1 1 0', minWidth: 110, maxWidth: 200,
      padding: '12px 14px',
      background: active ? 'var(--bg-panel)' : 'var(--bg-panel-alt)',
      border: `2px solid ${active ? color : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      transition: 'border-color 0.15s',
      userSelect: 'none',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%', background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 8, fontWeight: 800, fontSize: 15, color: '#111',
      }}>
        {player.rsn[0].toUpperCase()}
      </div>
      <div style={{ fontWeight: 700, fontSize: 13, color: active ? color : 'var(--text-bright)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {player.rsn}
      </div>
      {synced ? (
        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          Cmb {player.combat_level ?? '?'} · Lvl {overall.level}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: 'var(--red-bright)' }}>Not synced</div>
      )}
    </div>
  );
}

// ── Skill table ───────────────────────────────────────────────────────────────

function SkillTable({ player }) {
  const skillsMap = Object.fromEntries((player.skills || []).map(s => [s.skill_name, s]));
  const rows = SKILL_ORDER.filter(name => skillsMap[name]);
  const overall = skillsMap['Overall'];

  return (
    <div>
      {overall && (
        <div style={{ display: 'flex', gap: 16, padding: '10px 12px', background: 'var(--bg-panel-alt)', borderRadius: 'var(--radius)', marginBottom: 10, fontSize: 13 }}>
          <span><strong style={{ color: 'var(--gold)' }}>{overall.level}</strong> <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>Total lvl</span></span>
          <span><strong style={{ color: 'var(--gold)' }}>{fmtXp(overall.xp)}</strong> <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>XP</span></span>
          {overall.rank && <span><strong style={{ color: 'var(--text-bright)' }}>#{overall.rank.toLocaleString()}</strong> <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>Rank</span></span>}
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ color: 'var(--text-dim)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            <th align="left" style={{ padding: '4px 6px 6px', fontWeight: 600 }}>Skill</th>
            <th align="right" style={{ padding: '4px 6px 6px', fontWeight: 600 }}>Level</th>
            <th align="right" style={{ padding: '4px 6px 6px', fontWeight: 600 }}>XP</th>
            <th align="right" style={{ padding: '4px 6px 6px', fontWeight: 600 }}>Rank</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((name, i) => {
            const s = skillsMap[name];
            const elite = s.level >= 120;
            const maxed = s.level >= 99;
            return (
              <tr key={name} style={{ borderTop: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                <td style={{ padding: '5px 6px' }}>
                  <span style={{ marginRight: 5 }}>{SKILL_ICONS[name] ?? '📊'}</span>
                  <span style={{ color: maxed ? 'var(--gold)' : 'var(--text)' }}>{name}</span>
                </td>
                <td align="right" style={{ padding: '5px 6px', fontWeight: 600, color: elite ? 'var(--gold)' : maxed ? 'var(--text-bright)' : 'var(--text)' }}>
                  {(elite || maxed) ? '★ ' : ''}{s.level}
                </td>
                <td align="right" style={{ padding: '5px 6px', color: 'var(--text-dim)' }}>
                  {s.xp?.toLocaleString() ?? '—'}
                </td>
                <td align="right" style={{ padding: '5px 6px', color: 'var(--text-dim)' }}>
                  {s.rank && s.rank > 0 ? `#${s.rank.toLocaleString()}` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── XP contribution bar ───────────────────────────────────────────────────────

function ContribBars({ players }) {
  const withXp = players.map(p => ({
    ...p,
    xp: p.skills?.find(s => s.skill_name === 'Overall')?.xp || 0,
  })).sort((a, b) => b.xp - a.xp);
  const max = Math.max(...withXp.map(p => p.xp), 1);

  return (
    <div>
      {withXp.map(p => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
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

// ── Inline goals panel ────────────────────────────────────────────────────────

function InlineGoals({ goals, players, filteredPlayerId, groupId, onRefresh, onToast, canWrite }) {
  const [showModal, setShowModal] = useState(false);
  const [prefill, setPrefill] = useState({});

  const filtered = filteredPlayerId
    ? goals.filter(g => g.owner_id === filteredPlayerId || g.type === 'group')
    : goals;

  const active = filtered.filter(g => g.status !== 'complete');
  const done   = filtered.filter(g => g.status === 'complete');

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

  const GoalItem = ({ goal }) => (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      padding: '8px 10px', marginBottom: 4,
      background: 'var(--bg-panel-alt)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-bright)', marginBottom: 2 }}>
          {goal.type === 'group' ? '👥 ' : '👤 '}{goal.title}
        </div>
        {goal.owner_rsn && goal.type !== 'group' && (
          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{goal.owner_rsn}</div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <button
          onClick={() => cycleStatus(goal)}
          style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 10, cursor: 'pointer',
            background: 'transparent', border: `1px solid ${STATUS_COLORS[goal.status]}`,
            color: STATUS_COLORS[goal.status], whiteSpace: 'nowrap',
          }}>
          {STATUS_LABELS[goal.status]}
        </button>
        {canWrite && (
          <button className="btn btn-ghost btn-sm btn-icon" style={{ fontSize: 11, color: 'var(--text-dim)', padding: '2px 5px' }}
            onClick={() => deleteGoal(goal.id)}>✕</button>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-bright)' }}>
          🎯 Goals {filteredPlayerId ? <span style={{ fontWeight: 400, color: 'var(--text-dim)' }}>· filtered</span> : ''}
        </span>
        {canWrite ? (
          <button className="btn btn-primary btn-sm" onClick={() => { setPrefill({}); setShowModal(true); }}>
            + Add Goal
          </button>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>🔒 Claim group to add</span>
        )}
      </div>

      {active.length === 0 && done.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, padding: '24px 0' }}>
          No goals yet. {canWrite ? 'Add your first one!' : ''}
        </div>
      )}

      {active.map(g => <GoalItem key={g.id} goal={g} />)}

      {done.length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ fontSize: 11, color: 'var(--text-dim)', cursor: 'pointer', userSelect: 'none', marginBottom: 4 }}>
            ✓ {done.length} completed
          </summary>
          {done.map(g => <GoalItem key={g.id} goal={g} />)}
        </details>
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

  const statBoxes = selectedPlayer
    ? [
        { label: 'Combat Lvl', value: selectedPlayer.combat_level ?? '—' },
        { label: 'Total Lvl', value: selectedPlayer.skills?.find(s => s.skill_name === 'Overall')?.level ?? '—' },
        { label: 'Total XP', value: fmtXp(selectedPlayer.skills?.find(s => s.skill_name === 'Overall')?.xp) },
        { label: 'Quest Pts', value: selectedPlayer.quest_points ?? 0 },
      ]
    : [
        { label: 'Members', value: players.length },
        { label: 'Group Total XP', value: fmtXp(groupTotals.totalXp) },
        { label: 'Total Levels', value: groupTotals.totalLevel.toLocaleString() },
        { label: 'Quest Points', value: groupTotals.totalQp },
      ];

  return (
    <div>
      {/* Member cards row */}
      {players.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
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
      <div className="grid-4 mb-20">
        {statBoxes.map(b => (
          <div key={b.label} className="stat-box">
            <div className="stat-label">{b.label}</div>
            <div className="stat-value">{b.value}</div>
          </div>
        ))}
      </div>

      {/* Main content — left + right */}
      <div className="grid-2">
        {/* Left: XP bars or skill table */}
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
                : <div className="empty-state"><p>No data — click ↻ in Players to sync.</p></div>
              : players.length > 0
                ? <ContribBars players={players} />
                : <div className="empty-state"><p>No players yet.</p></div>}
          </div>
        </div>

        {/* Right: inline goals */}
        <div className="panel">
          <div className="panel-body">
            <InlineGoals
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
        <div className="panel mt-16">
          <div className="panel-header"><span className="panel-title">Notes</span></div>
          <div className="panel-body text-dim" style={{ fontSize: 13 }}>{group.notes}</div>
        </div>
      )}
    </div>
  );
}
