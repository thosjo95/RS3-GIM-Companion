import React, { useState, useMemo, useEffect } from 'react';
import { api } from '../api/client';
import GoalModal from './GoalModal';
import {
  GOAL_SUGGESTIONS, CATEGORIES, STAGES,
  detectStage, checkPlayerReadiness,
} from '../data/goalSuggestions';

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

// Map goalSuggestions category ids → existing CAT_ICONS keys for active-goal cards
const SUGG_CAT_ICON = {
  quest_series:   '📜',
  skill_unlock:   '📈',
  important_item: '⚔️',
  diary:          '📋',
  boss_kill:      '💀',
};

const SKILL_ICONS = {
  // Combat
  Attack:        'https://runescape.wiki/images/Attack.png',
  Strength:      'https://runescape.wiki/images/Strength.png',
  Defence:       'https://runescape.wiki/images/Defence.png',
  Constitution:  'https://runescape.wiki/images/Constitution.png',
  Ranged:        'https://runescape.wiki/images/Ranged.png',
  Prayer:        'https://runescape.wiki/images/Prayer.png',
  Magic:         'https://runescape.wiki/images/Magic.png',
  Necromancy:    'https://runescape.wiki/images/Necromancy.png',
  // Gathering
  Mining:        'https://runescape.wiki/images/Mining.png',
  Fishing:       'https://runescape.wiki/images/Fishing.png',
  Woodcutting:   'https://runescape.wiki/images/Woodcutting.png',
  Farming:       'https://runescape.wiki/images/Farming.png',
  Hunter:        'https://runescape.wiki/images/Hunter.png',
  Divination:    'https://runescape.wiki/images/Divination.png',
  // Artisan
  Smithing:      'https://runescape.wiki/images/Smithing.png',
  Cooking:       'https://runescape.wiki/images/Cooking.png',
  Crafting:      'https://runescape.wiki/images/Crafting.png',
  Firemaking:    'https://runescape.wiki/images/Firemaking.png',
  Fletching:     'https://runescape.wiki/images/Fletching.png',
  Herblore:      'https://runescape.wiki/images/Herblore.png',
  Runecrafting:  'https://runescape.wiki/images/Runecrafting.png',
  Construction:  'https://runescape.wiki/images/Construction.png',
  // Support
  Agility:       'https://runescape.wiki/images/Agility.png',
  Thieving:      'https://runescape.wiki/images/Thieving.png',
  Slayer:        'https://runescape.wiki/images/Slayer.png',
  Summoning:     'https://runescape.wiki/images/Summoning.png',
  Dungeoneering: 'https://runescape.wiki/images/Dungeoneering.png',
  Invention:     'https://runescape.wiki/images/Invention.png',
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

function normRsn(s) {
  // Collapse ALL unicode whitespace variants (NBSP U+00A0, thin-space, etc.) to a plain space
  return (s || '').replace(/\s/g, ' ').trim().toLowerCase();
}

// ── Diary suggestion ID → Achievement diary key mapping ───────────────────────
// Goal suggestion IDs (diary_*) don't always match the achievement keys used in
// AchievementsTab (diary_lumbridge_draynor_*, diary_seers_village_*, etc.).
// This map translates the ones that differ so auto-tick and filtering work correctly.
const DIARY_SUGGESTION_KEY_MAP = {
  diary_lumbridge_easy:   'diary_lumbridge_draynor_easy',
  diary_lumbridge_medium: 'diary_lumbridge_draynor_medium',
  diary_lumbridge_hard:   'diary_lumbridge_draynor_hard',
  diary_lumbridge_elite:  'diary_lumbridge_draynor_elite',
  diary_seers_easy:       'diary_seers_village_easy',
  diary_seers_medium:     'diary_seers_village_medium',
  diary_seers_hard:       'diary_seers_village_hard',
  diary_seers_elite:      'diary_seers_village_elite',
  diary_western_easy:     'diary_western_provinces_easy',
  diary_western_medium:   'diary_western_provinces_medium',
  diary_western_hard:     'diary_western_provinces_hard',
  diary_western_elite:    'diary_western_provinces_elite',
};

/** Returns the correct achievement diary key for a given suggestion ID. */
function diaryAchievementKey(suggestionId) {
  return DIARY_SUGGESTION_KEY_MAP[suggestionId] ?? suggestionId;
}

// ── Pill / tab style helpers ──────────────────────────────────────────────────

function pillStyle(active, accent) {
  const color = accent || 'var(--gold)';
  return {
    fontSize: 12, padding: '4px 12px', borderRadius: 'var(--radius)',
    background: active ? color : 'transparent',
    color: active ? '#111' : 'var(--text-dim)',
    border: active ? `1px solid ${color}` : '1px solid transparent',
    cursor: 'pointer', fontWeight: active ? 700 : 400,
    transition: 'all 0.12s',
  };
}

function sectionHeader(title, sub) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-bright)' }}>{title}</span>
      {sub && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{sub}</span>}
    </div>
  );
}

// ── Player chips (multi-select) ───────────────────────────────────────────────

function PlayerChips({ players, selected, onToggle }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {players.map(p => {
        const active = selected.includes(p.id);
        return (
          <button
            key={p.id}
            className={`chip${active ? ' active' : ''}`}
            onClick={() => onToggle(p.id)}>
            {p.rsn}
            <span style={{ fontSize: 10, opacity: 0.7 }}>Cmb {p.combat_level ?? '?'}</span>
          </button>
        );
      })}
      {players.length > 1 && (
        <button
          className="chip"
          onClick={() => onToggle(selected.length === players.length ? '__none__' : '__all__')}>
          {selected.length === players.length ? 'Deselect all' : 'Select all'}
        </button>
      )}
    </div>
  );
}

// ── Active-goal card (board) ──────────────────────────────────────────────────

function GoalCard({ goal, players, onCycle, onDelete, canWrite }) {
  const details  = parseDetails(goal.details_json);
  const owner    = players.find(p => p.id === goal.owner_id);
  const isGroup  = goal.type === 'group';
  const isHot    = goal.priority === 'high' && goal.status === 'blocked';

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
  const wikiHref  = questName ? `https://runescape.wiki/w/${questName.replace(/ /g, '_')}` : null;

  return (
    <div style={{
      background: 'var(--bg-panel-alt)',
      border: `1px solid ${isHot ? 'rgba(192,64,64,0.5)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: '10px 12px', marginBottom: 6,
      boxShadow: isHot ? '0 0 8px rgba(192,64,64,0.2)' : undefined,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{CAT_ICONS[goal.category] ?? '✏️'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-bright)', lineHeight: 1.3, wordBreak: 'break-word' }}>
            {goal.title}{isHot && <span style={{ marginLeft: 5, fontSize: 11 }}>🔥</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {isGroup ? <span style={{ color: 'var(--gold)' }}>👥 Group</span> : owner && <span>{owner.rsn}</span>}
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
            <button onClick={() => onCycle(goal)} title="Advance status"
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4,
                cursor: 'pointer', fontSize: 10, padding: '2px 5px', color: 'var(--text-dim)' }}>▶</button>
            <button
              onClick={() => onDelete(goal.id)}
              title="Remove goal"
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(192,64,64,0.15)'; e.currentTarget.style.borderColor = 'rgba(192,64,64,0.5)'; e.currentTarget.style.color = 'var(--red-bright)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4,
                cursor: 'pointer', fontSize: 11, padding: '2px 6px', color: 'var(--text-dim)',
                transition: 'all 0.12s' }}>🗑</button>
          </div>
        )}
      </div>
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
      {isGroup && goal.contributors?.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-dim)' }}>
          {goal.contributors.map(c => c.rsn).join(' · ')}
        </div>
      )}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: col.color }}>{col.icon} {col.label}</span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', background: 'var(--bg-input)', borderRadius: 10, padding: '1px 7px' }}>
                {colGoals.length}
              </span>
            </div>
            {colGoals.length === 0
              ? <div style={{ color: 'var(--text-dim)', fontSize: 11, textAlign: 'center', padding: '12px 0', fontStyle: 'italic' }}>Empty</div>
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
            padding: '8px 12px', background: 'var(--bg-panel-alt)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius)',
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
                <button
                  onClick={() => onDelete(g.id)}
                  title="Remove goal"
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(192,64,64,0.15)'; e.currentTarget.style.borderColor = 'rgba(192,64,64,0.5)'; e.currentTarget.style.color = 'var(--red-bright)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4,
                    cursor: 'pointer', fontSize: 11, padding: '2px 6px', color: 'var(--text-dim)',
                    transition: 'all 0.12s' }}>🗑</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Suggestion icon ───────────────────────────────────────────────────────────

const QUEST_ICON_URL    = 'https://runescape.wiki/images/Lore_achievements_icon.png';
const FALLBACK_ICON_URL = 'https://runescape.wiki/images/RS_news_icon.png';

function SuggIcon({ category, iconUrl, skill, size = 34 }) {
  const [primaryFailed,  setPrimaryFailed]  = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);

  // Resolve the best icon URL for this suggestion
  const resolvedUrl = (() => {
    if (category === 'quest_series') return QUEST_ICON_URL;
    if (category === 'skill_unlock' && skill) return SKILL_ICONS[skill] ?? null;
    return iconUrl ?? null;
  })();

  const imgStyle = {
    imageRendering: 'crisp-edges',
    objectFit: 'contain',
    borderRadius: 4,
    display: 'block',
    flexShrink: 0,
  };

  // Primary icon (category-specific)
  if (resolvedUrl && !primaryFailed) {
    return (
      <img src={resolvedUrl} alt="" width={size} height={size}
        onError={() => setPrimaryFailed(true)}
        style={imgStyle}
      />
    );
  }

  // Generic RS news icon as universal fallback
  if (!fallbackFailed) {
    return (
      <img src={FALLBACK_ICON_URL} alt="" width={size} height={size}
        onError={() => setFallbackFailed(true)}
        style={imgStyle}
      />
    );
  }

  // Last resort: emoji (only if even the fallback image 404s)
  return <span style={{ fontSize: 20, lineHeight: 1 }}>{SUGG_CAT_ICON[category] ?? '🎯'}</span>;
}

// ── Suggestion card ───────────────────────────────────────────────────────────

function SuggestionCard({ suggestion: s, selectedPlayers, alreadyAdded, onAdd, onDismiss, canWrite, adding }) {
  const [expanded, setExpanded] = useState(false);

  // Per-player readiness
  const readiness = useMemo(() =>
    selectedPlayers.map(p => ({
      player: p,
      ...checkPlayerReadiness(p, s),
    })),
  [selectedPlayers, s]);

  const readyCount = readiness.filter(r => r.ready).length;
  const total      = readiness.length;
  const allReady   = total > 0 && readyCount === total;
  const noneReady  = total > 0 && readyCount === 0;

  const hasSkillReqs = Object.keys(s.requirements?.skills ?? {}).length > 0;
  const hasQuestReqs = (s.requirements?.quests ?? []).length > 0;

  return (
    <div style={{
      background: 'var(--bg-panel-alt)',
      border: `1px solid ${alreadyAdded ? 'rgba(90,154,80,0.35)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: '12px 14px',
      opacity: alreadyAdded ? 0.6 : 1,
      transition: 'border-color 0.15s',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          width: 34, height: 34, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-root)', borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}>
          <SuggIcon category={s.category} iconUrl={s.icon_url} skill={s.skill} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-bright)' }}>{s.title}</span>
            {s.targetLevel && (
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3,
                background: 'rgba(74,136,184,0.12)', border: '1px solid rgba(74,136,184,0.25)',
                color: '#6ab0e0' }}>
                Lv {s.targetLevel}
              </span>
            )}
            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, flexShrink: 0,
              background: s.priority === 'high' ? 'rgba(192,64,64,0.12)' : s.priority === 'medium' ? 'rgba(200,168,75,0.10)' : 'rgba(90,154,80,0.10)',
              color: PRI_COLORS[s.priority],
              border: `1px solid ${s.priority === 'high' ? 'rgba(192,64,64,0.3)' : s.priority === 'medium' ? 'rgba(200,168,75,0.25)' : 'rgba(90,154,80,0.25)'}` }}>
              {PRI_DOT[s.priority]} {s.priority}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
            {s.description}
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          {s.wikiUrl && (
            <a href={s.wikiUrl} target="_blank" rel="noopener noreferrer"
              title="RS Wiki"
              style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', borderRadius: 'var(--radius)',
                background: 'rgba(74,136,184,0.10)', border: '1px solid rgba(74,136,184,0.25)',
                color: '#6ab0e0', fontSize: 11, textDecoration: 'none', fontWeight: 600 }}>
              📖
            </a>
          )}
          {alreadyAdded ? (
            <span style={{ fontSize: 11, color: 'var(--green-bright)', padding: '4px 8px',
              border: '1px solid rgba(90,154,80,0.35)', borderRadius: 'var(--radius)' }}>
              ✓ Added
            </span>
          ) : canWrite ? (
            <>
              <button
                onClick={() => onAdd(s, 'not_started')}
                disabled={adding}
                className="btn btn-primary btn-sm"
                style={{ flexShrink: 0 }}>
                {adding ? '…' : '+ Add'}
              </button>
              <button
                onClick={() => onAdd(s, 'complete')}
                disabled={adding}
                title="Mark as already completed"
                style={{
                  flexShrink: 0, padding: '4px 8px', borderRadius: 'var(--radius)',
                  background: 'rgba(90,154,80,0.12)', border: '1px solid rgba(90,154,80,0.35)',
                  color: 'var(--green-bright)', fontSize: 11, cursor: 'pointer', fontWeight: 600,
                }}>
                ✓ Done
              </button>
            </>
          ) : null}
          {/* Dismiss / hide this suggestion */}
          {!alreadyAdded && onDismiss && (
            <button
              onClick={() => onDismiss(s.id)}
              title="Hide this suggestion"
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--red-bright)'; e.currentTarget.style.borderColor = 'rgba(192,64,64,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              style={{
                flexShrink: 0, padding: '4px 7px', borderRadius: 'var(--radius)',
                background: 'none', border: '1px solid var(--border)',
                color: 'var(--text-dim)', fontSize: 11, cursor: 'pointer',
                transition: 'all 0.12s',
              }}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Readiness row */}
      {readiness.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: 'var(--text-dim)', flexShrink: 0 }}>Readiness:</span>
          {readiness.map(({ player, ready, failed }) => (
            <span
              key={player.id}
              title={ready ? `${player.rsn} meets all requirements` : `${player.rsn} missing: ${failed.map(f => `${f.skill} (have ${f.have}, need ${f.need})`).join(', ')}`}
              style={{
                fontSize: 10, padding: '2px 7px', borderRadius: 10, cursor: 'default',
                background: ready ? 'rgba(90,154,80,0.15)' : 'rgba(192,64,64,0.10)',
                border: `1px solid ${ready ? 'rgba(90,154,80,0.4)' : 'rgba(192,64,64,0.3)'}`,
                color: ready ? 'var(--green-bright)' : 'var(--red-bright)',
                fontWeight: 600,
              }}>
              {ready ? '✓' : `✗ ${failed.length}`} {player.rsn}
            </span>
          ))}
          {total > 1 && (
            <span style={{ fontSize: 10, color: allReady ? 'var(--green-bright)' : noneReady ? 'var(--red-bright)' : 'var(--gold)', marginLeft: 2 }}>
              {readyCount}/{total} ready
            </span>
          )}
        </div>
      )}

      {/* Requirements / unlocks expandable */}
      {(hasSkillReqs || hasQuestReqs || s.unlocks?.length > 0) && (
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: 10, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
            {expanded ? '▾' : '▸'}
            <span>{expanded ? 'Hide' : 'Show'} details</span>
          </button>
          {expanded && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {hasSkillReqs && (
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 4 }}>SKILL REQUIREMENTS</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {Object.entries(s.requirements.skills).map(([skill, level]) => (
                      <span key={skill} style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: 11, padding: '2px 7px', borderRadius: 'var(--radius)',
                        background: 'var(--bg-input)', border: '1px solid var(--border)',
                        color: 'var(--text)',
                      }}>
                        {SKILL_ICONS[skill] && <img src={SKILL_ICONS[skill]} alt={skill} style={{ width: 12, height: 12 }} />}
                        {skill} {level}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {hasQuestReqs && (
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 4 }}>QUEST REQUIREMENTS</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.6 }}>
                    {s.requirements.quests.join(' · ')}
                  </div>
                </div>
              )}
              {s.requirements?.activity && (
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 4 }}>ACTIVITY</div>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius)',
                    background: 'rgba(200,168,75,0.10)', border: '1px solid rgba(200,168,75,0.3)',
                    color: 'var(--gold)',
                  }}>🎮 {s.requirements.activity}</span>
                </div>
              )}
              {s.unlocks?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, marginBottom: 4 }}>UNLOCKS</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {s.unlocks.map((u, i) => (
                      <span key={i} style={{
                        fontSize: 10, padding: '2px 7px', borderRadius: 'var(--radius)',
                        background: 'rgba(90,154,80,0.10)', border: '1px solid rgba(90,154,80,0.25)',
                        color: 'var(--green-bright)',
                      }}>
                        {u}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Goal Browser ──────────────────────────────────────────────────────────────

function GoalBrowser({ players, goals, onAdd, canWrite, addingId, onCreateCustom, achievements, groupId }) {
  const DISMISSED_KEY = `rs3gim_dismissed_suggestions_${groupId || 'default'}`;
  const autoStage = useMemo(() => detectStage(players), [players]);
  const [stage,    setStage]    = useState(autoStage);
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState(() => players.map(p => p.id));
  const [search,   setSearch]   = useState('');
  const [showDismissed,        setShowDismissed]        = useState(false);
  const [showCompletedDiaries, setShowCompletedDiaries] = useState(false);

  // Map: playerId → Set of achieved diary keys
  const achievedByPlayer = useMemo(() => {
    const map = {};
    for (const a of (achievements || [])) {
      if (a.achieved && a.key?.startsWith('diary_')) {
        if (!map[a.player_id]) map[a.player_id] = new Set();
        map[a.player_id].add(a.key);
      }
    }
    return map;
  }, [achievements]);

  // DB suggestions (boss_kill + important_item) — loaded once on mount
  const [dbSuggestions, setDbSuggestions] = useState([]);
  useEffect(() => {
    api.getRs3Suggestions().then(setDbSuggestions).catch(() => {});
  }, []);

  // Merged suggestion list: DB overrides boss_kill + important_item; static handles the rest
  const allSuggestions = useMemo(() => {
    const DB_CATS = new Set(['boss_kill', 'important_item']);
    const staticFiltered = GOAL_SUGGESTIONS.filter(s => !DB_CATS.has(s.category));
    return [...staticFiltered, ...dbSuggestions];
  }, [dbSuggestions]);

  // Dismissed suggestions — persisted to localStorage
  const [dismissed, setDismissed] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]')); }
    catch { return new Set(); }
  });

  function dismissSuggestion(id) {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
      try { localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  function restoreAll() {
    setDismissed(new Set());
    try { localStorage.removeItem(DISMISSED_KEY); } catch {}
  }

  const allPlayerIds = players.map(p => p.id);
  function togglePlayer(id) {
    if (id === '__all__')  { setSelected(allPlayerIds); return; }
    if (id === '__none__') { setSelected([]); return; }
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  const activeKeys = useMemo(() => new Set(goals.map(g => g.title)), [goals]);
  const selectedPlayers = players.filter(p => selected.includes(p.id));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allSuggestions.filter(s => {
      if (s.stage !== stage) return false;
      if (category !== 'all' && s.category !== category) return false;
      if (!showDismissed && dismissed.has(s.id)) return false;
      // Hide diary suggestions that ALL selected players have already completed
      if (s.category === 'diary' && selected.length > 0 && !showCompletedDiaries) {
        const achKey = diaryAchievementKey(s.id);
        const allAchieved = selected.every(pid => achievedByPlayer[pid]?.has(achKey));
        if (allAchieved) return false;
      }
      if (q) {
        return (
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.unlocks?.some(u => u.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allSuggestions, stage, category, dismissed, showDismissed, showCompletedDiaries, selected, achievedByPlayer, search]);

  const dismissedInView = useMemo(() =>
    allSuggestions.filter(s => s.stage === stage && (category === 'all' || s.category === category) && dismissed.has(s.id)).length,
  [allSuggestions, stage, category, dismissed]);

  // Count diary suggestions hidden because all selected players have completed them
  const completedDiariesHidden = useMemo(() => {
    if (selected.length === 0) return 0;
    return allSuggestions.filter(s =>
      s.stage === stage &&
      (category === 'all' || s.category === category) &&
      s.category === 'diary' &&
      !dismissed.has(s.id) &&
      selected.every(pid => achievedByPlayer[pid]?.has(diaryAchievementKey(s.id)))
    ).length;
  }, [allSuggestions, stage, category, dismissed, selected, achievedByPlayer]);

  const stageKeys = Object.keys(STAGES);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Top bar: search + create custom */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-dim)', pointerEvents: 'none' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search suggestions by title, description or reward…"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '7px 10px 7px 32px', fontSize: 12,
              background: 'var(--bg-input)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', color: 'var(--text)',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13 }}>
              ✕
            </button>
          )}
        </div>
        {canWrite && onCreateCustom && (
          <button
            onClick={onCreateCustom}
            className="btn btn-primary btn-sm"
            style={{ flexShrink: 0 }}>
            + Custom Goal
          </button>
        )}
      </div>

      {/* Player chips */}
      <div>
        {sectionHeader('Players', 'select one or more to check readiness')}
        <PlayerChips players={players} selected={selected} onToggle={togglePlayer} />
      </div>

      {/* Stage tabs */}
      <div>
        {sectionHeader('Stage', STAGES[stage]?.desc)}
        <div style={{ display: 'flex', gap: 4 }}>
          {stageKeys.map(key => (
            <button key={key} onClick={() => setStage(key)} style={{
              ...pillStyle(stage === key),
              ...(key === autoStage && stage !== key ? { borderColor: 'rgba(200,168,75,0.3)' } : {}),
            }}>
              {STAGES[key].label}
              {key === autoStage && <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.7 }}>●</span>}
            </button>
          ))}
          {stage !== autoStage && (
            <button onClick={() => setStage(autoStage)}
              style={{ fontSize: 11, padding: '4px 8px', background: 'none', border: 'none',
                color: 'var(--text-dim)', cursor: 'pointer' }}>
              ↩ Auto
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <button onClick={() => setCategory('all')} style={pillStyle(category === 'all')}>All</button>
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setCategory(c.id)} style={pillStyle(category === c.id)}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* Hidden count + restore */}
      {(dismissedInView > 0 || completedDiariesHidden > 0) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--text-dim)', flexWrap: 'wrap' }}>
          {dismissedInView > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setShowDismissed(s => !s)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11,
                  color: 'var(--text-dim)', textDecoration: 'underline', padding: 0 }}>
                {showDismissed ? '▾ Hide dismissed' : `▸ Show ${dismissedInView} hidden suggestion${dismissedInView > 1 ? 's' : ''}`}
              </button>
              {showDismissed && (
                <button onClick={restoreAll}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4,
                    cursor: 'pointer', fontSize: 11, color: 'var(--text-dim)', padding: '2px 8px' }}>
                  ↺ Restore all
                </button>
              )}
            </span>
          )}
          {completedDiariesHidden > 0 && (
            <button onClick={() => setShowCompletedDiaries(s => !s)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11,
                color: 'var(--green-bright)', textDecoration: 'underline', padding: 0 }}>
              {showCompletedDiaries
                ? '▾ Hide completed diaries'
                : `✓ ${completedDiariesHidden} diary${completedDiariesHidden > 1 ? ' entries' : ''} already completed`}
            </button>
          )}
        </div>
      )}

      {/* Suggestion cards */}
      {filtered.length === 0 ? (
        <div style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
          {search ? `No suggestions match "${search}".` : 'No suggestions for this stage and category.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(s => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              selectedPlayers={selectedPlayers}
              alreadyAdded={activeKeys.has(s.title)}
              onAdd={(suggestion, status) => onAdd(suggestion, status, selected)}
              onDismiss={dismissed.has(s.id) ? undefined : dismissSuggestion}
              canWrite={canWrite}
              adding={addingId === s.id}
            />
          ))}
        </div>
      )}
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
  const [showModal,      setShowModal]      = useState(false);
  const [prefill,        setPrefill]        = useState({});
  const [addingId,       setAddingId]       = useState(null);
  const [activeSection,  setActiveSection]  = useState('browser'); // 'browser' | 'active'
  const [achievements,   setAchievements]   = useState([]);

  const myPlayerId = useMemo(() =>
    myRsn ? players.find(p => normRsn(p.rsn) === normRsn(myRsn))?.id ?? null : null,
  [players, myRsn]);

  // Load achievements for diary suggestion filtering
  useEffect(() => {
    if (!groupId) return;
    api.getAchievements(groupId).then(setAchievements).catch(() => {});
  }, [groupId]);

  // Filter active goals
  const filteredGoals = useMemo(() => {
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
    try {
      const result = await api.updateGoal(goal.id, {
        status: next,
        // Tell the server who is marking this done so their diary gets ticked too
        ...(next === 'complete' && myPlayerId ? { completedBy: myPlayerId } : {}),
      });
      if (next === 'complete') {
        // Auto-vault: items added server-side
        const vaulted = result?.autoVaulted ?? [];
        if (vaulted.length > 0) {
          onToast(`🏆 ${vaulted.length} item${vaulted.length > 1 ? 's' : ''} auto-added to vault: ${vaulted.join(', ')}`, 'success');
        }
        // Diary auto-tick: refresh achievements so browser hides the completed diary
        if (result?.diaryTicked) {
          api.getAchievements(groupId).then(setAchievements).catch(() => {});
        }
      }
      onRefresh();
    } catch (err) { onToast(err.message, 'error'); }
  }

  async function deleteGoal(id) {
    const goal = goals.find(g => g.id === id);
    if (!confirm(`Remove "${goal?.title ?? 'this goal'}"?\nThis cannot be undone.`)) return;
    try { await api.deleteGoal(id); onToast('Goal removed', 'success'); onRefresh(); }
    catch (err) { onToast(err.message, 'error'); }
  }

  function openAdd(overrides = {}) {
    setPrefill({ ...(myPlayerId ? { owner_id: myPlayerId } : {}), ...overrides });
    setShowModal(true);
  }

  async function addSuggestion(s, status = 'not_started', selectedPlayerIds = []) {
    if (!canWrite) return onToast('Unlock group to add goals', 'error');
    setAddingId(s.id);
    // All selected players except the owner become contributors so the server
    // can tick the achievement diary for every one of them on completion.
    const contributorIds = myPlayerId
      ? selectedPlayerIds.filter(id => id !== myPlayerId)
      : selectedPlayerIds;
    try {
      const result = await api.createGoal({
        type: 'group',
        owner_id: myPlayerId || null,
        contributor_ids: contributorIds.length ? contributorIds : undefined,
        title: s.title,
        description: s.description,
        category: s.category === 'quest_series' ? 'quest'
                : s.category === 'skill_unlock'  ? 'skill'
                : s.category === 'diary'         ? 'diary'
                : s.category === 'boss_kill'     ? 'boss'
                : 'item',
        skill: s.skill ?? null,
        target_value: s.targetLevel ? String(s.targetLevel) : null,
        priority: s.priority ?? 'medium',
        status,
        details_json: {
          wikiUrl: s.wikiUrl || null,
          unlocks: s.unlocks || [],
          suggestionCategory: s.category,
          // For diary goals: store the achievement key (may differ from suggestion ID)
          ...(s.category === 'diary' ? { diaryKey: diaryAchievementKey(s.id) } : {}),
        },
      });

      if (status === 'complete') {
        const vaulted = result?.autoVaulted ?? [];
        if (vaulted.length > 0) {
          onToast(`🏆 ${vaulted.length} item${vaulted.length > 1 ? 's' : ''} auto-added to vault: ${vaulted.join(', ')}`, 'success');
        }
        if (result?.diaryTicked) {
          onToast(`📋 Achievement diary updated: ${s.title}`, 'success');
          api.getAchievements(groupId).then(setAchievements).catch(() => {});
        }
        if (!vaulted.length && !result?.diaryTicked) {
          onToast(`Marked done: ${s.title}`, 'success');
        }
      } else {
        onToast(`Added: ${s.title}`, 'success');
      }
      onRefresh();
    } catch (err) {
      if (!err.message?.includes('already exists')) onToast(err.message, 'error');
    } finally {
      setAddingId(null);
    }
  }

  const presentCategories = useMemo(() =>
    [...new Set(goals.map(g => g.category).filter(Boolean))],
  [goals]);

  const selStyle = {
    padding: '4px 8px', borderRadius: 'var(--radius)', fontSize: 12,
    background: 'var(--bg-input)', border: '1px solid var(--border)',
    color: 'var(--text)', cursor: 'pointer',
  };

  const sectionPillStyle = active => ({
    fontSize: 13, padding: '6px 16px', borderRadius: 'var(--radius)',
    background: active ? 'var(--gold)' : 'transparent',
    color: active ? '#111' : 'var(--text-dim)',
    border: active ? '1px solid var(--gold)' : '1px solid var(--border)',
    cursor: 'pointer', fontWeight: active ? 700 : 400,
    transition: 'all 0.12s',
  });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 16,
      background: 'var(--bg-panel)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px 18px',
    }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 16, color: 'var(--text-bright)' }}>🎯 Goals</h2>
      </div>

      {/* ── Stats bar ── */}
      <StatsBar goals={goals} />

      {/* ── Section tabs ── */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => setActiveSection('browser')} style={sectionPillStyle(activeSection === 'browser')}>
          💡 Goal Browser
        </button>
        <button onClick={() => setActiveSection('active')} style={sectionPillStyle(activeSection === 'active')}>
          📋 Active Goals
          {goals.filter(g => g.status !== 'complete' && g.status !== 'vaulted').length > 0 && (
            <span style={{ marginLeft: 7, fontSize: 11, background: 'rgba(200,168,75,0.2)', borderRadius: 10, padding: '1px 7px' }}>
              {goals.filter(g => g.status !== 'complete' && g.status !== 'vaulted').length}
            </span>
          )}
        </button>
      </div>

      {/* ── Goal Browser ── */}
      {activeSection === 'browser' && (
        <GoalBrowser
          players={players}
          goals={goals}
          onAdd={addSuggestion}
          canWrite={canWrite}
          addingId={addingId}
          onCreateCustom={() => openAdd()}
          achievements={achievements}
          groupId={groupId}
        />
      )}

      {/* ── Active Goals ── */}
      {activeSection === 'active' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* View toggle + filters */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* View toggle */}
            <div style={{ display: 'flex', gap: 2, background: 'var(--bg-panel-alt)', borderRadius: 'var(--radius)', padding: 3 }}>
              {[['board','📋 Board'],['list','☰ List']].map(([id, label]) => (
                <button key={id} onClick={() => setView(id)} style={pillStyle(view === id)}>{label}</button>
              ))}
            </div>

            {/* Player filter */}
            <select style={selStyle} value={filterPlayer} onChange={e => setFilterPlayer(e.target.value)}>
              <option value="all">All players</option>
              {players.map(p => <option key={p.id} value={String(p.id)}>{p.rsn}</option>)}
            </select>

            {/* Category filter */}
            <select style={selStyle} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="all">All types</option>
              {presentCategories.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
            </select>

            {/* Priority filter */}
            <select style={selStyle} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
              <option value="all">All priorities</option>
              <option value="high">🔴 High</option>
              <option value="medium">🟠 Medium</option>
              <option value="low">🟢 Low</option>
            </select>

            {/* Scope pills */}
            <div style={{ display: 'flex', gap: 2, background: 'var(--bg-panel-alt)', borderRadius: 'var(--radius)', padding: 3 }}>
              {[['all','All'],['personal','Personal'],['group','Group']].map(([id, label]) => (
                <button key={id} onClick={() => setFilterScope(id)} style={pillStyle(filterScope === id)}>{label}</button>
              ))}
            </div>

            {/* Clear filters */}
            {(filterPlayer !== 'all' || filterCategory !== 'all' || filterPriority !== 'all' || filterScope !== 'all') && (
              <button
                onClick={() => { setFilterPlayer('all'); setFilterCategory('all'); setFilterPriority('all'); setFilterScope('all'); }}
                style={{ fontSize: 11, color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>
                ✕ Clear filters
              </button>
            )}
          </div>

          {/* Board / List */}
          {view === 'board'
            ? <BoardView goals={filteredGoals} players={players} onCycle={cycleStatus} onDelete={deleteGoal} canWrite={canWrite} />
            : <ListView  goals={filteredGoals} players={players} onCycle={cycleStatus} onDelete={deleteGoal} canWrite={canWrite} />}

          {/* Empty state */}
          {goals.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '32px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🎯</div>
              <div style={{ fontSize: 14, marginBottom: 6, color: 'var(--text)' }}>No goals yet</div>
              <div style={{ fontSize: 12 }}>
                Browse the{' '}
                <button onClick={() => setActiveSection('browser')}
                  style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', padding: 0, fontSize: 12, fontWeight: 600 }}>
                  Goal Browser
                </button>
                {' '}to add your first goal.
              </div>
            </div>
          )}
        </div>
      )}

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
