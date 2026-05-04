import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';

function fmtGp(n) {
  if (!n) return null;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B gp`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M gp`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K gp`;
  return `${n} gp`;
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function ItemCard({ item }) {
  const isDupe = item.players.length > 1;
  const totalQty = item.drops.reduce((a, d) => a + (d.quantity || 1), 0);
  const maxValue = Math.max(...item.drops.map(d => d.value_gp || 0));

  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: `1px solid ${isDupe ? 'var(--gold-dark)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      position: 'relative',
      transition: 'border-color 0.15s',
    }}>
      {isDupe && (
        <div style={{
          position: 'absolute', top: -1, right: 12,
          background: 'var(--gold-dark)', color: 'var(--bg-root)',
          fontSize: 10, fontWeight: 800, letterSpacing: '0.5px',
          padding: '2px 8px', borderRadius: '0 0 6px 6px',
        }}>
          DUPLICATE
        </div>
      )}

      <div>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-bright)', marginBottom: 2 }}>
          💎 {item.name}
          {totalQty > 1 && <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: 12 }}> ×{totalQty}</span>}
        </div>
        {item.boss && (
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            🗡️ {item.boss}
          </div>
        )}
        {maxValue > 0 && (
          <div style={{ fontSize: 12, color: 'var(--green-bright)', marginTop: 2 }}>
            {fmtGp(maxValue)}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {item.drops.map((drop, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '5px 8px',
            background: 'var(--bg-panel-alt)',
            borderRadius: 'var(--radius)',
            fontSize: 12,
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

function AchievementCard({ goal }) {
  const details = goal.details_json
    ? (typeof goal.details_json === 'string' ? (() => { try { return JSON.parse(goal.details_json); } catch { return null; } })() : goal.details_json)
    : null;
  const typeIcon = details?.goalType === 'quest' ? '📜' : details?.goalType === 'level' ? '⭐' : details?.goalType === 'item' ? '📦' : '🎯';
  const completedAt = goal.completed_at ? new Date(goal.completed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: '1px solid var(--gold-dark)',
      borderRadius: 'var(--radius-lg)',
      padding: '14px 16px',
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

export default function VaultTab({ players, groupId, goals = [], onToast }) {
  const [drops, setDrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('recent'); // recent | value | dupes | name
  const [filterBoss, setFilterBoss] = useState('all');
  const [filterPlayer, setFilterPlayer] = useState('all');

  async function load() {
    setLoading(true);
    try {
      const data = await api.getDrops(groupId);
      setDrops(data);
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [groupId]);

  const bosses = useMemo(() => {
    const set = new Set(drops.map(d => d.boss_name).filter(Boolean));
    return [...set].sort();
  }, [drops]);

  // Group drops by item name (case-insensitive)
  const vaultItems = useMemo(() => {
    let filtered = drops;
    if (filterBoss !== 'all') filtered = filtered.filter(d => d.boss_name === filterBoss);
    if (filterPlayer !== 'all') filtered = filtered.filter(d => d.rsn === filterPlayer);

    const byItem = {};
    for (const drop of filtered) {
      const key = drop.item_name.toLowerCase();
      if (!byItem[key]) {
        byItem[key] = {
          name: drop.item_name,
          boss: drop.boss_name || null,
          drops: [],
          players: new Set(),
          latestDate: null,
          maxValue: 0,
        };
      }
      byItem[key].drops.push(drop);
      byItem[key].players.add(drop.rsn);
      if (drop.dropped_at > (byItem[key].latestDate || '')) byItem[key].latestDate = drop.dropped_at;
      if ((drop.value_gp || 0) > byItem[key].maxValue) byItem[key].maxValue = drop.value_gp || 0;
    }

    let items = Object.values(byItem).map(i => ({ ...i, players: [...i.players] }));

    if (sortBy === 'recent') items.sort((a, b) => (b.latestDate || '').localeCompare(a.latestDate || ''));
    else if (sortBy === 'value') items.sort((a, b) => b.maxValue - a.maxValue);
    else if (sortBy === 'dupes') items.sort((a, b) => b.players.length - a.players.length || (b.latestDate || '').localeCompare(a.latestDate || ''));
    else if (sortBy === 'name') items.sort((a, b) => a.name.localeCompare(b.name));

    return items;
  }, [drops, sortBy, filterBoss, filterPlayer]);

  const dupeCount = vaultItems.filter(i => i.players.length > 1).length;
  const achievements = goals.filter(g => g.status === 'vaulted');

  if (loading) {
    return (
      <div className="empty-state" style={{ marginTop: 40 }}>
        <span className="spinner" style={{ width: 24, height: 24 }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div className="section-title" style={{ marginBottom: 2 }}>
            🏆 Group Vault
            <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 12, color: 'var(--text-dim)', marginLeft: 8 }}>
              {vaultItems.length} item{vaultItems.length !== 1 ? 's' : ''}
              {dupeCount > 0 && <span style={{ color: 'var(--gold)', marginLeft: 8 }}>· {dupeCount} duplicate{dupeCount !== 1 ? 's' : ''}</span>}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            Notable drops logged by your group. Duplicates are highlighted.
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { id: 'recent', label: 'Recent' },
            { id: 'dupes', label: 'Dupes first' },
            { id: 'value', label: 'Most valuable' },
            { id: 'name', label: 'A–Z' },
          ].map(s => (
            <button key={s.id} onClick={() => setSortBy(s.id)}
              className={`btn btn-sm ${sortBy === s.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 11 }}>
              {s.label}
            </button>
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
      </div>

      {vaultItems.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div className="icon">🏆</div>
          <p>No drops logged yet. Log drops in the Drops tab to fill your vault.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12,
        }}>
          {vaultItems.map(item => (
            <ItemCard key={item.name.toLowerCase()} item={item} />
          ))}
        </div>
      )}

      {/* Achievements section */}
      {achievements.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>
              🏆 Achievements
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 400 }}>
              {achievements.length} completed goal{achievements.length !== 1 ? 's' : ''} in the vault
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {achievements.map(g => (
              <AchievementCard key={g.id} goal={g} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
