import React, { useState, useEffect } from 'react';

// ── Tour steps ────────────────────────────────────────────────────────────────
// target: CSS selector for the element to spotlight (null = centered welcome card)
// position: preferred tooltip placement ('bottom' | 'top' | 'center')
const TOUR_STEPS = [
  {
    target: null,
    title: '👋 Welcome to RS3 GIM Companion!',
    body: "Let's take a quick tour of the key features. Use Next → to walk through each one, or skip if you'd rather explore on your own. You can replay this tour any time from the ? button in the header.",
    position: 'center',
  },
  {
    target: '[data-tour="sync"]',
    title: '↻ Sync All',
    body: 'Pulls the latest hiscores for every group member from RS3. Hit this after a grind session to update levels, XP, and skills for the whole group.',
    position: 'bottom',
  },
  {
    target: '[data-tour="lock"]',
    title: '🔒 Claim & Unlock',
    body: 'Claim your group to generate a one-time secret code. Share it with your teammates — anyone who enters it can edit goals, gear, and the vault. Everyone else gets read-only access.',
    position: 'bottom',
  },
  {
    target: '[data-tour="members"]',
    title: '👤 Member Cards',
    body: 'Click any member card to focus on that player — the Goals panel and Activity feed filter to their data. Your own card is highlighted in gold with a YOU badge.',
    position: 'bottom',
  },
  {
    target: '[data-tour="tab-goals"]',
    title: '🎯 Goals',
    body: "Your group's planning board. Browse 220+ pre-built suggestions across quests, skill milestones, boss kills, and key items — or add fully custom goals. Track status, priority, and XP progress per player.",
    position: 'bottom',
  },
  {
    target: '[data-tour="tab-vault"]',
    title: '🏆 Group Vault & Gear Loadouts',
    body: 'Every drop your group has logged in one tile grid, with dupe indicators and worn-item badges. The Gear Loadouts panel tracks each player\'s equipment across 5 combat styles with wiki-verified requirements.',
    position: 'bottom',
  },
  {
    target: '[data-tour="tab-achievements"]',
    title: '📋 Achievement Diaries',
    body: 'Track diary completion across all 13 RS3 regions × 4 tiers (Easy → Elite). Auto-detected from the RuneMetrics activity feed, or toggle manually per player.',
    position: 'bottom',
  },
  {
    target: '[data-tour="tab-leaderboards"]',
    title: '🏅 Leaderboards',
    body: "Boss kill counts, group 'firsts' (who hit a 99 or killed a boss first), skill mastery, XP milestones, and clue scroll ranks — all built automatically from the activity feed.",
    position: 'bottom',
  },
  {
    target: '[data-tour="notes"]',
    title: '📝 Group Notes',
    body: 'A shared pinboard for your whole group. Jot down loot rules, strategy notes, or session plans — auto-saves as you type and is visible to everyone.',
    position: 'bottom',
  },
];

const PAD = 10;   // padding around the highlighted element
const TT_W = 360; // tooltip width

export default function TourOverlay({ onComplete }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect]           = useState(null);

  const step = TOUR_STEPS[stepIndex];

  // Measure target element position
  useEffect(() => {
    if (!step?.target) { setRect(null); return; }

    function measure() {
      const el = document.querySelector(step.target);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right });
      } else {
        setRect(null); // element not present — fall back to centered tooltip
      }
    }

    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [stepIndex, step?.target]);

  function next() {
    if (stepIndex < TOUR_STEPS.length - 1) setStepIndex(i => i + 1);
    else onComplete();
  }

  function skip() { onComplete(); }

  // ── Tooltip positioning ───────────────────────────────────────────────────
  function getTooltipStyle() {
    if (!rect) {
      // Centered on screen
      return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: TT_W };
    }

    const vH = window.innerHeight;
    const vW = window.innerWidth;

    // Prefer below, fall back to above
    let top;
    if (rect.bottom + 12 + 180 < vH) {
      top = rect.bottom + PAD + 12;
    } else {
      top = rect.top - PAD - 12 - 180; // approx tooltip height
    }

    // Centre horizontally on the element, clamped to viewport
    let left = rect.left + rect.width / 2 - TT_W / 2;
    left = Math.max(12, Math.min(vW - TT_W - 12, left));

    return { position: 'fixed', top, left, width: TT_W };
  }

  // ── Arrow pointing toward highlighted element ────────────────────────────
  function getArrow() {
    if (!rect) return null;
    const vH = window.innerHeight;
    const arrowStyle = {
      position: 'absolute',
      left: '50%', transform: 'translateX(-50%)',
      width: 0, height: 0, border: '7px solid transparent',
    };
    if (rect.bottom + 12 + 180 < vH) {
      // Tooltip is below → arrow points up
      return <div style={{ ...arrowStyle, top: -14, borderBottomColor: 'var(--gold-dark)', borderTop: 'none' }} />;
    } else {
      // Tooltip is above → arrow points down
      return <div style={{ ...arrowStyle, bottom: -14, borderTopColor: 'var(--gold-dark)', borderBottom: 'none' }} />;
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000 }}>

      {/* ── Spotlight backdrop ────────────────────────────────────────────── */}
      {rect ? (
        <>
          {/* Top */}
          <div onClick={skip} style={{ position: 'fixed', top: 0, left: 0, right: 0, height: Math.max(0, rect.top - PAD), background: 'rgba(0,0,0,0.72)' }} />
          {/* Bottom */}
          <div onClick={skip} style={{ position: 'fixed', top: rect.bottom + PAD, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.72)' }} />
          {/* Left */}
          <div onClick={skip} style={{ position: 'fixed', top: rect.top - PAD, left: 0, width: Math.max(0, rect.left - PAD), height: rect.height + PAD * 2, background: 'rgba(0,0,0,0.72)' }} />
          {/* Right */}
          <div onClick={skip} style={{ position: 'fixed', top: rect.top - PAD, left: rect.right + PAD, right: 0, height: rect.height + PAD * 2, background: 'rgba(0,0,0,0.72)' }} />

          {/* Gold highlight ring */}
          <div style={{
            position: 'fixed',
            top: rect.top - PAD, left: rect.left - PAD,
            width: rect.width + PAD * 2, height: rect.height + PAD * 2,
            border: '2px solid var(--gold)',
            borderRadius: 8,
            boxShadow: '0 0 0 3px rgba(200,168,75,0.2), 0 0 24px rgba(200,168,75,0.35)',
            pointerEvents: 'none',
          }} />
        </>
      ) : (
        /* Full-screen backdrop for centered steps */
        <div onClick={skip} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)' }} />
      )}

      {/* ── Tooltip card ─────────────────────────────────────────────────── */}
      <div style={{
        ...getTooltipStyle(),
        zIndex: 10001,
        background: 'var(--bg-panel)',
        border: '1px solid var(--gold-dark)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 22px 16px',
        boxShadow: '0 12px 48px rgba(0,0,0,0.7)',
      }}>
        {getArrow()}

        {/* Step counter */}
        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>
          Step {stepIndex + 1} of {TOUR_STEPS.length}
        </div>

        {/* Title */}
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--gold)', marginBottom: 8, lineHeight: 1.3 }}>
          {step.title}
        </div>

        {/* Body */}
        <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.65, marginBottom: 16 }}>
          {step.body}
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 14, alignItems: 'center' }}>
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              onClick={() => setStepIndex(i)}
              style={{
                width: i === stepIndex ? 16 : 6,
                height: 6, borderRadius: 3,
                background: i === stepIndex ? 'var(--gold)' : i < stepIndex ? 'var(--gold-dim)' : 'var(--border)',
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>

        {/* Action row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={skip}
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 12, padding: '4px 0' }}>
            Skip tour
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {stepIndex > 0 && (
              <button
                onClick={() => setStepIndex(i => i - 1)}
                style={{
                  padding: '7px 14px', fontSize: 12, fontWeight: 600,
                  background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', color: 'var(--text-dim)', cursor: 'pointer',
                }}>
                ← Back
              </button>
            )}
            <button
              onClick={next}
              style={{
                padding: '7px 18px', fontSize: 13, fontWeight: 700,
                background: 'var(--gold)', color: '#111',
                border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer',
              }}>
              {stepIndex < TOUR_STEPS.length - 1 ? 'Next →' : '🎉 Done!'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
