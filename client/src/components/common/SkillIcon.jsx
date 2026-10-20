import React from 'react';
import { SKILL_ICON_URLS as SKILL_ICONS } from '../../lib/rs3';

// ── Constants ─────────────────────────────────────────────────────────────────

export default function SkillIcon({ name, size = 18 }) {
  const url = SKILL_ICONS[name];
  if (!url) return null;
  return (
    <img
      src={url} alt={name} title={name}
      style={{ width: size, height: size, verticalAlign: 'middle', imageRendering: 'auto' }}
    />
  );
}
