import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import RsIcon from './RsIcon';

import { MEMBER_COLORS } from '../lib/rs3';

// ── RS3 area task definitions ─────────────────────────────────────────────────

const TIERS = [
  { key: 'easy',   label: 'Easy',   color: 'var(--green-bright)',  bg: 'rgba(90,154,80,0.15)',    border: 'var(--green)' },
  { key: 'medium', label: 'Medium', color: '#7eb8f7',              bg: 'rgba(74,136,184,0.15)',   border: 'var(--blue)' },
  { key: 'hard',   label: 'Hard',   color: 'var(--orange)',        bg: 'rgba(200,120,48,0.15)',   border: 'var(--orange)' },
  { key: 'elite',  label: 'Elite',  color: '#d07ef7',              bg: 'rgba(160,80,220,0.15)',   border: '#a855d4' },
];

// Lumbridge is the only set that uses Beginner/Easy/Medium/Hard instead of
// Easy/Medium/Hard/Elite, so its four columns hold different keys.
const LUMBRIDGE_TIERS = [
  { ...TIERS[0], key: 'beginner', label: 'Beginner' },
  { ...TIERS[1], key: 'easy',     label: 'Easy'     },
  { ...TIERS[2], key: 'medium',   label: 'Medium'   },
  { ...TIERS[3], key: 'hard',     label: 'Hard'     },
];

// Base key must match the server-side diaryRegionKey() in activitySync.js
const DIARY_REGIONS = [
  { base: 'diary_lumbridge_draynor',   label: 'Lumbridge & Draynor', tiers: LUMBRIDGE_TIERS },
  { base: 'diary_varrock',             label: 'Varrock'              },
  { base: 'diary_falador',             label: 'Falador'              },
  { base: 'diary_karamja',             label: 'Karamja'              },
  { base: 'diary_ardougne',            label: 'Ardougne'             },
  { base: 'diary_seers_village',       label: "Seers' Village"       },
  { base: 'diary_fremennik',           label: 'Fremennik'            },
  { base: 'diary_morytania',           label: 'Morytania'            },
  { base: 'diary_desert',              label: 'Desert'               },
  { base: 'diary_daemonheim',          label: 'Daemonheim'           },
  { base: 'diary_tirannwn',            label: 'Tirannwn'             },
  { base: 'diary_wilderness',          label: 'Wilderness'           },
  { base: 'diary_underworld',          label: 'Underworld'           },
];

const regionTiers = region => region.tiers ?? TIERS;

// Each region's lodestone icon (the picture the game's lodestone network shows), hosted by the RuneScape Wiki.
const REGION_ICON = {
  "diary_lumbridge_draynor": "Lumbridge_lodestone_icon.png",
  "diary_varrock": "Varrock_lodestone_icon.png",
  "diary_falador": "Falador_lodestone_icon.png",
  "diary_karamja": "Karamja_lodestone_icon.png",
  "diary_ardougne": "Ardougne_lodestone_icon.png",
  "diary_seers_village": "Seers%27_Village_lodestone_icon.png",
  "diary_fremennik": "Fremennik_Province_lodestone_icon.png",
  "diary_morytania": "Canifis_lodestone_icon.png",
  "diary_desert": "Al_Kharid_lodestone_icon.png",
  "diary_daemonheim": "Ring_of_kinship.png",
  "diary_tirannwn": "Tirannwn_lodestone_icon.png",
  "diary_wilderness": "Wilderness_Crater_lodestone_icon.png",
  "diary_underworld": "City_of_Um_lodestone_icon.png"
};
const WIKI = 'https://runescape.wiki/images/';
function RegionIcon({ base, size = 34 }) {
  const [failed, setFailed] = useState(false);
  if (!REGION_ICON[base] || failed) return <RsIcon name="areaTasks" fallback="" size={size - 6} />;
  return <img src={WIKI + REGION_ICON[base]} alt="" width={size} height={size} onError={() => setFailed(true)} style={{ objectFit: 'contain', flexShrink: 0 }} />;
}

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
        n + regionTiers(r).filter(t => getAchievement(p.id, r.base, t.key)?.achieved).length, 0);
      return { ...p, done, pct: Math.round((done / total) * 100) };
    }).sort((a, b) => b.done - a.done);
  }, [achievements, players]);

  if (players.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">📋</div>
        <p>Add and sync players to track area tasks.</p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 16,
      background: 'var(--bg-panel)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px 18px',
    }}>
      {/* Header */}
      <div className="flex align-center justify-between" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div className="section-title" style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}><RsIcon name="areaTasks" size={20} /> Area Tasks</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            Auto-detected from the Adventurer's Log feed · Click a cell to mark manually
          </div>
        </div>
        <div data-tour="achievements-view" className="flex gap-4 tab-bar-scroll" style={{ background: 'var(--bg-root)', borderRadius: 'var(--radius)', padding: 3 }}>
          {[{ v: 'grid', l: 'Regions', i: 'areaTasks' }, { v: 'player', l: 'By Player', i: 'player' }].map(({ v, l, i }) => (
            <button key={v} onClick={() => setView(v)} style={{
              fontSize: 11, padding: '3px 12px', borderRadius: 'var(--radius)', border: 'none', cursor: 'pointer',
              background: view === v ? 'var(--gold)' : 'transparent',
              color: view === v ? '#111' : 'var(--text-dim)',
              fontWeight: view === v ? 700 : 400, display: 'inline-flex', alignItems: 'center', gap: 5,
            }}><RsIcon name={i} size={13} />{l}</button>
          ))}
        </div>
      </div>

      {/* Progress summary row */}
      <div data-tour="achievements-progress" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
        Filled circle = completed (hover for how it was detected) &nbsp;·&nbsp; Pencil in the tooltip = marked by hand &nbsp;·&nbsp;
        Click any cell (if claimed) to toggle · Completions are stored permanently once detected
        <div style={{ marginTop: 4 }}>* Lumbridge uses Beginner / Easy / Medium / Hard instead of Easy / Medium / Hard / Elite</div>
      </div>
    </div>
  );
}

// ── Region cards: icon, name, group progress, a row per tier with one circle per member ───────────────────────

function GridView({ players, colorMap, getAchievement, toggleManual, toggling, canWrite }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 270px), 1fr))', gap: 12 }}>
      {DIARY_REGIONS.map(region => {
        const tiers = regionTiers(region);
        const total = tiers.length * players.length;
        const done = tiers.reduce((n, t) => n + players.filter(p => getAchievement(p.id, region.base, t.key)?.achieved).length, 0);
        const complete = total > 0 && done === total;
        return (
          <div key={region.base} style={{
            padding: 12, borderRadius: 'var(--radius-lg)', background: 'var(--bg-panel-alt)',
            border: `1px solid ${complete ? 'var(--gold)' : 'var(--border)'}`, display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <RegionIcon base={region.base} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-bright)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{region.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{done} / {total} tiers done by the group</div>
              </div>
            </div>
            <div style={{ height: 3, background: 'var(--bg-root)', borderRadius: 2, overflow: 'hidden', marginTop: -4 }}>
              <div style={{ width: `${total ? (done / total) * 100 : 0}%`, height: '100%', background: complete ? 'var(--gold)' : 'var(--green-bright)', transition: 'width 0.3s' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tiers.map(tier => {
                const rows = players.map(p => ({ p, ach: getAchievement(p.id, region.base, tier.key) }));
                const count = rows.filter(r => r.ach?.achieved).length;
                return (
                  <div key={tier.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 'var(--radius)', background: count === players.length ? tier.bg : 'transparent' }}>
                    <span style={{ width: 62, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: tier.color }}>{tier.label}</span>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', flex: 1 }}>
                      {rows.map(({ p, ach }) => {
                        const ok = !!ach?.achieved;
                        const busy = toggling === `${p.id}:${region.base}_${tier.key}`;
                        return (
                          <button key={p.id}
                            disabled={!canWrite || busy}
                            onClick={() => toggleManual(p, region.base, tier.key)}
                            title={ok
                              ? `${p.rsn}: completed (${ach.manual ? 'marked by hand' : 'auto-detected'})${ach.achieved_at ? ' · ' + fmtDate(ach.achieved_at) : ''}${canWrite ? '\nClick to unmark' : ''}`
                              : `${p.rsn}: not completed${canWrite ? '\nClick to mark by hand' : '\nClaim the group to mark'}`}
                            style={{
                              width: 20, height: 20, borderRadius: '50%', flexShrink: 0, padding: 0,
                              border: `2px solid ${ok ? colorMap[p.id] : 'var(--border)'}`, background: ok ? colorMap[p.id] : 'transparent',
                              cursor: canWrite ? 'pointer' : 'default', opacity: busy ? 0.5 : 1, transition: 'all 0.15s',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 9, fontWeight: 700, color: ok ? '#111' : 'transparent',
                            }}>
                            {p.rsn.charAt(0).toUpperCase()}
                          </button>
                        );
                      })}
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{count}/{players.length}</span>
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

// ── Player view: one section per player ───────────────────────────────────────

function PlayerView({ players, colorMap, getAchievement, toggleManual, toggling, canWrite }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {players.map(p => {
        const done = DIARY_REGIONS.reduce((n, r) =>
          n + regionTiers(r).filter(t => getAchievement(p.id, r.base, t.key)?.achieved).length, 0);

        return (
          <div key={p.id} className="panel">
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: colorMap[p.id] }}>{p.rsn}</span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                {done} / {DIARY_REGIONS.length * TIERS.length} area task tiers completed
              </span>
            </div>
            <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
              {DIARY_REGIONS.map(region => {
                const tiers = regionTiers(region);
                const tierStatuses = tiers.map(t => ({
                  ...t,
                  ach: getAchievement(p.id, region.base, t.key),
                }));
                const doneCount = tierStatuses.filter(t => t.ach?.achieved).length;

                return (
                  <div key={region.base} style={{
                    padding: '8px 10px', borderRadius: 'var(--radius)',
                    background: 'var(--bg-panel-alt)',
                    border: `1px solid ${doneCount === tiers.length ? colorMap[p.id] + '80' : 'var(--border)'}`,
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-bright)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <RegionIcon base={region.base} size={20} />
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
                              ? `${ts.label} — ${ts.ach?.manual ? 'marked by hand' : 'auto-detected'}${ts.ach?.achieved_at ? ' · ' + fmtDate(ts.ach.achieved_at) : ''}\nClick to unmark`
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
