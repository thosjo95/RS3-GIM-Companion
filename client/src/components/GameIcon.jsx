import React, { useEffect, useState } from 'react';

// Official images for game things, used across the whole app.
//   ItemIcon: Jagex's item sprite by the game's item id (the plugin knows it; for items known only by name the id is
//             looked up on the server), then the RuneScape Wiki image by name, then a lettered tile.
//   BossIcon: the RuneScape Wiki's chathead of a boss, then its NPC image, else nothing.

// ── name -> item id, resolved in batches by the server ────────────────────────
const idCache = new Map();          // lowercase name -> id | null (unknown)
const waiting = new Set();          // names queued for the next request
const listeners = new Set();
let timer = null;

function flush() {
  timer = null;
  const names = [...waiting]; waiting.clear();
  if (names.length === 0) return;
  fetch('/api/rs3/item-ids', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ names: names.slice(0, 400) }) })
    .then(r => (r.ok ? r.json() : {}))
    .catch(() => ({}))
    .then(found => {
      for (const n of names) idCache.set(n.toLowerCase(), found[n] ?? null);
      listeners.forEach(fn => fn());
    });
}

function useItemId(id, name) {
  const [, bump] = useState(0);
  useEffect(() => {
    if (id != null || !name) return undefined;
    const key = name.toLowerCase();
    if (!idCache.has(key)) { waiting.add(name); if (!timer) timer = setTimeout(flush, 60); }
    const fn = () => bump(n => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, [id, name]);
  if (id != null) return id;
  return name ? (idCache.get(name.toLowerCase()) ?? null) : null;
}

// Wiki file names start with a capital letter and are mostly written in sentence case ("Fire cape", not "Fire Cape"); the
// drop log writes "pair of Torva boots" for the item "Torva boots". So several spellings are tried, one after the other.
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const wikiFile = name => `https://runescape.wiki/images/${encodeURIComponent(cap(String(name).trim()).replace(/ /g, '_'))}.png`;
const stripPrefix = s => s.replace(/^(pair of|set of|piece of|a|an|the)\s+/i, '').replace(/^book:\s*/i, '').trim();
const sentence = s => cap(s.toLowerCase());
export function itemPictureCandidates(name) {
  const n = String(name || '').trim();
  if (!n) return [];
  const b = stripPrefix(n);
  return [...new Set([n, sentence(n), b, sentence(b)].filter(Boolean).map(wikiFile))];
}

// A noted item: the note's own picture (blank paper) with the real item drawn small on top, as in the game.
function NotedIcon({ id, noteOf, name, size }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <img src={`https://secure.runescape.com/m=itemdb_rs/obj_sprite.gif?id=${id}`} alt="" loading="lazy"
        style={{ position: 'absolute', inset: 0, width: size, height: size, objectFit: 'contain', imageRendering: 'pixelated' }} />
      <img src={`https://secure.runescape.com/m=itemdb_rs/obj_sprite.gif?id=${noteOf}`} alt={name ? `${name} (noted)` : 'noted item'} loading="lazy"
        style={{ position: 'absolute', left: '18%', top: '14%', width: '62%', height: '62%', objectFit: 'contain', imageRendering: 'pixelated' }} />
    </div>
  );
}

export function ItemIcon({ id, name, size = 36, noteOf = null }) {
  if (noteOf != null && id != null) return <NotedIcon id={id} noteOf={noteOf} name={name} size={size} />;
  return <PlainItemIcon id={id} name={name} size={size} />;
}

function PlainItemIcon({ id, name, size }) {
  const resolved = useItemId(id, name);
  const [stage, setStage] = useState(0);
  useEffect(() => setStage(0), [resolved, name]);
  const letter = (name || '?').trim().charAt(0).toUpperCase();
  // the sprite by item id first (when the id is known), then the wiki picture under the different spellings of the name
  const sources = [...(resolved != null ? [`https://secure.runescape.com/m=itemdb_rs/obj_sprite.gif?id=${resolved}`] : []), ...itemPictureCandidates(name)];
  const src = sources[stage] ?? null;
  if (!src) {
    return <div style={{ width: size, height: size, borderRadius: 6, background: 'var(--bg-root)', border: '1px solid var(--border)', color: 'var(--text-dim)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.45, flexShrink: 0 }}>{letter}</div>;
  }
  return <img src={src} alt={name || ''} loading="lazy" onError={() => setStage(st => st + 1)}
    style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0, imageRendering: src.includes('obj_sprite') ? 'pixelated' : 'auto' }} />;
}

// "Giant Mole — 50 Kills", "K'ril Tsutsaroth (Zamorak)" and the like -> the plain boss name
const bossBase = s => String(s || '').replace(/\s*[—–]\s.*$/, '').replace(/\s*\([^)]*\)\s*$/, '').trim();

const BOSS_NAME = { 'Rasial': 'Rasial, the First Necromancer', 'Kerapac, the Bound': 'Kerapac, the Bound', 'Giant Mole': 'Giant Mole', 'Araxxor / Araxxi': 'Araxxi' };
function bossCandidates(name) {
  const base = bossBase(name).split(/\s+\/\s+/).pop();             // "Araxxor / Araxxi" -> "Araxxi"
  if (!base) return [];
  const alias = BOSS_NAME[bossBase(name)] ?? BOSS_NAME[base] ?? base;
  const names = [...new Set([alias, base, sentence(alias)])];
  return [...names.map(n => wikiFile(`${n} chathead`)), ...names.map(wikiFile)];
}

export function BossIcon({ name, size = 24, fallback = null }) {
  const [stage, setStage] = useState(0);
  const sources = bossCandidates(name);
  const key = sources[0] ?? '';
  useEffect(() => setStage(0), [key]);
  const src = sources[stage];
  if (!src) return fallback;
  return <img src={src} alt={bossBase(name)} loading="lazy" onError={() => setStage(s => s + 1)} style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />;
}
