---
name: "Archon's Descent"
description: "A dark, cyberpunk-infused retro roguelike design system featuring high-contrast neon accents, glowing interactive elements, and tactical HUD layouts."
tokens:
  colors:
    bg-base: "#090d16"
    bg-surface: "#131a2c"
    bg-surface-elevated: "#1e2942"
    primary: "#38bdf8"
    primary-glow: "rgba(56, 189, 248, 0.25)"
    accent-green: "#34d399"
    accent-red: "#fb7185"
    accent-orange: "#fb923c"
    rarity-common: "#94a3b8"
    rarity-rare: "#3b82f6"
    rarity-epic: "#a855f7"
    rarity-legendary: "#eab308"
    text-main: "#f8fafc"
    text-muted: "#64748b"
    border-glow: "#38bdf8"
  typography:
    font-ui: "'Outfit', sans-serif"
    font-retro: "'Press Start 2P', monospace"
    font-mono: "'Fira Code', monospace"
  border-radius:
    xs: "4px"
    sm: "6px"
    md: "8px"
    lg: "12px"
  spacing:
    xs: "4px"
    sm: "8px"
    md: "12px"
    lg: "16px"
    xl: "20px"
    xxl: "24px"
---

# Archon's Descent — Design System

This document defines the brand style guidelines, visual vocabulary, and component specifications for **Archon's Descent**. This design system bridges retro 8-bit roguelike vibes with clean, modern sci-fi/cyberpunk aesthetics.

---

## 1. Visual Vibe & Aesthetics
* **Atmosphere:** Claustrophobic, high-tension, dark dungeon atmosphere balanced with vibrant neon indicators. 
* **Depth & Glow:** Use of semi-transparent backdrop filters, layered surface elevations, and radial gradient glows to simulate CRT-like ambient light and glowing HUD displays.
* **Contrast:** Dark surfaces are paired with extremely bright neon highlights (Cyan, Violet, Emerald, Rose) to denote interactability, stats, rarity, and hazard states.

---

## 2. Palette & Colors
The color palette represents a neon-infused dark void:

### Core Palette
* **Deep Space Base (`#090d16`):** The absolute background of the application, simulating the dark corridors of the dungeon.
* **Surface Deep (`#131a2c`):** Used for base panel containers, sidebars, and item grids (typically applied with `rgba` transparency and blur).
* **Surface Elevated (`#1e2942`):** Highlighted containers, active slots, hover states, and card backgrounds.
* **Neon Cyan (`#38bdf8`):** The primary brand color. Representing energy, shield capacity, depth progression, and interactive UI cues.

### Accent Palette
* **Vitality Green (`#34d399`):** Healing, buffs, friendly combat logs, and successful interactions.
* **Doom Red (`#fb7185`):** Enemy actions, damage indications, danger alerts, and hostile entity logs.
* **Warning Orange (`#fb923c`):** Status warnings, interactive shrines, or physical environmental hazards.

### Item Rarity Colors
* **Common (`#94a3b8`):** Slate gray. Basic items, passive stats, or starting gear.
* **Rare (`#3b82f6`):** Deep blue. Enhanced stats or specialized gear.
* **Epic (`#a855f7`):** Purple. High-tier magic items, high mana indicators, or complex spells.
* **Legendary (`#eab308`):** Gold. Shrines, level-ups, boss drops, and coin amounts.

---

## 3. Typography
The system uses three specific web fonts to balance legibility with a retro flavor:

* **Outfit (Sans-serif):** Used for main UI labels, body text, stats, item descriptions, and paragraphs. Highly readable at all resolutions.
* **Press Start 2P (Monospace Display):** Reserved for title headers, game overlay screens, major game-state indicators (e.g. "LEVEL UP!"), and button accents. Used sparingly to avoid visual clutter.
* **Fira Code (Monospace):** Used for hotkeys, level counters, raw numeric counts, shop prices, and log output.

---

## 4. UI Components

### Panels & Containers
Panels must use blur filters to suggest glass-like interfaces layered over the dungeon:
```css
.panel {
  background: rgba(19, 26, 44, 0.90);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(12px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}
```

### Action & Class Buttons
Buttons utilize bold neon styling, scaling slightly or glowing on hover:
```css
.btn-primary {
  background: var(--primary);
  color: var(--bg-base);
  border: none;
  font-family: 'Outfit', sans-serif;
  font-weight: 800;
  transition: all 0.2s ease;
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 20px var(--primary);
}
```

### Slots (Inventory / Abilities / Belt)
Item cells are square, utilizing dashed borders for empty slots and custom colored solid rings based on rarity:
* **Empty State:** `1px dashed rgba(255, 255, 255, 0.1)`
* **Hover State:** Glow shadow (`box-shadow: 0 0 10px rgba(56, 189, 248, 0.25)`) and solid primary border.
* **Hotkeys:** Positioned absolutely in the top-left of the slot as a mini dark badge with primary text.

### Progress Bars (Health / Mana / XP)
Used for tracking critical vitals.
* **Health (HP):** Linear gradient from `#f43f5e` to `#fda4af` with red ambient glow.
* **Mana (MP):** Linear gradient from `#3b82f6` to `#60a5fa` with blue ambient glow.
* **Experience (XP):** Linear gradient from `#a855f7` to `#c084fc` with purple ambient glow.
