/**
 * The group's real position on Jagex's Group Ironman hiscores (public endpoint, see the RuneScape Wiki's API page).
 * The board is sorted by group total XP, one board per group size and mode. A group is found by binary search on its
 * XP, then matched by name in the neighbourhood. Results are cached for an hour; failures are cached briefly.
 */
const BASE = 'https://secure.runescape.com/m=runescape_gim_hiscores/v1/groupScores';
const cache = new Map();            // groupId -> { at, value }
const TTL_OK = 60 * 60 * 1000, TTL_FAIL = 10 * 60 * 1000;

async function board(size, competitive, page, perPage) {
  const url = `${BASE}?groupSize=${size}&size=${perPage}&page=${page}&isCompetitive=${competitive}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'GIM-Companion' }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`hiscores ${res.status}`);
  return res.json();
}

async function lookup(group) {
  if (!['regular', 'competitive'].includes(group.gim_type)) return null;      // unranked / custom groups are not on the board
  const size = group.gim_size ?? 5, competitive = group.gim_type === 'competitive';
  const names = [group.name, group.group_rsn].filter(Boolean).map(n => n.toLowerCase());
  const first = await board(size, competitive, 0, 1);
  const total = first.totalElements;
  if (!total) return null;
  const xp = group.group_total_xp ?? 0;
  // binary search: first index whose XP is <= ours (the board is sorted by XP, highest first)
  let lo = 0, hi = total - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const e = (await board(size, competitive, mid, 1)).content?.[0];
    if (e && e.groupTotalXp > xp) lo = mid + 1; else hi = mid;
  }
  // look around that position (our XP can differ a little from Jagex's)
  const PER = 100, start = Math.max(0, lo - 150);
  for (let off = 0; off < 300; off += PER) {
    const pageSize = PER, startIdx = start + off;
    const data = await board(size, competitive, Math.floor(startIdx / pageSize), pageSize);
    const idx = (data.content ?? []).findIndex(e => names.includes(String(e.name).toLowerCase()));
    if (idx >= 0) {
      const e = data.content[idx];
      return { rank: Math.floor(startIdx / pageSize) * pageSize + idx + 1, total, xp: e.groupTotalXp, level: e.groupTotalLevel };
    }
  }
  // Not near our XP (for example while a member's data is missing): scan the whole board by name.
  if (total <= 6000) {
    for (let page = 0; page * PER < total; page++) {
      const data = await board(size, competitive, page, PER);
      const idx = (data.content ?? []).findIndex(e => names.includes(String(e.name).toLowerCase()));
      if (idx >= 0) { const e = data.content[idx]; return { rank: page * PER + idx + 1, total, xp: e.groupTotalXp, level: e.groupTotalLevel }; }
    }
  }
  return { rank: null, total };
}

async function groupRank(group) {
  const hit = cache.get(group.id);
  if (hit && Date.now() - hit.at < (hit.value ? TTL_OK : TTL_FAIL)) return hit.value;
  let value = null;
  try { value = await lookup(group); } catch { value = null; }
  cache.set(group.id, { at: Date.now(), value });
  return value;
}
module.exports = { groupRank };
