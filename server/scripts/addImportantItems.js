/**
 * addImportantItems.js
 *
 * Adds missing Important Item milestone suggestions to rs3_milestone_items:
 *   - Dungeoneering rewards (Hex/Farsight necklaces, Stalker's bow, Balmung, Bonecrusher, DG cape)
 *   - Archaeology items (Pontifex shadow ring, Inquisitor's staff, Guildmaster's quarterstaff)
 *   - Shattered Worlds codices (Double Surge, Double Escape, Bladed Dive, Natural Instinct, Ingenuity)
 *   - Player-Owned Ports armour (Tetsu, Seasinger, Death Lotus + Superior T90 variants)
 *   - Key early-game essentials (Void Knight equipment, Enhanced Excalibur, God books, Ring of Fortune)
 *
 * Safe to re-run (INSERT OR REPLACE, fully idempotent).
 * Run: node server/scripts/addImportantItems.js
 */

const path = require('path');
process.chdir(path.join(__dirname, '..'));
const db = require('../database');

function j(v) { return typeof v === 'string' ? v : JSON.stringify(v); }

// Helper: derive icon_url from wiki_url (same convention as addBossIcons.js)
function wikiImg(wikiUrl, override) {
  if (override) return `https://runescape.wiki/images/${override}`;
  if (!wikiUrl) return null;
  const page = wikiUrl.split('/w/').pop();
  return `https://runescape.wiki/images/${page}.png`;
}

const upsert = db.prepare(`
  INSERT OR REPLACE INTO rs3_milestone_items
    (id, name, category, tier_impact, why_important, how_to_obtain, gim_notes, wiki_url, icon_url, last_verified_at)
  VALUES (?,?,?,?,?,?,?,?,?,?)
`);

function add(m) {
  upsert.run(
    m.id, m.name, m.category ?? 'pvm_drop', m.tier_impact,
    m.why ?? null, m.how ?? null, m.gim ?? null,
    m.wiki ?? null,
    m.icon ?? wikiImg(m.wiki, m.iconFile),
    new Date().toISOString()
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EARLY GAME (tier_impact: 'low' → shows in Early stage)
// ══════════════════════════════════════════════════════════════════════════════

add({
  id: 'bonecrusher',
  name: 'Bonecrusher',
  category: 'skilling',
  tier_impact: 'low',
  why: 'Auto-crushes bones on kill for Prayer XP. Combined with a Demon Horn Necklace it restores prayer points automatically, making prayer upkeep near-free for most Slayer and bossing content.',
  how: 'Purchase from the Dungeoneering Rewards shop for 34,000 tokens (requires 21 Dungeoneering).',
  gim: 'Pair with Demon Horn Necklace. Every group member should own one — cheap and transforms Slayer training.',
  wiki: 'https://runescape.wiki/w/Bonecrusher',
  iconFile: 'Bonecrusher.png',
});

add({
  id: 'void_knight_equipment',
  name: 'Void Knight Equipment',
  category: 'pvm_drop',
  tier_impact: 'low',
  why: 'Void Knight armour (T55 hybrid) provides a flat 3% damage and accuracy boost to all combat styles. Low defensive stats but excellent offensive bonus — ideal for high-level slayer tasks, combat training, and hybrid content.',
  how: 'Purchased from the Void Knight reward shop using Commendation Points earned from Pest Control minigame.',
  gim: 'Worth getting early. Each piece costs 250–1,100 commendation points. Group members can take turns in the same Pest Control games. The elite version (requires Hard Diaries) is significantly stronger.',
  wiki: 'https://runescape.wiki/w/Void_Knight_equipment',
  iconFile: 'Void_Knight_top.png',
});

add({
  id: 'ring_of_fortune',
  name: 'Ring of Fortune (Luck Ring)',
  category: 'pvm_drop',
  tier_impact: 'low',
  why: 'Ring of Fortune is a T2 luck ring that improves drop table odds for most bosses and Slayer creatures. Enables access to the "luck" loot table which includes extra common drops and slightly improved rare chances.',
  how: 'Craft from a Luck ring + 250 Oneiric shards (from Dungeoneering). Alternatively, a Ring of Wealth (crafted from an Emerald) provides T1 luck.',
  gim: 'Upgrade to a Luck of the Dwarves (T4, 107 Crafting) eventually for maximum luck — but Ring of Fortune is the accessible stepping stone.',
  wiki: 'https://runescape.wiki/w/Ring_of_fortune',
  iconFile: 'Ring_of_fortune.png',
});

add({
  id: 'god_books',
  name: 'God Book (Armadyl / Saradomin / Zamorak)',
  category: 'pvm_drop',
  tier_impact: 'low',
  why: 'God books occupy the pocket slot and provide combat stat bonuses. The Armadyl god book gives +5 Ranged accuracy and damage bonus. Saradomin gives +5 Magic accuracy bonus. Fully filled books also provide a passive prayer restore effect.',
  how: 'Obtained through the Horror from the Deep quest. Fill the book by recovering pages from Treasure Trails clue scrolls.',
  gim: 'Cheap and useful pocket slot option before Illuminated god books or Scrimshaws. A good early target for players doing clue scrolls.',
  wiki: 'https://runescape.wiki/w/God_book',
  iconFile: 'Armadyl_god_book.png',
});

add({
  id: 'enhanced_excalibur',
  name: 'Enhanced Excalibur',
  category: 'pvm_drop',
  tier_impact: 'low',
  why: "Enhanced Excalibur is a T70 off-hand sword with a powerful passive: Lady of the Lake's healing. When activated, it heals ~20% of max LP over 10 seconds, with a longer heal at Elite tier. Free healing with a short cooldown is one of the best defensive tools available.",
  how: "Complete Plague's End quest to enhance the standard Excalibur. Requires a long quest chain including Mourning's End Part II.",
  gim: "Every melee member should get this as soon as possible. The free healing drastically reduces food consumption at all bosses. Works with any off-hand slot.",
  wiki: 'https://runescape.wiki/w/Enhanced_Excalibur',
  iconFile: 'Enhanced_Excalibur.png',
});

add({
  id: 'dragon_rider_amulet',
  name: 'Dragon Rider Amulet (T80 Hybrid Neck)',
  category: 'pvm_drop',
  tier_impact: 'low',
  why: 'The Dragon Rider Amulet is a T80 hybrid amulet providing excellent all-combat bonuses. Unique passive: applies a 10% damage reduction against dragonbreath. One of the best pre-Amulet of Souls neck items for hybrid or all-style combat.',
  how: 'Drops from the Queen Black Dragon (no requirements other than being able to kill QBD).',
  gim: 'An early "end-game" amulet accessible once the group can kill QBD. Great for hybrid loadouts before more specialised T80+ necklaces.',
  wiki: 'https://runescape.wiki/w/Dragon_rider_amulet',
  iconFile: 'Dragon_rider_amulet.png',
});

// ══════════════════════════════════════════════════════════════════════════════
// MID GAME (tier_impact: 'medium' → shows in Mid stage)
// ══════════════════════════════════════════════════════════════════════════════

add({
  id: 'hex_necklace',
  name: 'Hex Necklace (DG T80 Magic Neck)',
  category: 'skilling',
  tier_impact: 'medium',
  why: 'Hex Necklace is a T80 Magic necklace providing excellent Magic accuracy and damage bonuses — the best Magic neck before the Amulet of Souls or Arcane stream necklace. Also grants +15% Magic damage against monsters that are weak to Magic.',
  how: 'Purchase from the Dungeoneering Rewards shop for 40,000 tokens (requires 80 Dungeoneering).',
  gim: 'A direct upgrade to Amulet of Fury for Magic users. Get this alongside Chaotic weaponry at 80 Dungeoneering.',
  wiki: 'https://runescape.wiki/w/Hex_necklace',
  iconFile: 'Hex_necklace.png',
});

add({
  id: 'farsight_necklace',
  name: 'Farsight Sniper Necklace (DG T80 Ranged Neck)',
  category: 'skilling',
  tier_impact: 'medium',
  why: 'Farsight Sniper Necklace is a T80 Ranged necklace providing strong Ranged accuracy and damage bonuses. Also grants +15% Ranged damage against enemies weak to Ranged. The best Ranged neck before the Amulet of Souls or Noxious components.',
  how: 'Purchase from the Dungeoneering Rewards shop for 40,000 tokens (requires 80 Dungeoneering).',
  gim: 'Pair with Chaotic crossbow / Ascension crossbow for strong Ranged setup. 80 Dungeoneering required.',
  wiki: 'https://runescape.wiki/w/Farsight_sniper_necklace',
  iconFile: 'Farsight_sniper_necklace.png',
});

add({
  id: 'stalkers_bow',
  name: "Stalker's Bow (DG T80 Ranged 2H)",
  category: 'skilling',
  tier_impact: 'medium',
  why: "Stalker's Bow is a T80 two-handed shortbow from Dungeoneering. Provides excellent Ranged attack speed and power — a strong alternative to the Chaotic crossbow for players who prefer shortbows or don't have a crossbow setup.",
  how: "Purchase from the Dungeoneering Rewards shop for 40,000 tokens (requires 80 Dungeoneering).",
  gim: "Comparable to Chaotic crossbow; choose based on available quiver/ammo. Both are excellent stepping stones to T90 Ranged weapons.",
  wiki: "https://runescape.wiki/w/Stalker's_bow",
  iconFile: "Stalker's_bow.png",
});

add({
  id: 'balmung',
  name: 'Balmung (Anti-Dagannoth DG Weapon)',
  category: 'skilling',
  tier_impact: 'medium',
  why: "Balmung is a T60 two-handed battleaxe from Dungeoneering that deals +25% damage against Dagannoth (including Dagannoth Kings). The best weapon for DKs until T90 weaponry — makes the Kings trivial compared to off-style weapons.",
  how: "Purchase from the Dungeoneering Rewards shop for 60,000 tokens (requires 80 Dungeoneering and completion of 'Blood Runs Deep' quest).",
  gim: "Group GIM note: Dagannoth Kings are a key early-end-game boss. Having Balmung makes all three kings easy with correct prayer switches. One member can carry it for group runs.",
  wiki: 'https://runescape.wiki/w/Balmung',
  iconFile: 'Balmung.png',
});

add({
  id: 'guildmasters_quarterstaff',
  name: "Guildmaster's Quarterstaff (Archaeology T75 Melee)",
  category: 'skilling',
  tier_impact: 'medium',
  why: "Guildmaster's Quarterstaff is a T75 two-handed Melee weapon obtained via Archaeology. Free (no GP cost), has a powerful special attack that damages and disarms enemies. Excellent training weapon and solid mid-game Melee option.",
  how: 'Restore the Guildmaster\'s quarterstaff artefact via Archaeology (requires level 67 Archaeology, found at the Everlight dig site).',
  gim: 'A free T75 Melee weapon via Archaeology — worth getting before investing in GWD drops. The special attack is useful for training and some content.',
  wiki: "https://runescape.wiki/w/Guildmaster's_quarterstaff",
  iconFile: "Guildmaster's_quarterstaff.png",
});

add({
  id: 'pontifex_shadow_ring',
  name: 'Pontifex Shadow Ring (Archaeology)',
  category: 'skilling',
  tier_impact: 'medium',
  why: 'The Pontifex Shadow Ring is a unique ring from Archaeology that reduces Zaros-aligned boss mechanic damage (Kerapac: -25%, Elder God Wars). Required to deal full damage at Elder God Wars Dungeon (EGWD) bosses. Also useful when fighting Zaros-faction content.',
  how: 'Restore the Pontifex shadow ring artefact via Archaeology (requires level 73 Archaeology, found at Kharid-et).',
  gim: 'Required for the Elder God Wars Dungeon bosses (Arch-Glacor, Kerapac, Zamorak). Every member intending to do EGWD should get this.',
  wiki: 'https://runescape.wiki/w/Pontifex_shadow_ring',
  iconFile: 'Pontifex_shadow_ring.png',
});

add({
  id: 'inquisitors_staff_arch',
  name: "Inquisitor's Staff (Archaeology T78 Magic)",
  category: 'skilling',
  tier_impact: 'medium',
  why: "Inquisitor's Staff is a T78 two-handed Magic staff assembled via Archaeology. Its passive effect deals +20% damage against kneeling/crouching enemies (including many high-level bosses). A major power spike for Magic users fighting bosses with this vulnerability.",
  how: "Assemble from Inquisitor fragments (3 needed) found at Kharid-et (80 Archaeology required for all fragments). Can also drop from The Magister and Solak.",
  gim: "Priority for Magic users. The +20% passive bonus against susceptible enemies (including Solak, Arch-Glacor, Nex: AOD) is enormous. One of the best Magic weapons for end-game content.",
  wiki: "https://runescape.wiki/w/Inquisitor's_staff",
  iconFile: "Inquisitor's_staff.png",
});

add({
  id: 'seasingers_equipment',
  name: "Seasinger's Equipment (Ports T85 Magic)",
  category: 'skilling',
  tier_impact: 'medium',
  why: "Seasinger's equipment is T85 Magic power armour from Player-Owned Ports. Provides better Magic accuracy and damage than Virtus (T80 Ranged power) while requiring only Ports trade goods — no boss kills needed. Viable until Tectonic (T90) is achievable.",
  how: "Crafted via Player-Owned Ports using Seasinger's ink (obtained by sending crew members on Ports voyages in the Eastern Lands). Requires 85 Dungeoneering to access the full Ports region.",
  gim: 'An excellent bridge between T80 (Virtus) and T90 (Tectonic) Magic armour. Ports is a daily passive activity — group members should all set up their ports.',
  wiki: "https://runescape.wiki/w/Seasinger's_equipment",
  iconFile: "Seasinger's_hood.png",
});

add({
  id: 'death_lotus_equipment',
  name: 'Death Lotus Equipment (Ports T85 Ranged)',
  category: 'skilling',
  tier_impact: 'medium',
  why: 'Death Lotus equipment is T85 Ranged power armour from Player-Owned Ports. Provides better Ranged bonuses than Pernix (T80) while being obtainable through daily Ports voyages rather than boss drops. Ideal for players waiting for Sirenic armour (T90).',
  how: "Crafted via Player-Owned Ports using Death Lotus extract (from Ports voyages). Requires 85 Dungeoneering to unlock the Far East Ports region.",
  gim: "The Ranged counterpart to Seasinger's. Run your ports daily — all group members can produce gear independently and share extras.",
  wiki: 'https://runescape.wiki/w/Death_Lotus_equipment',
  iconFile: 'Death_Lotus_hood.png',
});

add({
  id: 'tetsu_equipment',
  name: 'Tetsu Equipment (Ports T85 Melee Tank)',
  category: 'skilling',
  tier_impact: 'medium',
  why: "Tetsu equipment is T85 Melee tank armour from Player-Owned Ports. Best-in-slot Melee tank armour before Malevolent (T90). Useful for learning new bosses and tanky support roles in group content. The Tetsu katana (off-hand) is also a solid T85 weapon.",
  how: "Crafted via Player-Owned Ports using Steel of Legends (from Ports voyages). Requires 85 Dungeoneering.",
  gim: "Essential for designated tank roles in group bossing. Unlike power armour setups, tanks in Tetsu can absorb large hits at trios/group encounters.",
  wiki: 'https://runescape.wiki/w/Tetsu_equipment',
  iconFile: 'Tetsu_helm.png',
});

// ══════════════════════════════════════════════════════════════════════════════
// END GAME (tier_impact: 'high' → shows in End stage)
// ══════════════════════════════════════════════════════════════════════════════

add({
  id: 'dungeoneering_cape',
  name: 'Dungeoneering Cape (99/120 Skill Cape)',
  category: 'achievement',
  tier_impact: 'high',
  why: 'The Dungeoneering cape (at 99) and its trimmed/master variant (120 DG) represent mastery of the Dungeoneering skill. The master cape at 120 allows teleporting to any resource dungeon, provides an extra inventory slot when diving, and is a significant combat and QoL cape.',
  how: 'Achieve level 99 Dungeoneering (standard cape) or level 120 Dungeoneering (master cape) through completing Daemonheim dungeons.',
  gim: 'Group Dungeoneering is one of the best activities in GIM — you share the experience and help each other reach 80+ DG for chaotic weapons and other rewards. Push toward 99/120 as a group milestone.',
  wiki: 'https://runescape.wiki/w/Dungeoneering_cape',
  iconFile: 'Dungeoneering_cape.png',
});

add({
  id: 'superior_seasingers',
  name: "Superior Seasinger's Equipment (T90 Magic)",
  category: 'skilling',
  tier_impact: 'high',
  why: "Superior Seasinger's equipment is the T90 upgrade of Seasinger's armour, on par with Tectonic in terms of Magic bonuses. Unlike Tectonic (degrading), Superior Seasinger's degrades but is repairable — making it far more economical for sustained PvM.",
  how: "Upgrade Seasinger's equipment using Seiryu's crystal obtained from Seiryu the Azure Serpent (Elite Dungeon 1 — Temple of Aminishi). Requires both T85 Seasinger's pieces and the crystal.",
  gim: 'The most cost-effective T90 Magic armour for GIM. Run ED1 regularly for Seiryu crystals — one crystal upgrades one armour piece.',
  wiki: "https://runescape.wiki/w/Superior_seasinger's_equipment",
  iconFile: "Superior_seasinger's_hood.png",
});

add({
  id: 'superior_death_lotus',
  name: 'Superior Death Lotus Equipment (T90 Ranged)',
  category: 'skilling',
  tier_impact: 'high',
  why: 'Superior Death Lotus equipment is the T90 upgrade of Death Lotus armour. Equivalent to Sirenic (T90) in Ranged bonuses but fully repairable unlike Sirenic scales which must be farmed again. Excellent end-game Ranged armour for consistent bossers.',
  how: "Upgrade Death Lotus equipment using an Azure crystal from Seiryu the Azure Serpent (Elite Dungeon 1). Requires T85 Death Lotus pieces.",
  gim: "Pair with Ascension crossbows or T92 Ranged weapons. The repairability makes this arguably better than Sirenic for GIM — you don't need to keep killing Araxxor for scales.",
  wiki: 'https://runescape.wiki/w/Superior_Death_Lotus_equipment',
  iconFile: 'Superior_Death_Lotus_hood.png',
});

add({
  id: 'superior_tetsu',
  name: 'Superior Tetsu Equipment (T90 Melee Tank)',
  category: 'skilling',
  tier_impact: 'high',
  why: 'Superior Tetsu equipment is the T90 Melee tank armour upgrade of Tetsu. On par with Malevolent in tank bonuses, but repairable unlike Malevolent energy which must be farmed from Rise of the Six. Ideal for group tank roles at high-level bosses.',
  how: "Upgrade Tetsu equipment using an Azure crystal from Seiryu the Azure Serpent (Elite Dungeon 1).",
  gim: 'For groups running a dedicated tank, this is the most sustainable T90 tank armour. Run ED1 together for the crystals.',
  wiki: 'https://runescape.wiki/w/Superior_tetsu_equipment',
  iconFile: 'Superior_tetsu_helm.png',
});

add({
  id: 'double_surge',
  name: 'Double Surge (Shattered Worlds Ability)',
  category: 'skilling',
  tier_impact: 'high',
  why: 'Double Surge allows the Surge ability to be used twice before triggering its cooldown. This doubles available mobility during combat, enabling more efficient positioning, avoiding mechanics, and maintaining DPS uptime. Essential for end-game bossing movement.',
  how: 'Unlock by reading the Double Surge codex, purchased from the Shattered Worlds Reward Shop for 12,000,000 Anima (the Shattered Worlds currency).',
  gim: 'A group-wide priority. Everyone should grind Shattered Worlds for movement ability upgrades. Sharing the grinding can be done sequentially or in parallel.',
  wiki: 'https://runescape.wiki/w/Double_Surge',
  iconFile: 'Double_Surge.png',
});

add({
  id: 'double_escape',
  name: 'Double Escape (Shattered Worlds Ability)',
  category: 'skilling',
  tier_impact: 'high',
  why: "Double Escape allows the Escape ability to be used twice (like Double Surge for Escape). Combined with Double Surge, gives Ranged and Magic users four mobility charges. Critical for Ranged users who rely on Escape for repositioning at bosses like Kerapac and Telos.",
  how: 'Unlock by reading the Double Escape codex, purchased from the Shattered Worlds Reward Shop for 12,000,000 Anima.',
  gim: 'Priority for all Ranged/Magic users. Shattered Worlds can be completed solo or in a group context — set up a weekly rotation to farm Anima.',
  wiki: 'https://runescape.wiki/w/Double_Escape',
  iconFile: 'Double_Escape.png',
});

add({
  id: 'bladed_dive',
  name: 'Bladed Dive (Shattered Worlds Ability)',
  category: 'skilling',
  tier_impact: 'high',
  why: "Bladed Dive is a Melee ability that dashes to a target location and damages all adjacent enemies. It has no cooldown when used with a melee dual-wield setup and effectively serves as a third movement ability. Standard in nearly all high-level Melee rotations.",
  how: "Unlock by reading the Bladed Dive codex, purchased from the Shattered Worlds Reward Shop for 8,000,000 Anima. Requires dual-wield Melee to activate.",
  gim: 'Mandatory for all serious Melee users. Prioritise getting this before Double Surge/Escape if playing Melee. A transformative ability for Melee combat.',
  wiki: 'https://runescape.wiki/w/Bladed_Dive',
  iconFile: 'Bladed_Dive.png',
});

add({
  id: 'natural_instinct',
  name: 'Natural Instinct (Shattered Worlds Ability)',
  category: 'skilling',
  tier_impact: 'high',
  why: 'Natural Instinct is a Ranged ability that, when activated, causes the next ability used within 20 seconds to gain bonus adrenaline as if it were used at the start of combat. Effectively grants a free adrenaline boost mid-fight — powerful for Ranged rotations at bosses where adrenaline management is critical.',
  how: 'Unlock by reading the Natural Instinct codex, purchased from the Shattered Worlds Reward Shop for 10,000,000 Anima.',
  gim: 'Priority for dedicated Ranged users. Synergises strongly with Death\'s Swiftness — use Natural Instinct during the ultimate to gain free adrenaline for the next cycle.',
  wiki: 'https://runescape.wiki/w/Natural_Instinct',
  iconFile: 'Natural_Instinct.png',
});

add({
  id: 'ingenuity',
  name: "Ingenuity of the Humans (Shattered Worlds Ability)",
  category: 'skilling',
  tier_impact: 'high',
  why: "Ingenuity of the Humans guarantees your next attack will hit, ignoring both the opponent's Defence and your own accuracy. This is essential for landing critical abilities (like Threshold ultimates) reliably at high-Defence bosses such as Telos, Kerapac, and Arch-Glacor.",
  how: 'Unlock by reading the Ingenuity of the Humans codex, purchased from the Shattered Worlds Reward Shop for 16,000,000 Anima.',
  gim: 'Highest-Anima-cost Shattered Worlds ability. Farm this after Double Surge/Escape and Bladed Dive. Worth every point — the guaranteed-hit mechanic is gamechanging at high-enrage bosses.',
  wiki: 'https://runescape.wiki/w/Ingenuity_of_the_Humans',
  iconFile: 'Ingenuity_of_the_Humans.png',
});

add({
  id: 'luck_of_the_dwarves',
  name: 'Luck of the Dwarves (T4 Luck Ring)',
  category: 'pvm_drop',
  tier_impact: 'high',
  why: 'Luck of the Dwarves is the highest tier luck ring, providing Tier 4 luck at all bosses and Slayer creatures. Improves drop rates from rare tables significantly and is standard in end-game PvM. Repairable and rechargeable.',
  how: 'Requires 107 Crafting to craft (Divine energy + alchemical onyx). Alternatively use the Portable crafter or have a group member with 107 Crafting make it.',
  gim: 'If any group member has 107 Crafting, make this for everyone immediately. The improved drop rates compound across all end-game content — this is a long-term investment.',
  wiki: 'https://runescape.wiki/w/Luck_of_the_Dwarves',
  iconFile: 'Luck_of_the_Dwarves.png',
});

add({
  id: 'greater_concentrated_blast',
  name: 'Greater Concentrated Blast Ability',
  category: 'skilling',
  tier_impact: 'high',
  why: 'Greater Concentrated Blast replaces Concentrated Blast with a stronger version that stacks 3 critical hit buff stacks per full channel (compared to the normal 1). This dramatically improves Magic critical hit chance during burst windows and synergises with Guthix Staff/Sunshine rotations.',
  how: "Learned from the Greater Concentrated Blast ability codex — dropped by The Ambassador (Elite Dungeon 3) or from Solak.",
  gim: 'A defining Magic ability upgrade. Once the group can run ED3 or Solak, getting this for Magic users should be a priority.',
  wiki: 'https://runescape.wiki/w/Greater_Concentrated_Blast',
  iconFile: 'Greater_Concentrated_Blast.png',
});

add({
  id: 'greater_ricochet',
  name: 'Greater Ricochet Ability (Ranged)',
  category: 'skilling',
  tier_impact: 'high',
  why: "Greater Ricochet fires additional projectiles that each have a chance to apply the Black Stone Arrow debuff, applying Caroming 4 stacks. In multi-target content (Rago P1, Araxxor, Ed runs), Greater Ricochet is one of the highest-DPS Ranged abilities in the game.",
  how: 'Learned from the Greater Ricochet ability codex, dropped by Yor\'kul and the Rex Matriarchs, or from Liberation of Mazcab.',
  gim: 'Priority for Ranged DPS in group content. The multi-target bounce damage is exceptional in almost all end-game encounters.',
  wiki: 'https://runescape.wiki/w/Greater_Ricochet',
  iconFile: 'Greater_Ricochet.png',
});

add({
  id: 'greater_chain',
  name: 'Greater Chain Ability (Magic)',
  category: 'skilling',
  tier_impact: 'high',
  why: "Greater Chain is an improved version of Chain that applies a secondary ability (usually Omnipower or Corruption Shot equivalent) to all chained targets. In multi-target scenarios, it is the single highest-DPS AoE Magic ability. Also applies debuffs to all targets.",
  how: 'Learned from the Greater Chain ability codex, dropped from the Liberation of Mazcab Raids.',
  gim: 'Excellent for group content with multiple enemies. If the group is running Liberation of Mazcab, this is a top priority codex to aim for.',
  wiki: 'https://runescape.wiki/w/Greater_Chain',
  iconFile: 'Greater_Chain.png',
});

add({
  id: 'nihil_pouches',
  name: 'Nihil Pouches (T80 Combat Familiars)',
  category: 'pvm_drop',
  tier_impact: 'high',
  why: 'Nihil pouches summon a Smoke, Ice, Blood, or Shadow Nihil familiar from Nex. Each Nihil provides a 5% accuracy boost to its respective combat style (Smoke = Magic, Ice = Ranged, Blood = Melee, Shadow = Necromancy). Free accuracy boost that stacks with everything else.',
  how: "Nihil charms drop from Nex (The Temple at Senntisten). Turn them into pouches via the Summoning skill (requires level 87 Summoning for the T80 pouch).",
  gim: "Every member should have a Nihil pouch for their main style. A 5% flat accuracy boost is one of the best passive bonuses available. Farm Nex together for charms.",
  wiki: 'https://runescape.wiki/w/Nihil',
  iconFile: 'Smoke_nihil_pouch.png',
});

add({
  id: 'masterwork_armour',
  name: 'Masterwork Armour (T90 Melee Power)',
  category: 'skilling',
  tier_impact: 'high',
  why: "Masterwork armour is smithable T90 Melee power armour. It degrades but is fully repairable — unlike Malevolent (which requires Rise of the Six drops). For GIM groups, Masterwork is often more sustainable than Malevolent since it requires only 99 Smithing and ore.",
  how: 'Requires 99 Smithing, Masterwork bars (from Elder rune bars + coal), and significant crafting time. The Trimmed variant (T92 tank) requires Trimmed masterwork plates from boss kills.',
  gim: 'If any group member has or is training to 99 Smithing, Masterwork is the most accessible T90 Melee armour. Coordinate who smiths it for the group.',
  wiki: 'https://runescape.wiki/w/Masterwork_armour',
  iconFile: 'Masterwork_helm.png',
});

// ══════════════════════════════════════════════════════════════════════════════
// Run summary
// ══════════════════════════════════════════════════════════════════════════════

const total = db.prepare('SELECT COUNT(*) AS n FROM rs3_milestone_items').get().n;
console.log(`\nDone! Total important items in database: ${total}`);
console.log('\nItems by tier_impact:');
const breakdown = db.prepare("SELECT tier_impact, COUNT(*) as n FROM rs3_milestone_items GROUP BY tier_impact ORDER BY CASE tier_impact WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END").all();
breakdown.forEach(r => console.log(`  ${r.tier_impact.padEnd(10)}: ${r.n} items`));

console.log('\nSample new items:');
db.prepare("SELECT name, tier_impact, icon_url FROM rs3_milestone_items WHERE tier_impact IN ('low') LIMIT 6").all()
  .forEach(r => console.log(`  [${r.tier_impact}] ${r.name}`));
