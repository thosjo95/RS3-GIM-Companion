import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../api/client';
import { STYLES, EQUIPMENT_SLOTS } from '../data/gearSuggestions';
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

// ── Section divider / header ──────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
      <div>
        <div className="section-title" style={{ marginBottom: 2 }}>{icon} {title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

function SectionDivider() {
  return <div style={{ borderTop: '1px solid var(--border)', margin: '32px 0' }} />;
}

// ── Drop item card ────────────────────────────────────────────────────────────

function ItemCard({ item }) {
  const isDupe   = item.players.length > 1;
  const totalQty = item.drops.reduce((a, d) => a + (d.quantity || 1), 0);
  const maxValue = Math.max(...item.drops.map(d => d.value_gp || 0));

  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: `1px solid ${isDupe ? 'var(--gold-dark)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 10,
      position: 'relative', transition: 'border-color 0.15s',
    }}>
      {isDupe && (
        <div style={{
          position: 'absolute', top: -1, right: 12,
          background: 'var(--gold-dark)', color: 'var(--bg-root)',
          fontSize: 10, fontWeight: 800, letterSpacing: '0.5px',
          padding: '2px 8px', borderRadius: '0 0 6px 6px',
        }}>DUPLICATE</div>
      )}
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-bright)', marginBottom: 2 }}>
          💎 {item.name}
          {totalQty > 1 && <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: 12 }}> ×{totalQty}</span>}
        </div>
        {item.boss && <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>🗡️ {item.boss}</div>}
        {maxValue > 0 && <div style={{ fontSize: 12, color: 'var(--green-bright)', marginTop: 2 }}>{fmtGp(maxValue)}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {item.drops.map((drop, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '5px 8px', background: 'var(--bg-panel-alt)', borderRadius: 'var(--radius)', fontSize: 12,
          }}>
            <span style={{ color: 'var(--gold)', fontWeight: 600 }}>👤 {drop.rsn}</span>
            <div style={{ display: 'flex', gap: 8, color: 'var(--text-dim)' }}>
              {drop.quantity > 1 && <span>×{drop.quantity}</span>}
              <span>{fmtDate(drop.dropped_at)}</span>
            </div>
          </div>
        ))}
      </div>
      {item.drops.some(d => d.notes) && (
        <div style={{ fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic' }}>
          {item.drops.filter(d => d.notes).map(d => d.notes).join(' · ')}
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
      borderRadius: 'var(--radius-lg)', padding: '14px 16px',
      display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: 'rgba(200,168,75,0.15)', border: '1px solid var(--gold-dark)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, flexShrink: 0,
      }}>{typeIcon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-bright)', marginBottom: 3 }}>{goal.title}</div>
        {goal.owner_rsn && <div style={{ fontSize: 12, color: 'var(--gold)', marginBottom: 2 }}>👤 {goal.owner_rsn}</div>}
        {goal.description && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>{goal.description}</div>}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--green-bright)', fontWeight: 600 }}>✓ Completed</span>
          {completedAt && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{completedAt}</span>}
          {goal.type === 'group' && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>👥 Group goal</span>}
        </div>
      </div>
      <div style={{
        background: 'var(--gold-dark)', color: 'var(--bg-root)',
        fontSize: 10, fontWeight: 800, letterSpacing: '0.5px',
        padding: '3px 8px', borderRadius: 6, flexShrink: 0,
      }}>VAULT</div>
    </div>
  );
}

// ── Worn Equipment section — confirmed gear across all players ─────────────────

function WornEquipmentSection({ groupId, players }) {
  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStyle, setFilterStyle] = useState('all');
  const [filterPlayer, setFilterPlayer] = useState('all');

  useEffect(() => {
    api.getGroupEquipment(groupId)
      .then(setRows)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [groupId]);

  const confirmedRows = useMemo(() =>
    rows.filter(r => r.confirmed && r.item_name),
  [rows]);

  const planningRows = useMemo(() =>
    rows.filter(r => !r.confirmed && r.item_name),
  [rows]);

  const filtered = (list) => list
    .filter(r => filterStyle === 'all' || r.style === filterStyle)
    .filter(r => filterPlayer === 'all' || r.rsn === filterPlayer);

  if (loading) return <div style={{ textAlign: 'center', padding: 24 }}><span className="spinner" /></div>;

  if (rows.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 24 }}>
        <div className="icon">⚔️</div>
        <p>No gear set yet. Open the Gear Loadouts section and add items to each player.</p>
      </div>
    );
  }

  const slotLabel  = (slot) => EQUIPMENT_SLOTS.find(s => s.slot === slot)?.label ?? slot;
  const styleColor = (key)  => STYLES.find(s => s.key === key)?.color ?? 'var(--text-dim)';

  function GearRow({ row, status }) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 12px',
        background: status === 'owned' ? 'rgba(76,175,80,0.07)' : 'rgba(247,201,126,0.05)',
        border: `1px solid ${status === 'owned' ? '#4caf5033' : '#f7c97e33'}`,
        borderRadius: 'var(--radius)',
        fontSize: 12,
      }}>
        <span style={{ minWidth: 14 }}>{status === 'owned' ? '✅' : '📋'}</span>
        <span style={{ color: 'var(--gold)', fontWeight: 600, minWidth: 80 }}>{row.rsn}</span>
        <span style={{ color: styleColor(row.style), minWidth: 70, fontSize: 11 }}>{row.style}</span>
        <span style={{ color: 'var(--text-dim)', minWidth: 60, fontSize: 11 }}>{slotLabel(row.slot)}</span>
        <span style={{ color: 'var(--text-bright)', fontWeight: status === 'owned' ? 600 : 400, flex: 1 }}>{row.item_name}</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="form-select" style={{ width: 'auto', fontSize: 12 }} value={filterStyle} onChange={e => setFilterStyle(e.target.value)}>
          <option value="all">All styles</option>
          {STYLES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select className="form-select" style={{ width: 'auto', fontSize: 12 }} value={filterPlayer} onChange={e => setFilterPlayer(e.target.value)}>
          <option value="all">All players</option>
          {players.map(p => <option key={p.id} value={p.rsn}>{p.rsn}</option>)}
        </select>
      </div>

      {/* Owned/confirmed items */}
      {filtered(confirmedRows).length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#4caf50', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            ✅ Owned & Worn
            <span style={{ fontWeight: 400, color: 'var(--text-dim)' }}>({filtered(confirmedRows).length} items)</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {filtered(confirmedRows).map((r, i) => <GearRow key={i} row={r} status="owned" />)}
          </div>
        </div>
      )}

      {/* Planning items */}
      {filtered(planningRows).length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#f7c97e', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            📋 Planning / Goals
            <span style={{ fontWeight: 400, color: 'var(--text-dim)' }}>({filtered(planningRows).length} items)</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {filtered(planningRows).map((r, i) => <GearRow key={i} row={r} status="planning" />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Notable Drops section ─────────────────────────────────────────────────────

function DropsSection({ players, groupId, goals, onToast }) {
  const [drops, setDrops]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [sortBy, setSortBy]         = useState('recent');
  const [filterBoss, setFilterBoss] = useState('all');
  const [filterPlayer, setFilterPlayer] = useState('all');

  async function load() {
    setLoading(true);
    try { setDrops(await api.getDrops(groupId)); }
    catch (err) { onToast?.(err.message, 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [groupId]);

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

  if (loading) return <div className="empty-state" style={{ marginTop: 40 }}><span className="spinner" style={{ width: 24, height: 24 }} /></div>;

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="flex gap-4">
          {[{ id: 'recent', label: 'Recent' }, { id: 'dupes', label: 'Dupes first' }, { id: 'value', label: 'Most valuable' }, { id: 'name', label: 'A–Z' }].map(s => (
            <button key={s.id} onClick={() => setSortBy(s.id)} className={`btn btn-sm ${sortBy === s.id ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 11 }}>{s.label}</button>
          ))}
        </div>
        <select className="form-select" style={{ width: 'auto', fontSize: 12 }} value={filterPlayer} onChange={e => setFilterPlayer(e.target.value)}>
          <option value="all">All members</option>
          {players.map(p => <option key={p.id} value={p.rsn}>{p.rsn}</option>)}
        </select>
        {bosses.length > 0 && (
          <select className="form-select" style={{ width: 'auto', fontSize: 12 }} value={filterBoss} onChange={e => setFilterBoss(e.target.value)}>
            <option value="all">All bosses</option>
            {bosses.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        )}
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={load}>↻ Refresh</button>
      </div>

      {vaultItems.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div className="icon">💎</div>
          <p>No drops logged yet. Log drops in the Items & Drops tab to fill your vault.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {vaultItems.map(item => <ItemCard key={item.name.toLowerCase()} item={item} />)}
        </div>
      )}

      {achievements.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>🏆 Achievements</div>
            <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 400 }}>
              {achievements.length} completed goal{achievements.length !== 1 ? 's' : ''} in the vault
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {achievements.map(g => <AchievementCard key={g.id} goal={g} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Notes / Pinboard section ──────────────────────────────────────────────────

function NotesSection({ groupId, canWrite, onToast }) {
  const [content, setContent]    = useState('');
  const [savedContent, setSaved] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [status, setStatus]      = useState('idle');
  const debounceRef = useRef(null);

  useEffect(() => {
    api.getGroupNotes(groupId)
      .then(data => { setContent(data.content || ''); setSaved(data.content || ''); setUpdatedAt(data.updated_at); })
      .catch(() => {});
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
    <div>
      <textarea
        value={content}
        onChange={canWrite ? handleChange : undefined}
        readOnly={!canWrite}
        placeholder={canWrite
          ? 'Write anything here — strategy notes, loot rules, session plans, links…\n\nThis is shared with all group members who have the app open.'
          : 'No group notes yet. Unlock the group to add notes.'}
        style={{
          width: '100%', minHeight: 200, padding: '14px 16px',
          background: 'var(--bg-panel)',
          border: `1px solid ${isDirty ? 'var(--gold-dark)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-lg)',
          color: 'var(--text-bright)',
          fontSize: 13, lineHeight: 1.65,
          resize: 'vertical', fontFamily: 'inherit',
          outline: 'none', transition: 'border-color 0.2s',
          cursor: canWrite ? 'text' : 'default',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          {content.length} chars
          {!canWrite && ' · 🔒 Unlock group to edit'}
          {status === 'saving' && <> · <span className="spinner" style={{ width: 10, height: 10, marginRight: 2, display: 'inline-block' }} />Saving…</>}
          {status === 'saved'  && <> · <span style={{ color: 'var(--green-bright)' }}>✓ Saved</span></>}
          {status === 'idle' && updatedAt && !isDirty && ` · Last saved ${fmtDateTime(updatedAt)}`}
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
  );
}

// ── Root VaultTab — single scrollable page ────────────────────────────────────

export default function VaultTab({ players, groupId, goals = [], onToast, canWrite }) {
  return (
    <div>

      {/* ── SECTION 1: Gear Loadouts ── */}
      <SectionHeader
        icon="⚔️"
        title="Gear Loadouts"
        subtitle="Track each player's equipment per combat style. Green = owned, gold = planning toward it."
      />
      {players.length > 0
        ? <GearLoadouts players={players} groupId={groupId} canWrite={canWrite} onToast={onToast} />
        : <div className="empty-state"><div className="icon">⚔️</div><p>Add players to track gear loadouts.</p></div>
      }

      <SectionDivider />

      {/* ── SECTION 2: Worn Equipment overview ── */}
      <SectionHeader
        icon="🧍"
        title="Worn Equipment Overview"
        subtitle="All gear across every player and style at a glance."
      />
      {players.length > 0
        ? <WornEquipmentSection groupId={groupId} players={players} />
        : <div className="empty-state"><div className="icon">🧍</div><p>Add players first.</p></div>
      }

      <SectionDivider />

      {/* ── SECTION 3: Group Notes ── */}
      <SectionHeader
        icon="📝"
        title="Group Notes"
        subtitle="Shared pinboard — boss strategies, loot split rules, session notes, anything goes."
      />
      <NotesSection groupId={groupId} canWrite={canWrite} onToast={onToast} />

      <SectionDivider />

      {/* ── SECTION 4: Notable Drops ── */}
      <SectionHeader
        icon="💎"
        title={`Notable Drops`}
        subtitle="Items your group has logged. Duplicates are highlighted."
        action={null}
      />
      {players.length > 0
        ? <DropsSection players={players} groupId={groupId} goals={goals} onToast={onToast} />
        : <div className="empty-state"><div className="icon">💎</div><p>Add players first to track drops.</p></div>
      }

    </div>
  );
}
