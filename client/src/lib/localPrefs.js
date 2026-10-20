// Per-browser preferences kept in localStorage (saved groups, favourites, unlock secrets).

export function loadStoredPasswords() {
  try { return JSON.parse(localStorage.getItem('groupPasswords') || '{}'); } catch { return {}; }
}

export function loadMyGroupIds() {
  try { return JSON.parse(localStorage.getItem('myGroupIds') || '[]'); } catch { return []; }
}

export function saveMyGroupIds(ids) {
  localStorage.setItem('myGroupIds', JSON.stringify([...new Set(ids)]));
}

export function loadFavoriteIds() {
  try { return JSON.parse(localStorage.getItem('favoriteGroupIds') || '[]'); } catch { return []; }
}

export function saveFavoriteIds(ids) {
  localStorage.setItem('favoriteGroupIds', JSON.stringify([...new Set(ids)]));
}
