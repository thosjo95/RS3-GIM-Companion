// RS3 Quest data — requirements sourced from runescape.wiki
// requirements.skills  = minimum levels needed to START the quest
// requirements.quests  = prerequisite quest names (direct prerequisites only)
// requirements.qp      = minimum Quest Points needed to start
// rewards.qp           = quest points awarded on completion
// unlocks              = notable content/areas/features unlocked
// series               = quest series name (matches wiki categorisation)

export const QUESTS = {

  // ── Free-to-Play / Standalone ─────────────────────────────────────────────
  "Cook's Assistant": {
    difficulty: "Novice",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 1 },
  },
  "Demon Slayer": {
    difficulty: "Novice",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 3 },
    unlocks: ["Silverlight sword"],
  },
  "The Restless Ghost": {
    difficulty: "Novice",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 1 },
    unlocks: ["Prayer XP", "Amulet of ghostspeak"],
  },
  "Goblin Diplomacy": {
    difficulty: "Novice",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 5 },
  },
  "Druidic Ritual": {
    difficulty: "Novice",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 4 },
    unlocks: ["Herblore skill"],
  },
  "Rune Mysteries": {
    series: "Ariane",
    difficulty: "Novice",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 1 },
    unlocks: ["Runecrafting skill"],
  },
  "Recruitment Drive": {
    series: "Temple Knight",
    difficulty: "Novice",
    requirements: { skills: { Herblore: 3 }, quests: [], qp: 0 },
    rewards: { qp: 1 },
  },
  "Imp Catcher": {
    difficulty: "Novice",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 1 },
  },
  "Sheep Herder": {
    difficulty: "Novice",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 4 },
  },
  "Witch's House": {
    difficulty: "Intermediate",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 4 },
  },
  "Missing, Presumed Death": {
    series: "Sliske's Game",
    difficulty: "Novice",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 2 },
    unlocks: ["Sliske's Game questline"],
  },
  "Waterfall Quest": {
    difficulty: "Intermediate",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 1 },
    unlocks: ["Fast Attack/Strength XP"],
  },
  "Dragon Slayer": {
    difficulty: "Experienced",
    requirements: { skills: {}, quests: [], qp: 32 },
    rewards: { qp: 2 },
    unlocks: ["Rune platebody", "Anti-dragon shield"],
  },
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
    series: "Wise Old Man",
    difficulty: "Master",
    requirements: {
      skills: { Cooking: 62, Crafting: 40, Fishing: 62, Firemaking: 42, Magic: 66, Smithing: 45 },
      quests: ["One Small Favour"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Piscatoris (Monkfish fishing)", "Void Knight Deflector"],
  },
  "Love Story": {
    series: "Wise Old Man",
    difficulty: "Master",
    requirements: {
      skills: { Construction: 68, Crafting: 67, Magic: 77, Smithing: 68 },
      quests: ["Swan Song"],
      qp: 0,
    },
    rewards: { qp: 2 },
  },
  "Grim Tales": {
    difficulty: "Master",
    requirements: {
      skills: { Agility: 59, Farming: 45, Herblore: 52, Thieving: 58, Woodcutting: 71 },
      quests: ["Witch's House"],
      qp: 0,
    },
    rewards: { qp: 1 },
  },
  "Family Crest": {
    difficulty: "Experienced",
    requirements: {
      skills: { Crafting: 40, Magic: 59, Mining: 40, Smithing: 40 },
      quests: [],
      qp: 0,
    },
    rewards: { qp: 1 },
    unlocks: ["Chaos/Cooking/Smelting gauntlets"],
  },
  "One Small Favour": {
    difficulty: "Experienced",
    requirements: {
      skills: { Agility: 36, Crafting: 25, Herblore: 18, Smithing: 30 },
      quests: ["Shilo Village", "Druidic Ritual"],
      qp: 0,
    },
    rewards: { qp: 2 },
  },
  "Shilo Village": {
    difficulty: "Experienced",
    requirements: {
      skills: { Agility: 32, Crafting: 20 },
      quests: ["Jungle Potion"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Shilo Village", "Gem mining"],
  },
  "Jungle Potion": {
    difficulty: "Novice",
    requirements: { skills: { Herblore: 3 }, quests: [], qp: 0 },
    rewards: { qp: 1 },
  },
  "Enakhra's Lament": {
    series: "Mahjarrat Mysteries",
    difficulty: "Experienced",
    requirements: {
      skills: { Crafting: 50, Firemaking: 45, Magic: 13 },
      quests: [],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Camulet amulet", "Smoke Dungeon shortcuts"],
  },
  "Nomad's Requiem": {
    difficulty: "Grandmaster",
    requirements: {
      skills: { Construction: 60, Hunter: 65, Magic: 75, Mining: 66, Prayer: 70 },
      quests: ["King's Ransom"],
      qp: 0,
    },
    rewards: { qp: 3 },
    unlocks: ["Soul Wars cape", "Nomad boss"],
  },

  // ── Elf / Prifddinas series ───────────────────────────────────────────────
  "Plague City": {
    series: "Elf",
    difficulty: "Novice",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 1 },
    unlocks: ["West Ardougne access"],
  },
  "Biohazard": {
    series: "Elf",
    difficulty: "Novice",
    requirements: { skills: {}, quests: ["Plague City"], qp: 0 },
    rewards: { qp: 3 },
  },
  "Underground Pass": {
    series: "Elf",
    difficulty: "Experienced",
    requirements: { skills: { Ranged: 25 }, quests: ["Biohazard"], qp: 0 },
    rewards: { qp: 5 },
    unlocks: ["Underground Pass shortcut", "Tirannwn access"],
  },
  "Regicide": {
    series: "Elf",
    difficulty: "Master",
    requirements: {
      skills: { Agility: 56, Crafting: 10 },
      quests: ["Underground Pass"],
      qp: 0,
    },
    rewards: { qp: 3 },
    unlocks: ["Tirannwn fully accessible", "Crystal equipment"],
  },
  "Roving Elves": {
    series: "Elf",
    difficulty: "Master",
    requirements: { skills: {}, quests: ["Regicide", "Waterfall Quest"], qp: 0 },
    rewards: { qp: 1 },
  },
  "Mourning's End Part I": {
    series: "Elf",
    difficulty: "Master",
    requirements: {
      skills: { Ranged: 60, Thieving: 60 },
      quests: ["Roving Elves"],
      qp: 0,
    },
    rewards: { qp: 2 },
  },
  "Mourning's End Part II": {
    series: "Elf",
    difficulty: "Master",
    requirements: { skills: {}, quests: ["Mourning's End Part I"], qp: 0 },
    rewards: { qp: 2 },
    unlocks: ["Death Altar (Runecrafting)"],
  },
  "Within the Light": {
    series: "Elf",
    difficulty: "Master",
    requirements: {
      skills: { Agility: 69, Firemaking: 75, Prayer: 75, Woodcutting: 75 },
      quests: ["Mourning's End Part II"],
      qp: 0,
    },
    rewards: { qp: 2 },
  },
  "Plague's End": {
    series: "Elf",
    difficulty: "Grandmaster",
    requirements: {
      skills: {
        Agility: 75, Construction: 75, Crafting: 75, Dungeoneering: 75,
        Herblore: 75, Mining: 75, Prayer: 75, Ranged: 75,
        Smithing: 75, Summoning: 75, Woodcutting: 75,
      },
      quests: ["Within the Light", "Making History"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Prifddinas", "Seren spells", "Hefin Agility Course", "Harps (Crafting)"],
  },

  // ── Gnome / Monkey Madness series ────────────────────────────────────────
  "Tree Gnome Village": {
    series: "Gnome",
    difficulty: "Intermediate",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 2 },
    unlocks: ["Gnome gliders"],
  },
  "The Grand Tree": {
    series: "Gnome",
    difficulty: "Experienced",
    requirements: { skills: { Agility: 25 }, quests: ["Tree Gnome Village"], qp: 0 },
    rewards: { qp: 5 },
    unlocks: ["Gnome gliders (extended network)"],
  },
  "The Eyes of Glouphrie": {
    series: "Gnome",
    difficulty: "Intermediate",
    requirements: {
      skills: { Construction: 5, Magic: 46 },
      quests: ["Tree Gnome Village"],
      qp: 0,
    },
    rewards: { qp: 2 },
  },
  "The Path of Glouphrie": {
    series: "Gnome",
    difficulty: "Experienced",
    requirements: {
      skills: { Construction: 59, Magic: 56, Ranged: 56, Slayer: 56, Strength: 56, Woodcutting: 56 },
      quests: ["The Eyes of Glouphrie", "The Grand Tree", "Waterfall Quest"],
      qp: 0,
    },
    rewards: { qp: 1 },
  },
  "The Prisoner of Glouphrie": {
    series: "Gnome",
    difficulty: "Master",
    requirements: {
      skills: { Construction: 62, Magic: 62, Ranged: 62, Slayer: 62, Strength: 62, Woodcutting: 62 },
      quests: ["The Path of Glouphrie"],
      qp: 0,
    },
    rewards: { qp: 1 },
  },
  "Monkey Madness": {
    series: "Gnome",
    difficulty: "Master",
    requirements: { skills: {}, quests: ["Tree Gnome Village", "The Grand Tree"], qp: 0 },
    rewards: { qp: 3 },
    unlocks: ["Dragon scimitar", "Ape Atoll"],
  },

  // ── Troll series ─────────────────────────────────────────────────────────
  "Death Plateau": {
    series: "Troll",
    difficulty: "Novice",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 1 },
    unlocks: ["Burthorpe access", "Troll area"],
  },
  "Troll Stronghold": {
    series: "Troll",
    difficulty: "Experienced",
    requirements: {
      skills: { Agility: 15, Thieving: 30 },
      quests: ["Death Plateau"],
      qp: 0,
    },
    rewards: { qp: 1 },
    unlocks: ["Trollheim teleport"],
  },
  "Eadgar's Ruse": {
    series: "Troll",
    difficulty: "Experienced",
    requirements: {
      skills: { Herblore: 31 },
      quests: ["Druidic Ritual", "Troll Stronghold"],
      qp: 0,
    },
    rewards: { qp: 1 },
    unlocks: ["Trollheim Farming patch"],
  },
  "Troll Romance": {
    series: "Troll",
    difficulty: "Experienced",
    requirements: {
      skills: { Agility: 28 },
      quests: ["Troll Stronghold"],
      qp: 0,
    },
    rewards: { qp: 2 },
  },
  "My Arm's Big Adventure": {
    series: "Troll",
    difficulty: "Intermediate",
    requirements: {
      skills: { Farming: 29, Woodcutting: 10 },
      quests: ["Eadgar's Ruse", "Jungle Potion"],
      qp: 0,
    },
    rewards: { qp: 1 },
    unlocks: ["Troll Farming patch (disease-free)"],
  },

  // ── Fremennik series ─────────────────────────────────────────────────────
  "Mountain Daughter": {
    series: "Fremennik",
    difficulty: "Intermediate",
    requirements: { skills: { Agility: 20 }, quests: [], qp: 0 },
    rewards: { qp: 2 },
  },
  "The Fremennik Trials": {
    series: "Fremennik",
    difficulty: "Intermediate",
    requirements: {
      skills: { Crafting: 40, Fishing: 40, Fletching: 25, Woodcutting: 40 },
      quests: [],
      qp: 0,
    },
    rewards: { qp: 3 },
    unlocks: ["Fremennik Province", "Lunar Isle access (partial)"],
  },
  "The Fremennik Isles": {
    series: "Fremennik",
    difficulty: "Experienced",
    requirements: {
      skills: { Agility: 40, Construction: 20, Crafting: 46, Woodcutting: 56 },
      quests: ["The Fremennik Trials"],
      qp: 0,
    },
    rewards: { qp: 1 },
    unlocks: ["Neitiznot", "Jatizso islands"],
  },
  "Throne of Miscellania": {
    series: "Fremennik",
    difficulty: "Experienced",
    requirements: {
      skills: { Farming: 10, Fishing: 35, Herblore: 15, Mining: 40, Thieving: 20, Woodcutting: 45 },
      quests: ["Heroes' Quest"],
      qp: 0,
    },
    rewards: { qp: 1 },
    unlocks: ["Kingdom of Miscellania (passive resources)"],
  },
  "Royal Trouble": {
    series: "Fremennik",
    difficulty: "Experienced",
    requirements: {
      skills: { Agility: 40, Slayer: 40 },
      quests: ["Throne of Miscellania"],
      qp: 0,
    },
    rewards: { qp: 1 },
    unlocks: ["Expanded Miscellania resources"],
  },
  "Horror from the Deep": {
    series: "Fremennik",
    difficulty: "Experienced",
    requirements: { skills: { Agility: 35 }, quests: [], qp: 0 },
    rewards: { qp: 2 },
    unlocks: ["Dagannoth Kings (with other quests)", "God books"],
  },
  "Lunar Diplomacy": {
    series: "Fremennik",
    difficulty: "Experienced",
    requirements: {
      skills: {
        Crafting: 61, Defence: 40, Firemaking: 49, Herblore: 5,
        Magic: 65, Mining: 60, Woodcutting: 55,
      },
      quests: ["Lost City", "The Fremennik Trials", "Rune Mysteries"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Lunar Magic spellbook"],
  },
  "Dream Mentor": {
    series: "Fremennik",
    difficulty: "Master",
    requirements: {
      skills: { Magic: 65 },
      quests: ["Lunar Diplomacy", "Eadgar's Ruse", "Shades of Mort'ton"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Extended Lunar spells"],
  },
  "Glorious Memories": {
    series: "Fremennik",
    difficulty: "Master",
    requirements: {
      skills: { Agility: 50, Herblore: 43, Hunter: 41, Magic: 57 },
      quests: ["Mountain Daughter", "The Fremennik Isles", "Royal Trouble", "Throne of Miscellania"],
      qp: 0,
    },
    rewards: { qp: 1 },
  },
  "Blood Runs Deep": {
    series: "Fremennik",
    difficulty: "Master",
    requirements: {
      skills: { Attack: 75, Slayer: 65, Strength: 75 },
      quests: ["Horror from the Deep", "Dream Mentor", "Glorious Memories"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Dagannoth Kings full access", "Fremennik rings"],
  },

  // ── Myreque / Morytania series ────────────────────────────────────────────
  "Priest in Peril": {
    series: "Myreque",
    difficulty: "Novice",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 1 },
    unlocks: ["Morytania access"],
  },
  "Nature Spirit": {
    series: "Myreque",
    difficulty: "Novice",
    requirements: { skills: {}, quests: ["Priest in Peril", "The Restless Ghost"], qp: 0 },
    rewards: { qp: 2 },
    unlocks: ["Blessed sickle", "Ghast repelling"],
  },
  "In Search of the Myreque": {
    series: "Myreque",
    difficulty: "Intermediate",
    requirements: {
      skills: { Agility: 25 },
      quests: ["Nature Spirit"],
      qp: 0,
    },
    rewards: { qp: 2 },
  },
  "In Aid of the Myreque": {
    series: "Myreque",
    difficulty: "Intermediate",
    requirements: {
      skills: { Crafting: 25, Magic: 7, Mining: 15 },
      quests: ["In Search of the Myreque"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Burgh de Rott bank"],
  },
  "The Darkness of Hallowvale": {
    series: "Myreque",
    difficulty: "Intermediate",
    requirements: {
      skills: {
        Agility: 26, Construction: 5, Crafting: 32,
        Magic: 33, Mining: 20, Strength: 40, Thieving: 22,
      },
      quests: ["In Aid of the Myreque"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Meiyerditch access"],
  },
  "Legacy of Seergaze": {
    series: "Myreque",
    difficulty: "Experienced",
    requirements: {
      skills: {
        Agility: 29, Construction: 20, Crafting: 47,
        Firemaking: 40, Magic: 49, Mining: 35, Slayer: 31,
      },
      quests: ["The Darkness of Hallowvale"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Ivandis flail", "Blood Altar talisman"],
  },
  "The Branches of Darkmeyer": {
    series: "Myreque",
    difficulty: "Master",
    requirements: {
      skills: {
        Agility: 63, Crafting: 56, Magic: 63,
        Ranged: 63, Slayer: 63, Woodcutting: 56,
      },
      quests: ["Legacy of Seergaze"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Darkmeyer city", "Blisterwood weapons"],
  },
  "The Lord of Vampyrium": {
    series: "Myreque",
    difficulty: "Master",
    requirements: {
      skills: {
        Attack: 75, Constitution: 75, Construction: 79,
        Defence: 75, Hunter: 76, Slayer: 78, Strength: 75,
      },
      quests: ["The Branches of Darkmeyer"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Drakan's medallion", "Vampyre lore"],
  },
  "River of Blood": {
    series: "Myreque",
    difficulty: "Grandmaster",
    requirements: {
      skills: {
        Attack: 78, Constitution: 80, Firemaking: 76,
        Fletching: 75, Herblore: 80, Magic: 78,
        Mining: 72, Ranged: 78,
      },
      quests: ["The Lord of Vampyrium", "All Fired Up", "Defender of Varrock"],
      qp: 0,
    },
    rewards: { qp: 3 },
    unlocks: ["Sunspear weapon", "Vyrewatch Sentinel armour"],
  },

  // ── Pirate series ─────────────────────────────────────────────────────────
  "Pirate's Treasure": {
    series: "Pirate",
    difficulty: "Novice",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 2 },
  },
  "Rum Deal": {
    series: "Pirate",
    difficulty: "Experienced",
    requirements: {
      skills: { Crafting: 42, Farming: 40, Fishing: 50, Prayer: 47, Slayer: 42 },
      quests: [],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Braindeath Island"],
  },
  "Cabin Fever": {
    series: "Pirate",
    difficulty: "Experienced",
    requirements: {
      skills: { Agility: 42, Crafting: 45, Ranged: 40, Smithing: 50 },
      quests: ["Pirate's Treasure", "Rum Deal"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Mos Le'Harmless", "Brimhaven Agility Arena shortcut"],
  },
  "The Great Brain Robbery": {
    series: "Pirate",
    difficulty: "Experienced",
    requirements: {
      skills: { Construction: 30, Crafting: 16, Prayer: 50 },
      quests: ["Creature of Fenkenstrain", "Cabin Fever"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Mos Le'Harmless (full access)"],
  },
  "Rocking Out": {
    series: "Pirate",
    difficulty: "Master",
    requirements: {
      skills: { Agility: 60, Crafting: 66, Smithing: 69, Thieving: 63 },
      quests: ["The Great Brain Robbery", "Creature of Fenkenstrain", "The Restless Ghost"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Trouble Brewing minigame", "Pirate jacket"],
  },
  "A Clockwork Syringe": {
    series: "Pirate",
    difficulty: "Master",
    requirements: {
      skills: {
        Construction: 62, Defence: 76, Dungeoneering: 50,
        Slayer: 61, Smithing: 74, Summoning: 65, Thieving: 74,
      },
      quests: ["Rocking Out"],
      qp: 0,
    },
    rewards: { qp: 1 },
  },
  "Pieces of Hate": {
    series: "Pirate",
    difficulty: "Grandmaster",
    requirements: {
      skills: { Agility: 83, Construction: 81, Firemaking: 82, Thieving: 85 },
      quests: ["A Clockwork Syringe", "Gertrude's Cat"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Rabid Jack boss", "Completed Pirate series"],
  },

  // ── Cave Goblin / Dorgeshuun series ───────────────────────────────────────
  "The Lost Tribe": {
    series: "Cave Goblin",
    difficulty: "Intermediate",
    requirements: { skills: { Agility: 13, Mining: 17, Thieving: 13 }, quests: [], qp: 0 },
    rewards: { qp: 1 },
    unlocks: ["Dorgeshuun mine", "Bone crossbow"],
  },
  "Death to the Dorgeshuun": {
    series: "Cave Goblin",
    difficulty: "Intermediate",
    requirements: {
      skills: { Agility: 23, Thieving: 23 },
      quests: ["The Lost Tribe"],
      qp: 0,
    },
    rewards: { qp: 1 },
    unlocks: ["Light orb (Dungeon Agility)"],
  },
  "Another Slice of H.A.M.": {
    series: "Cave Goblin",
    difficulty: "Intermediate",
    requirements: {
      skills: { Attack: 15, Prayer: 25 },
      quests: ["The Lost Tribe", "Death to the Dorgeshuun", "Goblin Diplomacy", "The Giant Dwarf"],
      qp: 0,
    },
    rewards: { qp: 1 },
  },
  "Land of the Goblins": {
    series: "Cave Goblin",
    difficulty: "Experienced",
    requirements: {
      skills: { Agility: 36, Fishing: 36, Herblore: 37, Prayer: 30, Thieving: 36 },
      quests: ["Another Slice of H.A.M.", "Fishing Contest", "The Giant Dwarf"],
      qp: 0,
    },
    rewards: { qp: 1 },
  },
  "The Chosen Commander": {
    series: "Cave Goblin",
    difficulty: "Experienced",
    requirements: {
      skills: { Agility: 46, Strength: 46, Thieving: 46 },
      quests: ["Land of the Goblins", "Goblin Diplomacy", "The Giant Dwarf", "Fishing Contest"],
      qp: 0,
    },
    rewards: { qp: 3 },
    unlocks: ["Zanik companion", "Conclusion of Cave Goblin storyline"],
  },

  // ── Fairy series ─────────────────────────────────────────────────────────
  "Lost City": {
    series: "Fairy",
    difficulty: "Experienced",
    requirements: { skills: { Crafting: 31, Woodcutting: 36 }, quests: [], qp: 0 },
    rewards: { qp: 3 },
    unlocks: ["Dragon longsword", "Dragon dagger", "Zanaris"],
  },
  "A Fairy Tale I - Growing Pains": {
    series: "Fairy",
    difficulty: "Experienced",
    requirements: { skills: {}, quests: ["Lost City", "Nature Spirit"], qp: 0 },
    rewards: { qp: 2 },
    unlocks: ["Magic secateurs"],
  },
  "A Fairy Tale II - Cure a Queen": {
    series: "Fairy",
    difficulty: "Experienced",
    requirements: {
      skills: { Farming: 49, Herblore: 57, Thieving: 40 },
      quests: ["A Fairy Tale I - Growing Pains"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Fairy rings (partial)"],
  },
  "A Fairy Tale III - Battle at Ork's Rift": {
    series: "Fairy",
    difficulty: "Experienced",
    requirements: {
      skills: { Crafting: 36, Farming: 54, Thieving: 51 },
      quests: ["A Fairy Tale II - Cure a Queen"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Fairy rings (unrestricted)"],
  },

  // ── TzHaar series ─────────────────────────────────────────────────────────
  "TokTz-Ket-Dill": {
    series: "TzHaar",
    difficulty: "Experienced",
    requirements: {
      skills: { Construction: 50, Crafting: 43, Mining: 40, Strength: 45 },
      quests: [],
      qp: 0,
    },
    rewards: { qp: 1 },
    unlocks: ["TzHaar Fight Cave (improved rewards)"],
  },
  "The Elder Kiln": {
    series: "TzHaar",
    difficulty: "Master",
    requirements: {
      skills: { Agility: 60, Magic: 75, Mining: 40 },
      quests: ["TokTz-Ket-Dill"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["TzHaar Fight Kiln", "Tokkul-Zo ring"],
  },
  "The Brink of Extinction": {
    series: "TzHaar",
    difficulty: "Grandmaster",
    requirements: {
      skills: { Mining: 72, Smithing: 80 },
      quests: ["The Elder Kiln"],
      qp: 0,
    },
    rewards: { qp: 3 },
    unlocks: ["TokHaar-Kal-Mej cape", "Kiln conclusion"],
  },

  // ── Dwarf (Red Axe) series ─────────────────────────────────────────────────
  "Dwarf Cannon": {
    series: "Dwarf",
    difficulty: "Novice",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 1 },
    unlocks: ["Dwarf multicannon"],
  },
  "Fishing Contest": {
    difficulty: "Novice",
    requirements: { skills: { Fishing: 10 }, quests: [], qp: 0 },
    rewards: { qp: 1 },
    unlocks: ["White Wolf Mountain shortcut"],
  },
  "The Giant Dwarf": {
    series: "Dwarf",
    difficulty: "Intermediate",
    requirements: {
      skills: { Crafting: 12, Firemaking: 16, Magic: 33, Thieving: 14 },
      quests: [],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Keldagrim city", "Blast Furnace (with other quests)"],
  },
  "Forgettable Tale of a Drunken Dwarf": {
    series: "Dwarf",
    difficulty: "Intermediate",
    requirements: {
      skills: { Cooking: 22, Farming: 17 },
      quests: ["The Giant Dwarf", "Fishing Contest"],
      qp: 0,
    },
    rewards: { qp: 2 },
  },
  "Between a Rock...": {
    series: "Dwarf",
    difficulty: "Experienced",
    requirements: {
      skills: { Mining: 40, Smithing: 50 },
      quests: ["Dwarf Cannon", "Fishing Contest"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Agi-mine", "Dwarven helmet"],
  },
  "Forgiveness of a Chaos Dwarf": {
    series: "Dwarf",
    difficulty: "Master",
    requirements: {
      skills: { Firemaking: 61, Hunter: 61, Strength: 69 },
      quests: ["Forgettable Tale of a Drunken Dwarf", "Between a Rock...", "The Giant Dwarf", "Dwarf Cannon", "Fishing Contest"],
      qp: 0,
    },
    rewards: { qp: 2 },
  },
  "King of the Dwarves": {
    series: "Dwarf",
    difficulty: "Master",
    requirements: {
      skills: { Mining: 68, Smithing: 70, Strength: 77 },
      quests: ["Forgiveness of a Chaos Dwarf", "My Arm's Big Adventure"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Keldagrim expanded", "Royal crossbow (with Birthright)"],
  },
  "Birthright of the Dwarves": {
    series: "Dwarf",
    difficulty: "Grandmaster",
    requirements: {
      skills: { Mining: 80, Smithing: 82, Strength: 85 },
      quests: ["King of the Dwarves"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Royal crossbow upgrade", "Dwarf series conclusion"],
  },

  // ── Void Knight series ────────────────────────────────────────────────────
  "Sea Slug": {
    series: "Temple Knight",
    difficulty: "Intermediate",
    requirements: { skills: { Firemaking: 30 }, quests: [], qp: 0 },
    rewards: { qp: 1 },
  },
  "Wanted!": {
    series: "Temple Knight",
    difficulty: "Intermediate",
    requirements: { skills: {}, quests: ["Recruitment Drive"], qp: 0 },
    rewards: { qp: 1 },
    unlocks: ["White knight rank progression"],
  },
  "The Slug Menace": {
    series: "Temple Knight",
    difficulty: "Intermediate",
    requirements: {
      skills: { Crafting: 30, Herblore: 30, Runecrafting: 30, Thieving: 30 },
      quests: ["Sea Slug"],
      qp: 0,
    },
    rewards: { qp: 1 },
  },
  "Kennith's Concerns": {
    series: "Temple Knight",
    difficulty: "Intermediate",
    requirements: { skills: {}, quests: ["The Slug Menace"], qp: 0 },
    rewards: { qp: 1 },
  },
  "Salt in the Wound": {
    series: "Temple Knight",
    difficulty: "Intermediate",
    requirements: {
      skills: { Constitution: 50, Defence: 60, Dungeoneering: 35, Herblore: 47, Summoning: 45 },
      quests: ["Kennith's Concerns", "Wanted!"],
      qp: 0,
    },
    rewards: { qp: 2 },
  },
  "Quiet Before the Swarm": {
    series: "Void Knight",
    difficulty: "Intermediate",
    requirements: {
      skills: { Attack: 35, Strength: 42 },
      quests: ["Imp Catcher", "Wanted!"],
      qp: 0,
    },
    rewards: { qp: 1 },
    unlocks: ["Void Knight outpost"],
  },
  "A Void Dance": {
    series: "Void Knight",
    difficulty: "Experienced",
    requirements: {
      skills: {
        Construction: 47, Herblore: 49, Hunter: 46,
        Mining: 47, Summoning: 48, Thieving: 54, Woodcutting: 52,
      },
      quests: ["Quiet Before the Swarm"],
      qp: 0,
    },
    rewards: { qp: 1 },
  },
  "The Void Stares Back": {
    series: "Void Knight",
    difficulty: "Grandmaster",
    requirements: {
      skills: {
        Attack: 78, Construction: 70, Crafting: 70, Defence: 25,
        Firemaking: 71, Magic: 80, Smithing: 70, Strength: 78, Summoning: 55,
      },
      quests: ["Quiet Before the Swarm", "A Void Dance"],
      qp: 0,
    },
    rewards: { qp: 1 },
    unlocks: ["Elite Void Knight equipment"],
  },

  // ── Mahjarrat Mysteries / Desert series ───────────────────────────────────
  "Shield of Arrav": {
    series: "Mahjarrat Mysteries",
    difficulty: "Novice",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 1 },
  },
  "Hazeel Cult": {
    series: "Mahjarrat Mysteries",
    difficulty: "Novice",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 1 },
  },
  "The Knight's Sword": {
    difficulty: "Intermediate",
    requirements: { skills: { Mining: 10 }, quests: [], qp: 0 },
    rewards: { qp: 1 },
    unlocks: ["Smithing shortcut (fast Smithing XP)"],
  },
  "The Dig Site": {
    series: "Mahjarrat Mysteries",
    difficulty: "Intermediate",
    requirements: {
      skills: { Agility: 10, Herblore: 10, Thieving: 25 },
      quests: [],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Digsite pendant", "Specimen cleaning"],
  },
  "What Lies Below": {
    difficulty: "Intermediate",
    requirements: { skills: { Runecrafting: 35 }, quests: [], qp: 0 },
    rewards: { qp: 1 },
  },
  "Defender of Varrock": {
    series: "Mahjarrat Mysteries",
    difficulty: "Experienced",
    requirements: {
      skills: { Agility: 51, Hunter: 51, Mining: 59, Smithing: 54 },
      quests: ["Shield of Arrav", "The Knight's Sword", "Family Crest", "What Lies Below"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Armoured zombie slayer assignment"],
  },
  "Desert Treasure": {
    series: "Mahjarrat Mysteries",
    difficulty: "Master",
    requirements: {
      skills: { Firemaking: 50, Magic: 50, Slayer: 10, Thieving: 53 },
      quests: ["The Dig Site", "Priest in Peril"],
      qp: 100,
    },
    rewards: { qp: 3 },
    unlocks: ["Ancient Magicks spellbook"],
  },
  "The Temple at Senntisten": {
    series: "Mahjarrat Mysteries",
    difficulty: "Master",
    requirements: {
      skills: { Prayer: 50 },
      quests: ["Desert Treasure"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Ancient Curses prayer book", "Nex access (with 40 Zarosian kills)"],
  },
  "The Curse of Arrav": {
    series: "Mahjarrat Mysteries",
    difficulty: "Master",
    requirements: {
      skills: {
        Agility: 61, Mining: 64, Ranged: 64,
        Slayer: 37, Strength: 64, Summoning: 41, Thieving: 66,
      },
      quests: ["Defender of Varrock", "The Dig Site"],
      qp: 0,
    },
    rewards: { qp: 1 },
  },
  "While Guthix Sleeps": {
    series: "Mahjarrat Mysteries",
    difficulty: "Grandmaster",
    requirements: {
      skills: {
        Agility: 65, Construction: 65, Crafting: 65, Dungeoneering: 65,
        Farming: 65, Firemaking: 65, Hunter: 65, Magic: 65,
        Ranged: 65, Slayer: 65, Smithing: 65, Strength: 65, Thieving: 65,
      },
      quests: ["The Hunt for Surok (miniquest)", "Summer's End"],
      qp: 0,
    },
    rewards: { qp: 5 },
    unlocks: ["Turmoil prayer (95 Prayer)", "Grotworm Lair"],
  },
  "Ritual of the Mahjarrat": {
    series: "Mahjarrat Mysteries",
    difficulty: "Grandmaster",
    requirements: {
      skills: {
        Agility: 76, Construction: 77, Crafting: 77,
        Mining: 76, Slayer: 77, Smithing: 77,
      },
      quests: ["While Guthix Sleeps", "The Temple at Senntisten"],
      qp: 0,
    },
    rewards: { qp: 3 },
    unlocks: ["Glacors (80 Magic)", "Armadyl battlestaff"],
  },

  // ── Sliske's Game / WGS series ────────────────────────────────────────────
  "Fate of the Gods": {
    series: "Sliske's Game",
    difficulty: "Grandmaster",
    requirements: {
      skills: { Divination: 60, Runecrafting: 60, Slayer: 60, Summoning: 60 },
      quests: ["Missing, Presumed Death"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Freneskae", "Seren prayers", "Telos prereqs"],
  },
  "Children of Mah": {
    series: "Sliske's Game",
    difficulty: "Grandmaster",
    requirements: {
      skills: { Divination: 75, Magic: 75, Prayer: 77 },
      quests: ["Fate of the Gods", "Ritual of the Mahjarrat"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Ancient Curses upgrade (Malevolence/Desolation/Affliction)"],
  },
  "The World Wakes": {
    series: "Sliske's Game",
    difficulty: "Grandmaster",
    requirements: {
      skills: {},
      quests: ["While Guthix Sleeps", "Ritual of the Mahjarrat", "The Void Stares Back", "Salt in the Wound"],
      qp: 0,
    },
    rewards: { qp: 3 },
    unlocks: ["God emissaries", "Mahjarrat aura", "Memorial to Guthix"],
  },

  // ── Summer / Spirit series ────────────────────────────────────────────────
  "Spirit of Summer": {
    series: "Summer",
    difficulty: "Intermediate",
    requirements: {
      skills: { Construction: 40, Farming: 26, Prayer: 35, Summoning: 19 },
      quests: ["The Restless Ghost"],
      qp: 0,
    },
    rewards: { qp: 1 },
  },
  "Summer's End": {
    series: "Summer",
    difficulty: "Experienced",
    requirements: {
      skills: {
        Firemaking: 47, Hunter: 35, Mining: 45,
        Prayer: 55, Summoning: 23, Woodcutting: 37,
      },
      quests: ["Spirit of Summer"],
      qp: 0,
    },
    rewards: { qp: 1 },
  },

  // ── Camelot / Holy Grail series ───────────────────────────────────────────
  "Merlin's Crystal": {
    series: "Camelot",
    difficulty: "Intermediate",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 6 },
    unlocks: ["Camelot teleport", "Excalibur"],
  },
  "Holy Grail": {
    series: "Camelot",
    difficulty: "Intermediate",
    requirements: {
      skills: { Prayer: 20 },
      quests: ["Merlin's Crystal"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Fisher Realm access"],
  },
  "King's Ransom": {
    series: "Camelot",
    difficulty: "Experienced",
    requirements: {
      skills: {},
      quests: ["Holy Grail", "Merlin's Crystal", "Murder Mystery", "One Small Favour"],
      qp: 0,
    },
    rewards: { qp: 1 },
    unlocks: ["Knight training (Piety/Curses upgrade)"],
  },

  // ── Enchanted Key / Making History ────────────────────────────────────────
  "Making History": {
    series: "Enchanted Key",
    difficulty: "Intermediate",
    requirements: { skills: {}, quests: ["Priest in Peril", "The Restless Ghost"], qp: 0 },
    rewards: { qp: 3 },
  },

  // ── Desert / Icthlarin ────────────────────────────────────────────────────
  "Icthlarin's Little Helper": {
    series: "Desert",
    difficulty: "Intermediate",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 2 },
    unlocks: ["Sophanem", "Canopic jar"],
  },
  "Smoking Kills": {
    series: "Desert",
    difficulty: "Intermediate",
    requirements: { skills: { Slayer: 35 }, quests: [], qp: 0 },
    rewards: { qp: 1 },
    unlocks: ["Full Slayer Helmet", "Slayer reward shop"],
  },

  // ── Penguin series ────────────────────────────────────────────────────────
  "Cold War": {
    series: "Penguin",
    difficulty: "Intermediate",
    requirements: {
      skills: { Agility: 30, Construction: 34, Crafting: 30, Hunter: 10, Thieving: 15 },
      quests: [],
      qp: 0,
    },
    rewards: { qp: 1 },
    unlocks: ["Penguin Hide and Seek D&D"],
  },

  // ── Creature of Fenkenstrain ──────────────────────────────────────────────
  "Creature of Fenkenstrain": {
    difficulty: "Intermediate",
    requirements: {
      skills: { Crafting: 20, Thieving: 25 },
      quests: ["The Restless Ghost"],
      qp: 0,
    },
    rewards: { qp: 2 },
    unlocks: ["Fenkenstrain's Castle"],
  },

  // ── Misc important standalone ─────────────────────────────────────────────
  "Gertrude's Cat": {
    difficulty: "Novice",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 1 },
    unlocks: ["Cats as familiars/merchant"],
  },
  "Murder Mystery": {
    difficulty: "Novice",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 3 },
  },
  "Shades of Mort'ton": {
    difficulty: "Intermediate",
    requirements: {
      skills: { Crafting: 20, Firemaking: 5, Herblore: 15 },
      quests: [],
      qp: 0,
    },
    rewards: { qp: 3 },
    unlocks: ["Shades of Mort'ton minigame", "Flamtaer bag"],
  },
  "Fight Arena": {
    series: "Mahjarrat Mysteries",
    difficulty: "Experienced",
    requirements: { skills: {}, quests: [], qp: 0 },
    rewards: { qp: 2 },
  },
  "Temple of Ikov": {
    series: "Mahjarrat Mysteries",
    difficulty: "Experienced",
    requirements: { skills: { Ranged: 40, Thieving: 42 }, quests: [], qp: 0 },
    rewards: { qp: 1 },
    unlocks: ["Staff of Iban"],
  },
  "All Fired Up": {
    difficulty: "Intermediate",
    requirements: {
      skills: { Firemaking: 43 },
      quests: [],
      qp: 0,
    },
    rewards: { qp: 1 },
    unlocks: ["Beacons (Firemaking XP)"],
  },
};

export const QUEST_NAMES = Object.keys(QUESTS).sort();
export const DIFFICULTIES = ["Novice", "Intermediate", "Experienced", "Master", "Grandmaster"];

export const DIFF_COLOUR = {
  Novice:       '#5a9a50',
  Intermediate: '#4a88b8',
  Experienced:  '#c8a84b',
  Master:       '#c85a2a',
  Grandmaster:  '#9648b8',
};
