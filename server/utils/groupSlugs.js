// Group addresses by name: groupiron.com/<name-slug> (lower case, words joined by "-").
// Some names are used by more than one group (mostly the same team added twice). The plain name then goes to the group
// that has members, is claimed and was active most recently; the others get their number added: /<name-slug>-<id>.
// That longer form works for every group, so a link never breaks when the plain name moves to another group.
// Same file in both repos (1.x and 2.0): copy, do not fork.
const db = require('../database');

// words the site itself uses as addresses; a group with such a name gets its number added
const RESERVED = new Set(['leaderboard', 'admin', 'api', 'assets', 'group', 'groups', 'global', 'docs', 'privacy', 'index-html']);
const KEEP_MS = 60 * 1000;
let cache = { at: 0, byId: new Map(), bySlug: new Map() };

// the same as slugify in client/src/lib/seo.js
function slugify(name) {
  return String(name || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

function build() {
  const cols = new Set(db.prepare('PRAGMA table_info(groups)').all().map(c => c.name));
  const rows = db.prepare(`SELECT g.id, g.name, g.last_activity,
      (g.password_hash IS NOT NULL) AS claimed,
      (SELECT COUNT(*) FROM players p WHERE p.group_id = g.id) AS members
      ${cols.has('is_demo') ? ', COALESCE(g.is_demo, 0) AS demo' : ', 0 AS demo'}
    FROM groups g`).all();
  // best first: has members, claimed, not the demo, most recent activity, oldest
  rows.sort((a, b) => (b.members > 0) - (a.members > 0) || b.claimed - a.claimed || a.demo - b.demo
    || String(b.last_activity || '').localeCompare(String(a.last_activity || '')) || a.id - b.id);
  const byId = new Map(), bySlug = new Map();
  for (const r of rows) {
    const base = slugify(r.name) || 'group';
    let slug = bySlug.has(base) || RESERVED.has(base) ? `${base}-${r.id}` : base;
    if (bySlug.has(slug)) slug = `${base}-g${r.id}`;     // only if a name like "Foo 12" already took "foo-12"
    byId.set(r.id, slug);
    bySlug.set(slug, r.id);
  }
  cache = { at: Date.now(), byId, bySlug };
}
const fresh = () => { if (Date.now() - cache.at > KEEP_MS) build(); };

// the address name of one group
function slugFor(id) {
  fresh();
  if (!cache.byId.has(Number(id))) build();             // a group made in the last minute
  return cache.byId.get(Number(id)) ?? `group-${id}`;
}

// which group an address name means (null when none): the plain name, or any group's "<name>-<id>"
function idForSlug(slug) {
  const s = String(slug || '').toLowerCase();
  fresh();
  if (!cache.bySlug.has(s)) build();
  if (cache.bySlug.has(s)) return cache.bySlug.get(s);
  const m = s.match(/^(.*)-(\d+)$/);
  if (m && cache.byId.has(Number(m[2]))) {
    const own = cache.byId.get(Number(m[2]));
    if ((slugify(m[1]) || 'group') === own.replace(new RegExp(`-${m[2]}$`), '')) return Number(m[2]);
  }
  return null;
}

module.exports = { slugify, slugFor, idForSlug, _reset: () => { cache.at = 0; } };
