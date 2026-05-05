import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';

// ── RS3 Achievement Diary definitions ─────────────────────────────────────────

// Base key must match the server-side diaryRegionKey() in activitySync.js
const DIARY_REGIONS = [
  { base: 'diary_lumbridge_draynor', label: 'Lumbridge & Draynor' },
  { base: 'diary_varrock',           label: 'Varrock'             },
  { base: 'diary_falador',           label: 'Falador'             },
  { base: 'diary_karamja',           label: 'Karamja'             },
  { base: 'diary_ardougne',          label: 'Ardougne'            },
  { base: 'diary_seers_village',     label: "Seers' Village"      },
  { base: 'diary_fremennik',         label: 'Fremennik'           },
  { base: 'diary_morytania',         label: 'Morytania'           },
  { base: 'diary_desert',            label: 'Desert'              },
  { base: 'diary_daemonheim',        label: 'Daemonheim'          },
  { base: 'diary_tirannwn',          label: 'Tirannwn'            },
  { base: 'diary_wilderness',        label: 'Wilderness'          },
  { base: 'diary_underworld',        label: 'Underworld'          },
];

const TIERS = [
  { key: 'easy',   label: 'Easy',   color: 'var(--green-bright)',  bg: 'rgba(90,154,80,0.15)',    border: 'var(--green)' },
  { key: 'medium', label: 'Medium', color: '#7eb8f7',              bg: 'rgba(74,136,184,0.15)',   border: 'var(--blue)' },
  { key: 'hard',   label: 'Hard',   color: 'var(--orange)',        bg: 'rgba(200,120,48,0.15)',   border: 'var(--orange)' },
];

const MEMBER_COLORS = ['#c8a84b', '#7eb8f7', '#7ef7a8', '#f77e7e', '#d07ef7', '#f7c97e'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AchievementsTab({ players, groupId, canWrite, onToast }) {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [toggling, setToggling]         = useState(null); // 'playerId:key'
  const [view, setView]                 = useState('grid'); // 'grid' | 'player'

  const colorMap = useMemo(
    () => Object.fromEntries(players.map((p, i) => [p.id, MEMBER_COLORS[i % MEMBER_COLORS.length]])),
    [players],
  );

  async function load() {
    if (!groupId) return;
    try {
      const data = await api.getAchievements(groupId);
      setAchievements(data);
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [groupId]);

  // Build lookup: achievementsByPlayer[playerId][key] = achievement row
  const achievementsByPlayer = useMemo(() => {
    const map = {};
    for (const a of achievements) {
      if (!map[a.player_id]) map[a.player_id] = {};
      map[a.player_id][a.key] = a;
    }
    return map;
  }, [achievements]);

  function getAchievement(playerId, regionBase, tierKey) {
    const key = `${regionBase}_${tierKey}`;
    return achievementsByPlayer[playerId]?.[key] ?? null;
  }

  async function toggleManual(player, regionBase, tierKey) {
    const key = `${regionBase}_${tierKey}`;
    const toggleId = `${player.id}:${key}`;
    if (toggling === toggleId) return;

    const current = achievementsByPlayer[player.id]?.[key];
    const nowAchieved = !(current?.achieved);

    setToggling(toggleId);
    try {
      await api.setAchievement(player.id, key, nowAchieved ? 1 : 0);
      await load();
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setToggling(null);
    }
  }

  // Summary stats
  const summary = useMemo(() => {
    const total = DIARY_REGIONS.length * TIERS.length;
    return players.map(p => {
      const done = DIARY_REGIONS.reduce((n, r) =>
        n + TIERS.filter(t => getAchievement(p.id, r.base, t.key)?.achieved).length, 0);
      return { ...p, done, pct: Math.round((done / total) * 100) };
    }).sort((a, b) => b.done - a.done);
  }, [achievements, players]);

  if (players.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">📋</div>
        <p>Add and sync players to track Achievement Diaries.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex align-center justify-between mb-16" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div className="section-title" style={{ marginBottom: 4 }}>📋 Achievement Diaries</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            Auto-detected from RuneMetrics activity feed · Click a cell to mark manually
          </div>
        </div>
        <div className="flex gap-4 tab-bar-scroll" style={{ background: 'var(--bg-root)', borderRadius: 'var(--radius)', padding: 3 }}>
          {[{ v: 'grid', l: '🗂️ Grid' }, { v: 'player', l: '👤 By Player' }].map(({ v, l }) => (
            <button key={v} onClick={() => setView(v)} style={{
              fontSize: 11, padding: '3px 12px', borderRadius: 'var(--radius)', border: 'none', cursor: 'pointer',
              background: view === v ? 'var(--gold)' : 'transparent',
              color: view === v ? '#111' : 'var(--text-dim)',
              fontWeight: view === v ? 700 : 400,
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Progress summary row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {summary.map(p => (
          <div key={p.id} style={{
            flex: '1 1 140px', padding: '10px 14px',
            background: 'var(--bg-panel-alt)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
          }}>
            <div style={{ fontWeight: 700, color: colorMap[p.id], fontSize: 13, marginBottom: 4 }}>{p.rsn}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{p.done} / {DIARY_REGIONS.length * TIERS.length} completed</div>
            <div style={{ height: 4, background: 'var(--bg-root)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
              <div style={{ width: `${p.pct}%`, height: '100%', background: colorMap[p.id], borderRadius: 2, transition: 'width 0.3s' }} />
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
      ) : view === 'grid' ? (
        <GridView
          players={players} colorMap={colorMap}
          getAchievement={getAchievement} toggleManual={toggleManual}
          toggling={toggling} canWrite={canWrite}
        />
      ) : (
        <PlayerView
          players={players} colorMap={colorMap}
          getAchievement={getAchievement} toggleManual={toggleManual}
          toggling={toggling} canWrite={canWrite}
        />
      )}

      <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
        ✅ Auto-detected from RuneMetrics &nbsp;·&nbsp; ✏️ Manually marked &nbsp;·&nbsp;
        Click any cell (if claimed) to toggle · Diary completions are stored permanently once detected
      </div>
    </div>
  );
}

// ── Grid view: Regions × Tiers table, player dots per cell ───────────────────

function GridView({ players, colorMap, getAchievement, toggleManual, toggling, canWrite }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
        <thead>
          <tr>
            <th align="left" style={{ padding: '6px 10px 10px 4px', color: 'var(--text-dim)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Region
            </th>
            {TIERS.map(t => (
              <th key={t.key} align="center" style={{
                padding: '6px 12px 10px',
                color: t.color, fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.4px',
              }}>{t.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DIARY_REGIONS.map((region, ri) => (
            <tr key={region.base} style={{ borderTop: '1px solid var(--border)', background: ri % 2 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
              <td style={{ padding: '8px 10px 8px 4px', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--text-bright)' }}>
                {region.label}
              </td>
              {TIERS.map(tier => {
                // Check if ALL players have completed this
                const statuses = players.map(p => getAchievement(p.id, region.base, tier.key));
                const allDone  = statuses.every(a => a?.achieved);
                const noneDone = statuses.every(a => !a?.achieved);

                return (
                  <td key={tier.key} align="center" style={{
                    padding: '6px 8px',
                    background: allDone  ? tier.bg : noneDone ? 'transparent' : 'rgba(255,255,255,0.02)',
                    borderLeft: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {players.map(p => {
                        const ach      = getAchievement(p.id, region.base, tier.key);
                        const done     = !!ach?.achieved;
                        const key      = `${region.base}_${tier.key}`;
                        const toggleId = `${p.id}:${key}`;
                        const busy     = toggling === toggleId;

                        return (
                          <button
                            key={p.id}
                            disabled={!canWrite || busy}
                            onClick={() => toggleManual(p, region.base, tier.key)}
                            title={done
                              ? `${p.rsn} — ${ach.manual ? '✏️ manually marked' : '✅ auto-detected'}${ach.achieved_at ? ' · ' + fmtDate(ach.achieved_at) : ''}\nClick to unmark`
                              : `${p.rsn} — not completed\n${canWrite ? 'Click to mark manually' : 'Claim group to mark'}`}
                            style={{
                              width: 22, height: 22, borderRadius: '50%',
                              border: `2px solid ${done ? colorMap[p.id] : 'var(--border)'}`,
                              background: done ? colorMap[p.id] : 'transparent',
                              cursor: canWrite ? 'pointer' : 'default',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 9, fontWeight: 700, color: done ? '#111' : 'var(--text-dim)',
                              transition: 'all 0.15s', opacity: busy ? 0.5 : 1,
                              flexShrink: 0,
                            }}>
                            {busy ? '…' : done ? p.rsn.charAt(0).toUpperCase() : ''}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Player view: one section per player ───────────────────────────────────────

function PlayerView({ players, colorMap, getAchievement, toggleManual, toggling, canWrite }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {players.map(p => {
        const done = DIARY_REGIONS.reduce((n, r) =>
          n + TIERS.filter(t => getAchievement(p.id, r.base, t.key)?.achieved).length, 0);

        return (
          <div key={p.id} className="panel">
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: colorMap[p.id] }}>{p.rsn}</span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                {done} / {DIARY_REGIONS.length * TIERS.length} diary tiers completed
              </span>
            </div>
            <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
              {DIARY_REGIONS.map(region => {
                const tierStatuses = TIERS.map(t => ({
                  ...t,
                  ach: getAchievement(p.id, region.base, t.key),
                }));
                const doneCount = tierStatuses.filter(t => t.ach?.achieved).length;

                return (
                  <div key={region.base} style={{
                    padding: '8px 10px', borderRadius: 'var(--radius)',
                    background: 'var(--bg-panel-alt)',
                    border: `1px solid ${doneCount === TIERS.length ? colorMap[p.id] + '80' : 'var(--border)'}`,
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-bright)', marginBottom: 6 }}>
                      {region.label}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {tierStatuses.map(ts => {
                        const done     = !!ts.ach?.achieved;
                        const toggleId = `${p.id}:${region.base}_${ts.key}`;
                        const busy     = toggling === toggleId;

                        return (
                          <button
                            key={ts.key}
                            disabled={!canWrite || busy}
                            onClick={() => toggleManual(p, region.base, ts.key)}
                            title={done
                              ? `${ts.label} — ${ts.ach?.manual ? '✏️ manually marked' : '✅ auto-detected'}${ts.ach?.achieved_at ? ' · ' + fmtDate(ts.ach.achieved_at) : ''}\nClick to unmark`
                              : `${ts.label} — not completed${canWrite ? '\nClick to mark' : ''}`}
                            style={{
                              flex: 1, padding: '4px 0', fontSize: 10, fontWeight: 700,
                              borderRadius: 'var(--radius)',
                              border: `1px solid ${done ? ts.border : 'var(--border)'}`,
                              background: done ? ts.bg : 'transparent',
                              color: done ? ts.color : 'var(--text-dim)',
                              cursor: canWrite ? 'pointer' : 'default',
                              opacity: busy ? 0.5 : 1,
                              transition: 'all 0.15s',
                            }}>
                            {busy ? '…' : done ? '✓ ' : ''}{ts.label}
                          </button>
                        );
                      })}
                    </div>
                    {tierStatuses.some(ts => ts.ach?.achieved_at) && (
                      <div style={{ marginTop: 4, fontSize: 10, color: 'var(--text-dim)' }}>
                        {tierStatuses.filter(ts => ts.ach?.achieved_at).map(ts => (
                          <span key={ts.key} style={{ marginRight: 6 }}>
                            {ts.label}: {fmtDate(ts.ach.achieved_at)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
