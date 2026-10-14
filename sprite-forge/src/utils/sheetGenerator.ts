// Sprite sheet compilation, individual frame extraction, JSON atlas generation, and download helpers

import {
  ActionDefinition,
  AssetType,
  AtlasJsonExport,
  Direction,
  FIXED_DIRECTIONS,
  FrameTransform,
  SpriteAsset,
} from '../types';
import { hexToRgb } from './colorUtils';
import { RigBand, buildPose, poseForDirection, rigKindForAssetType } from './rigEngine';

// Default actions by asset type
export function getDefaultActionsForType(type: AssetType): ActionDefinition[] {
  switch (type) {
    case 'character':
    case 'enemy':
    case 'companion':
    case 'boss':
      return [
        {
          id: 'idle',
          name: 'idle',
          directionMode: '4-way',
          frameCount: 1,
          fps: 8,
          loop: true,
          frames: {},
        },
        {
          id: 'walk',
          name: 'walk',
          directionMode: '4-way',
          frameCount: 2,
          fps: 8,
          loop: true,
          frames: {},
        },
        {
          id: 'attack',
          name: 'attack',
          directionMode: '4-way',
          frameCount: 2,
          fps: 12,
          loop: false,
          frames: {},
        },
        {
          id: 'hit',
          name: 'hit',
          directionMode: '4-way',
          frameCount: 1,
          fps: 12,
          loop: false,
          frames: {},
        },
        {
          id: 'death',
          name: 'death',
          directionMode: '1-way',
          frameCount: 3,
          fps: 6,
          loop: false,
          frames: {},
        },
      ];
    case 'weapon':
    case 'prop':
      return [
        {
          id: 'idle',
          name: 'idle',
          directionMode: '1-way',
          frameCount: 1,
          fps: 8,
          loop: true,
          frames: {},
        },
      ];
    case 'skill_fx':
      return [
        {
          id: 'cast',
          name: 'cast',
          directionMode: '1-way',
          frameCount: 4,
          fps: 12,
          loop: false,
          frames: {},
        },
        {
          id: 'impact',
          name: 'impact',
          directionMode: '1-way',
          frameCount: 4,
          fps: 12,
          loop: false,
          frames: {},
        },
      ];
    case 'map_tile':
      return [
        {
          id: 'variants',
          name: 'variants',
          directionMode: '1-way',
          frameCount: 4,
          fps: 6,
          loop: false,
          frames: {},
        },
      ];
  }
}

// Generate default transform for a cell
export function getDefaultTransform(
  actionName: string,
  direction: string,
  frameIdx: number,
  rigCtx?: { frameCount: number; assetType: AssetType }
): FrameTransform {
  // Multi-frame actions default to RIGGED motion, so an untouched sheet
  // already strides/lunges/topples rather than sliding as one block.
  // `hit` keeps the flat white flash, which reads better than a deformation.
  if (rigCtx && rigCtx.frameCount > 1 && actionName.toLowerCase() !== 'hit') {
    return {
      sourceType: direction === 'right' ? 'mirror' : 'source',
      offsetX: 0,
      offsetY: 0,
      squashX: 1,
      squashY: 1,
      rotation: 0,
      tintColor: '#ffffff',
      tintOpacity: 0,
      isPlaceholder: true,
      rig: {
        action: actionName,
        frame: frameIdx,
        frameCount: rigCtx.frameCount,
        direction: (direction as Direction) || 'down',
        assetType: rigCtx.assetType,
      },
    };
  }

  // Check if it's right direction -> default mirror of left
  if (direction === 'right') {
    return {
      sourceType: 'mirror',
      offsetX: 0,
      offsetY: 0,
      squashX: 1,
      squashY: 1,
      rotation: 0,
      tintColor: '#ffffff',
      tintOpacity: 0,
      isPlaceholder: true,
    };
  }

  // Check if it's hit action -> default white flash
  if (actionName === 'hit') {
    return {
      sourceType: 'tint',
      offsetX: 0,
      offsetY: 0,
      squashX: 1,
      squashY: 1,
      rotation: 0,
      tintColor: '#ffffff',
      tintOpacity: 0.7,
      isPlaceholder: true,
    };
  }

  // Check if it's walk frame 1 -> slight bob
  if (actionName === 'walk' && frameIdx === 1) {
    return {
      sourceType: 'offset',
      offsetX: 0,
      offsetY: -1,
      squashX: 1,
      squashY: 1,
      rotation: 0,
      tintColor: '#ffffff',
      tintOpacity: 0,
      isPlaceholder: true,
    };
  }

  // Check if it's death
  if (actionName === 'death') {
    return {
      sourceType: 'offset',
      offsetX: 0,
      offsetY: frameIdx * 2,
      squashX: 1 + frameIdx * 0.1,
      squashY: 1 - frameIdx * 0.15,
      rotation: 0,
      tintColor: '#0f172a',
      tintOpacity: frameIdx * 0.35,
      isPlaceholder: true,
    };
  }

  return {
    sourceType: 'source',
    offsetX: 0,
    offsetY: 0,
    squashX: 1,
    squashY: 1,
    rotation: 0,
    tintColor: '#ffffff',
    tintOpacity: 0,
    isPlaceholder: false,
  };
}

/**
 * Draw one horizontal band of the sprite with its own transform.
 *
 * The band is clipped to its slice of the cell, then translated/rotated/scaled
 * about the band's own centre. Because each band is drawn from the same source
 * image but moved independently, the silhouette deforms internally — which is
 * what makes a stride read as a stride rather than the whole sprite sliding.
 */
function drawBand(
  ctx: CanvasRenderingContext2D,
  sourceImg: HTMLImageElement | HTMLCanvasElement,
  band: RigBand,
  cellSize: number,
  flipH: number,
  halfShift: number
) {
  const yTop = band.top * cellSize;
  const yBot = band.bottom * cellSize;
  const h = yBot - yTop;
  if (h <= 0) return;

  ctx.save();

  // Clip to this band's horizontal slice (in cell-local coordinates, origin
  // already at cell centre).
  ctx.beginPath();
  ctx.rect(-cellSize / 2, yTop - cellSize / 2, cellSize, h);
  ctx.clip();

  // Transform about the band's own vertical centre so rotation pivots at the
  // waist/neck rather than the cell centre.
  const bandCy = yTop + h / 2 - cellSize / 2;
  ctx.translate(band.dx * flipH + halfShift, band.dy);
  ctx.translate(0, bandCy);
  if (band.rot !== 0) ctx.rotate((band.rot * flipH * Math.PI) / 180);
  if (band.sx !== 1 || band.sy !== 1) ctx.scale(band.sx, band.sy);
  ctx.translate(0, -bandCy);

  ctx.drawImage(sourceImg, -cellSize / 2, -cellSize / 2, cellSize, cellSize);
  ctx.restore();
}

// Render a single transformed sprite cell onto a CanvasRenderingContext2D
export function renderCellToContext(
  ctx: CanvasRenderingContext2D,
  sourceImg: HTMLImageElement | HTMLCanvasElement,
  transform: FrameTransform,
  destX: number,
  destY: number,
  cellSize: number
) {
  if (transform.sourceType === 'empty') {
    return;
  }

  const cx = destX + cellSize / 2;
  const cy = destY + cellSize / 2;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Move origin to center of cell + offset
  ctx.translate(cx + transform.offsetX, cy + transform.offsetY);

  // Rotation
  if (transform.rotation !== 0) {
    ctx.rotate((transform.rotation * Math.PI) / 180);
  }

  // Mirror & Squash
  const flipH = transform.sourceType === 'mirror' ? -1 : 1;
  ctx.scale(flipH * transform.squashX, transform.squashY);

  if (transform.rig) {
    // Rigged: slice into bands and move each independently.
    const kind = rigKindForAssetType(transform.rig.assetType);
    const pose = poseForDirection(
      buildPose(
        kind,
        transform.rig.action,
        transform.rig.frame,
        transform.rig.frameCount,
        cellSize
      ),
      transform.rig.direction
    );

    for (const band of pose) {
      if (band.split) {
        // Split the band down the middle and drive each half the opposite
        // way — one pair of legs becomes a stride.
        ctx.save();
        ctx.beginPath();
        ctx.rect(-cellSize / 2, -cellSize / 2, cellSize / 2, cellSize);
        ctx.clip();
        drawBand(ctx, sourceImg, band, cellSize, 1, 0);
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, -cellSize / 2, cellSize / 2, cellSize);
        ctx.clip();
        drawBand(ctx, sourceImg, { ...band, dx: -band.dx }, cellSize, 1, 0);
        ctx.restore();
      } else {
        drawBand(ctx, sourceImg, band, cellSize, 1, 0);
      }
    }
  } else {
    // Draw source centered (whole-sprite transform)
    ctx.drawImage(
      sourceImg,
      -cellSize / 2,
      -cellSize / 2,
      cellSize,
      cellSize
    );
  }

  // Apply Tint if requested
  if (transform.tintOpacity > 0 && transform.tintColor) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = transform.tintColor;
    ctx.globalAlpha = Math.min(1, Math.max(0, transform.tintOpacity));
    ctx.fillRect(-cellSize / 2, -cellSize / 2, cellSize, cellSize);
  }

  ctx.restore();
}

// Build the full Sprite Sheet Canvas
export async function buildSpriteSheetCanvas(
  asset: SpriteAsset
): Promise<{
  canvas: HTMLCanvasElement;
  atlas: AtlasJsonExport;
  totalRows: number;
  totalCols: number;
}> {
  const cellSize = asset.pixelateConfig.cellSize;

  // Load the pixelated source image
  const sourceImg = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = asset.pixelatedDataUrl;
  });

  // Calculate grid dimensions
  let totalRows = 0;
  let maxCols = 1;

  for (const action of asset.actions) {
    maxCols = Math.max(maxCols, action.frameCount);
    if (action.directionMode === '4-way') {
      totalRows += 4;
    } else {
      totalRows += 1;
    }
  }

  const sheetWidth = maxCols * cellSize;
  const sheetHeight = totalRows * cellSize;

  const canvas = document.createElement('canvas');
  canvas.width = sheetWidth;
  canvas.height = sheetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get 2d context for sprite sheet');

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, sheetWidth, sheetHeight);

  // Build atlas JSON
  const atlasActions: Record<string, any> = {};
  let currentRow = 0;

  for (const action of asset.actions) {
    const startRow = currentRow;

    if (action.directionMode === '4-way') {
      // 4 directions in fixed order: down (0), up (1), left (2), right (3)
      for (let dirIdx = 0; dirIdx < 4; dirIdx++) {
        const dir = FIXED_DIRECTIONS[dirIdx];
        for (let f = 0; f < action.frameCount; f++) {
          const key = `${dir}_${f}`;
          const transform =
            action.frames[key] ||
            getDefaultTransform(action.name, dir, f, {
              frameCount: action.frameCount,
              assetType: asset.assetType,
            });

          renderCellToContext(
            ctx,
            sourceImg,
            transform,
            f * cellSize,
            currentRow * cellSize,
            cellSize
          );
        }
        currentRow++;
      }
    } else {
      // 1-way single row
      for (let f = 0; f < action.frameCount; f++) {
        const key = `default_${f}`;
        const transform =
          action.frames[key] ||
          getDefaultTransform(action.name, 'down', f, {
            frameCount: action.frameCount,
            assetType: asset.assetType,
          });

        renderCellToContext(
          ctx,
          sourceImg,
          transform,
          f * cellSize,
          currentRow * cellSize,
          cellSize
        );
      }
      currentRow++;
    }

    atlasActions[action.name] = {
      row: startRow,
      frames: action.frameCount,
      fps: action.fps,
      loop: action.loop,
    };
  }

  // Threshold alpha to guarantee exact binary alpha (no semi-transparency in final export)
  const finalImageData = ctx.getImageData(0, 0, sheetWidth, sheetHeight);
  const data = finalImageData.data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) {
      data[i] = 255;
    }
  }
  ctx.putImageData(finalImageData, 0, 0);

  const cleanId = asset.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'sprite';
  const atlas: AtlasJsonExport = {
    id: cleanId,
    type: asset.assetType,
    cell: cellSize,
    sheet: `${cleanId}.png`,
    directions: FIXED_DIRECTIONS,
    actions: atlasActions,
  };

  // Integrity validation: verify total rows matches currentRow
  if (currentRow !== totalRows) {
    throw new Error(
      `Atlas row verification failed: expected ${totalRows} rows, but rendered ${currentRow} rows.`
    );
  }

  return { canvas, atlas, totalRows, totalCols: maxCols };
}

// Extract individual frame PNG blob
export function extractIndividualFrame(
  sheetCanvas: HTMLCanvasElement,
  row: number,
  col: number,
  cellSize: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = cellSize;
    frameCanvas.height = cellSize;
    const ctx = frameCanvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Cannot get context'));
      return;
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      sheetCanvas,
      col * cellSize,
      row * cellSize,
      cellSize,
      cellSize,
      0,
      0,
      cellSize,
      cellSize
    );
    frameCanvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create blob for frame'));
    }, 'image/png');
  });
}

// Trigger browser file download
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
