/**
 * Discord webhook service — sends rich embeds to a group's configured webhook.
 * All notify* functions are fire-and-forget (never throw).
 */
const db = require('../database');

const DEFAULT_EVENTS = ['level_milestones', 'diary_completions', 'boss_first_kills', 'goal_completions'];

const COLORS = {
  gold:   0xc8a84b,
  green:  0x4caf50,
  blue:   0x5865f2,
  red:    0xe74c3c,
  purple: 0x9b59b6,
  orange: 0xe67e22,
};

// ── Internals ─────────────────────────────────────────────────────────────────

function getWebhookConfig(groupId) {
  const row = db.prepare('SELECT discord_webhook_url, webhook_events FROM groups WHERE id = ?').get(groupId);
  if (!row?.discord_webhook_url) return null;
  let events;
  try { events = JSON.parse(row.webhook_events || 'null') ?? DEFAULT_EVENTS; }
  catch { events = DEFAULT_EVENTS; }
  return { url: row.discord_webhook_url, events };
}

function getPlayerInfo(playerId) {
  return db.prepare('SELECT rsn, group_id FROM players WHERE id = ?').get(playerId);
}

function groupFooter(groupId) {
  const g = db.prepare('SELECT name FROM groups WHERE id = ?').get(groupId);
  return { text: `${g?.name ?? 'Group'} · RS3 GIM Companion` };
}

async function sendEmbed(webhookUrl, embed) {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[webhook] Discord ${res.status}: ${body.slice(0, 200)}`);
    }
  } catch (err) {
    console.error(`[webhook] Send failed: ${err.message}`);
  }
}

// ── Exported notify functions (all fire-and-forget) ───────────────────────────

function notifyDrop(playerId, itemName) {
  const player = getPlayerInfo(playerId);
  if (!player?.group_id) return;
  const config = getWebhookConfig(player.group_id);
  if (!config?.events.includes('drops')) return;
  sendEmbed(config.url, {
    title: '🎁 New Drop!',
    description: `**${player.rsn}** found a **${itemName}**`,
    color: COLORS.gold,
    footer: groupFooter(player.group_id),
    timestamp: new Date().toISOString(),
  });
}

function notifyLevelMilestone(playerId, skill, level) {
  const player = getPlayerInfo(playerId);
  if (!player?.group_id) return;
  const config = getWebhookConfig(player.group_id);
  if (!config?.events.includes('level_milestones')) return;
  const is120 = Number(level) === 120;
  sendEmbed(config.url, {
    title: is120 ? '🏆 Level 120 — MAX!' : '🎉 Level 99!',
    description: `**${player.rsn}** achieved level **${level}** in **${skill}**!`,
    color: is120 ? COLORS.gold : COLORS.green,
    footer: groupFooter(player.group_id),
    timestamp: new Date().toISOString(),
  });
}

function notifyDiary(playerId, tier, region) {
  const player = getPlayerInfo(playerId);
  if (!player?.group_id) return;
  const config = getWebhookConfig(player.group_id);
  if (!config?.events.includes('diary_completions')) return;
  const emoji = { easy: '🟢', medium: '🟡', hard: '🟠', elite: '🔴' }[tier.toLowerCase()] ?? '📋';
  const tierCap = tier.charAt(0).toUpperCase() + tier.slice(1);
  sendEmbed(config.url, {
    title: `${emoji} Achievement Diary Complete!`,
    description: `**${player.rsn}** completed the **${tierCap} ${region} Achievement Diary**!`,
    color: COLORS.blue,
    footer: groupFooter(player.group_id),
    timestamp: new Date().toISOString(),
  });
}

function notifyBossFirstKill(playerId, bossLabel) {
  const player = getPlayerInfo(playerId);
  if (!player?.group_id) return;
  const config = getWebhookConfig(player.group_id);
  if (!config?.events.includes('boss_first_kills')) return;
  sendEmbed(config.url, {
    title: '⚔️ First Kill!',
    description: `**${player.rsn}** defeated **${bossLabel}** for the first time!`,
    color: COLORS.red,
    footer: groupFooter(player.group_id),
    timestamp: new Date().toISOString(),
  });
}

function notifyGoalCompleted(groupId, goalTitle, contributorRsns = []) {
  const config = getWebhookConfig(groupId);
  if (!config?.events.includes('goal_completions')) return;
  const who = contributorRsns.length
    ? ` — achieved by ${contributorRsns.map(r => `**${r}**`).join(', ')}`
    : '';
  sendEmbed(config.url, {
    title: '🎯 Goal Complete!',
    description: `**${goalTitle}** has been completed${who}!`,
    color: COLORS.green,
    footer: groupFooter(groupId),
    timestamp: new Date().toISOString(),
  });
}

async function sendTestWebhook(webhookUrl, groupName) {
  await sendEmbed(webhookUrl, {
    title: '✅ Webhook Connected!',
    description: `**${groupName}** is now linked to RS3 GIM Companion.\nNotifications will appear here for the events you've enabled.`,
    color: COLORS.green,
    fields: [
      { name: 'Supported events', value: '🎉 Level 99/120 · 📋 Achievement Diaries · ⚔️ Boss first kills · 🎯 Goals completed · 🎁 Drops', inline: false },
    ],
    footer: { text: 'RS3 GIM Companion · groupiron.com' },
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  notifyDrop,
  notifyLevelMilestone,
  notifyDiary,
  notifyBossFirstKill,
  notifyGoalCompleted,
  sendTestWebhook,
  getWebhookConfig,
  DEFAULT_EVENTS,
};
