import React, { useState, useMemo } from 'react';
import { api } from '../api/client';
import { QUESTS, QUEST_NAMES } from '../data/quests';
import { RECIPES, RECIPE_NAMES, expandRecipe } from '../data/itemRecipes';

const SKILL_LIST = [
  'Attack', 'Defence', 'Strength', 'Constitution', 'Ranged', 'Prayer', 'Magic',
  'Cooking', 'Woodcutting', 'Fletching', 'Fishing', 'Firemaking', 'Crafting',
  'Smithing', 'Mining', 'Herblore', 'Agility', 'Thieving', 'Slayer', 'Farming',
  'Runecrafting', 'Hunter', 'Construction', 'Summoning', 'Dungeoneering',
  'Divination', 'Invention', 'Archaeology', 'Necromancy',
];

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPlayerSkill(player, skillName) {
  if (!player?.skills) return 1;
  return player.skills.find(s => s.skill_name === skillName)?.level ?? 1;
}

function fmtNum(n) {
  if (!n) return '0';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(n);
}

// XP table for RS3 (levels 1–120)
const XP_TABLE = (() => {
  const t = [0, 0];
  for (let lvl = 2; lvl <= 120; lvl++) {
    const points = Math.floor(lvl - 1 + 300 * Math.pow(2, (lvl - 1) / 7));
    t[lvl] = Math.floor(t[lvl - 1] + points / 4);
  }
  return t;
})();

function xpForLevel(lvl) { return XP_TABLE[Math.min(Math.max(lvl, 1), 120)] ?? 0; }

// ── Level Goal Form ───────────────────────────────────────────────────────────

function LevelGoalForm({ players, form, set }) {
  const owner = players.find(p => p.id === Number(form.owner_id));
  const currentLevel = owner ? getPlayerSkill(owner, form.skill) : null;
  const targetLevel = Number(form.target_value) || 0;

  const xpNeeded = currentLevel && targetLevel > currentLevel
    ? xpForLevel(targetLevel) - xpForLevel(currentLevel)
    : null;

  const pct = currentLevel && targetLevel > 1
    ? Math.min(100, Math.round(((currentLevel - 1) / (targetLevel - 1)) * 100))
    : 0;

  return (
    <>
      <div className="form-group">
        <label className="form-label">Player</label>
        <select className="form-select" value={form.owner_id} onChange={e => set('owner_id', e.target.value)}>
          {players.map(p => <option key={p.id} value={p.id}>{p.rsn}</option>)}
        </select>
      </div>

      <div className="grid-2" style={{ gap: 10 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Skill</label>
          <select className="form-select" value={form.skill} onChange={e => set('skill', e.target.value)}>
            <option value="">— Select skill —</option>
            {SKILL_LIST.map(s => (
              <option key={s} value={s}>
                {SKILL_ICONS[s]} {s}{owner ? ` (${getPlayerSkill(owner, s)})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Target Level</label>
          <input type="number" min="2" max="120" className="form-input"
            value={form.target_value} onChange={e => set('target_value', e.target.value)}
            placeholder="e.g. 99" />
        </div>
      </div>

      {currentLevel !== null && form.skill && targetLevel > 0 && (
        <div style={{
          marginTop: 12, padding: '10px 12px',
          background: 'var(--bg-panel-alt)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', fontSize: 12,
        }}>
          <div className="flex align-center justify-between mb-8">
            <span style={{ color: 'var(--text-dim)' }}>
              {SKILL_ICONS[form.skill]} {form.skill}: <strong style={{ color: 'var(--text-bright)' }}>{currentLevel}</strong> → <strong style={{ color: 'var(--gold)' }}>{targetLevel}</strong>
            </span>
            {xpNeeded > 0 && (
              <span style={{ color: 'var(--text-dim)' }}>{fmtNum(xpNeeded)} XP needed</span>
            )}
          </div>
          <div className="xp-bar">
            <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <div style={{ color: 'var(--text-dim)', marginTop: 4 }}>{pct}% of the way there</div>
          {currentLevel >= targetLevel && (
            <div style={{ color: 'var(--green-bright)', marginTop: 4 }}>✓ Already achieved!</div>
          )}
        </div>
      )}
    </>
  );
}

// ── Quest Goal Form ───────────────────────────────────────────────────────────

function QuestGoalForm({ players, form, set }) {
  const owner = players.find(p => p.id === Number(form.owner_id));
  const quest = QUESTS[form.details?.questName];

  const reqStatus = useMemo(() => {
    if (!quest || !owner) return null;
    const results = {};
    for (const [skill, needed] of Object.entries(quest.requirements.skills)) {
      const have = getPlayerSkill(owner, skill);
      results[skill] = { needed, have, met: have >= needed };
    }
    return results;
  }, [quest, owner, form.owner_id]);

  const allSkillsMet = reqStatus ? Object.values(reqStatus).every(r => r.met) : false;
  const metCount = reqStatus ? Object.values(reqStatus).filter(r => r.met).length : 0;
  const totalReqs = reqStatus ? Object.keys(reqStatus).length : 0;

  return (
    <>
      <div className="form-group">
        <label className="form-label">Player</label>
        <select className="form-select" value={form.owner_id} onChange={e => set('owner_id', e.target.value)}>
          {players.map(p => <option key={p.id} value={p.id}>{p.rsn}</option>)}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Quest</label>
        <select className="form-select" value={form.details?.questName ?? ''}
          onChange={e => set('details', { ...form.details, questName: e.target.value })}>
          <option value="">— Select quest —</option>
          {QUEST_NAMES.map(q => {
            const qd = QUESTS[q];
            return <option key={q} value={q}>{q} ({qd.difficulty})</option>;
          })}
        </select>
      </div>

      {quest && (
        <div style={{
          padding: '12px 14px', background: 'var(--bg-panel-alt)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          fontSize: 12,
        }}>
          <div className="flex align-center justify-between mb-10">
            <span style={{ fontWeight: 700, color: 'var(--text-bright)' }}>{form.details?.questName}</span>
            <span className="tag">{quest.difficulty}</span>
          </div>

          {/* Quest prereqs */}
          {quest.requirements.quests.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ color: 'var(--text-dim)', fontWeight: 600, marginBottom: 4 }}>Quest prerequisites</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {quest.requirements.quests.map(q => (
                  <span key={q} className="tag" style={{ fontSize: 11 }}>📜 {q}</span>
                ))}
              </div>
            </div>
          )}

          {/* QP requirement */}
          {quest.requirements.qp > 0 && (
            <div style={{ marginBottom: 10, color: 'var(--text-dim)' }}>
              Quest points needed: <strong style={{ color: 'var(--gold)' }}>{quest.requirements.qp} QP</strong>
              {owner && (
                <span style={{ color: owner.quest_points >= quest.requirements.qp ? 'var(--green-bright)' : 'var(--red-bright)', marginLeft: 8 }}>
                  ({owner.quest_points >= quest.requirements.qp ? `✓ ${owner.rsn} has ${owner.quest_points}` : `✗ ${owner.rsn} has ${owner.quest_points}`})
                </span>
              )}
            </div>
          )}

          {/* Skill requirements */}
          {totalReqs > 0 ? (
            <>
              <div style={{ color: 'var(--text-dim)', fontWeight: 600, marginBottom: 6 }}>
                Skill requirements
                {owner && <span style={{ marginLeft: 8, fontWeight: 400 }}>— {metCount}/{totalReqs} met by {owner.rsn}</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 4 }}>
                {Object.entries(quest.requirements.skills).map(([skill, needed]) => {
                  const r = reqStatus?.[skill];
                  const have = r?.have ?? '?';
                  const met = r?.met ?? false;
                  const shortfall = needed - (r?.have ?? 0);
                  return (
                    <div key={skill} style={{
                      padding: '5px 8px', borderRadius: 'var(--radius)',
                      background: met ? 'rgba(90,154,80,0.1)' : 'rgba(192,64,64,0.1)',
                      border: `1px solid ${met ? 'var(--green)' : 'var(--red)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <span>{SKILL_ICONS[skill]} {skill}</span>
                      <span style={{ fontWeight: 700, color: met ? 'var(--green-bright)' : 'var(--red-bright)' }}>
                        {met ? `✓ ${have}` : `${have}/${needed}`}
                        {!met && shortfall > 0 && <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 3 }}>(-{shortfall})</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--green-bright)' }}>✓ No skill requirements</div>
          )}

          {/* Unlocks */}
          {quest.unlocks?.length > 0 && (
            <div style={{ marginTop: 10, color: 'var(--text-dim)' }}>
              Unlocks: {quest.unlocks.join(' · ')}
            </div>
          )}

          {/* Overall readiness */}
          {owner && totalReqs > 0 && (
            <div style={{
              marginTop: 10, padding: '6px 10px', borderRadius: 'var(--radius)',
              background: allSkillsMet ? 'rgba(90,154,80,0.15)' : 'rgba(200,120,48,0.1)',
              border: `1px solid ${allSkillsMet ? 'var(--green)' : 'var(--orange)'}`,
              color: allSkillsMet ? 'var(--green-bright)' : 'var(--orange)',
            }}>
              {allSkillsMet
                ? `✓ ${owner.rsn} meets all skill requirements!`
                : `${owner.rsn} needs ${totalReqs - metCount} more skill${totalReqs - metCount !== 1 ? 's' : ''}`}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Item Goal Form ────────────────────────────────────────────────────────────

function ItemGoalForm({ players, form, set }) {
  const itemName = form.details?.itemName ?? '';
  const quantity = Number(form.details?.quantity) || 1;
  const recipe = RECIPES[itemName];
  const materials = recipe ? expandRecipe(itemName, quantity) : null;

  function handleItemChange(val) {
    set('details', { ...form.details, itemName: val });
  }
  function handleQtyChange(val) {
    set('details', { ...form.details, quantity: Number(val) || 1 });
  }

  return (
    <>
      {form.type === 'personal' && (
        <div className="form-group">
          <label className="form-label">Player</label>
          <select className="form-select" value={form.owner_id} onChange={e => set('owner_id', e.target.value)}>
            {players.map(p => <option key={p.id} value={p.id}>{p.rsn}</option>)}
          </select>
        </div>
      )}
      <div className="form-group">
        <label className="form-label">Item</label>
        <input className="form-input" list="item-recipe-list" value={itemName}
          onChange={e => handleItemChange(e.target.value)}
          placeholder="Search or type any item name…" />
        <datalist id="item-recipe-list">
          {RECIPE_NAMES.map(r => <option key={r} value={r} />)}
        </datalist>
        {recipe && (
          <div className="text-xs text-dim mt-8">
            📦 Craftable via {recipe.method}{recipe.skill ? ` (${recipe.skill} ${recipe.skillLevel})` : ''}
          </div>
        )}
        {itemName && !recipe && (
          <div className="text-xs text-dim mt-8">📋 Raw gathering goal — no recipe found</div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Target Quantity</label>
        <input type="number" min="1" className="form-input"
          value={quantity} onChange={e => handleQtyChange(e.target.value)} />
      </div>

      {/* Material breakdown for craftable items */}
      {recipe && materials && (
        <div style={{
          padding: '12px 14px', background: 'var(--bg-panel-alt)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 12,
        }}>
          <div style={{ fontWeight: 700, color: 'var(--text-bright)', marginBottom: 8 }}>
            Materials needed for {fmtNum(quantity)} {itemName}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {materials.map((m, i) => (
              <div key={i} className="flex align-center justify-between" style={{
                padding: '5px 8px', borderRadius: 'var(--radius)',
                background: m.raw ? 'rgba(90,74,50,0.3)' : 'rgba(74,136,184,0.1)',
                border: `1px solid ${m.raw ? 'var(--border)' : 'var(--blue)'}`,
              }}>
                <span style={{ color: 'var(--text)' }}>
                  {m.raw ? '🪨' : '⚙️'} {m.item}
                </span>
                <span style={{ fontWeight: 700, color: 'var(--gold)' }}>{fmtNum(m.quantity)}</span>
              </div>
            ))}
          </div>
          {recipe.note && (
            <div style={{ marginTop: 8, color: 'var(--text-dim)', fontStyle: 'italic' }}>ℹ {recipe.note}</div>
          )}
        </div>
      )}
    </>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

const GOAL_TYPES = [
  { id: 'level', label: '📈 Level Goal', desc: 'Target a skill level for a player' },
  { id: 'quest', label: '📜 Quest Goal', desc: 'Track a quest with all its requirements' },
  { id: 'item',  label: '📦 Item Goal',  desc: 'Resource target with material breakdown' },
  { id: 'custom', label: '✏️ Custom',    desc: 'Anything else' },
];

export default function GoalModal({ players, onClose, onSaved, prefill = {}, onToast }) {
  const [goalType, setGoalType] = useState(prefill.category === 'quest' ? 'quest' : prefill.category === 'item' ? 'item' : prefill.skill ? 'level' : 'custom');
  const [form, setForm] = useState({
    type: prefill.type || 'personal',
    owner_id: prefill.owner_id || players[0]?.id || '',
    title: prefill.title || '',
    description: prefill.description || '',
    priority: prefill.priority || 'medium',
    skill: prefill.skill || '',
    target_value: prefill.target_value || '',
    details: {},
    contributor_ids: [],
  });
  const [saving, setSaving] = useState(false);

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); }

  // Auto-generate title based on goal type
  const autoTitle = useMemo(() => {
    if (goalType === 'level' && form.skill && form.target_value) {
      const owner = players.find(p => p.id === Number(form.owner_id));
      return `${owner?.rsn ?? 'Player'}: ${form.skill} ${form.target_value}`;
    }
    if (goalType === 'quest' && form.details?.questName) {
      const owner = players.find(p => p.id === Number(form.owner_id));
      return `${owner?.rsn ?? 'Player'}: ${form.details.questName}`;
    }
    if (goalType === 'item' && form.details?.itemName && form.details?.quantity) {
      return `${fmtNum(form.details.quantity)}x ${form.details.itemName}`;
    }
    return '';
  }, [goalType, form.skill, form.target_value, form.details, form.owner_id, players]);

  function toggleContrib(id) {
    setForm(f => ({
      ...f,
      contributor_ids: f.contributor_ids.includes(id)
        ? f.contributor_ids.filter(x => x !== id)
        : [...f.contributor_ids, id],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const title = form.title.trim() || autoTitle;
    if (!title) return onToast('Title or enough info to auto-generate one is required', 'error');

    let category = 'other';
    let details_json = null;

    if (goalType === 'level') {
      category = 'skill';
      details_json = { goalType: 'level' };
    } else if (goalType === 'quest') {
      category = 'quest';
      const quest = QUESTS[form.details?.questName];
      details_json = {
        goalType: 'quest',
        questName: form.details?.questName,
        requirements: quest?.requirements ?? {},
        unlocks: quest?.unlocks ?? [],
      };
    } else if (goalType === 'item') {
      category = 'item';
      const recipe = RECIPES[form.details?.itemName];
      details_json = {
        goalType: 'item',
        itemName: form.details?.itemName,
        quantity: Number(form.details?.quantity) || 1,
        recipe: recipe ? expandRecipe(form.details.itemName, Number(form.details.quantity) || 1) : null,
        method: recipe?.method ?? null,
        skill: recipe?.skill ?? null,
        skillLevel: recipe?.skillLevel ?? null,
      };
    }

    setSaving(true);
    try {
      await api.createGoal({
        type: form.type,
        owner_id: form.type === 'personal' ? Number(form.owner_id) : null,
        title: title,
        description: form.description?.trim() || null,
        category,
        skill: goalType === 'level' ? form.skill : null,
        target_value: goalType === 'level' ? Number(form.target_value) || null : (goalType === 'item' ? Number(form.details?.quantity) || null : null),
        priority: form.priority,
        details_json,
        contributor_ids: form.type === 'group' ? form.contributor_ids : [],
      });
      onSaved();
      onClose();
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <span className="modal-title">🎯 Add Goal</span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ overflowY: 'auto', maxHeight: '70vh' }}>

            {/* Goal type selector */}
            <div className="form-group">
              <label className="form-label">Goal Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                {GOAL_TYPES.map(t => (
                  <button key={t.id} type="button"
                    onClick={() => setGoalType(t.id)}
                    style={{
                      padding: '8px 10px', borderRadius: 'var(--radius)',
                      background: goalType === t.id ? 'var(--gold-dark)' : 'var(--bg-hover)',
                      border: `1px solid ${goalType === t.id ? 'var(--gold)' : 'var(--border)'}`,
                      color: goalType === t.id ? 'var(--bg-root)' : 'var(--text-dim)',
                      cursor: 'pointer', textAlign: 'left', fontSize: 12,
                      fontWeight: goalType === t.id ? 700 : 400,
                    }}>
                    <div>{t.label}</div>
                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <hr className="divider" />

            {/* Personal / Group toggle */}
            <div className="form-group">
              <label className="form-label">Scope</label>
              <div className="flex gap-8">
                {['personal', 'group'].map(t => (
                  <button key={t} type="button"
                    className={`btn btn-sm ${form.type === t ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => set('type', t)}>
                    {t === 'personal' ? '👤 Personal' : '👥 Group'}
                  </button>
                ))}
              </div>
            </div>

            {/* Group contributors */}
            {form.type === 'group' && players.length > 0 && goalType !== 'level' && goalType !== 'quest' && (
              <div className="form-group">
                <label className="form-label">Contributors (optional)</label>
                <div className="flex gap-6" style={{ flexWrap: 'wrap' }}>
                  {players.map(p => (
                    <button key={p.id} type="button"
                      className={`btn btn-sm ${form.contributor_ids.includes(p.id) ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => toggleContrib(p.id)}>
                      {p.rsn}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Type-specific form */}
            {goalType === 'level' && <LevelGoalForm players={players} form={form} set={set} />}
            {goalType === 'quest' && <QuestGoalForm players={players} form={form} set={set} />}
            {goalType === 'item'  && <ItemGoalForm players={players} form={form} set={set} />}

            {goalType === 'custom' && (
              <>
                <div className="form-group">
                  <label className="form-label">Owner</label>
                  <select className="form-select" value={form.owner_id} onChange={e => set('owner_id', e.target.value)}>
                    {players.map(p => <option key={p.id} value={p.id}>{p.rsn}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={form.skill || 'other'}
                    onChange={e => set('skill', e.target.value === 'other' ? '' : e.target.value)}>
                    <option value="other">Other</option>
                    <option value="boss">Boss</option>
                    <option value="diary">Diary / Task Set</option>
                  </select>
                </div>
              </>
            )}

            <hr className="divider" />

            {/* Title override */}
            <div className="form-group">
              <label className="form-label">
                Title {autoTitle && <span className="text-dim">(auto: {autoTitle})</span>}
              </label>
              <input className="form-input" value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder={autoTitle || 'Enter a title…'} />
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Optional context…" style={{ minHeight: 56 }} />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Priority</label>
              <div className="flex gap-8">
                {['high', 'medium', 'low'].map(p => (
                  <button key={p} type="button"
                    className={`btn btn-sm ${form.priority === p ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => set('priority', p)}>
                    {p === 'high' ? '🔴' : p === 'medium' ? '🟠' : '🟢'} {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Saving…</> : '🎯 Add Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
