// Shared activity-sync helpers used by the 2-hour cron and the daily cron.
const db = require('../database');
const discord = require('./discord');

const DROP_PATTERNS = [
  /^I found (?:a |an )(.+?)\.?$/i,
  /^I received (?:a |an )(.+?)\.?$/i,
];

// Level milestone detection — only care about 99 and 120
const LEVEL_MILESTONE_PATTERNS = [
  // "I levelled my Slayer skill, I am now level 99."
  /I (?:levelled|leveled) my ([\w\s]+?) skill.*?(?:I am|now) (?:at )?level (\d+)/i,
  // "I've reached level 120 in Slayer." / "I achieved level 99 in Cooking."
  /I(?:'ve)? (?:reached|achieved) level (\d+) in ([\w\s]+)/i,
];

// "I completed the Easy Lumbridge & Draynor Achievement Diary."
const DIARY_PATTERN = /I completed the (Easy|Medium|Hard|Elite) (.+?) Achievement Diary\.?/i;

// ── Boss kill detection ────────────────────────────────────────────────────────
// Patterns are matched against the RuneMetrics activity text + details combined.
// Order matters: more specific patterns (e.g. Nex: AoD) must come before generic ones (Nex).
const BOSS_KILL_PATTERNS = [
  // Specific first — more specific patterns before overlapping ones
  { key: 'nex_aod',             label: 'Nex: Angel of Death',            pattern: /angel of death/i },
  { key: 'nex',                 label: 'Nex',                            pattern: /\bnex\b/i },
  { key: 'telos',               label: 'Telos, the Warden',              pattern: /\btelos\b/i },
  { key: 'vorago',              label: 'Vorago',                         pattern: /\bvorago\b/i },
  { key: 'solak',               label: 'Solak',                          pattern: /\bsolak\b/i },
  { key: 'rasial',              label: 'Rasial, the First Necromancer',  pattern: /\brasial\b/i },
  { key: 'zamorak_loe',         label: 'Zamorak, Lord of Erebus',        pattern: /lord of erebus/i },
  { key: 'raksha',              label: 'Raksha the Shadow Colossus',     pattern: /\braksha\b/i },
  { key: 'croesus',             label: 'Croesus',                        pattern: /\bcroesus\b/i },
  { key: 'araxxi',              label: 'Araxxi',                         pattern: /\baraxxi\b/i },
  { key: 'araxxor',             label: 'Araxxor',                        pattern: /\baraxxor\b/i },
  { key: 'ed1_seiryu',          label: 'Seiryu the Azure Serpent (ED1)', pattern: /\bseiryu\b/i },
  { key: 'ed2_black_stone',     label: 'Black Stone Dragon (ED2)',        pattern: /black stone dragon/i },
  { key: 'ed2_taraket',         label: 'Taraket the Necromancer (ED2)',  pattern: /\btaraket\b/i },
  { key: 'ed3_ambassador',      label: 'The Ambassador (ED3)',           pattern: /\bambassador\b/i },
  { key: 'kalphite_king',       label: 'Kalphite King',                  pattern: /kalphite king/i },
  { key: 'kalphite_queen',      label: 'Kalphite Queen',                 pattern: /kalphite queen/i },
  { key: 'corporeal_beast',     label: 'Corporeal Beast',                pattern: /corporeal beast/i },
  { key: 'general_graardor',    label: 'General Graardor',               pattern: /general graardor/i },
  { key: 'kril_tsutsaroth',     label: "K'ril Tsutsaroth",               pattern: /k.ril tsutsaroth/i },
  { key: 'commander_zilyana',   label: 'Commander Zilyana',              pattern: /commander zilyana/i },
  { key: 'kreearra',            label: "Kree'arra",                      pattern: /kree.arra/i },
  { key: 'dagannoth_kings',     label: 'Dagannoth Kings',                pattern: /dagannoth king/i },
  { key: 'helwyr',              label: 'Helwyr',                         pattern: /\bhelwyr\b/i },
  { key: 'vindicta',            label: 'Vindicta',                       pattern: /\bvindicta\b/i },
  { key: 'gregorovic',          label: 'Gregorovic',                     pattern: /\bgregorovic\b/i },
  { key: 'twin_furies',         label: 'Twin Furies',                    pattern: /twin furies/i },
  { key: 'magister',            label: 'The Magister',                   pattern: /\bmagister\b/i },
  { key: 'tztok_jad',           label: 'TzTok-Jad',                     pattern: /tztok.jad/i },
  { key: 'tzkal_zuk',           label: 'TzKal-Zuk',                     pattern: /tzkal.zuk/i },
  { key: 'har_aken',            label: 'Har-Aken',                       pattern: /har.aken/i },
  { key: 'legiones',            label: 'Legiones',                       pattern: /\blegio\b|\blegiones\b/i },
  { key: 'rex_matriarchs',      label: 'Rex Matriarchs',                 pattern: /rex matriarch/i },
  { key: 'osseous_rex',         label: 'Osseous Rex',                    pattern: /osseous rex/i },
  { key: 'beastmaster_durzag',  label: 'Beastmaster Durzag',             pattern: /beastmaster durzag|durzag/i },
  { key: 'yakamaru',            label: 'Yakamaru',                       pattern: /\byakamaru\b/i },
  { key: 'tormented_demons',    label: 'Tormented Demons',               pattern: /tormented demon/i },
  { key: 'king_black_dragon',   label: 'King Black Dragon',              pattern: /king black dragon/i },
  { key: 'queen_black_dragon',  label: 'Queen Black Dragon',             pattern: /queen black dragon/i },
  { key: 'giant_mole',          label: 'Giant Mole',                     pattern: /giant mole/i },
  { key: 'chaos_elemental',     label: 'Chaos Elemental',                pattern: /chaos elemental/i },
  { key: 'barrows',             label: 'Barrows',                        pattern: /\bbarrows\b/i },
];

// Texts that mention a boss name but are NOT kill events (drops, diary, level-ups, etc.)
const SKIP_PATTERNS = [
  /^I found (?:a |an )/i,
  /^I received (?:a |an )/i,
  /I completed the .+ Achievement Diary/i,
  /I (?:levelled|achieved|reached) (?:my )?/i,
  /I completed the quest/i,
];

/**
 * Try to extract an absolute kill count from an activity's details string.
 * RS3 RuneMetrics often includes the cumulative kill count in the details field,
 * e.g. "Your kill count is: 1,285" or "You've killed Nex 157 times."
 * Returns null if no count can be reliably extracted.
 */
function extractKillCount(details) {
  if (!details) return null;
  const patterns = [
    /kill count[:\s]+(\d[\d,\s]*)/i,
    /killed.*?(\d[\d,\s]+)\s*times?/i,
    /(\d[\d,\s]+)\s*times?/i,
    /count[:\s]+(\d[\d,\s]*)/i,
  ];
  for (const p of patterns) {
    const m = details.match(p);
    if (m) {
      const n = parseInt(m[1].replace(/[\s,]/g, ''), 10);
      if (!isNaN(n) && n > 0) return n;
    }
  }
  return null;
}

module.exports.BOSS_KILL_PATTERNS = BOSS_KILL_PATTERNS;

function parseActivityDate(str) {
  if (!str) return new Date().toISOString();
  try {
    const d = new Date(str.replace(/(\d+)-(\w+)-(\d+)/, '$2 $1 $3'));
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch { return new Date().toISOString(); }
}

/** Normalise a RuneMetrics region name into a stable diary key prefix */
function diaryRegionKey(region) {
  return region.toLowerCase().replace(/['\s&]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
}

/** Auto-insert drop log entries from activity text ("I found a Dragon platebody.") */
function autoLogDrops(playerId, activities) {
  if (!activities?.length) return;
  for (const act of activities) {
    for (const pattern of DROP_PATTERNS) {
      const match = act.text?.match(pattern);
      if (match) {
        const itemName = match[1].trim();
        const droppedAt = parseActivityDate(act.date);
        const dayStr = droppedAt.slice(0, 10);
        const existing = db.prepare(
          "SELECT id FROM drops WHERE player_id = ? AND item_name = ? AND date(dropped_at) = ?"
        ).get(playerId, itemName, dayStr);
        if (!existing) {
          db.prepare(
            'INSERT INTO drops (player_id, item_name, notes, dropped_at) VALUES (?, ?, ?, ?)'
          ).run(playerId, itemName, 'Auto-detected from activity feed', droppedAt);
          discord.notifyDrop(playerId, itemName);
        }
        break;
      }
    }
  }
}

/** Detect achievement diary completions and persist them to the achievements table */
function autoDetectDiaries(playerId, activities) {
  if (!activities?.length) return;
  for (const act of activities) {
    const match = act.text?.match(DIARY_PATTERN);
    if (!match) continue;
    const tier   = match[1].toLowerCase();
    const region = match[2];
    const key    = `diary_${diaryRegionKey(region)}_${tier}`;
    const achievedAt = parseActivityDate(act.date);
    // INSERT OR IGNORE — once marked, never overwrite the date
    const result = db.prepare(
      'INSERT OR IGNORE INTO achievements (player_id, type, key, achieved, achieved_at, manual) VALUES (?, ?, ?, 1, ?, 0)'
    ).run(playerId, 'diary', key, achievedAt);
    if (result.changes > 0) discord.notifyDiary(playerId, match[1], region);
  }
}

/**
 * Detect boss kills from RuneMetrics activities and persist them.
 *
 * Strategy (in priority order):
 *  1. If the activity details contain a cumulative kill count (e.g. "Kill count: 157"),
 *     store that as the authoritative total (taking the maximum seen so far).
 *  2. Otherwise, record the activity as +1 kill using a dedup log so we never
 *     double-count the same activity across multiple syncs.
 */
function autoCountBossKills(playerId, activities) {
  if (!activities?.length) return;

  const upsertAbsolute = db.prepare(`
    INSERT INTO boss_kills (player_id, boss_key, kills, last_seen)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(player_id, boss_key) DO UPDATE SET
      kills     = MAX(kills, excluded.kills),
      last_seen = CASE WHEN excluded.kills >= kills THEN excluded.last_seen ELSE last_seen END
  `);

  const upsertIncrement = db.prepare(`
    INSERT INTO boss_kills (player_id, boss_key, kills, last_seen)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(player_id, boss_key) DO UPDATE SET
      kills     = kills + 1,
      last_seen = excluded.last_seen
  `);

  const logSig = db.prepare(
    'INSERT OR IGNORE INTO boss_kill_log (player_id, activity_sig) VALUES (?, ?)'
  );

  for (const act of activities) {
    const text = (act.text || '').trim();

    // Skip non-kill activity types
    if (SKIP_PATTERNS.some(p => p.test(text))) continue;

    // Only process activities that look like combat outcomes
    if (!/defeat|kill|slay|vanquish/i.test(text) && !/died|dead/i.test(text)) continue;

    const combined = text + ' ' + (act.details || '');

    for (const boss of BOSS_KILL_PATTERNS) {
      if (!boss.pattern.test(combined)) continue;

      const killCount = extractKillCount(act.details);
      const seenAt = parseActivityDate(act.date);

      if (killCount !== null) {
        // Absolute count from details — most accurate
        const prev = db.prepare('SELECT kills FROM boss_kills WHERE player_id = ? AND boss_key = ?').get(playerId, boss.key);
        upsertAbsolute.run(playerId, boss.key, killCount, seenAt);
        if (!prev || prev.kills === 0) discord.notifyBossFirstKill(playerId, boss.label);
      } else {
        // Fall back to +1 with dedup
        const sig = `${boss.key}:${act.date || ''}:${text.slice(0, 80)}`;
        const inserted = logSig.run(playerId, sig);
        if (inserted.changes > 0) {
          const prev = db.prepare('SELECT kills FROM boss_kills WHERE player_id = ? AND boss_key = ?').get(playerId, boss.key);
          upsertIncrement.run(playerId, boss.key, seenAt);
          if (!prev || prev.kills === 0) discord.notifyBossFirstKill(playerId, boss.label);
        }
      }
      break; // Only match the first (most specific) boss pattern
    }
  }
}

/** Detect level 99 and 120 milestones from activity feed and fire Discord notifications */
function autoDetectLevelMilestones(playerId, activities) {
  if (!activities?.length) return;
  for (const act of activities) {
    const text = act.text || '';
    for (const pattern of LEVEL_MILESTONE_PATTERNS) {
      const m = text.match(pattern);
      if (!m) continue;
      // Depending on pattern group order, skill and level are in different positions
      let skill, level;
      if (/reached|achieved/.test(pattern.source)) {
        // groups: (level)(skill)
        level = parseInt(m[1], 10);
        skill = m[2]?.trim();
      } else {
        // groups: (skill)(level)
        skill = m[1]?.trim();
        level = parseInt(m[2], 10);
      }
      if ((level === 99 || level === 120) && skill) {
        discord.notifyLevelMilestone(playerId, skill, level);
      }
      break;
    }
  }
}

/**
 * Persist a batch of RuneMetrics activities to the player_activities table.
 * Uses INSERT OR IGNORE so re-fetching the same activities never duplicates them.
 * Returns only the activities that were newly inserted — callers should run
 * detectors (drops, diaries, boss kills, milestones) on this subset only,
 * so notifications never fire twice for the same event.
 *
 * Also refreshes the activities_json cache on the players row with the
 * latest 50 entries from the DB (properly sorted by parsed timestamp).
 */
function saveActivities(playerId, activities) {
  if (!activities?.length) return [];

  const ins = db.prepare(`
    INSERT OR IGNORE INTO player_activities (player_id, date_str, ts, text, details)
    VALUES (?, ?, ?, ?, ?)
  `);

  const newActivities = [];
  db.runTransaction(() => {
    for (const a of activities) {
      if (!a.text) continue;
      const dateStr = a.date ?? '';
      const ts      = parseActivityDate(dateStr);
      const result  = ins.run(playerId, dateStr, ts, a.text, a.details ?? null);
      if (result.changes > 0) newActivities.push(a);
    }
  });

  // Rebuild the activities_json cache from the persistent table (last 50, sorted)
  const cached = db.prepare(`
    SELECT date_str AS date, text, details
    FROM player_activities
    WHERE player_id = ?
    ORDER BY ts DESC
    LIMIT 50
  `).all(playerId);
  db.prepare('UPDATE players SET activities_json = ? WHERE id = ?')
    .run(JSON.stringify(cached), playerId);

  return newActivities;
}

module.exports = { saveActivities, autoLogDrops, autoDetectDiaries, autoCountBossKills, autoDetectLevelMilestones, parseActivityDate, diaryRegionKey, BOSS_KILL_PATTERNS };
