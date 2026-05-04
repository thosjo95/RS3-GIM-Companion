import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import { BOSSES, BOSS_NAMES, TIER_LABELS, getBossStatus } from '../data/bosses';

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

function fmtGp(n) {
  if (!n) return '';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B gp`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M gp`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K gp`;
  return `${n} gp`;
}

// Boss coloured badge
function BossChip({ bossName, players }) {
  const { status, eligible, closest, shortfall } = getBossStatus(bossName, players);

  const colors = {
    green:   { bg: 'rgba(90,154,80,0.15)',  border: 'var(--green)',        text: 'var(--green-bright)' },
    orange:  { bg: 'rgba(200,120,48,0.15)', border: 'var(--orange)',       text: 'var(--orange)' },
    red:     { bg: 'rgba(192,64,64,0.15)',  border: 'var(--red)',          text: 'var(--red-bright)' },
    unknown: { bg: 'rgba(90,74,50,0.2)',    border: 'var(--border-light)', text: 'var(--text-dim)' },
  };
  const c = colors[status] ?? colors.unknown;
  const boss = BOSSES[bossName];

  const tooltip = [
    boss ? `Tier: ${TIER_LABELS[boss.tier] ?? boss.tier}` : '',
    boss?.location ? `📍 ${boss.location}` : '',
    Object.entries(boss?.requirements ?? {}).map(([s, l]) => `Req: ${s} ${l}`).join(', '),
    status === 'green'  ? `✓ Ready: ${eligible.join(', ')}` : '',
    status === 'orange' && eligible.length > 0 ? `Meets reqs: ${eligible.join(', ')} (not max recommended)` : '',
    status === 'orange' && eligible.length === 0 && closest ? `Closest: ${closest} (${shortfall} lvl away)` : '',
    status === 'red' && closest ? `Closest: ${closest} (${Math.round(shortfall)} lvls short)` : '',
    boss?.note ?? '',
  ].filter(Boolean).join('\n');

  return (
    <span
      title={tooltip}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 8px', borderRadius: 10,
        background: c.bg, border: `1px solid ${c.border}`, color: c.text,
        fontSize: 12, fontWeight: 600, cursor: 'help', whiteSpace: 'nowrap',
      }}>
      {status === 'green' ? '🟢' : status === 'orange' ? '🟠' : status === 'red' ? '🔴' : '⚪'} {bossName}
    </span>
  );
}

// ── Add Drop Modal ────────────────────────────────────────────────────────────

function AddDropModal({ players, onClose, onSaved, onToast }) {
  const [form, setForm] = useState({
    player_id: players[0]?.id ?? '',
    item_name: '',
    boss_name: '',
    quantity: 1,
    value_gp: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    if (!form.item_name.trim()) return onToast('Item name required', 'error');
    setSaving(true);
    try {
      await api.addDrop({ ...form, player_id: Number(form.player_id), value_gp: form.value_gp ? Number(form.value_gp) : null });
      onSaved();
      onClose();
    } catch (err) { onToast(err.message, 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <span className="modal-title">💎 Log a Drop</span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Who got it</label>
              <select className="form-select" value={form.player_id} onChange={e => set('player_id', e.target.value)}>
                {players.map(p => <option key={p.id} value={p.id}>{p.rsn}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Item name *</label>
              <input className="form-input" value={form.item_name} onChange={e => set('item_name', e.target.value)}
                placeholder="e.g. Bandos chestplate" autoFocus required />
            </div>
            <div className="form-group">
              <label className="form-label">Boss / Source</label>
              <input className="form-input" list="boss-list" value={form.boss_name}
                onChange={e => set('boss_name', e.target.value)} placeholder="e.g. General Graardor" />
              <datalist id="boss-list">{BOSS_NAMES.map(b => <option key={b} value={b} />)}</datalist>
            </div>
            <div className="grid-2" style={{ gap: 10 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Quantity</label>
                <input type="number" min="1" className="form-input" value={form.quantity}
                  onChange={e => set('quantity', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Value (gp)</label>
                <input type="number" min="0" className="form-input" value={form.value_gp}
                  onChange={e => set('value_gp', e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div className="form-group mt-8" style={{ marginBottom: 0 }}>
              <label className="form-label">Notes</label>
              <input className="form-input" value={form.notes} onChange={e => set('notes', e.target.value)}
                placeholder="e.g. 1/512 drop, 3rd kill" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '💎 Log Drop'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Request Modal ─────────────────────────────────────────────────────────

function AddRequestModal({ players, onClose, onSaved, onToast }) {
  const [form, setForm] = useState({
    player_id: players[0]?.id ?? '',
    item_name: '',
    boss_name: BOSS_NAMES[0] ?? '',
    priority: 'medium',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-fill item suggestions when boss changes
  const bossDrops = BOSSES[form.boss_name]?.drops ?? [];

  async function submit(e) {
    e.preventDefault();
    if (!form.item_name.trim() || !form.boss_name.trim()) return onToast('Item and boss are required', 'error');
    setSaving(true);
    try {
      await api.addRequest({ ...form, player_id: Number(form.player_id) });
      onSaved();
      onClose();
    } catch (err) { onToast(err.message, 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <span className="modal-title">🎯 Add Item Request</span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Who needs it</label>
              <select className="form-select" value={form.player_id} onChange={e => set('player_id', e.target.value)}>
                {players.map(p => <option key={p.id} value={p.id}>{p.rsn}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Boss</label>
              <select className="form-select" value={form.boss_name} onChange={e => set('boss_name', e.target.value)}>
                {BOSS_NAMES.map(b => {
                  const boss = BOSSES[b];
                  return <option key={b} value={b}>{b} — {TIER_LABELS[boss?.tier] ?? 'Custom'}</option>;
                })}
                <option value="__custom">— Other (type below) —</option>
              </select>
            </div>
            {form.boss_name === '__custom' && (
              <div className="form-group">
                <label className="form-label">Custom boss name</label>
                <input className="form-input" onChange={e => set('boss_name', e.target.value)}
                  placeholder="Enter boss name" />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Item *</label>
              <input className="form-input" list="drop-list" value={form.item_name}
                onChange={e => set('item_name', e.target.value)}
                placeholder="Select from list or type custom item" required />
              <datalist id="drop-list">
                {bossDrops.map(d => <option key={d} value={d} />)}
              </datalist>
              {bossDrops.length > 0 && (
                <div className="flex gap-4 mt-8" style={{ flexWrap: 'wrap' }}>
                  {bossDrops.map(d => (
                    <button key={d} type="button" className="tag" style={{ cursor: 'pointer', fontSize: 11 }}
                      onClick={() => set('item_name', d)}>
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid-2" style={{ gap: 10 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Priority</label>
                <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Notes</label>
                <input className="form-input" value={form.notes} onChange={e => set('notes', e.target.value)}
                  placeholder="Optional" />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '🎯 Add Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Boss Requirements Legend ──────────────────────────────────────────────────

function BossReqPopup({ bossName, players }) {
  const boss = BOSSES[bossName];
  if (!boss) return null;
  const { eligible, closest, shortfall } = getBossStatus(bossName, players);

  const reqs = Object.entries(boss.requirements ?? {});
  const rec = Object.entries(boss.recommended ?? {});

  return (
    <div style={{
      position: 'absolute', zIndex: 50, top: '100%', left: 0, marginTop: 4,
      background: 'var(--bg-panel-alt)', border: '1px solid var(--border-light)',
      borderRadius: 'var(--radius-lg)', padding: '12px 14px', minWidth: 240,
      boxShadow: 'var(--shadow-lg)', fontSize: 12,
    }}>
      <div style={{ fontWeight: 700, color: 'var(--text-bright)', marginBottom: 6 }}>{bossName}</div>
      <div style={{ color: 'var(--text-dim)', marginBottom: 8 }}>📍 {boss.location}</div>

      {reqs.length > 0 && (
        <>
          <div style={{ color: 'var(--gold)', fontWeight: 600, marginBottom: 4 }}>Hard requirements</div>
          {reqs.map(([s, l]) => {
            const met = players.some(p => (p.skills || []).find(sk => sk.skill_name === s)?.level >= l);
            return (
              <div key={s} style={{ color: met ? 'var(--green-bright)' : 'var(--red-bright)', marginBottom: 2 }}>
                {met ? '✓' : '✗'} {s} {l}
              </div>
            );
          })}
        </>
      )}

      {rec.length > 0 && (
        <>
          <div style={{ color: 'var(--text-dim)', fontWeight: 600, marginTop: 8, marginBottom: 4 }}>Recommended</div>
          {rec.map(([s, l]) => {
            const best = Math.max(...players.map(p => (p.skills || []).find(sk => sk.skill_name === s)?.level ?? 1));
            const color = best >= l ? 'var(--green-bright)' : best >= l - 10 ? 'var(--orange)' : 'var(--red-bright)';
            return (
              <div key={s} style={{ color, marginBottom: 2 }}>
                {s} {l} <span style={{ color: 'var(--text-dim)' }}>(best: {best})</span>
              </div>
            );
          })}
        </>
      )}

      {eligible.length > 0 && (
        <div style={{ marginTop: 8, color: 'var(--green-bright)' }}>✓ Eligible: {eligible.join(', ')}</div>
      )}
      {eligible.length === 0 && closest && (
        <div style={{ marginTop: 8, color: 'var(--orange)' }}>
          Closest: {closest} ({Math.ceil(shortfall)} lvl{shortfall !== 1 ? 's' : ''} away)
        </div>
      )}
      {boss.note && <div style={{ marginTop: 8, color: 'var(--text-dim)', fontStyle: 'italic' }}>{boss.note}</div>}
    </div>
  );
}

// ── Item Requests Table ───────────────────────────────────────────────────────

function RequestRow({ req, players, onToggle, onDelete }) {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <tr style={{ opacity: req.obtained ? 0.55 : 1 }}>
      <td>
        <div className="flex align-center gap-8">
          <div className={`priority-dot priority-${req.priority}`} title={`${req.priority} priority`} />
          <span style={{ color: 'var(--text-bright)', fontWeight: 600 }}>{req.item_name}</span>
          {req.obtained ? <span style={{ fontSize: 11, color: 'var(--green-bright)' }}>✓ Obtained</span> : null}
        </div>
        {req.notes && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{req.notes}</div>}
      </td>
      <td>
        <div style={{ position: 'relative', display: 'inline-block' }}
          onMouseEnter={() => setShowPopup(true)} onMouseLeave={() => setShowPopup(false)}>
          <BossChip bossName={req.boss_name} players={players} />
          {showPopup && <BossReqPopup bossName={req.boss_name} players={players} />}
        </div>
      </td>
      <td style={{ color: 'var(--gold)' }}>{req.rsn}</td>
      <td style={{ fontSize: 11, color: 'var(--text-dim)' }}>{fmtDate(req.created_at)}</td>
      <td>
        <div className="flex gap-8 align-center">
          <button
            className={`btn btn-sm ${req.obtained ? 'btn-secondary' : 'btn-primary'}`}
            style={{ fontSize: 11 }}
            onClick={() => onToggle(req)}>
            {req.obtained ? '↩ Reopen' : '✓ Mark obtained'}
          </button>
          <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--red-bright)' }}
            onClick={() => onDelete(req.id)}>✕</button>
        </div>
      </td>
    </tr>
  );
}

// ── Drop Log Row ──────────────────────────────────────────────────────────────

function DropRow({ drop, players, onDelete }) {
  return (
    <tr>
      <td>
        <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{drop.rsn}</span>
      </td>
      <td>
        <span style={{ color: 'var(--text-bright)', fontWeight: 600 }}>{drop.item_name}</span>
        {drop.quantity > 1 && <span style={{ color: 'var(--text-dim)', fontSize: 11 }}> ×{drop.quantity}</span>}
      </td>
      <td>
        {drop.boss_name
          ? <BossChip bossName={drop.boss_name} players={players} />
          : <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>—</span>}
      </td>
      <td style={{ color: 'var(--green-bright)', fontSize: 12 }}>{fmtGp(drop.value_gp)}</td>
      <td style={{ fontSize: 11, color: 'var(--text-dim)' }}>{fmtDate(drop.dropped_at)}</td>
      <td style={{ fontSize: 11, color: 'var(--text-dim)' }}>{drop.notes}</td>
      <td>
        <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--red-bright)' }}
          onClick={() => onDelete(drop.id)}>✕</button>
      </td>
    </tr>
  );
}

// ── Main DropsTab ─────────────────────────────────────────────────────────────

export default function DropsTab({ players, groupId, onToast, canWrite }) {
  const [drops, setDrops] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showAddDrop, setShowAddDrop] = useState(false);
  const [showAddReq, setShowAddReq] = useState(false);
  const [activeSection, setActiveSection] = useState('requests');
  const [reqFilter, setReqFilter] = useState('pending');
  const [dropFilter, setDropFilter] = useState('all');

  async function load() {
    const [d, r] = await Promise.all([api.getDrops(groupId), api.getRequests(groupId)]);
    setDrops(d);
    setRequests(r);
  }

  useEffect(() => { load(); }, [groupId]);

  async function toggleRequest(req) {
    try {
      await api.updateRequest(req.id, { obtained: req.obtained ? 0 : 1 });
      load();
    } catch (err) { onToast(err.message, 'error'); }
  }

  async function deleteRequest(id) {
    if (!confirm('Remove this request?')) return;
    try { await api.deleteRequest(id); load(); } catch (err) { onToast(err.message, 'error'); }
  }

  async function deleteDrop(id) {
    if (!confirm('Remove this drop log entry?')) return;
    try { await api.deleteDrop(id); load(); } catch (err) { onToast(err.message, 'error'); }
  }

  const filteredRequests = useMemo(() => {
    let r = requests;
    if (reqFilter === 'pending') r = r.filter(x => !x.obtained);
    if (reqFilter === 'obtained') r = r.filter(x => x.obtained);
    return r.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  }, [requests, reqFilter]);

  const filteredDrops = useMemo(() => {
    if (dropFilter === 'all') return drops;
    return drops.filter(d => d.rsn === dropFilter);
  }, [drops, dropFilter]);

  // Boss summary: group requests by boss to show "can we kill this?"
  const bossSummary = useMemo(() => {
    const pending = requests.filter(r => !r.obtained);
    const byBoss = {};
    for (const r of pending) {
      if (!byBoss[r.boss_name]) byBoss[r.boss_name] = { boss: r.boss_name, items: [], requesters: new Set() };
      byBoss[r.boss_name].items.push(r.item_name);
      byBoss[r.boss_name].requesters.add(r.rsn);
    }
    return Object.values(byBoss)
      .map(b => ({ ...b, requesters: [...b.requesters], status: getBossStatus(b.boss, players).status }))
      .sort((a, b) => {
        const order = { green: 0, orange: 1, red: 2, unknown: 3 };
        return order[a.status] - order[b.status];
      });
  }, [requests, players]);

  return (
    <div>
      {/* Section switcher */}
      <div className="flex gap-8 mb-20" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 1 }}>
        {[
          { id: 'requests', label: '🎯 Item Requests' },
          { id: 'drops', label: '💎 Drop Log' },
          { id: 'bosses', label: '🗡️ Boss Overview' },
        ].map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)} className="btn btn-ghost"
            style={{
              borderBottom: activeSection === s.id ? '2px solid var(--gold)' : '2px solid transparent',
              borderRadius: 0, paddingBottom: 8,
              color: activeSection === s.id ? 'var(--gold)' : 'var(--text-dim)',
            }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── ITEM REQUESTS ── */}
      {activeSection === 'requests' && (
        <div>
          <div className="flex align-center justify-between mb-16" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>
              🎯 Item Requests
              <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 12, color: 'var(--text-dim)' }}>
                &nbsp;— hover a boss name for requirement details
              </span>
            </div>
            <div className="flex gap-8 align-center">
              <select className="form-select" style={{ width: 'auto' }} value={reqFilter} onChange={e => setReqFilter(e.target.value)}>
                <option value="pending">Pending</option>
                <option value="obtained">Obtained</option>
                <option value="all">All</option>
              </select>
              {canWrite
                ? <button className="btn btn-primary btn-sm" onClick={() => setShowAddReq(true)}>+ Add Request</button>
                : <span style={{fontSize:12,color:'var(--text-dim)'}}>🔒 Claim group to add</span>}
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-12 mb-16 text-xs text-dim align-center" style={{ flexWrap: 'wrap' }}>
            <span>Boss colour key:</span>
            <span style={{ color: 'var(--green-bright)' }}>🟢 Can kill now</span>
            <span style={{ color: 'var(--orange)' }}>🟠 Close / meets entry but not recommended levels</span>
            <span style={{ color: 'var(--red-bright)' }}>🔴 Missing requirements</span>
          </div>

          {filteredRequests.length > 0 ? (
            <div className="panel">
              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Boss</th>
                    <th>Player</th>
                    <th>Added</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map(r => (
                    <RequestRow key={r.id} req={r} players={players}
                      onToggle={toggleRequest} onDelete={deleteRequest} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="icon">🎯</div>
              <p>{reqFilter === 'pending' ? 'No pending requests.' : 'Nothing here yet.'}</p>
              {canWrite && <button className="btn btn-primary mt-12" onClick={() => setShowAddReq(true)}>+ Add Request</button>}
            </div>
          )}
        </div>
      )}

      {/* ── DROP LOG ── */}
      {activeSection === 'drops' && (
        <div>
          <div className="flex align-center justify-between mb-16" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>💎 Drop Log ({drops.length})</div>
            <div className="flex gap-8 align-center">
              <select className="form-select" style={{ width: 'auto' }} value={dropFilter} onChange={e => setDropFilter(e.target.value)}>
                <option value="all">All Players</option>
                {players.map(p => <option key={p.id} value={p.rsn}>{p.rsn}</option>)}
              </select>
              {canWrite && <button className="btn btn-primary btn-sm" onClick={() => setShowAddDrop(true)}>+ Log Drop</button>}
            </div>
          </div>

          {filteredDrops.length > 0 ? (
            <div className="panel">
              <table className="table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Item</th>
                    <th>Boss</th>
                    <th>Value</th>
                    <th>Date</th>
                    <th>Notes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrops.map(d => (
                    <DropRow key={d.id} drop={d} players={players} onDelete={deleteDrop} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="icon">💎</div>
              <p>No drops logged yet. Track your notable loots here!</p>
              {canWrite && <button className="btn btn-primary mt-12" onClick={() => setShowAddDrop(true)}>+ Log First Drop</button>}
            </div>
          )}
        </div>
      )}

      {/* ── BOSS OVERVIEW ── */}
      {activeSection === 'bosses' && (
        <div>
          <div className="section-title mb-16">🗡️ Bosses with Pending Requests</div>

          {bossSummary.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🗡️</div>
              <p>No pending requests. Add some item requests to see the boss overview.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bossSummary.map(b => {
                const bossData = BOSSES[b.boss];
                const { eligible, closest, shortfall } = getBossStatus(b.boss, players);
                const statusColors = {
                  green:   { bg: 'rgba(90,154,80,0.08)',  border: 'rgba(90,154,80,0.4)' },
                  orange:  { bg: 'rgba(200,120,48,0.08)', border: 'rgba(200,120,48,0.4)' },
                  red:     { bg: 'rgba(192,64,64,0.08)',  border: 'rgba(192,64,64,0.4)' },
                  unknown: { bg: 'var(--bg-panel-alt)',   border: 'var(--border)' },
                };
                const sc = statusColors[b.status];

                return (
                  <div key={b.boss} style={{
                    background: sc.bg, border: `1px solid ${sc.border}`,
                    borderRadius: 'var(--radius-lg)', padding: '14px 16px',
                  }}>
                    <div className="flex align-center justify-between" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                      <div className="flex align-center gap-12">
                        <BossChip bossName={b.boss} players={players} />
                        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                          {bossData?.location ?? ''}
                          {bossData?.tier ? ` · ${TIER_LABELS[bossData.tier]}` : ''}
                        </span>
                      </div>
                      <div className="flex gap-8 text-xs" style={{ flexWrap: 'wrap' }}>
                        {b.requesters.map(r => (
                          <span key={r} className="tag">{r} needs items</span>
                        ))}
                      </div>
                    </div>

                    {/* Requested items */}
                    <div className="flex gap-6" style={{ flexWrap: 'wrap', marginBottom: 10 }}>
                      {[...new Set(b.items)].map(item => (
                        <span key={item} className="tag" style={{ color: 'var(--text-bright)' }}>💎 {item}</span>
                      ))}
                    </div>

                    {/* Who can / who is close */}
                    <div style={{ fontSize: 12 }}>
                      {eligible.length > 0 && (
                        <span style={{ color: 'var(--green-bright)', marginRight: 16 }}>
                          ✓ Can attempt: {eligible.join(', ')}
                        </span>
                      )}
                      {eligible.length === 0 && closest && (
                        <span style={{ color: 'var(--orange)' }}>
                          Closest: {closest} ({Math.ceil(shortfall)} level{shortfall !== 1 ? 's' : ''} away)
                        </span>
                      )}
                      {/* Hard requirements */}
                      {Object.entries(bossData?.requirements ?? {}).length > 0 && (
                        <span style={{ color: 'var(--text-dim)', marginLeft: eligible.length > 0 ? 16 : 0 }}>
                          Requires: {Object.entries(bossData.requirements).map(([s, l]) => `${s} ${l}`).join(', ')}
                        </span>
                      )}
                    </div>

                    {bossData?.note && (
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic', marginTop: 6 }}>
                        ℹ {bossData.note}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showAddDrop && (
        <AddDropModal players={players} onClose={() => setShowAddDrop(false)}
          onSaved={load} onToast={onToast} />
      )}
      {showAddReq && (
        <AddRequestModal players={players} onClose={() => setShowAddReq(false)}
          onSaved={load} onToast={onToast} />
      )}
    </div>
  );
}
