import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { api } from '../api/client';
import GearLoadouts from './GearLoadouts';

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

function fmtDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Floating Notes overlay ────────────────────────────────────────────────────

function NotesOverlay({ groupId, canWrite, onToast, onClose }) {
  const [content, setContent]    = useState('');
  const [savedContent, setSaved] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [status, setStatus]      = useState('idle');
  const debounceRef = useRef(null);

  useEffect(() => {
    api.getGroupNotes(groupId)
      .then(data => { setContent(data.content || ''); setSaved(data.content || ''); setUpdatedAt(data.updated_at); })
      .catch(() => {});
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [groupId]);

  function handleChange(e) {
    const val = e.target.value;
    setContent(val);
    setStatus('idle');
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveNotes(val), 1500);
  }

  async function saveNotes(text) {
    if (!canWrite) return;
    setStatus('saving');
    try {
      await api.saveGroupNotes(groupId, text);
      setSaved(text);
      setUpdatedAt(new Date().toISOString());
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (err) {
      setStatus('error');
      onToast?.(err.message, 'error');
    }
  }

  const isDirty = content !== savedContent;

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 8888,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
      }}>
      <div style={{
        width: 420, maxWidth: '90vw', height: '100%',
        background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-bright)' }}>📝 Group Notes</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
              Shared pinboard — strategies, loot rules, session notes
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 11,
              color: status === 'saved' ? 'var(--green-bright)' : status === 'saving' ? 'var(--text-dim)' : status === 'error' ? 'var(--red)' : 'var(--text-dim)',
            }}>
              {status === 'saving' && '…saving'}
              {status === 'saved'  && '✓ Saved'}
              {status === 'error'  && '✗ Error'}
              {status === 'idle' && updatedAt && !isDirty && fmtDateTime(updatedAt)}
            </span>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}>
              ✕
            </button>
          </div>
        </div>

        <textarea
          autoFocus
          value={content}
          onChange={canWrite ? handleChange : undefined}
          readOnly={!canWrite}
          placeholder={canWrite
            ? 'Write anything — strategy notes, loot rules, session plans, links…'
            : 'No notes yet. Unlock the group to add notes.'}
          style={{
            flex: 1, padding: '16px 20px',
            background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--text-bright)', fontSize: 13, lineHeight: 1.7,
            resize: 'none', fontFamily: 'inherit',
            cursor: canWrite ? 'text' : 'default',
          }}
        />

        <div style={{
          padding: '10px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            {content.length} chars{!canWrite && ' · 🔒 Unlock to edit'}
          </span>
          {canWrite && isDirty && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => { clearTimeout(debounceRef.current); saveNotes(content); }}
              style={{ fontSize: 11 }}>
              Save now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Drop item card ────────────────────────────────────────────────────────────

function ItemCard({ item, groupEquipment, myRsn, canWrite, onToast }) {
  const isDupe   = item.players.length > 1;
  const totalQty = item.drops.reduce((a, d) => a + (d.quantity || 1), 0);
  const maxValue = Math.max(...item.drops.map(d => d.value_gp || 0));

  // Find confirmed gear entries that match this item name (case-insensitive)
  const wornBy = useMemo(() => {
    if (!groupEquipment?.length) return [];
    const nameLower = item.name.toLowerCase();
    const matches = groupEquipment.filter(e => e.confirmed && e.item_name.toLowerCase() === nameLower);
    const seen = new Set();
    return matches.filter(e => { if (seen.has(e.rsn)) return false; seen.add(e.rsn); return true; });
  }, [groupEquipment, item.name]);

  const alreadyAssigned = useMemo(() => {
    if (!myRsn || !groupEquipment?.length) return false;
    const nameLower = item.name.toLowerCase();
    return groupEquipment.some(e => e.rsn === myRsn && e.item_name.toLowerCase() === nameLower && e.confirmed);
  }, [groupEquipment, myRsn, item.name]);

  const myDropped = item.drops.some(d => d.rsn === myRsn);

  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: `1px solid ${wornBy.length ? '#4caf5055' : isDupe ? 'var(--gold-dark)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 8,
      position: 'relative', transition: 'border-color 0.15s',
    }}>
      {wornBy.length > 0 ? (
        <div style={{
          position: 'absolute', top: -1, right: 10,
          background: '#4caf50', color: '#fff',
          fontSize: 9, fontWeight: 800, letterSpacing: '0.5px',
          padding: '2px 6px', borderRadius: '0 0 5px 5px',
        }}>WORN</div>
      ) : isDupe ? (
        <div style={{
          position: 'absolute', top: -1, right: 10,
          background: 'var(--gold-dark)', color: 'var(--bg-root)',
          fontSize: 9, fontWeight: 800, letterSpacing: '0.5px',
          padding: '2px 6px', borderRadius: '0 0 5px 5px',
        }}>DUPE</div>
      ) : null}

      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-bright)', marginBottom: 1 }}>
          💎 {item.name}
          {totalQty > 1 && <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: 11 }}> ×{totalQty}</span>}
        </div>
        {item.boss && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>🗡️ {item.boss}</div>}
        {maxValue > 0 && <div style={{ fontSize: 11, color: 'var(--green-bright)' }}>{fmtGp(maxValue)}</div>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {item.drops.map((drop, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '4px 8px', background: 'var(--bg-panel-alt)', borderRadius: 'var(--radius)', fontSize: 11,
          }}>
            <span style={{ color: 'var(--gold)', fontWeight: 600 }}>👤 {drop.rsn}</span>
            <div style={{ display: 'flex', gap: 6, color: 'var(--text-dim)' }}>
              {drop.quantity > 1 && <span>×{drop.quantity}</span>}
              <span>{fmtDate(drop.dropped_at)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Worn-by status row */}
      {wornBy.length > 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 2,
          padding: '5px 8px',
          background: 'rgba(76,175,80,0.08)',
          border: '1px solid #4caf5033',
          borderRadius: 'var(--radius)',
        }}>
          {wornBy.map(e => (
            <div key={e.rsn + e.slot} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10 }}>
              <span style={{ color: '#4caf50', fontWeight: 700 }}>✅ Worn by {e.rsn}</span>
              <span style={{ color: 'var(--text-dim)' }}>· {e.slot}</span>
              {e.updated_at && <span style={{ color: 'var(--text-dim)' }}>· {fmtDate(e.updated_at)}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Assign hint — only if logged-in player dropped it but hasn't assigned yet */}
      {canWrite && myRsn && myDropped && !alreadyAssigned && (
        <button
          onClick={() => onToast?.(`To assign "${item.name}" to your gear, use the ⚔️ Gear Loadouts panel on the right.`, 'info')}
          style={{
            padding: '5px 10px', fontSize: 11, fontWeight: 600,
            background: 'rgba(200,168,75,0.12)',
            border: '1px solid var(--gold-dark)',
            borderRadius: 'var(--radius)',
            color: 'var(--gold)', cursor: 'pointer',
            alignSelf: 'flex-start',
          }}>
          ⚔️ Assign to my gear
        </button>
      )}
    </div>
  );
}

// ── Worn Equipment section ────────────────────────────────────────────────────
// Shows confirmed gear even if the item was never logged as a drop

function WornEquipmentSection({ groupEquipment }) {
  // Group by item name → list of { rsn, slot, updated_at }
  const byItem = useMemo(() => {
    const confirmed = groupEquipment.filter(e => e.confirmed && e.item_name?.trim());
    const map = {};
    for (const e of confirmed) {
      const key = e.item_name.toLowerCase();
      if (!map[key]) map[key] = { name: e.item_name, wearers: [] };
      map[key].wearers.push({ rsn: e.rsn, slot: e.slot, updated_at: e.updated_at });
    }
    // Sort by most recently updated
    return Object.values(map).sort((a, b) => {
      const aMax = Math.max(...a.wearers.map(w => w.updated_at || '').map(d => d ? new Date(d).getTime() : 0));
      const bMax = Math.max(...b.wearers.map(w => w.updated_at || '').map(d => d ? new Date(d).getTime() : 0));
      return bMax - aMax;
    });
  }, [groupEquipment]);

  if (!byItem.length) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: 'var(--text-dim)',
        textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8,
      }}>
        ⚔️ Confirmed Worn Gear <span style={{ fontWeight: 400 }}>({byItem.length})</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {byItem.map(item => (
          <div key={item.name.toLowerCase()} style={{
            background: 'var(--bg-panel)',
            border: '1px solid #4caf5033',
            borderLeft: '3px solid #4caf50',
            borderRadius: 'var(--radius)',
            padding: '8px 12px',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-bright)' }}>
              ✅ {item.name}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {item.wearers.map((w, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                  <span style={{ color: 'var(--gold)', fontWeight: 600 }}>👤 {w.rsn}</span>
                  <span style={{ color: 'var(--text-dim)' }}>· {w.slot}</span>
                  {w.updated_at && (
                    <span style={{ color: 'var(--text-dim)' }}>· claimed {fmtDate(w.updated_at)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
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

function VaultPanel({ players, groupId, goals, onToast, myRsn, canWrite, groupEquipment, onReloadDrops }) {
  const [drops, setDrops]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [sortBy, setSortBy]         = useState('recent');
  const [filterBoss, setFilterBoss] = useState('all');
  const [filterPlayer, setFilterPlayer] = useState('all');

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

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <select className="form-select" style={{ width: 'auto', fontSize: 11 }} value={filterPlayer} onChange={e => setFilterPlayer(e.target.value)}>
          <option value="all">All members</option>
          {players.map(p => <option key={p.id} value={p.rsn}>{p.rsn}</option>)}
        </select>
        {bosses.length > 0 && (
          <select className="form-select" style={{ width: 'auto', fontSize: 11 }} value={filterBoss} onChange={e => setFilterBoss(e.target.value)}>
            <option value="all">All bosses</option>
            {bosses.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        )}
      </div>

      {/* Drop list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" /></div>
      ) : vaultItems.length === 0 ? (
        <div className="empty-state" style={{ padding: '24px 0' }}>
          <div className="icon" style={{ fontSize: 28 }}>💎</div>
          <p style={{ fontSize: 12 }}>No drops logged yet. Add them in the Items &amp; Drops tab.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {vaultItems.map(item => (
            <ItemCard
              key={item.name.toLowerCase()}
              item={item}
              groupEquipment={groupEquipment}
              myRsn={myRsn}
              canWrite={canWrite}
              onToast={onToast}
            />
          ))}
        </div>
      )}

      {/* Worn Equipment — confirmed gear, always visible even without drops */}
      <WornEquipmentSection groupEquipment={groupEquipment} />

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
  const [notesOpen, setNotesOpen]         = useState(false);
  const [groupEquipment, setGroupEquip]   = useState([]);

  // Central fetch for group equipment — shared by VaultPanel and GearLoadouts
  const loadEquipment = useCallback(async () => {
    try { setGroupEquip(await api.getGroupEquipment(groupId)); }
    catch { /* silently ignore */ }
  }, [groupId]);

  useEffect(() => { loadEquipment(); }, [loadEquipment]);

  return (
    <div style={{ position: 'relative' }}>

      {/* Floating Notes button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button
          onClick={() => setNotesOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', fontSize: 12, fontWeight: 600,
            background: notesOpen ? 'rgba(200,168,75,0.15)' : 'var(--bg-panel)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--gold)', cursor: 'pointer',
            transition: 'all 0.15s',
          }}>
          📝 Group Notes
        </button>
      </div>

      {notesOpen && (
        <NotesOverlay
          groupId={groupId}
          canWrite={canWrite}
          onToast={onToast}
          onClose={() => setNotesOpen(false)}
        />
      )}

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
