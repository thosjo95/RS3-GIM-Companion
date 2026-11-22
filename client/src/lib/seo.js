// Addresses, page titles, descriptions and canonical links for search engines and link previews.
// The site is one page app, so these are set here when the view changes; Google runs the script and reads them.
// The canonical address always names groupiron.com (also on beta and localhost), so copies are never ranked on their own.
// Addresses: /  (first visit)   /leaderboard  (Global Leaderboard)   /group/<id>/<name-slug>  (one group)
// Same file in both repos (1.x and 2.0): copy, do not fork.

export const SITE = 'https://groupiron.com';
export const LEADERBOARD_PATH = '/leaderboard';

// only groupiron.com should be found; copies (beta.groupiron.com, a self-hosted one, localhost) ask to be left out
const MAIN_HOST = /^(www\.)?groupiron\.com$/.test(window.location.hostname);

// the home page keeps the title and description written in index.html (they differ between 1.x and 2.0)
const HOME = {
  path: '/',
  title: document.title,
  description: document.head.querySelector('meta[name="description"]')?.content ?? '',
};
const LEADERBOARD = {
  path: LEADERBOARD_PATH,
  title: 'RS3 Group Ironman Leaderboard: top GIM groups and players | RS3 GIM Companion',
  description: 'Which RuneScape 3 Group Ironman groups gained the most XP this week, month and year. Top groups and players, clue scrolls, boss kills, 99s and 120s, filtered by Regular, Hardcore and Competitive and by group size.',
};

// ── Group addresses ──────────────────────────────────────────────────────────
// The number is what counts; the name part only makes the link readable (a renamed group keeps working).
export function slugify(name) {
  return String(name || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
export function groupPath(id, name) {
  const slug = slugify(name);
  return `/group/${id}${slug ? `/${slug}` : ''}`;
}

// What the address bar asks for: { view: 'leaderboard' } | { view: 'group', id } | { view: 'home' }
export function readUrl() {
  const path = window.location.pathname.replace(/\/+$/, '');
  if (path === LEADERBOARD_PATH || window.location.hash === '#global') return { view: 'leaderboard' };  // old links used /#global
  const m = path.match(/^\/group\/(\d+)(?:\/|$)/);
  if (m) return { view: 'group', id: Number(m[1]) };
  return { view: 'home' };
}
export const isLeaderboardUrl = () => readUrl().view === 'leaderboard';
export const groupIdFromUrl = () => { const u = readUrl(); return u.view === 'group' ? u.id : null; };

// ── Head tags ────────────────────────────────────────────────────────────────
function setMeta(attr, key, value) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', value);
}

function apply(page, { noindex = false } = {}) {
  document.title = page.title;
  setMeta('name', 'description', page.description);
  setMeta('name', 'robots', !MAIN_HOST || noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large');
  setMeta('property', 'og:title', page.title);
  setMeta('property', 'og:description', page.description);
  setMeta('property', 'og:url', SITE + page.path);
  setMeta('name', 'twitter:title', page.title);
  setMeta('name', 'twitter:description', page.description);
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
  link.href = SITE + page.path;
}
apply(HOME);

const MODE = { regular: 'Regular', hardcore: 'Hardcore', competitive: 'Competitive' };
const fmtXp = n => (n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${Math.round(n / 1e6)}M` : `${n || 0}`);

export const seoHome = () => apply(HOME);
export const seoLeaderboard = () => apply(LEADERBOARD);

// One group: its name in the title, mode, size, members and total XP in the description. Unlisted groups and the demo
// group are never offered to search engines.
export function seoGroup(group) {
  if (!group) return;
  const players = group.players || [];
  const mode = MODE[group.gim_type] || '';
  const size = group.gim_size || players.length;
  const names = players.map(p => String(p.rsn || '').replace(/\s/g, ' ')).filter(Boolean);
  const who = names.length ? ` Members: ${names.slice(0, 5).join(', ')}${names.length > 5 ? ` and ${names.length - 5} more` : ''}.` : '';
  const xp = group.group_total_xp ? ` ${fmtXp(group.group_total_xp)} total XP.` : '';
  apply({
    path: groupPath(group.id, group.name),
    title: `${group.name}: RS3 ${mode ? `${mode} ` : ''}Group Ironman | RS3 GIM Companion`,
    description: `${group.name} is a ${mode ? `${mode} ` : ''}RuneScape 3 Group Ironman group${size ? ` of ${size}` : ''}.${who}${xp} XP gains, skills, boss kills, drops and goals on RS3 GIM Companion.`,
  }, { noindex: !!(group.is_demo || group.settings?.unlisted) });
}
