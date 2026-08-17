# Changelog

All notable changes to Archon's Descent are documented in this file.

## [1.2.2] - 2026-08-13

### Added

- **Procedural pixel-art player sprite**: replaced the flat two-circle player render with a small blocky humanoid (helmet, torso, legs) drawn pixel-by-pixel on an offscreen canvas — no image assets, matching the game's fully Canvas-drawn art style. Has a 2-frame walk cycle and turns to face up/down/left/right based on the player's last movement direction, with the far side/back shaded darker so facing reads at a glance. Recolors automatically per class (and per the existing class-mastery color unlock) since it's keyed off the same `getPlayerRenderColor()` used everywhere else. The build-card export and minimap were left as-is (neither draws a full player circle to begin with).

## [1.2.0] - 2026-08-13

### Added

Implemented the remainder of `Ideas/next_horizon_ideas_2.md` (§2–§8, §10) in one batched pass, deliberately excluding §1 (a 4th biome+boss), which the doc itself scopes as a large, standalone-session lift.

**§2 Map Generation Variety**
- **One-way chasms**: an occasional floor tile in a side room that drops the player straight to the next floor on contact — no route choice, a pure commitment mechanic.
- **Linear gauntlet floors**: a rare no-branching floor variant — a straight chain of rooms with escalating enemy counts, ending at the stairs. Labeled "· GAUNTLET" on the depth HUD.
- **Symmetric mirror vault rooms**: a rare pair of locked chambers mirrored left/right off a host room; a floor switch in one chamber unlocks the other's door.

**§3 Class-Exclusive Content**
- **Class-exclusive walls**: a rare dead-end wall every class can break through, with unique flavor text per class (Warrior bashes it, Rogue picks it, Necromancer dissolves it, etc.).
- **Class-flavored NPC dialogue**: each of the 4 rescuable captives now has a unique reaction line per class instead of one generic bark.
- **Class mastery track**: 500 lifetime kills on a class unlocks an alternate VFX color for that class's sprite and build-card border.

**§4 Talent Tree Branching**
- **6 class-flavored talents**, one per class, mixed into the shared draft pool only for the matching class (Shield Wall, Arcane Overload, Shadow Step, Sacred Vigor, Death's Due, Piercing Focus).
- **Talent synergy tags**: existing talents that combo with specific relics now show a tooltip flavor line in the draft UI.

**§5 Boss Fight Depth**
- **Ascension-tier 3rd phase**: at Ascension tier 2+, bosses gain a new "Ring Burst" attack pattern below 25% HP instead of just scaling numbers further.
- **Boss-specific arena hazards**: a boss's full AoE slam now cracks the arena floor into a lingering biome-themed hazard (lava/web/spikes), making the arena part of the fight.

**§6 Elite/Affix Expansion**
- **3 new elite affixes**: Volatile (bursts into a hazard tile on death), Warded (periodic shield that absorbs one hit), Frenzied (gains a second action once combat runs long).
- **Affix-aware Champion Rooms**: a Champion's specific affix pair is now telegraphed via a toast the moment it comes into view, before the player commits to the fight.

**§7 Long-Session Fatigue Fixes**
- **"What's New" badge**: appears on the main menu after an update, opening a short changelog summary; clears once viewed.
- **Loadout presets**: save the current run's talents/relics as a preference for that class from the pause menu, softly biasing (not forcing) future talent draws toward the same playstyle.
- **Run summary diff**: the death screen now shows a delta against the player's personal-best depth for that class ("+3 floors vs. your best!").

**§8 New Player Onboarding**
- **Class recommendation quiz**: an optional 2-question quiz on the class-select screen suggests a starting class.
- **Guided first-floor tips**: one-time contextual toasts the first time the player encounters a Merchant Camp, the Anvil, a chest, or an elite enemy.

**§10 Genre-Inspired**
- **Relic-pair synergy toasts**: 4 intentional relic pairs (e.g. Loaded Dice + Momentum Engine) now surface a one-time combo toast the first time both are active in a run.
- **Elite Gauntlet route**: a 4th, high-risk branch-choice option guaranteeing a Champion fight and a relic reward.
- **Unidentified relics**: a rare "cursed-looking" relic variant stays hidden (❓) until picked up, reintroducing classic-roguelike identify-by-use tension.
- **Power-state visual tell**: at 6+ active relics, the player sprite gains a layered aura so a screenshot alone communicates a loaded build.
- **Death as a story beat**: the death screen now references repeat losses to the same attacker, deepening across deaths rather than just resetting.

### Notes

Safe-shop-floor (§10, "From Slay the Spire") required no code change — Merchant Camp floors already place zero enemies by construction. §1 (4th biome+boss) remains the only unbuilt item from `next_horizon_ideas_2.md`.

## [1.2.1] - 2026-08-13

### Added

Closed the two gaps identified after the 1.2.0 pass: one item from §10 that was skipped outright, and one from §2 that was substituted with a smaller mechanic rather than built as specified.

- **§10 Dead Cells weapon-feel audit**: confirmed procedural gear was stats-only (no behavior hooks beyond `statBonus`). Added `WEAPON_TRAITS` — a rare+ weapon suffix roll ("of Cleaving" / "of Ricochet") that changes attack *behavior*: Cleave also strikes every enemy adjacent to the primary target, Ricochet has a 40% chance to chain the hit to a second nearby enemy. Both show in a new hover-tooltip on inventory/equipment slots (previously icon-only, no tooltip existed).
- **§10 Dead Cells soft anti-hoarding nudge**: a new Forge Shrine (rare shrine type) offers a strong temporary weapon with a weapon trait attached; accepting it swaps out the current weapon (returned to inventory, not destroyed) and grants +20% damage dealt for the rest of the run — a deliberate nudge to test a new weapon rather than sit on a favorite.
- **§2 true vertical shafts**: previously only shipped as one-way chasms (commit-forward to the next floor). Added a genuine round-trip shaft — a ladder tucked into a normal room drops the player into a small, isolated lower chamber carved elsewhere on the same floor grid (with its own reward), and a second ladder there returns to the exact spot they left. Distinct from the chasm: it stays within the current floor rather than advancing depth.

## [1.1.0] - 2026-08-13

### Added — Story Mode

Completed the Story Mode feature proposed in `Ideas/next_horizon_ideas_2.md` §9. Story Mode is an opt-in toggle (Settings → 📖 Story Mode, off by default) that sequences the game's existing lore systems into a connected narrative — no new mechanics, art, or enemies, just writing and sequencing over what already existed.

- **Depth-gated story beats**: five narrative toasts fire once each at Depth 1, 5, 10, 15, and 20 during a normal descent, delivered through the existing lore-toast UI.
- **Boss fights reframed as Act breaks**: the three biome guardians (Bone Colossus, Molten Behemoth, Void Archon Prime) now deliver a pre-fight toast (who/what they were before the Descent corrupted them) and a post-fight toast (what their death reveals about the Archon) the first time each is encountered and defeated.
- **Chaptered lore scraps**: the 12 collectible lore scraps are now organized into 4 numbered chapters of 3 ("The Descent Begins," "What the Forges Called," "Into the Void," "The Last Entries"), shown as "Chapter, page N of 3" when picked up in Story Mode and always visible in the Bestiary's lore log.
- **NPC plot threads**: each of the 4 rescuable captives (Bram, Sera, Old Kettle, Wisp) now delivers one extra story line — instead of their generic bark — the first time they're recruited after the player reaches Act II (Forges) and Act III (Void).
- **A real ending**: killing the Void Archon Prime for the first time in Story Mode now triggers a one-time epilogue screen with closing narration, a bonus Archon Souls reward, and a build-card export option — the run continues afterward rather than hard-stopping.

### Notes

This is the first tracked version. Everything shipped before this point — the full `next_horizon_ideas.md` backlog (see `Ideas/parked_ideas.md`) — predates changelog tracking and is not itemized retroactively. Story Mode (§9) is the first item implemented from the newer `Ideas/next_horizon_ideas_2.md` brainstorm; its other proposals (4th biome, map variety, class-exclusive content, talent branching, boss/affix depth, fatigue fixes, onboarding, genre-inspired ideas) remain unbuilt.
