// Key RS3 quests for GIM progression tracking
// requirements.skills  = minimum skill levels to complete
// requirements.quests  = prerequisite quest names (must be done first)
// requirements.qp      = minimum quest points needed
// unlocks              = notable content unlocked on completion

export const QUESTS = {
  // ── Elf / Prifddinas series ─────────────────────────────────────────────
  "Plague City": {
    series: "Elf", difficulty: "Novice",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 1 },
    unlocks: ["Access to West Ardougne"],
  },
  "Biohazard": {
    series: "Elf", difficulty: "Novice",
    requirements: { skills: {}, quests: ["Plague City"], qp: 0 },
    rewards: { qp: 3 },
  },
  "Underground Pass": {
    series: "Elf", difficulty: "Experienced",
    requirements: { skills: { Ranged: 25 }, quests: ["Biohazard"], qp: 0 },
    rewards: { qp: 5 },
  },
  "Regicide": {
    series: "Elf", difficulty: "Master",
    requirements: { skills: { Agility: 56, Crafting: 10 }, quests: ["Underground Pass"], qp: 0 },
    rewards: { qp: 3 },
    unlocks: ["Access to Tirannwn", "Crystal equipment"],
  },
  "Roving Elves": {
    series: "Elf", difficulty: "Experienced",
    requirements: { skills: {}, quests: ["Regicide", "Waterfall Quest"], qp: 0 },
    rewards: { qp: 1 },
  },
  "Mourning's End Part I": {
    series: "Elf", difficulty: "Master",
    requirements: { skills: { Ranged: 60, Thieving: 60 }, quests: ["Roving Elves"], qp: 0 },
    rewards: { qp: 2 },
  },
  "Mourning's End Part II": {
    series: "Elf", difficulty: "Master",
    requirements: { skills: {}, quests: ["Mourning's End Part I"], qp: 0 },
    rewards: { qp: 2 },
    unlocks: ["Death Altar (Runecrafting)"],
  },
  "Within the Light": {
    series: "Elf", difficulty: "Grandmaster",
    requirements: {
      skills: { Agility: 69, Firemaking: 75, Prayer: 75, Woodcutting: 75 },
      quests: ["Mourning's End Part II"], qp: 0,
    },
    rewards: { qp: 2 },
  },
  "Making History": {
    series: "Elf", difficulty: "Intermediate",
    requirements: { skills: {}, quests: ["Priest in Peril", "The Restless Ghost"], qp: 0 },
    rewards: { qp: 3 },
  },
  "Plague's End": {
    series: "Elf", difficulty: "Grandmaster",
    requirements: {
      skills: {
        Agility: 75, Construction: 75, Crafting: 75, Dungeoneering: 75,
        Herblore: 75, Mining: 75, Prayer: 75, Ranged: 75,
        Smithing: 75, Summoning: 75, Woodcutting: 75,
      },
      quests: ["Within the Light", "Making History"], qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Prifddinas", "Seren spells", "Hefin Agility Course", "Harps (Crafting)"],
  },

  // ── Gnome / Monkey Madness ───────────────────────────────────────────────
  "Tree Gnome Village": {
    series: "Gnome", difficulty: "Novice",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 2 },
    unlocks: ["Gnome gliders"],
  },
  "The Grand Tree": {
    series: "Gnome", difficulty: "Experienced",
    requirements: { skills: { Agility: 25 }, quests: ["Tree Gnome Village"], qp: 0 },
    rewards: { qp: 5 },
    unlocks: ["Gnome gliders (extended)"],
  },
  "Monkey Madness": {
    series: "Gnome", difficulty: "Master",
    requirements: { skills: {}, quests: ["Tree Gnome Village", "The Grand Tree"], qp: 0 },
    rewards: { qp: 3 },
    unlocks: ["Dragon scimitar", "Ape Atoll"],
  },

  // ── Classics ─────────────────────────────────────────────────────────────
  "Waterfall Quest": {
    difficulty: "Experienced",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 1 },
    unlocks: ["Fast Attack/Strength XP"],
  },
  "Lost City": {
    difficulty: "Experienced",
    requirements: { skills: { Crafting: 31, Woodcutting: 36 }, quests: [], qp: 0 },
    rewards: { qp: 3 },
    unlocks: ["Dragon longsword", "Dragon dagger", "Zanaris"],
  },
  "Dragon Slayer": {
    difficulty: "Experienced",
    requirements: { skills: {}, quests: [], qp: 32 },
    rewards: { qp: 2 },
    unlocks: ["Rune platebody", "Anti-dragon shield"],
  },
  "Druidic Ritual": {
    difficulty: "Novice",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 4 },
    unlocks: ["Herblore skill"],
  },
  "Priest in Peril": {
    difficulty: "Intermediate",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 1 },
    unlocks: ["Morytania access"],
  },

  // ── Heroes' / Legends' ───────────────────────────────────────────────────
  "Heroes' Quest": {
    difficulty: "Experienced",
    requirements: {
      skills: { Cooking: 53, Fishing: 53, Herblore: 25, Mining: 50 },
      quests: ["Shield of Arrav", "Lost City", "Merlin's Crystal", "Dragon Slayer", "Druidic Ritual"],
      qp: 55,
    },
    rewards: { qp: 1 },
    unlocks: ["Heroes' Guild", "Brimhaven Dungeon"],
  },
  "Legends' Quest": {
    difficulty: "Master",
    requirements: {
      skills: {
        Agility: 50, Crafting: 50, Herblore: 45, Magic: 56,
        Mining: 52, Prayer: 42, Smithing: 52, Strength: 50,
        Thieving: 50, Woodcutting: 50,
      },
      quests: ["Family Crest", "Heroes' Quest", "Waterfall Quest", "Underground Pass", "Jungle Potion"],
      qp: 107,
    },
    rewards: { qp: 4 },
    unlocks: ["Legends' Guild", "Cape of Legends"],
  },

  // ── Desert Treasure series ───────────────────────────────────────────────
  "Desert Treasure": {
    difficulty: "Master",
    requirements: {
      skills: { Firemaking: 50, Magic: 50, Slayer: 10, Thieving: 53 },
      quests: ["The Dig Site", "Priest in Peril"],
      qp: 100,
    },
    rewards: { qp: 3 },
    unlocks: ["Ancient Magicks"],
  },
  "The Temple at Senntisten": {
    difficulty: "Experienced",
    requirements: {
      skills: { Prayer: 50 },
      quests: ["Desert Treasure"], qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Curses prayer book", "Nex access"],
  },

  // ── Lunar / Fremennik ────────────────────────────────────────────────────
  "The Fremennik Trials": {
    difficulty: "Experienced",
    requirements: {
      skills: { Crafting: 40, Fishing: 40, Fletching: 25, Woodcutting: 40 },
      quests: [], qp: 0,
    },
    rewards: { qp: 3 },
    unlocks: ["Fremennik Province", "Lunar Isle access"],
  },
  "Lunar Diplomacy": {
    difficulty: "Experienced",
    requirements: {
      skills: { Crafting: 61, Defence: 40, Firemaking: 49, Magic: 65, Mining: 60, Woodcutting: 55, Herblore: 5 },
      quests: ["Lost City", "The Fremennik Trials", "Rune Mysteries"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Lunar Magic spellbook"],
  },
  "Dream Mentor": {
    difficulty: "Master",
    requirements: {
      skills: { Magic: 65 },
      quests: ["Lunar Diplomacy", "Eadgar's Ruse", "Shades of Mort'ton"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Extended Lunar spells"],
  },

  // ── While Guthix Sleeps / World Wakes series ─────────────────────────────
  "While Guthix Sleeps": {
    difficulty: "Grandmaster",
    requirements: {
      skills: {
        Agility: 65, Construction: 65, Crafting: 65, Dungeoneering: 65,
        Farming: 65, Firemaking: 65, Hunter: 65, Magic: 65,
        Ranged: 65, Slayer: 65, Smithing: 65, Strength: 65, Thieving: 65,
      },
      quests: ["The Hunt for Surok", "Summer's End"],
      qp: 0,
    },
    rewards: { qp: 5 },
    unlocks: ["Turmoil (95 Prayer)", "Grotworm Lair"],
  },
  "Ritual of the Mahjarrat": {
    difficulty: "Grandmaster",
    requirements: {
      skills: { Agility: 76, Construction: 77, Crafting: 77, Mining: 76, Slayer: 77, Smithing: 77 },
      quests: ["While Guthix Sleeps", "The Temple at Senntisten"],
      qp: 0,
    },
    rewards: { qp: 3 },
    unlocks: ["Glacors (80 Magic)", "Armadyl battlestaff"],
  },
  "The World Wakes": {
    difficulty: "Grandmaster",
    requirements: {
      skills: {},
      quests: ["While Guthix Sleeps", "Ritual of the Mahjarrat", "The Void Stares Back", "Salt in the Wound"],
      qp: 0,
    },
    rewards: { qp: 3 },
    unlocks: ["Queen Black Dragon access", "Mahjarrat aura"],
  },
  "Children of Mah": {
    difficulty: "Grandmaster",
    requirements: {
      skills: { Divination: 75, Magic: 75, Prayer: 77 },
      quests: ["Fate of the Gods", "Ritual of the Mahjarrat"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Ancient Curses upgrade (Malevolence etc.)"],
  },
  "Fate of the Gods": {
    difficulty: "Grandmaster",
    requirements: {
      skills: { Divination: 60, Runecrafting: 60, Slayer: 60, Summoning: 60 },
      quests: ["Missing, Presumed Death"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Telos prereq", "Seren prayers"],
  },

  // ── Slayer ───────────────────────────────────────────────────────────────
  "Smoking Kills": {
    difficulty: "Intermediate",
    requirements: { skills: { Slayer: 35 }, quests: [], qp: 0 },
    rewards: { qp: 1 },
    unlocks: ["Full Slayer Helmet", "Slayer points shop"],
  },
  "Branches of Darkmeyer": {
    difficulty: "Master",
    requirements: {
      skills: { Agility: 63, Crafting: 56, Magic: 63, Ranged: 63, Slayer: 63, Woodcutting: 56 },
      quests: ["Legacy of Seergaze"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Darkmeyer city", "Blisterwood weapons"],
  },

  // ── Misc important ───────────────────────────────────────────────────────
  "Recipe for Disaster": {
    difficulty: "Grandmaster",
    requirements: {
      skills: {
        Agility: 48, Cooking: 70, Crafting: 40, Fishing: 53,
        Firemaking: 50, Magic: 59, Mining: 50, Ranged: 40,
        Smithing: 40, Thieving: 53, Woodcutting: 36,
      },
      quests: [
        "Cook's Assistant", "Biohazard", "Desert Treasure", "Dragon Slayer",
        "Heroes' Quest", "Legends' Quest", "Monkey Madness", "Roving Elves",
      ],
      qp: 175,
    },
    rewards: { qp: 10 },
    unlocks: ["Culinaromancer's Chest", "Barrelchest Anchor"],
  },
  "Swan Song": {
    difficulty: "Master",
    requirements: {
      skills: { Cooking: 62, Crafting: 40, Fishing: 62, Firemaking: 42, Magic: 66, Smithing: 45 },
      quests: ["One Small Favour"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Piscatoris (Monkfish)", "Void Knight Deflector"],
  },
  "Throne of Miscellania": {
    difficulty: "Intermediate",
    requirements: {
      skills: { Farming: 10, Fishing: 35, Herblore: 15, Mining: 40, Thieving: 20, Woodcutting: 45 },
      quests: ["Heroes' Quest"], qp: 0,
    },
    rewards: { qp: 1 },
    unlocks: ["Kingdom of Miscellania (passive resources)"],
  },
};

export const QUEST_NAMES = Object.keys(QUESTS).sort();
export const DIFFICULTIES = ["Novice", "Intermediate", "Experienced", "Master", "Grandmaster"];
