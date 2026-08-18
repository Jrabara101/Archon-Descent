# Archon's Descent — Character & Creature Art Bible

This document is the visual direction for illustrated game-asset art: **playable characters, companions, enemies, bosses, and item/treasure icons**. It extends the existing UI design system (`Ideas/Design.md`) rather than replacing it — palette, rarity colors, and typography below are pulled directly from that system so generated art and existing UI feel like one game.

The live game currently renders characters and enemies as **procedural pixel-art / emoji icons** (see `js/sprites.js`, `js/data.js`). This bible is for the *next* visual tier: hand-illustrated or AI-generated character/creature/item art that could replace or sit alongside those placeholders.

---

## 1. World & Tone

**Setting:** The Descent — a vertical dungeon that was not dug downward, but grew upward from something ancient below. Delvers fight through three biomes in order:

1. **Catacombs** (Depths 1–9) — cold stone, bone, and rust. Slate blues and desaturated grays.
2. **Forges** (Depths 10–14) — orc-occupied magma foundries. Burnt orange, ember red, black iron.
3. **Void** (Depths 15–20+) — reality-warping abyss. Deep violet, arcane purple, bruised black.

**Tone:** Grim but readable. Claustrophobic dread rendered with clean, high-contrast silhouettes — not muddy horror-realism. Every creature and item must read instantly at small HUD/inventory-icon size, since that's the primary rendering context in-game.

**Framing device:** Nothing here is "generic fantasy." Every visual should feel like it belongs to *this* dungeon's specific lore: bones stitched into wardens, fire that grieves, wraiths that volunteered. Reference the lore lines below when designing — they're the emotional key for each subject.

---

## 2. Palette (inherited from `Ideas/Design.md`)

Use this palette for lighting, glows, and material rendering on all character/creature/item art so it matches the existing UI:

| Token | Hex | Use |
|---|---|---|
| Deep Space Base | `#090d16` | Background / deep shadow |
| Surface Deep | `#131a2c` | Ambient occlusion, base shadow tone |
| Surface Elevated | `#1e2942` | Rim-light fill in dark scenes |
| Neon Cyan (primary) | `#38bdf8` | Player energy, magic, shield VFX |
| Vitality Green | `#34d399` | Healing, friendly/ally accent |
| Doom Red | `#fb7185` | Enemy attacks, danger, blood-adjacent accents (keep stylized, not gory) |
| Warning Orange | `#fb923c` | Fire, hazards, forge-biome accent |

**Rarity accent ring** (used for item/treasure art — apply as an outline, glow, or frame, not the item's base material color):

| Rarity | Hex | Feel |
|---|---|---|
| Common | `#94a3b8` | Plain, worn, matte |
| Rare | `#3b82f6` | Tempered, faint blue sheen |
| Epic | `#a855f7` | Runed, arcane glow, particle wisps |
| Legendary | `#eab308` | Gold trim, active light source, always has a signature silhouette detail |

**Biome accent per character/creature**, layer on top of the base palette depending which biome the subject belongs to:

| Biome | Wall/Floor tone | Accent |
|---|---|---|
| Catacombs | `#0f172a` / `#1e293b` / `#334155` | Bone white, slate |
| Forges | `#431407` / `#7c2d12` / `#9a3412` | Ember orange, black iron |
| Void | `#17053b` / `#2e1065` / `#4c1d95` | Arcane violet, static-purple |

---

## 3. Playable Classes (6)

Each class has a signature color (from `PLAYER_COLORS` in `js/data.js`) and 3 ability icons already established in the UI — keep these as the character's identity color in any illustrated portrait/sprite.

| Class | Color | Hex | Fantasy | Ability motifs |
|---|---|---|---|---|
| **Warrior** | Red | `#ef4444` | Frontline tank, shield-and-blade | Shield block 🛡️, warhorn rally 📯, haymaker punch 👊 |
| **Mage** | Purple | `#a855f7` | Elemental burst caster | Fire 🔥, frost ❄️, meteor ☄️ |
| **Rogue** | Green | `#34d399` | Shadow striker | Smoke/dash 💨, dagger flurry 🗡️, poison execute ☠️ |
| **Paladin** | Gold | `#facc15` | Holy tank/healer | Radiant burst ✨, prayer/heal 🙏, judgment scales ⚖️ |
| **Necromancer** | Deep violet | `#581c87` | Summoner/drain caster | Skull curse 💀, blood drain 🩸, coffin/army ⚰️ |
| **Ranger** | Teal | `#14b8a6` | Precision archer/trapper | Aimed shot 🎯, snare trap 🪤, arrow rain 🌧️ |

**Design guidance for character portraits:**
- Silhouette-first: each class should be identifiable from outline alone (Warrior = broad shield block, Mage = flowing robe + staff, Rogue = low hood + twin blades, Paladin = winged/haloed plate, Necromancer = ragged cloak + skeletal accents, Ranger = cloak + longbow profile).
- Class color appears on the torso/cloak — the single largest color block — matching how the in-game sprite already colors the torso block.
- Equip visuals should be able to swap by rarity tier without changing the base silhouette (so gear upgrades read as "same hero, better gear," not a new character).
- A shared "mastery" glow variant exists at 500 kills — see `MASTERY_COLORS` — a brighter/gold-shifted variant of the class color for an alternate "ascended" portrait.

---

## 4. Companions (4 rescuable NPCs + 1 pet)

Companions are found as captives in cages and fight alongside the player for the rest of that floor (40-turn limit), except the Spirit Wolf, which is a permanent purchasable pet.

| Companion | Personality | Visual hook | Lore line |
|---|---|---|---|
| **Bram the Freed** | Loyal, blunt, grateful | Heavyset ex-miner, chain-scarred wrists, improvised weapon | *"Owe you my life. Point me at something and I'll swing."* Backstory: brother was lost to the Forges. |
| **Sera the Unchained** | Watchful, guarded, sharp-eyed | Lean cartographer type, tattered map satchel, alert posture | *"Three days in the dark. I remember every face that walked past."* Mapped three depths before capture. |
| **Old Kettle** | Weary veteran, dry humor | Aged, grizzled, patchwork survival gear, world-weary eyes | *"Heh. Didn't think anyone still came down this far."* 40 years running the camps. |
| **Wisp** | Fragile, ethereal, quietly brave | Small, pale, faintly glowing at the edges — almost translucent | *"...thank you. I'll fight. I don't have anywhere else to go."* Reacts to the Descent's "grief" in the fire. |
| **Spirit Wolf** (pet) | Loyal beast companion | Semi-transparent spectral wolf with cyan (`#38bdf8`) inner glow, matching player energy color | Purchasable Hub companion; persists across floors/runs. |

**Design guidance:** These are *rescued*, not recruited-hero types — they should look like survivors, not adventurers: worn clothing, cage-wear, makeshift gear, not matching armor sets. Their fighting stance should read as "finally able to fight back," not polished combatant.

---

## 5. Bestiary — Enemies (12 standard + 3 bosses)

Each entry below includes the in-game icon (current placeholder), lore, and the biome it belongs to — use the matching biome accent from Section 2.

### Catacombs
| Enemy | Icon | Visual direction | Lore |
|---|---|---|---|
| Goblin Scout | 👹 | Small, starved, scavenged gear, quick/skittish posture | Starving wretches chasing rumors of gold; now swarm anything warm. |
| Skeleton Archer | 🏹 | Reassembled bones in half-rotted First Expedition uniform, bow drawn | The bones of the First Expedition, rearranged by the dark. |
| Savage Orc | 👺 | Bulky, relic-iron tusks/piercings, mining tools as weapons | Mines the upper catacombs for relic-iron; treats trespassers as ore. |
| Iron Guardian | 🛡️ | Animate siege armor, plants a warding stance, aura ring VFX | Animate siege armor that blunts blows struck near it. |
| Mimic | 😈 | Disguised as an ornate chest until it opens — add subtle "wrong" detail (too many hinges, a faint eye) | Patient, older chests that have learned patience and teeth. |
| Bound Wraith | 👻 | Translucent chained figure, tethered energy links to an off-screen "master" | Souls chained to arena guardians, hurled at intruders. |

### Forges
| Enemy | Icon | Visual direction | Lore |
|---|---|---|---|
| Fire Elemental | 🔥 | Living knot of furnace-heat, no fixed silhouette, unstable/roiling edges | Releases everything it was holding in when slain — telegraph an explosion. |
| Lava Orc | 👺 | Forge-clan orc, magma-quenched skin with glowing cracks, slow wind-up stance | Quenched in magma until their skin took the temper. |
| Hex Weaver | 🕸️ | Spindly caster, weaving trap-glyphs into the floor rather than melee stance | Makes the floor itself remember you were here, and hate you for it. |

### Void
| Enemy | Icon | Visual direction | Lore |
|---|---|---|---|
| Void Summoner | 👁️ | Cloaked figure opening rifts/doors rather than fighting directly, hands-out "opening" pose | Opens doors that should stay closed and lets what's behind them fight. |
| Void Archon | 🐉 | Small draconic echo-being, ground warps red before its strike lands (telegraph VFX) | Lesser echoes of the Archon itself. |
| Void Spawn | 👾 | Tiny fragment creature, appears in swarms, simple geometric "shed piece" design | Fragments shed by a Summoner's open door — individually pitiful, collectively a tide. |

### Bosses (Floor Guardians)

| Boss | Icon | Biome | Stats (HP/ATK/DEF) | Visual direction | Lore |
|---|---|---|---|---|---|
| **Bone Colossus** | 💀 | Catacombs | 220 / 18 / 6 | Towering warden fused from a hundred failed delvers' remains — asymmetric, patchwork bone architecture, no two limbs match | *"The fused remains of a hundred failed delvers, stacked into a warden."* Guards the passage below Depth 10. |
| **Molten Behemoth** | 🌋 | Forges | 280 / 22 / 8 | The Forge's heart given legs — cracked obsidian hide glowing from within, molten "second wind" state should visibly intensify (brighter cracks, ground melting beneath it) | *"The forges were never the Archon's furnace. They were its warning system."* |
| **Void Archon Prime** | 🐲 | Void | 360 / 28 / 10 | Crowned fragment of the Archon itself — largest, most alien silhouette, should NOT read as "just a bigger dragon"; crown/regalia detail signals its authority over the other Void enemies | *"It is what the Archon sends when it wants you to feel like you've already lost."* Final guardian. |

**Design guidance for bosses:** Each boss should have a clear "tell" readable in the art itself — a wind-up pose, a glowing weak point, a stance change — since these bosses have real in-game telegraphed attacks (e.g., Void Archon Prime warps the floor red before striking). Illustrate the *telegraph*, not just the idle pose, if producing multiple frames/states.

---

## 6. Items, Packages & Treasure

### Equipment (procedural, 4 slot types)
Generated items follow `type → rarity → prefix + base name` naming (e.g. "Runed Blade", "Archon Plate"). Icon sets already established:

| Slot | Icons | Base names | 
|---|---|---|
| Weapon | 🗡️ ⚔️ 🪄 🏹 🪓 🔱 | Blade, Sword, Staff, Dagger, Axe, Spear |
| Armor | 🥋 🦺 🥼 | Tunic, Vest, Robes, Plate, Chainmail |
| Shield | 🛡️ 🔰 | Buckler, Shield, Guard, Aegis |
| Accessory | 💍 📿 🔮 | Ring, Amulet, Talisman, Orb, Pendant |

Rarity prefix families set the *material/finish* language for art:
- **Common:** Worn, Rusty, Apprentice, Simple → dull, chipped, no glow
- **Rare:** Reinforced, Tempered, Gleaming, Sharp → clean metal, faint blue sheen
- **Epic:** Ancient, Runed, Arcane, Shadow → glowing runes/particles, purple energy
- **Legendary:** Archon, Mythic, Celestial, Abyssal → active light source, gold trim, unmistakable at a glance

Rare+ weapons can also roll a **trait**, which should be visually hinted at (e.g., a faint double-edge glow for Cleave, a ricochet-arc motif for Bounce):
- **of Cleaving** — strikes adjacent enemies too
- **of Ricochet** — chains to a second enemy

### Named Uniques (5 hand-authored legendaries)
These need bespoke, one-off silhouettes distinct from the procedural legendary look — they're lore items, not loot-table rolls.

| Item | Type | Icon | Effect | Lore |
|---|---|---|---|---|
| **Voidfang** | Weapon | 🗡️ | Lifesteal | *"It does not cut. It drinks."* — should look hungry: a blade with a visible dark "throat" or vein pattern. |
| **Aegis Eternal** | Shield | 🛡️ | Thorns | *"Forged by the first ward-smith. It remembers every blow it has ever stopped."* — battle-scarred but unbroken, dented yet whole. |
| **Cinderheart** | Weapon | 🔥 | Burn on hit | *"A splinter of the Forge's original flame, still burning after a thousand years."* — living ember core visible inside the blade/haft. |
| **Wanderer's Cloak** | Armor | 🧥 | Vision | *"Worn by a scout who mapped three depths of the Descent and lived to tell it."* — patched, travel-worn, faint map-ink stains. |
| **Soulbound Ring** | Accessory | 💍 | Soul heal | *"It was a wedding band once. Now it only remembers how to hold on."* — plain band, understated, emotionally the quietest item in the set — do not over-decorate it. |

### Relics (12 passive boons — icon-only, no full illustration needed but useful for consistency)
Loaded Dice 🎯, Soul Siphon 🌀, Stoneheart Idol 🗿, Momentum Engine ⚙️, Scavenger's Eye 🔍, Glass Cannon 🏺, Phoenix Feather 🪶, Frostwalker Charm 🧊, Alchemist's Stone ⚗️, Hunter's Instinct 🦉, Vampire Sigil 🧛, Battle Rhythm 🥁.

### Treasure & Containers
- **Standard chests** — plain, biome-matched wood/iron.
- **Mimics** — disguised as chests (see Bestiary above); the "reveal" moment (chest → teeth) is a key illustration opportunity.
- **Sealed vaults** — grander, rarer-looking chest variant, opened with keys; should look distinctly more ornate than standard chests.
- **Shrines** (7 types incl. Curse Altars, Gambling Shrine, Wishing Well, Forge Shrine) — environmental art rather than item art, but should use the rarity/biome palette consistently (e.g., Curse Altars lean Void-purple + Doom Red regardless of biome).

---

## 7. Cross-Cutting Rules

1. **Readability at small size wins over detail.** Every asset's primary use is a ~32–48px HUD/inventory icon. Silhouette and color-block clarity matter more than fine linework.
2. **Color = information.** Never use rarity gold/purple/blue/gray or biome accent colors decoratively on something that isn't that rarity/biome — players read color as game-state.
3. **No gore, keep it stylized.** Doom Red (`#fb7185`) is a UI/damage accent, not a blood-realism cue. Keep creature horror atmospheric (bone, shadow, fire) rather than visceral.
4. **Everything belongs to this dungeon.** Avoid generic fantasy-kitchen-sink designs — tie every subject back to its one-line lore entry above.
5. **Consistency with existing UI**: all generated art should feel at home inside the panels/glow/typography system defined in `Ideas/Design.md` — dark glass panels, neon rim-light, CRT-glow ambience.
