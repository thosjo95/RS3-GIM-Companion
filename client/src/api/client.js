const BASE = '/api';

let _groupId = null;
let _groupPassword = null;
let _onUnauthorized = null;

export function setGroupContext(groupId, password) {
  _groupId = groupId ? String(groupId) : null;
  _groupPassword = password || null;
}

export function setOnUnauthorized(cb) {
  _onUnauthorized = cb;
}

async function request(path, options = {}) {
  const authHeaders = {};
  if (_groupId) authHeaders['X-Group-Id'] = _groupId;
  if (_groupPassword) authHeaders['X-Group-Password'] = _groupPassword;

  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders, ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && _onUnauthorized) {
    _onUnauthorized(data.error);
    throw new Error(data.error || 'Unauthorized');
  }
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export const api = {
  // Groups
  getGroups: () => request('/groups'),
  getGroup: (id) => request(`/groups/${id}`),
  searchGroups: (name) => request(`/groups/search?name=${encodeURIComponent(name)}`),
  createGroup: (body) => request('/groups', { method: 'POST', body }),
  updateGroup: (id, body) => request(`/groups/${id}`, { method: 'PUT', body }),
  deleteGroup: (id) => request(`/groups/${id}`, { method: 'DELETE' }),
  lookupGroup: (name, type, size) => request(`/groups/lookup?name=${encodeURIComponent(name)}&type=${type}&size=${size}`),
  setupGroup: (body) => request('/groups/setup', { method: 'POST', body }),
  verifyGroup: (id) => request(`/groups/${id}/verify`, { method: 'POST' }),

  // Players
  getPlayers: () => request('/players'),
  getPlayer: (id) => request(`/players/${id}`),
  addPlayer: (body) => request('/players', { method: 'POST', body }),
  updatePlayer: (id, body) => request(`/players/${id}`, { method: 'PUT', body }),
  deletePlayer: (id) => request(`/players/${id}`, { method: 'DELETE' }),
  syncPlayer: (id) => request(`/players/${id}/sync`, { method: 'POST' }),
  syncAll: (groupId) => request(`/players/sync-all/${groupId}`, { method: 'POST' }),
  getSnapshots: (id) => request(`/players/${id}/snapshots`),

  // Goals
  getGoals: (groupId) => request(`/goals${groupId ? `?group_id=${groupId}` : ''}`),
  createGoal: (body) => request('/goals', { method: 'POST', body }),
  updateGoal: (id, body) => request(`/goals/${id}`, { method: 'PUT', body }),
  deleteGoal: (id) => request(`/goals/${id}`, { method: 'DELETE' }),
  getSuggestions: (groupId) => request(`/goals/suggestions/${groupId}`),

  // Drops
  getDrops: (groupId) => request(`/drops${groupId ? `?group_id=${groupId}` : ''}`),
  addDrop: (body) => request('/drops', { method: 'POST', body }),
  deleteDrop: (id) => request(`/drops/${id}`, { method: 'DELETE' }),

  // Item requests
  getRequests: (groupId) => request(`/drops/requests${groupId ? `?group_id=${groupId}` : ''}`),
  addRequest: (body) => request('/drops/requests', { method: 'POST', body }),
  updateRequest: (id, body) => request(`/drops/requests/${id}`, { method: 'PUT', body }),
  deleteRequest: (id) => request(`/drops/requests/${id}`, { method: 'DELETE' }),
};
