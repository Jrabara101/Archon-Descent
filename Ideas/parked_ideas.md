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
- **Achievements** — 18 milestones spanning depth, combat, collection, economy, and special runs
- **Boss Rush** — sequential 3-boss gauntlet, unlocked after your first guardian kill
- **Endless Mode** — wave-survival arena with a persistent best-wave high score
- **3 new classes** — Paladin (tank/healer), Necromancer (summon + drain), Ranger (piercing shot + snare trap)
- **Companions** — purchasable Spirit Wolf pet (persists across floors) + temporary rescued allies (40-turn floor-scoped)

---

## Parked — Build Depth

- **3rd "ultimate" ability slot** — a long-cooldown ultimate unlocked around character level 10, distinct per class (e.g. Warrior: brief invulnerability + AoE slam; Mage: meteor strike; Rogue: chain-teleport execute). Would need a UI slot added to the belt and a cooldown tracker per class.
- **Curse altars** — optional shrines that apply a voluntary debuff (e.g. -20% max HP) in exchange for a guaranteed legendary drop or a relic reroll. Distinct from the existing Blood Shrine (which is a flat stat trade, not a loot-gated risk/reward).
- **Post-clear Ascension/NG+ loop** — after a full clear, offer "descend again, but harder" instead of a hard stop — keep current gear, scale enemy difficulty up. Complements the existing meta-progression (Archon Souls/Hub) rather than replacing it.

## Parked — World & Narrative

- **NPC dialogue barks** — 2–3 line personality lines for captive NPCs and the merchant shrine on rescue/purchase, instead of silent interaction.
- **Branching floor-choice screen** — between some depths, present 2–3 route icons (e.g. "Treasure Vault — high risk," "Shrine Path — safe," "Shortcut — skip a floor") before generating the next level.
- **Evolving Archon Hub visuals** — have the Hub's lighting/decor/banner count grow as the player sinks more Souls into it, so meta-progression is *seen*, not just read as numbers.

## Parked — Encounters

- **Ambush spawns** — enemies that phase in behind the player after they cross a trigger tile, instead of only appearing pre-placed in rooms.
- **Trapper enemies** — a caster type that plants a temporary hazard tile (reusing the spike-trap system) instead of attacking directly.
- **Champion mini-boss rooms** — a single tougher elite in a small dedicated arena room between the main biome bosses, for mid-run pacing.
- **Horde/survival rooms** — an optional room that locks the doors and spawns waves for N turns before granting bonus loot. *Note: Endless Mode already covers similar ground — if we build this, differentiate it as a single-room detour rather than a whole game mode.*

## Parked — Quality of Life

- **Mid-run autosave/resume** — currently only meta-progression survives a closed tab; serializing full run state (depth, map, entities, inventory) to `localStorage` would let a run survive a browser close.
- **Gamepad support** — map the existing keyboard/touch action set to the Gamepad API.
- **UI scale slider** — a CSS-variable-driven scale option for the HUD, for very large/small screens.

## Parked — Replayability

- **Opt-in challenge mutator cards** — modifiers offered at the start of a normal run (e.g. "no potions, +30% loot") for players who want to spice up a familiar build without going all the way to Boss Rush/Endless. *Note: some overlap with a future Ascension-tier system above — worth designing together if both get picked up.*

## Parked — Sharing & Persistence

- **Build-card image export** — render a shareable canvas image (class, depth reached, gear, relics, run time) as a downloadable PNG at run end.
- **JSON save export/import** — download `archonDescent_meta` as a JSON file and re-import it, so progress isn't locked to one browser profile.

## Parked — Economy

- **Bounty/contract board** — an optional per-floor objective (e.g. "kill the elite without taking damage") posted near a room entrance, paying bonus gold or a guaranteed loot roll.
- **Hand-authored named uniques** — a small set of legendary items with fixed lore text and a signature non-procedural effect, distinct from the existing prefix/suffix roll system.

## Parked — Environment

- **Unstable/shifting hazard floors** — lava/web/spike tiles that periodically shift position over time instead of staying static.
- **Secret rooms behind cracked walls** — destructible-looking wall tiles (reusing the crate-HP logic) that reveal a small bonus loot alcove.

## Parked — Long-Term Goals

- **Archon Trials** — fixed-modifier challenge dungeons (short, hand-tuned, non-random) offering cosmetic-only rewards, for testing build mastery without touching the main progression economy.

---

*Source: distilled from `next_horizon_ideas.md` after implementing its "top 5 + quick wins" shortlist, replayability modes, new classes, and companions.*
