// RS3 item recipe database
// Each entry describes what's needed to produce `produces` units of the item.
// If no entry exists → treat as a raw gathering goal.

export const RECIPES = {
  // ── Construction planks (Sawmill) ────────────────────────────────────────
  "Plank": {
    produces: 1,
    method: "Sawmill operator",
    skill: null,
    ingredients: [
      { item: "Logs", quantity: 1 },
      { item: "Coins", quantity: 100 },
    ],
  },
  "Oak plank": {
    produces: 1,
    method: "Sawmill operator",
    skill: null,
    ingredients: [
      { item: "Oak logs", quantity: 1 },
      { item: "Coins", quantity: 250 },
    ],
  },
  "Teak plank": {
    produces: 1,
    method: "Sawmill operator",
    skill: null,
    ingredients: [
      { item: "Teak logs", quantity: 1 },
      { item: "Coins", quantity: 500 },
    ],
  },
  "Mahogany plank": {
    produces: 1,
    method: "Sawmill operator",
    skill: null,
    ingredients: [
      { item: "Mahogany logs", quantity: 1 },
      { item: "Coins", quantity: 1500 },
    ],
  },

  // ── Metal bars (Furnace / Smithing) ──────────────────────────────────────
  "Bronze bar": {
    produces: 1,
    method: "Furnace",
    skill: "Smithing",
    skillLevel: 1,
    ingredients: [
      { item: "Copper ore", quantity: 1 },
      { item: "Tin ore", quantity: 1 },
    ],
  },
  "Iron bar": {
    produces: 1,
    method: "Furnace (50% success without superheat)",
    skill: "Smithing",
    skillLevel: 15,
    ingredients: [
      { item: "Iron ore", quantity: 1 },
    ],
  },
  "Steel bar": {
    produces: 1,
    method: "Furnace",
    skill: "Smithing",
    skillLevel: 30,
    ingredients: [
      { item: "Iron ore", quantity: 1 },
      { item: "Coal", quantity: 2 },
    ],
  },
  "Mithril bar": {
    produces: 1,
    method: "Furnace",
    skill: "Smithing",
    skillLevel: 50,
    ingredients: [
      { item: "Mithril ore", quantity: 1 },
      { item: "Coal", quantity: 4 },
    ],
  },
  "Adamantite bar": {
    produces: 1,
    method: "Furnace",
    skill: "Smithing",
    skillLevel: 70,
    ingredients: [
      { item: "Adamantite ore", quantity: 1 },
      { item: "Coal", quantity: 6 },
    ],
  },
  "Runite bar": {
    produces: 1,
    method: "Furnace",
    skill: "Smithing",
    skillLevel: 85,
    ingredients: [
      { item: "Runite ore", quantity: 1 },
      { item: "Coal", quantity: 8 },
    ],
  },

  // ── Fletching ─────────────────────────────────────────────────────────────
  "Arrow shaft": {
    produces: 15,
    method: "Knife on logs",
    skill: "Fletching",
    skillLevel: 1,
    ingredients: [
      { item: "Logs", quantity: 1 },
    ],
  },
  "Headless arrow": {
    produces: 1,
    method: "Fletching",
    skill: "Fletching",
    skillLevel: 1,
    ingredients: [
      { item: "Arrow shaft", quantity: 1 },
      { item: "Feather", quantity: 1 },
    ],
  },
  "Bronze arrow": {
    produces: 1,
    method: "Fletching",
    skill: "Fletching",
    skillLevel: 1,
    ingredients: [
      { item: "Headless arrow", quantity: 1 },
      { item: "Bronze arrowhead", quantity: 1 },
    ],
  },
  "Iron arrow": {
    produces: 1,
    method: "Fletching",
    skill: "Fletching",
    skillLevel: 15,
    ingredients: [
      { item: "Headless arrow", quantity: 1 },
      { item: "Iron arrowhead", quantity: 1 },
    ],
  },
  "Steel arrow": {
    produces: 1,
    method: "Fletching",
    skill: "Fletching",
    skillLevel: 30,
    ingredients: [
      { item: "Headless arrow", quantity: 1 },
      { item: "Steel arrowhead", quantity: 1 },
    ],
  },
  "Mithril arrow": {
    produces: 1,
    method: "Fletching",
    skill: "Fletching",
    skillLevel: 45,
    ingredients: [
      { item: "Headless arrow", quantity: 1 },
      { item: "Mithril arrowhead", quantity: 1 },
    ],
  },
  "Adamant arrow": {
    produces: 1,
    method: "Fletching",
    skill: "Fletching",
    skillLevel: 60,
    ingredients: [
      { item: "Headless arrow", quantity: 1 },
      { item: "Adamant arrowhead", quantity: 1 },
    ],
  },
  "Rune arrow": {
    produces: 1,
    method: "Fletching",
    skill: "Fletching",
    skillLevel: 75,
    ingredients: [
      { item: "Headless arrow", quantity: 1 },
      { item: "Rune arrowhead", quantity: 1 },
    ],
  },
  "Bowstring": {
    produces: 1,
    method: "Spinning wheel",
    skill: "Crafting",
    skillLevel: 10,
    ingredients: [
      { item: "Flax", quantity: 1 },
    ],
  },
  "Shortbow (u)": {
    produces: 1,
    method: "Knife on logs",
    skill: "Fletching",
    skillLevel: 5,
    ingredients: [
      { item: "Logs", quantity: 1 },
    ],
  },
  "Longbow (u)": {
    produces: 1,
    method: "Knife on logs",
    skill: "Fletching",
    skillLevel: 10,
    ingredients: [
      { item: "Logs", quantity: 1 },
    ],
  },
  "Oak shortbow (u)": {
    produces: 1,
    method: "Knife on oak logs",
    skill: "Fletching",
    skillLevel: 20,
    ingredients: [
      { item: "Oak logs", quantity: 1 },
    ],
  },
  "Yew longbow (u)": {
    produces: 1,
    method: "Knife on yew logs",
    skill: "Fletching",
    skillLevel: 70,
    ingredients: [
      { item: "Yew logs", quantity: 1 },
    ],
  },
  "Magic longbow (u)": {
    produces: 1,
    method: "Knife on magic logs",
    skill: "Fletching",
    skillLevel: 85,
    ingredients: [
      { item: "Magic logs", quantity: 1 },
    ],
  },

  // ── Herblore potions ──────────────────────────────────────────────────────
  "Prayer potion(3)": {
    produces: 1,
    method: "Herblore",
    skill: "Herblore",
    skillLevel: 38,
    ingredients: [
      { item: "Ranarr potion (unf)", quantity: 1 },
      { item: "Snape grass", quantity: 1 },
    ],
    note: "Ranarr potion (unf) = Ranarr weed + Vial of water",
  },
  "Super restore(3)": {
    produces: 1,
    method: "Herblore",
    skill: "Herblore",
    skillLevel: 63,
    ingredients: [
      { item: "Snapdragon potion (unf)", quantity: 1 },
      { item: "Red spiders' eggs", quantity: 1 },
    ],
  },
  "Super attack(3)": {
    produces: 1,
    method: "Herblore",
    skill: "Herblore",
    skillLevel: 45,
    ingredients: [
      { item: "Irit potion (unf)", quantity: 1 },
      { item: "Eye of newt", quantity: 1 },
    ],
  },
  "Super strength(3)": {
    produces: 1,
    method: "Herblore",
    skill: "Herblore",
    skillLevel: 55,
    ingredients: [
      { item: "Kwuarm potion (unf)", quantity: 1 },
      { item: "Limpwurt root", quantity: 1 },
    ],
  },
  "Super defence(3)": {
    produces: 1,
    method: "Herblore",
    skill: "Herblore",
    skillLevel: 66,
    ingredients: [
      { item: "Cadantine potion (unf)", quantity: 1 },
      { item: "White berries", quantity: 1 },
    ],
  },
  "Ranging potion(3)": {
    produces: 1,
    method: "Herblore",
    skill: "Herblore",
    skillLevel: 72,
    ingredients: [
      { item: "Dwarf weed potion (unf)", quantity: 1 },
      { item: "Wine of Zamorak", quantity: 1 },
    ],
  },
  "Magic potion(3)": {
    produces: 1,
    method: "Herblore",
    skill: "Herblore",
    skillLevel: 76,
    ingredients: [
      { item: "Lantadyme potion (unf)", quantity: 1 },
      { item: "Potato cactus", quantity: 1 },
    ],
  },
  "Saradomin brew(3)": {
    produces: 1,
    method: "Herblore",
    skill: "Herblore",
    skillLevel: 81,
    ingredients: [
      { item: "Toadflax potion (unf)", quantity: 1 },
      { item: "Crushed nest", quantity: 1 },
    ],
  },
  "Extreme attack(3)": {
    produces: 1,
    method: "Herblore",
    skill: "Herblore",
    skillLevel: 88,
    ingredients: [
      { item: "Super attack(3)", quantity: 1 },
      { item: "Avantoe", quantity: 1 },
    ],
  },
  "Extreme strength(3)": {
    produces: 1,
    method: "Herblore",
    skill: "Herblore",
    skillLevel: 89,
    ingredients: [
      { item: "Super strength(3)", quantity: 1 },
      { item: "Dwarf weed", quantity: 1 },
    ],
  },
  "Extreme defence(3)": {
    produces: 1,
    method: "Herblore",
    skill: "Herblore",
    skillLevel: 90,
    ingredients: [
      { item: "Super defence(3)", quantity: 1 },
      { item: "Lantadyme", quantity: 1 },
    ],
  },
  "Extreme ranging(3)": {
    produces: 1,
    method: "Herblore",
    skill: "Herblore",
    skillLevel: 91,
    ingredients: [
      { item: "Ranging potion(3)", quantity: 1 },
      { item: "Grenwall spikes", quantity: 4 },
    ],
  },
  "Extreme magic(3)": {
    produces: 1,
    method: "Herblore",
    skill: "Herblore",
    skillLevel: 91,
    ingredients: [
      { item: "Magic potion(3)", quantity: 1 },
      { item: "Ground mud rune", quantity: 1 },
    ],
  },
  "Overload(3)": {
    produces: 1,
    method: "Herblore",
    skill: "Herblore",
    skillLevel: 96,
    ingredients: [
      { item: "Extreme attack(3)", quantity: 1 },
      { item: "Extreme strength(3)", quantity: 1 },
      { item: "Extreme defence(3)", quantity: 1 },
      { item: "Extreme ranging(3)", quantity: 1 },
      { item: "Extreme magic(3)", quantity: 1 },
      { item: "Torstol", quantity: 1 },
    ],
    note: "Each overload requires one of each extreme potion + a torstol",
  },
  "Antifire potion(3)": {
    produces: 1,
    method: "Herblore",
    skill: "Herblore",
    skillLevel: 69,
    ingredients: [
      { item: "Lantadyme potion (unf)", quantity: 1 },
      { item: "Dragon scale dust", quantity: 1 },
    ],
  },

  // ── Crafting ──────────────────────────────────────────────────────────────
  "Leather": {
    produces: 1,
    method: "Tanning (Al Kharid or Crafting Guild)",
    skill: null,
    ingredients: [
      { item: "Cowhide", quantity: 1 },
      { item: "Coins", quantity: 1 },
    ],
  },
  "Hard leather": {
    produces: 1,
    method: "Tanning",
    skill: null,
    ingredients: [
      { item: "Cowhide", quantity: 1 },
      { item: "Coins", quantity: 3 },
    ],
  },
  "Molten glass": {
    produces: 1,
    method: "Furnace",
    skill: "Crafting",
    skillLevel: 1,
    ingredients: [
      { item: "Soda ash", quantity: 1 },
      { item: "Bucket of sand", quantity: 1 },
    ],
  },

  // ── Runecrafting ──────────────────────────────────────────────────────────
  "Air rune": {
    produces: 11,
    method: "Air Altar",
    skill: "Runecrafting",
    skillLevel: 1,
    ingredients: [
      { item: "Pure essence", quantity: 1 },
    ],
    note: "Quantity per essence increases with level. ~11 per essence at level 50+",
  },
  "Nature rune": {
    produces: 1,
    method: "Nature Altar",
    skill: "Runecrafting",
    skillLevel: 44,
    ingredients: [
      { item: "Pure essence", quantity: 1 },
    ],
  },
  "Law rune": {
    produces: 1,
    method: "Law Altar",
    skill: "Runecrafting",
    skillLevel: 54,
    ingredients: [
      { item: "Pure essence", quantity: 1 },
    ],
  },
  "Death rune": {
    produces: 1,
    method: "Death Altar",
    skill: "Runecrafting",
    skillLevel: 65,
    ingredients: [
      { item: "Pure essence", quantity: 1 },
    ],
    note: "Death Altar unlocked by Mourning's End Part II",
  },
  "Blood rune": {
    produces: 1,
    method: "Blood Altar",
    skill: "Runecrafting",
    skillLevel: 77,
    ingredients: [
      { item: "Pure essence", quantity: 1 },
    ],
  },

  // ── Farming (seed → herb) ─────────────────────────────────────────────────
  "Grimy ranarr weed": {
    produces: 6,
    method: "Farming patch",
    skill: "Farming",
    skillLevel: 32,
    ingredients: [
      { item: "Ranarr seed", quantity: 1 },
    ],
    note: "~6 herbs per patch on average with compost",
  },
  "Grimy snapdragon": {
    produces: 6,
    method: "Farming patch",
    skill: "Farming",
    skillLevel: 59,
    ingredients: [
      { item: "Snapdragon seed", quantity: 1 },
    ],
  },
  "Grimy torstol": {
    produces: 6,
    method: "Farming patch",
    skill: "Farming",
    skillLevel: 75,
    ingredients: [
      { item: "Torstol seed", quantity: 1 },
    ],
  },

  // ── Summoning ─────────────────────────────────────────────────────────────
  "Pack yak pouch": {
    produces: 1,
    method: "Summoning obelisk",
    skill: "Summoning",
    skillLevel: 96,
    ingredients: [
      { item: "Pouch", quantity: 1 },
      { item: "Yak hide", quantity: 128 },
      { item: "Gold charm", quantity: 1 },
      { item: "Spirit shards", quantity: 275 },
    ],
    note: "Pack yak = 96 Summoning. Holds 30 items.",
  },
  "War tortoise pouch": {
    produces: 1,
    method: "Summoning obelisk",
    skill: "Summoning",
    skillLevel: 67,
    ingredients: [
      { item: "Pouch", quantity: 1 },
      { item: "Tortoise shell", quantity: 47 },
      { item: "Gold charm", quantity: 1 },
      { item: "Spirit shards", quantity: 187 },
    ],
  },
};

export const RECIPE_NAMES = Object.keys(RECIPES).sort();

// Expand a recipe to its full flat list of base ingredients for a given quantity
export function expandRecipe(itemName, qty) {
  const recipe = RECIPES[itemName];
  if (!recipe) return [{ item: itemName, quantity: qty, raw: true }];

  const batchesNeeded = Math.ceil(qty / recipe.produces);
  const result = [];

  for (const ing of recipe.ingredients) {
    const totalNeeded = ing.quantity * batchesNeeded;
    result.push({
      item: ing.item,
      quantity: totalNeeded,
      raw: !RECIPES[ing.item],
    });
  }

  return result;
}
