// Background removal, auto-pass, flood fill, despill, and manual cutout tools

import { colorDistance, isCyanRim, RGB } from './colorUtils';
import { CutoutConfig } from '../types';

export interface CutoutResult {
  imageData: ImageData;
  transparentRatio: number;
}

// Convert image element / URL to ImageData
export async function loadImageData(src: string): Promise<{
  imageData: ImageData;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error('Failed to get 2D canvas context'));
        return;
      }
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resolve({ imageData, width: canvas.width, height: canvas.height });
    };
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

// Convert ImageData to Data URL
export function imageDataToDataUrl(imageData: ImageData): string {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.imageSmoothingEnabled = false;
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

// Clone ImageData
export function cloneImageData(source: ImageData): ImageData {
  const copy = new ImageData(
    new Uint8ClampedArray(source.data),
    source.width,
    source.height
  );
  return copy;
}

// Calculate transparent ratio
export function computeTransparencyRatio(imageData: ImageData): number {
  const data = imageData.data;
  let transparentCount = 0;
  const total = imageData.width * imageData.height;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 128) {
      transparentCount++;
    }
  }
  return total > 0 ? transparentCount / total : 0;
}

// Automatic Cutout Pass
export function runAutoCutout(
  originalData: ImageData,
  config: CutoutConfig
): ImageData {
  const { width, height } = originalData;
  const current = cloneImageData(originalData);
  const data = current.data;
  const totalPixels = width * height;

  // Step 1: Sample corners and 2% outer border ring to get background color samples
  const bgSamples: RGB[] = [];
  const borderRingX = Math.max(1, Math.floor(width * 0.02));
  const borderRingY = Math.max(1, Math.floor(height * 0.02));

  // Corner samples
  const samplePoints = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
    [borderRingX, borderRingY],
    [width - 1 - borderRingX, borderRingY],
    [borderRingX, height - 1 - borderRingY],
    [width - 1 - borderRingX, height - 1 - borderRingY],
  ];

  for (const [x, y] of samplePoints) {
    const idx = (y * width + x) * 4;
    bgSamples.push({
      r: data[idx],
      g: data[idx + 1],
      b: data[idx + 2],
    });
  }

  // Border ring sampling
  for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 30))) {
    // Top & Bottom rows
    for (let dy = 0; dy < borderRingY; dy++) {
      const topIdx = (dy * width + x) * 4;
      const botIdx = ((height - 1 - dy) * width + x) * 4;
      bgSamples.push({ r: data[topIdx], g: data[topIdx + 1], b: data[topIdx + 2] });
      bgSamples.push({ r: data[botIdx], g: data[botIdx + 1], b: data[botIdx + 2] });
    }
  }

  for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 30))) {
    // Left & Right columns
    for (let dx = 0; dx < borderRingX; dx++) {
      const leftIdx = (y * width + dx) * 4;
      const rightIdx = (y * width + (width - 1 - dx)) * 4;
      bgSamples.push({ r: data[leftIdx], g: data[leftIdx + 1], b: data[leftIdx + 2] });
      bgSamples.push({ r: data[rightIdx], g: data[rightIdx + 1], b: data[rightIdx + 2] });
    }
  }

  // Average background color
  let sumR = 0,
    sumG = 0,
    sumB = 0;
  for (const s of bgSamples) {
    sumR += s.r;
    sumG += s.g;
    sumB += s.b;
  }
  const avgBg: RGB = {
    r: sumR / bgSamples.length,
    g: sumG / bgSamples.length,
    b: sumB / bgSamples.length,
  };

  const tolerance = config.tolerance;

  // Step 2: Flood-fill inward from border pixels matching sampled background
  const visited = new Uint8Array(totalPixels);
  const queue: number[] = [];

  // Seed border pixels
  for (let x = 0; x < width; x++) {
    queue.push(0 * width + x); // top
    queue.push((height - 1) * width + x); // bottom
  }
  for (let y = 1; y < height - 1; y++) {
    queue.push(y * width + 0); // left
    queue.push(y * width + (width - 1)); // right
  }

  while (queue.length > 0) {
    const p = queue.pop()!;
    if (visited[p]) continue;
    visited[p] = 1;

    const idx = p * 4;
    const pxColor: RGB = {
      r: data[idx],
      g: data[idx + 1],
      b: data[idx + 2],
    };

    // Check if within tolerance of average background or any corner sample
    const distToAvg = colorDistance(pxColor, avgBg);
    let matchesBg = distToAvg <= tolerance;

    if (!matchesBg) {
      for (const s of bgSamples) {
        if (colorDistance(pxColor, s) <= tolerance * 0.85) {
          matchesBg = true;
          break;
        }
      }
    }

    if (matchesBg) {
      data[idx + 3] = 0; // Make transparent

      const px = p % width;
      const py = Math.floor(p / width);

      if (px > 0 && !visited[p - 1]) queue.push(p - 1);
      if (px < width - 1 && !visited[p + 1]) queue.push(p + 1);
      if (py > 0 && !visited[p - width]) queue.push(p - width);
      if (py < height - 1 && !visited[p + width]) queue.push(p + width);
    }
  }

  // Step 3: Detect flat magenta key (#FF00FF) and clear it
  const magenta: RGB = { r: 255, g: 0, b: 255 };
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    if (data[idx + 3] > 0) {
      const pxColor: RGB = { r: data[idx], g: data[idx + 1], b: data[idx + 2] };
      if (colorDistance(pxColor, magenta) <= tolerance) {
        data[idx + 3] = 0;
      }
    }
  }

  // Step 4: Island Cleanup (Remove floating islands < 0.5% area unless toggled off)
  if (config.removeIslands) {
    const minIslandPixels = Math.floor(totalPixels * (config.islandThresholdPercent / 100));
    const islandVisited = new Uint8Array(totalPixels);
    let maxRegionSize = 0;
    let maxRegionLabel = 0;
    const regions: number[][] = [];

    for (let i = 0; i < totalPixels; i++) {
      if (data[i * 4 + 3] > 0 && !islandVisited[i]) {
        const region: number[] = [];
        const regQueue = [i];
        islandVisited[i] = 1;

        while (regQueue.length > 0) {
          const curr = regQueue.pop()!;
          region.push(curr);

          const cx = curr % width;
          const cy = Math.floor(curr / width);

          const neighbors = [
            cx > 0 ? curr - 1 : -1,
            cx < width - 1 ? curr + 1 : -1,
            cy > 0 ? curr - width : -1,
            cy < height - 1 ? curr + width : -1,
          ];

          for (const n of neighbors) {
            if (n >= 0 && !islandVisited[n] && data[n * 4 + 3] > 0) {
              islandVisited[n] = 1;
              regQueue.push(n);
            }
          }
        }

        if (region.length > maxRegionSize) {
          maxRegionSize = region.length;
          maxRegionLabel = regions.length;
        }
        regions.push(region);
      }
    }

    // Delete islands below threshold that are not the largest region
    for (let r = 0; r < regions.length; r++) {
      if (r !== maxRegionLabel && regions[r].length < minIslandPixels) {
        for (const p of regions[r]) {
          data[p * 4 + 3] = 0;
        }
      }
    }
  }

  // Step 5: De-fringe & Despill
  applyEdgeProcessing(current, config.edgeDefringe, config.despillCyan);

  return current;
}

// Edge De-fringe and Cyan Despill
export function applyEdgeProcessing(
  imageData: ImageData,
  erodePx: number,
  despill: boolean
) {
  const { width, height } = imageData;
  const data = imageData.data;

  // Erode edge pixels if requested
  if (erodePx > 0) {
    for (let pass = 0; pass < erodePx; pass++) {
      const toErase: number[] = [];
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          if (data[idx + 3] > 0) {
            // Check 4 neighbors
            const leftTransparent = x === 0 || data[(y * width + (x - 1)) * 4 + 3] === 0;
            const rightTransparent = x === width - 1 || data[(y * width + (x + 1)) * 4 + 3] === 0;
            const topTransparent = y === 0 || data[((y - 1) * width + x) * 4 + 3] === 0;
            const botTransparent = y === height - 1 || data[((y + 1) * width + x) * 4 + 3] === 0;

            if (leftTransparent || rightTransparent || topTransparent || botTransparent) {
              toErase.push(idx + 3);
            }
          }
        }
      }
      for (const alphaIdx of toErase) {
        data[alphaIdx] = 0;
      }
    }
  }

  // Despill cyan: For edge pixels with high cyan saturation, desaturate to neutral dark
  if (despill) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const alpha = data[idx + 3];
        if (alpha > 0) {
          // Check if adjacent to transparent pixel (edge pixel)
          const isEdge =
            (x > 0 && data[(y * width + (x - 1)) * 4 + 3] === 0) ||
            (x < width - 1 && data[(y * width + (x + 1)) * 4 + 3] === 0) ||
            (y > 0 && data[((y - 1) * width + x) * 4 + 3] === 0) ||
            (y < height - 1 && data[((y + 1) * width + x) * 4 + 3] === 0);

          if (isEdge || alpha < 240) {
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            if (isCyanRim(r, g, b) && alpha < 200) {
              // Desaturate semi-transparent cyan bleed
              const gray = Math.round((r * 0.299 + g * 0.587 + b * 0.114) * 0.7);
              data[idx] = gray;
              data[idx + 1] = gray;
              data[idx + 2] = gray;
            }
          }
        }
      }
    }
  }
}

// Magic Wand tool: Clear color within tolerance of target pixel
export function applyMagicWand(
  imageData: ImageData,
  startX: number,
  startY: number,
  tolerance: number,
  contiguous: boolean = true
): ImageData {
  const result = cloneImageData(imageData);
  const { width, height } = result;
  const data = result.data;
  const totalPixels = width * height;

  const targetIdx = (startY * width + startX) * 4;
  const targetColor: RGB = {
    r: data[targetIdx],
    g: data[targetIdx + 1],
    b: data[targetIdx + 2],
  };

  if (contiguous) {
    const visited = new Uint8Array(totalPixels);
    const queue = [startY * width + startX];

    while (queue.length > 0) {
      const p = queue.pop()!;
      if (visited[p]) continue;
      visited[p] = 1;

      const idx = p * 4;
      const pxColor: RGB = {
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
      };

      if (colorDistance(pxColor, targetColor) <= tolerance) {
        data[idx + 3] = 0;

        const px = p % width;
        const py = Math.floor(p / width);

        if (px > 0 && !visited[p - 1]) queue.push(p - 1);
        if (px < width - 1 && !visited[p + 1]) queue.push(p + 1);
        if (py > 0 && !visited[p - width]) queue.push(p - width);
        if (py < height - 1 && !visited[p + width]) queue.push(p + width);
      }
    }
  } else {
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const pxColor: RGB = {
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
      };
      if (colorDistance(pxColor, targetColor) <= tolerance) {
        data[idx + 3] = 0;
      }
    }
  }

  return result;
}

// Erase or Restore brush
export function applyBrush(
  currentData: ImageData,
  originalData: ImageData,
  centerX: number,
  centerY: number,
  radius: number,
  mode: 'erase' | 'restore'
): ImageData {
  const result = cloneImageData(currentData);
  const { width, height } = result;
  const data = result.data;
  const origData = originalData.data;

  const r2 = radius * radius;
  const minX = Math.max(0, Math.floor(centerX - radius));
  const maxX = Math.min(width - 1, Math.ceil(centerX + radius));
  const minY = Math.max(0, Math.floor(centerY - radius));
  const maxY = Math.min(height - 1, Math.ceil(centerY + radius));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      if (dx * dx + dy * dy <= r2) {
        const idx = (y * width + x) * 4;
        if (mode === 'erase') {
          data[idx + 3] = 0;
        } else {
          // Restore from original
          data[idx] = origData[idx];
          data[idx + 1] = origData[idx + 1];
          data[idx + 2] = origData[idx + 2];
          data[idx + 3] = origData[idx + 3];
        }
      }
    }
  }

  return result;
}

// Rectangle keep: delete everything outside rect
export function applyRectangleKeep(
  imageData: ImageData,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): ImageData {
  const result = cloneImageData(imageData);
  const { width, height } = result;
  const data = result.data;

  const minX = Math.max(0, Math.min(x1, x2));
  const maxX = Math.min(width, Math.max(x1, x2));
  const minY = Math.max(0, Math.min(y1, y2));
  const maxY = Math.min(height, Math.max(y1, y2));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x < minX || x >= maxX || y < minY || y >= maxY) {
        data[(y * width + x) * 4 + 3] = 0;
      }
    }
  }

  return result;
}
