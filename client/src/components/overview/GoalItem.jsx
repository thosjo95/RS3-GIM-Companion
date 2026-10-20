import React, { useState } from 'react';
import { fmtNum, xpForLevel, wikiUrl, parseDetails } from '../../lib/rs3';
import SkillIcon from '../common/SkillIcon';
import { STATUS_LABELS, STATUS_COLORS, getPlayerSkill } from './constants';

// ── Rich goal item ────────────────────────────────────────────────────────────

export default function GoalItem({ goal, players, onCycle, onDelete, onUpdateCount, onVault, canWrite }) {
  const [expanded, setExpanded] = useState(false);
  const [editingCount, setEditingCount] = useState(false);
  const [countDraft, setCountDraft] = useState(goal.current_value ?? 0);
  const [vaultPrompt, setVaultPrompt] = useState(false);

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

  const isComplete = goal.status === 'complete';
  const barColor = isComplete ? 'var(--green)' : 'var(--gold)';

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
          {(goalType === 'level' || goalType === 'item' || goalType === 'quest') && (
            <button onClick={() => setExpanded(x => !x)} style={{
              fontSize: 10, padding: '2px 6px', borderRadius: 6, cursor: 'pointer',
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text-dim)',
            }}>
              {expanded ? '▲' : '▼'}
            </button>
          )}
          {/* Wiki icon — always visible for quest goals */}
          {goalType === 'quest' && details?.questName && (
            <a
              href={`https://runescape.wiki/w/${details.questName.replace(/ /g, '_')}`}
              target="_blank"
              rel="noopener noreferrer"
              title={`${details.questName} on RS Wiki`}
              onClick={e => e.stopPropagation()}
              style={{
                fontSize: 12, padding: '2px 5px', borderRadius: 6,
                background: 'transparent', border: '1px solid var(--border)',
                color: 'var(--text-dim)', textDecoration: 'none', lineHeight: 1.4,
              }}>📖</a>
          )}
          <button onClick={() => onCycle(goal)} style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 10, cursor: 'pointer',
            background: 'transparent', border: `1px solid ${STATUS_COLORS[goal.status] || 'var(--border)'}`,
            color: STATUS_COLORS[goal.status] || 'var(--text-dim)', whiteSpace: 'nowrap',
          }}>
            {STATUS_LABELS[goal.status] || goal.status}
          </button>
          {/* Vault button — only when complete */}
          {isComplete && canWrite && (
            <button onClick={() => setVaultPrompt(v => !v)} title="Move to Vault" style={{
              fontSize: 12, padding: '2px 4px', background: 'transparent',
              border: 'none', color: vaultPrompt ? 'var(--gold)' : 'var(--text-dim)', cursor: 'pointer',
            }}>🏆</button>
          )}
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
            <span><SkillIcon name={goal.skill} size={14} /> {goal.skill}: <strong style={{ color: 'var(--text-bright)' }}>{currentLvl}</strong> → <strong style={{ color: 'var(--gold)' }}>{targetLvl}</strong></span>
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

          {goalType === 'item' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {details.skill && details.skillLevel && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--text-dim)' }}>Requires:</span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                    background: reqMet ? 'rgba(90,154,80,0.15)' : 'rgba(192,64,64,0.12)',
                    border: `1px solid ${reqMet ? 'var(--green)' : 'var(--red)'}`,
                    color: reqMet ? 'var(--green-bright)' : 'var(--red-bright)',
                  }}>
                    <SkillIcon name={details.skill} size={14} /> {details.skill} {details.skillLevel}
                    {reqSkillEntry ? ` (you: ${reqSkillEntry.level})` : ''}
                  </span>
                </div>
              )}
              {details.method && (
                <div style={{ color: 'var(--text-dim)' }}>Method: <strong style={{ color: 'var(--text-bright)' }}>{details.method}</strong></div>
              )}
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

          {goalType === 'quest' && (
            <div>
              {goal.description && <div style={{ color: 'var(--text-dim)', marginBottom: 6 }}>{goal.description}</div>}
              <a href={wikiUrl(details.questName || goal.title)} target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--gold)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                📖 {details.questName || goal.title} on RS Wiki
              </a>
            </div>
          )}

          {goalType === 'custom' && goal.description && (
            <div style={{ color: 'var(--text-dim)' }}>{goal.description}</div>
          )}
        </div>
      )}

      {/* Vault prompt */}
      {vaultPrompt && (
        <div style={{
          marginTop: 8, padding: '8px 12px',
          background: 'rgba(200,168,75,0.08)',
          border: '1px solid var(--gold-dark)',
          borderRadius: 'var(--radius)',
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', flex: 1 }}>🏆 Showcase this in the Vault?</span>
          <button
            onClick={() => { onVault(goal.id); setVaultPrompt(false); }}
            className="btn btn-primary btn-sm"
            style={{ fontSize: 11 }}
          >Move to Vault</button>
          <button
            onClick={() => setVaultPrompt(false)}
            style={{ fontSize: 11, background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
          >Keep private</button>
        </div>
      )}
    </div>
  );
}
