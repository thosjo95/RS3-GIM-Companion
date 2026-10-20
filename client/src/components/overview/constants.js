// Shared constants for the Overview tab components.

export const SKILL_ORDER = [
  'Attack', 'Strength', 'Defence', 'Constitution', 'Ranged', 'Prayer',
  'Magic', 'Summoning', 'Necromancy',
  'Cooking', 'Woodcutting', 'Fletching', 'Fishing', 'Firemaking', 'Crafting',
  'Smithing', 'Mining', 'Herblore', 'Agility', 'Thieving', 'Slayer',
  'Farming', 'Runecrafting', 'Hunter', 'Construction',
  'Dungeoneering', 'Divination', 'Invention', 'Archaeology',
];

export const STATUS_CYCLE = ['not_started', 'in_progress', 'blocked', 'complete'];

export const STATUS_LABELS = {
  not_started: 'Not started',
  in_progress: 'In progress',
  blocked: 'Blocked',
  complete: '✓ Done',
};

export const STATUS_COLORS = {
  not_started: 'var(--text-dim)',
  in_progress: 'var(--gold)',
  blocked: 'var(--red-bright)',
  complete: 'var(--green-bright)',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getPlayerSkill(players, ownerId, skillName) {
  return players.find(p => p.id === ownerId)?.skills?.find(s => s.skill_name === skillName);
}
