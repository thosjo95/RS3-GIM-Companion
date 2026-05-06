<div align="center">
  <img src="client/public/logo.svg" alt="RS3 GIM Companion" height="120" />
  <h1>RS3 GIM Companion</h1>
  <p><strong>A private companion web app for RuneScape 3 Group Ironman teams.</strong></p>
  <p>
    <a href="https://groupiron.com"><img src="https://img.shields.io/badge/live-groupiron.com-c8a84b?style=flat-square&logo=runescape&logoColor=white" alt="Live site"/></a>
    <a href="https://discord.gg/uZT4JDdtn2"><img src="https://img.shields.io/badge/Discord-support-5865F2?style=flat-square&logo=discord&logoColor=white" alt="Discord"/></a>
    <img src="https://img.shields.io/badge/version-1.4.0-4caf50?style=flat-square" alt="v1.4.0"/>
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
- **Goal Browser** — curated suggestion library organised into six categories: Quest Series, Skill Unlocks, Key Items, Item Requests, Achievement Diaries, Boss Kills
- **Item Requests** — 35+ pre-loaded suggestions covering Dungeoneering cape & rewards (Chaotic weapons, Hex/Farsight, Stalker bow, Balmung), Archaeology artefacts (Pontifex ring, Inquisitor staff, Guildmaster's aura), Shattered Worlds codices (Double Surge, Double Escape, Bladed Dive, Natural Instinct, etc.), ports armour, boss drops and more
- **Active Goals** — personal and group goals with status tracking (Not Started / In Progress / Blocked / Complete); filter by player, category, priority, or search by name
- **Goal creation modal** — six types matching the browser categories; Quest type shows prerequisite quests + skill requirement checker with one-click "add missing prereqs" buttons; Skill type shows XP-to-go and progress bar
- Any suggestion can be added to Active Goals in one click; Custom Goal button for anything not in the library

### 🏆 Group Vault & Gear Loadouts
- **Group Vault** — unified tile grid combining worn and free items; compact 80px tiles show item icon, name, and owner (or "Free" if unclaimed); click any tile to expand full details (acquired date, source, slot)
- **Dupe indicator** — gold ×N badge (top-left) when multiple members hold the same item; green dot (top-right) when the item is currently worn
- **Player filter chips** — filter the vault to any single player using the same chip style as the Goals tab
- **Gear Loadouts** — per-player equipment grid across 5 combat styles (Melee / Ranged / Magic / Necromancy / Hybrid); wiki-verified item requirements; confirmation dialog (✅ Owned vs 📋 Planning); only your own character is editable
- **Viewing another player's gear** — item picker and Best Available panel are hidden; gear grid centres on screen for a clean read-only view
- **Player selector chips** — 👤 icon makes it obvious the player names are clickable; "you" badge highlights your own character
- **Group Notes** — floating slide-in pinboard for strategies, loot rules, and session plans; auto-saves with debounce

### 📋 Achievement Diaries
- 13 regions × 4 tiers (Easy / Medium / Hard / Elite) — same structure as RS3
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
│           ├── GoalModal.jsx        # Goal creation modal (Quest / Skill / Key Item / Item Request / Diary / Boss)
│           ├── GroupNotesOverlay.jsx # Floating slide-in pinboard, auto-save
│           └── WebhookSettings.jsx  # Discord webhook config modal (URL + event toggles + test)
│   └── data/
│       ├── gearSuggestions.js       # Wiki-verified item requirements for all 5 combat styles
│       ├── goalSuggestions.js       # Curated goal library: ~200 suggestions across 6 categories
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

### v1.4.0 — May 2026
- 🎯 **Goals tab promoted** — Goals is now the 2nd tab (was dev-only); the Items & Drops tab has been removed entirely
- 🎁 **Item Requests category** — 35+ curated suggestions added to the Goal Browser: Dungeoneering rewards (Chaotic weapons, Hex/Farsight, Stalker bow, Balmung, DG cape), Archaeology artefacts (Pontifex shadow ring, Inquisitor staff, Guildmaster's quarterstaff), Shattered Worlds codices (Double Surge, Double Escape, Bladed Dive, Natural Instinct, Ingenuity, etc.), Ports armour (Seasinger, Death Lotus, Superior), and key boss drops
- 🗂️ **GoalModal types aligned** — "Add Goal" modal now uses the same six categories as the Goal Browser: Quest, Skill Unlock, Key Item, Item Request, Achievement Diary, Boss Kill; removes the old generic "Custom" and "Item (recipe)" types
- 🏆 **Vault redesign** — unified tile grid replaces separate "Confirmed Worn Gear" and "Vault" sections; worn items and free items live in the same grid; click any tile to expand full details
- 🔴🟢 **Dupe & worn indicators** — gold ×N badge (top-left) for items held by multiple players; green dot (top-right) for currently worn items; "Free" label when no one is wearing it
- 🧩 **Vault player filter chips** — dropdown selector replaced with the same chip-button style used in the Goals tab
- 👤 **Gear Loadouts chip selector** — player dropdown replaced with chip buttons that include a 👤 icon and a "you" badge on your own character
- 🔒 **Gear Loadouts other-player view** — item picker and Best Available panel are hidden when viewing a teammate; gear grid centres for a clean read-only layout
- 📋 **Achievements panel design** — Achievement Diaries tab now uses the same dark-panel background as Goals and Vault

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
