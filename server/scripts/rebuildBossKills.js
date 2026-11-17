/**
 * Rebuild the boss_kills table from every player's stored activity history.
 *
 *   node server/scripts/rebuildBossKills.js
 *
 * Why: v1.9.10 briefly wrote bogus Corporeal Beast / General Graardor kill counts
 * (it read the hiscores' Leagues scores as boss kills — the hiscores have no boss
 * kill counts), and kill events were previously counted with the wrong semantics.
 * This wipes boss_kills + boss_kill_log and replays player_activities oldest-first
 * through the current counting logic. Silent: no Discord notifications are sent.
 * Safe to re-run.
 */
const path = require('path');
process.chdir(path.join(__dirname, '..'));
const db = require('../database');
const { autoCountBossKills } = require('../services/activitySync');

const players = db.prepare('SELECT id, rsn FROM players').all();
const before = db.prepare('SELECT COUNT(*) n, COALESCE(SUM(kills), 0) k FROM boss_kills').get();

db.prepare('DELETE FROM boss_kills').run();
db.prepare('DELETE FROM boss_kill_log').run();

const history = db.prepare(`
  SELECT date_str AS date, text, details FROM player_activities
  WHERE player_id = ? ORDER BY ts ASC, id ASC
`);
for (const p of players) autoCountBossKills(p.id, history.all(p.id), { silent: true });

const after = db.prepare('SELECT COUNT(*) n, COALESCE(SUM(kills), 0) k FROM boss_kills').get();
console.log(`Players replayed : ${players.length}`);
console.log(`Before           : ${before.n} rows, ${before.k} total kills`);
console.log(`After            : ${after.n} rows, ${after.k} total kills`);
process.exit(0);
