# Archon's Descent — AI Studio Sprite Generation Prompts

Target renderer: HTML5 canvas, `tileSize = 32`, `imageSmoothingEnabled = false`.
Sprite convention: 4 directions (down/up/left/right) x 2 walk frames, matching `PlayerSpriteCache` in `js/sprites.js`.

---

## PROMPT A — Full 4-direction walk-cycle sheet (primary)

Copy-paste this, replacing the CHARACTER line.

```
A 2D top-down pixel-art SPRITE SHEET for a retro dungeon-crawler game.

CHARACTER: a hunched green-skinned goblin scout, dented steel helmet, ragged
brown loincloth, small round wooden shield in the left hand, rusted dagger in
the right hand.

VIEW AND PERSPECTIVE — this is the most important requirement:
- Strict TOP-DOWN 3/4 overhead view, camera angled about 60 degrees down at the
  character, exactly like Legend of Zelda: A Link to the Past, Stardew Valley,
  or Enter the Gungeon.
- The viewer looks DOWN at the character from above and slightly in front.
- The top of the head and the shoulders are the most visible surfaces.
- The character's own feet are visible below the body, close together.
- NOT a side view. NOT a front-facing portrait. NOT an isometric or
  three-quarter diagonal view. NOT a full-body character illustration.

SHEET LAYOUT — follow exactly:
- A grid of 4 rows by 2 columns, 8 cells total.
- Every cell is exactly 64 x 64 pixels. Total image 128 x 256 pixels.
- Row 1 = facing DOWN (toward the viewer, face visible).
- Row 2 = facing UP (away from viewer, back of head and shoulders visible).
- Row 3 = facing LEFT (profile, moving left).
- Row 4 = facing RIGHT (profile, moving right, mirror of row 3).
- Column 1 = walk frame A (left leg forward).
- Column 2 = walk frame B (right leg forward).
- The character is centered in every cell, at identical scale, with the feet
  resting on the same baseline in all 8 cells. No drift between cells.
- No grid lines, no borders, no numbers, no labels, no captions.

BACKGROUND — critical:
- FULLY TRANSPARENT background (alpha channel). If transparency is not
  possible, use a FLAT PURE MAGENTA #FF00FF background, perfectly uniform,
  with zero gradient, zero vignette, zero shadow, and zero glow spill.
- NO dungeon environment. NO floor tiles, walls, archways, pipes, rubble,
  runes, or props of any kind.
- NO ground shadow, NO drop shadow, NO reflection beneath the character.
- The character is the ONLY thing in the image.

ART STYLE:
- Clean readable pixel art, roughly 48 pixels of character height inside each
  64 pixel cell, with a few pixels of padding on all sides.
- Hard-edged pixels with NO anti-aliasing, NO blur, NO soft gradients, NO
  motion blur, and NO glow bloom bleeding outward past the silhouette.
- Limited palette, at most 16 colors total.
- Bold dark outline around the whole silhouette so it reads against a dark
  dungeon floor.
- Dark cyberpunk fantasy mood: desaturated cool base tones with a thin cyan
  rim-light (#22d3ee) on the upper edges of the character only. The rim-light
  must stay INSIDE the silhouette and must not bleed into the background.
- Flat lighting from directly above. No dramatic cinematic lighting.

OUTPUT: one PNG image, 128 x 256 pixels, transparent background, sharp pixels.
```

---

## PROMPT B — Single idle sprite (simpler, higher hit-rate)

Use when Prompt A produces inconsistent cells. Generate 8 times, one per pose.

```
A single 2D top-down pixel-art game sprite of CHARACTER_DESCRIPTION.

Strict top-down 3/4 overhead view, camera angled 60 degrees down, exactly like
Legend of Zelda: A Link to the Past. Viewer looks DOWN at the character. Top of
head and shoulders most visible. Feet visible below the body. NOT a side view,
NOT a portrait, NOT isometric.

Facing DIRECTION_HERE.

Single character centered in one 64 x 64 pixel cell. FULLY TRANSPARENT
background, or flat pure magenta #FF00FF if transparency is unavailable. No
environment, no floor, no props, no ground shadow, no glow spill.

Clean pixel art, hard edges, no anti-aliasing, no blur, max 16 colors, bold
dark outline, thin cyan #22d3ee rim-light on upper edges only, contained inside
the silhouette. Flat overhead lighting.

Output one PNG, 64 x 64 pixels, sharp pixels, transparent background.
```

---

## NEGATIVE PROMPT (paste into the negative field if available)

```
side view, side-scrolling view, profile-only view, isometric, front-facing
portrait, character illustration, concept art, full-body splash art, dungeon
background, floor tiles, walls, archway, pipes, rubble, runes, environment,
scenery, ground shadow, drop shadow, reflection, vignette, glow bloom, light
bleed, anti-aliasing, blur, soft gradient, depth of field, photorealistic, 3D
render, painterly, watercolor, text, labels, numbers, captions, watermark,
signature, grid lines, borders, frame, multiple characters, cropped limbs
```

---

## CHARACTER LINES — your existing roster (js/data.js)

Swap each into the CHARACTER slot of Prompt A.

| Enemy ID | CHARACTER line to paste |
|---|---|
| `goblin_scout` | a hunched green-skinned goblin scout, dented steel helmet, ragged brown loincloth, small round wooden shield, rusted dagger |
| `skeleton_archer` | a lean skeletal archer, bare yellowed bone, tattered grey hood, short recurve bow, quiver of arrows on the back |
| `savage_orc` | a broad-shouldered grey-green orc, bare muscular chest, iron shoulder plate, heavy notched cleaver in both hands |
| `iron_guardian` | animate siege armor, no visible flesh, heavy riveted iron plate, tower shield, faint cyan glow at the helmet slit |
| `fire_elemental` | a floating knot of living furnace-flame, molten orange and white core, no limbs, drifting ember trail contained inside the silhouette |
| `lava_orc` | a hulking orc with cracked blackened obsidian skin, glowing magma seams, molten-iron maul |
| `void_summoner` | a robed faceless figure, deep violet robes, single large glowing eye where the face should be, open hands raised |
| `void_archon` | a towering draconic void entity, black chitin plating, four cyan-glowing eyes, jagged wing stubs |
| `void_spawn` | a small skittering void fragment, amorphous black body, three cyan pinpoint eyes, thin spider-like legs |

Player classes (`warrior`, `mage`, `rogue`, `paladin`, `necromancer`, `ranger`)
follow the same pattern — describe silhouette, palette, and held weapon only.

---

## WHY THE FIRST BATCH CAME OUT WRONG

The `Characters 1.zip` / `Characters 2.zip` images are Stitch scene renders:
1024x1024 full illustrations with the character composited into a lit dungeon,
one pose each, front/side framing. Unusable as sprites because there is no
alpha channel, no pose grid, and the background is baked in.

The three fixes that matter most, in order:
1. State the camera angle explicitly and name a reference game.
2. Demand a transparent or flat magenta background and forbid environment.
3. Specify exact pixel dimensions and the cell grid.

---

## AFTER GENERATION — checklist before handing files back

- [ ] Background is transparent, or a flat magenta that keys out cleanly.
- [ ] No glow or shadow spill outside the silhouette.
- [ ] All 8 cells share one scale and one baseline.
- [ ] Image is exactly 128 x 256 (Prompt A) or 64 x 64 (Prompt B).
- [ ] Pixels are hard-edged, not blurred or resampled.
- [ ] Save as PNG, never JPG. JPG destroys hard pixel edges.

Drop results in `images/sprites/<enemy_id>.png`.
