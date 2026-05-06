import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/client';

function fmtDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function GroupNotesOverlay({ groupId, canWrite, onToast, onClose }) {
  const [content, setContent]    = useState('');
  const [savedContent, setSaved] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [status, setStatus]      = useState('idle');
  const debounceRef = useRef(null);

  // Floating window position & size
  const [pos,  setPos]  = useState({ x: Math.max(0, window.innerWidth  - 440), y: 70 });
  const [size, setSize] = useState({ width: 400, height: 480 });

  // Drag state
  const dragRef   = useRef(null);
  // Resize state
  const resizeRef = useRef(null);

  // ── Load notes & Escape key ──────────────────────────────────────────────────
  useEffect(() => {
    api.getGroupNotes(groupId)
      .then(data => { setContent(data.content || ''); setSaved(data.content || ''); setUpdatedAt(data.updated_at); })
      .catch(() => {});
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [groupId]);

  // ── Drag ─────────────────────────────────────────────────────────────────────
  const onDragMove = useCallback((e) => {
    if (!dragRef.current) return;
    setPos({
      x: Math.max(0, dragRef.current.origX + (e.clientX - dragRef.current.startX)),
      y: Math.max(0, dragRef.current.origY + (e.clientY - dragRef.current.startY)),
    });
  }, []);

  const onDragEnd = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup', onDragEnd);
  }, [onDragMove]);

  function onDragStart(e) {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);
  }

  // ── Resize ───────────────────────────────────────────────────────────────────
  const onResizeMove = useCallback((e) => {
    if (!resizeRef.current) return;
    setSize({
      width:  Math.max(280, resizeRef.current.origW + (e.clientX - resizeRef.current.startX)),
      height: Math.max(200, resizeRef.current.origH + (e.clientY - resizeRef.current.startY)),
    });
  }, []);

  const onResizeEnd = useCallback(() => {
    resizeRef.current = null;
    window.removeEventListener('mousemove', onResizeMove);
    window.removeEventListener('mouseup', onResizeEnd);
  }, [onResizeMove]);

  function onResizeStart(e) {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: size.width, origH: size.height };
    window.addEventListener('mousemove', onResizeMove);
    window.addEventListener('mouseup', onResizeEnd);
  }

  // ── Notes save ───────────────────────────────────────────────────────────────
  function handleChange(e) {
    const val = e.target.value;
    setContent(val);
    setStatus('idle');
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveNotes(val), 1500);
  }

  async function saveNotes(text) {
    if (!canWrite) return;
    setStatus('saving');
    try {
      await api.saveGroupNotes(groupId, text);
      setSaved(text);
      setUpdatedAt(new Date().toISOString());
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (err) {
      setStatus('error');
      onToast?.(err.message, 'error');
    }
  }

  const isDirty = content !== savedContent;

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: size.width,
        height: size.height,
        zIndex: 8888,
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 48px rgba(0,0,0,0.55)',
        minWidth: 280,
        minHeight: 200,
        overflow: 'hidden',
      }}>

      {/* ── Title bar / drag handle ── */}
      <div
        onMouseDown={onDragStart}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid var(--border)',
          cursor: 'grab',
          flexShrink: 0,
          userSelect: 'none',
          background: 'var(--bg-panel)',
        }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-bright)' }}>📝 Group Notes</div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>
            Shared pinboard — strategies, loot rules, session notes
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11,
            color: status === 'saved' ? 'var(--green-bright)' : status === 'error' ? 'var(--red)' : 'var(--text-dim)',
          }}>
            {status === 'saving' && '…saving'}
            {status === 'saved'  && '✓ Saved'}
            {status === 'error'  && '✗ Error'}
            {status === 'idle' && updatedAt && !isDirty && fmtDateTime(updatedAt)}
          </span>
          <button
            onMouseDown={e => e.stopPropagation()} // don't start drag on close click
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '2px 4px' }}>
            ✕
          </button>
        </div>
      </div>

      {/* ── Textarea ── */}
      <textarea
        autoFocus
        value={content}
        onChange={canWrite ? handleChange : undefined}
        readOnly={!canWrite}
        placeholder={canWrite
          ? 'Write anything — strategy notes, loot rules, session plans, links…'
          : 'No notes yet. Unlock the group to add notes.'}
        style={{
          flex: 1, padding: '14px 16px',
          background: 'transparent', border: 'none', outline: 'none',
          color: 'var(--text-bright)', fontSize: 13, lineHeight: 1.7,
          resize: 'none', fontFamily: 'inherit',
          cursor: canWrite ? 'text' : 'default',
          minHeight: 0,
        }}
      />

      {/* ── Footer ── */}
      <div style={{
        padding: '8px 14px',
        borderTop: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          {content.length} chars{!canWrite && ' · 🔒 Unlock to edit'}
        </span>
        {canWrite && isDirty && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => { clearTimeout(debounceRef.current); saveNotes(content); }}
            style={{ fontSize: 11 }}>
            Save now
          </button>
        )}
      </div>

      {/* ── Resize handle (bottom-right corner) ── */}
      <div
        onMouseDown={onResizeStart}
        style={{
          position: 'absolute', bottom: 0, right: 0,
          width: 16, height: 16,
          cursor: 'nwse-resize',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
          padding: '3px',
          color: 'var(--text-dim)',
          lineHeight: 1,
          fontSize: 10,
          userSelect: 'none',
        }}>
        ⠿
      </div>
    </div>
  );
}
