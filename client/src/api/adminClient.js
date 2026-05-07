const BASE = '/api/admin';

let _token = null;

export function setAdminToken(token) {
  _token = token;
  if (token) sessionStorage.setItem('admin_token', token);
  else sessionStorage.removeItem('admin_token');
}

export function loadAdminToken() {
  _token = sessionStorage.getItem('admin_token') || null;
  return _token;
}

export function clearAdminToken() {
  setAdminToken(null);
}

export function hasAdminToken() {
  return !!_token;
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;
  const res = await fetch(`${BASE}${path}`, {
    headers,
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    clearAdminToken();
    throw new Error('Session expired — please log in again');
  }
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export const adminApi = {
  login:              (username, password) => fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d; }),

  getStats:           ()           => request('/stats'),
  getSubmissions:     (params={})  => request(`/submissions${toQS(params)}`),
  getSubmission:      (id)         => request(`/submissions/${id}`),
  createSubmission:   (body)       => request('/submissions', { method: 'POST', body }),
  approveSubmission:  (id, note)   => request(`/submissions/${id}/approve`, { method: 'POST', body: { review_note: note } }),
  rejectSubmission:   (id, note)   => request(`/submissions/${id}/reject`,  { method: 'POST', body: { review_note: note } }),
  getTable:           (name, params={}) => request(`/table/${name}${toQS(params)}`),
  getAudit:           ()           => request('/audit'),

  // Maintenance operations
  maintenance: {
    listGroups:        ()           => request('/maintenance/groups'),
    listPlayers:       (groupId)    => request(`/maintenance/groups/${groupId}/players`),
    movePlayers:       (body)       => request('/maintenance/move-players',      { method: 'POST', body }),
    deleteOrphanGroup: (body)       => request('/maintenance/delete-orphan-group', { method: 'POST', body }),
    resetSecret:       (body)       => request('/maintenance/reset-secret',      { method: 'POST', body }),
    deleteGroup:       (body)       => request('/maintenance/delete-group',      { method: 'POST', body }),
    fixRsn:            (body)       => request('/maintenance/fix-rsn',           { method: 'POST', body }),
    syncActivities:    (groupId)    => fetch(`/api/players/sync-activities/${groupId}`, { method: 'POST' }).then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || `Status ${r.status}`); return d; }),
    syncPlayer:        (playerId)   => fetch(`/api/players/${playerId}/sync`,    { method: 'POST' }).then(async r => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || `Status ${r.status}`); return d; }),
    reseed:            ()           => request('/maintenance/reseed',  { method: 'POST' }),
    wikiScan:          (type)       => request(`/maintenance/wiki-scan${toQS({ type })}`),
    wikiAdd:           (body)       => request('/maintenance/wiki-add', { method: 'POST', body }),
  },
};

function toQS(params) {
  const entries = Object.entries(params).filter(([, v]) => v != null && v !== '');
  if (!entries.length) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}
