import React, { useState } from 'react';
import { api } from '../api/client';

const SKILL_ICONS = {
  Attack: '⚔️', Defence: '🛡️', Strength: '💪', Constitution: '❤️',
  Ranged: '🏹', Prayer: '🙏', Magic: '🔮', Cooking: '🍳',
  Woodcutting: '🪵', Fletching: '🎯', Fishing: '🐟', Firemaking: '🔥',
  Crafting: '💎', Smithing: '⚒️', Mining: '⛏️', Herblore: '🌿',
  Agility: '🏃', Thieving: '🕵️', Slayer: '💀', Farming: '🌾',
  Runecrafting: '🔵', Hunter: '🦌', Construction: '🏠', Summoning: '🐉',
  Dungeoneering: '🏰', Divination: '✨', Invention: '🔬', Archaeology: '🦴',
  Necromancy: '☠️',
};

const TOP_SKILLS = ['Attack', 'Strength', 'Defence', 'Ranged', 'Magic', 'Prayer',
  'Slayer', 'Herblore', 'Summoning', 'Dungeoneering'];

function fmtXp(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(n ?? 0);
}

export default function PlayerCard({ player, onRefresh, onToast }) {
  const [syncing, setSyncing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [qp, setQp] = useState(player.quest_points ?? 0);

  const skillsMap = Object.fromEntries(
    (player.skills || []).map(s => [s.skill_name, s])
  );
  const overall = skillsMap['Overall'];
  const displaySkills = TOP_SKILLS.filter(s => skillsMap[s]);

  async function syncPlayer() {
    setSyncing(true);
    try {
      await api.syncPlayer(player.id);
      onToast(`${player.rsn} synced`, 'success');
      onRefresh();
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSyncing(false);
    }
  }

  async function saveQp() {
    try {
      await api.updatePlayer(player.id, { quest_points: Number(qp) });
      setEditing(false);
      onRefresh();
    } catch (err) {
      onToast(err.message, 'error');
    }
  }

  async function removePlayer() {
    if (!confirm(`Remove ${player.rsn} from the group?`)) return;
    try {
      await api.deletePlayer(player.id);
      onRefresh();
    } catch (err) {
      onToast(err.message, 'error');
    }
  }

  const gains = player.xp_gains || {};

  return (
    <div className="player-card">
      <div className="player-card-header">
        <div>
          <div className="player-name">{player.rsn}</div>
          <div className="player-combat text-dim text-xs">
            {player.last_synced
              ? `Last sync: ${new Date(player.last_synced).toLocaleDateString()}`
              : 'Never synced'}
          </div>
        </div>
        <div className="flex gap-8 align-center">
          <span className="combat-badge">Cmb {player.combat_level ?? '?'}</span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={syncPlayer} disabled={syncing} title="Sync hiscores">
            {syncing ? <span className="spinner" style={{width:12,height:12}}/> : '↻'}
          </button>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={removePlayer} title="Remove player" style={{color:'var(--red-bright)'}}>✕</button>
        </div>
      </div>

      <div className="player-card-body">
        {/* Key stats */}
        <div className="player-stats">
          <div className="player-stat">
            <div className="player-stat-val">{overall?.level ?? '—'}</div>
            <div className="player-stat-lbl">Total Lvl</div>
          </div>
          <div className="player-stat">
            <div className="player-stat-val">{fmtXp(overall?.xp)}</div>
            <div className="player-stat-lbl">Total XP</div>
          </div>
          <div className="player-stat">
            {editing ? (
              <div className="flex gap-8 align-center">
                <input
                  type="number" min="0" max="400"
                  value={qp} onChange={e => setQp(e.target.value)}
                  className="form-input" style={{width:60, padding:'2px 6px'}}
                />
                <button className="btn btn-primary btn-sm" onClick={saveQp}>✓</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>✕</button>
              </div>
            ) : (
              <div className="player-stat-val" style={{cursor:'pointer'}} onClick={() => setEditing(true)} title="Click to edit">
                {player.quest_points ?? 0} <span style={{fontSize:10,color:'var(--text-dim)'}}>✎</span>
              </div>
            )}
            <div className="player-stat-lbl">Quest Pts</div>
          </div>
        </div>

        {/* Top skills */}
        {displaySkills.length > 0 && (
          <div className="skills-grid">
            {displaySkills.map(name => {
              const s = skillsMap[name];
              const maxed = s?.level >= 99;
              return (
                <div key={name} className={`skill-chip${maxed ? ' maxed' : ''}`} title={`${name}: ${s?.xp?.toLocaleString()} XP`}>
                  <span className="skill-chip-icon">{SKILL_ICONS[name] ?? '📊'}</span>
                  <span className="skill-chip-level">{s?.level ?? 1}</span>
                  <span className="skill-chip-name">{name}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* XP gains */}
        {overall && (
          <div className="xp-gains">
            <div className="xp-gain-item">
              <div className="xp-gain-val">{gains.today > 0 ? `+${fmtXp(gains.today)}` : '—'}</div>
              <div className="xp-gain-lbl">Today</div>
            </div>
            <div className="xp-gain-item">
              <div className="xp-gain-val">{gains.week > 0 ? `+${fmtXp(gains.week)}` : '—'}</div>
              <div className="xp-gain-lbl">Week</div>
            </div>
            <div className="xp-gain-item">
              <div className="xp-gain-val">{gains.month > 0 ? `+${fmtXp(gains.month)}` : '—'}</div>
              <div className="xp-gain-lbl">Month</div>
            </div>
          </div>
        )}

        {!overall && (
          <div className="empty-state" style={{padding:'12px 0'}}>
            <p>No hiscore data. Click ↻ to sync.</p>
          </div>
        )}
      </div>
    </div>
  );
}
