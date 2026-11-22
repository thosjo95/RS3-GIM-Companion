// GET /api/sitemap.xml: the list of pages for search engines: home, the Global Leaderboard and one page per tracked group
// (/group/<id>/<name>). robots.txt points here. Unlisted groups, the demo group and groups without members are left out.
// Same file in both repos (1.x and 2.0): copy, do not fork (the 2.0 columns are checked before use).
const express = require('express');
const db = require('../database');

const router = express.Router();
const SITE = 'https://groupiron.com';
const KEEP_MS = 60 * 60 * 1000;                           // built at most once an hour
let cached = { at: 0, xml: '' };

// the same slug as client/src/lib/seo.js
function slugify(name) {
  return String(name || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const day = v => {
  const d = v ? new Date(String(v).replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(String(v)) ? '' : 'Z')) : null;
  return d && !isNaN(d) ? d.toISOString().slice(0, 10) : null;
};

function build() {
  const cols = new Set(db.prepare('PRAGMA table_info(groups)').all().map(c => c.name));
  const where = ['EXISTS (SELECT 1 FROM players p WHERE p.group_id = g.id)'];
  if (cols.has('is_demo')) where.push('COALESCE(g.is_demo, 0) = 0');
  if (cols.has('settings_json')) where.push("COALESCE(json_extract(g.settings_json, '$.unlisted'), 0) = 0");
  if (cols.has('is_dev_only')) where.push('COALESCE(g.is_dev_only, 0) = 0');
  const groups = db.prepare(`SELECT g.id, g.name, g.last_activity, g.created_at FROM groups g WHERE ${where.join(' AND ')}
    ORDER BY g.last_activity DESC`).all();

  const today = new Date().toISOString().slice(0, 10);
  const url = (loc, lastmod, freq, prio) =>
    `  <url><loc>${esc(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<changefreq>${freq}</changefreq><priority>${prio}</priority></url>`;
  const lines = [
    url(`${SITE}/`, today, 'weekly', '1.0'),
    url(`${SITE}/leaderboard`, today, 'daily', '0.9'),
    ...groups.map(g => {
      const slug = slugify(g.name);
      return url(`${SITE}/group/${g.id}${slug ? `/${slug}` : ''}`, day(g.last_activity) || day(g.created_at), 'daily', '0.6');
    }),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lines.join('\n')}\n</urlset>\n`;
}

router.get('/sitemap.xml', (req, res) => {
  try {
    if (!cached.xml || Date.now() - cached.at > KEEP_MS) cached = { at: Date.now(), xml: build() };
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(cached.xml);
  } catch (err) {
    console.error('[sitemap] failed:', err.message);
    res.status(500).send('');
  }
});

module.exports = router;
module.exports._build = build;
module.exports._slugify = slugify;
