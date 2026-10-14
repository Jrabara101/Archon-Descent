# AI Studio Build Prompt — "Sprite Forge"

Paste everything inside the fence into Google AI Studio (Build / app mode).
It specifies a browser tool that converts finished PNG artwork into pixel-art
sprite sheets with an action layout, for the game *Archon's Descent*.

---

```
Build a single-page browser app called "Sprite Forge".

PURPOSE
It converts finished high-resolution PNG artwork (1024x1024 AI-generated
character and object renders, each with a dungeon background baked in) into
clean pixel-art sprite sheets with a multi-action layout, then exports the
sheet plus a JSON atlas describing every frame.

It is a CONVERTER and a LAYOUT EDITOR. It does not generate art.

HARD TECHNICAL CONSTRAINTS
- One self-contained index.html. Inline all CSS and JS. No build step.
- No external libraries, no CDN, no network requests, no frameworks. Plain
  HTML + CSS + vanilla JS + Canvas 2D only.
- All image processing runs locally in the browser. Files never leave the
  machine.
- Every canvas that displays or writes pixel data must set
  ctx.imageSmoothingEnabled = false, and CSS image-rendering: pixelated.
  Sharp pixel edges are the entire point of this tool.
- Must work offline when opened from file://.

TARGET GAME SPECS (the output must satisfy these exactly)
- Game tile size is 32 pixels.
- Default sprite cell is 64x64 (2x tile), user-adjustable to 16, 32, 48, 64,
  96, or 128.
- Direction order is fixed and must never change: down, up, left, right.
- Palette is dark cyberpunk fantasy. Three biome palettes:
    catacombs: #1e293b #0f172a #334155
    forges:    #451a03 #290b02 #7c2d12 #9a3412 #431407
    void:      #2e1065 #17053b #4c1d95 #5b21b6
  Shared accent (rim-light): #22d3ee
- Exported PNG must have a real alpha channel. Never export JPG.

===========================================================================
SCREEN 1 — INTAKE
===========================================================================
- Full-window drag-and-drop zone, plus a file picker. Accept many PNGs at once.
- Also accept a dropped .zip and read the PNGs inside it using only built-in
  browser APIs (DecompressionStream, or a minimal inline store/deflate reader).
  If a zip cannot be read, say so plainly and ask for loose PNGs instead. Do
  not fail silently.
- Each loaded image becomes a card in a left-hand sidebar showing a thumbnail,
  filename, and pixel dimensions.
- On each card the user picks an ASSET TYPE. The type drives the default action
  layout in Screen 4:

    Character   - player classes. Full directional walk set.
    Enemy       - standard enemies. Full directional walk set.
    Boss        - large enemies. Same actions, but default cell 128 and a
                  "scale" field so an oversized sprite can occupy 2x2 tiles.
    Companion   - allied followers. Same as Enemy.
    Weapon      - held or dropped items. Static, no directions.
    Skill FX    - spell and ability effects. An effect strip, no directions.
    Map Tile    - floor, wall, door, stairs, decor. Tileable, no directions.
    Prop        - chests, barrels, rubble. Static, no directions.

===========================================================================
SCREEN 2 — CUTOUT (background removal)
===========================================================================
Runs an AUTOMATIC pass the moment an image loads, then always leaves the manual
tools available to correct it. Never require the auto pass to be perfect.

Automatic pass, in this order:
1. Sample all four corners and the outer 2% border ring.
2. Flood-fill inward from every border pixel whose color is within tolerance of
   the sampled background, using a scanline flood fill. Default tolerance 32,
   measured as Euclidean distance in RGB.
3. Detect a flat magenta key (#FF00FF within tolerance) and remove it if found.
4. Keep only the largest remaining connected opaque region; delete small
   floating islands under 0.5% of total area. Expose this as a toggle, because
   it will wrongly delete a floating staff orb or a detached spell effect.
5. Feather the alpha edge by at most 1 pixel. Never more. Soft edges destroy
   pixel art.

Manual tools, always visible:
- Magic wand: click a color, remove all pixels within tolerance. Live tolerance
  slider, 0 to 128, with an instant preview as it drags.
- Erase brush and Restore brush. Adjustable radius 1 to 64. Restore paints back
  from the untouched original, so mistakes are always recoverable.
- Rectangle keep: drag a box, delete everything outside it.
- Edge de-fringe: a slider that erodes 0 to 3 pixels from the alpha edge.
  IMPORTANT: the source art has a cyan #22d3ee rim-light that bleeds into the
  dark background. De-fringe must remove that halo without eating the
  character's own rim-light. Offer a "despill" checkbox that desaturates
  semi-transparent cyan edge pixels instead of deleting them.
- Undo and Redo, minimum 20 steps, keyboard Ctrl+Z and Ctrl+Shift+Z.
- Reset to original.

Display transparency as a mid-grey checkerboard, never white, because the art
is dark and a white checkerboard hides edge errors.

Show a live count: "N% of pixels transparent".

===========================================================================
SCREEN 3 — PIXELATE AND PALETTE
===========================================================================
Convert the cutout into true pixel art. Show a large before/after split view,
updating live as any control changes.

Controls:
- Target cell size: 16, 32, 48, 64, 96, 128. Default 64.
- Downsample method, user-selectable:
    Nearest neighbour  - sharpest, noisiest
    Box average        - cleanest, slightly soft
    Dominant color     - per output pixel, take the most frequent source color
                         in that block. This is the best method for pixel art
                         and must be the DEFAULT.
- Auto-trim to alpha bounding box before downsampling, so the character fills
  the cell instead of floating. Then pad to a square. Expose padding in pixels,
  default 4.
- Palette quantization:
    None
    Median cut, with a color-count slider from 4 to 64, default 16
    Snap to biome palette - dropdown of catacombs / forges / void, each pixel
      mapped to the nearest palette color, plus the #22d3ee accent
- Alpha threshold slider, 0 to 255, default 128. Every pixel is forced to fully
  opaque or fully transparent. Pixel art must not carry partial alpha.
- Outline: add a 1px dark outline around the silhouette. Color picker, default
  #0f172a. On/off, default on.
- Rim-light: re-apply a 1px #22d3ee highlight along the top and upper-left
  edges of the silhouette, so the game's look survives quantization. On/off,
  default off.

Show the final color count and warn if it exceeds the requested palette size.

===========================================================================
SCREEN 4 — ACTION LAYOUT EDITOR
===========================================================================
This is the core of the app. The user assembles a sheet from named ACTIONS.
Each action is a row. Each row has a name, a direction mode, and a frame count.

Direction mode is one of:
  4-way  - emits down, up, left, right in that exact order
  1-way  - emits a single row, no directions

Default action sets by asset type, all fully editable:

  Character / Enemy / Companion / Boss
    idle    4-way  1 frame
    walk    4-way  2 frames
    attack  4-way  2 frames
    hit     4-way  1 frame
    death   1-way  3 frames

  Weapon / Prop
    idle    1-way  1 frame

  Skill FX
    cast    1-way  4 frames
    impact  1-way  4 frames

  Map Tile
    variants 1-way 4 frames

The user can add, rename, delete, and reorder actions, and change any frame
count from 1 to 12.

The sheet grid is laid out as: one row per action-direction pair, in the fixed
order down, up, left, right; columns are frames. Grid width equals the largest
frame count across all actions. Empty trailing cells stay transparent.

FILLING CELLS
The source art gives only ONE pose. The tool must help build the rest.

- Click any cell to open a frame editor.
- Cell sources, selectable per cell:
    Source        - the pixelated sprite as-is
    Mirror        - horizontally flipped. Auto-fill "right" from "left" by
                    mirroring must be a one-click action, since that is how
                    real sprite sheets are built.
    Offset        - the sprite nudged by X and Y pixels, for cheap bob and
                    step motion
    Squash        - vertical scale 80% to 120%, for impact and landing frames
    Rotate        - fixed 90, 180, 270 degree steps only, to preserve pixels
    Tint          - flat color multiply, for the white hit-flash frame and for
                    fade-out death frames, with an opacity slider
    Empty         - deliberately blank
- Provide "Auto-fill walk cycle": takes the idle pose and generates a 2-frame
  bob by offsetting Y by -1 then +1, and mirrors left into right.
- Provide "Auto-fill hit": a full white tint at 70% opacity.
- Provide "Auto-fill death": 3 frames of increasing downward offset with
  decreasing opacity.
  Label all of these clearly as PLACEHOLDERS, and show a small warning banner
  reading "Generated placeholder frames. Replace with real art for final."
  Never let the user believe these are hand-animated.

PREVIEW
- A live animation player. Pick an action and a direction, set FPS from 1 to
  24 (default 8), and loop it.
- A 32x32 preview shown against each of the three biome floor colors side by
  side, so the user can confirm the sprite reads on a real dungeon floor. This
  matters more than how it looks on the checkerboard.

===========================================================================
SCREEN 5 — EXPORT
===========================================================================
Export the following, each with its own button:

1. Sprite sheet PNG. Transparent background, exact cell grid, no padding
   between cells, no gridlines, no labels baked in.

2. JSON atlas, in this exact shape:

{
  "id": "goblin_scout",
  "type": "enemy",
  "cell": 64,
  "sheet": "goblin_scout.png",
  "directions": ["down", "up", "left", "right"],
  "actions": {
    "idle":   { "row": 0,  "frames": 1, "fps": 8,  "loop": true },
    "walk":   { "row": 4,  "frames": 2, "fps": 8,  "loop": true },
    "attack": { "row": 8,  "frames": 2, "fps": 12, "loop": false },
    "hit":    { "row": 12, "frames": 1, "fps": 12, "loop": false },
    "death":  { "row": 16, "frames": 3, "fps": 6,  "loop": false }
  }
}

   For a 4-way action, "row" is the index of its FIRST row, and the four
   direction rows follow in the order down, up, left, right. For a 1-way
   action, "row" is its single row.

3. Individual frame PNGs, named <id>_<action>_<direction>_<frame>.png.

4. Batch export: process every loaded image and download all sheets plus one
   combined atlas JSON keyed by id.

Downloads use canvas.toBlob and an object URL. Always PNG, never JPG.
If a download is blocked, show the image in a new tab with a note to
right-click and save, rather than failing quietly.

===========================================================================
UI AND UX
===========================================================================
- Dark theme matching the game: background #0f172a, panels #1e293b, borders
  #334155, primary text #e2e8f0, muted text #94a3b8, accent #22d3ee.
- Layout: left sidebar of loaded assets, main work area, right panel of
  controls for the active screen. Top tab bar for Intake / Cutout / Pixelate /
  Layout / Export, and never lose work when switching tabs.
- Every slider shows its numeric value and has a reset-to-default button.
- Keyboard: Ctrl+Z undo, Ctrl+Shift+Z redo, Space to play or pause the preview,
  1 to 5 to jump between tabs.
- Persist settings and the asset list to localStorage, wrapped in try/catch so
  private browsing does not break the app. Image data may be too large for
  localStorage; if a write fails, keep working in memory and show a quiet
  notice rather than throwing.
- Show real progress for slow operations. Flood fill and quantization on a
  1024x1024 image will block; run them in chunks with requestAnimationFrame so
  the UI never freezes.

===========================================================================
CORRECTNESS REQUIREMENTS
===========================================================================
- Never resample with smoothing at any stage.
- Never write partial alpha into the final export; threshold it.
- Preserve the exact direction order down, up, left, right everywhere: in the
  grid, in the preview, and in the JSON.
- The atlas row indices must match the actual PNG rows exactly. Verify this
  before download and refuse to export if they disagree.
- Handle a 1024x1024 source without freezing the tab.
- Handle a dropped non-image file with a clear message, not a crash.

Start by building Screens 1, 2, and 3 end to end and make them fully work.
Then add Screen 4, then Screen 5.
```

---

## Notes for you, not for AI Studio

**Why this beats prompting for sprite sheets.** Image models are unreliable at
consistent 8-cell grids and at true pixel art. A converter turns the one thing
the models ARE good at — a single strong 1024px pose — into what the engine
needs. You keep the art you already generated.

**Where it grounds into this repo.**
- Cell 64 and tile 32 come from `this.tileSize = 32` in `js/main.js:12`.
- Direction order `down, up, left, right` matches `PlayerSpriteCache.buildSheet()`
  in `js/sprites.js`.
- Biome palettes are lifted verbatim from `TextureCache.biomes` in `js/sprites.js`.
- The `hit` white-tint action mirrors `getFlashFrame()`, which already does this
  at runtime. Baking it is optional; keep the runtime version if you prefer.
- Asset types cover the roster in `js/data.js`: 9 enemies, bosses including
  `void_archon_prime`, items with `type` fields, and the three biomes
  `catacombs` / `forges` / `void`.

**The honest limitation.** One source pose cannot become a real walk cycle. The
auto-fill actions produce bob-and-mirror placeholders — fine for blocking out
the game and checking that sprites read on a dungeon floor, not fine for shipped
animation. Real multi-pose animation still needs more source art per pose, or
hand-editing. The spec makes the tool say this rather than hide it.

**Suggested first ask after it builds.** Load one goblin PNG and get it through
cutout and pixelate to a clean 64x64 with a transparent background. If that one
path works, the rest is layout work.

**If AI Studio chokes on the length.** Cut the prompt at the end of Screen 3 and
build that first, then paste Screens 4 and 5 as a follow-up. The spec is
deliberately ordered so this split works.
