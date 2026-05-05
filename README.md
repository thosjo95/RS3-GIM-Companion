# ⚔️ RS3 GIM Companion

Private companion web app for a RuneScape 3 Group Ironman group. Live at **[groupiron.com](https://groupiron.com)**.

---

## Features

### 📊 Overview
- Member cards with RS3 avatars, **YOU** badge (highlights your character), click-to-focus on a player
- Stat boxes: Members · Total XP · Total Levels · Active This Week (click to toggle weekly XP mode)
- **Group Stats** — XP bars, Skills matrix (all 29 skills × all players, highest per row gold-highlighted), Combat tab with RS3 icons (includes Necromancy & Summoning)
- **Goals + Activity** — defaults to both panels side-by-side; goals support level/item/quest/custom types with live XP-to-go; RuneMetrics activity feed

### 💎 Items & Drops
- Drop log with auto-detection from RuneMetrics activity feed on sync
- Item request list — track who needs what and from which boss

### 📋 Achievement Diaries
- Tracks RS3 Achievement Diary completion across 13 regions × 3 tiers (Easy / Medium / Hard)
- **Grid view** — regions as rows, tiers as columns; coloured player dots show who has completed each
- **Player view** — per-player breakdown with colour-coded tier buttons and completion dates
- Auto-detected from RuneMetrics activity feed on each sync; manual toggle for any cell (requires group unlock)
- Progress bar per player showing diary completion percentage

### 🏅 Leaderboards
- **Boss Kills** *(default section)* — accumulated from RuneMetrics activity feed; bosses as rows × players as columns; boss filter dropdown; auto-detected on every sync
- **Firsts** — ~40 predefined milestone cards (PvM · Quest · Skill · Item) showing who in the group achieved each one first; auto-detected from activity feeds; unachieved cards show dimmed as "Not yet"
- **Milestones** — full chronological feed of 99s, 120s, quest completions, boss kills
- **Skill Mastery** — 99 and 120 breakdown per player with RS3 wiki skill icons
- **Clue Scrolls** — hiscores leaderboard across all 5 tiers (Easy / Medium / Hard / Elite / Master) sourced from the RS3 hiscores CSV

### 🏆 Group Vault
- Completed goals moved here as a permanent showcase of group achievements

### 💡 Tips & Milestones
- Auto-generated goal suggestions based on the group's weakest skills
- Recommended quests and skill targets with RS Wiki links

---

## Claim & Access Control

Groups are unclaimed when first imported. Click the **🔒** lock icon → the app auto-generates a secret (`XXXX-XXXX-XXXX`), shown once. Share it with your group on Discord. Any browser that enters the secret can make changes; everyone else is read-only.

---

## Group Management

Click **👥 Find or Manage Groups** in the sidebar to:
- Search for an existing group by name and add it to your sidebar
- Create a new group
- ★ Favourite a group (pins it to the top of the sidebar)
- ✕ Remove a group from your sidebar

---

## Mobile Support

Fully responsive at ≤600px:
- Hamburger ☰ button slides the sidebar in as a drawer with a dimmed overlay
- Tab bars scroll horizontally without wrapping
- Skills matrix narrows to 3 columns
- Modals slide up as a bottom sheet

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Backend | Node.js 22 + Express |
| Database | SQLite (`node:sqlite` built-in) |
| Data sources | RS3 Hiscores CSV API + RuneMetrics JSON API |
| Hosting | Hetzner VPS — Ubuntu 22.04 |
| Web server | Nginx (reverse proxy + SSL termination) |
| SSL | Cloudflare Origin Certificate |
| DNS / CDN | Cloudflare |
| Process manager | PM2 |

---

## Local Development

Requires **Node.js 22+**.

```bash
npm run install:all   # installs root + server + client deps
npm run dev           # starts API on :3001 and Vite dev server on :5173
```

Open **http://localhost:5173** — `/api` is proxied to the backend automatically.

---

## Deploy to Production

```bash
ssh root@178.104.126.158
bash /root/deploy.sh
```

The script does: `git pull` → `npm run build` (Vite) → `pm2 restart app`.

---

## Project Structure

```
RS3-GIM-Companion/
├── client/src/
│   ├── App.jsx                  # Root: sidebar, group selection, claim/unlock modals, mobile drawer
│   ├── index.css                # Global styles + mobile media queries (≤600px)
│   ├── api/client.js            # All fetch calls, auth header injection
│   └── components/
│       ├── Dashboard.jsx        # Tab router (Overview / Drops / Achievements / Leaderboards / Vault / Tips)
│       ├── Header.jsx           # Hamburger button, lock icon, Sync All, last-sync time
│       ├── OverviewTab.jsx      # Member cards · GroupStats · RightPanel (goals+activity)
│       ├── DropsTab.jsx         # Drop log + item requests
│       ├── AchievementsTab.jsx  # Achievement Diary grid + player view with manual toggle
│       ├── LeaderboardsTab.jsx  # Boss Kills · Firsts · Milestones · Skill Mastery · Clue Scrolls
│       ├── VaultTab.jsx         # Completed-goal showcase
│       ├── TipsTab.jsx          # Skill suggestions + recommended quests
│       └── GoalModal.jsx        # Goal creation wizard
└── server/
    ├── database.js              # SQLite schema + safe ALTER TABLE migrations
    ├── index.js                 # Express app + cron jobs (5-min activity sync, midnight snapshot)
    ├── routes/
    │   ├── groups.js            # Group CRUD · /claim · /verify · weekly XP aggregation
    │   ├── players.js           # Player CRUD · /sync · /sync-all · auto-detection pipeline
    │   ├── goals.js             # Goal CRUD + vault status
    │   ├── drops.js             # Drops + item requests CRUD
    │   ├── achievements.js      # GET/POST achievements (diary completions per player)
    │   └── bossKills.js         # GET boss kills aggregated by group
    ├── services/
    │   ├── runescape.js         # fetchHiscores() · fetchRuneMetrics() · calcCombatLevel()
    │   └── activitySync.js      # autoLogDrops · autoDetectDiaries · autoCountBossKills
    └── utils/
        └── auth.js              # SHA-256 hashing · checkGroupAuth middleware
```

---

## Database Tables

| Table | Purpose |
|---|---|
| `groups` | Group name, type, size, password hash, last activity |
| `players` | RSN, combat level, stats_json (hiscores), activities_json (RuneMetrics) |
| `skills` | Per-player skill levels, XP, hiscores rank |
| `snapshots` | Daily XP snapshots used for weekly XP gain calculation |
| `goals` | Goal definitions, status, current/target values, details JSON |
| `goal_contributors` | Many-to-many: goals ↔ players |
| `drops` | Drop log entries (auto-detected + manually added) |
| `item_requests` | Item wish-list per player |
| `achievements` | Diary tier completion per player (key = `diary_{region}_{tier}`, achieved flag, timestamp, manual flag) |
| `boss_kills` | Accumulated boss kill counts per player, sourced from RuneMetrics activity feed |
| `boss_kill_log` | Deduplication log — one row per unique activity processed, prevents double-counting on re-sync |
