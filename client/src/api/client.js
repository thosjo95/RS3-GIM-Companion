const BASE = '/api';

let _groupId = null;
let _groupPassword = null;
let _onUnauthorized = null;

function toQS(params) {
  const entries = Object.entries(params).filter(([, v]) => v != null && v !== '');
  if (!entries.length) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}

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
  searchGroups:  (name)          => request(`/groups/search?name=${encodeURIComponent(name)}`),
  browseGroups:  (limit = 25)    => request(`/groups/search?limit=${limit}`),
  createGroup: (body) => request('/groups', { method: 'POST', body }),
  updateGroup: (id, body) => request(`/groups/${id}`, { method: 'PUT', body }),
  deleteGroup: (id) => request(`/groups/${id}`, { method: 'DELETE' }),
  lookupGroup: (name, type, size) => request(`/groups/lookup?name=${encodeURIComponent(name)}&type=${type}&size=${size}`),
  setupGroup: (body) => request('/groups/setup', { method: 'POST', body }),
  verifyGroup: (id) => request(`/groups/${id}/verify`, { method: 'POST' }),
  claimGroup: (id) => request(`/groups/${id}/claim`, { method: 'POST', body: {} }),
  getWebhook:  (id)        => request(`/groups/${id}/webhook`),
  saveWebhook: (id, body)  => request(`/groups/${id}/webhook`, { method: 'PUT', body }),
  testWebhook: (id, url)   => request(`/groups/${id}/webhook/test`, { method: 'POST', body: { webhook_url: url } }),

  // Players
  getPlayers: () => request('/players'),
  getPlayer: (id) => request(`/players/${id}`),
  addPlayer: (body) => request('/players', { method: 'POST', body }),
  updatePlayer: (id, body) => request(`/players/${id}`, { method: 'PUT', body }),
  deletePlayer: (id) => request(`/players/${id}`, { method: 'DELETE' }),
  syncPlayer: (id) => request(`/players/${id}/sync`, { method: 'POST' }),
  syncAll: (groupId) => request(`/players/sync-all/${groupId}`, { method: 'POST' }),
  getSnapshots: (id) => request(`/players/${id}/snapshots`),
  getGroupSnapshots: (groupId, days = 7) => request(`/players/group-snapshots/${groupId}?days=${days}`),
  shareSnapshot:     (groupId, body) => request(`/groups/${groupId}/share-snapshot`, { method: 'POST', body }),

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

  // Achievement diaries
  getAchievements: (groupId) => request(`/achievements?group_id=${groupId}`),
  setAchievement: (playerId, key, achieved) =>
    request(`/achievements/${playerId}/${encodeURIComponent(key)}`, { method: 'PUT', body: { achieved } }),

  // Boss kills (activity-feed based)
  getBossKills: (groupId) => request(`/boss-kills?group_id=${groupId}`),

  // Group notes / pinboard
  getGroupNotes:  (groupId)          => request(`/group-notes/${groupId}`),
  saveGroupNotes: (groupId, content) => request(`/group-notes/${groupId}`, { method: 'PUT', body: { content } }),

  // Equipment loadouts
  getEquipment:      (playerId, style)                    => request(`/equipment?player_id=${playerId}&style=${style}`),
  getGroupEquipment: (groupId)                            => request(`/equipment/group/${groupId}`),
  saveEquipmentSlot: (playerId, style, slot, itemName, confirmed = false) =>
    request(`/equipment/${playerId}/${style}/${encodeURIComponent(slot)}`, { method: 'PUT', body: { item_name: itemName, confirmed } }),

  // RS3 reference data
  getRs3Bosses:          (params = {}) => request(`/rs3/bosses${toQS(params)}`),
  getRs3Quests:          (params = {}) => request(`/rs3/quests${toQS(params)}`),
  getRs3Items:           (params = {}) => request(`/rs3/items${toQS(params)}`),
  getRs3GearItems:       (params = {}) => request(`/rs3/gear/items${toQS(params)}`),
  getRs3GearPaths:       (params = {}) => request(`/rs3/gear/paths${toQS(params)}`),
  getRs3Milestones:      (params = {}) => request(`/rs3/milestones${toQS(params)}`),
  getRs3Slayer:          (params = {}) => request(`/rs3/slayer${toQS(params)}`),
  getRs3SkillMilestones: (params = {}) => request(`/rs3/skill-milestones${toQS(params)}`),
  getRs3Suggestions:     (params = {}) => request(`/rs3/suggestions${toQS(params)}`),
  searchRs3Items:        (q)            => request(`/rs3/item-search?q=${encodeURIComponent(q)}`),
};
