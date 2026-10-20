import React, { useState } from 'react';

// ── Site-wide announcement ────────────────────────────────────────────────────
// Shown once per browser session on page load. "Don't show again" hides it
// permanently in this browser. To publish a new announcement later, change
// ANNOUNCEMENT.id (so earlier dismissals no longer apply) and the text below.

export const ANNOUNCEMENT = {
  id: 'rs3-plugins-2026-10',
  title: '📢 An important update',
  linkUrl: 'https://www.rs3groupiron.men/demo',
  linkLabel: 'See the new tracker →',
};

const storageKey = id => `announcementDismissed_${id}`;

function readFlag(storage, key) {
  try { return storage.getItem(key) === '1'; } catch { return false; }
}
function writeFlag(storage, key) {
  try { storage.setItem(key, '1'); } catch { /* storage unavailable — ignore */ }
}

/** True when the current announcement should be shown in this browser/session. */
export function shouldShowAnnouncement(id = ANNOUNCEMENT.id) {
  const key = storageKey(id);
  if (typeof window === 'undefined') return false;
  return !readFlag(window.localStorage, key) && !readFlag(window.sessionStorage, key);
}

export default function AnnouncementModal({ onClose }) {
  const [dontShow, setDontShow] = useState(false);
  const key = storageKey(ANNOUNCEMENT.id);

  function close() {
    writeFlag(window.sessionStorage, key);
    if (dontShow) writeFlag(window.localStorage, key);
    onClose();
  }

  return (
    <div
      className="modal-backdrop"
      style={{ zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && close()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-title"
    >
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <span className="modal-title" id="announcement-title">{ANNOUNCEMENT.title}</span>
          <button className="btn btn-ghost btn-sm" onClick={close} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)', marginBottom: 12 }}>
            With the release of <strong style={{ color: 'var(--text-bright)' }}>RuneScape 3 plugins</strong>,
            this tool will soon be obsolete.
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)', marginBottom: 16 }}>
            I recommend taking a look at the new preferred method to track your Group Ironman:
          </p>
          <a
            href={ANNOUNCEMENT.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ display: 'flex', justifyContent: 'center', width: '100%', textDecoration: 'none' }}
          >
            {ANNOUNCEMENT.linkLabel}
          </a>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8, textAlign: 'center', wordBreak: 'break-all' }}>
            {ANNOUNCEMENT.linkUrl.replace(/^https?:\/\//, '')}
          </div>
        </div>
        <div className="modal-footer" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-dim)', cursor: 'pointer' }}>
            <input type="checkbox" checked={dontShow} onChange={e => setDontShow(e.target.checked)} />
            Don't show again
          </label>
          <button className="btn btn-secondary" onClick={close}>Close</button>
        </div>
      </div>
    </div>
  );
}
