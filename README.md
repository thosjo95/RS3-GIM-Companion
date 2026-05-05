<div align="center">
  <img src="client/public/logo.svg" alt="RS3 GIM Companion" height="120" />
  <h1>RS3 GIM Companion</h1>
  <p><strong>A private companion web app for RuneScape 3 Group Ironman teams.</strong></p>
  <p>
    <a href="https://groupiron.com"><img src="https://img.shields.io/badge/live-groupiron.com-c8a84b?style=flat-square&logo=runescape&logoColor=white" alt="Live site"/></a>
    <a href="https://discord.gg/uZT4JDdtn2"><img src="https://img.shields.io/badge/Discord-support-5865F2?style=flat-square&logo=discord&logoColor=white" alt="Discord"/></a>
    <img src="https://img.shields.io/badge/version-1.0.0-4caf50?style=flat-square" alt="v1.0.0"/>
    <img src="https://img.shields.io/badge/RS3-Group_Ironman-c8a84b?style=flat-square" alt="RS3 GIM"/>
  </p>
</div>

---

## What is this?

RS3 GIM Companion is a self-hosted web app that gives your Group Ironman team a shared dashboard — syncing hiscores, tracking goals, logging drops, managing gear loadouts, and celebrating achievements together. Built specifically for **RuneScape 3** (not OSRS).

Live at **[groupiron.com](https://groupiron.com)** — or self-host it in minutes.

---

## Features

### 📊 Overview
- Member cards with RS3 avatars, **YOU** badge, click-to-focus on any player
- Stat summary: Members · Total XP · Total Levels · Active This Week
- **Group Stats** — XP progress bars, full Skills matrix (all 29 RS3 skills × all players, gold-highlight for group best), Combat breakdown with RS3 icons (includes Necromancy & Summoning)
- **Goals panel** — level / item / quest / custom goals with live XP-to-go tracking
- **Activity feed** — live RuneMetrics feed showing recent drops, quests, milestones

### 🏆 Group Vault & Gear Loadouts
- **Group Vault** — every logged drop displayed as an item card; shows WORN badge + "Worn by [player] · slot · date" when an item is confirmed in someone's gear; DUPE badge for items multiple players have obtained
- **Gear Loadouts** — per-player equipment grid across 5 combat styles (Melee / Ranged / Magic / Necromancy / Hybrid); wiki-verified item requirements (Defence, Constitution, quest prereqs); confirmation dialog (✅ Owned vs 📋 Planning); read-only when viewing teammates' gear; only your own character is editable
- **Group Notes** — floating slide-in pinboard for strategies, loot rules, and session plans; auto-saves with debounce
- Real-time: confirming gear instantly updates the vault's worn status without page reload

### 💎 Items & Drops  *(single page, three panels)*
- **Item Requests** — wish-list per player: boss, priority (High/Medium/Low), quantity, notes; boss colour key shows readiness (🟢 ready / 🟠 close / 🔴 missing reqs)
- **Drop Log** — manually logged drops plus auto-detected entries from the RuneMetrics activity feed; every drop also shows in the Group Vault
- **Boss Overview** — compact sidebar showing which bosses have pending requests, which players can attempt them, and how far the closest player is from meeting requirements

### 💡 Tips & Milestones
- **Key Quests** — curated list with unlock rewards and priority ratings (e.g. While Guthix Sleeps → Ancient Curses, Elder Kiln → TokHaar-Kal capes)
- **Skill Goals** — milestone levels for every key RS3 breakpoint (Prayer 43/70/95, Herblore 96/106, Necromancy 70/99/120, Invention 27/99, etc.)
- **Milestone Items** — Fire Cape → TokHaar-Kal-Ket/Xil/Mej → Igneous Kal-Ket/Xil/Mej/Mor; Barrows, Void, Chaotics, Nox, Trimmed masterwork, and more
- All items link to the RS3 Wiki; any milestone can be added as a group or personal goal in one click
- Custom milestones — add your own with type / priority / description; saved locally per group

### 📋 Achievement Diaries
- 13 regions × 3 tiers (Easy / Medium / Hard) — same structure as RS3
- **Grid view** — coloured player dots per cell showing who has completed each diary
- **Player view** — per-player completion with toggle and dates
- Auto-detected from RuneMetrics activity feed on each sync; manual override available

### 🏅 Leaderboards
- **Boss Kills** — accumulated from activity feed; boss × player matrix with filter; auto-updates on every sync
- **Firsts** — ~40 milestone cards showing who in the group achieved each one first (quests, bosses, skill 99s, rare drops)
- **Milestones** — full chronological feed of 99s, 120s, quest completions, boss kills
- **Skill Mastery** — 99 and 120 breakdown per player with RS3 wiki skill icons
- **Clue Scrolls** — hiscores leaderboard across all 5 tiers

---

## Access Control

Groups are read-only until claimed. Click **🔒 Claim group** → the app generates a secret (`XXXX-XXXX-XXXX`) shown once. Share it with your team. Anyone who enters the secret on their device can edit; everyone else can view.

Once unlocked, set your character name (👤 button in the header) so the app knows which gear loadout is yours to edit.

---

## Group Management

Click **👥 Find or Manage Groups** in the sidebar to:
- Search by group name and add any group to your sidebar
- Create a new group
- ★ Favourite groups (pins to top of sidebar)
- ✕ Remove groups you no longer want in your sidebar

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
│           ├── Dashboard.jsx        # Tab router (Overview / Vault / Drops / Tips / Diaries / Leaderboards)
│           ├── Header.jsx           # Logo, Discord link, lock/unlock, sync button
│           ├── OverviewTab.jsx      # Member cards · Group Stats · Goals · Activity feed
│           ├── VaultTab.jsx         # Group Vault (drops + worn gear) · Gear Loadouts · Notes overlay
│           ├── GearLoadouts.jsx     # Equipment grid, item picker, wiki-verified requirements
│           ├── DropsTab.jsx         # Item Requests · Drop Log · Boss Overview (single page)
│           ├── TipsTab.jsx          # Quests · Skill goals · Milestone items (custom milestones)
│           ├── AchievementsTab.jsx  # Achievement Diaries — grid + player view
│           ├── LeaderboardsTab.jsx  # Boss Kills · Firsts · Milestones · Skill Mastery · Clue Scrolls
│           └── GoalModal.jsx        # Goal creation wizard
│   └── data/
│       ├── gearSuggestions.js       # Wiki-verified item requirements for all 5 combat styles
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
    │   └── activitySync.js          # Auto-detect drops · diaries · boss kills from feed
    └── utils/
        └── auth.js                  # SHA-256 hashing · checkGroupAuth middleware
```

---

## Database Tables

| Table | Purpose |
|---|---|
| `groups` | Name, type, size, password hash, last activity |
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

---

## Changelog

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
