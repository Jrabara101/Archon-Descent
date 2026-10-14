import React, { useState, useEffect, useRef } from 'react';
import {
  Grid,
  Palette,
  Sliders,
  Sparkles,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Columns,
  Layers,
  AlertTriangle,
  Check,
  RefreshCw,
} from 'lucide-react';
import {
  BiomePalette,
  DownsampleMethod,
  PixelateConfig,
  QuantizeMode,
  SpriteAsset,
} from '../types';
import { BIOME_PALETTES } from '../utils/colorUtils';
import { imageDataToDataUrl, loadImageData } from '../utils/cutoutProcessor';
import { runPixelateProcess } from '../utils/pixelateProcessor';

interface PixelateScreenProps {
  asset: SpriteAsset;
  onUpdateAsset: (updated: Partial<SpriteAsset>) => void;
  onProceedToLayout: () => void;
}

export const PixelateScreen: React.FC<PixelateScreenProps> = ({
  asset,
  onUpdateAsset,
  onProceedToLayout,
}) => {
  const [config, setConfig] = useState<PixelateConfig>(asset.pixelateConfig);
  const [viewMode, setViewMode] = useState<'split' | 'sideBySide' | 'pixelOnly'>('split');
  const [splitPos, setSplitPos] = useState(50); // percentage (0 to 100)
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [zoom, setZoom] = useState(2);
  const [isProcessing, setIsProcessing] = useState(false);

  const [colorCount, setColorCount] = useState(asset.colorCount || 0);
  const [usedColors, setUsedColors] = useState<string[]>(asset.usedColors || []);

  const beforeCanvasRef = useRef<HTMLCanvasElement>(null);
  const afterCanvasRef = useRef<HTMLCanvasElement>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const cutoutImageRef = useRef<ImageData | null>(null);

  // Load cutout data and process pixelate
  useEffect(() => {
    let isCancelled = false;

    const run = async () => {
      setIsProcessing(true);
      try {
        const sourceUrl = asset.cutoutDataUrl || asset.rawImageSrc;
        const { imageData } = await loadImageData(sourceUrl);
        if (isCancelled) return;
        cutoutImageRef.current = imageData;

        // Render Before Canvas
        if (beforeCanvasRef.current) {
          beforeCanvasRef.current.width = imageData.width;
          beforeCanvasRef.current.height = imageData.height;
          const ctx = beforeCanvasRef.current.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = false;
            ctx.putImageData(imageData, 0, 0);
          }
        }

        // Run Pixelate Pipeline
        const result = runPixelateProcess(imageData, config);
        if (isCancelled) return;

        // Render After Canvas
        if (afterCanvasRef.current) {
          afterCanvasRef.current.width = result.imageData.width;
          afterCanvasRef.current.height = result.imageData.height;
          const ctx = afterCanvasRef.current.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = false;
            ctx.putImageData(result.imageData, 0, 0);
          }
        }

        setColorCount(result.colorCount);
        setUsedColors(result.usedColors);

        const pixelatedUrl = imageDataToDataUrl(result.imageData);
        onUpdateAsset({
          pixelateConfig: config,
          pixelatedDataUrl: pixelatedUrl,
          colorCount: result.colorCount,
          usedColors: result.usedColors,
        });
      } catch (err) {
        console.error('Error running pixelate process:', err);
      } finally {
        setIsProcessing(false);
      }
    };

    run();

    return () => {
      isCancelled = true;
    };
  }, [config, asset.cutoutDataUrl, asset.id]);

  const handleConfigChange = (changes: Partial<PixelateConfig>) => {
    setConfig((prev) => ({ ...prev, ...changes }));
  };

  // Split handle dragging
  const handleSplitMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplit(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingSplit || !splitContainerRef.current) return;
    const rect = splitContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSplitPos(pct);
  };

  const handleMouseUp = () => {
    setIsDraggingSplit(false);
  };

  return (
    <div
      className="flex-1 flex overflow-hidden bg-[#0f172a] select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Main View Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center p-4 bg-[#0a0f1d]">
        {/* Top Floating Control Bar */}
        <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-[#1e293b]/95 border border-[#334155] p-0.5 rounded shadow-lg pointer-events-auto">
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold tracking-wider uppercase transition ${
                viewMode === 'split'
                  ? 'bg-[#22d3ee] text-[#0f172a]'
                  : 'text-[#94a3b8] hover:text-[#e2e8f0]'
              }`}
            >
              <Columns className="w-3 h-3" />
              <span>Split</span>
            </button>
            <button
              onClick={() => setViewMode('sideBySide')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold tracking-wider uppercase transition ${
                viewMode === 'sideBySide'
                  ? 'bg-[#22d3ee] text-[#0f172a]'
                  : 'text-[#94a3b8] hover:text-[#e2e8f0]'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Side-by-Side</span>
            </button>
            <button
              onClick={() => setViewMode('pixelOnly')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold tracking-wider uppercase transition ${
                viewMode === 'pixelOnly'
                  ? 'bg-[#22d3ee] text-[#0f172a]'
                  : 'text-[#94a3b8] hover:text-[#e2e8f0]'
              }`}
            >
              <Grid className="w-3 h-3" />
              <span>Sprite Only</span>
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-[#1e293b]/95 border border-[#334155] p-0.5 rounded shadow-lg pointer-events-auto text-xs font-mono">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.5))}
              className="p-1 rounded hover:bg-[#334155] text-[#94a3b8] hover:text-[#e2e8f0] transition"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-[#22d3ee] font-bold px-1.5 min-w-[36px] text-center">
              {zoom}x
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(8, z + 0.5))}
              className="p-1 rounded hover:bg-[#334155] text-[#94a3b8] hover:text-[#e2e8f0] transition"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(2)}
              className="p-1 rounded hover:bg-[#334155] text-[#94a3b8] hover:text-[#e2e8f0] transition"
              title="Reset Zoom"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* View Canvas Display */}
        <div className="flex-1 flex items-center justify-center w-full h-full overflow-auto p-6">
          {viewMode === 'split' && (
            <div
              ref={splitContainerRef}
              className="relative rounded border border-[#334155] overflow-hidden shadow-2xl"
              style={{
                width: `${512 * zoom}px`,
                height: `${512 * zoom}px`,
                backgroundColor: '#0f172a',
                backgroundImage:
                  'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
              }}
            >
              {/* Layer 1: Pixel Output (Full) */}
              <canvas
                ref={afterCanvasRef}
                className="absolute inset-0 w-full h-full object-contain pixelated pointer-events-none"
              />

              {/* Layer 2: Original Cutout (Clipped to splitPos) */}
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ width: `${splitPos}%` }}
              >
                <canvas
                  ref={beforeCanvasRef}
                  className="w-full h-full object-contain pixelated pointer-events-none"
                  style={{ width: `${512 * zoom}px`, height: `${512 * zoom}px` }}
                />
              </div>

              {/* Split Drag Divider Line */}
              <div
                onMouseDown={handleSplitMouseDown}
                className="absolute top-0 bottom-0 w-0.5 bg-[#22d3ee] shadow-lg shadow-[#22d3ee]/80 cursor-ew-resize flex items-center justify-center group"
                style={{ left: `${splitPos}%`, transform: 'translateX(-50%)' }}
              >
                <div className="w-5 h-5 rounded bg-[#0f172a] border border-[#22d3ee] text-[#22d3ee] flex items-center justify-center text-[9px] font-bold shadow-md">
                  ⇄
                </div>
              </div>

              {/* Badges */}
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#0f172a]/90 text-[#94a3b8] text-[9px] font-mono border border-[#334155] pointer-events-none uppercase font-bold">
                Source Cutout (1024×1024)
              </div>
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-[#0f172a]/90 text-[#22d3ee] text-[9px] font-mono border border-[#22d3ee]/60 pointer-events-none font-bold uppercase">
                Pixelated ({config.cellSize}×{config.cellSize})
              </div>
            </div>
          )}

          {viewMode === 'sideBySide' && (
            <div className="flex flex-col lg:flex-row items-center gap-6 max-w-full">
              {/* Before Box */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center justify-between w-full text-[10px] font-mono text-[#94a3b8] px-1">
                  <span>SOURCE IMAGE</span>
                  <span className="text-[#e2e8f0] font-bold">1024×1024 PX</span>
                </div>
                <div
                  className="rounded border border-[#334155] overflow-hidden shadow-xl"
                  style={{
                    width: `${256 * zoom}px`,
                    height: `${256 * zoom}px`,
                    backgroundColor: '#0f172a',
                    backgroundImage:
                      'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                    backgroundSize: '16px 16px',
                  }}
                >
                  <canvas
                    ref={beforeCanvasRef}
                    className="w-full h-full object-contain pixelated"
                  />
                </div>
              </div>

              {/* Center Downsample Indicator Flow */}
              <div className="flex flex-col items-center gap-1 px-2 text-center select-none">
                <div className="flex items-center gap-2 text-[#22d3ee]">
                  <span className="w-8 h-px bg-[#22d3ee]/40 hidden sm:block"></span>
                  <ArrowRight className="w-5 h-5 text-[#22d3ee] animate-pulse" />
                  <span className="w-8 h-px bg-[#22d3ee]/40 hidden sm:block"></span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#22d3ee] font-mono">
                  DOWNSAMPLE
                </span>
                <span className="text-[9px] font-mono text-[#94a3b8] uppercase">
                  {config.downsampleMethod.replace('_', ' ')}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-[#1e293b] border border-[#334155] text-[9px] font-mono text-[#94a3b8]">
                  99.6% REDUCTION
                </span>
              </div>

              {/* After Box */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center justify-between w-full text-[10px] font-mono px-1">
                  <span className="text-[#22d3ee] font-bold">SPRITE OUTPUT</span>
                  <span className="text-[#22d3ee] font-bold">{config.cellSize}×{config.cellSize} PX</span>
                </div>
                <div
                  className="rounded border border-[#22d3ee] overflow-hidden shadow-xl ring-1 ring-[#22d3ee]/50 shadow-[0_0_30px_rgba(34,211,238,0.15)]"
                  style={{
                    width: `${256 * zoom}px`,
                    height: `${256 * zoom}px`,
                    backgroundColor: '#0f172a',
                    backgroundImage:
                      'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                    backgroundSize: '16px 16px',
                  }}
                >
                  <canvas
                    ref={afterCanvasRef}
                    className="w-full h-full object-contain pixelated"
                  />
                </div>
              </div>
            </div>
          )}

          {viewMode === 'pixelOnly' && (
            <div className="flex flex-col items-center gap-3">
              <div
                className="rounded border border-[#22d3ee] overflow-hidden shadow-2xl ring-1 ring-[#22d3ee] shadow-[0_0_30px_rgba(34,211,238,0.2)]"
                style={{
                  width: `${384 * zoom}px`,
                  height: `${384 * zoom}px`,
                  backgroundColor: '#0f172a',
                  backgroundImage:
                    'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                  backgroundSize: '16px 16px',
                }}
              >
                <canvas
                  ref={afterCanvasRef}
                  className="w-full h-full object-contain pixelated"
                />
              </div>
              <p className="text-[11px] text-[#94a3b8] font-mono uppercase tracking-wider">
                {config.cellSize}×{config.cellSize} PX NATIVE SPRITE GRID
              </p>
            </div>
          )}
        </div>

        {/* Viewport High-density Status Bar */}
        <div className="w-full bg-[#1e293b]/90 border-t border-[#334155] px-4 py-1.5 flex items-center justify-between text-[10px] font-mono text-[#94a3b8]">
          <div className="flex items-center gap-3">
            <span className="text-[#22d3ee] font-bold uppercase">
              {config.quantizeMode === 'biome' ? `${config.biome} Biome Applied` : config.quantizeMode === 'median_cut' ? 'Median Cut Quantized' : 'Natural Quantization'}
            </span>
            <span className="text-[#475569]">|</span>
            <span>PALETTE: <strong className="text-[#e2e8f0]">{colorCount} COLORS</strong></span>
            <span className="text-[#475569]">|</span>
            <span>ALPHA: <strong className="text-[#e2e8f0]">BINARY</strong></span>
          </div>

          <div className="flex items-center gap-1">
            {usedColors.slice(0, 8).map((hex) => (
              <div
                key={hex}
                className="w-3 h-3 rounded-[1px] border border-[#334155]"
                style={{ backgroundColor: hex }}
                title={hex}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right Control Panel */}
      <div className="w-80 bg-[#1e293b] border-l border-[#334155] flex flex-col shrink-0 h-full overflow-y-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-[#334155]">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#22d3ee]">
              PIXEL ENGINE CONFIG
            </h2>
            <p className="text-[10px] text-[#94a3b8] font-mono">DOWNSAMPLE & QUANTIZATION</p>
          </div>
          {isProcessing && <RefreshCw className="w-3.5 h-3.5 text-[#22d3ee] animate-spin" />}
        </div>

        {/* Target Cell Size */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold uppercase tracking-widest text-[#94a3b8] text-[10px]">
              TARGET CELL SIZE
            </span>
            <span className="text-[10px] font-mono text-[#22d3ee] font-bold">
              {config.cellSize === 64
                ? '64px (2× TILE)'
                : `${config.cellSize}px`}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {[16, 32, 48, 64, 96, 128].map((size) => (
              <button
                key={size}
                onClick={() => handleConfigChange({ cellSize: size as any })}
                className={`py-1.5 px-1 rounded border text-[11px] font-mono font-bold transition ${
                  config.cellSize === size
                    ? 'bg-[#22d3ee] text-[#0f172a] border-[#22d3ee]'
                    : 'bg-[#0f172a] border-[#334155] text-[#94a3b8] hover:text-[#e2e8f0]'
                }`}
              >
                {size}×{size}
              </button>
            ))}
          </div>
        </div>

        {/* Downsampling Algorithm */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">
            DOWNSAMPLE METHOD
          </label>
          <div className="space-y-1">
            <button
              onClick={() => handleConfigChange({ downsampleMethod: 'dominant' })}
              className={`w-full p-2 rounded border text-left flex items-center justify-between transition ${
                config.downsampleMethod === 'dominant'
                  ? 'bg-[#0f172a] border-[#22d3ee] text-[#22d3ee]'
                  : 'bg-[#0f172a] border-[#334155] text-[#94a3b8] hover:text-[#e2e8f0]'
              }`}
            >
              <div>
                <div className="text-[11px] font-bold">Dominant Color (Recommended)</div>
                <div className="text-[9px] text-[#94a3b8]">Most frequent source color per block</div>
              </div>
              {config.downsampleMethod === 'dominant' && (
                <Check className="w-3.5 h-3.5 text-[#22d3ee] shrink-0" />
              )}
            </button>

            <button
              onClick={() => handleConfigChange({ downsampleMethod: 'nearest' })}
              className={`w-full p-2 rounded border text-left flex items-center justify-between transition ${
                config.downsampleMethod === 'nearest'
                  ? 'bg-[#0f172a] border-[#22d3ee] text-[#22d3ee]'
                  : 'bg-[#0f172a] border-[#334155] text-[#94a3b8] hover:text-[#e2e8f0]'
              }`}
            >
              <div>
                <div className="text-[11px] font-bold">Nearest Neighbour</div>
                <div className="text-[9px] text-[#94a3b8]">Sharpest single sample point</div>
              </div>
              {config.downsampleMethod === 'nearest' && (
                <Check className="w-3.5 h-3.5 text-[#22d3ee] shrink-0" />
              )}
            </button>

            <button
              onClick={() => handleConfigChange({ downsampleMethod: 'box_average' })}
              className={`w-full p-2 rounded border text-left flex items-center justify-between transition ${
                config.downsampleMethod === 'box_average'
                  ? 'bg-[#0f172a] border-[#22d3ee] text-[#22d3ee]'
                  : 'bg-[#0f172a] border-[#334155] text-[#94a3b8] hover:text-[#e2e8f0]'
              }`}
            >
              <div>
                <div className="text-[11px] font-bold">Box Average</div>
                <div className="text-[9px] text-[#94a3b8]">Averages block RGB</div>
              </div>
              {config.downsampleMethod === 'box_average' && (
                <Check className="w-3.5 h-3.5 text-[#22d3ee] shrink-0" />
              )}
            </button>
          </div>
        </div>

        {/* Auto-trim & Square Padding */}
        <div className="bg-[#0f172a] border border-[#334155] rounded p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-[11px] font-bold text-[#e2e8f0] cursor-pointer">
              <input
                type="checkbox"
                checked={config.autoTrim}
                onChange={(e) => handleConfigChange({ autoTrim: e.target.checked })}
                className="rounded accent-[#22d3ee]"
              />
              <span>Auto-trim Silhouette</span>
            </label>
          </div>

          {config.autoTrim && (
            <div className="space-y-1 pt-1 border-t border-[#334155]">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-[#94a3b8]">Padding:</span>
                <span className="text-[#22d3ee] font-bold">{config.trimPadding}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="16"
                value={config.trimPadding}
                onChange={(e) => handleConfigChange({ trimPadding: Number(e.target.value) })}
                className="w-full accent-[#22d3ee] cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Palette Quantization */}
        <div className="bg-[#0f172a] border border-[#334155] rounded p-2.5 space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">
            PALETTE QUANTIZATION
          </label>

          <div className="grid grid-cols-3 gap-1">
            {[
              { id: 'none', label: 'None' },
              { id: 'median_cut', label: 'Median Cut' },
              { id: 'biome', label: 'Biome Snap' },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => handleConfigChange({ quantizeMode: mode.id as any })}
                className={`py-1 px-1 rounded border text-[10px] font-bold uppercase tracking-wider transition ${
                  config.quantizeMode === mode.id
                    ? 'bg-[#22d3ee] text-[#0f172a] border-[#22d3ee]'
                    : 'bg-[#1e293b] border-[#334155] text-[#94a3b8] hover:text-[#e2e8f0]'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Median Cut Slider */}
          {config.quantizeMode === 'median_cut' && (
            <div className="space-y-1 pt-1 border-t border-[#334155]">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-[#94a3b8]">MAX COLORS:</span>
                <span className="text-[#22d3ee] font-bold">
                  {config.medianCutColors}
                </span>
              </div>
              <input
                type="range"
                min="4"
                max="64"
                step="2"
                value={config.medianCutColors}
                onChange={(e) =>
                  handleConfigChange({ medianCutColors: Number(e.target.value) })
                }
                className="w-full accent-[#22d3ee] cursor-pointer"
              />
            </div>
          )}

          {/* Biome Palette Dropdown */}
          {config.quantizeMode === 'biome' && (
            <div className="space-y-1.5 pt-1 border-t border-[#334155]">
              <select
                value={config.biome}
                onChange={(e) => handleConfigChange({ biome: e.target.value as BiomePalette })}
                className="w-full bg-[#1e293b] text-[#e2e8f0] text-[10px] font-mono font-bold py-1 px-1.5 rounded border border-[#334155] focus:border-[#22d3ee] focus:outline-none"
              >
                <option value="catacombs">Catacombs (Slate / Obsidian)</option>
                <option value="forges">Forges (Magma / Rust / Ash)</option>
                <option value="void">Void (Abyssal / Violet / Warp)</option>
              </select>

              {/* Biome Palette Swatches Preview */}
              <div className="flex items-center gap-1 pt-0.5">
                {BIOME_PALETTES[config.biome === 'none' ? 'catacombs' : config.biome].map(
                  (hex) => (
                    <div
                      key={hex}
                      className="w-4 h-4 rounded-[1px] border border-[#334155]"
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  )
                )}
                <div
                  className="w-4 h-4 rounded-[1px] border border-[#334155] ring-1 ring-[#22d3ee]"
                  style={{ backgroundColor: BIOME_PALETTES.accent }}
                  title="Rim Accent (#22d3ee)"
                />
              </div>
            </div>
          )}
        </div>

        {/* Silhouette Effects */}
        <div className="bg-[#0f172a] border border-[#334155] rounded p-2.5 space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">
            SILHOUETTE ACCENTS
          </h3>

          <div className="flex items-center justify-between text-[11px]">
            <label className="flex items-center gap-2 text-[#e2e8f0] cursor-pointer">
              <input
                type="checkbox"
                checked={config.outline}
                onChange={(e) => handleConfigChange({ outline: e.target.checked })}
                className="rounded accent-[#22d3ee]"
              />
              <span>1px Outline</span>
            </label>
            {config.outline && (
              <input
                type="color"
                value={config.outlineColor || '#0f172a'}
                onChange={(e) => handleConfigChange({ outlineColor: e.target.value })}
                className="w-4 h-4 rounded border border-[#334155] cursor-pointer bg-transparent"
              />
            )}
          </div>

          <div className="flex items-center justify-between pt-1.5 border-t border-[#334155] text-[11px]">
            <label className="flex items-center gap-2 text-[#e2e8f0] cursor-pointer">
              <input
                type="checkbox"
                checked={config.rimLight}
                onChange={(e) => handleConfigChange({ rimLight: e.target.checked })}
                className="rounded accent-[#22d3ee]"
              />
              <span>1px #22d3ee Rim-Light</span>
            </label>
          </div>
        </div>

        {/* Color Swatches Grid */}
        <div className="bg-[#0f172a] border border-[#334155] rounded p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#94a3b8]">PALETTE SIZE:</span>
            <span className="font-bold text-[#22d3ee]">{colorCount} COLORS</span>
          </div>

          {/* Used colors swatches */}
          <div className="flex flex-wrap gap-1 pt-1 max-h-20 overflow-y-auto">
            {usedColors.map((hex) => (
              <div
                key={hex}
                className="w-3.5 h-3.5 rounded-[1px] border border-[#334155]"
                style={{ backgroundColor: hex }}
                title={hex}
              />
            ))}
          </div>
        </div>

        {/* Proceed Button */}
        <div className="pt-1">
          <button
            onClick={onProceedToLayout}
            className="w-full py-2 px-3 bg-[#22d3ee] hover:bg-[#38bdf8] text-[#0f172a] font-bold text-xs uppercase tracking-wider rounded shadow-md shadow-[#22d3ee]/20 flex items-center justify-center gap-1.5 transition"
          >
            <span>PROCEED TO ACTION LAYOUT</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
