# Role and Objective
You are an expert game developer and procedural generation specialist. 
Your objective is to enhance the map generation system of our existing Dungeon Crawler game (located in `index.html`).

# Context
We currently have a basic "Room and Corridor" procedural generation system and a static Merchant Camp. We want to implement the new map types and algorithms proposed in our map design document to increase variety, challenge, and replayability for the player.

# Instructions
1. **Review the Design Document:** Read the attached `Design.md` content below to understand the current map generation system (tiles, spawning rates, FOV) and the new proposed map types (Boss Arenas, Organic Caverns, The Labyrinth, Open Ruins, The Gauntlet).
2. **Analyze the Code:** Review the provided `index.html` file, specifically focusing on the `generateLevel`, `generateDungeon`, and `generateCamp` methods.
3. **Implement New Generators:** Write the logic to implement at least **TWO** of the new proposed map types from the design document into the game's codebase. For example, add a `generateCaverns()` and a `generateBossArena()` method.
4. **Integrate into the Loop:** Update the `generateLevel()` method to seamlessly integrate your new map types into the depth progression loop (e.g., Boss Arenas every 10th depth, or a 30% chance to use the Cellular Automata generator on standard depths).
5. **Ensure Compatibility:** Ensure that existing systems like A* pathfinding, Field of View (FOV), Fog of War, and entity spawning logic remain fully functional and compatible with your newly generated map layouts.

---

# Attached: Design.md

```markdown
# Archon's Descent - Map Design Document

## Overview
The maps in **Archon's Descent** are procedurally generated on a 60x60 grid. The game alternates between hostile dungeon labyrinths and safe merchant camps to provide pacing and respite.

## Level Types

### 1. Dungeon Levels
Hostile floors generated using a "Room and Corridor" algorithm. These levels are populated with enemies, interactive objects, and hazards.
- **Frequency**: Standard levels (e.g., Depths 1-3, 5-7).
- **Goal**: Find the stairs to descend while managing health, mana, and resources.

### 2. Merchant Camps
Safe zones that offer a reprieve from combat, allowing the player to spend gold at a merchant shrine.
- **Frequency**: Every 4th depth (Depth 4, 8, 12, etc.).
- **Layout**: A fixed 9x9 room centered on the map. Contains the player spawn, a merchant shrine, and the exit stairs.

## Biomes
The visual aesthetic (biome) of the dungeon changes as the player descends to deeper levels:
- **Depths 1 - 4**: Catacombs
- **Depths 5 - 8**: Forges
- **Depths 9+**: Void

---

## Tile System
The map grid is represented by a 2D integer array (`this.map`), where each value corresponds to a specific tile type and its properties:

| ID | Tile Type | Properties |
|:---|:---|:---|
| `0` | **Wall / Void** | Impassable terrain. Blocks line of sight and movement. |
| `1` | **Floor** | Walkable terrain used for rooms and corridors. |
| `3` | **Stairs** | The exit point leading to the next depth. |
| `4` | **Destructible Crate**| An obstacle with 1 HP. Blocks movement and line of sight until destroyed. |
| `5` | **Spikes (Trap)** | Hazard tile. Deals damage to the player if stepped on. |

*(Note: Entities like players, enemies, and chests are stored in separate arrays rather than the map array itself.)*

---

## Generation Algorithm

The primary dungeon generator uses a **Room & Corridor** approach:

1. **Room Initialization**: 
   - The algorithm attempts to place up to 18 rectangular rooms.
   - Room widths and heights range randomly from 5 to 11 tiles.
2. **Collision Detection**: 
   - Before placing a room, the algorithm checks for overlaps with previously placed rooms. Overlapping rooms are discarded.
3. **Corridor Carving**: 
   - As each valid room is added, an L-shaped corridor is carved from the center of the previous room to the center of the new room, ensuring the entire dungeon is connected.
4. **Stairs Placement**: 
   - The player spawns in the center of the very first generated room.
   - The exit stairs are placed in the center of the very last generated room.

### Entity & Object Spawning
Once the layout is carved, the algorithm populates the rooms (excluding the starting room and sometimes the final room):

- **Torches**: A torch is spawned just above the top-left corner of each room to provide ambient light.
- **Enemies**: 0 to 2 enemies spawn randomly per room (increases by 1 if Depth > 5).
- **Destructibles**: 50% chance to spawn a destructible crate in the room.
- **Traps**: 30% chance to spawn floor spikes.
- **Chests**: 30% chance to spawn a treasure chest.
- **Shrines**: If the level has more than 2 rooms, a single Shrine (Blood or Purify) is randomly placed in one of the intermediate rooms.

---

## Technical Details

- **Grid Dimensions**: `this.mapWidth = 60`, `this.mapHeight = 60`
- **Pathfinding**: Enemies utilize A* (A-Star) pathfinding on this grid to navigate around walls and crates towards the player.
- **Field of View (FOV)**: A raycasting system calculates line of sight from the player. Tiles `0` (Walls) and `4` (Crates) block visibility.
- **Fog of War**: Discovered tiles that are currently outside of the FOV remain visible but darkened, using a separate `this.fog` 2D array.

---

## Proposed New Map Types & Algorithms
To increase replayability and variety, the following map types and generation algorithms could be implemented in future updates:

### 1. Boss Arenas
- **Concept**: A large, fixed-shape map (e.g., circular or octagonal) designed specifically for epic boss encounters.
- **Frequency**: Every 10th depth (e.g., Depth 10, 20).
- **Features**: Contains environmental hazards specific to the boss mechanics (e.g., lava pits, pillar cover). No standard enemies or chests.

### 2. Organic Caverns (Cellular Automata)
- **Concept**: Instead of rigid rectangular rooms, these maps feel like natural, winding caves.
- **Generation**: Created using Cellular Automata (the "Game of Life" ruleset) where a grid is randomized and then smoothed out over several iterations to create organic open spaces and walls.
- **Best For**: Beast-themed or subterranean biomes where tight corridors naturally open into sprawling caverns.

### 3. The Labyrinth (Recursive Backtracker)
- **Concept**: A maze-like level with tight, twisting 1-tile wide corridors and very few open rooms.
- **Generation**: A randomized depth-first search (Recursive Backtracker) carves a perfect maze. Dead ends are then populated with high-tier loot or elite enemies.
- **Best For**: High-tension, low-visibility maps where the player must carefully navigate corners and manage crowd control.

### 4. Open Ruins (BSP Trees or Prefab Scatter)
- **Concept**: An outdoor or "ruined city" feel, characterized by a large open space with scattered small buildings or rubble.
- **Generation**: Starts with an open map (all `1`s) and scatters premade structures (prefabs) or uses Binary Space Partitioning (BSP) to divide the area into uneven, ruined city blocks.
- **Best For**: Later depths where ranged combat and large-scale AoE spells become critical.

### 5. The Gauntlet
- **Concept**: A completely linear hallway or sequence of small rooms with no branching paths.
- **Generation**: A simple straight or zig-zagging corridor from one end of the map to the other.
- **Features**: High enemy density and frequent traps. Tests the player's endurance and raw combat power rather than exploration.
```
