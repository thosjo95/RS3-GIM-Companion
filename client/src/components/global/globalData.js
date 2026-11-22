import { api } from '../../api/client';

// The Global Leaderboard numbers, fetched once and shared for a minute by everything on the page that shows them
// (the first-visit card, the tracked-groups list and the leaderboard itself), so the page asks the server only once.
let cached = null;          // { at, promise }

export function loadGlobalStats() {
  if (cached && Date.now() - cached.at < 60_000) return cached.promise;
  const promise = api.getGlobalStats().catch(err => { cached = null; throw err; });
  cached = { at: Date.now(), promise };
  return promise;
}
