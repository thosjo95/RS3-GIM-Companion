// ─────────────────────────────────────────────────────────────────────────────
// Shared RS3 helpers & constants
//
// These used to be copy-pasted into many components. Keep a single source of
// truth here and import what you need.
// ─────────────────────────────────────────────────────────────────────────────

const WIKI_IMG = 'https://runescape.wiki/images/';

/** All 29 RS3 skills. */
export const SKILLS = [
  'Attack', 'Defence', 'Strength', 'Constitution', 'Ranged', 'Prayer', 'Magic',
  'Cooking', 'Woodcutting', 'Fletching', 'Fishing', 'Firemaking', 'Crafting',
  'Smithing', 'Mining', 'Herblore', 'Agility', 'Thieving', 'Slayer', 'Farming',
  'Runecrafting', 'Hunter', 'Construction', 'Summoning', 'Dungeoneering',
  'Divination', 'Invention', 'Archaeology', 'Necromancy',
];

/** Skill name → RS3 wiki icon URL. */
export const SKILL_ICON_URLS = Object.fromEntries(
  SKILLS.map(s => [s, `${WIKI_IMG}${s}.png`])
);

/** Skill name → emoji (used where an <img> can't be rendered, e.g. <option>). */
export const SKILL_EMOJI = {
  Attack: '⚔️', Defence: '🛡️', Strength: '💪', Constitution: '❤️',
  Ranged: '🏹', Prayer: '🙏', Magic: '🔮', Cooking: '🍳',
  Woodcutting: '🪵', Fletching: '🎯', Fishing: '🐟', Firemaking: '🔥',
  Crafting: '💎', Smithing: '⚒️', Mining: '⛏️', Herblore: '🌿',
  Agility: '🏃', Thieving: '🕵️', Slayer: '💀', Farming: '🌾',
  Runecrafting: '🔵', Hunter: '🦌', Construction: '🏠', Summoning: '🐉',
  Dungeoneering: '🏰', Divination: '✨', Invention: '🔬', Archaeology: '🦴',
  Necromancy: '☠️',
};

/** Colour per group member slot (cards, charts, dots). */
export const MEMBER_COLORS = ['#c8a84b', '#7eb8f7', '#7ef7a8', '#f77e7e', '#d07ef7', '#f7c97e'];

/** RS3 cumulative XP table, index = level (1–120). */
export const XP_TABLE = (() => {
  const t = [0, 0];
  for (let lvl = 2; lvl <= 120; lvl++) {
    const pts = Math.floor(lvl - 1 + 300 * Math.pow(2, (lvl - 1) / 7));
    t[lvl] = Math.floor(t[lvl - 1] + pts / 4);
  }
  return t;
})();

export function xpForLevel(lvl) { return XP_TABLE[Math.min(Math.max(lvl, 1), 120)] ?? 0; }

// ── Formatting ───────────────────────────────────────────────────────────────

/** 1234567 → "1.2M", 0/null → "0". */
export function fmtXp(n) {
  if (!n) return '0';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(n);
}

/** Like fmtXp but null/undefined → "—" and no billions. */
export function fmtNum(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(n);
}

// ── Parsing ──────────────────────────────────────────────────────────────────

/** Goal `details` may arrive as a JSON string or an object. */
export function parseDetails(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

/** RuneMetrics dates look like "12-Sep-2026 14:03" → epoch ms (0 on failure). */
export function parseRMDate(str) {
  if (!str) return 0;
  try { return new Date(str.replace(/(\d+)-(\w+)-(\d+)/, '$2 $1 $3')).getTime(); } catch { return 0; }
}

/** RSN comparison key: collapse every unicode whitespace (NBSP etc.) to a space, trim, lowercase. */
export function normRsn(s) {
  return (s || '').replace(/\s/g, ' ').trim().toLowerCase();
}

/** Link to an RS3 wiki page by name. */
export function wikiUrl(name) {
  return `https://runescape.wiki/w/${encodeURIComponent((name || '').replace(/ /g, '_'))}`;
}
