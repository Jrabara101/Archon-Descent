**System & Role:**
Act as an expert Game Developer and UI/UX Designer. I want to execute a massive, full-scale overhaul of my dungeon crawler, *Archon's Descent*, in my `index.html` file. Your goal is to combine premium visual aesthetics with deep, engaging RPG mechanics, ensuring the final result feels like a highly polished, modern indie roguelike. Please update the CSS, HTML, and JavaScript without breaking any of the existing core features.

**Please implement the following comprehensive upgrades:**

**1. Premium UI & Glassmorphism Aesthetics (CSS/HTML):**
*   **Visual Overhaul:** Upgrade the dashboard, quick belt, and overlays using advanced glassmorphism (deep blurs, subtle noise textures, multi-layered semi-transparent backgrounds). 
*   **Cyber-Fantasy Palette:** Use a curated, harmonious dark mode (deep space navy) with vibrant neon accents (cyan, electric purple, emerald green) for rarities and vital stats. Ensure glowing text-shadows for headers using the `Press Start 2P` font.
*   **Micro-Animations:** Implement continuous pulsating animations for HP/MP bars when low, smooth hover effects (scale up, increased glow, Y-axis translation) on inventory slots and buttons, and a slow-rotating ambient background glow.
*   **Holographic UI Overlays:** Redesign the 'Level Up' and 'Class Selection' screens to look like high-tech holographic projections that fade and slide in smoothly.

**2. Dynamic Canvas & Rendering Polish (JavaScript):**
*   **Combat Feedback:** Implement floating damage numbers when enemies are hit (color-coded for player damage, crits, and enemy damage). 
*   **Juice & Polish:** Add screen-shake effects on critical strikes or heavy damage, and create particle effects for spells (e.g., sparks for Warrior strikes, trails for Mage fireballs, shadow blurs for Rogue dashes).
*   **Camera Tracking:** Ensure the canvas camera tracks the player with smooth interpolation (easing) rather than rigid locking, giving a more cinematic feel.

**3. Advanced Gameplay Mechanics (JavaScript):**
*   **Deeper RPG Combat:** Add critical hit chances, dodge mechanics, and elemental status effects (e.g., Fire burns over time, Frost slows movement speed).
*   **Complex Enemy AI:** Upgrade enemy behaviors beyond simple pathfinding. Introduce ranged attackers that kite the player, tank enemies that protect others, and elite enemies with telegraphed AoE (Area of Effect) attacks that the player must dodge.
*   **Interactive Environment:** Add destructible environmental objects (like crates) that drop minor loot, spike traps that trigger on a timer, and healing shrines that cost gold.
*   **Synergistic Talents:** Expand the talent draft pool so choices can synergize deeply (e.g., combining a "low health attack speed buff" with "lifesteal on critical hits").

**Constraints & Output:**
*   Output the complete, updated code ensuring all existing `id` and `data-` attributes remain intact so the game logic seamlessly bridges with the new UI.
*   Ensure the layout remains fully responsive for smaller screens.
