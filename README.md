<div align="center">
  <img src="client/public/logo.svg" alt="RS3 GIM Companion" height="120" />
  <h1>RS3 GIM Companion</h1>
  <p><strong>A private companion web app for RuneScape 3 Group Ironman teams.</strong></p>
  <p>
    <a href="https://groupiron.com"><img src="https://img.shields.io/badge/live-groupiron.com-c8a84b?style=flat-square&logo=runescape&logoColor=white" alt="Live site"/></a>
    <a href="https://discord.gg/uZT4JDdtn2"><img src="https://img.shields.io/badge/Discord-support-5865F2?style=flat-square&logo=discord&logoColor=white" alt="Discord"/></a>
    <img src="https://img.shields.io/badge/version-2.0.0-4caf50?style=flat-square" alt="v2.0.0"/>
    <img src="https://img.shields.io/badge/RS3-Group_Ironman-c8a84b?style=flat-square" alt="RS3 GIM"/>
  </p>
</div>

---

## What is this?

RS3 GIM Companion is a self-hosted web app that gives your Group Ironman team a shared dashboard — syncing hiscores, tracking goals, managing gear loadouts, and celebrating achievements together. Built specifically for **RuneScape 3** (not OSRS).

Live at **[groupiron.com](https://groupiron.com)** — or self-host it in minutes.

---

## Features

### 📊 Overview
- Member cards with RS3 avatars, **YOU** badge, click-to-focus on any player
- Stat summary: Members · Total XP · Total Levels · Active This Week
- **Group Stats** — XP progress bars, full Skills matrix (all 29 RS3 skills × all players, gold-highlight for group best), Combat breakdown with RS3 icons (includes Necromancy & Summoning)
- **Goals panel** — level / item / quest / custom goals with live XP-to-go tracking
- **Activity feed** — RuneMetrics feed showing recent drops, quests, milestones; entries are persisted permanently in the database and auto-refreshed every 2 hours in the background

### 🎯 Goals
- **Goal Browser** — curated suggestion library with 263+ suggestions across seven categories: Quest Series (66 quest chains spanning early/mid/end game), Skill Unlocks, Key Items, Item Requests, Achievement Diaries, Boss Kills, Slayer Drops; completed/vaulted goals are automatically hidden so the list stays focused
- **Item Requests** — 35+ pre-loaded suggestions covering Dungeoneering cape & rewards (Chaotic weapons, Hex/Farsight, Stalker bow, Balmung), Archaeology artefacts (Pontifex ring, Inquisitor staff, Guildmaster's aura), Shattered Worlds codices (Double Surge, Double Escape, Bladed Dive, Natural Instinct, etc.), ports armour, boss drops and more; item request goals appear in **Active Goals** and the **Overview Goals panel**
- **Active Goals board** — Kanban-style columns (Not Started / In Progress / Blocked); **drag-and-drop** cards between columns to update status; the target column highlights gold during a drag
- **Goal card actions** — ✏️ Edit (opens pre-filled modal), 🚫 Blocked, ▶ Advance (step status forward), ✕ Delete
- **Edit Goal modal** — ✏️ opens the goal modal pre-filled with all existing values; submits a PUT update instead of creating a new goal
- **Goal creation modal** — six types matching the browser categories; Quest type shows prerequisite quests + skill requirement checker with one-click "add missing prereqs" buttons; Skill type shows XP-to-go and progress bar
- Any suggestion can be added to Active Goals in one click; Custom Goal button for anything not in the library

### 🏆 Group Vault & Gear Loadouts
- **Group Vault** — unified tile grid combining worn and free items; compact 80px tiles show item icon, name, and owner (or "Free" if unclaimed); click any tile to expand full details (acquired date, source, slot)
- **Dupe indicator** — gold ×N badge (top-left) when multiple members hold the same item; green dot (top-right) when the item is currently worn
- **Player filter chips** — filter the vault to any single player using the same chip style as the Goals tab
- **Add Item** — "+ Add Item" button (canWrite only) searches the RS3 wiki for any item by name and adds it to the vault with an optional source field
- **Delete vault entries** — each expanded item row has a × button (canWrite only) to remove that drop entry; confirmation prompt before deletion
- **Gear Loadouts** — per-player equipment grid across 5 combat styles (Melee / Ranged / Magic / Necromancy / Hybrid); wiki-verified item requirements; confirmation dialog (✅ Owned vs 📋 Planning); only your own character is editable
- **DB-driven item picker** — gear suggestions are pulled live from the database (410+ items); adding items to the seed script automatically updates the picker on next page load — no code changes required
- **Cross-style item picker** — a "🔍 All items" tab in the slot picker lets you equip off-style gear (e.g. Pernix's quiver on Melee for prayer bonus) without affecting style-specific recommendations
- **Universal pocket / ammo items** — pocket slot items (scrimshaws, scriptures, grimoire) and select ammo items (Pernix's quiver, Grasping rune pouch) are marked `style: all` so they appear in every combat style's picker automatically
- **Viewing another player's gear** — item picker and Best Available panel are hidden; gear grid centres on screen for a clean read-only view
- **Player selector chips** — "you" badge highlights your own character; same chip design as vault and goals
- **Group Notes** — floating slide-in pinboard for strategies, loot rules, and session plans; auto-saves with debounce

### 📋 Achievement Diaries
- 14 regions × 4 tiers (Easy / Medium / Hard / Elite) — same structure as RS3
- **Grid view** — coloured player dots per cell showing who has completed each diary
- **Player view** — per-player completion with toggle and dates
- Auto-detected from RuneMetrics activity feed on each sync; manual override available

### 🏅 Leaderboards
- **Boss Kills** — accumulated from activity feed; boss × player matrix with filter; auto-updates on every sync
- **Firsts** — ~40 milestone cards showing who in the group achieved each one first (quests, bosses, skill 99s, rare drops)
- **Milestones** — full chronological feed of 99s, 120s, quest completions, boss kills
- **Skill Mastery** — 99 and 120 breakdown per player with RS3 wiki skill icons
- **Clue Scrolls** — hiscores leaderboard across all 5 tiers

### 🔔 Discord Notifications
- Connect any Discord channel via a webhook URL — click **🔔** in the header (requires group to be unlocked)
- Fully configurable per group: toggle each event type on or off
- **Supported events:**
  - 🎉 Level 99s & 120s — detected automatically from the activity feed
  - 📋 Achievement diary completions
  - ⚔️ Boss first kills — fires the first time a player defeats a boss
  - 🎯 Group goals completed — when any goal is marked as complete
  - 🎁 Drops — every auto-detected drop (off by default, can be noisy)
- Rich Discord embeds with player name, event details, timestamp, and group footer
- **📨 Test** button sends a test embed instantly so you can confirm the hook works before saving

---

## Access Control

Groups are read-only until claimed. Click **🔒 Claim group** → the app generates a secret (`XXXX-XXXX-XXXX`) shown once. Share it with your team. Anyone who enters the secret on their device can edit; everyone else can view.

Once unlocked, set your character name (👤 button in the header) so the app knows which gear loadout is yours to edit.

---

## Group Management

Click **👥 Find or Manage Groups** in the sidebar to:
- Search by exact group name and import from RS3 hiscores
- ★ Favourite groups (pins to top of sidebar)
- ✕ Remove groups you no longer want in your sidebar

Groups are found exclusively via the **RS3 GIM hiscores** — the app validates that the group name, type (Regular / Competitive), and member count all match before importing. If a group can't be found, the search shows a styled "Group not found" message with a hint to check the exact name and settings.

---

## Discord

Join the community for support, bug reports, and feature requests:

**[discord.gg/uZT4JDdtn2](https://discord.gg/uZT4JDdtn2)**

| Channel | Purpose |
|---|---|
| `#announcements` | Version releases and downtime notices |
| `#general` | Community chat about RS3 GIM |
| `#group-showcase` | Share your group's progress |
| `#help` | Setup and usage questions |
| `#bug-reports` | Reproducible bug reports |
| `#feature-requests` | Ideas and suggestions |

---

## Mobile Support

Fully responsive at ≤600 px:
- Hamburger ☰ slides the sidebar in as a drawer with dimmed backdrop
- Tab bars scroll horizontally
- Skills matrix narrows to 3 columns
- Modals slide up as a bottom sheet

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Backend | Node.js 22 + Express |
| Database | SQLite (`node:sqlite` built-in, zero external deps) |
| Data | RS3 Hiscores CSV API + RuneMetrics JSON API |
| Hosting | Hetzner VPS — Ubuntu 22.04 |
| Web server | Nginx (reverse proxy + SSL) |
| SSL | Cloudflare Origin Certificate |
| DNS / CDN | Cloudflare |
| Process manager | PM2 |

---

## Local Development

Requires **Node.js 22+**.

```bash
git clone https://github.com/thosjo95/RS3-GIM-Companion.git
cd RS3-GIM-Companion
npm run install:all   # installs root + server + client deps
npm run dev           # API on :3001, Vite dev server on :5173
```

Open **http://localhost:5173** — `/api` requests proxy to the backend automatically.

---

## Deploy to Production

```bash
ssh root@YOUR_SERVER_IP
bash /root/deploy.sh
```

The script runs: `git pull` → `npm run build` (Vite) → `pm2 restart app`.

### Backend-only changes (no frontend rebuild needed)

If you only changed server-side files (routes, services, `database.js`, `index.js`), you can skip the Vite build step entirely:

```bash
git pull && pm2 restart rs3-gim
```

Use the full `deploy.sh` whenever any file under `client/` changes.

---

## Project Structure

```
RS3-GIM-Companion/
├── client/
│   ├── public/
│   │   └── logo.svg                 # App logo (shield + iron helm + GIM)
│   └── src/
│       ├── App.jsx                  # Root: sidebar, group management, auth modals, mobile drawer
│       ├── index.css                # Global styles + CSS variables + mobile media queries
│       ├── api/client.js            # Typed fetch wrapper with group auth headers
│       └── components/
│           ├── Dashboard.jsx        # Tab router (Overview / Goals / Vault / Diaries / Leaderboards)
│           ├── Header.jsx           # Logo, Discord link, lock/unlock, sync button
│           ├── OverviewTab.jsx      # Member cards · Group Stats · Goals panel · Activity feed
│           ├── GoalsTab.jsx         # Goal Browser (suggestions) · Active Goals · Goal management
│           ├── VaultTab.jsx         # Unified tile grid (worn + free items) · player filter chips
│           ├── GearLoadouts.jsx     # Equipment grid, item picker, wiki-verified requirements, player chips
│           ├── AchievementsTab.jsx  # Achievement Diaries — grid + player view
│           ├── LeaderboardsTab.jsx  # Boss Kills · Firsts · Milestones · Skill Mastery · Clue Scrolls
│           ├── GoalModal.jsx        # Goal creation / edit modal (Quest / Skill / Key Item / Item Request / Diary / Boss)
│           ├── GroupNotesOverlay.jsx # Floating slide-in pinboard, auto-save
│           ├── WebhookSettings.jsx  # Discord webhook config modal (URL + event toggles + test)
│           └── admin/
│               └── AdminPortal.jsx  # Full admin SPA: login, queue, groups, table browser, maintenance, audit log
│   └── data/
│       ├── gearSuggestions.js       # getBestAndNext() helper used by GearLoadouts (items sourced live from DB via useRs3Gear hook)
│       ├── goalSuggestions.js       # Curated goal library: 220+ suggestions across 7 categories
│       └── bosses.js                # Boss requirements, tiers, and drop tables
└── server/
    ├── database.js                  # SQLite schema + safe ALTER TABLE migrations
    ├── index.js                     # Express app + cron sync jobs
    ├── routes/
    │   ├── groups.js                # Group CRUD · claim · verify · weekly XP
    │   ├── players.js               # Player CRUD · sync · sync-all pipeline
    │   ├── goals.js                 # Goal CRUD + vault promotion
    │   ├── drops.js                 # Drops + item requests CRUD
    │   ├── achievements.js          # Achievement diary completion tracking
    │   ├── equipment.js             # Gear loadout slots (player × style × slot)
    │   └── bossKills.js             # Boss kill counts by group
    ├── services/
    │   ├── runescape.js             # fetchHiscores · fetchRuneMetrics · calcCombatLevel
    │   ├── activitySync.js          # Auto-detect drops · diaries · boss kills · level milestones from feed
    │   └── discord.js               # Webhook sender + embed builders for all notification types
    └── utils/
        └── auth.js                  # SHA-256 hashing · checkGroupAuth middleware
```

---

## ⚙️ Admin Portal

A password-protected management interface available at `/admin` on any RS3 GIM Companion deployment. Gives server operators a full UI to manage groups, review data submissions, inspect reference tables, and run maintenance operations — **without needing SSH or direct database access**.

### Access
Navigate to `https://groupiron.com/admin` (or `http://localhost:5173/admin` in dev). Log in with your admin credentials. Sessions last **8 hours** (stored in `sessionStorage`). After 5 failed login attempts per IP a 15-minute lockout applies.

### Tabs

| Tab | What it does |
|---|---|
| **📥 Queue** | Review pending data submissions (create / update / delete on RS3 reference tables). Side-by-side JSON diff, optional review note, Approve & Apply or Reject. Live count badge in the tab label. |
| **👥 Groups** | Searchable table of every registered group — ID, name, type, size, player count, claimed status, sync errors, Discord webhook. Click any row to expand and see all players with their IDs and sync status. |
| **📊 Browse Tables** | Read-only browser for all 7 RS3 reference tables (bosses, quests, gear items, gear paths, milestones, slayer, skill levels). Row counts, search, click-to-expand detail with pretty-printed JSON and inline wiki icons. |
| **🔧 Maintenance** | 12 tool cards — fill in a group/player ID and click Run (no SSH needed): |
| **📜 Audit Log** | Last 200 approved / rejected submissions with reviewer and timestamp. |

### Maintenance tools

| Tool | Fixes |
|---|---|
| 📋 Browse Groups | Find group IDs before running other tools |
| 👤 Browse Players in Group | Find player IDs; see sync errors per player |
| 🔀 Move Players Between Groups | Fix "Group shows 0 members" — moves all players from the old unclaimed record to the claimed one |
| 🗑️ Delete Empty Group | Remove a 0-player group after moving its players away |
| 🔓 Reset Group Secret | Clear `password_hash` so a group can re-claim; all data intact |
| 💀 Permanently Delete Group | Delete group + all its data (destructive — requires confirmation checkbox) |
| ✏️ Fix Player RSN | Overwrite a stored RSN and clear sync error in one step |
| 🔄 Trigger Activity Sync | Run the RuneMetrics cron on demand for a group |
| ⟳ Sync Individual Player | Re-run hiscores sync for one player by ID |
| 🌱 Re-run Seed Data | Re-apply the full reference data seed (idempotent, safe at any time) |
| 📜 Scan Wiki for New Quests | Diff RS Wiki quest list vs database; one-click stub insertion for missing entries |
| ⚔️ Scan Wiki for New Bosses | Same for bosses |

### Security
- Passwords hashed with **PBKDF2-SHA512** (600,000 iterations, random salt)
- Tokens signed with **HS256** (HMAC-SHA256), expire after 8 hours
- JWT secret generated on first run, persisted to `server/data/jwt_secret.bin` (survives server restarts)
- Rate limit: 5 failed attempts → 15-minute IP lockout

**Create the first admin account on your server:**
```bash
node server/scripts/createAdmin.js <username> <password>
```

---

## Database Tables

| Table | Purpose |
|---|---|
| `groups` | Name, type, size, password hash, last activity, Discord webhook URL + event config |
| `players` | RSN, combat level, hiscores JSON, RuneMetrics JSON |
| `skills` | Per-player skill levels, XP, hiscores rank |
| `snapshots` | Daily XP snapshots for weekly gain calculation |
| `goals` | Goal type, status, current/target values, details JSON |
| `goal_contributors` | Many-to-many: goals ↔ players |
| `drops` | Drop log (auto-detected + manual) |
| `item_requests` | Item wish-list per player |
| `achievements` | Diary completion per player (region + tier key, timestamp, manual flag) |
| `boss_kills` | Accumulated kill counts per player from activity feed |
| `boss_kill_log` | Dedup log — one row per processed activity, prevents double-counting |
| `equipment_loadouts` | Gear slot entries (player × combat style × slot, item name, confirmed flag) |
| `group_notes` | Shared pinboard content per group |
| `player_activities` | Persistent RuneMetrics activity entries (deduplicated); rebuilt into `activities_json` cache on every fetch |

---

## Admin FAQ

Common issues encountered when running the server or managing groups.

---

### Group shows 0 members / "Members not loading"

**Symptom:** A group was added and claimed, but the member list is empty even though another unclaimed group with the same name has all the players.

**Cause:** The group was looked up and players were added before claiming. When claiming creates a new entry in the database it gets a different `id`, leaving the players attached to the old unclaimed record.

**Diagnosis:**

```bash
ssh root@YOUR_SERVER_IP
node -e "
const db = require('/var/www/RS3-GIM-Companion/server/database');
const groups = db.prepare(\"SELECT id, name, password_hash, (SELECT COUNT(*) FROM players WHERE group_id = g.id) AS player_count FROM groups g WHERE name LIKE '%YOUR_GROUP_NAME%'\").all();
console.log(groups);
"
```

Look for two rows with the same name — one with `player_count > 0` and no `password_hash`, and one with a `password_hash` and `player_count = 0`. Note both IDs.

**Fix:** Move the players from the old ID to the claimed ID, then remove the orphan group.

```bash
node -e "
const db = require('/var/www/RS3-GIM-Companion/server/database');
// Replace OLD_ID and NEW_ID with the IDs you found above
const moved = db.prepare('UPDATE players SET group_id = NEW_ID WHERE group_id = OLD_ID').run();
const del   = db.prepare('DELETE FROM groups WHERE id = OLD_ID').run();
console.log('Moved:', moved.changes, 'players. Deleted group:', del.changes);
"
```

Refresh the app — all members should appear immediately.

---

### Activity feed is empty

**Cause:** The activity feed is populated by the 2-hour background cron (RuneMetrics API), not by **↻ Sync All**. Sync All only updates hiscores. If the cron hasn't run yet, or if RuneMetrics returned errors on the last attempt, the feed will be empty.

**Wait for the cron:** The cron runs every 2 hours at `:00`. Check the PM2 logs to see the last run:

```bash
pm2 logs rs3-gim --lines 50
```

**Trigger manually (no UI button — server-side only):**

```bash
# Replace GROUP_ID with your group's numeric ID
curl -s -X POST http://localhost:3001/api/players/sync-activities/GROUP_ID | python3 -m json.tool
```

This fetches RuneMetrics for every player in the group (1 second delay between players to stay within rate limits) and saves new activities to the database immediately.

---

### RuneMetrics returns 502 / 503 errors

**Cause:** Jagex's RuneMetrics servers are temporarily down or overloaded. This is not a rate-limit issue — it's a Jagex-side problem.

**Solution:** Wait and retry. The 2-hour cron will pick it back up automatically. You can also run the manual curl above once Jagex recovers. No code changes are needed.

Note: **429 Too Many Requests** would indicate rate limiting (throttle your sync frequency). A **502 Bad Gateway** means the Jagex endpoint itself is unreachable.

---

### A group lost their secret / need to re-claim

**Symptom:** The group owner lost the secret code and can no longer edit their group.

**Fix:** Clear the `password_hash` on their group record. This resets it to unclaimed — everyone can view, nobody can edit until they claim again.

**Step 1 — find their group ID (if you don't already know it):**

```bash
node -e "
const db = require('/var/www/RS3-GIM-Companion/server/database');
const groups = db.prepare('SELECT id, name, password_hash, (SELECT COUNT(*) FROM players WHERE group_id = g.id) AS players FROM groups g ORDER BY id').all();
console.log(JSON.stringify(groups, null, 2));
"
```

**Step 2 — clear the password (replace `26` with their actual group ID):**

```bash
node -e "
const db = require('/var/www/RS3-GIM-Companion/server/database');
const result = db.prepare('UPDATE groups SET password_hash = NULL WHERE id = ?').run(26);
console.log('Updated rows:', result.changes);
"
```

If it prints `Updated rows: 1` you're done. Tell the group to refresh the app — **🔒 Claim group** will reappear in the header. They click it, get a new secret shown once, and save it somewhere safe (e.g. a private Discord channel). All their players, goals, drops, and gear data are untouched.

---

### Permanently delete a group

**Use case:** Removing a test group, a duplicate, or a group that explicitly asked to be removed.

The `players` table references `groups` without a cascade rule, so delete the players first. Everything else (skills, drops, achievements, loadouts, etc.) cascades automatically from the player delete, and `group_notes` cascades from the group delete.

```bash
node -e "
const db = require('/var/www/RS3-GIM-Companion/server/database');
const id = GROUP_ID;
db.prepare('DELETE FROM players WHERE group_id = ?').run(id);
const result = db.prepare('DELETE FROM groups WHERE id = ?').run(id);
console.log('Deleted groups:', result.changes);
"
```

Replace `GROUP_ID` with the target ID.

---

### Player card shows a ⚠ badge

**Symptom:** A member card has a red border and a ⚠ warning badge in the top-right corner.

**Cause:** The last sync attempt for that player failed. The badge tooltip (and the modal that opens when you click ✎) shows the exact error message stored in `sync_error`.

**Common causes:**
- RSN contains a non-breaking space or other hidden Unicode character (see below)
- Player is not yet ranked on the RS3 hiscores (total level too low)
- Jagex hiscores returned a temporary 5xx error

**Fix:** Click the ✎ button on the card, correct the RSN if needed, then click **Save & Sync**. On success the badge disappears immediately.

---

### Player shows "Not synced" / hiscores lookup fails

**Symptom:** One player in a group always shows "Not synced" and syncing returns `Player "Name" not found on hiscores`.

**Cause:** The RSN was entered with a **non-breaking space** (` `) instead of a regular space — common when copy-pasting from Discord, the RS website, or a mobile keyboard. The hiscores API doesn't recognise it and returns a 404.

**Diagnosis:** Check the exact bytes stored:

```bash
node -e "
const db = require('/var/www/RS3-GIM-Companion/server/database');
const p = db.prepare('SELECT id, rsn FROM players WHERE group_id = ?').all(GROUP_ID);
p.forEach(x => console.log(x.id, JSON.stringify(x.rsn)));
"
```

A non-breaking space shows as ` ` in the JSON output instead of a plain space.

**Fix:** Overwrite the RSN with a clean version (replace `256` and the name as needed):

```bash
node -e "
const db = require('/var/www/RS3-GIM-Companion/server/database');
const result = db.prepare('UPDATE players SET rsn = ? WHERE id = ?').run('Actual Faen', 256);
console.log('Updated:', result.changes);
"
```

Then trigger a sync to confirm it works:

```bash
curl -s -X POST http://localhost:3001/api/players/256/sync | python3 -m json.tool
```

---

### When to use `deploy.sh` vs `pm2 restart`

| Change type | Command |
|---|---|
| Any file under `client/` (React components, CSS, JS) | `bash /root/deploy.sh` (full Vite rebuild required) |
| Server-only files (`server/**`, `database.js`, `index.js`) | `git pull && pm2 restart rs3-gim` |

If you're unsure, always run the full `deploy.sh` — it's safe to run for any change.

---

## Changelog

### v2.0.0 — May 2026
- 🖱️ **Active Goals drag-and-drop** — goal cards can be dragged between Not Started, In Progress, and Blocked columns; target column highlights gold during drag; empty columns show a "Drop here" hint
- ✏️ **Edit Goal** — new edit button on every goal card opens the modal pre-filled with all current values; submits a PUT update instead of creating a new goal
- 🚫 **Blocked status button** — new 🚫 button on goal cards to directly move a goal to Blocked; hidden once the goal is already blocked or complete
- ✕ **Delete button** — replaced the pause icon with ✕ to remove goals entirely (with confirmation); the ▶ advance button is kept
- 📦 **Item Requests → Active Goals** — Item Request goals created via + Custom Goal now appear in Active Goals and the Overview Goals panel; the app derives pending requests directly from the `goals` table (legacy `item_requests` table no longer used)
- 🔗 **Overview Goals link** — "View in Active Goals →" in the Overview Goals panel navigates to Goals tab and auto-switches to the Active Goals board
- 📈 **Gains tab — live levels** — current skill levels always read from the live `skills` table; fixes stale/outdated levels shown after a Sync All
- 🩹 **Gains tab — snapshot healing** — snapshot INSERT heals rows where `skills_json` was null; historical diffs populate correctly on the next sync
- 🥇 **Gains tab — top-gainer highlight only** — only the single top-gaining player per skill is highlighted in gold; other players with gains are no longer highlighted
- 🎨 **Gains tab — formatting** — removed "Total lvls" column; current level display matches Skills tab size and colour
- 🌐 **Favicon** — browser tab now shows the site logo (`favicon.png`) instead of the old SVG shield

### v1.9.0 — May 2026
- 🖼️ **New branding logo** — "Group Ironman RS3 Companion" banner replaces the SVG shield icon on the landing page and header; transparent background applied automatically; subtitle updated to summarise all current features
- 📅 **Gains tab (Group Stats)** — new tab showing per-player, per-skill XP and level gains over selectable periods (Day / Week / Month / Year); defaults to Day; cells show current level + levels gained in green; hover to see exact XP gained; skill order matches the Skills tab
- 🎯 **Gaps tab (Group Stats)** — automatic skill gap analysis scanning all 260+ quest suggestions against player skill levels; no goals required; skill dropdown + custom level override; sort toggle (most affected / level high→low / level low→high); player badges show current level in parentheses and levels needed in gold (+X); Invention filter shows unlock prerequisites (Crafting 80, Divination 80, Smithing 80)
- 🗂️ **Group Stats tab layout** — reordered to XP | Combat | **Skills** | Gains | Gaps; Skills centred and selected by default on load
- 🤖 **Auto-complete quest goals** — RuneMetrics activity feed entries matching "I completed the quest: X" now automatically mark the matching quest goal as complete and fire a Discord notification
- 📸 **Snapshot export** — "Share" button in Group Stats header generates a Canvas-drawn PNG card of the current view; download locally or post directly to Discord via the group's configured webhook (multipart file upload, no external libraries)
- 🧹 **UI polish** — "Active This Week" stat box is no longer clickable and has no info icon; vault "auto-synced from activity feed" label has emoji removed; icon buttons in header are uniformly sized (32×32 px)

### v1.8.0 — May 2026
- 📜 **Quest series library expanded** — Goal Browser now ships with 66 quest-series suggestions covering all major chains across early, mid, and end game: Elf/Elven city chain (Biohazard → Within the Light → The Light Within), Myreque series (In Aid of the Myreque → Legacy of Seergaze → River of Blood), Desert / Mahjarrat storyline, Gnome / Troll / God Wars chain, Elder Gods arc (Azzanadra's Quest → City of Senntisten → Extinction), Missing Presumed Death, Fort Forinthry, and more
- 🛠️ **Quest reward corrections** — *While Guthix Sleeps* description and unlocks corrected: WGS does **not** unlock Ancient Curses; real rewards are Tormented Demon access (Dragon Claws, Dragon Limbs, Dragon Platebody parts), Elite Black Armour, Dagon'hai Robes, and 400,000 XP (4 × 100k lamps). *The Temple at Senntisten* is now correctly flagged as the quest that unlocks Ancient Curses (Soul Split, Deflect prayers, Turmoil, Anguish, Torment); its quest prerequisites updated to include Devious Minds and The Curse of Arrav
- ✅ **Goal Browser hides completed goals** — suggestions whose corresponding active goal has been marked complete or vaulted are automatically removed from the browser, keeping the list focused on remaining work; a "✓ N completed goals hidden" link lets you reveal them temporarily if needed
- 👤 **Goal Browser defaults to 'me'** — the Players chip filter now defaults to just the current user (set via "Set your name" in the header) instead of selecting all players; readiness checks and the add-goal action focus on your own character by default; other players can still be toggled in
- 🔍 **? tour button moved** — the context-aware tour replay button (`?`) has been moved to sit immediately left of the Docs link in the header
- 🌐 **SEO improvements** — `robots.txt` and `sitemap.xml` added to `client/public/` so they are served at `groupiron.com/robots.txt` and `groupiron.com/sitemap.xml` after build; `index.html` already had full meta tags (description, canonical, Open Graph, Twitter Card, JSON-LD structured data)

### v1.7.0 — May 2026
- 🗺️ **Per-tab product tours** — interactive guided tours for Goals, Group Vault, Achievement Diaries, and Leaderboards tabs; auto-trigger on your first visit to each tab; completing a tour saves the state per-tab so it only shows once; context-aware `?` button in the header replays the tour for whichever tab you're currently on (Overview `?` replays the full app tour)
- 🔍 **Browse tracked groups** — collapsible "Browse tracked groups" panel in the Find/Manage Groups modal; search by name or scroll recently active groups without adding them first; guest banner appears when viewing a non-saved group
- ⭐ **Star / Favourite groups** — only explicitly starred, claimed, or unlocked groups are pinned to your sidebar; browsing a group no longer auto-saves it; ☆ star button on browse results + "Save to your groups" button in the guest banner
- 🔄 **Vault auto-sync label** — Group Vault subheading now shows "🔄 auto-synced from activity feed" with a tooltip explaining that boss drops and item pickups detected in the RS3 activity feed appear in the vault automatically on every sync
- ✅ **Timing corrections** — RuneMetrics activity feed updates every ~2 hours; hiscores, XP, and skill data syncs within ~5 minutes; both intervals now stated correctly throughout the UI and docs

### v1.6.0 — May 2026
- 🗃️ **Gear DB overhaul** — 410 gear items in the database (was ~185); all four PvM wiki pages (Melee / Ranged / Magic / Necromancy) scraped and seeded across every slot and tier
- ⚙️ **GearLoadouts now fully DB-driven** — replaced static `GEAR_SUGGESTIONS` object with a `useRs3Gear` hook that fetches live data from the API; adding items to `seedRs3Data.js` is all that's needed going forward — no frontend code changes required
- 🔍 **Cross-style item picker** — new "🔍 All items" tab in the slot picker lets you equip gear from other combat styles (useful for prayer bonus hybrids); style-specific recommendations are unaffected
- 🌐 **Universal pocket slot** — all 22 pocket items (scrimshaws, Erethdor's grimoire, all Scriptures) set to `style: all` so they appear in every combat style's gear picker automatically
- 🏹 **Pernix's quiver + Grasping rune pouch** made `style: all` — prayer-bonus/utility ammo items usable across all styles
- ⚔️ **Melee ammo items** — added Nodon spike harness (T90), Armour spikes, Armour spikes (alloy), Abyssal armour spikes, and Abyssal armour spikes (alloy)
- 💀 **Necromancy ammo items** — added The Devourer's Nexus and Zemouregal's nexus (both T80)
- 🛠️ **Data fixes** — Rune weapons and armour corrected to level 50 (RS3 T50, not T40); amulet of strength acquisition source fixed to `crafting`; Cryptbloom armour corrected to Magic style

### v1.5.0 — May 2026
- 🦎 **Slayer Creatures database** — 48 RS3 slayer creatures seeded into `rs3_slayer_creatures` with slayer level, combat level, location, notable drops (JSON), boss flag, wiki URL, and icon URL (RS Wiki CDN). Covers every meaningful creature from Crawling Hand (5) through Abyssal Lord (115) and The Magister (115).
- 🔪 **Slayer Drops goal category** — new `slayer` category in the Goal Browser with 20 goals covering all major slayer unique drops: Black mask → Slayer helm, Automaton gloves, Dragon boots, Abyssal whip, Granite legs/maul, Ascension crossbow (Legiones), Wyrm components, Ripper claw, Raptor Key set, Hexhunter bow, Cinderbane gloves, Jaws of the Abyss, Sophanem Khopesh, Anachronia laceration boots, Abyssal scourge, The Magister
- 📈 **166 Skill Milestones** — expanded from 21 to 166 entries covering every RS3 skill with true 120 caps in detail. Highlights:
  - **Archaeology relics** — Font of Life (5), Berserker's Fury (56), Death Ward (81), Fury of the Small (97), Persistent Rage (98), Heightened Senses (105), Conservation of Energy (118)
  - **Prayer** — full unlock chain: Deflect curses (71–75), Soul Split (92), Turmoil tier (95), Malevolence tier (99), Prayer master cape (120)
  - **Herblore** — Saradomin brew (81), Super antifire (85), Extreme potions (88–91), Overload (96), Supreme overload salve (98), Elder overload (106), Elder overload salve (107)
  - **Necromancy** — full 2–120 chain: Conjure Skeleton Warrior → 4 conjures (84) → Conjure Undead Army (99) → master cape (120)
  - **Slayer** — all creature unlocks (58–120) with correct sources
  - **Dungeoneering** — Tome of frost (48), Ring of vigour (60), Demon horn necklace (75), Chaotic weapons (80), Primal set (120)
  - Plus comprehensive entries for Attack, Defence, Strength, Ranged, Magic, Smithing, Crafting, Farming, Agility, Mining, Woodcutting, Fishing, Cooking, Runecrafting, Divination, Thieving, Hunter, Invention
- 🎯 **22 new Skill Milestone goals** — added to Goal Browser across early/mid/end stages: Prayer 71–75 Deflect curses, Prayer 99 Malevolence tier, Herblore 85 Super antifire, Herblore 98 Supreme overload, Herblore 106 Elder overload, all 6 key Archaeology relics, DG Tome of frost, Ring of vigour, Demon horn necklace, Necromancy 84 (4 conjures), Runecrafting 77 Blood runes, Runecrafting 90 Soul runes, Smithing 99 Masterwork, Cooking 91 Rocktails, Farming 83 Spirit trees, Fishing 80 Rocktails
- 🌐 **RS Wiki API compliance** — all API calls now send fully descriptive `User-Agent` headers per the RS Wiki guidelines (`rs3-group-ironman-companion-wiki-scanner` and `rs3-group-ironman-companion-wiki-search`)

### v1.4.0 — May 2026
- 🎯 **Goals tab promoted** — Goals is now the 2nd tab (was dev-only); the Items & Drops tab has been removed entirely
- 🎁 **Item Requests category** — 35+ curated suggestions added to the Goal Browser: Dungeoneering rewards (Chaotic weapons, Hex/Farsight, Stalker bow, Balmung, DG cape), Archaeology artefacts (Pontifex shadow ring, Inquisitor staff, Guildmaster's quarterstaff), Shattered Worlds codices (Double Surge, Double Escape, Bladed Dive, Natural Instinct, Ingenuity, etc.), Ports armour (Seasinger, Death Lotus, Superior), and key boss drops
- 🗂️ **GoalModal types aligned** — "Add Goal" modal now uses the same six categories as the Goal Browser: Quest, Skill Unlock, Key Item, Item Request, Achievement Diary, Boss Kill; removes the old generic "Custom" and "Item (recipe)" types
- 🏆 **Vault redesign** — unified tile grid replaces separate "Confirmed Worn Gear" and "Vault" sections; worn items and free items live in the same grid; click any tile to expand full details
- 🔴🟢 **Dupe & worn indicators** — gold ×N badge (top-left) for items held by multiple players; green dot (top-right) for currently worn items; "Free" label when no one is wearing it
- ➕ **Add Item to Vault** — "+ Add Item" button (canWrite only) with RS3 wiki opensearch proxy; live item search with icons; optional source field; tagged as "Manual entry" internally
- 🗑️ **Delete vault entries** — × delete button per drop row in the expanded tile detail (canWrite only); confirmation prompt; reload on success
- 🧩 **Universal chip design** — all player filter chips and selector chips across Goals, Vault, and Gear Loadouts use a single shared CSS class (`chip` / `chip.active`) for consistent styling
- 🔒 **Gear Loadouts visitor fix** — `isMyPlayer` now requires `canWrite`; visiting another group without being unlocked no longer shows the editing UI
- 📋 **Achievements panel design** — AchievementsTab wrapped in the same dark-panel background as Goals and Vault
- 🚫 **Emoji cleanup** — all decorative unicode/generative emoji removed from UI labels, buttons, and headers; RS3 wiki item and skill images are preserved

### v1.3.0 — May 2026
- ✅ **RSN validation on add** — adding a player now checks the RS3 hiscores first; unranked or mistyped names are rejected with an inline error before being saved
- 🔤 **Canonical RSN resolution** — on add and on every sync the app fetches the display name from RuneMetrics and stores the definitive capitalisation/spacing (fixes names copied with hidden Unicode characters)
- 🔠 **Non-breaking space auto-heal** — RSNs containing ` ` or other invisible Unicode characters are sanitised automatically during sync; duplicate records created by encoding drift are detected and merged
- ⚠️ **Sync error badge** — if a player fails to sync, their member card gets a red border + ⚠ badge; clicking it opens an **Edit RSN** modal so you can correct the name and re-sync without leaving the page
- 🗺️ **Quest goals auto-blocked** — when adding a quest goal the app checks skill requirements and quest prerequisites; if any are unmet the goal is automatically set to **Blocked** so it surfaces at the top of the list
- 📖 **Wiki button on quest goals** — every quest goal row now has an inline **📖** button that opens the RS Wiki page for that quest directly
- 🔍 **Hiscores-only group setup** — the group search flow has been simplified: groups are imported exclusively via RS3 hiscores; the "Enter members manually" and "Create new group" paths have been removed to prevent invalid data
- 💬 **"Group not found" error redesign** — not-found result now shows a bold centred heading, an italic hint, and a hoverable **i** badge with the raw API error (instead of displaying it inline)
- 🎯 **Goal owner default** — opening **Add Goal** pre-selects the logged-in player's character as the owner so you don't have to pick yourself every time
- 🚫 **Duplicate goal prevention** — creating a skill goal or quest goal that already exists (same player + skill + target, or same quest) returns a 409 and is silently skipped in batch-add flows

### v1.2.0 — May 2026
- 🗃️ **Persistent activity feed** — RuneMetrics entries are now stored permanently in `player_activities` table; new activity is detected once and never duplicated on re-sync
- ⏱️ **2-hour activity cron** — RuneMetrics is fetched every 2 hours in the background (1 s per-player delay); **↻ Sync All** now only updates hiscores (no rate-limit risk)
- 🛠️ **Manual activity sync endpoint** — `POST /api/players/sync-activities/:groupId` (server-side curl command) for on-demand RuneMetrics pulls without a UI button
- 🏆 **Elite Achievement Diary tier** — added 4th tier (Easy / Medium / Hard / **Elite**) with distinct purple colour coding; auto-detected from activity feed
- 🎯 **Add Goal from Gear Loadouts fixed** — "+ Goal" button now correctly sends `title`, `type`, and `target_value`; no longer throws "Title is required"
- 🖼️ **Goal modal icons fixed** — skill picker now uses RS3 wiki icons instead of emoji placeholders
- 🐛 **Group Vault blank screen fix** — `playerId` prop correctly threaded through `RecommendationsPanel` and `ItemPicker` so the vault tab always renders
- 📖 **Admin FAQ** — documented duplicate-group fix, manual activity sync, 502 error handling, and deploy process distinction

### v1.1.0 — May 2026
- 🔔 **Discord Notifications** — connect any Discord channel via webhook; configurable per event type (level 99/120, diary completions, boss first kills, goal completions, drops); rich embeds with player name, timestamp, and group footer; test button
- 🐛 **Last sync timezone fix** — sync time now displays correctly regardless of browser timezone (UTC parsing for SQLite timestamps)
- 🐛 **RSN picker fix** — "Set your name" now accepts free-text input with autocomplete, so names not yet in the group list can be entered
- 📖 **Docs site** — self-contained documentation published via GitHub Pages at `thosjo95.github.io/RS3-GIM-Companion`
- 🔗 **Docs + Discord links** added to the app header

### v1.0.0 — May 2026
- ⚔️ **Gear Loadouts** — per-player equipment grids for all 5 combat styles with wiki-verified requirements
- 💎 **Group Vault** redesign — confirmed gear shows "Worn by" status on matching vault drops; live updates on gear change
- 🛡️ **Permission model** — only your own character is editable; teammates' gear is view-only
- 📝 **Group Notes** — floating slide-in overlay, auto-save, accessible from the vault tab
- 🗡️ **Items & Drops** redesigned as single-page three-panel layout (no sub-tabs)
- 🔥 **TipsTab** — all RS3 cape names corrected (Fire Cape → TokHaar-Kal-Ket/Xil/Mej → Igneous Kal), no OSRS references
- 🐛 **Gear requirement bug fix** — corrected Defence-only requirements for RS3 armour (Bandos, Armadyl, Pernix, Virtus, etc.)
- 🖼️ **New logo** — shield + iron helm SVG replacing emoji icon
- 🎮 **Discord** integration — Discord link in header

---

<div align="center">
  <sub>Not affiliated with Jagex Ltd. RuneScape is a trademark of Jagex Ltd.</sub>
</div>
