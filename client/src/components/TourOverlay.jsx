import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

// ── Tour steps ────────────────────────────────────────────────────────────────
const TOUR_STEPS = [
  {
    target: null,
    title: '👋 Welcome to RS3 GIM Companion!',
    body: "Let's take a quick tour of the key features. Use Next → to walk through each one, or skip if you'd rather explore on your own. You can replay this tour any time from the ? button in the header.",
  },
  {
    target: '[data-tour="sync"]',
    title: '↻ Sync All',
    body: 'Pulls the latest hiscores for every group member from RS3. Hit this after a grind session to update levels, XP, and skills for the whole group.',
  },
  {
    target: '[data-tour="lock"]',
    title: '🔒 Claim & Unlock',
    body: 'Claim your group to generate a one-time secret code. Share it with your teammates — anyone who enters it can edit goals, gear, and the vault. Everyone else gets read-only access.',
  },
  {
    target: '[data-tour="members"]',
    title: '👤 Member Cards',
    body: 'Click any member card to focus on that player — the Goals panel and Activity feed filter to their data. Your own card is highlighted in gold with a YOU badge.',
  },
  {
    target: '[data-tour="tab-goals"]',
    title: '🎯 Goals',
    body: "Your group's planning board. Browse 220+ pre-built suggestions across quests, skill milestones, boss kills, and key items — or add fully custom goals. Track status, priority, and XP progress per player.",
  },
  {
    target: '[data-tour="tab-vault"]',
    title: '🏆 Group Vault & Gear Loadouts',
    body: "Every drop your group has logged in one tile grid, with dupe indicators and worn-item badges. The Gear Loadouts panel tracks each player's equipment across 5 combat styles with wiki-verified requirements.",
  },
  {
    target: '[data-tour="tab-achievements"]',
    title: '📋 Achievement Diaries',
    body: 'Track diary completion across all 13 RS3 regions × 4 tiers (Easy → Elite). Auto-detected from the RuneMetrics activity feed, or toggle manually per player.',
  },
  {
    target: '[data-tour="tab-leaderboards"]',
    title: '🏅 Leaderboards',
    body: "Boss kill counts, group 'firsts' (who hit a 99 or killed a boss first), skill mastery, XP milestones, and clue scroll ranks — all built automatically from the activity feed.",
  },
  {
    target: '[data-tour="notes"]',
    title: '📝 Group Notes',
    body: 'A shared pinboard for your whole group. Jot down loot rules, strategy notes, or session plans — auto-saves as you type and is visible to everyone.',
  },
];

const PAD  = 10;
const TT_W = 360;
const TT_H = 230; // conservative tooltip height for placement math

export default function TourOverlay({ onComplete }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect]           = useState(null);

  const step     = TOUR_STEPS[stepIndex];
  const isFirst  = stepIndex === 0;
  const isLast   = stepIndex === TOUR_STEPS.length - 1;

  // ── Measure target element ────────────────────────────────────────────────
  useEffect(() => {
    if (!step.target) { setRect(null); return; }

    function measure() {
      const el = document.querySelector(step.target);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right });
      } else {
        setRect(null);
      }
    }

    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tooltip placement ─────────────────────────────────────────────────────
  function tooltipPos() {
    if (!rect) {
      return { top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: TT_W };
    }
    const vH = window.innerHeight;
    const vW = window.innerWidth;

    const below = rect.bottom + 14 + TT_H < vH;
    let top = below
      ? rect.bottom + PAD + 14
      : Math.max(8, rect.top - PAD - 14 - TT_H);
    top = Math.min(top, vH - TT_H - 12);

    let left = rect.left + rect.width / 2 - TT_W / 2;
    left = Math.max(12, Math.min(vW - TT_W - 12, left));

    return { top, left, width: TT_W };
  }

  function arrowEl() {
    if (!rect) return null;
    const below = rect.bottom + 14 + TT_H < window.innerHeight;
    const base  = { position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, border: '7px solid transparent' };
    return below
      ? <div style={{ ...base, top: -14,   borderBottomColor: '#7a5c1e', borderTop:    'none' }} />
      : <div style={{ ...base, bottom: -14, borderTopColor:   '#7a5c1e', borderBottom: 'none' }} />;
  }

  const pos = tooltipPos();

  // ── Render via portal so we're completely outside the app's stacking context
  return createPortal(
    <>
      {/* ── Backdrop ─────────────────────────────────────────────────────── */}
      {rect ? (
        <>
          <div onClick={onComplete} style={{ position:'fixed', inset:0, zIndex:2147483640, pointerEvents:'none' }} />
          <div onClick={onComplete} style={{ position:'fixed', zIndex:2147483641, top:0, left:0, right:0, height:Math.max(0,rect.top-PAD), background:'rgba(0,0,0,0.72)', cursor:'default' }} />
          <div onClick={onComplete} style={{ position:'fixed', zIndex:2147483641, top:rect.bottom+PAD, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.72)', cursor:'default' }} />
          <div onClick={onComplete} style={{ position:'fixed', zIndex:2147483641, top:rect.top-PAD, left:0, width:Math.max(0,rect.left-PAD), height:rect.height+PAD*2, background:'rgba(0,0,0,0.72)', cursor:'default' }} />
          <div onClick={onComplete} style={{ position:'fixed', zIndex:2147483641, top:rect.top-PAD, left:rect.right+PAD, right:0, height:rect.height+PAD*2, background:'rgba(0,0,0,0.72)', cursor:'default' }} />
          {/* Gold spotlight ring */}
          <div style={{ position:'fixed', zIndex:2147483641, pointerEvents:'none', top:rect.top-PAD, left:rect.left-PAD, width:rect.width+PAD*2, height:rect.height+PAD*2, border:'2px solid var(--gold)', borderRadius:8, boxShadow:'0 0 0 3px rgba(200,168,75,0.2), 0 0 24px rgba(200,168,75,0.35)' }} />
        </>
      ) : (
        <div onClick={onComplete} style={{ position:'fixed', zIndex:2147483641, inset:0, background:'rgba(0,0,0,0.78)', cursor:'default' }} />
      )}

      {/* ── Tooltip ──────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          zIndex: 2147483647, // max z-index
          ...pos,
          background: 'var(--bg-panel)',
          border: '1px solid var(--gold-dark)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 22px 16px',
          boxShadow: '0 12px 48px rgba(0,0,0,0.7)',
          fontFamily: 'inherit',
        }}
      >
        {arrowEl()}

        {/* Step counter */}
        <div style={{ fontSize:10, color:'var(--text-dim)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.8px', fontWeight:600 }}>
          Step {stepIndex + 1} of {TOUR_STEPS.length}
        </div>

        {/* Title */}
        <div style={{ fontWeight:700, fontSize:15, color:'var(--gold)', marginBottom:8, lineHeight:1.3 }}>
          {step.title}
        </div>

        {/* Body */}
        <div style={{ fontSize:13, color:'var(--text-dim)', lineHeight:1.65, marginBottom:16 }}>
          {step.body}
        </div>

        {/* Progress dots */}
        <div style={{ display:'flex', gap:5, marginBottom:14, alignItems:'center' }}>
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              onClick={() => setStepIndex(i)}
              style={{
                width: i === stepIndex ? 16 : 6,
                height: 6, borderRadius: 3, flexShrink: 0,
                background: i === stepIndex ? 'var(--gold)' : i < stepIndex ? 'var(--gold-dim)' : 'var(--border)',
                transition: 'all 0.2s', cursor: 'pointer',
              }}
            />
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <button
            type="button"
            onClick={onComplete}
            style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:12, padding:'4px 0' }}>
            Skip tour
          </button>
          <div style={{ display:'flex', gap:8 }}>
            {!isFirst && (
              <button
                type="button"
                onClick={() => setStepIndex(s => s - 1)}
                style={{ padding:'7px 14px', fontSize:12, fontWeight:600, background:'transparent', border:'1px solid var(--border)', borderRadius:'var(--radius)', color:'var(--text-dim)', cursor:'pointer' }}>
                ← Back
              </button>
            )}
            <button
              type="button"
              onClick={() => isLast ? onComplete() : setStepIndex(s => s + 1)}
              style={{ padding:'7px 18px', fontSize:13, fontWeight:700, background:'var(--gold)', color:'#111', border:'none', borderRadius:'var(--radius)', cursor:'pointer' }}>
              {isLast ? '🎉 Done!' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
