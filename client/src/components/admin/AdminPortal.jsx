import React, { useState, useEffect, useCallback, useRef } from 'react';
import { adminApi, setAdminToken, loadAdminToken, clearAdminToken, hasAdminToken } from '../../api/adminClient';

// ── Tiny toast for admin ──────────────────────────────────────────────────────
function useToast() {
  const [msg, setMsg] = useState(null);
  const push = useCallback((text, type = 'success') => {
    setMsg({ text, type, id: Date.now() });
    setTimeout(() => setMsg(null), 3500);
  }, []);
  return [msg, push];
}

// ── JSON diff component ───────────────────────────────────────────────────────
function JsonDiff({ current, proposed }) {
  const cur = current ? JSON.stringify(current, null, 2) : null;
  const pro = proposed ? JSON.stringify(proposed, null, 2) : null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Current</div>
        <pre style={{
          margin: 0, padding: '10px 12px', borderRadius: 6,
          background: 'rgba(192,64,64,0.08)', border: '1px solid rgba(192,64,64,0.25)',
          color: 'var(--text-bright)', fontSize: 11, lineHeight: 1.6, overflow: 'auto', maxHeight: 400,
        }}>{cur ?? '(new record)'}</pre>
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Proposed</div>
        <pre style={{
          margin: 0, padding: '10px 12px', borderRadius: 6,
          background: 'rgba(90,154,80,0.08)', border: '1px solid rgba(90,154,80,0.25)',
          color: 'var(--text-bright)', fontSize: 11, lineHeight: 1.6, overflow: 'auto', maxHeight: 400,
        }}>{pro ?? '(delete)'}</pre>
      </div>
    </div>
  );
}

// ── Submission review modal ───────────────────────────────────────────────────
function ReviewModal({ sub, onApprove, onReject, onClose }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function handle(action) {
    setBusy(true);
    try {
      await action(sub.id, note);
      onClose(true);
    } catch (err) {
      alert(err.message);
      setBusy(false);
    }
  }

  const actionColor = { create: 'var(--green-bright)', update: 'var(--gold)', delete: 'var(--red-bright)' };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={e => e.target === e.currentTarget && onClose(false)}>
      <div style={{
        background: 'var(--bg-panel)', border: '1px solid var(--border)',
        borderRadius: 12, width: '100%', maxWidth: 900, maxHeight: '90vh',
        overflow: 'auto', padding: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 20 }}>📋</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-bright)' }}>
              Review Submission #{sub.id}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
              <span style={{ color: actionColor[sub.action] || 'var(--gold)', fontWeight: 600 }}>{sub.action?.toUpperCase()}</span>
              {' '} on <code style={{ color: 'var(--gold)' }}>{sub.table_name}</code>
              {sub.record_id && <span> · record <code>{sub.record_id}</code></span>}
              {' '} · by <strong>{sub.submitted_by}</strong>
              {' '} · {new Date(sub.submitted_at).toLocaleString()}
            </div>
          </div>
          <button onClick={() => onClose(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>

        {sub.submission_note && (
          <div style={{ padding: '8px 12px', borderRadius: 6, background: 'rgba(200,168,75,0.08)', border: '1px solid rgba(200,168,75,0.2)', fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
            📝 {sub.submission_note}
          </div>
        )}

        <JsonDiff current={sub.current_data} proposed={sub.proposed_data} />

        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>Review note (optional)</label>
          <textarea
            value={note} onChange={e => setNote(e.target.value)}
            placeholder="Add a note explaining approval or rejection…"
            style={{ width: '100%', minHeight: 60, padding: '8px 10px', borderRadius: 6, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-bright)', fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
          <button onClick={() => onClose(false)} disabled={busy}
            style={{ padding: '8px 16px', borderRadius: 6, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13 }}>
            Cancel
          </button>
          <button onClick={() => handle(onReject)} disabled={busy}
            style={{ padding: '8px 16px', borderRadius: 6, background: 'rgba(192,64,64,0.15)', border: '1px solid rgba(192,64,64,0.4)', color: 'var(--red-bright)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            ✗ Reject
          </button>
          <button onClick={() => handle(onApprove)} disabled={busy}
            style={{ padding: '8px 16px', borderRadius: 6, background: 'rgba(90,154,80,0.15)', border: '1px solid rgba(90,154,80,0.4)', color: 'var(--green-bright)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {busy ? '…' : '✓ Approve & Apply'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helper: pretty-print a JSON cell value as a short summary ─────────────────
function summariseJson(val) {
  if (val == null || val === '' || val === '{}' || val === '[]') return null;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) return null;
        const names = parsed.map(x => (typeof x === 'object' ? (x.name ?? x.id ?? JSON.stringify(x)) : x)).slice(0, 2);
        return `[${parsed.length}] ${names.join(', ')}${parsed.length > 2 ? '…' : ''}`;
      }
      const keys = Object.keys(parsed);
      if (keys.length === 0) return null;
      const preview = keys.slice(0, 3).map(k => `${k}:${parsed[k]}`).join(', ');
      return `{${keys.length > 3 ? keys.length + ' keys — ' : ''}${preview}${keys.length > 3 ? '…' : ''}}`;
    } catch { return val.length > 60 ? val.slice(0, 57) + '…' : val; }
  }
  return String(val);
}

// ── Expanded row detail modal ─────────────────────────────────────────────────
function RowDetailModal({ row, tableName, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9100,
      background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg-panel)', border: '1px solid var(--border)',
        borderRadius: 12, width: '100%', maxWidth: 700, maxHeight: '85vh',
        overflow: 'auto', padding: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <code style={{ fontSize: 12, color: 'var(--gold)' }}>{tableName}</code>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-bright)', flex: 1 }}>
            {row.name || row.id || `Row`}
          </span>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '6px 12px', fontSize: 12 }}>
          {Object.entries(row).map(([k, v]) => {
            let display;
            if (v == null) {
              display = <span style={{ color: 'var(--text-dim)', opacity: 0.4 }}>—</span>;
            } else if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
              try {
                display = (
                  <pre style={{
                    margin: 0, padding: '6px 10px', borderRadius: 4,
                    background: 'var(--bg-root)', border: '1px solid var(--border)',
                    color: 'var(--text-bright)', fontSize: 11, lineHeight: 1.5,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 220, overflowY: 'auto',
                  }}>
                    {JSON.stringify(JSON.parse(v), null, 2)}
                  </pre>
                );
              } catch { display = <span style={{ color: 'var(--text-bright)' }}>{v}</span>; }
            } else if (typeof v === 'string' && v.startsWith('https://runescape.wiki/images/')) {
              display = (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <img src={v} alt={k} width={24} height={24} style={{ imageRendering: 'crisp-edges' }}
                    onError={e => { e.target.style.display = 'none'; }} />
                  <span style={{ fontSize: 10, color: 'var(--text-dim)', wordBreak: 'break-all' }}>{v}</span>
                </span>
              );
            } else {
              display = <span style={{ color: 'var(--text-bright)', wordBreak: 'break-word' }}>{String(v)}</span>;
            }
            return [
              <span key={`k-${k}`} style={{ color: 'var(--text-dim)', fontWeight: 600, alignSelf: 'start', paddingTop: 2 }}>{k}</span>,
              <div key={`v-${k}`}>{display}</div>,
            ];
          })}
        </div>
      </div>
    </div>
  );
}

// ── Table browser ─────────────────────────────────────────────────────────────
function TableBrowser({ pushToast, initialTable }) {
  const TABLE_DEFS = [
    { id: 'rs3_bosses',          label: 'bosses',     emoji: '⚔️' },
    { id: 'rs3_quests',          label: 'quests',     emoji: '📜' },
    { id: 'rs3_gear_items',      label: 'gear items', emoji: '🛡️' },
    { id: 'rs3_gear_paths',      label: 'gear paths', emoji: '📈' },
    { id: 'rs3_milestone_items', label: 'milestones', emoji: '🏆' },
    { id: 'rs3_slayer_creatures',label: 'slayer',     emoji: '🗡️' },
    { id: 'rs3_skill_milestones',label: 'skill lvls', emoji: '⚡' },
  ];
  const [activeTable, setActiveTable] = useState(initialTable ?? TABLE_DEFS[0].id);

  // Jump to table when initialTable changes (header badge click)
  useEffect(() => {
    if (initialTable) { setActiveTable(initialTable); setSearch(''); setDebouncedSearch(''); }
  }, [initialTable]);
  const [rows, setRows] = useState([]);
  const [rowCounts, setRowCounts] = useState({});
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const debounceRef = useRef(null);

  // Debounce search input by 300ms
  function handleSearchChange(val) {
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300);
  }

  // Load row counts once on mount
  useEffect(() => {
    Promise.all(TABLE_DEFS.map(t =>
      adminApi.getTable(t.id, {}).then(r => [t.id, r.length]).catch(() => [t.id, 0])
    )).then(pairs => setRowCounts(Object.fromEntries(pairs)));
  }, []);

  // Load table data when selection or debounced search changes
  useEffect(() => {
    setLoading(true);
    setExpandedRow(null);
    adminApi.getTable(activeTable, debouncedSearch ? { search: debouncedSearch } : {})
      .then(data => { setRows(data); setRowCounts(prev => ({ ...prev, [activeTable]: debouncedSearch ? prev[activeTable] : data.length })); })
      .catch(err => pushToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [activeTable, debouncedSearch]);

  // Columns to show in table — exclude very verbose fields, show them in detail modal instead
  const VERBOSE_COLS = new Set(['drops', 'requirements', 'rewards', 'stats', 'progression', 'requirements_json', 'proposed_data', 'current_data', 'last_verified_at', 'last_updated_at']);
  const allColumns = rows[0] ? Object.keys(rows[0]) : [];
  const visibleColumns = allColumns.filter(c => !VERBOSE_COLS.has(c));

  return (
    <div>
      {/* Table selector pills with row counts */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {TABLE_DEFS.map(t => {
          const count = rowCounts[t.id];
          const active = activeTable === t.id;
          return (
            <button key={t.id} onClick={() => { setActiveTable(t.id); setSearch(''); setDebouncedSearch(''); }}
              style={{
                padding: '7px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                background: active ? 'var(--gold)' : 'var(--bg-panel-alt)',
                color: active ? '#111' : 'var(--text-dim)',
                border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
                fontWeight: active ? 700 : 400,
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'all 0.12s',
              }}>
              <span>{t.emoji}</span>
              <span>{t.label}</span>
              {count != null && (
                <span style={{
                  fontSize: 10, padding: '1px 5px', borderRadius: 10,
                  background: active ? 'rgba(0,0,0,0.2)' : 'var(--bg-root)',
                  color: active ? '#111' : 'var(--text-dim)',
                }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-dim)', pointerEvents: 'none' }}>🔍</span>
          <input
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder={`Filter ${TABLE_DEFS.find(t => t.id === activeTable)?.label} by name…`}
            style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: 6, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-bright)', fontSize: 12, boxSizing: 'border-box' }}
          />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
          {loading ? '…' : `${rows.length} rows`}
          {debouncedSearch && ` matching "${debouncedSearch}"`}
        </span>
        {debouncedSearch && (
          <button onClick={() => { setSearch(''); setDebouncedSearch(''); }}
            style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)', fontSize: 13 }}>
          {debouncedSearch ? `No results for "${debouncedSearch}"` : 'No data in this table yet.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: 'var(--bg-panel-alt)' }}>
                {visibleColumns.map(c => (
                  <th key={c} style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--text-dim)', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>{c}</th>
                ))}
                <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-dim)' }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-panel-alt)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => setExpandedRow(row)}>
                  {visibleColumns.map(c => {
                    const raw = row[c];
                    const summary = summariseJson(raw);
                    const isIcon = typeof raw === 'string' && raw.startsWith('https://runescape.wiki/images/');
                    return (
                      <td key={c} style={{ padding: '6px 10px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {isIcon ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <img src={raw} alt="" width={18} height={18} style={{ imageRendering: 'crisp-edges', flexShrink: 0 }}
                              onError={e => { e.target.style.display = 'none'; }} />
                            <span style={{ fontSize: 9, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {raw.split('/').pop()}
                            </span>
                          </span>
                        ) : raw == null ? (
                          <span style={{ color: 'var(--text-dim)', opacity: 0.3 }}>—</span>
                        ) : summary ? (
                          <span title={typeof raw === 'string' ? raw : undefined}
                            style={{ color: typeof raw === 'string' && (raw.startsWith('{') || raw.startsWith('[')) ? 'var(--gold)' : 'var(--text-bright)', opacity: 0.9 }}>
                            {summary}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-bright)' }}>{String(raw)}</span>
                        )}
                      </td>
                    );
                  })}
                  <td style={{ padding: '6px 8px', color: 'var(--text-dim)', fontSize: 10 }}>→</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Row detail modal */}
      {expandedRow && (
        <RowDetailModal row={expandedRow} tableName={activeTable} onClose={() => setExpandedRow(null)} />
      )}
    </div>
  );
}

// ── Maintenance tab ───────────────────────────────────────────────────────────
function MaintenanceTab({ pushToast }) {
  // Each tool has: id, emoji, title, desc, destructive?, fields[], action
  const TOOLS = [
    {
      id: 'list_groups',
      emoji: '📋',
      title: 'Browse Groups',
      desc: 'List all groups with their IDs, player counts, and claim status. Useful for finding IDs before running other fixes.',
      fields: [],
    },
    {
      id: 'list_players',
      emoji: '👤',
      title: 'Browse Players in Group',
      desc: 'Show all players in a group with their IDs and RSNs. Use this to get player IDs needed for Fix Player RSN.',
      fields: [
        { key: 'group_id', label: 'Group ID', placeholder: 'e.g. 12' },
      ],
    },
    {
      id: 'move_players',
      emoji: '🔀',
      title: 'Move Players Between Groups',
      desc: 'Fixes the "Group shows 0 members" bug — moves all players from the old unclaimed group to the claimed one, then you can delete the orphan.',
      fields: [
        { key: 'from_group_id', label: 'From Group ID (old/orphan)', placeholder: 'e.g. 5' },
        { key: 'to_group_id',   label: 'To Group ID (claimed)',      placeholder: 'e.g. 7' },
      ],
    },
    {
      id: 'delete_orphan',
      emoji: '🗑️',
      title: 'Delete Empty Group',
      desc: 'Removes a group that has 0 players. Will refuse with an error if any players are still attached — move them first.',
      fields: [
        { key: 'group_id', label: 'Group ID', placeholder: 'e.g. 5' },
      ],
    },
    {
      id: 'reset_secret',
      emoji: '🔓',
      title: 'Reset Group Secret',
      desc: 'Clears the password hash so the group becomes unclaimed. The owner can then re-claim it via "🔒 Claim group" in the app.',
      fields: [
        { key: 'group_id', label: 'Group ID', placeholder: 'e.g. 12' },
      ],
    },
    {
      id: 'delete_group',
      emoji: '💀',
      title: 'Permanently Delete Group',
      desc: '⚠ DESTRUCTIVE — deletes the group and ALL its players, goals, drops, gear, and notes. This cannot be undone.',
      destructive: true,
      fields: [
        { key: 'group_id', label: 'Group ID', placeholder: 'e.g. 99' },
      ],
    },
    {
      id: 'fix_rsn',
      emoji: '✏️',
      title: 'Fix Player RSN',
      desc: 'Overwrites the stored RSN for a player and clears their sync error. Use this to fix non-breaking spaces, typos, or casing issues. Get the player ID from "Browse Players in Group" above.',
      fields: [
        { key: 'player_id', label: 'Player ID', placeholder: 'e.g. 256' },
        { key: 'rsn',       label: 'Correct RSN', placeholder: 'e.g. Actual Faen' },
      ],
    },
    {
      id: 'sync_activities',
      emoji: '🔄',
      title: 'Trigger Activity Sync',
      desc: 'Manually runs the RuneMetrics activity fetch for all players in a group — same as the 2-hour background cron, but on demand. May take a while for large groups.',
      fields: [
        { key: 'group_id', label: 'Group ID', placeholder: 'e.g. 12' },
      ],
    },
    {
      id: 'sync_player',
      emoji: '⟳',
      title: 'Sync Individual Player',
      desc: 'Re-runs the hiscores sync for a single player and clears their sync error. Equivalent to clicking ↻ on the member card.',
      fields: [
        { key: 'player_id', label: 'Player ID', placeholder: 'e.g. 256' },
      ],
    },
  ];

  const [activeTool, setActiveTool] = useState(null);
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { ok: bool, message: string, rows?: [] }
  const [confirmed, setConfirmed] = useState(false);

  function openTool(toolId) {
    setActiveTool(toolId);
    setValues({});
    setResult(null);
    setConfirmed(false);
  }

  function closeTool() {
    setActiveTool(null);
    setValues({});
    setResult(null);
    setBusy(false);
    setConfirmed(false);
  }

  async function runTool(tool) {
    setBusy(true);
    setResult(null);
    try {
      let data;
      if (tool.id === 'list_groups') {
        data = await adminApi.maintenance.listGroups();
        setResult({ ok: true, rows: data, columns: ['id','name','type','size','claimed','player_count','created_at'] });
      } else if (tool.id === 'list_players') {
        data = await adminApi.maintenance.listPlayers(values.group_id);
        setResult({ ok: true, rows: data, columns: ['id','rsn','combat_level','last_synced_at','sync_error'] });
      } else if (tool.id === 'move_players') {
        data = await adminApi.maintenance.movePlayers({ from_group_id: values.from_group_id, to_group_id: values.to_group_id });
        setResult({ ok: true, message: data.message });
        pushToast(data.message, 'success');
      } else if (tool.id === 'delete_orphan') {
        data = await adminApi.maintenance.deleteOrphanGroup({ group_id: values.group_id });
        setResult({ ok: true, message: data.message });
        pushToast(data.message, 'success');
      } else if (tool.id === 'reset_secret') {
        data = await adminApi.maintenance.resetSecret({ group_id: values.group_id });
        setResult({ ok: true, message: data.message });
        pushToast(data.message, 'success');
      } else if (tool.id === 'delete_group') {
        data = await adminApi.maintenance.deleteGroup({ group_id: values.group_id });
        setResult({ ok: true, message: data.message });
        pushToast(data.message, 'success');
      } else if (tool.id === 'fix_rsn') {
        data = await adminApi.maintenance.fixRsn({ player_id: values.player_id, rsn: values.rsn });
        setResult({ ok: true, message: data.message });
        pushToast(data.message, 'success');
      } else if (tool.id === 'sync_activities') {
        data = await adminApi.maintenance.syncActivities(values.group_id);
        const newCount = Array.isArray(data) ? data.reduce((s, r) => s + (r.new ?? 0), 0) : 0;
        const msg = Array.isArray(data)
          ? `Synced ${data.length} player(s). ${newCount} new activities found.`
          : 'Activity sync completed.';
        setResult({ ok: true, message: msg, rows: Array.isArray(data) ? data : null, columns: ['rsn','success','new','error'] });
        pushToast(msg, 'success');
      } else if (tool.id === 'sync_player') {
        data = await adminApi.maintenance.syncPlayer(values.player_id);
        const msg = data.rsn ? `Synced "${data.rsn}" — total level ${data.total_level ?? '?'}` : 'Player synced.';
        setResult({ ok: true, message: msg });
        pushToast(msg, 'success');
      }
    } catch (err) {
      setResult({ ok: false, message: err.message });
      pushToast(err.message, 'error');
    } finally {
      setBusy(false);
      setConfirmed(false);
    }
  }

  const tool = TOOLS.find(t => t.id === activeTool);
  const allFilled = tool && tool.fields.every(f => (values[f.key] ?? '').trim() !== '');

  return (
    <div>
      {/* Tool cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12, marginBottom: 20 }}>
        {TOOLS.map(t => (
          <div key={t.id}
            style={{
              padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
              background: activeTool === t.id ? (t.destructive ? 'rgba(192,64,64,0.12)' : 'rgba(200,168,75,0.1)') : 'var(--bg-panel-alt)',
              border: `1px solid ${activeTool === t.id ? (t.destructive ? 'rgba(192,64,64,0.5)' : 'rgba(200,168,75,0.5)') : 'var(--border)'}`,
              transition: 'all 0.15s',
            }}
            onClick={() => activeTool === t.id ? closeTool() : openTool(t.id)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>{t.emoji}</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: t.destructive ? 'var(--red-bright)' : 'var(--text-bright)' }}>{t.title}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-dim)' }}>{activeTool === t.id ? '▲' : '▼'}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5 }}>{t.desc}</div>
          </div>
        ))}
      </div>

      {/* Active tool form */}
      {tool && (
        <div style={{
          padding: '20px 24px', borderRadius: 10,
          background: tool.destructive ? 'rgba(192,64,64,0.06)' : 'var(--bg-panel-alt)',
          border: `1px solid ${tool.destructive ? 'rgba(192,64,64,0.3)' : 'var(--border)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 22 }}>{tool.emoji}</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: tool.destructive ? 'var(--red-bright)' : 'var(--text-bright)' }}>{tool.title}</span>
            <button onClick={closeTool}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>

          {/* Input fields */}
          {tool.fields.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              {tool.fields.map(f => (
                <div key={f.key} style={{ flex: '1 1 200px' }}>
                  <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <input
                    value={values[f.key] ?? ''}
                    onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    disabled={busy}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 6, boxSizing: 'border-box',
                      background: 'var(--bg-input)', border: '1px solid var(--border)',
                      color: 'var(--text-bright)', fontSize: 13,
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Destructive confirmation checkbox */}
          {tool.destructive && allFilled && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, cursor: 'pointer', fontSize: 12 }}>
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={busy} />
              <span style={{ color: 'var(--red-bright)', fontWeight: 600 }}>I understand this is permanent and cannot be undone</span>
            </label>
          )}

          {/* Run button */}
          <button
            onClick={() => runTool(tool)}
            disabled={busy || (tool.fields.length > 0 && !allFilled) || (tool.destructive && !confirmed)}
            style={{
              padding: '9px 20px', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 700,
              background: tool.destructive ? 'rgba(192,64,64,0.2)' : 'rgba(200,168,75,0.15)',
              border: `1px solid ${tool.destructive ? 'rgba(192,64,64,0.5)' : 'rgba(200,168,75,0.5)'}`,
              color: tool.destructive ? 'var(--red-bright)' : 'var(--gold)',
              opacity: busy || (tool.fields.length > 0 && !allFilled) || (tool.destructive && !confirmed) ? 0.45 : 1,
              transition: 'opacity 0.15s',
            }}>
            {busy ? '⏳ Running…' : `▶ Run: ${tool.title}`}
          </button>

          {/* Result */}
          {result && (
            <div style={{ marginTop: 16 }}>
              {result.message && (
                <div style={{
                  padding: '10px 14px', borderRadius: 7, fontSize: 12, lineHeight: 1.6, marginBottom: result.rows ? 10 : 0,
                  background: result.ok ? 'rgba(90,154,80,0.1)' : 'rgba(192,64,64,0.1)',
                  border: `1px solid ${result.ok ? 'rgba(90,154,80,0.3)' : 'rgba(192,64,64,0.3)'}`,
                  color: result.ok ? 'var(--green-bright)' : 'var(--red-bright)',
                }}>
                  {result.ok ? '✓ ' : '✗ '}{result.message}
                </div>
              )}
              {result.rows && result.rows.length > 0 && (
                <div style={{ overflowX: 'auto', borderRadius: 7, border: '1px solid var(--border)', marginTop: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-panel)' }}>
                        {result.columns.map(c => (
                          <th key={c} style={{ textAlign: 'left', padding: '7px 10px', color: 'var(--text-dim)', fontWeight: 600, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          {result.columns.map(c => {
                            const v = row[c];
                            const isErr = c === 'sync_error' && v;
                            const isBool = c === 'success' || c === 'claimed';
                            return (
                              <td key={c} style={{ padding: '5px 10px', color: isErr ? 'var(--red-bright)' : isBool ? (v ? 'var(--green-bright)' : 'var(--text-dim)') : 'var(--text-bright)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {v == null ? <span style={{ opacity: 0.3 }}>—</span> : isBool ? (v ? '✓' : '✗') : String(v)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--text-dim)' }}>{result.rows.length} row(s)</div>
                </div>
              )}
              {result.rows && result.rows.length === 0 && (
                <div style={{ padding: '14px', fontSize: 12, color: 'var(--text-dim)', textAlign: 'center' }}>No rows returned.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Audit log ─────────────────────────────────────────────────────────────────
function AuditLog({ pushToast }) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    adminApi.getAudit().then(setRows).catch(err => pushToast(err.message, 'error'));
  }, []);

  const statusColor = { approved: 'var(--green-bright)', rejected: 'var(--red-bright)', superseded: 'var(--text-dim)' };

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 12 }}>{rows.length} reviewed entries (last 200)</div>
      {rows.map(r => (
        <div key={r.id} style={{ padding: '10px 14px', marginBottom: 6, background: 'var(--bg-panel-alt)', border: '1px solid var(--border)', borderRadius: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 11, color: statusColor[r.status] || 'var(--text-dim)' }}>
              {r.status === 'approved' ? '✓' : '✗'} {r.status?.toUpperCase()}
            </span>
            <span style={{ fontSize: 11, color: 'var(--gold)' }}>{r.action?.toUpperCase()}</span>
            <code style={{ fontSize: 11 }}>{r.table_name}</code>
            {r.record_id && <code style={{ fontSize: 11, color: 'var(--text-dim)' }}>{r.record_id}</code>}
            <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 'auto' }}>
              by {r.reviewed_by} · {r.reviewed_at ? new Date(r.reviewed_at).toLocaleString() : ''}
            </span>
          </div>
          {r.review_note && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>📝 {r.review_note}</div>}
        </div>
      ))}
      {rows.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-dim)' }}>No reviewed submissions yet.</div>}
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
function AdminDashboard({ username, onLogout, pushToast }) {
  const [tab, setTab] = useState('queue');
  const [jumpTable, setJumpTable] = useState(null); // set to jump to a specific table in Browse Tables
  const [stats, setStats] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [reviewing, setReviewing] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');

  async function loadData() {
    try {
      const [s, subs] = await Promise.all([
        adminApi.getStats(),
        adminApi.getSubmissions({ status: statusFilter }),
      ]);
      setStats(s);
      setSubmissions(subs);
    } catch (err) {
      pushToast(err.message, 'error');
    }
  }

  useEffect(() => { loadData(); }, [statusFilter]);

  const actionColor = { create: 'var(--green-bright)', update: 'var(--gold)', delete: 'var(--red-bright)' };

  const TABS = [
    { id: 'queue',       label: `📥 Queue${stats?.pending ? ` (${stats.pending})` : ''}` },
    { id: 'tables',      label: '📊 Browse Tables' },
    { id: 'maintenance', label: '🔧 Maintenance' },
    { id: 'audit',       label: '📜 Audit Log' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Header */}
      <div style={{
        padding: '12px 24px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 16, background: 'var(--bg-panel)',
      }}>
        <span style={{ fontSize: 22 }}>⚙️</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-bright)' }}>RS3 GIM Admin Portal</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>RS3 reference data management · logged in as <strong style={{ color: 'var(--gold)' }}>{username}</strong></div>
        </div>
        {stats && (
          <div style={{ display: 'flex', gap: 10, fontSize: 11, flexWrap: 'wrap' }}>
            {Object.entries(stats.table_counts || {}).map(([t, n]) => (
              <button key={t}
                onClick={() => { setJumpTable(t); setTab('tables'); }}
                title={`Browse ${t}`}
                style={{
                  padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
                  background: 'var(--bg-root)', border: '1px solid var(--border)',
                  color: 'var(--text-dim)', fontSize: 11,
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => { e.target.style.borderColor = 'var(--gold)'; e.target.style.color = 'var(--gold)'; }}
                onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-dim)'; }}>
                <strong style={{ color: 'var(--text-bright)' }}>{n}</strong> {t.replace('rs3_', '')}
              </button>
            ))}
          </div>
        )}
        <button onClick={onLogout}
          style={{ padding: '6px 12px', borderRadius: 6, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 12 }}>
          Log out
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ padding: '0 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)', display: 'flex', gap: 2 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13,
              borderBottom: tab === t.id ? '2px solid var(--gold)' : '2px solid transparent',
              color: tab === t.id ? 'var(--gold)' : 'var(--text-dim)',
              fontWeight: tab === t.id ? 700 : 400,
            }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>

        {/* Queue tab */}
        {tab === 'queue' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-dim)', marginRight: 4 }}>Status:</span>
              {['pending','approved','rejected','superseded'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                    background: statusFilter === s ? 'var(--gold)' : 'transparent',
                    color: statusFilter === s ? '#111' : 'var(--text-dim)',
                    border: `1px solid ${statusFilter === s ? 'var(--gold)' : 'var(--border)'}`,
                    fontWeight: statusFilter === s ? 700 : 400,
                  }}>{s}</button>
              ))}
              <button onClick={loadData} style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>↻ Refresh</button>
            </div>

            {submissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-dim)', fontSize: 14 }}>
                {statusFilter === 'pending' ? '✅ No pending submissions!' : `No ${statusFilter} submissions.`}
              </div>
            ) : submissions.map(sub => (
              <div key={sub.id} style={{
                padding: '12px 16px', marginBottom: 8,
                background: 'var(--bg-panel-alt)', border: '1px solid var(--border)',
                borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontSize: 11, color: actionColor[sub.action], fontWeight: 700, minWidth: 48 }}>
                  {sub.action?.toUpperCase()}
                </span>
                <code style={{ fontSize: 11, color: 'var(--gold)', minWidth: 160 }}>{sub.table_name}</code>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-bright)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sub.record_id || (typeof sub.proposed_data === 'object' && sub.proposed_data?.id) || `#${sub.id}`}
                    {sub.submission_note && <span style={{ color: 'var(--text-dim)', marginLeft: 8 }}>— {sub.submission_note}</span>}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                    {sub.submitted_by} · {new Date(sub.submitted_at).toLocaleString()}
                  </div>
                </div>
                {statusFilter === 'pending' && (
                  <button onClick={() => setReviewing(sub)}
                    style={{ padding: '5px 12px', borderRadius: 6, background: 'rgba(200,168,75,0.12)', border: '1px solid rgba(200,168,75,0.3)', color: 'var(--gold)', cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                    Review →
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'tables'      && <TableBrowser pushToast={pushToast} initialTable={jumpTable} />}
        {tab === 'maintenance' && <MaintenanceTab pushToast={pushToast} />}
        {tab === 'audit'       && <AuditLog pushToast={pushToast} />}
      </div>

      {/* Review modal */}
      {reviewing && (
        <ReviewModal
          sub={reviewing}
          onApprove={adminApi.approveSubmission}
          onReject={adminApi.rejectSubmission}
          onClose={(changed) => { setReviewing(null); if (changed) { pushToast('Submission reviewed ✓', 'success'); loadData(); } }}
        />
      )}
    </div>
  );
}

// ── Login screen ──────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [busy, setBusy]         = useState(false);
  const [showPw, setShowPw]     = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setBusy(true);
    setError('');
    try {
      const data = await adminApi.login(username.trim(), password);
      setAdminToken(data.token);
      onLogin(data.username);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'var(--bg-panel)', border: '1px solid var(--border)',
        borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 16px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{ padding: '24px 24px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⚙️</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-bright)', marginBottom: 4 }}>
            RS3 GIM Admin Portal
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 20 }}>
            RS3 reference data management
          </div>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '0 24px 24px' }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>Username</label>
            <input
              value={username} onChange={e => setUsername(e.target.value)}
              autoFocus autoComplete="username"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 6, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-bright)', fontSize: 13, boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ width: '100%', padding: '9px 36px 9px 12px', borderRadius: 6, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-bright)', fontSize: 13, boxSizing: 'border-box' }}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 14, padding: 0 }}>
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
          </div>
          {error && (
            <div style={{ padding: '8px 10px', borderRadius: 6, background: 'rgba(192,64,64,0.1)', border: '1px solid rgba(192,64,64,0.3)', color: 'var(--red-bright)', fontSize: 12, marginBottom: 12 }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={busy || !username.trim() || !password}
            style={{
              width: '100%', padding: '10px', borderRadius: 6, cursor: 'pointer',
              background: 'var(--gold)', border: 'none', color: '#111',
              fontWeight: 700, fontSize: 14,
              opacity: busy || !username.trim() || !password ? 0.5 : 1,
            }}>
            {busy ? 'Signing in…' : '🔓 Sign in'}
          </button>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <a href="/" style={{ fontSize: 12, color: 'var(--text-dim)', textDecoration: 'none' }}>← Back to app</a>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────
export default function AdminPortal() {
  const [username, setUsername] = useState(null);
  const [toast, pushToast] = useToast();

  // Try to restore session from sessionStorage
  useEffect(() => {
    const token = loadAdminToken();
    if (token) {
      // Validate by fetching stats — if it fails the token is expired
      adminApi.getStats()
        .then(() => {
          // Token valid but we don't know username — decode it
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUsername(payload.sub);
          } catch {
            setUsername('admin');
          }
        })
        .catch(() => {
          clearAdminToken();
        });
    }
  }, []);

  function handleLogout() {
    clearAdminToken();
    setUsername(null);
  }

  return (
    <>
      {username
        ? <AdminDashboard username={username} onLogout={handleLogout} pushToast={pushToast} />
        : <AdminLogin onLogin={setUsername} />}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          padding: '10px 16px', borderRadius: 8,
          background: toast.type === 'error' ? 'rgba(192,64,64,0.9)' : 'rgba(90,154,80,0.9)',
          color: '#fff', fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>{toast.text}</div>
      )}
    </>
  );
}
