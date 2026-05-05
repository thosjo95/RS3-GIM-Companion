import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import {
  STYLES, EQUIPMENT_SLOTS, GEAR_SUGGESTIONS,
  canWear, getMissingReqs, getBestAndNext, levelToXp,
} from '../data/gearSuggestions';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build { SkillName: level } from player.skills (array or object). */
function buildSkillLevels(player) {
  if (!player?.skills) return {};
  const skills = player.skills;
  if (Array.isArray(skills)) {
    const map = {};
    for (const s of skills) { if (s?.name) map[s.name] = s.level ?? 1; }
    return map;
  }
  return typeof skills === 'object' ? { ...skills } : {};
}

// Slot entry shape: { name: string, confirmed: boolean }
// confirmed = player has verified they own/wear the item
// !confirmed = planning / goal

// ── Confirmation dialog ────────────────────────────────────────────────────────

function ConfirmItemDialog({ rsn, itemName, slotLabel, styleColor, onOwned, onPlanning, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
    onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={{
        background: 'var(--bg-panel)',
        border: `1px solid ${styleColor}66`,
        borderRadius: 'var(--radius-lg)',
        padding: '28px 28px 22px',
        maxWidth: 360, width: '90%',
        display: 'flex', flexDirection: 'column', gap: 16,
        boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-bright)', marginBottom: 6 }}>
            Set {slotLabel} slot
          </div>
          <div style={{ fontSize: 13, color: styleColor, fontWeight: 600, marginBottom: 10 }}>
            {itemName}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            Does <strong style={{ color: 'var(--text-bright)' }}>{rsn}</strong> actually own / wear this item?
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={onOwned}
            style={{
              padding: '10px 14px', fontSize: 13, fontWeight: 700,
              background: 'rgba(76,175,80,0.18)',
              border: '1px solid #4caf5088',
              borderRadius: 'var(--radius)', color: '#4caf50', cursor: 'pointer',
              textAlign: 'left',
            }}>
            ✅ Yes — I own this item
          </button>
          <button
            onClick={onPlanning}
            style={{
              padding: '10px 14px', fontSize: 13, fontWeight: 700,
              background: `${styleColor}18`,
              border: `1px solid ${styleColor}66`,
              borderRadius: 'var(--radius)', color: styleColor, cursor: 'pointer',
              textAlign: 'left',
            }}>
            📋 Not yet — I'm working toward this (Goal)
          </button>
          <button
            onClick={onCancel}
            style={{
              padding: '8px', fontSize: 12,
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', color: 'var(--text-dim)', cursor: 'pointer',
            }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Style tab button with RS3 skill icon ──────────────────────────────────────

function StyleTab({ styleDef, active, onClick }) {
  const [imgFailed, setImgFailed] = React.useState(false);
  const src = styleDef.wikiImg ? `https://runescape.wiki/images/${styleDef.wikiImg}` : null;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '4px 10px', fontSize: 11, borderRadius: 'var(--radius)', border: 'none', cursor: 'pointer',
        background: active ? styleDef.color : 'transparent',
        color: active ? '#111' : 'var(--text-dim)',
        fontWeight: active ? 700 : 400,
        transition: 'all 0.15s',
      }}>
      {src && !imgFailed
        ? <img src={src} alt={styleDef.label} width={14} height={14} onError={() => setImgFailed(true)} style={{ flexShrink: 0 }} />
        : <span style={{ fontSize: 12 }}>{styleDef.icon}</span>
      }
      {styleDef.label}
    </button>
  );
}

// ── Slot icon with RS3 wiki image + emoji fallback ────────────────────────────

function SlotIcon({ slotDef, size = 26 }) {
  const [imgFailed, setImgFailed] = React.useState(false);
  const src = `https://runescape.wiki/images/${slotDef.wikiImg}`;

  if (imgFailed || !slotDef.wikiImg) {
    return <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{slotDef.icon}</span>;
  }
  return (
    <img src={src} alt={slotDef.label} width={size} height={size}
      onError={() => setImgFailed(true)}
      style={{ flexShrink: 0, imageRendering: 'crisp-edges' }} />
  );
}

// slot entry: { name: string, confirmed: boolean } or ''
function SlotButton({ slotDef, entry, active, canWrite, onClick, styleColor }) {
  const name      = entry?.name ?? '';
  const confirmed = !!entry?.confirmed;
  const filled    = !!name;

  // Green border + tint = confirmed/owned; gold = planning; style-color = active (picker open)
  const borderColor = active ? styleColor
    : confirmed ? '#4caf50'
    : filled    ? '#f7c97e'
    : 'var(--border)';
  const bgColor = active ? (confirmed ? 'rgba(76,175,80,0.15)' : 'rgba(247,201,126,0.10)')
    : confirmed ? 'rgba(76,175,80,0.08)'
    : filled    ? 'rgba(247,201,126,0.06)'
    : 'var(--bg-root)';

  return (
    <button
      onClick={canWrite ? onClick : undefined}
      title={filled
        ? `${name}${confirmed ? ' ✅ Owned' : ' 📋 Planning'}`
        : `${slotDef.label} — empty${canWrite ? ' · click to set' : ''}`}
      style={{
        gridColumn: slotDef.gridCol,
        gridRow: slotDef.gridRow,
        width: 82, height: 82,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 3, padding: '6px 4px',
        background: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: 'var(--radius)',
        cursor: canWrite ? 'pointer' : 'default',
        transition: 'all 0.15s',
        textAlign: 'center', overflow: 'hidden',
        position: 'relative',
      }}>
      <SlotIcon slotDef={slotDef} />

      <span style={{
        fontSize: 9, fontWeight: filled ? 600 : 400,
        color: filled ? (confirmed ? '#4caf50' : '#f7c97e') : 'var(--text-dim)',
        lineHeight: 1.2, overflow: 'hidden',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        wordBreak: 'break-word', maxWidth: '100%',
      }}>
        {name || slotDef.label}
      </span>

      {/* tiny status dot */}
      {filled && (
        <span style={{
          position: 'absolute', top: 3, right: 4,
          fontSize: 8, lineHeight: 1,
        }}>{confirmed ? '✅' : '📋'}</span>
      )}
    </button>
  );
}

// ── Recommendations panel (no slot selected) ──────────────────────────────────

function RecommendationsPanel({ styleKey, styleColor, styleBg, activeStyle, skillLevels, loadout, canWrite, onSlotClick, onQuickFill, groupId, onToast }) {
  return (
    <div style={{
      flex: 1, minWidth: 240, maxWidth: 360,
      background: 'var(--bg-panel)',
      border: `1px solid ${styleColor}44`,
      borderRadius: 'var(--radius-lg)',
      padding: 14,
      display: 'flex', flexDirection: 'column', gap: 10,
      maxHeight: 440, overflowY: 'auto', scrollbarWidth: 'thin',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        {activeStyle.wikiImg
          ? <img src={`https://runescape.wiki/images/${activeStyle.wikiImg}`} alt={activeStyle.label}
              width={18} height={18} style={{ imageRendering: 'crisp-edges' }}
              onError={e => { e.target.style.display = 'none'; }} />
          : <span style={{ fontSize: 16 }}>{activeStyle.icon}</span>
        }
        <span style={{ fontWeight: 700, fontSize: 13, color: styleColor }}>
          {activeStyle.label} — Best Available
        </span>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--text-dim)' }}>
        <span>✅ Can equip</span>
        <span>🔒 Locked</span>
        <span style={{ color: '#4caf50' }}>■ Owned</span>
        <span style={{ color: '#f7c97e' }}>■ Planning</span>
      </div>

      {/* Quick-fill */}
      {canWrite && (
        <button
          onClick={onQuickFill}
          style={{
            padding: '6px 10px', fontSize: 11, fontWeight: 700,
            background: styleBg, border: `1px solid ${styleColor}88`,
            borderRadius: 'var(--radius)', color: styleColor, cursor: 'pointer',
          }}>
          ⚡ Quick-fill all available slots
        </button>
      )}

      {EQUIPMENT_SLOTS.map(slotDef => {
        const { best, next } = getBestAndNext(styleKey, slotDef.slot, skillLevels);
        const entry = loadout[slotDef.slot];
        if (!best && !next) return null;

        return (
          <SlotRecommendationRow
            key={slotDef.slot}
            slotDef={slotDef}
            best={best}
            next={next}
            entry={entry}
            styleColor={styleColor}
            skillLevels={skillLevels}
            canWrite={canWrite}
            onClick={() => onSlotClick(slotDef.slot)}
            groupId={groupId}
            onToast={onToast}
          />
        );
      })}
    </div>
  );
}

function SlotRecommendationRow({ slotDef, best, next, entry, styleColor, skillLevels, canWrite, onClick, groupId, onToast }) {
  const [addingGoal, setAddingGoal] = useState(false);
  const equippedName = entry?.name ?? null;
  const confirmed    = !!entry?.confirmed;

  async function handleAddGoal(item, req) {
    setAddingGoal(true);
    try {
      await api.createGoal({
        group_id: groupId, skill: req.skill,
        target_level: req.need, target_xp: levelToXp(req.need),
        note: `Wear ${item.name}`,
      });
      onToast?.(`Goal added: ${req.skill} ${req.need}`, 'success');
    } catch (err) { onToast?.(err.message, 'error'); }
    finally { setAddingGoal(false); }
  }

  return (
    <div
      onClick={canWrite ? onClick : undefined}
      style={{
        display: 'flex', flexDirection: 'column', gap: 4,
        padding: '8px 10px',
        background: 'var(--bg-root)',
        border: `1px solid ${equippedName ? (confirmed ? '#4caf5055' : '#f7c97e55') : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        cursor: canWrite ? 'pointer' : 'default',
        transition: 'border-color 0.12s',
      }}
      onMouseEnter={e => { if (canWrite) e.currentTarget.style.borderColor = styleColor + '88'; }}
      onMouseLeave={e => { if (canWrite) e.currentTarget.style.borderColor = equippedName ? (confirmed ? '#4caf5055' : '#f7c97e55') : 'var(--border)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <SlotIcon slotDef={slotDef} size={18} />
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)' }}>{slotDef.label}</span>
        {equippedName && (
          <span style={{ marginLeft: 'auto', fontSize: 9, color: confirmed ? '#4caf50' : '#f7c97e', fontWeight: 600 }}>
            {confirmed ? '✅ set' : '📋 goal'}
          </span>
        )}
      </div>

      {best && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: '#4caf50', fontWeight: 700, minWidth: 14 }}>✅</span>
          <span style={{ fontSize: 11, color: 'var(--text-bright)', flex: 1 }}>{best.name}</span>
        </div>
      )}

      {next && getMissingReqs(next, skillLevels).length > 0 && (
        <LockedItemRow item={next} skillLevels={skillLevels} styleColor={styleColor}
          addingGoal={addingGoal} onAddGoal={handleAddGoal} />
      )}
    </div>
  );
}

function LockedItemRow({ item, skillLevels, styleColor, addingGoal, onAddGoal }) {
  const missing = getMissingReqs(item, skillLevels);
  if (!missing.length) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, opacity: 0.8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, minWidth: 14 }}>🔒</span>
        <span style={{ fontSize: 11, color: 'var(--text-dim)', flex: 1, fontStyle: 'italic' }}>{item.name}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: 20 }}>
        {missing.map(({ skill, need, have, forQuest }) => (
          <div key={skill} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              fontSize: 9, padding: '1px 5px',
              background: 'rgba(255,100,100,0.15)', border: '1px solid rgba(255,100,100,0.4)',
              borderRadius: 3, color: '#ff8080',
            }}>
              {forQuest ? `(${forQuest}) ` : ''}{skill} {have}/{need}
            </span>
            <button
              onClick={e => { e.stopPropagation(); onAddGoal(item, { skill, need, have }); }}
              disabled={addingGoal}
              style={{
                fontSize: 9, padding: '1px 5px',
                background: styleColor + '22', border: `1px solid ${styleColor}55`,
                borderRadius: 3, color: styleColor, cursor: 'pointer', fontWeight: 700,
              }}>
              + Goal
            </button>
          </div>
        ))}
        {item.quest && missing.length === 0 && (
          <span style={{
            fontSize: 9, padding: '1px 5px',
            background: 'rgba(255,200,100,0.15)', border: '1px solid rgba(255,200,100,0.4)',
            borderRadius: 3, color: '#ffcc66',
          }}>
            Quest: {item.quest}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Item picker panel ─────────────────────────────────────────────────────────

function ItemPicker({ slotDef, currentEntry, styleKey, skillLevels, onSelect, onClear, onClose, styleColor, groupId, onToast }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); setQuery(''); }, [slotDef?.slot]);

  if (!slotDef) return null;

  const allItems = GEAR_SUGGESTIONS[styleKey]?.[slotDef.slot] ?? [];
  const filtered = query.trim()
    ? allItems.filter(it => it.name.toLowerCase().includes(query.toLowerCase()))
    : allItems;
  const exactMatch = allItems.some(it => it.name.toLowerCase() === query.toLowerCase());
  const showCustom = query.trim() && !exactMatch;

  function handleKey(e) {
    if (e.key === 'Enter' && query.trim()) onSelect(query.trim());
    if (e.key === 'Escape') onClose();
  }

  return (
    <div style={{
      flex: 1, minWidth: 240, maxWidth: 340,
      background: 'var(--bg-panel)',
      border: `1px solid ${styleColor}55`,
      borderRadius: 'var(--radius-lg)',
      padding: 14,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: styleColor }}>
          {slotDef.icon} {slotDef.label}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
      </div>

      <input
        ref={inputRef}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Search or type custom item…"
        style={{
          width: '100%', padding: '6px 10px',
          background: 'var(--bg-root)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', color: 'var(--text-bright)',
          fontSize: 12, outline: 'none',
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 280, overflowY: 'auto', scrollbarWidth: 'thin' }}>
        {showCustom && (
          <button
            onClick={() => onSelect(query.trim())}
            style={{
              textAlign: 'left', padding: '6px 10px',
              background: `${styleColor}22`, border: `1px solid ${styleColor}55`,
              borderRadius: 'var(--radius)', color: 'var(--text-bright)', fontSize: 12, cursor: 'pointer', fontStyle: 'italic',
            }}>
            ✏️ Use "{query.trim()}"
          </button>
        )}

        {filtered.map(item => (
          <ItemPickerRow
            key={item.name}
            item={item}
            isCurrent={item.name === currentEntry?.name}
            currentConfirmed={currentEntry?.confirmed}
            skillLevels={skillLevels}
            styleColor={styleColor}
            groupId={groupId}
            onToast={onToast}
            onSelect={() => onSelect(item.name)}
          />
        ))}

        {filtered.length === 0 && !showCustom && (
          <span style={{ fontSize: 12, color: 'var(--text-dim)', padding: '6px 10px' }}>
            No suggestions matched. Press Enter to use your text.
          </span>
        )}
      </div>

      {currentEntry?.name && (
        <button onClick={onClear} style={{ padding: '5px', fontSize: 11, background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-dim)', cursor: 'pointer' }}>
          🗑 Clear slot
        </button>
      )}
    </div>
  );
}

function ItemPickerRow({ item, isCurrent, currentConfirmed, skillLevels, styleColor, groupId, onToast, onSelect }) {
  const [addingGoal, setAddingGoal] = useState(false);
  const wearable = canWear(item, skillLevels);
  const missing  = getMissingReqs(item, skillLevels);

  async function handleAddGoal(e, req) {
    e.stopPropagation();
    setAddingGoal(true);
    try {
      await api.createGoal({ group_id: groupId, skill: req.skill, target_level: req.need, target_xp: levelToXp(req.need), note: `Wear ${item.name}` });
      onToast?.(`Goal added: ${req.skill} ${req.need}`, 'success');
    } catch (err) { onToast?.(err.message, 'error'); }
    finally { setAddingGoal(false); }
  }

  return (
    <div
      onClick={wearable ? onSelect : undefined}
      style={{
        display: 'flex', flexDirection: 'column', gap: 3,
        padding: '6px 10px',
        background: isCurrent ? `${styleColor}22` : wearable ? 'transparent' : 'rgba(0,0,0,0.15)',
        border: `1px solid ${isCurrent ? styleColor + '88' : 'transparent'}`,
        borderRadius: 'var(--radius)',
        opacity: wearable ? 1 : 0.7,
        cursor: wearable ? 'pointer' : 'default',
        transition: 'background 0.1s',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, minWidth: 16 }}>
          {wearable ? (isCurrent ? (currentConfirmed ? '✅' : '📋') : '✅') : '🔒'}
        </span>
        <span style={{
          fontSize: 12, flex: 1,
          color: isCurrent ? styleColor : wearable ? 'var(--text-bright)' : 'var(--text-dim)',
          fontWeight: isCurrent ? 700 : 400,
          fontStyle: wearable ? 'normal' : 'italic',
        }}>
          {item.name}
        </span>
      </div>

      {!wearable && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: 20 }}>
          {missing.map(({ skill, need, have, forQuest }) => (
            <div key={skill} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{
                fontSize: 9, padding: '1px 5px',
                background: 'rgba(255,100,100,0.15)', border: '1px solid rgba(255,100,100,0.4)',
                borderRadius: 3, color: '#ff8080',
              }}>
                {forQuest ? `(${forQuest}) ` : ''}{skill} {have}/{need}
              </span>
              <button
                onClick={e => handleAddGoal(e, { skill, need, have })}
                disabled={addingGoal}
                style={{
                  fontSize: 9, padding: '1px 5px',
                  background: styleColor + '22', border: `1px solid ${styleColor}55`,
                  borderRadius: 3, color: styleColor, cursor: 'pointer', fontWeight: 700,
                }}>
                + Goal
              </button>
            </div>
          ))}
          {item.quest && !missing.some(m => !m.forQuest) && (
            <span style={{
              fontSize: 9, padding: '1px 5px',
              background: 'rgba(255,200,100,0.15)', border: '1px solid rgba(255,200,100,0.4)',
              borderRadius: 3, color: '#ffcc66',
            }}>
              Quest: {item.quest}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main GearLoadouts component ───────────────────────────────────────────────

export default function GearLoadouts({ players, groupId, canWrite, onToast }) {
  const [selectedPlayerId, setSelectedPlayerId] = useState(players[0]?.id ?? null);
  const [style, setStyle]       = useState('melee');
  // loadout: { [slot]: { name: string, confirmed: boolean } }
  const [loadout, setLoadout]   = useState({});
  const [loading, setLoading]   = useState(false);
  const [activeSlot, setActiveSlot] = useState(null);
  const [saving, setSaving]     = useState(null);
  // Pending confirmation: { slot, itemName } | null
  const [pendingConfirm, setPendingConfirm] = useState(null);

  const activeStyle    = STYLES.find(s => s.key === style);
  const selectedPlayer = players.find(p => p.id === selectedPlayerId);
  const skillLevels    = buildSkillLevels(selectedPlayer);

  // Load loadout whenever player or style changes
  useEffect(() => {
    if (!selectedPlayerId) return;
    setLoading(true);
    setActiveSlot(null);
    api.getEquipment(selectedPlayerId, style)
      .then(rows => {
        const map = {};
        for (const r of rows) map[r.slot] = { name: r.item_name, confirmed: !!r.confirmed };
        setLoadout(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedPlayerId, style]);

  /** Called when user picks an item from the picker → show confirmation dialog */
  function handlePickItem(slot, itemName) {
    setActiveSlot(null);
    setPendingConfirm({ slot, itemName });
  }

  /** Called after user answers the confirmation dialog */
  async function handleConfirmedSelect(slot, itemName, confirmed) {
    setPendingConfirm(null);
    setLoadout(prev => ({ ...prev, [slot]: { name: itemName, confirmed } }));
    setSaving(slot);
    try {
      await api.saveEquipmentSlot(selectedPlayerId, style, slot, itemName, confirmed);
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setSaving(null);
    }
  }

  async function handleClear(slot) {
    setLoadout(prev => { const n = { ...prev }; delete n[slot]; return n; });
    setActiveSlot(null);
    try {
      await api.saveEquipmentSlot(selectedPlayerId, style, slot, '', false);
    } catch (err) {
      onToast?.(err.message, 'error');
    }
  }

  async function handleQuickFill() {
    const updates = {};
    for (const slotDef of EQUIPMENT_SLOTS) {
      const { best } = getBestAndNext(style, slotDef.slot, skillLevels);
      if (best && !loadout[slotDef.slot]) updates[slotDef.slot] = best.name;
    }
    if (!Object.keys(updates).length) {
      onToast?.('All slots already filled or no suggestions available.', 'info');
      return;
    }
    const newEntries = Object.fromEntries(Object.entries(updates).map(([s, n]) => [s, { name: n, confirmed: false }]));
    setLoadout(prev => ({ ...prev, ...newEntries }));
    for (const [slot, itemName] of Object.entries(updates)) {
      try { await api.saveEquipmentSlot(selectedPlayerId, style, slot, itemName, false); }
      catch (err) { onToast?.(err.message, 'error'); }
    }
    onToast?.(`Quick-filled ${Object.keys(updates).length} slot(s) as Planning`, 'success');
  }

  const filledCount    = EQUIPMENT_SLOTS.filter(s => loadout[s.slot]).length;
  const confirmedCount = EQUIPMENT_SLOTS.filter(s => loadout[s.slot]?.confirmed).length;

  if (players.length === 0) {
    return (
      <div className="empty-state" style={{ marginTop: 32 }}>
        <div className="icon">⚔️</div>
        <p>Add players to track gear loadouts.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Confirmation modal */}
      {pendingConfirm && (
        <ConfirmItemDialog
          rsn={selectedPlayer?.rsn ?? ''}
          itemName={pendingConfirm.itemName}
          slotLabel={EQUIPMENT_SLOTS.find(s => s.slot === pendingConfirm.slot)?.label ?? pendingConfirm.slot}
          styleColor={activeStyle.color}
          onOwned={()    => handleConfirmedSelect(pendingConfirm.slot, pendingConfirm.itemName, true)}
          onPlanning={()  => handleConfirmedSelect(pendingConfirm.slot, pendingConfirm.itemName, false)}
          onCancel={()   => setPendingConfirm(null)}
        />
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select
          className="form-select"
          value={selectedPlayerId ?? ''}
          onChange={e => { setSelectedPlayerId(Number(e.target.value)); setActiveSlot(null); }}
          style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', width: 'auto', minWidth: 140 }}>
          {players.map(p => <option key={p.id} value={p.id}>{p.rsn}</option>)}
        </select>

        <div className="flex gap-4 tab-bar-scroll" style={{ background: 'var(--bg-root)', borderRadius: 'var(--radius)', padding: 3 }}>
          {STYLES.map(s => (
            <StyleTab key={s.key} styleDef={s} active={style === s.key}
              onClick={() => { setStyle(s.key); setActiveSlot(null); }} />
          ))}
        </div>

        <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 'auto' }}>
          <span style={{ color: '#4caf50', fontWeight: 600 }}>{confirmedCount} owned</span>
          {' · '}
          <span style={{ color: '#f7c97e' }}>{filledCount - confirmedCount} planning</span>
          {' · '}
          {EQUIPMENT_SLOTS.length - filledCount} empty
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
      ) : (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>

          {/* Equipment grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 82px)',
            gridTemplateRows: 'repeat(5, 82px)',
            gap: 4, flexShrink: 0,
          }}>
            {EQUIPMENT_SLOTS.map(slotDef => {
              const entry = saving === slotDef.slot ? { name: '…', confirmed: false } : (loadout[slotDef.slot] ?? null);
              return (
                <SlotButton
                  key={slotDef.slot}
                  slotDef={slotDef}
                  entry={entry}
                  active={activeSlot === slotDef.slot}
                  canWrite={canWrite}
                  onClick={() => setActiveSlot(activeSlot === slotDef.slot ? null : slotDef.slot)}
                  styleColor={activeStyle.color}
                />
              );
            })}
          </div>

          {/* Right panel: item picker or recommendations */}
          {activeSlot ? (
            <ItemPicker
              slotDef={EQUIPMENT_SLOTS.find(s => s.slot === activeSlot)}
              currentEntry={loadout[activeSlot] ?? null}
              styleKey={style}
              skillLevels={skillLevels}
              onSelect={item => handlePickItem(activeSlot, item)}
              onClear={() => handleClear(activeSlot)}
              onClose={() => setActiveSlot(null)}
              styleColor={activeStyle.color}
              groupId={groupId}
              onToast={onToast}
            />
          ) : (
            <RecommendationsPanel
              styleKey={style}
              styleColor={activeStyle.color}
              styleBg={activeStyle.bg}
              activeStyle={activeStyle}
              skillLevels={skillLevels}
              loadout={loadout}
              canWrite={canWrite}
              onSlotClick={slot => setActiveSlot(slot)}
              onQuickFill={handleQuickFill}
              groupId={groupId}
              onToast={onToast}
            />
          )}
        </div>
      )}

      {!canWrite && (
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-dim)' }}>
          🔒 Unlock the group to set gear — slots are visible to all members
        </div>
      )}
    </div>
  );
}
