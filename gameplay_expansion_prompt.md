Act as an expert game developer and JavaScript engineer. I have a 2D HTML5 Canvas roguelike game called "Archon's Descent" built in a single `index.html` file. It currently features a dungeon generation engine, basic A* pathfinding, an inventory system with rarities, and a talent system. I want to massively expand the game into a deep, highly replayable experience.

Please read the current `index.html` codebase and implement the following 10 gameplay pillars. Ensure all new mechanics integrate seamlessly with the existing `DungeonEngine`, `AStar` pathfinding, and UI, while maintaining clean and modular code:

### 1. Advanced Enemy Behaviors & Encounters
*   **Ranged & Tactical AI:** Add enemies (Archers/Mages) that maintain distance and shoot projectiles, and cowardly enemies that flee when low on health.
*   **Elites & Affixes:** Introduce rare champion enemies with increased stats and random modifiers (e.g., "Vampiric" heals on hit, "Armored" resists physical damage, "Swift" gets extra turns).
*   **Epic Boss Fights:** Add a sprawling Boss Room every 5 floors. Bosses should have phases and unique mechanics (like charging, area-of-effect telegraphs, or summoning minions) and drop guaranteed legendary loot.

### 2. Environmental Depth & Biomes
*   **Interactive Hazards:** Implement floor spikes that toggle on a timer, locked doors requiring hidden keys, and explosive barrels that detonate in a 3x3 radius when hit.
*   **Dynamic Biomes:** Every 5 floors, change the dungeon theme (e.g., from "Crypt" to "Lava Caves" or "Overgrown Ruins"). Change the tileset colors and introduce biome-specific hazards (like damaging lava pools or slowing webs).

### 3. Deep Combat Mechanics
*   **Status Effects:** Introduce elemental ailments: **Poison** (damage over time), **Chill** (reduced movement speed), **Burn** (spreads to adjacent entities), and **Stun** (skips turn).
*   **Active Skills & Cooldowns:** Give the player equipable or innate active abilities (e.g., "Dash" to escape, "Cleave" to hit all surrounding tiles, "Heal" on a long cooldown).
*   **Stealth & Vision:** Implement a line-of-sight/fog-of-war system. Allow enemies to "sleep" or patrol until they spot the player. If the player attacks an unaware enemy, it guarantees a critical "Sneak Attack".

### 4. Loot Synergies & Risk/Reward
*   **Interactable Shrines:** Altars that force difficult choices (e.g., Blood Shrine: sacrifice 30% max health for a permanent +2 damage buff; Haste Shrine: gain double speed for 50 turns but take 50% more damage).
*   **Crafting & Enchanting:** Add an Anvil/Forge node in the dungeon where players can combine three items of the same rarity to upgrade them to the next tier, or apply elemental enchantments to their weapons.

### 5. A Living World & Progression
*   **NPCs & Merchants:** Randomly spawn neutral/friendly NPCs. Some might sell items for a gold currency dropped by enemies, while others might be trapped and offer a reward if rescued.
*   **Metaprogression & Classes:** Introduce a persistent currency (e.g., "Archon Souls") kept upon death. Create a main menu Hub where players can spend souls to permanently upgrade base stats or unlock new starting classes (e.g., Rogue, Wizard, Berserker), each starting with unique passive traits and starting gear.
