import React, { useState } from 'react';
import RsIcon from '../RsIcon';
import PluginSteps, { PLUGIN_MESSAGE } from './PluginSteps';

// "Your group is ready": shown by Find your group right after a group was claimed (a new group, or a tracked group nobody
// had claimed). It shows the group secret once, lets the claimer say which member they are, and explains how the rest of
// the group gets in: a ready-made message to send them, the steps on the website and (2.0) the steps in the game.
// The same file is used in 1.x and 2.0; only PluginSteps differs.
export default function GroupReady({ group, secret, members = [], onDone }) {
  const [rsn, setRsn] = useState('');
  const [copied, setCopied] = useState('');
  const site = window.location.origin;
  const message = [
    `Our group "${group.name}" is on ${site.replace(/^https?:\/\//, '')}: ${site}`,
    `Open the site, find "${group.name}" under Groups already tracked, press Unlock and enter our group secret: ${secret}`,
    PLUGIN_MESSAGE,
    'Please keep the secret inside the group.',
  ].filter(Boolean).join('\n');
  const copy = (what, text) => navigator.clipboard?.writeText(text).then(() => { setCopied(what); setTimeout(() => setCopied(''), 2000); });

  const step = { display: 'flex', gap: 10, alignItems: 'baseline' };
  const num = { flexShrink: 0, width: 20, height: 20, borderRadius: '50%', border: '1px solid var(--gold-dark)', color: 'var(--gold)',
                fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };

  return (
    <div className="panel gr-panel">
      <div className="panel-header">
        <span className="panel-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><RsIcon name="key" size={18} />Your group is ready</span>
      </div>
      <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          <strong style={{ color: 'var(--text-bright)' }}>{group.name}</strong> is tracked and claimed. This is your <strong style={{ color: 'var(--gold)' }}>group secret</strong>.
          Every member uses it to unlock the group on this website{PLUGIN_MESSAGE ? ' and to connect the in-game plugin' : ''}.
        </div>

        <div className="gr-secret">
          <code>{secret}</code>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => copy('secret', secret)}>{copied === 'secret' ? 'Copied' : 'Copy'}</button>
        </div>
        <div className="gr-warn">
          <strong>Save it now.</strong> It is shown only this once. This browser remembers it, but nobody can look it up again,
          and anyone who has it can change the group.
        </div>

        {members.length > 0 && (
          <div>
            <div className="gr-label">Which one are you? <span style={{ textTransform: 'none', letterSpacing: 0 }}>(optional)</span></div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {members.map(m => (
                <button key={m} type="button" className={`chip${rsn === m ? ' active' : ''}`} onClick={() => setRsn(r => (r === m ? '' : m))}>{m}</button>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="gr-label">Share it with your group</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
            Send this to your members in a private place, for example a direct message or a private channel on your group's Discord.
            Not in a public channel.
          </div>
          <div className="gr-message">
            <pre>{message}</pre>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => copy('message', message)}>{copied === 'message' ? 'Copied' : 'Copy message'}</button>
          </div>
        </div>

        <div>
          <div className="gr-label">What your members do on the website</div>
          <div style={{ fontSize: 12, lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={step}><span style={num}>1</span><span>Open <strong>{site.replace(/^https?:\/\//, '')}</strong> and find <strong>{group.name}</strong> under Groups already tracked.</span></div>
            <div style={step}><span style={num}>2</span><span>Press <strong>Unlock</strong> in the top bar and enter the group secret. They can pick which member they are.</span></div>
            <div style={step}><span style={num}>3</span><span>Done: they can now set goals, log drops and change the group. Without the secret the group can still be viewed, but not changed.</span></div>
          </div>
        </div>

        <PluginSteps num={num} step={step} />

        <button type="button" className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={() => onDone(rsn || null)}>
          I saved the secret: open my group →
        </button>
      </div>
    </div>
  );
}
