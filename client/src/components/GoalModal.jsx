import React, { useState, useMemo, useRef, useEffect } from 'react';
import { api } from '../api/client';
import { QUESTS, QUEST_NAMES, DIFF_COLOUR } from '../data/quests';
import { RECIPES, RECIPE_NAMES, expandRecipe } from '../data/itemRecipes';

const SKILL_LIST = [
  'Attack', 'Defence', 'Strength', 'Constitution', 'Ranged', 'Prayer', 'Magic',
  'Cooking', 'Woodcutting', 'Fletching', 'Fishing', 'Firemaking', 'Crafting',
  'Smithing', 'Mining', 'Herblore', 'Agility', 'Thieving', 'Slayer', 'Farming',
  'Runecrafting', 'Hunter', 'Construction', 'Summoning', 'Dungeoneering',
  'Divination', 'Invention', 'Archaeology', 'Necromancy',
];

const SKILL_ICONS = {
  Attack:       'https://runescape.wiki/images/Attack.png',
  Defence:      'https://runescape.wiki/images/Defence.png',
  Strength:     'https://runescape.wiki/images/Strength.png',
  Constitution: 'https://runescape.wiki/images/Constitution.png',
  Ranged:       'https://runescape.wiki/images/Ranged.png',
  Prayer:       'https://runescape.wiki/images/Prayer.png',
  Magic:        'https://runescape.wiki/images/Magic.png',
  Cooking:      'https://runescape.wiki/images/Cooking.png',
  Woodcutting:  'https://runescape.wiki/images/Woodcutting.png',
  Fletching:    'https://runescape.wiki/images/Fletching.png',
  Fishing:      'https://runescape.wiki/images/Fishing.png',
  Firemaking:   'https://runescape.wiki/images/Firemaking.png',
  Crafting:     'https://runescape.wiki/images/Crafting.png',
  Smithing:     'https://runescape.wiki/images/Smithing.png',
  Mining:       'https://runescape.wiki/images/Mining.png',
  Herblore:     'https://runescape.wiki/images/Herblore.png',
  Agility:      'https://runescape.wiki/images/Agility.png',
  Thieving:     'https://runescape.wiki/images/Thieving.png',
  Slayer:       'https://runescape.wiki/images/Slayer.png',
  Farming:      'https://runescape.wiki/images/Farming.png',
  Runecrafting: 'https://runescape.wiki/images/Runecrafting.png',
  Hunter:       'https://runescape.wiki/images/Hunter.png',
  Construction: 'https://runescape.wiki/images/Construction.png',
  Summoning:    'https://runescape.wiki/images/Summoning.png',
  Dungeoneering:'https://runescape.wiki/images/Dungeoneering.png',
  Divination:   'https://runescape.wiki/images/Divination.png',
  Invention:    'https://runescape.wiki/images/Invention.png',
  Archaeology:  'https://runescape.wiki/images/Archaeology.png',
  Necromancy:   'https://runescape.wiki/images/Necromancy.png',
};

// Custom skill picker that shows RS3 wiki icons (native <select> can't render images)
function SkillSelect({ value, onChange, owner }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 10px', borderRadius: 'var(--radius)',
          background: 'var(--bg-input)', border: '1px solid var(--border)',
          color: value ? 'var(--text-bright)' : 'var(--text-dim)',
          cursor: 'pointer', fontSize: 13, textAlign: 'left',
        }}>
        {value
          ? <><img src={SKILL_ICONS[value]} alt={value} style={{ width: 18, height: 18, imageRendering: 'auto' }} />{value}{owner ? ` (${getPlayerSkill(owner, value)})` : ''}</>
          : '— Select skill —'}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-dim)' }}>▼</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--bg-panel)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
          maxHeight: 280, overflowY: 'auto', marginTop: 2,
        }}>
          {SKILL_LIST.map(s => (
            <button
              key={s} type="button"
              onClick={() => { onChange(s); setOpen(false); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', background: s === value ? 'rgba(200,168,75,0.15)' : 'transparent',
                border: 'none', borderBottom: '1px solid var(--border)',
                color: s === value ? 'var(--gold)' : 'var(--text)',
                cursor: 'pointer', fontSize: 12, textAlign: 'left',
              }}
              onMouseEnter={e => { if (s !== value) e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { if (s !== value) e.currentTarget.style.background = 'transparent'; }}
            >
              <img src={SKILL_ICONS[s]} alt={s} style={{ width: 18, height: 18, imageRendering: 'auto', flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{s}</span>
              {owner && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{getPlayerSkill(owner, s)}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
      {form.type === 'personal' && (
        <div className="form-group">
          <label className="form-label">Player</label>
          <select className="form-select" value={form.owner_id} onChange={e => set('owner_id', e.target.value)}>
            {players.map(p => <option key={p.id} value={p.id}>{p.rsn}</option>)}
          </select>
        </div>
      )}

      <div className="grid-2" style={{ gap: 10 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Skill</label>
          <SkillSelect value={form.skill} onChange={v => set('skill', v)} owner={owner} />
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
            <span style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 5 }}>
              {SKILL_ICONS[form.skill] && <img src={SKILL_ICONS[form.skill]} alt={form.skill} style={{ width: 16, height: 16 }} />}
              {form.skill}: <strong style={{ color: 'var(--text-bright)' }}>{currentLevel}</strong> → <strong style={{ color: 'var(--gold)' }}>{targetLevel}</strong>
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

// ── Searchable quest picker ───────────────────────────────────────────────────

function QuestSelect({ value, onChange }) {
  const [search, setSearch]   = useState('');
  const [open, setOpen]       = useState(false);
  const ref                   = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return QUEST_NAMES;
    const q = search.toLowerCase();
    return QUEST_NAMES.filter(n => n.toLowerCase().includes(q));
  }, [search]);

  const questData = value ? QUESTS[value] : null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 10px', borderRadius: 'var(--radius)',
          background: 'var(--bg-input)', border: '1px solid var(--border)',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        {value
          ? <span style={{ flex: 1, color: 'var(--text-bright)', fontSize: 13 }}>{value}</span>
          : <span style={{ flex: 1, color: 'var(--text-dim)', fontSize: 13 }}>— Search quests… —</span>}
        {questData && (
          <span style={{
            fontSize: 10, padding: '2px 6px', borderRadius: 3, flexShrink: 0,
            background: (DIFF_COLOUR[questData.difficulty] ?? '#888') + '33',
            color: DIFF_COLOUR[questData.difficulty] ?? '#888',
          }}>{questData.difficulty}</span>
        )}
        <span style={{ fontSize: 10, color: 'var(--text-dim)', flexShrink: 0 }}>▼</span>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300,
          background: 'var(--bg-panel)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', boxShadow: '0 6px 24px rgba(0,0,0,0.55)',
          marginTop: 2,
        }}>
          {/* Search box */}
          <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Type any part of the quest name…"
              style={{
                width: '100%', padding: '5px 8px', fontSize: 12,
                background: 'var(--bg-input)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', color: 'var(--text)', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {filtered.length === 0
              ? <div style={{ padding: '10px 12px', color: 'var(--text-dim)', fontSize: 12 }}>No quests match "{search}"</div>
              : filtered.map(q => {
                  const qd = QUESTS[q];
                  const dc = DIFF_COLOUR[qd?.difficulty] ?? '#888';
                  return (
                    <button key={q} type="button"
                      onClick={() => { onChange(q); setOpen(false); setSearch(''); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', padding: '6px 10px',
                        background: q === value ? 'rgba(200,168,75,0.15)' : 'transparent',
                        border: 'none', borderBottom: '1px solid var(--border)',
                        color: q === value ? 'var(--gold)' : 'var(--text)',
                        cursor: 'pointer', fontSize: 12, textAlign: 'left', gap: 6,
                      }}
                      onMouseEnter={e => { if (q !== value) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                      onMouseLeave={e => { if (q !== value) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ flex: 1 }}>
                        {q}
                        {qd?.series && <span style={{ marginLeft: 5, fontSize: 10, color: 'var(--text-dim)' }}>({qd.series})</span>}
                      </span>
                      <span style={{
                        fontSize: 10, padding: '1px 5px', borderRadius: 3, flexShrink: 0,
                        background: dc + '33', color: dc,
                      }}>{qd?.difficulty}</span>
                    </button>
                  );
                })
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ── Quest Goal Form ───────────────────────────────────────────────────────────

function QuestGoalForm({ players, form, set, onSaved, onToast }) {
  const owner = players.find(p => p.id === Number(form.owner_id));
  const quest = QUESTS[form.details?.questName];

  // Which prerequisite quests the player has already ticked off as done
  const [donePrereqs, setDonePrereqs] = useState(new Set());
  const [addingPrereqs, setAddingPrereqs] = useState(false);
  const [addingSkills, setAddingSkills] = useState(false);

  // Reset tick-boxes when quest changes
  useEffect(() => { setDonePrereqs(new Set()); }, [form.details?.questName]);

  function togglePrereq(q) {
    setDonePrereqs(prev => {
      const next = new Set(prev);
      next.has(q) ? next.delete(q) : next.add(q);
      return next;
    });
  }

  const reqStatus = useMemo(() => {
    if (!quest || !owner) return null;
    const results = {};
    for (const [skill, needed] of Object.entries(quest.requirements.skills)) {
      const have = getPlayerSkill(owner, skill);
      results[skill] = { needed, have, met: have >= needed };
    }
    return results;
  }, [quest, owner, form.owner_id]);

  const allSkillsMet = reqStatus ? Object.values(reqStatus).every(r => r.met) : true;
  const metCount     = reqStatus ? Object.values(reqStatus).filter(r => r.met).length : 0;
  const totalReqs    = reqStatus ? Object.keys(reqStatus).length : 0;

  const prereqs     = quest?.requirements.quests ?? [];
  const missingPrereqs = prereqs.filter(q => !donePrereqs.has(q));
  const missingSkills  = Object.entries(quest?.requirements.skills ?? {})
    .filter(([skill, needed]) => (reqStatus?.[skill]?.have ?? 1) < needed);

  async function handleAddMissingPrereqs() {
    if (!missingPrereqs.length) return;
    setAddingPrereqs(true);
    let added = 0;
    try {
      for (const questName of missingPrereqs) {
        const prereqData = QUESTS[questName];
        try {
          await api.createGoal({
            type: 'personal',
            owner_id: Number(form.owner_id),
            title: `${owner?.rsn ?? 'Player'}: ${questName}`,
            category: 'quest',
            priority: 'medium',
            details_json: {
              goalType: 'quest',
              questName,
              requirements: prereqData?.requirements ?? {},
              unlocks: prereqData?.unlocks ?? [],
            },
          });
          added++;
        } catch (err) {
          if (!err.message.includes('already exists')) throw err; // skip duplicates silently
        }
      }
      if (added > 0) {
        onToast?.(`Added ${added} prerequisite quest goal${added !== 1 ? 's' : ''}`, 'success');
        onSaved?.();
      } else {
        onToast?.('All prerequisite quest goals already exist', 'info');
      }
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setAddingPrereqs(false);
    }
  }

  async function handleAddMissingSkillGoals() {
    if (!missingSkills.length) return;
    setAddingSkills(true);
    let added = 0;
    try {
      for (const [skill, needed] of missingSkills) {
        try {
          await api.createGoal({
            type: 'personal',
            owner_id: Number(form.owner_id),
            title: `${owner?.rsn ?? 'Player'}: ${skill} ${needed}`,
            category: 'skill',
            skill,
            target_value: needed,
            priority: 'medium',
            details_json: { goalType: 'level' },
          });
          added++;
        } catch (err) {
          if (!err.message.includes('already exists')) throw err; // skip duplicates silently
        }
      }
      if (added > 0) {
        onToast?.(`Added ${added} skill goal${added !== 1 ? 's' : ''}`, 'success');
        onSaved?.();
      } else {
        onToast?.('All skill goals already exist', 'info');
      }
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setAddingSkills(false);
    }
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
        <label className="form-label">Quest</label>
        <QuestSelect
          value={form.details?.questName ?? ''}
          onChange={v => set('details', { ...form.details, questName: v })}
        />
      </div>

      {quest && (
        <div style={{
          padding: '12px 14px', background: 'var(--bg-panel-alt)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          fontSize: 12, display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {/* Header */}
          <div className="flex align-center justify-between">
            <span style={{ fontWeight: 700, color: 'var(--text-bright)', fontSize: 13 }}>{form.details?.questName}</span>
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 3,
              background: (DIFF_COLOUR[quest.difficulty] ?? '#888') + '33',
              color: DIFF_COLOUR[quest.difficulty] ?? '#888',
            }}>{quest.difficulty}</span>
          </div>

          {/* Quest prerequisites — with checkboxes */}
          {prereqs.length > 0 && (
            <div>
              <div style={{ color: 'var(--text-dim)', fontWeight: 600, marginBottom: 6 }}>
                Quest prerequisites
                {missingPrereqs.length > 0 && (
                  <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--text-dim)' }}>
                    — tick any you've already completed
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {prereqs.map(q => {
                  const done = donePrereqs.has(q);
                  const inData = !!QUESTS[q];
                  return (
                    <label key={q} style={{
                      display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                      padding: '5px 8px', borderRadius: 'var(--radius)',
                      background: done ? 'rgba(90,154,80,0.1)' : 'rgba(192,64,64,0.08)',
                      border: `1px solid ${done ? 'var(--green)' : 'var(--border)'}`,
                    }}>
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => togglePrereq(q)}
                        style={{ accentColor: 'var(--green)', cursor: 'pointer', flexShrink: 0 }}
                      />
                      <span style={{ color: done ? 'var(--green-bright)' : 'var(--text)', flex: 1 }}>
                        📜 {q}
                        {QUESTS[q]?.difficulty && (
                          <span style={{ marginLeft: 6, fontSize: 10, color: DIFF_COLOUR[QUESTS[q].difficulty] }}>
                            {QUESTS[q].difficulty}
                          </span>
                        )}
                      </span>
                      {done
                        ? <span style={{ color: 'var(--green-bright)', fontSize: 11 }}>✓ Done</span>
                        : <span style={{ color: 'var(--red-bright)', fontSize: 11 }}>✗ Needed</span>
                      }
                    </label>
                  );
                })}
              </div>
              {/* Add missing prereqs button */}
              {missingPrereqs.length > 0 && (
                <button
                  type="button"
                  onClick={handleAddMissingPrereqs}
                  disabled={addingPrereqs}
                  style={{
                    marginTop: 8, width: '100%', padding: '7px 10px',
                    background: 'rgba(74,136,184,0.12)', border: '1px solid rgba(74,136,184,0.4)',
                    borderRadius: 'var(--radius)', color: '#6ab0e0', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600,
                  }}
                >
                  {addingPrereqs
                    ? '⏳ Adding…'
                    : `➕ Add ${missingPrereqs.length} uncompleted prerequisite quest goal${missingPrereqs.length !== 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          )}

          {/* QP requirement */}
          {quest.requirements.qp > 0 && (
            <div style={{ color: 'var(--text-dim)' }}>
              Quest points needed: <strong style={{ color: 'var(--gold)' }}>{quest.requirements.qp} QP</strong>
              {owner && (
                <span style={{
                  color: owner.quest_points >= quest.requirements.qp ? 'var(--green-bright)' : 'var(--red-bright)',
                  marginLeft: 8,
                }}>
                  ({owner.quest_points >= quest.requirements.qp
                    ? `✓ ${owner.rsn} has ${owner.quest_points}`
                    : `✗ ${owner.rsn} has ${owner.quest_points}`})
                </span>
              )}
            </div>
          )}

          {/* Skill requirements */}
          {totalReqs > 0 ? (
            <div>
              <div style={{ color: 'var(--text-dim)', fontWeight: 600, marginBottom: 6 }}>
                Skill requirements
                {owner && (
                  <span style={{ marginLeft: 8, fontWeight: 400 }}>
                    — {metCount}/{totalReqs} met by {owner.rsn}
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 4 }}>
                {Object.entries(quest.requirements.skills).map(([skill, needed]) => {
                  const r   = reqStatus?.[skill];
                  const have = r?.have ?? '?';
                  const met  = r?.met  ?? false;
                  const shortfall = needed - (r?.have ?? 0);
                  return (
                    <div key={skill} style={{
                      padding: '5px 8px', borderRadius: 'var(--radius)',
                      background: met ? 'rgba(90,154,80,0.1)' : 'rgba(192,64,64,0.1)',
                      border: `1px solid ${met ? 'var(--green)' : 'var(--red)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {SKILL_ICONS[skill] && <img src={SKILL_ICONS[skill]} alt={skill} style={{ width: 14, height: 14 }} />}
                        {skill}
                      </span>
                      <span style={{ fontWeight: 700, color: met ? 'var(--green-bright)' : 'var(--red-bright)' }}>
                        {met ? `✓ ${have}` : `${have}/${needed}`}
                        {!met && shortfall > 0 && (
                          <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 3 }}>(-{shortfall})</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* Add missing skill goals button */}
              {owner && missingSkills.length > 0 && (
                <button
                  type="button"
                  onClick={handleAddMissingSkillGoals}
                  disabled={addingSkills}
                  style={{
                    marginTop: 8, width: '100%', padding: '7px 10px',
                    background: 'rgba(200,120,48,0.1)', border: '1px solid rgba(200,120,48,0.4)',
                    borderRadius: 'var(--radius)', color: '#e09060', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600,
                  }}
                >
                  {addingSkills
                    ? '⏳ Adding…'
                    : `➕ Add ${missingSkills.length} missing skill goal${missingSkills.length !== 1 ? 's' : ''} for ${owner.rsn}`}
                </button>
              )}
            </div>
          ) : (
            <div style={{ color: 'var(--green-bright)' }}>✓ No direct skill requirements</div>
          )}

          {/* Unlocks */}
          {quest.unlocks?.length > 0 && (
            <div style={{ color: 'var(--text-dim)', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
              <span style={{ fontWeight: 600, marginRight: 4 }}>Unlocks:</span>
              {quest.unlocks.join(' · ')}
            </div>
          )}

          {/* Overall readiness banner */}
          {owner && (
            <div style={{
              padding: '6px 10px', borderRadius: 'var(--radius)',
              background: (allSkillsMet && missingPrereqs.length === 0)
                ? 'rgba(90,154,80,0.15)' : 'rgba(200,120,48,0.1)',
              border: `1px solid ${(allSkillsMet && missingPrereqs.length === 0) ? 'var(--green)' : 'var(--orange)'}`,
              color: (allSkillsMet && missingPrereqs.length === 0) ? 'var(--green-bright)' : 'var(--orange)',
            }}>
              {(allSkillsMet && missingPrereqs.length === 0)
                ? `✓ ${owner.rsn} appears ready for this quest!`
                : [
                    !allSkillsMet && `${totalReqs - metCount} skill${totalReqs - metCount !== 1 ? 's' : ''} needed`,
                    missingPrereqs.length > 0 && `${missingPrereqs.length} prerequisite quest${missingPrereqs.length !== 1 ? 's' : ''} to complete`,
                  ].filter(Boolean).join(' · ')
              }
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

// Normalize RSN — collapses non-breaking spaces and other Unicode variants before comparing
function normRsn(s) {
  return (s || '').replace(/[  �\s]+/g, ' ').trim().toLowerCase();
}

export default function GoalModal({ players, onClose, onSaved, prefill = {}, onToast, myRsn = '' }) {
  // Resolve "me" — prefer explicit prefill, then myRsn match, then first player
  const myPlayerId = useMemo(() => {
    if (!myRsn) return null;
    return players.find(p => normRsn(p.rsn) === normRsn(myRsn))?.id ?? null;
  }, [players, myRsn]);

  const [goalType, setGoalType] = useState(prefill.category === 'quest' ? 'quest' : prefill.category === 'item' ? 'item' : prefill.skill ? 'level' : 'custom');
  const [form, setForm] = useState({
    type: prefill.type || 'personal',
    owner_id: prefill.owner_id ?? myPlayerId ?? players[0]?.id ?? '',
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

    // Auto-determine initial status for quest goals:
    // If the owner doesn't meet skill requirements OR the quest has prerequisite quests,
    // start as 'blocked' so it's clear work is needed first.
    let initialStatus = undefined; // undefined = server default ('not_started')
    if (goalType === 'quest' && form.details?.questName && form.type === 'personal') {
      const quest = QUESTS[form.details.questName];
      const owner = players.find(p => p.id === Number(form.owner_id));
      if (quest && owner) {
        const skillReqs = quest.requirements?.skills ?? {};
        const prereqs   = quest.requirements?.quests ?? [];
        const hasUnmetSkills = Object.entries(skillReqs).some(([skill, needed]) => {
          const have = owner.skills?.find(s => s.skill_name === skill)?.level ?? 1;
          return have < needed;
        });
        if (hasUnmetSkills || prereqs.length > 0) initialStatus = 'blocked';
      }
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
        ...(initialStatus ? { status: initialStatus } : {}),
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

            {/* "Set your name" hint when myRsn is not configured */}
            {!myRsn && (
              <div style={{
                marginBottom: 10, padding: '6px 10px',
                background: 'rgba(200,168,75,0.07)', border: '1px solid rgba(200,168,75,0.25)',
                borderRadius: 'var(--radius)', fontSize: 11, color: 'var(--text-dim)',
              }}>
                💡 Set <strong style={{ color: 'var(--gold)' }}>👤 Who are you?</strong> in the header to auto-select yourself when adding goals.
              </div>
            )}

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
            {goalType === 'quest' && <QuestGoalForm players={players} form={form} set={set} onSaved={onSaved} onToast={onToast} />}
            {goalType === 'item'  && <ItemGoalForm players={players} form={form} set={set} />}

            {goalType === 'custom' && (
              <>
                {form.type === 'personal' && (
                  <div className="form-group">
                    <label className="form-label">Owner</label>
                    <select className="form-select" value={form.owner_id} onChange={e => set('owner_id', e.target.value)}>
                      {players.map(p => <option key={p.id} value={p.id}>{p.rsn}</option>)}
                    </select>
                  </div>
                )}
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
