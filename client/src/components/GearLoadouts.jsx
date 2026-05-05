import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import {
  STYLES, EQUIPMENT_SLOTS, GEAR_SUGGESTIONS,
  canWear, getMissingReqs, getBestAndNext, levelToXp,
} from '../data/gearSuggestions';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a { SkillName: level } map from the player object's skills array/object */
function buildSkillLevels(player) {
  if (!player) return {};
  const skills = player.skills;
  if (!skills) return {};
  // skills may be an array [{name, level}] or an object { SkillName: level }
  if (Array.isArray(skills)) {
    const map = {};
    for (const s of skills) {
      if (s?.name) map[s.name] = s.level ?? 1;
    }
    return map;
  }
  if (typeof skills === 'object') return { ...skills };
  return {};
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

function SlotIcon({ slotDef }) {
  const [imgFailed, setImgFailed] = React.useState(false);
  const src = `https://runescape.wiki/images/${slotDef.wikiImg}`;

  if (imgFailed || !slotDef.wikiImg) {
    return <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{slotDef.icon}</span>;
  }
  return (
    <img
      src={src}
      alt={slotDef.label}
      width={26} height={26}
      onError={() => setImgFailed(true)}
      style={{ flexShrink: 0, imageRendering: 'crisp-edges' }}
    />
  );
}

function SlotButton({ slotDef, item, active, canWrite, onClick, styleColor, styleBg }) {
  const filled = !!item;
  return (
    <button
      onClick={canWrite ? onClick : undefined}
      title={filled ? item : `${slotDef.label} — empty${canWrite ? ' · click to set' : ''}`}
      style={{
        gridColumn: slotDef.gridCol,
        gridRow: slotDef.gridRow,
        width: 82, height: 82,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 3,
        padding: '6px 4px',
        background: active ? styleBg : filled ? 'rgba(255,255,255,0.04)' : 'var(--bg-root)',
        border: `2px solid ${active ? styleColor : filled ? styleColor + '88' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        cursor: canWrite ? 'pointer' : 'default',
        transition: 'all 0.15s',
        textAlign: 'center',
        overflow: 'hidden',
      }}>
      <SlotIcon slotDef={slotDef} />
      <span style={{
        fontSize: 9,
        fontWeight: filled ? 600 : 400,
        color: filled ? 'var(--text-bright)' : 'var(--text-dim)',
        lineHeight: 1.2,
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        wordBreak: 'break-word',
        maxWidth: '100%',
      }}>
        {item || slotDef.label}
      </span>
    </button>
  );
}

// ── Recommendations panel (default right panel when no slot selected) ──────────

function RecommendationsPanel({ styleKey, styleColor, styleBg, activeStyle, skillLevels, loadout, canWrite, onSlotClick, onQuickFill, groupId, onToast }) {
  const slots = EQUIPMENT_SLOTS;

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
          ? <img src={`https://runescape.wiki/images/${activeStyle.wikiImg}`} alt={activeStyle.label} width={18} height={18}
              style={{ imageRendering: 'crisp-edges' }} onError={e => { e.target.style.display = 'none'; }} />
          : <span style={{ fontSize: 16 }}>{activeStyle.icon}</span>
        }
        <span style={{ fontWeight: 700, fontSize: 13, color: styleColor }}>{activeStyle.label} — Best Available</span>
      </div>

      {/* Quick-fill button */}
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

      {/* Per-slot recommendations */}
      {slots.map(slotDef => {
        const { best, next } = getBestAndNext(styleKey, slotDef.slot, skillLevels);
        const equipped = loadout[slotDef.slot] ?? null;
        if (!best && !next) return null; // no suggestions for this slot in this style

        return (
          <SlotRecommendationRow
            key={slotDef.slot}
            slotDef={slotDef}
            best={best}
            next={next}
            equipped={equipped}
            styleColor={styleColor}
            styleBg={styleBg}
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

function SlotRecommendationRow({ slotDef, best, next, equipped, styleColor, styleBg, skillLevels, canWrite, onClick, groupId, onToast }) {
  const [addingGoal, setAddingGoal] = useState(false);

  async function handleAddGoal(item, req) {
    setAddingGoal(true);
    try {
      await api.createGoal({
        group_id: groupId,
        skill: req.skill,
        target_level: req.need,
        target_xp: levelToXp(req.need),
        note: `Wear ${item.name}`,
      });
      onToast?.(`Goal added: ${req.skill} ${req.need}`, 'success');
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setAddingGoal(false);
    }
  }

  return (
    <div
      onClick={canWrite ? onClick : undefined}
      style={{
        display: 'flex', flexDirection: 'column', gap: 4,
        padding: '8px 10px',
        background: 'var(--bg-root)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        cursor: canWrite ? 'pointer' : 'default',
        transition: 'border-color 0.12s',
      }}
      onMouseEnter={e => { if (canWrite) e.currentTarget.style.borderColor = styleColor + '88'; }}
      onMouseLeave={e => { if (canWrite) e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      {/* Slot label row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <SlotIcon slotDef={slotDef} />
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)' }}>{slotDef.label}</span>
        {equipped && (
          <span style={{ marginLeft: 'auto', fontSize: 9, color: styleColor, fontWeight: 600 }}>✓ set</span>
        )}
      </div>

      {/* Best available */}
      {best && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: '#4caf50', fontWeight: 700, minWidth: 14 }}>✅</span>
          <span style={{ fontSize: 11, color: 'var(--text-bright)', flex: 1 }}>{best.name}</span>
        </div>
      )}

      {/* Next upgrade (locked) */}
      {next && (
        <LockedItem item={next} skillLevels={skillLevels} styleColor={styleColor}
          addingGoal={addingGoal} onAddGoal={handleAddGoal} />
      )}
    </div>
  );
}

function LockedItem({ item, skillLevels, styleColor, addingGoal, onAddGoal }) {
  const missing = getMissingReqs(item, skillLevels);
  const isLocked = missing.length > 0 || item.quest;

  if (!isLocked) return null; // item is available, skip

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, opacity: 0.75 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, minWidth: 14 }}>🔒</span>
        <span style={{ fontSize: 11, color: 'var(--text-dim)', flex: 1, fontStyle: 'italic' }}>
          {item.name}
        </span>
      </div>
      {/* Requirement chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: 20 }}>
        {missing.map(({ skill, need, have }) => (
          <div key={skill} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              fontSize: 9, padding: '1px 5px',
              background: 'rgba(255,100,100,0.15)',
              border: '1px solid rgba(255,100,100,0.4)',
              borderRadius: 3, color: '#ff8080',
            }}>
              {skill} {have}/{need}
            </span>
            <button
              onClick={e => { e.stopPropagation(); onAddGoal(item, { skill, need, have }); }}
              disabled={addingGoal}
              title={`Add goal: ${skill} level ${need}`}
              style={{
                fontSize: 9, padding: '1px 5px',
                background: styleColor + '22',
                border: `1px solid ${styleColor}55`,
                borderRadius: 3, color: styleColor,
                cursor: 'pointer', fontWeight: 700,
              }}>
              + Goal
            </button>
          </div>
        ))}
        {item.quest && (
          <span style={{
            fontSize: 9, padding: '1px 5px',
            background: 'rgba(255,200,100,0.15)',
            border: '1px solid rgba(255,200,100,0.4)',
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

function ItemPicker({ slotDef, currentItem, styleKey, skillLevels, onSelect, onClear, onClose, styleColor, groupId, onToast }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    setQuery('');
  }, [slotDef?.slot]);

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
      flex: 1,
      minWidth: 240,
      maxWidth: 340,
      background: 'var(--bg-panel)',
      border: `1px solid ${styleColor}55`,
      borderRadius: 'var(--radius-lg)',
      padding: 14,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: styleColor }}>
          {slotDef.icon} {slotDef.label}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
      </div>

      {/* Search */}
      <input
        ref={inputRef}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Search or type custom item…"
        style={{
          width: '100%', padding: '6px 10px',
          background: 'var(--bg-root)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          color: 'var(--text-bright)',
          fontSize: 12,
          outline: 'none',
        }}
      />

      {/* Item list */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 3,
        maxHeight: 280, overflowY: 'auto', scrollbarWidth: 'thin',
      }}>
        {showCustom && (
          <button
            onClick={() => onSelect(query.trim())}
            style={{
              textAlign: 'left', padding: '6px 10px',
              background: `${styleColor}22`,
              border: `1px solid ${styleColor}55`,
              borderRadius: 'var(--radius)',
              color: 'var(--text-bright)', fontSize: 12, cursor: 'pointer',
              fontStyle: 'italic',
            }}>
            ✏️ Use "{query.trim()}"
          </button>
        )}

        {filtered.map(item => {
          const wearable = canWear(item, skillLevels);
          const missing  = getMissingReqs(item, skillLevels);
          const isCurrent = item.name === currentItem;

          return (
            <ItemPickerRow
              key={item.name}
              item={item}
              wearable={wearable}
              missing={missing}
              isCurrent={isCurrent}
              styleColor={styleColor}
              groupId={groupId}
              onToast={onToast}
              onSelect={() => onSelect(item.name)}
            />
          );
        })}

        {filtered.length === 0 && !showCustom && (
          <span style={{ fontSize: 12, color: 'var(--text-dim)', padding: '6px 10px' }}>
            No suggestions matched. Press Enter to use your text.
          </span>
        )}
      </div>

      {/* Clear */}
      {currentItem && (
        <button
          onClick={onClear}
          style={{
            padding: '5px', fontSize: 11,
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-dim)', cursor: 'pointer',
          }}>
          🗑 Clear slot
        </button>
      )}
    </div>
  );
}

function ItemPickerRow({ item, wearable, missing, isCurrent, styleColor, groupId, onToast, onSelect }) {
  const [addingGoal, setAddingGoal] = useState(false);

  async function handleAddGoal(e, req) {
    e.stopPropagation();
    setAddingGoal(true);
    try {
      await api.createGoal({
        group_id: groupId,
        skill: req.skill,
        target_level: req.need,
        target_xp: levelToXp(req.need),
        note: `Wear ${item.name}`,
      });
      onToast?.(`Goal added: ${req.skill} ${req.need}`, 'success');
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setAddingGoal(false);
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 3,
      padding: '6px 10px',
      background: isCurrent ? `${styleColor}22` : wearable ? 'transparent' : 'rgba(0,0,0,0.2)',
      border: `1px solid ${isCurrent ? styleColor + '88' : 'transparent'}`,
      borderRadius: 'var(--radius)',
      opacity: wearable ? 1 : 0.7,
      cursor: wearable ? 'pointer' : 'default',
      transition: 'background 0.1s',
    }}
    onClick={wearable ? onSelect : undefined}
    >
      {/* Item name row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, minWidth: 14 }}>{wearable ? (isCurrent ? '✓' : '✅') : '🔒'}</span>
        <span style={{
          fontSize: 12, flex: 1,
          color: isCurrent ? styleColor : wearable ? 'var(--text-bright)' : 'var(--text-dim)',
          fontWeight: isCurrent ? 700 : 400,
          fontStyle: wearable ? 'normal' : 'italic',
        }}>
          {item.name}
        </span>
      </div>

      {/* Locked: requirement chips + goal buttons */}
      {!wearable && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: 20 }}>
          {missing.map(({ skill, need, have }) => (
            <div key={skill} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{
                fontSize: 9, padding: '1px 5px',
                background: 'rgba(255,100,100,0.15)',
                border: '1px solid rgba(255,100,100,0.4)',
                borderRadius: 3, color: '#ff8080',
              }}>
                {skill} {have}/{need}
              </span>
              <button
                onClick={e => handleAddGoal(e, { skill, need, have })}
                disabled={addingGoal}
                title={`Add goal: ${skill} level ${need}`}
                style={{
                  fontSize: 9, padding: '1px 5px',
                  background: styleColor + '22',
                  border: `1px solid ${styleColor}55`,
                  borderRadius: 3, color: styleColor,
                  cursor: 'pointer', fontWeight: 700,
                }}>
                + Goal
              </button>
            </div>
          ))}
          {item.quest && (
            <span style={{
              fontSize: 9, padding: '1px 5px',
              background: 'rgba(255,200,100,0.15)',
              border: '1px solid rgba(255,200,100,0.4)',
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
  const [loadout, setLoadout]   = useState({});
  const [loading, setLoading]   = useState(false);
  const [activeSlot, setActiveSlot] = useState(null);
  const [saving, setSaving]     = useState(null);

  const activeStyle  = STYLES.find(s => s.key === style);
  const selectedPlayer = players.find(p => p.id === selectedPlayerId);
  const skillLevels  = buildSkillLevels(selectedPlayer);

  // Load loadout whenever player or style changes
  useEffect(() => {
    if (!selectedPlayerId) return;
    setLoading(true);
    setActiveSlot(null);
    api.getEquipment(selectedPlayerId, style)
      .then(rows => {
        const map = {};
        for (const r of rows) map[r.slot] = r.item_name;
        setLoadout(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedPlayerId, style]);

  async function handleSelect(slot, itemName) {
    setLoadout(prev => ({ ...prev, [slot]: itemName }));
    setActiveSlot(null);
    setSaving(slot);
    try {
      await api.saveEquipmentSlot(selectedPlayerId, style, slot, itemName);
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
      await api.saveEquipmentSlot(selectedPlayerId, style, slot, '');
    } catch (err) {
      onToast?.(err.message, 'error');
    }
  }

  async function handleQuickFill() {
    const updates = {};
    for (const slotDef of EQUIPMENT_SLOTS) {
      const { best } = getBestAndNext(style, slotDef.slot, skillLevels);
      if (best && !loadout[slotDef.slot]) {
        updates[slotDef.slot] = best.name;
      }
    }
    if (Object.keys(updates).length === 0) {
      onToast?.('All slots already filled or no suggestions available.', 'info');
      return;
    }
    setLoadout(prev => ({ ...prev, ...updates }));
    for (const [slot, itemName] of Object.entries(updates)) {
      try {
        await api.saveEquipmentSlot(selectedPlayerId, style, slot, itemName);
      } catch (err) {
        onToast?.(err.message, 'error');
      }
    }
    onToast?.(`Quick-filled ${Object.keys(updates).length} slot(s)`, 'success');
  }

  const filledCount = EQUIPMENT_SLOTS.filter(s => loadout[s.slot]).length;

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
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select
          className="form-select"
          value={selectedPlayerId ?? ''}
          onChange={e => setSelectedPlayerId(Number(e.target.value))}
          style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', width: 'auto', minWidth: 140 }}>
          {players.map(p => (
            <option key={p.id} value={p.id}>{p.rsn}</option>
          ))}
        </select>

        {/* Style tabs */}
        <div className="flex gap-4 tab-bar-scroll" style={{ background: 'var(--bg-root)', borderRadius: 'var(--radius)', padding: 3 }}>
          {STYLES.map(s => (
            <StyleTab key={s.key} styleDef={s} active={style === s.key} onClick={() => { setStyle(s.key); setActiveSlot(null); }} />
          ))}
        </div>

        <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 'auto' }}>
          {filledCount} / {EQUIPMENT_SLOTS.length} slots filled
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
      ) : (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>

          {/* ── Equipment grid ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 82px)',
            gridTemplateRows: 'repeat(5, 82px)',
            gap: 4,
            flexShrink: 0,
          }}>
            {EQUIPMENT_SLOTS.map(slotDef => (
              <SlotButton
                key={slotDef.slot}
                slotDef={slotDef}
                item={saving === slotDef.slot ? '…' : loadout[slotDef.slot] ?? ''}
                active={activeSlot === slotDef.slot}
                canWrite={canWrite}
                onClick={() => setActiveSlot(activeSlot === slotDef.slot ? null : slotDef.slot)}
                styleColor={activeStyle.color}
                styleBg={activeStyle.bg}
              />
            ))}
          </div>

          {/* ── Right panel: item picker or recommendations ── */}
          {activeSlot ? (
            <ItemPicker
              slotDef={EQUIPMENT_SLOTS.find(s => s.slot === activeSlot)}
              currentItem={loadout[activeSlot] ?? null}
              styleKey={style}
              skillLevels={skillLevels}
              onSelect={item => handleSelect(activeSlot, item)}
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
