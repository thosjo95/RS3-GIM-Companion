import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { api } from '../api/client';
import GearLoadouts from './GearLoadouts';
import GroupNotesOverlay from './GroupNotesOverlay';

// ── Item icon map — name → wiki icon URL ──────────────────────────────────────
function useItemIconMap() {
  const [iconMap, setIconMap] = useState(new Map());
  useEffect(() => {
    api.getRs3Items().then(items => {
      const m = new Map();
      for (const it of items) if (it.icon_url) m.set(it.name, it.icon_url);
      setIconMap(m);
    }).catch(() => {});
  }, []);
  return iconMap;
}

function ItemIcon({ name, iconMap, size = 32 }) {
  const [failed, setFailed] = useState(false);
  const src = iconMap?.get(name);
  if (!src || failed) return null;
  return (
    <img src={src} alt={name} width={size} height={size}
      onError={() => setFailed(true)}
      style={{ imageRendering: 'crisp-edges', flexShrink: 0, display: 'block' }} />
  );
}

// Collapse ALL unicode whitespace variants (NBSP U+00A0, thin-space, etc.) to a plain space
function normRsn(s) {
  return (s || '').replace(/\s/g, ' ').trim().toLowerCase();
}

function fmtGp(n) {
  if (!n) return null;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B gp`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M gp`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K gp`;
  return `${n} gp`;
}

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}


// ── Vault item tile (compact, click to expand) ────────────────────────────────

function ItemTile({ item, groupEquipment, iconMap }) {
  const [expanded, setExpanded] = useState(false);

  const isDupe   = item.players.length > 1;
  const totalQty = item.drops.reduce((a, d) => a + (d.quantity || 1), 0);

  // All confirmed wearers for this item (de-duped by rsn)
  const wornBy = useMemo(() => {
    if (!groupEquipment?.length) return [];
    const nameLower = item.name.toLowerCase();
    const matches = groupEquipment.filter(e => e.confirmed && e.item_name.toLowerCase() === nameLower);
    const seen = new Set();
    return matches.filter(e => { if (seen.has(e.rsn)) return false; seen.add(e.rsn); return true; });
  }, [groupEquipment, item.name]);

  const isWorn = wornBy.length > 0;

  // Border colour: worn = green, dupe = gold, default = grey
  const borderColor = isWorn ? '#4caf5055' : isDupe ? 'var(--gold-dark)' : 'var(--border)';

  return (
    <>
      {/* Tile */}
      <div
        onClick={() => setExpanded(e => !e)}
        title={item.name}
        style={{
          width: 80, flexShrink: 0,
          background: expanded ? 'var(--bg-panel-alt)' : 'var(--bg-panel)',
          border: `1px solid ${borderColor}`,
          borderRadius: 'var(--radius)',
          padding: '7px 5px 6px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 4,
          cursor: 'pointer',
          userSelect: 'none',
          position: 'relative',
          transition: 'background 0.1s, border-color 0.1s',
        }}>

        {/* Dupe count badge — top-left corner */}
        {isDupe && (
          <div style={{
            position: 'absolute', top: -5, left: -5,
            background: 'var(--gold-dark)', color: 'var(--bg-root)',
            fontSize: 9, fontWeight: 800,
            width: 18, height: 18, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid var(--bg-panel)',
            zIndex: 1,
          }}>×{item.players.length}</div>
        )}

        {/* WORN dot — top-right */}
        {isWorn && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            width: 10, height: 10, borderRadius: '50%',
            background: '#4caf50',
            border: '1.5px solid var(--bg-panel)',
            zIndex: 1,
          }} title="Currently worn" />
        )}

        {/* Icon */}
        <div style={{
          width: 38, height: 38,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-root)', borderRadius: 'var(--radius)',
          border: `1px solid ${isWorn ? '#4caf5033' : 'var(--border)'}`,
        }}>
          {iconMap?.get(item.name)
            ? <ItemIcon name={item.name} iconMap={iconMap} size={30} />
            : <span style={{ fontSize: 20 }}>💎</span>
          }
        </div>

        {/* Item name */}
        <span style={{
          fontSize: 9, fontWeight: 600, color: 'var(--text-bright)',
          textAlign: 'center', lineHeight: 1.25,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          wordBreak: 'break-word', maxWidth: '100%',
        }}>
          {item.name}
          {totalQty > 1 && <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}> ×{totalQty}</span>}
        </span>

        {/* Owner(s) or Free */}
        {isWorn ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, width: '100%' }}>
            {wornBy.map((e, i) => (
              <span key={i} style={{
                fontSize: 8, color: '#4caf50', fontWeight: 700,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
              }}>{e.rsn}</span>
            ))}
          </div>
        ) : item.players.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, width: '100%' }}>
            {item.players.map((rsn, i) => (
              <span key={i} style={{
                fontSize: 8, color: 'var(--gold)', fontWeight: 600,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', textAlign: 'center',
              }}>{rsn}</span>
            ))}
            <span style={{ fontSize: 7.5, color: 'var(--text-dim)', fontStyle: 'italic', marginTop: 1 }}>Free</span>
          </div>
        ) : null}
      </div>

      {/* Expand panel — full-width row break inside the flex-wrap grid */}
      {expanded && (
        <div style={{ flexBasis: '100%', width: '100%' }}>
          <ExpandedTileDetail item={item} wornBy={wornBy} isWorn={isWorn} isDupe={isDupe} onClose={() => setExpanded(false)} />
        </div>
      )}
    </>
  );
}

// Full-width detail panel that appears below the tile row when expanded
function ExpandedTileDetail({ item, wornBy, isWorn, isDupe, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        width: '100%',
        background: 'var(--bg-panel-alt)',
        border: `1px solid ${isWorn ? '#4caf5055' : isDupe ? 'var(--gold-dark)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        padding: '10px 12px',
        display: 'flex', flexDirection: 'column', gap: 6,
        cursor: 'pointer',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-bright)' }}>{item.name}</span>
        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>click to close ▲</span>
      </div>

      {/* Per-drop rows */}
      {item.drops.map((drop, i) => (
        <div key={i} style={{
          display: 'flex', flexWrap: 'wrap', gap: '3px 10px',
          padding: '5px 8px', background: 'var(--bg-panel)',
          borderRadius: 'var(--radius)', fontSize: 11,
        }}>
          <span style={{ color: 'var(--gold)', fontWeight: 600 }}>👤 {drop.rsn}</span>
          {drop.dropped_at && (
            <span style={{ color: 'var(--text-dim)' }}>
              Acquired {new Date(drop.dropped_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          )}
          {drop.boss_name && <span style={{ color: 'var(--text-dim)' }}>· {drop.boss_name}</span>}
          {drop.quantity > 1 && <span style={{ color: 'var(--text-dim)' }}>· ×{drop.quantity}</span>}
          {drop.value_gp > 0 && <span style={{ color: 'var(--green-bright)', fontWeight: 600 }}>{fmtGp(drop.value_gp)}</span>}
          {drop.notes && drop.notes !== 'Auto-added from goal completion' && (
            <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>"{drop.notes}"</span>
          )}
        </div>
      ))}

      {/* Dupe callout */}
      {isDupe && (
        <div style={{
          padding: '4px 8px', background: 'rgba(200,168,75,0.08)',
          border: '1px solid var(--gold-dark)', borderRadius: 'var(--radius)', fontSize: 11,
          color: 'var(--gold)',
        }}>
          ⚠️ {item.players.length} members have this item — potential duplicate
        </div>
      )}

      {/* Worn slots */}
      {isWorn ? wornBy.map(e => (
        <div key={e.rsn + e.slot} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 8px', background: 'rgba(76,175,80,0.07)',
          border: '1px solid #4caf5033', borderRadius: 'var(--radius)', fontSize: 11,
        }}>
          <span style={{ color: '#4caf50', fontWeight: 700 }}>⚔️ Worn by {e.rsn}</span>
          <span style={{ color: 'var(--text-dim)' }}>· {e.slot} slot</span>
          {e.updated_at && <span style={{ color: 'var(--text-dim)' }}>· since {fmtDate(e.updated_at)}</span>}
        </div>
      )) : (
        <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '3px 4px' }}>
          🔓 Not currently worn by anyone — free to claim
        </div>
      )}
    </div>
  );
}


// ── Vaulted goal card ─────────────────────────────────────────────────────────

function AchievementCard({ goal }) {
  const details = goal.details_json
    ? (typeof goal.details_json === 'string'
        ? (() => { try { return JSON.parse(goal.details_json); } catch { return null; } })()
        : goal.details_json)
    : null;
  const typeIcon = details?.goalType === 'quest' ? '📜'
    : details?.goalType === 'level' ? '⭐'
    : details?.goalType === 'item'  ? '📦' : '🎯';
  const completedAt = goal.completed_at
    ? new Date(goal.completed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  return (
    <div style={{
      background: 'var(--bg-panel)', border: '1px solid var(--gold-dark)',
      borderRadius: 'var(--radius-lg)', padding: '12px 14px',
      display: 'flex', gap: 10, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        background: 'rgba(200,168,75,0.15)', border: '1px solid var(--gold-dark)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}>{typeIcon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-bright)', marginBottom: 2 }}>{goal.title}</div>
        {goal.owner_rsn && <div style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 1 }}>👤 {goal.owner_rsn}</div>}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: 'var(--green-bright)', fontWeight: 600 }}>✓ Completed</span>
          {completedAt && <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{completedAt}</span>}
        </div>
      </div>
      <div style={{
        background: 'var(--gold-dark)', color: 'var(--bg-root)',
        fontSize: 9, fontWeight: 800, letterSpacing: '0.5px',
        padding: '3px 7px', borderRadius: 5, flexShrink: 0,
      }}>VAULT</div>
    </div>
  );
}

// ── Group Vault panel ─────────────────────────────────────────────────────────

function VaultPanel({ players, groupId, goals, onToast, myRsn, canWrite, groupEquipment, onReloadDrops, iconMap }) {
  const [drops, setDrops]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [sortBy, setSortBy]         = useState('recent');
  const [filterBoss, setFilterBoss] = useState('all');
  const [filterPlayer, setFilterPlayer] = useState('all');
  const [searchQuery, setSearchQuery]   = useState('');

  async function loadDrops() {
    setLoading(true);
    try { setDrops(await api.getDrops(groupId)); }
    catch (err) { onToast?.(err.message, 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadDrops(); }, [groupId]);

  const bosses = useMemo(() => [...new Set(drops.map(d => d.boss_name).filter(Boolean))].sort(), [drops]);

  const vaultItems = useMemo(() => {
    let filtered = drops;
    if (filterBoss   !== 'all') filtered = filtered.filter(d => d.boss_name === filterBoss);
    if (filterPlayer !== 'all') filtered = filtered.filter(d => d.rsn === filterPlayer);
    const q = searchQuery.trim().toLowerCase();
    if (q) filtered = filtered.filter(d => d.item_name?.toLowerCase().includes(q));

    const byItem = {};
    for (const drop of filtered) {
      const key = drop.item_name.toLowerCase();
      if (!byItem[key]) byItem[key] = { name: drop.item_name, boss: drop.boss_name || null, drops: [], players: new Set(), latestDate: null, maxValue: 0 };
      byItem[key].drops.push(drop);
      byItem[key].players.add(drop.rsn);
      if (drop.dropped_at > (byItem[key].latestDate || '')) byItem[key].latestDate = drop.dropped_at;
      if ((drop.value_gp || 0) > byItem[key].maxValue) byItem[key].maxValue = drop.value_gp || 0;
    }

    let items = Object.values(byItem).map(i => ({ ...i, players: [...i.players] }));
    if      (sortBy === 'recent') items.sort((a, b) => (b.latestDate || '').localeCompare(a.latestDate || ''));
    else if (sortBy === 'value')  items.sort((a, b) => b.maxValue - a.maxValue);
    else if (sortBy === 'dupes')  items.sort((a, b) => b.players.length - a.players.length || (b.latestDate || '').localeCompare(a.latestDate || ''));
    else if (sortBy === 'name')   items.sort((a, b) => a.name.localeCompare(b.name));
    return items;
  }, [drops, sortBy, filterBoss, filterPlayer]);

  const dupeCount    = vaultItems.filter(i => i.players.length > 1).length;
  const achievements = goals.filter(g => g.status === 'vaulted');

  function handleRefreshAll() {
    loadDrops();
    onReloadDrops(); // also refreshes groupEquipment in parent
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
        <div>
          <div className="section-title" style={{ marginBottom: 2 }}>
            💎 Group Vault
            {dupeCount > 0 && (
              <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--gold)', marginLeft: 8 }}>
                · {dupeCount} dupe{dupeCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{vaultItems.length} item{vaultItems.length !== 1 ? 's' : ''} logged</div>
        </div>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={handleRefreshAll}>↻</button>
      </div>

      {/* Sort buttons */}
      <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
        {[{ id: 'recent', label: 'Recent' }, { id: 'dupes', label: 'Dupes' }, { id: 'value', label: 'Value' }, { id: 'name', label: 'A–Z' }].map(s => (
          <button key={s.id} onClick={() => setSortBy(s.id)}
            className={`btn btn-sm ${sortBy === s.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 10 }}>{s.label}</button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="🔍 Search items…"
          style={{
            width: '100%', padding: '6px 30px 6px 10px',
            background: 'var(--bg-root)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', color: 'var(--text-bright)',
            fontSize: 12, outline: 'none', boxSizing: 'border-box',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-dim)', fontSize: 14, lineHeight: 1, padding: 2,
            }}>✕</button>
        )}
      </div>

      {/* Player chips filter */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* "All" chip */}
        <button
          onClick={() => setFilterPlayer('all')}
          style={{
            padding: '4px 10px', borderRadius: 'var(--radius-lg)',
            background: filterPlayer === 'all' ? 'rgba(200,168,75,0.15)' : 'var(--bg-panel-alt)',
            border: `1px solid ${filterPlayer === 'all' ? 'rgba(200,168,75,0.6)' : 'var(--border)'}`,
            color: filterPlayer === 'all' ? 'var(--gold)' : 'var(--text-dim)',
            cursor: 'pointer', fontSize: 11, fontWeight: filterPlayer === 'all' ? 600 : 400,
            transition: 'all 0.12s',
          }}>All members</button>

        {players.map(p => {
          const active = filterPlayer === p.rsn;
          return (
            <button
              key={p.id}
              onClick={() => setFilterPlayer(active ? 'all' : p.rsn)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 'var(--radius-lg)',
                background: active ? 'rgba(200,168,75,0.15)' : 'var(--bg-panel-alt)',
                border: `1px solid ${active ? 'rgba(200,168,75,0.6)' : 'var(--border)'}`,
                color: active ? 'var(--gold)' : 'var(--text-dim)',
                cursor: 'pointer', fontSize: 11, fontWeight: active ? 600 : 400,
                transition: 'all 0.12s',
              }}>
              <span style={{ fontSize: 10, opacity: 0.7 }}>👤</span>
              <span style={{ color: active ? 'var(--text-bright)' : 'var(--text)' }}>{p.rsn}</span>
            </button>
          );
        })}

        {/* Boss filter — only shown when bosses exist */}
        {bosses.length > 0 && (
          <select
            className="form-select"
            style={{ width: 'auto', fontSize: 11, marginLeft: 4 }}
            value={filterBoss}
            onChange={e => setFilterBoss(e.target.value)}>
            <option value="all">All bosses</option>
            {bosses.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        )}
      </div>

      {/* Vault tile grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" /></div>
      ) : vaultItems.length === 0 ? (
        <div className="empty-state" style={{ padding: '24px 0' }}>
          <div className="icon" style={{ fontSize: 28 }}>💎</div>
          <p style={{ fontSize: 12 }}>No drops logged yet. Add them in the Items &amp; Drops tab.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
          {vaultItems.map(item => (
            <ItemTile
              key={item.name.toLowerCase()}
              item={item}
              groupEquipment={groupEquipment}
              iconMap={iconMap}
            />
          ))}
        </div>
      )}

      {/* Vaulted achievements */}
      {achievements.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div className="section-title" style={{ marginBottom: 10, fontSize: 12 }}>🏆 Achievements</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {achievements.map(g => <AchievementCard key={g.id} goal={g} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Root VaultTab ─────────────────────────────────────────────────────────────

export default function VaultTab({ players, groupId, goals = [], onToast, canWrite, myRsn }) {
  const iconMap        = useItemIconMap();
  const [groupEquipment, setGroupEquip] = useState([]);

  // Central fetch for group equipment — shared by VaultPanel and GearLoadouts
  const loadEquipment = useCallback(async () => {
    try { setGroupEquip(await api.getGroupEquipment(groupId)); }
    catch { /* silently ignore */ }
  }, [groupId]);

  useEffect(() => { loadEquipment(); }, [loadEquipment]);

  return (
    <div style={{ position: 'relative' }}>

      {/* Side-by-side: Vault (left) + Gear (right) */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* LEFT — Group Vault */}
        <div style={{
          flex: '1 1 0', minWidth: 280,
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 18px',
        }}>
          {players.length > 0
            ? <VaultPanel
                players={players}
                groupId={groupId}
                goals={goals}
                onToast={onToast}
                myRsn={myRsn}
                canWrite={canWrite}
                groupEquipment={groupEquipment}
                onReloadDrops={loadEquipment}
                iconMap={iconMap}
              />
            : (
              <div className="empty-state">
                <div className="icon">💎</div>
                <p>Add players first to use the vault.</p>
              </div>
            )
          }
        </div>

        {/* RIGHT — Gear Loadouts */}
        <div style={{
          flex: '1 1 0', minWidth: 320,
          background: 'var(--bg-panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 18px',
        }}>
          <div className="section-title" style={{ marginBottom: 14 }}>⚔️ Gear Loadouts</div>
          {players.length > 0
            ? <GearLoadouts
                players={players}
                groupId={groupId}
                canWrite={canWrite}
                onToast={onToast}
                myRsn={myRsn}
                onEquipmentChanged={loadEquipment}
              />
            : (
              <div className="empty-state">
                <div className="icon">⚔️</div>
                <p>Add players to track gear loadouts.</p>
              </div>
            )
          }
        </div>

      </div>
    </div>
  );
}
