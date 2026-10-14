// ============================================================================
// RIG ENGINE — region-based sprite deformation
// ============================================================================
// The source art gives exactly ONE pose. Whole-sprite transforms (offset the
// entire image up and down) read as a bobbing sticker because nothing INSIDE
// the silhouette moves.
//
// This engine slices the sprite into horizontal bands and transforms each band
// independently per frame, so legs can stride while the head stays level.
// No user rigging: bands are derived from the asset type and cell height.
// ============================================================================

import { AssetType, Direction } from '../types';

/** A horizontal slice of the sprite, transformed independently. */
export interface RigBand {
  /** Top edge as a fraction of cell height (0 = top of cell). */
  top: number;
  /** Bottom edge as a fraction of cell height (1 = bottom of cell). */
  bottom: number;
  /** Horizontal shift in pixels, applied at the sprite's own scale. */
  dx: number;
  /** Vertical shift in pixels. */
  dy: number;
  /** Rotation in degrees about this band's own centre. */
  rot: number;
  /** Horizontal scale about the band centre (1 = unchanged). */
  sx: number;
  /** Vertical scale about the band centre (1 = unchanged). */
  sy: number;
  /**
   * Splits this band down the middle and moves each half opposite ways by
   * `dx` — the trick that turns one pair of legs into a stride. Only
   * meaningful for the legs band.
   */
  split?: boolean;
}

/** A full multi-band pose for a single frame. */
export type RigPose = RigBand[];

/** Which rig family an asset type animates with. */
export type RigKind = 'biped' | 'floating' | 'inert' | 'static';

/**
 * Map an asset type to a rig family. A fire elemental has no legs, so giving
 * it a stride would look wrong; it hovers and pulses instead.
 */
export function rigKindForAssetType(type: AssetType): RigKind {
  switch (type) {
    case 'character':
    case 'enemy':
    case 'boss':
    case 'companion':
      return 'biped';
    case 'skill_fx':
      return 'floating';
    case 'weapon':
    case 'prop':
      return 'inert';
    case 'map_tile':
    default:
      return 'static';
  }
}

// --- Band geometry -------------------------------------------------------
// Proportions are deliberately generic. They hold up for the hunched goblin,
// the tall lich, and the broad orc alike, because every band is defined as a
// fraction of the trimmed silhouette rather than absolute pixels.

const HEAD = { top: 0.0, bottom: 0.3 };
const TORSO = { top: 0.3, bottom: 0.65 };
const LEGS = { top: 0.65, bottom: 1.0 };

/** An untransformed band — the identity pose. */
function still(top: number, bottom: number): RigBand {
  return { top, bottom, dx: 0, dy: 0, rot: 0, sx: 1, sy: 1 };
}

/** The whole cell, untransformed. Used for static assets and frame 0 idles. */
export function restPose(): RigPose {
  return [still(0, 1)];
}

// --- Biped -------------------------------------------------------------

/**
 * Walk: legs split into a stride, torso counter-rotates, head bobs.
 * `phase` runs 0..1 across the cycle.
 */
function bipedWalk(phase: number, amp: number): RigPose {
  const swing = Math.sin(phase * Math.PI * 2);
  const bob = Math.abs(Math.cos(phase * Math.PI * 2));

  return [
    { ...still(HEAD.top, HEAD.bottom), dy: -bob * amp * 0.5 },
    { ...still(TORSO.top, TORSO.bottom), dy: -bob * amp * 0.35, rot: swing * 1.5 },
    { ...still(LEGS.top, LEGS.bottom), dx: swing * amp, split: true },
  ];
}

/**
 * Attack: wind up away from the target, then lunge into it. The torso leads,
 * the legs plant. `phase` 0..1, where the strike lands around 0.5.
 */
function bipedAttack(phase: number, amp: number): RigPose {
  // Wind back over the first third, drive forward through the rest.
  const drive = phase < 0.34 ? -phase * 1.6 : (phase - 0.34) * 1.9;
  const lean = drive * amp;

  return [
    { ...still(HEAD.top, HEAD.bottom), dx: lean * 1.15, rot: drive * 5 },
    { ...still(TORSO.top, TORSO.bottom), dx: lean, rot: drive * 7 },
    { ...still(LEGS.top, LEGS.bottom), dx: lean * 0.3, split: true },
  ];
}

/**
 * Death: the body folds and topples rather than sliding down the screen.
 * Legs collapse first, the torso rotates over, the head follows the fall.
 */
function bipedDeath(phase: number, amp: number): RigPose {
  const fall = phase * phase; // ease-in — slow start, hard landing
  const collapse = 1 - fall * 0.55;

  return [
    {
      ...still(HEAD.top, HEAD.bottom),
      dx: fall * amp * 2.2,
      dy: fall * amp * 2.0,
      rot: fall * 72,
    },
    {
      ...still(TORSO.top, TORSO.bottom),
      dx: fall * amp * 1.5,
      dy: fall * amp * 1.4,
      rot: fall * 55,
      sy: collapse,
    },
    {
      ...still(LEGS.top, LEGS.bottom),
      dy: fall * amp * 0.5,
      sy: collapse * 0.85,
      split: true,
      dx: fall * amp * 0.8,
    },
  ];
}

/** Idle: a slow breath, so a standing sprite is not perfectly frozen. */
function bipedIdle(phase: number, amp: number): RigPose {
  const breathe = Math.sin(phase * Math.PI * 2) * amp * 0.18;
  return [
    { ...still(HEAD.top, HEAD.bottom), dy: -breathe },
    { ...still(TORSO.top, TORSO.bottom), sy: 1 + breathe * 0.012 },
    still(LEGS.top, LEGS.bottom),
  ];
}

// --- Floating (elementals, spell FX, spectral forms) --------------------

function floatingPose(phase: number, amp: number, energetic: boolean): RigPose {
  const hover = Math.sin(phase * Math.PI * 2);
  const pulse = 1 + Math.sin(phase * Math.PI * 2) * (energetic ? 0.07 : 0.03);
  return [
    {
      ...still(0, 0.5),
      dy: -hover * amp * 0.8,
      sx: pulse,
      sy: pulse,
    },
    {
      ...still(0.5, 1),
      dy: -hover * amp * 0.45,
      sx: pulse * 0.98,
      sy: 2 - pulse, // trailing half counter-pulses, so it churns
    },
  ];
}

function floatingDeath(phase: number, amp: number): RigPose {
  const collapse = 1 - phase * 0.7;
  return [
    { ...still(0, 0.5), dy: phase * amp * 0.6, sx: collapse, sy: collapse },
    { ...still(0.5, 1), dy: phase * amp * 0.3, sx: collapse * 1.1, sy: collapse * 0.6 },
  ];
}

// --- Inert (weapons, props) ---------------------------------------------

function inertPose(phase: number, amp: number): RigPose {
  const sway = Math.sin(phase * Math.PI * 2);
  return [{ ...still(0, 1), rot: sway * 2.2, dy: -Math.abs(sway) * amp * 0.25 }];
}

// ------------------------------------------------------------------------

/**
 * Build the pose for one frame.
 *
 * @param actionName  Matched loosely, so a renamed action ("walk_fast",
 *                    "Attack A") still picks up the right motion.
 * @param frame       Index of this frame within the action.
 * @param frameCount  Total frames in the action.
 * @param cellSize    Used to scale motion amplitude to the sprite's size.
 */
export function buildPose(
  kind: RigKind,
  actionName: string,
  frame: number,
  frameCount: number,
  cellSize: number
): RigPose {
  const name = actionName.toLowerCase();

  // Amplitude scales with the sprite, so a 128px boss moves proportionally
  // to a 32px minion instead of twitching.
  const amp = Math.max(1, Math.round(cellSize / 16));

  // A 1-frame action has no motion to describe.
  if (frameCount <= 1) {
    if (kind === 'biped' && /idle|stand/.test(name)) return restPose();
    return restPose();
  }

  // Non-looping actions run 0 -> 1 across their frames and stop.
  const isOneShot = /attack|death|die|hit|cast|impact|strike/.test(name);

  // Looping actions are sampled at the MIDPOINT of each frame's slot rather
  // than its leading edge. This matters: a 2-frame walk sampled at the edges
  // lands on phase 0 and 0.5, where sin() is zero at BOTH — the two frames
  // come out pixel-identical and the sprite never strides. Sampling at
  // (frame + 0.5) / frameCount puts them at the sin() extremes instead, so a
  // 2-frame cycle reads as a full left-forward / right-forward stride.
  const phase = isOneShot
    ? frame / Math.max(1, frameCount - 1)
    : (frame + 0.5) / frameCount;

  if (kind === 'static') return restPose();

  if (kind === 'inert') {
    if (/death|die|impact/.test(name)) return floatingDeath(phase, amp);
    return inertPose(phase, amp);
  }

  if (kind === 'floating') {
    if (/death|die/.test(name)) return floatingDeath(phase, amp);
    return floatingPose(phase, amp, /attack|cast|impact|strike/.test(name));
  }

  // biped
  if (/death|die/.test(name)) return bipedDeath(phase, amp);
  if (/attack|strike|cast/.test(name)) return bipedAttack(phase, amp);
  if (/walk|run|move/.test(name)) return bipedWalk(phase, amp);
  if (/hit|flinch/.test(name)) {
    // A recoil: knocked back, head snapping hardest.
    const recoil = 1 - phase;
    return [
      { ...still(HEAD.top, HEAD.bottom), dx: -recoil * amp * 1.5, rot: -recoil * 8 },
      { ...still(TORSO.top, TORSO.bottom), dx: -recoil * amp * 1.0, rot: -recoil * 4 },
      { ...still(LEGS.top, LEGS.bottom), dx: -recoil * amp * 0.3 },
    ];
  }
  return bipedIdle(phase, amp);
}

/**
 * Mirror a pose for the sprite's facing. Left/right share one pose set; the
 * renderer flips the whole cell, so only asymmetric horizontal motion needs
 * negating here. Up/down keep the pose but damp horizontal swing, since a
 * sprite walking toward the camera shows little lateral travel.
 */
export function poseForDirection(pose: RigPose, dir: Direction): RigPose {
  if (dir === 'left' || dir === 'right') return pose;
  // Facing toward/away: reduce sideways motion, keep vertical bob and rotation.
  return pose.map((b) => ({ ...b, dx: b.dx * 0.35 }));
}
