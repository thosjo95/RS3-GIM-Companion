import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { STYLES, EQUIPMENT_SLOTS, GEAR_SUGGESTIONS } from '../data/gearSuggestions';

// ── Equipment grid slot button ────────────────────────────────────────────────

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
      {/* Slot icon — RS3 wiki image with emoji fallback */}
      <SlotIcon slotDef={slotDef} />

      {/* Item name or slot label */}
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

// ── Item picker panel ─────────────────────────────────────────────────────────

function ItemPicker({ slotDef, currentItem, suggestions, onSelect, onClear, onClose, styleColor }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    setQuery('');
  }, [slotDef?.slot]);

  if (!slotDef) return null;

  const filtered = query.trim()
    ? suggestions.filter(s => s.toLowerCase().includes(query.toLowerCase()))
    : suggestions;

  const exactMatch = suggestions.some(s => s.toLowerCase() === query.toLowerCase());
  const showCustom  = query.trim() && !exactMatch;

  function handleKey(e) {
    if (e.key === 'Enter' && query.trim()) {
      onSelect(query.trim());
    }
    if (e.key === 'Escape') onClose();
  }

  return (
    <div style={{
      flex: 1,
      minWidth: 220,
      maxWidth: 320,
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

      {/* Search / custom input */}
      <input
        ref={inputRef}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKey}
        placeholder={`Search or type custom item…`}
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

      {/* Suggestion list */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 3,
        maxHeight: 260, overflowY: 'auto',
        scrollbarWidth: 'thin',
      }}>
        {/* "Use custom" row when query doesn't match any suggestion */}
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

        {filtered.map(item => (
          <button
            key={item}
            onClick={() => onSelect(item)}
            style={{
              textAlign: 'left', padding: '6px 10px',
              background: item === currentItem ? `${styleColor}22` : 'transparent',
              border: `1px solid ${item === currentItem ? styleColor + '88' : 'transparent'}`,
              borderRadius: 'var(--radius)',
              color: item === currentItem ? styleColor : 'var(--text-bright)',
              fontSize: 12, cursor: 'pointer',
              transition: 'background 0.1s',
              fontWeight: item === currentItem ? 700 : 400,
            }}>
            {item === currentItem && '✓ '}{item}
          </button>
        ))}

        {filtered.length === 0 && !showCustom && (
          <span style={{ fontSize: 12, color: 'var(--text-dim)', padding: '6px 10px' }}>
            No suggestions matched. Press Enter to use your text.
          </span>
        )}
      </div>

      {/* Clear button */}
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

// ── Main GearLoadouts component ───────────────────────────────────────────────

export default function GearLoadouts({ players, groupId, canWrite, onToast }) {
  const [selectedPlayerId, setSelectedPlayerId] = useState(players[0]?.id ?? null);
  const [style, setStyle]       = useState('melee');
  const [loadout, setLoadout]   = useState({}); // slot → itemName
  const [loading, setLoading]   = useState(false);
  const [activeSlot, setActiveSlot] = useState(null); // slot key of open picker
  const [saving, setSaving]     = useState(null); // slot key currently saving

  const activeStyle = STYLES.find(s => s.key === style);

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
      {/* Header row: player selector + style tabs */}
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

        {/* Slot counter */}
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

          {/* ── Item picker (appears when a slot is active) ── */}
          {activeSlot ? (
            <ItemPicker
              slotDef={EQUIPMENT_SLOTS.find(s => s.slot === activeSlot)}
              currentItem={loadout[activeSlot] ?? null}
              suggestions={GEAR_SUGGESTIONS[style]?.[activeSlot] ?? []}
              onSelect={item => handleSelect(activeSlot, item)}
              onClear={() => handleClear(activeSlot)}
              onClose={() => setActiveSlot(null)}
              styleColor={activeStyle.color}
            />
          ) : (
            /* Instruction hint when no slot is selected */
            <div style={{
              flex: 1, minWidth: 180,
              display: 'flex', flexDirection: 'column',
              justifyContent: 'center', alignItems: 'center',
              gap: 8, padding: 24,
              color: 'var(--text-dim)', textAlign: 'center',
              border: '1px dashed var(--border)',
              borderRadius: 'var(--radius-lg)',
              minHeight: 120,
            }}>
              {activeStyle.wikiImg
                ? <img src={`https://runescape.wiki/images/${activeStyle.wikiImg}`} alt={activeStyle.label} width={32} height={32} style={{ imageRendering: 'crisp-edges' }} onError={e => { e.target.style.display='none'; }} />
                : <span style={{ fontSize: 28 }}>{activeStyle.icon}</span>
              }
              <div style={{ fontSize: 13, fontWeight: 600, color: activeStyle.color }}>{activeStyle.label} loadout</div>
              <div style={{ fontSize: 11 }}>
                {canWrite
                  ? 'Click any equipment slot to set an item'
                  : 'Unlock the group to edit gear slots'}
              </div>
            </div>
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
