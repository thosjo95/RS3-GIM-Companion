const express = require('express');
const router  = express.Router();
const db      = require('../database');

// Helper: parse JSON fields from DB rows
function parseRow(row, jsonFields) {
  if (!row) return row;
  const out = { ...row };
  for (const f of jsonFields) {
    if (typeof out[f] === 'string') {
      try { out[f] = JSON.parse(out[f]); } catch { out[f] = null; }
    }
  }
  return out;
}

function parseRows(rows, jsonFields) {
  return rows.map(r => parseRow(r, jsonFields));
}

// GET /api/rs3/bosses
router.get('/bosses', (req, res) => {
  const { difficulty, search } = req.query;
  let sql = 'SELECT * FROM rs3_bosses';
  const params = [];
  const where = [];
  if (difficulty) { where.push('difficulty = ?'); params.push(difficulty); }
  if (search)     { where.push("(name LIKE ? OR id LIKE ?)"); params.push(`%${search}%`, `%${search}%`); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += " ORDER BY CASE difficulty WHEN 'early' THEN 1 WHEN 'mid' THEN 2 WHEN 'end' THEN 3 ELSE 4 END, name";
  const rows = db.prepare(sql).all(...params);
  res.json(parseRows(rows, ['requirements', 'drops']));
});

// GET /api/rs3/bosses/:id
router.get('/bosses/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM rs3_bosses WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Boss not found' });
  res.json(parseRow(row, ['requirements', 'drops']));
});

// GET /api/rs3/quests
router.get('/quests', (req, res) => {
  const { search } = req.query;
  let sql = 'SELECT * FROM rs3_quests';
  const params = [];
  if (search) { sql += ' WHERE (name LIKE ? OR series LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY name';
  const rows = db.prepare(sql).all(...params);
  res.json(parseRows(rows, ['requirements', 'rewards']));
});

// GET /api/rs3/gear/items
router.get('/gear/items', (req, res) => {
  const { style, slot, tier_min, search } = req.query;
  let sql = 'SELECT * FROM rs3_gear_items';
  const params = [];
  const where = [];
  if (style)    { where.push('style = ?');   params.push(style); }
  if (slot)     { where.push('slot = ?');    params.push(slot); }
  if (tier_min) { where.push('tier >= ?');   params.push(Number(tier_min)); }
  if (search)   { where.push('name LIKE ?'); params.push(`%${search}%`); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY tier ASC, name';
  const rows = db.prepare(sql).all(...params);
  res.json(parseRows(rows, ['stats']));
});

// GET /api/rs3/gear/paths
router.get('/gear/paths', (req, res) => {
  const { style, slot } = req.query;
  let sql = 'SELECT * FROM rs3_gear_paths';
  const params = [];
  const where = [];
  if (style) { where.push('style = ?'); params.push(style); }
  if (slot)  { where.push('slot = ?');  params.push(slot); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  const rows = db.prepare(sql).all(...params);
  res.json(parseRows(rows, ['progression']));
});

// GET /api/rs3/milestones
router.get('/milestones', (req, res) => {
  const { category, tier_impact, search } = req.query;
  let sql = 'SELECT * FROM rs3_milestone_items';
  const params = [];
  const where = [];
  if (category)    { where.push('category = ?');    params.push(category); }
  if (tier_impact) { where.push('tier_impact = ?'); params.push(tier_impact); }
  if (search)      { where.push('(name LIKE ? OR why_important LIKE ? OR how_to_obtain LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += " ORDER BY CASE tier_impact WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END, name";
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// GET /api/rs3/slayer
router.get('/slayer', (req, res) => {
  const { search, min_level } = req.query;
  let sql = 'SELECT * FROM rs3_slayer_creatures';
  const params = [];
  const where = [];
  if (search)    { where.push('name LIKE ?'); params.push(`%${search}%`); }
  if (min_level) { where.push('slayer_level_req >= ?'); params.push(Number(min_level)); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY slayer_level_req, name';
  const rows = db.prepare(sql).all(...params);
  res.json(parseRows(rows, ['notable_drops']));
});

// GET /api/rs3/skill-milestones
router.get('/skill-milestones', (req, res) => {
  const { skill } = req.query;
  let sql = 'SELECT * FROM rs3_skill_milestones';
  const params = [];
  if (skill) { sql += ' WHERE skill = ?'; params.push(skill); }
  sql += ' ORDER BY skill, level';
  res.json(db.prepare(sql).all(...params));
});

// GET /api/rs3/items — gear items with icon URLs (replaces static gearSuggestions.js as source)
// Returns items shaped like { id, name, tier, style, slot, reqs, quest, icon_url, wiki_url, ... }
router.get('/items', (req, res) => {
  const { style, slot, tier_min, tier_max, source_id, search } = req.query;
  let sql = 'SELECT * FROM rs3_gear_items';
  const params = [];
  const where = [];
  if (style)     { where.push('(style = ? OR style = \'all\')'); params.push(style); }
  if (slot)      { where.push('slot = ?');            params.push(slot); }
  if (tier_min)  { where.push('tier >= ?');           params.push(Number(tier_min)); }
  if (tier_max)  { where.push('tier <= ?');           params.push(Number(tier_max)); }
  if (source_id) { where.push('source_id = ?');       params.push(source_id); }
  if (search)    { where.push('(name LIKE ? OR id LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY tier DESC, name';
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(r => ({
    ...r,
    // Expose reqs in the same shape as gearSuggestions.js i() helper: { name, reqs, quest }
    reqs: (() => { try { return JSON.parse(r.requirements_json) || null; } catch { return null; } })(),
    stats: (() => { try { return JSON.parse(r.stats); } catch { return {}; } })(),
  })));
});

// ── Suggestions endpoint — used by GoalsTab as replacement for static file ────
// Returns boss + quest + milestone data shaped like goalSuggestions.js entries.
router.get('/suggestions', (req, res) => {
  const { stage, category } = req.query;

  const suggestions = [];

  // ── Bosses → boss_kill category ──────────────────────────────────────────
  let bossQ = 'SELECT * FROM rs3_bosses';
  const bossP = [];
  if (stage) { bossQ += ' WHERE difficulty = ?'; bossP.push(stage); }
  bossQ += " ORDER BY CASE difficulty WHEN 'early' THEN 1 WHEN 'mid' THEN 2 WHEN 'end' THEN 3 ELSE 4 END, name";

  const bosses = db.prepare(bossQ).all(...bossP);
  for (const b of bosses) {
    let reqs, drops;
    try { reqs  = JSON.parse(b.requirements); } catch { reqs  = {}; }
    try { drops = JSON.parse(b.drops);        } catch { drops = []; }

    suggestions.push({
      id:          `boss_${b.id}`,
      title:       b.name,
      description: drops.length
        ? `Drops: ${drops.slice(0, 3).map(d => d.name).join(', ')}${drops.length > 3 ? ` +${drops.length - 3} more` : ''}`
        : b.name,
      stage:       b.difficulty,
      category:    'boss_kill',
      priority:    b.difficulty === 'end' ? 'high' : b.difficulty === 'mid' ? 'medium' : 'low',
      wikiUrl:     b.wiki_url,
      requirements: reqs,
      unlocks:     drops.map(d => d.name),
      _raw:        b,
    });
  }

  // ── Milestones → important_item category ─────────────────────────────────
  if (!category || category === 'important_item') {
    const milestones = db.prepare("SELECT * FROM rs3_milestone_items ORDER BY CASE tier_impact WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, name").all();
    for (const m of milestones) {
      const mStage = m.tier_impact === 'critical' || m.tier_impact === 'high' ? 'end' : m.tier_impact === 'medium' ? 'mid' : 'early';
      if (stage && mStage !== stage) continue;
      suggestions.push({
        id:          `milestone_${m.id}`,
        title:       m.name,
        description: m.why_important || m.how_to_obtain || '',
        stage:       mStage,
        category:    'important_item',
        priority:    m.tier_impact === 'critical' ? 'high' : m.tier_impact === 'high' ? 'high' : 'medium',
        wikiUrl:     m.wiki_url,
        requirements: {},
        unlocks:     [m.name],
        _raw:        m,
      });
    }
  }

  // Filter by category if requested
  const filtered = category ? suggestions.filter(s => s.category === category) : suggestions;
  res.json(filtered);
});

// GET /api/rs3/item-search?q=QUERY — proxy to RS3 wiki opensearch (items only)
router.get('/item-search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q || q.length < 2) return res.json([]);
  try {
    const url = `https://runescape.wiki/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=15&namespace=0&format=json`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'RS3-GIM-Companion/1.0 (github.com/thosjo95)' },
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return res.json([]);
    const data = await r.json();
    // Format: [searchTerm, [titles], [descs], [urls]]
    const titles = (Array.isArray(data[1]) ? data[1] : [])
      .filter(t => !t.includes(':'))  // drop Category:, File:, Exchange: etc.
      .slice(0, 12);
    const items = titles.map(name => ({
      name,
      icon_url: `https://runescape.wiki/images/${name.replace(/ /g, '_')}.png`,
    }));
    res.json(items);
  } catch {
    res.json([]);
  }
});

module.exports = router;
