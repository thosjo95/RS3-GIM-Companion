# RS3 GIM Companion

A companion web app for RuneScape 3 Group Ironman groups. Tracks hiscores, XP gains, goals, and group weakness maps.

## Quick Start

### Requirements
- Node.js 18 or newer (https://nodejs.org)

### Install & Run

Open a terminal in this folder and run:

```bash
# Install all dependencies (root + server + client)
npm run install:all

# Start both server and client in dev mode
npm run dev
```

Then open **http://localhost:5173** in your browser.

The API server runs on port **3001**. The Vite dev server proxies `/api` to it automatically.

---

## What it does

### Dashboard — Overview tab
- Group total XP, total levels, quest points
- XP and QP contribution bars per player
- Active goals quick view

### Players tab
- Add players by RSN (RuneScape Name)
- Syncs hiscores from Jagex automatically on add
- Shows: combat level, total level, total XP, top skills, XP gains today/week/month
- Click quest points to manually edit them
- ↻ button syncs an individual player
- "Sync All" button in the header syncs all players at once

### Goals tab
- Add personal or group goals
- Categories: Skill, Quest, Boss, Item/Drop, Diary, Other
- Priority levels: High / Medium / Low
- Click goal status to cycle through: Not Started → In Progress → Blocked → Complete
- "💡 Suggestions" auto-generates goals based on your group's weakest skills

### Weakness Map tab
- Grid of all RS3 skills showing the group average level, min/max range, and who is lowest
- Alert threshold is adjustable — red below threshold, orange near it, green above

---

## Data notes

- **Hiscores data**: pulled from the public RS3 hiscores API (`secure.runescape.com`). Requires players to be on the public hiscores.
- **Quest points**: not available from the public API — enter manually per player by clicking the QP value on a player card.
- **Daily snapshots**: taken automatically at midnight (server must be running). XP gains are calculated vs. the earliest snapshot in the selected period.
- **Database**: stored in `server/data/gim.db` (SQLite). Back this file up if you want to preserve your data.

---

## Troubleshooting

**"Player not found on hiscores"** — The RSN must match exactly (including capitalisation) as it appears on the RS3 hiscores. Some GIM accounts may not appear on the regular hiscores; try the exact in-game name.

**Backend won't start** — Make sure you ran `npm install --prefix server` and that Node 18+ is installed.

**Port conflicts** — Change the server port in `server/index.js` (default 3001) and update `client/vite.config.js` to match.
