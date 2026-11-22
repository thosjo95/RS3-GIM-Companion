// GET /api/global/stats: the Global Leaderboard page (every tracked group, public data only, cached 10 minutes)
const express = require('express');
const { globalStats } = require('../services/globalStats');

const router = express.Router();

router.get('/stats', (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=120');
    res.json(globalStats());
  } catch (err) {
    console.error('[global] stats failed:', err.message);
    res.status(500).json({ error: 'Could not build the global stats' });
  }
});

module.exports = router;
