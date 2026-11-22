// GET /api/global/stats: the Global Leaderboard page (every tracked group, public data only, cached 10 minutes).
// The answer is about 200 KB of JSON; this server has no compression middleware, so it is gzipped here (about 36 KB).
const express = require('express');
const zlib = require('zlib');
const { globalStats } = require('../services/globalStats');

const router = express.Router();
let packed = { stats: null, json: null, gz: null };

router.get('/stats', (req, res) => {
  try {
    const stats = globalStats();
    if (packed.stats !== stats) {                   // a new build: pack it once, not on every request
      const json = Buffer.from(JSON.stringify(stats));
      packed = { stats, json, gz: zlib.gzipSync(json) };
    }
    res.set('Cache-Control', 'public, max-age=120');
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.set('Vary', 'Accept-Encoding');
    if (/\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
      res.set('Content-Encoding', 'gzip');
      return res.send(packed.gz);
    }
    res.send(packed.json);
  } catch (err) {
    console.error('[global] stats failed:', err.message);
    res.status(500).json({ error: 'Could not build the global stats' });
  }
});

module.exports = router;
