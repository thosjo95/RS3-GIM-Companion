import React, { useState } from 'react';
import { api } from '../api/client';

// ── Milestone data ─────────────────────────────────────────────────────────────

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

const SKILL_LIST = [
  'Attack', 'Defence', 'Strength', 'Constitution', 'Ranged', 'Prayer', 'Magic',
  'Cooking', 'Woodcutting', 'Fletching', 'Fishing', 'Firemaking', 'Crafting',
  'Smithing', 'Mining', 'Herblore', 'Agility', 'Thieving', 'Slayer', 'Farming',
  'Runecrafting', 'Hunter', 'Construction', 'Summoning', 'Dungeoneering',
  'Divination', 'Invention', 'Archaeology', 'Necromancy',
];

const KEY_QUESTS = [
  { id: 'rfd',   name: 'Recipe for Disaster',        priority: 'high',   importance: 'Barrows gloves — best-in-slot hand slot for all styles',        unlock: 'Barrows gloves' },
  { id: 'wgs',   name: 'While Guthix Sleeps',         priority: 'high',   importance: 'Unlocks Ancient Curses: Soulsplit, Turmoil, Anguish, Torment',   unlock: 'Ancient Curses' },
  { id: 'pe',    name: "Plague's End",                priority: 'high',   importance: 'Seren prayers, Enhanced Excalibur upgrade, Prifddinas access',   unlock: 'Seren prayers + Prifddinas' },
  { id: 'sk',    name: 'Smoking Kills',               priority: 'high',   importance: 'Doubles Slayer points and unlocks the full Slayer reward shop',  unlock: 'Double Slayer points' },
  { id: 'dt',    name: 'Desert Treasure',             priority: 'high',   importance: 'Unlocks Ancient Magicks spellbook — essential for bossing',     unlock: 'Ancient Magicks' },
  { id: 'ek',    name: 'The Elder Kiln',              priority: 'high',   importance: 'Unlocks Fight Kiln — rewards TokHaar-Kal-Ket/Xil/Mej (T90 style capes)', unlock: 'TokHaar-Kal capes (Ket/Xil/Mej)' },
  { id: 'rotm',  name: 'Ritual of the Mahjarrat',    priority: 'medium', importance: 'Dragonbane ammo for killing dragons, major content unlocks',     unlock: 'Dragonbane ammo' },
  { id: 'me2',   name: "Mourning's End Part II",      priority: 'medium', importance: "Required for Plague's End — gate to Elven lands content",       unlock: 'Elven path' },
  { id: 'ft',    name: 'The Fremennik Trials',        priority: 'medium', importance: 'Unlocks the path to the Lunar spellbook and Waterbirth Island',  unlock: 'Lunar spellbook path' },
  { id: 'lc',    name: 'Lost City',                   priority: 'medium', importance: 'Dragon longsword/dagger access, Zanaris teleport',              unlock: 'Dragon melee weapons' },
  { id: 'bdm',   name: 'Branches of Darkmeyer',       priority: 'medium', importance: "Drakan's medallion teleport, Darkmeyer Slayer tasks",          unlock: "Drakan's medallion" },
  { id: 'com',   name: 'Children of Mah',             priority: 'medium', importance: 'Enhanced Ancient Magicks spells and group skilling bonuses',     unlock: 'Enhanced Ancient Magicks' },
  { id: 'tww',   name: 'The World Wakes',             priority: 'low',    importance: 'Sixth Age content access, emissaries, and lore completion',      unlock: 'Sixth Age content' },
  { id: 'reg',   name: 'Regicide',                    priority: 'medium', importance: 'Elven lands access and dragon halberd',                         unlock: 'Dragon halberd + Elves' },
  { id: 'tst',   name: 'The Temple at Senntisten',   priority: 'high',   importance: 'Required for Ancient Curses — do before While Guthix Sleeps',   unlock: 'Ancient Curses prereq' },
];

const SKILL_MILESTONES = [
  { id: 'pray43',  skill: 'Prayer',       level: 43,  priority: 'high',   importance: 'Protection prayers — essential survival for any PvM' },
  { id: 'pray70',  skill: 'Prayer',       level: 70,  priority: 'high',   importance: 'Piety-equivalent curses — significant combat stat boost' },
  { id: 'pray95',  skill: 'Prayer',       level: 95,  priority: 'high',   importance: 'Soulsplit healing + Turmoil/Anguish/Torment (after WGS)' },
  { id: 'herb96',  skill: 'Herblore',     level: 96,  priority: 'high',   importance: 'Overloads — mandatory for high-level bossing at GWD, Nex etc.' },
  { id: 'dung85',  skill: 'Dungeoneering',level: 85,  priority: 'high',   importance: 'Chaotic weaponry — best non-degradeable weapons until GWD2' },
  { id: 'slay85',  skill: 'Slayer',       level: 85,  priority: 'high',   importance: 'Abyssal demons and Nechryael — high-value Slayer tasks' },
  { id: 'nec70',   skill: 'Necromancy',   level: 70,  priority: 'high',   importance: 'Conjure undead army — powerful sustained bossing support' },
  { id: 'nec99',   skill: 'Necromancy',   level: 99,  priority: 'high',   importance: 'Death Guard + Skull Lantern T80, fifth conjure slot' },
  { id: 'nec120',  skill: 'Necromancy',   level: 120, priority: 'medium', importance: 'Soulbound Lantern T95 off-hand — max Necromancy capability' },
  { id: 'mag55',   skill: 'Magic',        level: 55,  priority: 'high',   importance: 'High Alchemy — key passive GP source while training other skills' },
  { id: 'inv27',   skill: 'Invention',    level: 27,  priority: 'high',   importance: 'Augment weapons and armour — game-changing perks at all levels' },
  { id: 'inv99',   skill: 'Invention',    level: 99,  priority: 'medium', importance: 'Ancient Invention components — Biting 4, Precise 6 etc.' },
  { id: 'slay90',  skill: 'Slayer',       level: 90,  priority: 'medium', importance: 'Dragonstone and Celestial dragon tasks — elite Slayer content' },
  { id: 'farm85',  skill: 'Farming',      level: 85,  priority: 'medium', importance: 'Papaya and calquat trees — significant passive XP and GP' },
  { id: 'smth90',  skill: 'Smithing',     level: 90,  priority: 'medium', importance: 'Masterwork armour crafting begins here' },
  { id: 'smth99',  skill: 'Smithing',     level: 99,  priority: 'medium', importance: 'Trimmed masterwork armour — T92 melee tank BiS' },
  { id: 'agi80',   skill: 'Agility',      level: 80,  priority: 'medium', importance: 'Hefin agility course — best mid-level XP/hr' },
  { id: 'atk70',   skill: 'Attack',       level: 70,  priority: 'high',   importance: 'God Wars Dungeon weapon and armour requirements' },
  { id: 'def70',   skill: 'Defence',      level: 70,  priority: 'high',   importance: 'Barrows armour requirements — first major gear set' },
  { id: 'def90',   skill: 'Defence',      level: 90,  priority: 'medium', importance: 'Malevolent armour (T90 melee power) requirements' },
  { id: 'rng80',   skill: 'Ranged',       level: 80,  priority: 'medium', importance: 'Death Lotus darts + Death Lotus armour requirements' },
  { id: 'herb106', skill: 'Herblore',     level: 106, priority: 'medium', importance: 'Elder overload salve with prayer restore — top-tier PvM potion' },
];

const MILESTONE_ITEMS = [
  { id: 'fc',      name: 'Fire Cape',                 priority: 'high',   category: 'Combat Gear',   importance: 'T60 melee cape from TzTok-Jad (Fight Cave). Best-in-slot until Fight Kiln.' },
  { id: 'tkhk',   name: 'TokHaar-Kal-Ket',           priority: 'high',   category: 'Combat Gear',   importance: 'T90 melee cape. Rewarded from Fight Kiln. Requires The Elder Kiln quest.' },
  { id: 'tkhx',   name: 'TokHaar-Kal-Xil',           priority: 'high',   category: 'Combat Gear',   importance: 'T90 ranged cape. Rewarded from Fight Kiln. Requires The Elder Kiln quest.' },
  { id: 'tkhm',   name: 'TokHaar-Kal-Mej',           priority: 'high',   category: 'Combat Gear',   importance: 'T90 magic cape. Rewarded from Fight Kiln. Requires The Elder Kiln quest.' },
  { id: 'igket',  name: 'Igneous Kal-Ket',            priority: 'medium', category: 'Combat Gear',   importance: 'T95 melee cape. Upgrade TokHaar-Kal-Ket with an igneous stone from Hardmode TzKal-Zuk.' },
  { id: 'igxil',  name: 'Igneous Kal-Xil',            priority: 'medium', category: 'Combat Gear',   importance: 'T95 ranged cape. Upgrade TokHaar-Kal-Xil with an igneous stone from Hardmode TzKal-Zuk.' },
  { id: 'igmej',  name: 'Igneous Kal-Mej',            priority: 'medium', category: 'Combat Gear',   importance: 'T95 magic cape. Upgrade TokHaar-Kal-Mej with an igneous stone from Hardmode TzKal-Zuk.' },
  { id: 'igmor',  name: 'Igneous Kal-Mor',            priority: 'medium', category: 'Combat Gear',   importance: 'T95 necromancy cape. Obtained by completing TzKal-Zuk Necromancy challenge.' },
  { id: 'barrows',name: 'Barrows armour set',         priority: 'high',   category: 'Combat Gear',   importance: 'First major gear set. 70 Attack/Defence/Ranged/Magic required.' },
  { id: 'void',   name: 'Void Knight equipment',      priority: 'high',   category: 'Combat Gear',   importance: 'BiS early range/mage. Earned through Pest Control minigame.' },
  { id: 'chaotics',name: 'Chaotic weaponry',          priority: 'high',   category: 'Combat Gear',   importance: 'Best non-degradeable weapons. Requires 85 Dungeoneering.' },
  { id: 'bandos', name: 'Bandos armour',              priority: 'high',   category: 'Combat Gear',   importance: 'T70 melee power armour. General Graardor at God Wars Dungeon. Requires Defence 70.' },
  { id: 'arma',   name: 'Armadyl armour',             priority: 'high',   category: 'Combat Gear',   importance: "T70 range power armour. Kree'arra at God Wars Dungeon." },
  { id: 'subj',   name: 'Subjugation armour',         priority: 'high',   category: 'Combat Gear',   importance: "T70 magic power armour. K'ril Tsutsaroth at GWD." },
  { id: 'overloads',name: 'Overloads',               priority: 'high',   category: 'Consumables',   importance: 'Mandatory for serious PvM. Requires 96 Herblore to make.' },
  { id: 'exca',   name: 'Enhanced Excalibur',         priority: 'high',   category: 'Utility',       importance: "Free healing every 5 minutes. Finish Plague's End." },
  { id: 'nox',    name: 'Noxious weaponry',           priority: 'medium', category: 'Combat Gear',   importance: 'T90 weapons from Araxxor. Best non-augmented weapons in game.' },
  { id: 'torva',  name: 'Torva armour',               priority: 'medium', category: 'Combat Gear',   importance: 'T80 melee power armour from Nex. Best degradeable melee.' },
  { id: 'pernix', name: 'Pernix armour',              priority: 'medium', category: 'Combat Gear',   importance: 'T80 range power armour from Nex.' },
  { id: 'virtus', name: 'Virtus armour',              priority: 'medium', category: 'Combat Gear',   importance: 'T80 magic power armour from Nex.' },
  { id: 'sdl',    name: 'Superior Death Lotus armour',priority: 'high',   category: 'Combat Gear',   importance: 'T90 range power armour from Elite Dungeons.' },
  { id: 'tmw',    name: 'Trimmed masterwork armour',  priority: 'high',   category: 'Combat Gear',   importance: 'T92 melee tank armour. Best tank gear. Requires 99 Smithing.' },
  { id: 'augment',name: 'Augmented gear with perks',  priority: 'high',   category: 'Utility',       importance: 'Invention perks (Biting, Precise, Aftershock) double your DPS.' },
  { id: 'eldovl', name: 'Elder overload salve',       priority: 'medium', category: 'Consumables',   importance: 'Top-tier overload with prayer restore. 106 Herblore required.' },
  { id: 'maxcape',name: 'Max cape',                   priority: 'medium', category: 'Achievement',   importance: 'All 29 skills at 99. Excellent perk combos for every style.' },
  { id: 'comp',   name: 'Completionist cape',         priority: 'low',    category: 'Achievement',   importance: 'All skills, quests, diaries, and minigames. Ultimate RS3 goal.' },
];

const PRIORITY_COLOR = { high: '#e05252', medium: '#c8a84b', low: '#7eb8f7' };

function wikiUrl(name) {
  return `https://runescape.wiki/w/${encodeURIComponent((name || '').replace(/ /g, '_'))}`;
}

// ── Add as Goal inline panel ───────────────────────────────────────────────────

function AddGoalInline({ milestone, type, players, groupId, onSaved, onToast, onClose }) {
  const [ownerId, setOwnerId] = useState(type === 'level' ? String(players[0]?.id ?? '') : 'group');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      let body;
      const isGroup = ownerId === 'group';
      const pid = isGroup ? null : Number(ownerId);

      if (type === 'quest') {
        body = {
          type: isGroup ? 'group' : 'personal',
          owner_id: pid,
          title: `Complete: ${milestone.name}`,
          category: 'quest',
          description: milestone.importance,
          details_json: { goalType: 'quest', questName: milestone.name },
        };
      } else if (type === 'level') {
        body = {
          type: 'personal',
          owner_id: pid ?? players[0]?.id ?? null,
          title: `${milestone.skill} ${milestone.level}`,
          category: 'skill',
          skill: milestone.skill,
          target_value: milestone.level,
          description: milestone.importance,
          details_json: { goalType: 'level' },
        };
      } else {
        body = {
          type: isGroup ? 'group' : 'personal',
          owner_id: pid,
          title: `Obtain: ${milestone.name}`,
          category: 'item',
          description: milestone.importance,
          details_json: { goalType: 'item', itemName: milestone.name },
        };
      }

      await api.createGoal(body);
      onToast('Goal added!', 'success');
      onSaved();
      onClose();
    } catch (err) {
      onToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      marginTop: 8, padding: '10px 12px',
      background: 'var(--bg-root)', border: '1px solid var(--gold)',
      borderRadius: 'var(--radius)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 12, color: 'var(--text-dim)', flexShrink: 0 }}>Add for:</span>
      <select
        className="form-select"
        value={ownerId}
        onChange={e => setOwnerId(e.target.value)}
        style={{ fontSize: 12, padding: '3px 8px', height: 'auto', flex: 1, minWidth: 120 }}
      >
        {type !== 'level' && <option value="group">👥 Group</option>}
        {players.map(p => <option key={p.id} value={p.id}>{p.rsn}</option>)}
      </select>
      <button onClick={save} disabled={saving} className="btn btn-primary btn-sm" style={{ fontSize: 11 }}>
        {saving ? '…' : '+ Add Goal'}
      </button>
      <button onClick={onClose} style={{ fontSize: 11, background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>✕</button>
    </div>
  );
}

// ── Single milestone card ──────────────────────────────────────────────────────

function MilestoneCard({ milestone, type, players, groupId, onSaved, onToast, canWrite }) {
  const [adding, setAdding] = useState(false);

  const icon = type === 'quest' ? '📜' : type === 'level' ? (SKILL_ICONS[milestone.skill] ?? '📊') : '🏆';
  const title = type === 'level' ? `${milestone.skill} ${milestone.level}` : milestone.name;
  const wikiTarget = type === 'level' ? milestone.skill : milestone.name;
  const priorityColor = PRIORITY_COLOR[milestone.priority] || 'var(--border)';

  return (
    <div style={{
      padding: '12px 14px',
      background: 'var(--bg-panel-alt)',
      border: '1px solid var(--border)',
      borderLeft: `3px solid ${priorityColor}`,
      borderRadius: 'var(--radius)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.3 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-bright)' }}>{title}</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3, lineHeight: 1.5 }}>{milestone.importance}</div>
          {milestone.unlock && (
            <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 4 }}>🔓 {milestone.unlock}</div>
          )}
          {milestone.category && (
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>📁 {milestone.category}</div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0, alignItems: 'flex-end' }}>
          <a
            href={wikiUrl(wikiTarget)} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 10, color: 'var(--text-dim)', textDecoration: 'none', padding: '2px 7px', border: '1px solid var(--border)', borderRadius: 6 }}
          >
            📖 Wiki
          </a>
          {canWrite && (
            <button
              onClick={() => setAdding(a => !a)}
              style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 6, cursor: 'pointer',
                background: adding ? 'transparent' : 'rgba(200,168,75,0.12)',
                border: `1px solid ${adding ? 'var(--border)' : 'var(--gold)'}`,
                color: adding ? 'var(--text-dim)' : 'var(--gold)',
              }}
            >
              {adding ? '✕' : '+ Goal'}
            </button>
          )}
        </div>
      </div>

      {adding && (
        <AddGoalInline
          milestone={milestone}
          type={type}
          players={players}
          groupId={groupId}
          onSaved={onSaved}
          onToast={onToast}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  );
}

// ── Custom milestone form ──────────────────────────────────────────────────────

function AddCustomForm({ onAdd, onClose }) {
  const [form, setForm] = useState({ type: 'item', name: '', skill: 'Attack', level: 99, importance: '', priority: 'medium' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function submit(e) {
    e.preventDefault();
    const name = form.type === 'level' ? `${form.skill} ${form.level}` : form.name.trim();
    if (!name) return;
    onAdd({ ...form, name, id: `custom_${Date.now()}`, custom: true });
    onClose();
  }

  return (
    <div style={{ padding: '14px 16px', background: 'var(--bg-panel)', border: '1px solid var(--gold)', borderRadius: 'var(--radius)', marginBottom: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--gold)' }}>+ Add Custom Milestone</div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)} style={{ flex: 1, fontSize: 12 }}>
            <option value="quest">📜 Quest</option>
            <option value="item">🏆 Item</option>
            <option value="level">📊 Skill Level</option>
          </select>
          <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)} style={{ flex: 1, fontSize: 12 }}>
            <option value="high">🔴 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🔵 Low</option>
          </select>
        </div>

        {form.type === 'level' ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="form-select" value={form.skill} onChange={e => set('skill', e.target.value)} style={{ flex: 2, fontSize: 12 }}>
              {SKILL_LIST.map(s => <option key={s} value={s}>{SKILL_ICONS[s]} {s}</option>)}
            </select>
            <input type="number" className="form-input" value={form.level} min={2} max={120}
              onChange={e => set('level', Number(e.target.value))}
              placeholder="Level" style={{ flex: 1, fontSize: 12 }} />
          </div>
        ) : (
          <input className="form-input" placeholder="Name" value={form.name} onChange={e => set('name', e.target.value)} style={{ fontSize: 12 }} />
        )}

        <input className="form-input" placeholder="Why it matters…" value={form.importance} onChange={e => set('importance', e.target.value)} style={{ fontSize: 12 }} />

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn btn-primary btn-sm" style={{ flex: 1, fontSize: 12 }}>Add Milestone</button>
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm" style={{ fontSize: 12 }}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function TipsTab({ players, groupId, onRefresh, onToast, canWrite }) {
  const [category, setCategory] = useState('all');
  const [priority, setPriority] = useState('all');
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customMilestones, setCustomMilestones] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`gim_tips_${groupId}`) || '[]'); } catch { return []; }
  });

  function addCustom(m) {
    const updated = [...customMilestones, m];
    setCustomMilestones(updated);
    localStorage.setItem(`gim_tips_${groupId}`, JSON.stringify(updated));
  }

  function removeCustom(id) {
    const updated = customMilestones.filter(m => m.id !== id);
    setCustomMilestones(updated);
    localStorage.setItem(`gim_tips_${groupId}`, JSON.stringify(updated));
  }

  const allSections = [
    { id: 'quest', label: '📜 Quests',         items: KEY_QUESTS,         type: 'quest' },
    { id: 'level', label: '⚡ Skill Goals',     items: SKILL_MILESTONES,   type: 'level' },
    { id: 'item',  label: '🏆 Milestone Items', items: MILESTONE_ITEMS,    type: 'item'  },
    ...(customMilestones.length ? [{ id: 'custom', label: '⭐ Custom', items: customMilestones, type: 'custom' }] : []),
  ];

  const filtered = allSections
    .filter(s => category === 'all' || s.id === category)
    .map(s => ({ ...s, items: s.items.filter(m => priority === 'all' || m.priority === priority) }))
    .filter(s => s.items.length > 0);

  const CAT_BTNS = [
    { id: 'all',   label: 'All' },
    { id: 'quest', label: '📜 Quests' },
    { id: 'level', label: '⚡ Skills' },
    { id: 'item',  label: '🏆 Items' },
  ];

  const PRI_BTNS = [
    { id: 'all',    label: 'All priorities' },
    { id: 'high',   label: '🔴 High' },
    { id: 'medium', label: '🟡 Medium' },
    { id: 'low',    label: '🔵 Low' },
  ];

  function pillBtn(active) {
    return {
      fontSize: 11, padding: '3px 10px', borderRadius: 'var(--radius)',
      background: active ? 'var(--gold)' : 'transparent',
      color: active ? '#111' : 'var(--text-dim)',
      border: 'none', cursor: 'pointer', fontWeight: active ? 700 : 400,
      transition: 'background 0.15s',
    };
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div className="section-title" style={{ marginBottom: 4 }}>💡 Tips &amp; Milestones</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            Key RS3 GIM goals — quests, skill targets, and milestone gear. Click <strong style={{ color: 'var(--gold)' }}>+ Goal</strong> to start tracking one.
          </div>
        </div>
        {canWrite && (
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAddCustom(a => !a)}>
            {showAddCustom ? '✕ Cancel' : '+ Custom Milestone'}
          </button>
        )}
      </div>

      {showAddCustom && <AddCustomForm onAdd={addCustom} onClose={() => setShowAddCustom(false)} />}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg-panel-alt)', borderRadius: 'var(--radius)', padding: 3 }}>
          {CAT_BTNS.map(b => (
            <button key={b.id} onClick={() => setCategory(b.id)} style={pillBtn(category === b.id)}>{b.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg-panel-alt)', borderRadius: 'var(--radius)', padding: 3 }}>
          {PRI_BTNS.map(b => (
            <button key={b.id} onClick={() => setPriority(b.id)} style={pillBtn(priority === b.id)}>{b.label}</button>
          ))}
        </div>
      </div>

      {/* Sections */}
      {filtered.map(section => (
        <div key={section.id}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
            {section.label} <span style={{ fontWeight: 400 }}>({section.items.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {section.items.map((m, i) => (
              <div key={m.id ?? i} style={{ position: 'relative' }}>
                <MilestoneCard
                  milestone={m}
                  type={section.type === 'custom' ? m.type : section.type}
                  players={players}
                  groupId={groupId}
                  onSaved={onRefresh}
                  onToast={onToast}
                  canWrite={canWrite}
                />
                {m.custom && (
                  <button
                    onClick={() => removeCustom(m.id)}
                    title="Remove custom milestone"
                    style={{
                      position: 'absolute', top: 8, right: 8,
                      fontSize: 10, background: 'transparent', border: 'none',
                      color: 'var(--text-dim)', cursor: 'pointer', padding: '2px 4px',
                    }}
                  >✕</button>
                )}
              </div>
            ))}
          </div>
          {section.id === 'custom' && (
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic' }}>
              Custom milestones are saved locally in your browser.
            </div>
          )}
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="icon">💡</div>
          <p>No milestones match the current filter.</p>
        </div>
      )}
    </div>
  );
}
