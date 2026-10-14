// Downsampling, palette quantization, alpha threshold, outline, rim-light generator

import {
  BIOME_PALETTES,
  findNearestColor,
  hexToRgb,
  medianCut,
  RGB,
  rgbToHex,
} from './colorUtils';
import { PixelateConfig } from '../types';

export interface PixelateResult {
  imageData: ImageData;
  colorCount: number;
  usedColors: string[];
}

// Auto-trim to alpha bounding box and return a square ImageData with specified padding
export function autoTrimToSquare(
  source: ImageData,
  padding: number = 4
): ImageData {
  const { width, height } = source;
  const data = source.data;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If completely empty, return original
  if (maxX < minX || maxY < minY) {
    return source;
  }

  const contentWidth = maxX - minX + 1;
  const contentHeight = maxY - minY + 1;
  const maxDim = Math.max(contentWidth, contentHeight);

  // Square size includes content + padding * 2
  const squareSize = maxDim + padding * 2;
  const squareData = new ImageData(squareSize, squareSize);
  const sqData = squareData.data;

  // Center the content in the square
  const startX = Math.floor((squareSize - contentWidth) / 2);
  const startY = Math.floor((squareSize - contentHeight) / 2);

  for (let y = 0; y < contentHeight; y++) {
    for (let x = 0; x < contentWidth; x++) {
      const srcIdx = ((minY + y) * width + (minX + x)) * 4;
      const dstIdx = ((startY + y) * squareSize + (startX + x)) * 4;

      sqData[dstIdx] = data[srcIdx];
      sqData[dstIdx + 1] = data[srcIdx + 1];
      sqData[dstIdx + 2] = data[srcIdx + 2];
      sqData[dstIdx + 3] = data[srcIdx + 3];
    }
  }

  return squareData;
}

// Main Pixelate & Palette pipeline
export function runPixelateProcess(
  sourceData: ImageData,
  config: PixelateConfig
): PixelateResult {
  // Step 1: Trim & square if enabled
  const trimmed = config.autoTrim
    ? autoTrimToSquare(sourceData, config.trimPadding)
    : sourceData;

  const targetSize = config.cellSize;
  const srcW = trimmed.width;
  const srcH = trimmed.height;
  const srcData = trimmed.data;

  const outData = new ImageData(targetSize, targetSize);
  const out = outData.data;

  const scaleX = srcW / targetSize;
  const scaleY = srcH / targetSize;

  // Step 2: Downsample to targetSize x targetSize
  for (let dy = 0; dy < targetSize; dy++) {
    for (let dx = 0; dx < targetSize; dx++) {
      const srcX0 = Math.floor(dx * scaleX);
      const srcX1 = Math.min(srcW, Math.floor((dx + 1) * scaleX));
      const srcY0 = Math.floor(dy * scaleY);
      const srcY1 = Math.min(srcH, Math.floor((dy + 1) * scaleY));

      const outIdx = (dy * targetSize + dx) * 4;

      if (config.downsampleMethod === 'nearest') {
        // Nearest neighbor: pick center pixel
        const centerX = Math.min(srcW - 1, Math.floor((srcX0 + srcX1) / 2));
        const centerY = Math.min(srcH - 1, Math.floor((srcY0 + srcY1) / 2));
        const srcIdx = (centerY * srcW + centerX) * 4;

        const a = srcData[srcIdx + 3];
        if (a >= config.alphaThreshold) {
          out[outIdx] = srcData[srcIdx];
          out[outIdx + 1] = srcData[srcIdx + 1];
          out[outIdx + 2] = srcData[srcIdx + 2];
          out[outIdx + 3] = 255;
        } else {
          out[outIdx + 3] = 0;
        }
      } else if (config.downsampleMethod === 'box_average') {
        // Box average of opaque pixels
        let sumR = 0,
          sumG = 0,
          sumB = 0,
          sumA = 0;
        let count = 0;

        for (let sy = srcY0; sy < srcY1; sy++) {
          for (let sx = srcX0; sx < srcX1; sx++) {
            const sIdx = (sy * srcW + sx) * 4;
            const a = srcData[sIdx + 3];
            sumA += a;
            if (a >= config.alphaThreshold) {
              sumR += srcData[sIdx];
              sumG += srcData[sIdx + 1];
              sumB += srcData[sIdx + 2];
              count++;
            }
          }
        }

        const totalPixelsInBlock = (srcX1 - srcX0) * (srcY1 - srcY0) || 1;
        const avgAlpha = sumA / totalPixelsInBlock;

        if (count > 0 && avgAlpha >= config.alphaThreshold) {
          out[outIdx] = Math.round(sumR / count);
          out[outIdx + 1] = Math.round(sumG / count);
          out[outIdx + 2] = Math.round(sumB / count);
          out[outIdx + 3] = 255;
        } else {
          out[outIdx + 3] = 0;
        }
      } else {
        // Dominant Color (DEFAULT - most frequent color in block quantized by 16-step buckets)
        const colorFrequency = new Map<string, { r: number; g: number; b: number; count: number }>();
        let opaquePixels = 0;
        let totalAlpha = 0;

        for (let sy = srcY0; sy < srcY1; sy++) {
          for (let sx = srcX0; sx < srcX1; sx++) {
            const sIdx = (sy * srcW + sx) * 4;
            const a = srcData[sIdx + 3];
            totalAlpha += a;

            if (a >= config.alphaThreshold) {
              opaquePixels++;
              // Bucket color slightly to cluster minor noise
              const r = srcData[sIdx];
              const g = srcData[sIdx + 1];
              const b = srcData[sIdx + 2];
              const bucketKey = `${Math.round(r / 8) * 8}_${Math.round(g / 8) * 8}_${Math.round(b / 8) * 8}`;

              const existing = colorFrequency.get(bucketKey);
              if (existing) {
                existing.count++;
                existing.r += r;
                existing.g += g;
                existing.b += b;
              } else {
                colorFrequency.set(bucketKey, { r, g, b, count: 1 });
              }
            }
          }
        }

        const blockArea = (srcX1 - srcX0) * (srcY1 - srcY0) || 1;
        if (opaquePixels > 0 && totalAlpha / blockArea >= config.alphaThreshold / 2) {
          let maxCount = 0;
          let domColor = { r: 0, g: 0, b: 0, count: 1 };

          for (const item of colorFrequency.values()) {
            if (item.count > maxCount) {
              maxCount = item.count;
              domColor = item;
            }
          }

          out[outIdx] = Math.round(domColor.r / domColor.count);
          out[outIdx + 1] = Math.round(domColor.g / domColor.count);
          out[outIdx + 2] = Math.round(domColor.b / domColor.count);
          out[outIdx + 3] = 255;
        } else {
          out[outIdx + 3] = 0;
        }
      }
    }
  }

  // Step 3: Palette Quantization
  const opaquePixels: RGB[] = [];
  for (let i = 0; i < targetSize * targetSize; i++) {
    if (out[i * 4 + 3] === 255) {
      opaquePixels.push({
        r: out[i * 4],
        g: out[i * 4 + 1],
        b: out[i * 4 + 2],
      });
    }
  }

  if (config.quantizeMode === 'biome' && config.biome !== 'none') {
    const paletteHexes = [
      ...BIOME_PALETTES[config.biome],
      BIOME_PALETTES.accent,
    ];

    for (let i = 0; i < targetSize * targetSize; i++) {
      if (out[i * 4 + 3] === 255) {
        const px: RGB = {
          r: out[i * 4],
          g: out[i * 4 + 1],
          b: out[i * 4 + 2],
        };
        const mapped = findNearestColor(px, paletteHexes);
        out[i * 4] = mapped.r;
        out[i * 4 + 1] = mapped.g;
        out[i * 4 + 2] = mapped.b;
      }
    }
  } else if (config.quantizeMode === 'median_cut' && opaquePixels.length > 0) {
    const palette = medianCut(opaquePixels, config.medianCutColors);
    const paletteHexes = palette.map((p) => rgbToHex(p.r, p.g, p.b));

    for (let i = 0; i < targetSize * targetSize; i++) {
      if (out[i * 4 + 3] === 255) {
        const px: RGB = {
          r: out[i * 4],
          g: out[i * 4 + 1],
          b: out[i * 4 + 2],
        };
        const mapped = findNearestColor(px, paletteHexes);
        out[i * 4] = mapped.r;
        out[i * 4 + 1] = mapped.g;
        out[i * 4 + 2] = mapped.b;
      }
    }
  }

  // Step 4: Outline (1px dark outline around silhouette)
  if (config.outline) {
    const outlineRgb = hexToRgb(config.outlineColor || '#0f172a');
    const outlineIndices: number[] = [];

    for (let y = 0; y < targetSize; y++) {
      for (let x = 0; x < targetSize; x++) {
        const idx = (y * targetSize + x) * 4;
        if (out[idx + 3] === 0) {
          // Check if adjacent to an opaque pixel
          const hasOpaqueNeighbor =
            (x > 0 && out[(y * targetSize + (x - 1)) * 4 + 3] === 255) ||
            (x < targetSize - 1 && out[(y * targetSize + (x + 1)) * 4 + 3] === 255) ||
            (y > 0 && out[((y - 1) * targetSize + x) * 4 + 3] === 255) ||
            (y < targetSize - 1 && out[((y + 1) * targetSize + x) * 4 + 3] === 255);

          if (hasOpaqueNeighbor) {
            outlineIndices.push(idx);
          }
        }
      }
    }

    for (const idx of outlineIndices) {
      out[idx] = outlineRgb.r;
      out[idx + 1] = outlineRgb.g;
      out[idx + 2] = outlineRgb.b;
      out[idx + 3] = 255;
    }
  }

  // Step 5: Rim-Light (1px #22d3ee highlight along top and upper-left silhouette edges)
  if (config.rimLight) {
    const rimRgb = hexToRgb(config.rimLightColor || '#22d3ee');
    const rimIndices: number[] = [];

    for (let y = 0; y < targetSize; y++) {
      for (let x = 0; x < targetSize; x++) {
        const idx = (y * targetSize + x) * 4;
        if (out[idx + 3] === 255) {
          // Check if top or left is transparent
          const topTransparent = y === 0 || out[((y - 1) * targetSize + x) * 4 + 3] === 0;
          const leftTransparent = x === 0 || out[(y * targetSize + (x - 1)) * 4 + 3] === 0;

          if (topTransparent || leftTransparent) {
            rimIndices.push(idx);
          }
        }
      }
    }

    for (const idx of rimIndices) {
      out[idx] = rimRgb.r;
      out[idx + 1] = rimRgb.g;
      out[idx + 2] = rimRgb.b;
    }
  }

  // Step 6: Collect used colors
  const colorSet = new Set<string>();
  for (let i = 0; i < targetSize * targetSize; i++) {
    if (out[i * 4 + 3] === 255) {
      const hex = rgbToHex(out[i * 4], out[i * 4 + 1], out[i * 4 + 2]);
      colorSet.add(hex);
    }
  }

  const usedColors = Array.from(colorSet);

  return {
    imageData: outData,
    colorCount: usedColors.length,
    usedColors,
  };
}
