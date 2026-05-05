import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

const ALL_EVENTS = [
  { key: 'level_milestones',  label: '🎉 Level 99s & 120s',         desc: 'When a player reaches level 99 or 120 in any skill' },
  { key: 'diary_completions', label: '📋 Achievement Diaries',       desc: 'When a diary tier (Easy/Medium/Hard) is completed' },
  { key: 'boss_first_kills',  label: '⚔️ Boss First Kills',          desc: 'When a player defeats a boss for the first time' },
  { key: 'goal_completions',  label: '🎯 Group Goals',               desc: 'When a group goal is marked as complete' },
  { key: 'drops',             label: '🎁 Drops',                     desc: 'Every drop detected from the activity feed (can be noisy)' },
];

export default function WebhookSettings({ groupId, onClose, onToast }) {
  const [url, setUrl]         = useState('');
  const [events, setEvents]   = useState(['level_milestones', 'diary_completions', 'boss_first_kills', 'goal_completions']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [testing, setTesting] = useState(false);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    api.getWebhook(groupId).then(data => {
      setConfigured(data.configured);
      setUrl(data.webhook_url || '');
      setEvents(data.events || ['level_milestones', 'diary_completions', 'boss_first_kills', 'goal_completions']);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [groupId]);

  function toggleEvent(key) {
    setEvents(prev => prev.includes(key) ? prev.filter(e => e !== key) : [...prev, key]);
  }

  async function handleSave() {
    if (!url.trim() && !configured) return onToast('Paste a Discord webhook URL first', 'error');
    setSaving(true);
    try {
      await api.saveWebhook(groupId, { webhook_url: url.trim(), events });
      setConfigured(!!url.trim());
      onToast('Webhook settings saved ✓', 'success');
    } catch (err) {
      onToast(err.message, 'error');
    } finally { setSaving(false); }
  }

  async function handleTest() {
    if (!url.trim()) return onToast('Enter a webhook URL to test', 'error');
    setTesting(true);
    try {
      await api.testWebhook(groupId, url.trim());
      onToast('Test message sent — check your Discord channel!', 'success');
    } catch (err) {
      onToast(`Test failed: ${err.message}`, 'error');
    } finally { setTesting(false); }
  }

  async function handleRemove() {
    setSaving(true);
    try {
      await api.saveWebhook(groupId, { webhook_url: '', events });
      setUrl('');
      setConfigured(false);
      onToast('Webhook removed', 'success');
    } catch (err) {
      onToast(err.message, 'error');
    } finally { setSaving(false); }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <span className="modal-title">🔔 Discord Notifications</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="modal-body" style={{ textAlign: 'center', padding: '32px 0' }}>
            <span className="spinner" style={{ width: 24, height: 24 }} />
          </div>
        ) : (
          <>
            <div className="modal-body">
              {/* How-to */}
              <div style={{
                padding: '10px 12px', marginBottom: 16, borderRadius: 'var(--radius)',
                background: 'rgba(200,168,75,0.07)', border: '1px solid rgba(200,168,75,0.25)',
                fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.6,
              }}>
                <strong style={{ color: 'var(--gold)' }}>How to get a webhook URL:</strong>
                <br />
                In Discord → right-click a channel → <em>Edit Channel</em> → <em>Integrations</em> → <em>Webhooks</em> → <em>New Webhook</em> → copy the URL.
              </div>

              {/* Status badge */}
              {configured && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', marginBottom: 12, borderRadius: 'var(--radius)',
                  background: 'rgba(76,175,80,0.10)', border: '1px solid rgba(76,175,80,0.3)',
                  fontSize: 12,
                }}>
                  <span style={{ color: 'var(--green-bright)', fontWeight: 600 }}>✓ Webhook active</span>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--text-dim)' }}
                    onClick={handleRemove} disabled={saving}>Remove</button>
                </div>
              )}

              {/* Webhook URL */}
              <div className="form-group">
                <label className="form-label">Webhook URL</label>
                <input
                  className="form-input"
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/…"
                  style={{ fontSize: 12 }}
                />
              </div>

              {/* Event toggles */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ marginBottom: 8 }}>Notify me when…</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ALL_EVENTS.map(ev => (
                    <label key={ev.key} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
                      padding: '9px 12px', borderRadius: 'var(--radius)',
                      background: events.includes(ev.key) ? 'rgba(200,168,75,0.08)' : 'var(--bg-panel-alt)',
                      border: `1px solid ${events.includes(ev.key) ? 'rgba(200,168,75,0.35)' : 'var(--border)'}`,
                      transition: 'all 0.15s',
                    }}>
                      <input
                        type="checkbox"
                        checked={events.includes(ev.key)}
                        onChange={() => toggleEvent(ev.key)}
                        style={{ marginTop: 2, flexShrink: 0, accentColor: 'var(--gold)' }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-bright)' }}>{ev.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{ev.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-ghost" onClick={handleTest} disabled={testing || !url.trim()}>
                {testing ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Testing…</> : '📨 Test'}
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Saving…</> : '✓ Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
