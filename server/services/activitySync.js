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
  { re: /I (?:levelled|leveled) my ([\w\s]+?) skill.*?(?:I am|now) (?:at )?level (\d+)/i,
    extract: m => ({ skill: m[1], level: parseInt(m[2], 10) }) },
  // "I've reached level 120 in Slayer." / "I achieved level 99 in Cooking."
  { re: /I(?:'ve)? (?:reached|achieved) level (\d+) in ([\w\s]+)/i,
    extract: m => ({ skill: m[2], level: parseInt(m[1], 10) }) },
  // "I achieved the maximum level in Thieving!" — no level in the text itself;
  // 120 unless the true-cap wording ("120") appears elsewhere in the message, else 99.
  { re: /I achieved the maximum level in ([\w\s]+?)!?\.?$/i,
    extract: (m, text) => ({ skill: m[1], level: /120/.test(text) ? 120 : 99 }) },
];

// Canonical spelling to guard against loose regex captures ("the Thieving" etc.)
const { SKILLS } = require('./runescape');
function canonicalSkillName(raw) {
  const clean = (raw || '').trim().toLowerCase();
  return SKILLS.find(s => s.toLowerCase() === clean) ?? null;
}

// RS3 renamed diaries to area tasks, and the adventurer's log has used several
// phrasings over the years. Accept tier-first and area-first orderings.
const DIARY_PATTERNS = [
  /I (?:have )?completed (?:all of )?the (Beginner|Easy|Medium|Hard|Elite) (.+?) (?:Achievement Diary|achievements|area tasks|tasks)\b/i,
  /I (?:have )?completed (?:all of )?the (.+?) (Beginner|Easy|Medium|Hard|Elite) (?:achievements|area tasks|tasks)\b/i,
];

/** Returns { tier, region } for an activity line, or null if it isn't an area task completion. */
function matchAreaTask(text) {
  if (!text) return null;
  let m = text.match(DIARY_PATTERNS[0]);
  if (m) return { tier: m[1], region: m[2] };
  m = text.match(DIARY_PATTERNS[1]);
  if (m) return { tier: m[2], region: m[1] };
  return null;
}

// Current Adventurer's Log text: "Quest complete: Gertrude's Cat" / "Quest complete: Bar Crawl (miniquest)".
// Older phrasing (kept for stored history): "I completed the quest 'While Guthix Sleeps'."
const QUEST_COMPLETE_PATTERN = /I completed the quest[:\s]+['"]?([^'".\n]+?)['"]?\s*\.?\s*$/i;
function matchQuestComplete(text) {
  if (!text) return null;
  let m = text.match(/^Quest complete:\s*(.+?)\s*(?:\(miniquest\))?\s*\.?\s*$/i);
  if (m) return m[1];
  m = text.match(QUEST_COMPLETE_PATTERN);
  return m ? m[1] : null;
}

// ── Boss kill detection ────────────────────────────────────────────────────────
// Patterns are matched against the RuneMetrics activity text + details combined.
// Order matters: more specific patterns (e.g. Nex: AoD) must come before generic ones (Nex).
const BOSS_KILL_PATTERNS = [
  // Specific first — more specific patterns before overlapping ones
  { key: 'amascut',             label: 'Amascut, the Devourer',          pattern: /\bamascut\b/i },
  { key: 'vermyx',              label: 'Vermyx, Brood Mother',           pattern: /\bvermyx\b/i },
  { key: 'kezalam',             label: 'Kezalam, the Wanderer',          pattern: /\bkezalam\b/i },
  { key: 'nakatra',             label: 'Nakatra, Devourer Eternal',      pattern: /\bnakatra\b/i },
  { key: 'gate_of_elidinis',    label: 'The Gate of Elidinis',           pattern: /gate of elidinis/i },
  { key: 'kerapac',             label: 'Kerapac, the Bound',             pattern: /\bkerapac\b/i },
  { key: 'arch_glacor',         label: 'Arch-Glacor',                    pattern: /arch.glacor/i },
  { key: 'hermod',              label: 'Hermod, the Spirit of War',      pattern: /\bhermod/i },
  { key: 'astellarn',           label: 'Astellarn',                      pattern: /\bastellarn\b/i },
  { key: 'verak_lith',          label: 'Verak Lith',                     pattern: /verak lith/i },
  { key: 'sanctum_guardian',    label: 'The Sanctum Guardian',           pattern: /sanctum guardian/i },
  { key: 'masuta',              label: 'Masuta the Ascended',            pattern: /\bmasuta\b/i },
  { key: 'exiled_kalphite_queen', label: 'Exiled Kalphite Queen',        pattern: /exiled kalphite queen/i },
  { key: 'ghrazi_blood_knights', label: 'The Ghrazi Blood Knights',        pattern: /ghrazi blood knight/i },
  { key: 'silverquill',         label: 'Silverquill, the Dreadhog',      pattern: /\bsilverquill\b/i },
  { key: 'ivar',                label: 'Ivar, King of Bones',            pattern: /ivar,? (?:the )?king of bones/i },
  { key: 'nex_aod',             label: 'Nex: Angel of Death',            pattern: /angel of death/i },
  { key: 'nex',                 label: 'Nex',                            pattern: /\bnex\b/i },
  { key: 'telos',               label: 'Telos, the Warden',              pattern: /\btelos\b/i },
  { key: 'vorago',              label: 'Vorago',                         pattern: /\bvorago\b/i },
  { key: 'solak',               label: 'Solak',                          pattern: /\bsolak\b/i },
  { key: 'rasial',              label: 'Rasial, the First Necromancer',  pattern: /\brasial\b/i },
  { key: 'zamorak_loe',         label: 'Zamorak, Lord of Chaos',         pattern: /lord of (?:erebus|chaos)/i },
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

// Texts that mention a boss name but are NOT kill events (drops, area tasks, level-ups, etc.)
const SKIP_PATTERNS = [
  /^I found (?:a |an )/i,
  /^I received (?:a |an )/i,
  /I completed the .+ (?:Achievement Diary|achievements|area tasks)/i,
  /I (?:levelled|achieved|reached) (?:my )?/i,
  /I completed the quest/i,
  /^Quest complete:/i,
];

/**
 * A *cumulative* kill count, when the details literally state one ("Your kill count is: 1,285").
 * Returns null otherwise. Deliberately does NOT treat "5 times" as a total: the Adventurer's Log
 * batches kills, so "I defeated the Queen Black Dragon 5 times." is 5 new kills, not 5 overall.
 */
function extractCumulativeKillCount(details) {
  if (!details) return null;
  for (const p of [/kill count[:\s]+(\d[\d,\s]*)/i, /count[:\s]+(\d[\d,\s]*)/i]) {
    const m = details.match(p);
    if (m) {
      const n = parseInt(m[1].replace(/[\s,]/g, ''), 10);
      if (!isNaN(n) && n > 0) return n;
    }
  }
  return null;
}

/**
 * Number of kills a single Adventurer's Log event represents. The game batches them:
 *   "I killed 17 Hermods."                       → 17
 *   "I defeated the Queen Black Dragon 5 times." → 5
 *   "I defeated the Queen Black Dragon."         → 1
 */
function extractBatchKills(text) {
  const m = (text || '').match(/\b(?:killed|defeated|slain|vanquished)\s+(?:the\s+)?(\d[\d,]*)\b/i)
         || (text || '').match(/\b(\d[\d,]*)\s+times?\b/i);
  const n = m ? parseInt(m[1].replace(/,/g, ''), 10) : 1;
  return n > 0 && n < 100000 ? n : 1;
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

/** Detect area task completions and persist them to the achievements table */
function autoDetectDiaries(playerId, activities) {
  if (!activities?.length) return;
  for (const act of activities) {
    const match = matchAreaTask(act.text);
    if (!match) continue;
    const tier   = match.tier.toLowerCase();
    const region = match.region;
    const key    = `diary_${diaryRegionKey(region)}_${tier}`;
    const achievedAt = parseActivityDate(act.date);
    // INSERT OR IGNORE — once marked, never overwrite the date
    const result = db.prepare(
      'INSERT OR IGNORE INTO achievements (player_id, type, key, achieved, achieved_at, manual) VALUES (?, ?, ?, 1, ?, 0)'
    ).run(playerId, 'diary', key, achievedAt);
    if (result.changes > 0) discord.notifyDiary(playerId, match.tier, region);
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
function autoCountBossKills(playerId, activities, { silent = false } = {}) {
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
    VALUES (?, ?, ?, ?)
    ON CONFLICT(player_id, boss_key) DO UPDATE SET
      kills     = kills + excluded.kills,
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

      const seenAt = parseActivityDate(act.date);
      const prev = db.prepare('SELECT kills FROM boss_kills WHERE player_id = ? AND boss_key = ?').get(playerId, boss.key);
      let counted = false;

      const total = extractCumulativeKillCount(act.details);
      if (total !== null) {
        upsertAbsolute.run(playerId, boss.key, total, seenAt);
        counted = true;
      } else {
        // Batched event: add its kills once. The signature makes re-processing a no-op.
        const sig = `${boss.key}:${act.date || ''}:${text.slice(0, 80)}`;
        if (logSig.run(playerId, sig).changes > 0) {
          upsertIncrement.run(playerId, boss.key, extractBatchKills(text), seenAt);
          counted = true;
        }
      }
      if (counted && !silent && (!prev || prev.kills === 0)) discord.notifyBossFirstKill(playerId, boss.label);
      break; // Only match the first (most specific) boss pattern
    }
  }
}

/**
 * Detect level 99 and 120 milestones from the activity feed, fire a Discord
 * notification, and persist a dated record to player_skill_milestones so the
 * Skill Mastery UI can show "achieved on <date>" on hover. INSERT OR IGNORE
 * means a manually-set date (or an earlier auto-detected one) is never
 * clobbered by a later pass over the same/overlapping activity window.
 */
function autoDetectLevelMilestones(playerId, activities) {
  if (!activities?.length) return;
  const insertMilestone = db.prepare(`
    INSERT OR IGNORE INTO player_skill_milestones (player_id, skill, level, achieved_at, manual)
    VALUES (?, ?, ?, ?, 0)
  `);

  for (const act of activities) {
    const text = `${act.text || ''} ${act.details || ''}`.trim();
    for (const { re, extract } of LEVEL_MILESTONE_PATTERNS) {
      const m = text.match(re);
      if (!m) continue;
      const { skill: rawSkill, level } = extract(m, text);
      const skill = canonicalSkillName(rawSkill);
      if ((level === 99 || level === 120) && skill) {
        discord.notifyLevelMilestone(playerId, skill, level);
        insertMilestone.run(playerId, skill, level, parseActivityDate(act.date));
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

/**
 * When a RuneMetrics activity signals a quest completion, auto-mark any matching
 * active quest goals for that player's group as complete and fire a Discord notification.
 */
function autoCompleteQuestGoals(playerId, activities) {
  if (!activities?.length) return;
  const player = db.prepare('SELECT group_id FROM players WHERE id = ?').get(playerId);
  if (!player?.group_id) return;

  for (const act of activities) {
    const matched = matchQuestComplete(act.text);
    if (!matched) continue;
    const questName = matched.trim();

    const matchingGoals = db.prepare(`
      SELECT g.id, g.title
      FROM goals g
      JOIN players p ON p.id = g.owner_id
      WHERE p.group_id = ?
        AND g.category = 'quest'
        AND g.status NOT IN ('complete', 'vaulted')
        AND LOWER(g.title) = LOWER(?)
    `).all(player.group_id, questName);

    for (const goal of matchingGoals) {
      db.prepare(
        "UPDATE goals SET status = 'complete', completed_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(goal.id);
      const { notifyGoalCompleted } = require('./discord');
      notifyGoalCompleted(player.group_id, goal.title, []);
      console.log(`[activitySync] Auto-completed quest goal "${goal.title}" for player ${playerId}`);
    }
  }
}

module.exports = { saveActivities, autoLogDrops, autoDetectDiaries, autoCountBossKills, autoDetectLevelMilestones, autoCompleteQuestGoals, parseActivityDate, diaryRegionKey, BOSS_KILL_PATTERNS };
