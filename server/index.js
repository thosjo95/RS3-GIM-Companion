const express = require('express');
const cors    = require('cors');
const cron    = require('node-cron');
const db      = require('./database');

const app  = express();
const PORT = process.env.PORT || 3001;

// Server sits behind Nginx (and Cloudflare in front of that) — without this,
// req.ip resolves to the Nginx hop for every request, which silently breaks
// all per-IP rate limiting (including the existing admin login lockout).
app.set('trust proxy', 1);

app.disable('x-powered-by');

// In production nginx serves the client and proxies /api from the same origin, so
// CORS is only needed for local dev (vite on :5173). Override with CORS_ORIGINS.
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS
  || 'https://groupiron.com,https://www.groupiron.com,http://localhost:5173').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || ALLOWED_ORIGINS.includes(origin)),
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Group-Id', 'X-Group-Password'],
}));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

// Small body limit everywhere except the snapshot upload (base64 PNG), which
// installs its own larger parser on that one route.
const smallJson = express.json({ limit: '100kb' });
app.use((req, res, next) => (req.path.endsWith('/share-snapshot') ? next() : smallJson(req, res, next)));

const { createRateLimiter } = require('./utils/rateLimit');

// Global safety net — generous, just to blunt a runaway script.
// Individual routes below add tighter limits on expensive/external-fanout endpoints.
app.use('/api', createRateLimiter({ windowMs: 60_000, max: 300 }));

app.use('/api/groups',       require('./routes/groups'));
app.use('/api/players',      require('./routes/players'));
app.use('/api/goals',        require('./routes/goals'));
app.use('/api/drops',        require('./routes/drops'));
app.use('/api/achievements', require('./routes/achievements'));
app.use('/api/boss-kills',   require('./routes/bossKills'));
app.use('/api/group-notes',  require('./routes/groupNotes'));
app.use('/api/equipment',    require('./routes/equipment'));
app.use('/api/firsts',            require('./routes/firsts'));
app.use('/api/skill-milestones',  require('./routes/skillMilestones'));
app.use('/api/rs3',          require('./routes/rs3data'));
app.use('/api/admin',        require('./routes/admin'));
app.use('/api/global',       require('./routes/global'));
app.use('/api',              require('./routes/sitemap'));   // /api/sitemap.xml for search engines

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── 2-hour activity sync ───────────────────────────────────────────────────────
// Fetches the 20 most recent Adventurer's Log events for every tracked player and
// persists NEW entries to the player_activities table (INSERT OR IGNORE —
// re-fetching never duplicates). Detectors (drops, diaries, boss kills,
// milestones) only fire on newly inserted rows so notifications never repeat.
// Batched fetching: 10 players per batch, 1s within batch, 60s between batches.
// Looks more human-like than a steady drip and avoids sustained-rate throttling.
// 306 players → ~31 batches → ~34 minutes total — well within the 2h window.
const BATCH_SIZE        = 10;
const WITHIN_BATCH_MS   = 1000;  // 1s between players inside a batch
const BETWEEN_BATCH_MS  = 60000; // 60s pause between batches

cron.schedule('0 */2 * * *', async () => {
  const { fetchPlayerEvents } = require('./services/runescape');
  const { saveActivities, autoLogDrops, autoDetectDiaries, autoCountBossKills, autoDetectLevelMilestones, autoCompleteQuestGoals } = require('./services/activitySync');

  const players = db.prepare('SELECT * FROM players WHERE group_id IS NOT NULL').all();
  const batches = Math.ceil(players.length / BATCH_SIZE);
  console.log(`[2h cron] Syncing Adventurer's Log events for ${players.length} player(s) in ${batches} batch(es)…`);

  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    try {
      const rm = await fetchPlayerEvents(player.rsn);
      const newActivities = saveActivities(player.id, rm.activities);
      if (newActivities.length > 0) {
        autoLogDrops(player.id, newActivities);
        autoDetectDiaries(player.id, newActivities);
        autoCountBossKills(player.id, newActivities);
        autoDetectLevelMilestones(player.id, newActivities);
        autoCompleteQuestGoals(player.id, newActivities);
      }
    } catch (err) {
      console.error(`[2h cron] ${player.rsn}: ${err.message}`);
    }

    const isLastInBatch  = (i + 1) % BATCH_SIZE === 0;
    const isLastPlayer   = i + 1 === players.length;

    if (!isLastPlayer) {
      if (isLastInBatch) {
        console.log(`[2h cron] Batch ${Math.floor(i / BATCH_SIZE) + 1}/${batches} done — pausing 60s…`);
        await new Promise(r => setTimeout(r, BETWEEN_BATCH_MS));
      } else {
        await new Promise(r => setTimeout(r, WITHIN_BATCH_MS));
      }
    }
  }

  console.log(`[2h cron] Done.`);
});

// ── Daily snapshot cron ────────────────────────────────────────────────────────
// Runs at midnight every day — syncs hiscores (skills, clue scrolls, RuneScore).
cron.schedule('0 0 * * *', async () => {
  const { fetchHiscores, fetchPlayerEvents, calcCombatLevel } = require('./services/runescape');
  const { saveActivities, autoLogDrops, autoDetectDiaries, autoCountBossKills, autoDetectLevelMilestones, autoCompleteQuestGoals } = require('./services/activitySync');

  const players = db.prepare('SELECT * FROM players').all();
  const today   = new Date().toISOString().slice(0, 10);

  for (const player of players) {
    try {
      const [data, rm] = await Promise.all([
        fetchHiscores(player.rsn),
        fetchPlayerEvents(player.rsn).catch(() => null),
      ]);
      const combat = calcCombatLevel(data.skills);

      // stats_json: hiscores activities (clue scrolls, RuneScore…). The quest counts are
      // written by the player sync routes, so carry the previous values over.
      let prevStats = {};
      try { prevStats = player.stats_json ? JSON.parse(player.stats_json) : {}; } catch { /* corrupt — ignore */ }
      const statsJson = JSON.stringify({
        activities:     data.activities,
        questsComplete: prevStats.questsComplete ?? null,
        questsStarted:  prevStats.questsStarted  ?? null,
      });
      const activitiesJson = rm ? JSON.stringify(rm.activities) : null;

      db.prepare(
        'UPDATE players SET last_synced = CURRENT_TIMESTAMP, combat_level = ?, stats_json = ?, activities_json = COALESCE(?, activities_json) WHERE id = ?'
      ).run(combat, statsJson, activitiesJson, player.id);

      db.runTransaction(() => {
        const upsert = db.prepare(`
          INSERT INTO skills (player_id, skill_name, level, xp, rank)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(player_id, skill_name) DO UPDATE SET
            level = excluded.level, xp = excluded.xp, rank = excluded.rank
        `);
        for (const [name, s] of Object.entries(data.skills)) {
          upsert.run(player.id, name, s.level, s.xp, s.rank ?? -1);
        }
      });

      db.prepare(`
        INSERT INTO snapshots (player_id, snapshot_date, total_xp, total_level, skills_json)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(player_id, snapshot_date) DO NOTHING
      `).run(player.id, today, data.totalXp, data.totalLevel, JSON.stringify(data.skills));

      if (rm?.activities) {
        const newActivities = saveActivities(player.id, rm.activities);
        if (newActivities.length > 0) {
          autoLogDrops(player.id, newActivities);
          autoDetectDiaries(player.id, newActivities);
          autoCountBossKills(player.id, newActivities);
          autoDetectLevelMilestones(player.id, newActivities);
          autoCompleteQuestGoals(player.id, newActivities);
        }
      }

      console.log(`[daily cron] Snapshotted ${player.rsn}`);
    } catch (err) {
      console.error(`[daily cron] Failed ${player.rsn}: ${err.message}`);
    }
  }
});

// ── Cleanup cron ───────────────────────────────────────────────────────────────
// Runs at 2am every day — removes groups inactive for 30+ days.
cron.schedule('0 2 * * *', () => {
  try {
    const stale = db.prepare(
      "SELECT id FROM groups WHERE last_activity IS NOT NULL AND last_activity < datetime('now', '-30 days')"
    ).all();
    for (const group of stale) {
      db.prepare('DELETE FROM groups WHERE id = ?').run(group.id);
      console.log(`[cleanup cron] Deleted stale group ${group.id}`);
    }
    if (stale.length) console.log(`[cleanup cron] Removed ${stale.length} inactive group(s)`);
  } catch (err) {
    console.error(`[cleanup cron] Failed: ${err.message}`);
  }
});

// Unknown /api routes → JSON 404; uncaught route errors → JSON 500 (no stack leak).
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large' });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  console.error(`[error] ${req.method} ${req.originalUrl}: ${err?.stack || err}`);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Express 4 doesn't route async-handler rejections to the error middleware, and
// Node 22 exits on unhandled rejections — log instead of taking the whole app down.
process.on('unhandledRejection', err => console.error('[unhandledRejection]', err));

app.listen(PORT, () => {
  console.log(`RS3 GIM Companion server running on http://localhost:${PORT}`);
});
