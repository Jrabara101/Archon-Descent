// Color palettes and quantization helpers for Sprite Forge

export interface RGB {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export const BIOME_PALETTES = {
  catacombs: ['#1e293b', '#0f172a', '#334155'],
  forges: ['#451a03', '#290b02', '#7c2d12', '#9a3412', '#431407'],
  void: ['#2e1065', '#17053b', '#4c1d95', '#5b21b6'],
  accent: '#22d3ee', // Shared rim-light accent
};

export function hexToRgb(hex: string): RGB {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
    a: 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const hexR = clamp(r).toString(16).padStart(2, '0');
  const hexG = clamp(g).toString(16).padStart(2, '0');
  const hexB = clamp(b).toString(16).padStart(2, '0');
  return `#${hexR}${hexG}${hexB}`;
}

export function colorDistanceSq(c1: RGB, c2: RGB): number {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return dr * dr + dg * dg + db * db;
}

export function colorDistance(c1: RGB, c2: RGB): number {
  return Math.sqrt(colorDistanceSq(c1, c2));
}

// Check if pixel is close to cyan accent (#22d3ee)
export function isCyanRim(r: number, g: number, b: number): boolean {
  // #22d3ee is R:34, G:211, B:238
  // High green & blue, low red
  return g > 150 && b > 180 && r < 100;
}

// Find nearest color in a list of hex codes
export function findNearestColor(pixel: RGB, paletteHexes: string[]): RGB {
  let bestDist = Infinity;
  let bestHex = paletteHexes[0];

  for (const hex of paletteHexes) {
    const rgb = hexToRgb(hex);
    const dist = colorDistanceSq(pixel, rgb);
    if (dist < bestDist) {
      bestDist = dist;
      bestHex = hex;
    }
  }

  return hexToRgb(bestHex);
}

// Median Cut Quantization implementation
export function medianCut(pixels: RGB[], maxColors: number): RGB[] {
  if (pixels.length === 0) return [];
  if (pixels.length <= maxColors) {
    return pixels;
  }

  interface ColorBox {
    colors: RGB[];
    volume: number;
    channel: 'r' | 'g' | 'b';
  }

  function getBoundingBox(colors: RGB[]): ColorBox {
    let minR = 255,
      maxR = 0;
    let minG = 255,
      maxG = 0;
    let minB = 255,
      maxB = 0;

    for (const c of colors) {
      if (c.r < minR) minR = c.r;
      if (c.r > maxR) maxR = c.r;
      if (c.g < minG) minG = c.g;
      if (c.g > maxG) maxG = c.g;
      if (c.b < minB) minB = c.b;
      if (c.b > maxB) maxB = c.b;
    }

    const rangeR = maxR - minR;
    const rangeG = maxG - minG;
    const rangeB = maxB - minB;

    let channel: 'r' | 'g' | 'b' = 'r';
    let maxRange = rangeR;
    if (rangeG > maxRange) {
      maxRange = rangeG;
      channel = 'g';
    }
    if (rangeB > maxRange) {
      channel = 'b';
    }

    return {
      colors,
      volume: (rangeR + 1) * (rangeG + 1) * (rangeB + 1),
      channel,
    };
  }

  let boxes: ColorBox[] = [getBoundingBox(pixels)];

  while (boxes.length < maxColors) {
    // Sort boxes by volume descending
    boxes.sort((a, b) => b.volume - a.volume);
    const largestBox = boxes.shift()!;

    if (largestBox.colors.length <= 1 || largestBox.volume === 0) {
      boxes.push(largestBox);
      break;
    }

    const ch = largestBox.channel;
    largestBox.colors.sort((a, b) => a[ch] - b[ch]);

    const mid = Math.floor(largestBox.colors.length / 2);
    const left = largestBox.colors.slice(0, mid);
    const right = largestBox.colors.slice(mid);

    if (left.length > 0) boxes.push(getBoundingBox(left));
    if (right.length > 0) boxes.push(getBoundingBox(right));
  }

  // Calculate average color for each box
  return boxes.map((box) => {
    let sumR = 0,
      sumG = 0,
      sumB = 0;
    for (const c of box.colors) {
      sumR += c.r;
      sumG += c.g;
      sumB += c.b;
    }
    const count = box.colors.length || 1;
    return {
      r: Math.round(sumR / count),
      g: Math.round(sumG / count),
      b: Math.round(sumB / count),
      a: 255,
    };
  });
}
