// Shared activity-sync helpers used by both the 5-minute cron and the manual sync routes.
const db = require('../database');

const DROP_PATTERNS = [
  /^I found (?:a |an )(.+?)\.?$/i,
  /^I received (?:a |an )(.+?)\.?$/i,
];

// "I completed the Easy Lumbridge & Draynor Achievement Diary."
const DIARY_PATTERN = /I completed the (Easy|Medium|Hard|Elite) (.+?) Achievement Diary\.?/i;

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
    db.prepare(
      'INSERT OR IGNORE INTO achievements (player_id, type, key, achieved, achieved_at, manual) VALUES (?, ?, ?, 1, ?, 0)'
    ).run(playerId, 'diary', key, achievedAt);
  }
}

module.exports = { autoLogDrops, autoDetectDiaries, parseActivityDate, diaryRegionKey };
