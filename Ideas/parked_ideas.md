# Archon's Descent — Parked Ideas (Backlog)

This doc tracks where `next_horizon_ideas.md` stands: what's already shipped, and what's deliberately parked for a future session. Read this before proposing "new" ideas so we don't re-suggest something already built or already on the list.

---

## Shipped (this build cycle)

- **Relics/Boons** — 12 passive run-altering relics, dropped by bosses/elites/mimics/shrines
- **Settings + Pause menu** — SFX/music volume, screen-shake intensity, colorblind-safe rarity palette, full pause overlay
- **Bestiary/Codex** — 14 enemies with lore, unlocked on first kill, plus 12 recoverable lore scraps
- **Daily Challenge + Run History** — seeded deterministic daily dungeon with a personal-best tracker, persistent run log
- **Adaptive music** — synthesized per-biome ambient layer with a combat-intensity pulse
- **Quick wins** — gambling shrine, wishing well, mimic chests, darkness floors, live run timer
- **Achievements** — 20 milestones spanning depth, combat, collection, economy, and special runs
- **Boss Rush** — sequential 3-boss gauntlet, unlocked after your first guardian kill, now with a post-clear **Ascension loop** (see below)
- **Endless Mode** — wave-survival arena with a persistent best-wave high score
- **3 new classes** — Paladin (tank/healer), Necromancer (summon + drain), Ranger (piercing shot + snare trap)
- **Companions** — purchasable Spirit Wolf pet (persists across floors) + temporary rescued allies (40-turn floor-scoped)
- **Ambush spawns** — some rooms hide their enemies until the player reaches the room's center
- **Trapper enemies (Hex Weaver)** — a caster variant that plants hex traps instead of attacking directly
- **Champion mini-boss rooms** — a single heavily-buffed elite (2.5x HP, 1.5x ATK, guaranteed 2 affixes) guarding bonus loot in its own room
- **Unstable hazard floors** — an occasional floor modifier where one hazard tile relocates every 8-14 turns
- **Secret walls** — destructible wall tiles indistinguishable from normal walls until bumped, revealing a rare+ item cache
- **Ultimate ability slot** — a level-10 unlock, 20-turn-cooldown 3rd ability per class (Warrior: Titan's Wrath AoE slam; Mage: Meteor Storm; Rogue: Death Mark execute-teleport; Paladin: Divine Judgment; Necromancer: Army of the Dead; Ranger: Rain of Arrows)
- **Curse Altars** — a 7th shrine type: lose 20% max HP for a guaranteed legendary drop plus a relic roll
- **Ascension loop** — clearing Boss Rush offers "Ascend & Continue," scaling bosses up (HP/ATK/XP) each tier with an `Ascendant` achievement at tier 3
- **NPC dialogue barks** — flavor lines for rescued captives (4 named NPCs) and the shop merchant (4 lines), shown as lore toasts
- **Branching floor-choice screen** — every 3rd non-boss, non-daily/trial floor offers Treasure Vault / Shrine Path / Shortcut before generating the next level
- **Evolving Archon Hub visuals** — hub glow/title tier and banner count scale with total meta-upgrade rank
- **Horde/survival rooms** — a rare (~8%/floor) locked-room 3-wave gauntlet with a breather between waves, rewarding a bonus chest + gold
- **Mid-run autosave/resume** — full run state (map, entities, inventory, talents, relics, allies, active modifiers) persists to `localStorage` every turn and offers a Resume button on the start screen; excluded for Boss Rush/Endless/Trials by design
- **Gamepad support** — Gamepad API polling for D-pad/stick movement, face-button abilities/potions, RB for ultimate, Start to pause
- **UI scale slider** — 70%-130% CSS-variable-driven HUD scale in Settings
- **Opt-in challenge mutator cards** — 5 stackable modifiers (Iron Will, Swarm, Glass Cannon Run, Nightmare, Bloodlust) selectable before a normal descent, with scaled soul rewards and a `Masochist` achievement for 3+
- **Build-card image export** — downloadable PNG run-summary card (class, depth, gear, relics, time) from the death and Boss Rush victory screens
- **JSON save export/import** — download/re-upload `archonDescent_meta` + settings as a portable JSON file
- **Bounty/contract board** — per-floor optional objective (Abstinence, Swift Descent, Bloodwork) posted on ~40% of hostile floors, paying gold + XP on success
- **Hand-authored named uniques** — 5 fixed-lore legendaries (Voidfang, Aegis Eternal, Cinderheart, Wanderer's Cloak, Soulbound Ring) with signature non-procedural effects, a 20% substitution chance on legendary drops
- **Archon Trials** — 3 fixed-seed, fixed-modifier challenge dungeons (Trial of Steel/Flame/Shadow) with cosmetic-only titles and a `Trial Master` achievement

---

*Source: distilled from `next_horizon_ideas.md`. All items from the original shortlist, the Encounters & Environment cluster, and the full remaining backlog (Build Depth, World & Narrative, Encounters, Quality of Life, Replayability, Sharing & Persistence, Economy, Long-Term Goals) have shipped. Nothing remains parked — see `next_horizon_ideas.md` for the historical proposal doc, or start a fresh brainstorm for new ideas.*
