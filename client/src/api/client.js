const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export const api = {
  // Groups
  getGroups: () => request('/groups'),
  getGroup: (id) => request(`/groups/${id}`),
  createGroup: (body) => request('/groups', { method: 'POST', body }),
  updateGroup: (id, body) => request(`/groups/${id}`, { method: 'PUT', body }),
  deleteGroup: (id) => request(`/groups/${id}`, { method: 'DELETE' }),

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
