// Page title, description and canonical address for search engines and link previews.
// The site is one page app, so these are set here when the view changes; Google runs the script and reads them.
// The canonical address always names groupiron.com (also on beta and localhost), so copies are never ranked on their own.
// Same file in both repos (1.x and 2.0): copy, do not fork.

export const SITE = 'https://groupiron.com';
export const LEADERBOARD_PATH = '/leaderboard';

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

function setMeta(attr, key, value) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', value);
}

// copies of the site (beta.groupiron.com, a self-hosted one) ask search engines to leave them out: only groupiron.com
// should be found, and beta runs a copy of the same groups
if (!/^(www\.)?groupiron\.com$/.test(window.location.hostname)) setMeta('name', 'robots', 'noindex, follow');

function apply(page, extraTitle) {
  const title = extraTitle ? `${extraTitle} | RS3 GIM Companion` : page.title;
  document.title = title;
  setMeta('name', 'description', page.description);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', page.description);
  setMeta('property', 'og:url', SITE + page.path);
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', page.description);
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
  link.href = SITE + page.path;
}

// the first-visit page and every group page share the home address (group views have no address of their own)
export const seoHome = groupName => apply(HOME, groupName ? `${groupName}: RS3 Group Ironman` : null);
export const seoLeaderboard = () => apply(LEADERBOARD);

// old links used /#global for the leaderboard
export const isLeaderboardUrl = () =>
  window.location.pathname.replace(/\/+$/, '') === LEADERBOARD_PATH || window.location.hash === '#global';
