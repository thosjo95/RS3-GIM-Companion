/**
 * Item name -> game item id, from the RuneScape Wiki's public Grand Exchange data (Weird Gloop dump). Used to show
 * Jagex's own item sprite for items we only know by name (drops, goals). Loaded once, refreshed daily; if the
 * download fails the lookup is simply empty and the client falls back to the wiki image by name.
 */
const URL = 'https://chisel.weirdgloop.org/gazproj/gazbot/rs_dump.json';
const DAY = 24 * 60 * 60 * 1000;
let index = null, loadedAt = 0, loading = null;

const norm = s => String(s ?? '').trim().toLowerCase();

async function load() {
  const res = await fetch(URL, { headers: { 'User-Agent': 'GIM-Companion' }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`item dump ${res.status}`);
  const data = await res.json();
  const map = new Map();
  for (const it of Object.values(data)) if (it?.name && Number.isInteger(it.id) && !map.has(norm(it.name))) map.set(norm(it.name), it.id);
  index = map; loadedAt = Date.now();
}

async function ensure() {
  if (index && Date.now() - loadedAt < DAY) return;
  if (!loading) loading = load().catch(() => { loadedAt = Date.now() - DAY + 10 * 60 * 1000; }).finally(() => { loading = null; });
  await loading;
}

/** { "Abyssal whip": 4151, ... } for the names that are known. */
async function idsFor(names) {
  await ensure();
  const out = {};
  if (!index) return out;
  // the drop log writes "pair of Torva boots" for the item "Torva boots"
  const strip = x => norm(x).replace(/^(pair of|set of|piece of|a|an|the)s+/, '').replace(/^book:s*/, '');
  for (const n of names) { const id = index.get(norm(n)) ?? index.get(strip(n)); if (id != null) out[n] = id; }
  return out;
}
module.exports = { idsFor };
