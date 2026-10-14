export type AssetType =
  | 'character'
  | 'enemy'
  | 'boss'
  | 'companion'
  | 'weapon'
  | 'skill_fx'
  | 'map_tile'
  | 'prop';

export type Direction = 'down' | 'up' | 'left' | 'right';
export const FIXED_DIRECTIONS: Direction[] = ['down', 'up', 'left', 'right'];

export type DownsampleMethod = 'dominant' | 'nearest' | 'box_average';
export type BiomePalette = 'none' | 'catacombs' | 'forges' | 'void';
export type QuantizeMode = 'none' | 'median_cut' | 'biome';

export interface FrameTransform {
  sourceType: 'source' | 'mirror' | 'offset' | 'squash' | 'rotate' | 'tint' | 'empty';
  offsetX: number; // in pixels (-32 to 32)
  offsetY: number; // in pixels (-32 to 32)
  squashY: number; // 0.8 to 1.2
  squashX: number; // 0.8 to 1.2
  rotation: 0 | 90 | 180 | 270;
  tintColor: string; // hex
  tintOpacity: number; // 0 to 1
  isPlaceholder?: boolean;
  /**
   * When set, the cell is rendered by the rig engine: the sprite is sliced
   * into horizontal bands that move independently (legs stride, torso leans,
   * head bobs) instead of the whole image translating as one block.
   */
  rig?: {
    action: string;
    frame: number;
    frameCount: number;
    direction: Direction;
    assetType: AssetType;
  };
}

export interface ActionDefinition {
  id: string;
  name: string;
  directionMode: '4-way' | '1-way';
  frameCount: number;
  fps: number;
  loop: boolean;
  // Key: `${direction}_${frameIndex}` or `default_${frameIndex}`
  frames: Record<string, FrameTransform>;
}

export interface PixelateConfig {
  cellSize: 16 | 32 | 48 | 64 | 96 | 128;
  downsampleMethod: DownsampleMethod;
  autoTrim: boolean;
  trimPadding: number; // 0 to 16
  quantizeMode: QuantizeMode;
  medianCutColors: number; // 4 to 64
  biome: BiomePalette;
  alphaThreshold: number; // 0 to 255
  outline: boolean;
  outlineColor: string;
  rimLight: boolean;
  rimLightColor: string; // default #22d3ee
}

export interface CutoutConfig {
  tolerance: number; // 0 to 128
  removeIslands: boolean;
  islandThresholdPercent: number; // 0.1 to 2.0
  featherAlpha: boolean;
  despillCyan: boolean;
  edgeDefringe: number; // 0 to 3 pixels erosion
}

export interface SpriteAsset {
  id: string;
  name: string;
  filename: string;
  width: number;
  height: number;
  assetType: AssetType;
  scale: number; // 1 or 2 for boss
  rawImageSrc: string; // Base64 / Blob URL of original image
  cutoutDataUrl: string; // Base64 after cutout pass
  pixelatedDataUrl: string; // Base64 after downsample/palette
  cutoutConfig: CutoutConfig;
  pixelateConfig: PixelateConfig;
  actions: ActionDefinition[];
  transparentRatio: number; // 0 to 1
  colorCount: number;
  usedColors: string[];
  createdAt: number;
}

export interface AtlasActionExport {
  row: number;
  frames: number;
  fps: number;
  loop: boolean;
}

export interface AtlasJsonExport {
  id: string;
  type: string;
  cell: number;
  sheet: string;
  directions: string[];
  actions: Record<string, AtlasActionExport>;
}
