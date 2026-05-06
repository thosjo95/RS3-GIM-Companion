/**
 * Migration: populates icon_url for all rs3_bosses and rs3_milestone_items rows.
 *
 * The icon URL is derived from the wiki_url already stored on each row.
 * Formula: https://runescape.wiki/images/<PageName>.png
 * where <PageName> is the path segment after /w/ in the wiki URL.
 *
 * Run once (safe to re-run — idempotent UPDATE):
 *   node server/scripts/addBossIcons.js
 *
 * The icon_url columns are added automatically by database.js migrations on first
 * server start — this script just populates the values.
 */

const path = require('path');
process.chdir(path.join(__dirname, '..'));
const db = require('../database');

// ── Helper: derive RS3 wiki image URL from wiki article URL ───────────────────
function wikiImageUrl(wikiUrl) {
  if (!wikiUrl) return null;
  const pageName = wikiUrl.split('/w/').pop(); // e.g. "Giant_Mole"
  return `https://runescape.wiki/images/${pageName}.png`;
}

// ── Populate rs3_bosses ───────────────────────────────────────────────────────
const bosses = db.prepare('SELECT id, name, wiki_url FROM rs3_bosses').all();
let bossHit = 0;

const updateBoss = db.prepare('UPDATE rs3_bosses SET icon_url = ? WHERE id = ?');
for (const b of bosses) {
  const url = wikiImageUrl(b.wiki_url);
  if (url) { updateBoss.run(url, b.id); bossHit++; }
}
console.log(`rs3_bosses   — updated ${bossHit}/${bosses.length} icon_url fields`);

// ── Populate rs3_milestone_items ──────────────────────────────────────────────
const milestones = db.prepare('SELECT id, name, wiki_url FROM rs3_milestone_items').all();
let mHit = 0;

const updateMilestone = db.prepare('UPDATE rs3_milestone_items SET icon_url = ? WHERE id = ?');
for (const m of milestones) {
  const url = wikiImageUrl(m.wiki_url);
  if (url) { updateMilestone.run(url, m.id); mHit++; }
}
console.log(`rs3_milestone_items — updated ${mHit}/${milestones.length} icon_url fields`);

// ── Summary ───────────────────────────────────────────────────────────────────
const total = db.prepare('SELECT COUNT(*) AS n FROM rs3_bosses WHERE icon_url IS NOT NULL').get().n;
console.log(`\nDone. ${total} bosses now have icon_url set.`);
console.log('Sample boss icons:');
db.prepare("SELECT name, icon_url FROM rs3_bosses WHERE icon_url IS NOT NULL LIMIT 5").all()
  .forEach(r => console.log(`  ${r.name}: ${r.icon_url}`));
