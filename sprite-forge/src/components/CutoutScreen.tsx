import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Wand2,
  Eraser,
  Paintbrush,
  Crop,
  Undo2,
  Redo2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sliders,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Info,
  Check,
} from 'lucide-react';
import { CutoutConfig, SpriteAsset } from '../types';
import {
  applyBrush,
  applyEdgeProcessing,
  applyMagicWand,
  applyRectangleKeep,
  cloneImageData,
  computeTransparencyRatio,
  imageDataToDataUrl,
  loadImageData,
  runAutoCutout,
} from '../utils/cutoutProcessor';

interface CutoutScreenProps {
  asset: SpriteAsset;
  onUpdateAsset: (updated: Partial<SpriteAsset>) => void;
  onProceedToPixelate: () => void;
}

type ToolMode = 'wand' | 'erase' | 'restore' | 'rect_keep';

export const CutoutScreen: React.FC<CutoutScreenProps> = ({
  asset,
  onUpdateAsset,
  onProceedToPixelate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Tool states
  const [activeTool, setActiveTool] = useState<ToolMode>('wand');
  const [wandTolerance, setWandTolerance] = useState(asset.cutoutConfig.tolerance || 32);
  const [wandContiguous, setWandContiguous] = useState(true);
  const [brushRadius, setBrushRadius] = useState(16);
  const [removeIslands, setRemoveIslands] = useState(asset.cutoutConfig.removeIslands ?? true);
  const [islandThreshold, setIslandThreshold] = useState(asset.cutoutConfig.islandThresholdPercent || 0.5);
  const [despillCyan, setDespillCyan] = useState(asset.cutoutConfig.despillCyan ?? true);
  const [edgeDefringe, setEdgeDefringe] = useState(asset.cutoutConfig.edgeDefringe || 0);

  // Zoom & Pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Drawing / Dragging state
  const [isInteracting, setIsInteracting] = useState(false);
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null);
  const [rectCurrent, setRectCurrent] = useState<{ x: number; y: number } | null>(null);

  // History Stack (Undo / Redo)
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const originalImageDataRef = useRef<ImageData | null>(null);
  const currentImageDataRef = useRef<ImageData | null>(null);

  // Status & Transparency
  const [transparentPercent, setTransparentPercent] = useState<number>(
    Math.round(asset.transparentRatio * 100)
  );
  const [isBusy, setIsBusy] = useState(false);

  // Load original image and initialize auto-pass or current state
  useEffect(() => {
    let isCancelled = false;

    const init = async () => {
      setIsBusy(true);
      try {
        const { imageData } = await loadImageData(asset.rawImageSrc);
        if (isCancelled) return;

        originalImageDataRef.current = cloneImageData(imageData);

        let initialCutout: ImageData;
        if (asset.cutoutDataUrl && asset.cutoutDataUrl !== asset.rawImageSrc) {
          const loadedCutout = await loadImageData(asset.cutoutDataUrl);
          initialCutout = loadedCutout.imageData;
        } else {
          // Run Automatic Pass on fresh load
          initialCutout = runAutoCutout(imageData, {
            tolerance: wandTolerance,
            removeIslands,
            islandThresholdPercent: islandThreshold,
            featherAlpha: true,
            despillCyan,
            edgeDefringe,
          });
        }

        currentImageDataRef.current = initialCutout;
        setHistory([cloneImageData(initialCutout)]);
        setHistoryIndex(0);

        const transRatio = computeTransparencyRatio(initialCutout);
        setTransparentPercent(Math.round(transRatio * 100));

        renderToCanvas(initialCutout);

        // Sync to asset
        const dataUrl = imageDataToDataUrl(initialCutout);
        onUpdateAsset({
          cutoutDataUrl: dataUrl,
          transparentRatio: transRatio,
        });
      } catch (err) {
        console.error('Failed to initialize cutout:', err);
      } finally {
        setIsBusy(false);
      }
    };

    init();

    return () => {
      isCancelled = true;
    };
  }, [asset.id]);

  // Render current ImageData to Canvas
  const renderToCanvas = (imageData: ImageData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (canvas.width !== imageData.width || canvas.height !== imageData.height) {
      canvas.width = imageData.width;
      canvas.height = imageData.height;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.putImageData(imageData, 0, 0);
  };

  // Push new state to history
  const pushHistory = (newImageData: ImageData) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(cloneImageData(newImageData));

    // Cap at 25 steps to save memory
    if (newHistory.length > 25) {
      newHistory.shift();
    }

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    currentImageDataRef.current = newImageData;

    const transRatio = computeTransparencyRatio(newImageData);
    setTransparentPercent(Math.round(transRatio * 100));

    renderToCanvas(newImageData);

    const dataUrl = imageDataToDataUrl(newImageData);
    onUpdateAsset({
      cutoutDataUrl: dataUrl,
      transparentRatio: transRatio,
    });
  };

  // Undo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      currentImageDataRef.current = cloneImageData(prev);
      renderToCanvas(prev);
      const transRatio = computeTransparencyRatio(prev);
      setTransparentPercent(Math.round(transRatio * 100));
      onUpdateAsset({
        cutoutDataUrl: imageDataToDataUrl(prev),
        transparentRatio: transRatio,
      });
    }
  };

  // Redo
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      currentImageDataRef.current = cloneImageData(next);
      renderToCanvas(next);
      const transRatio = computeTransparencyRatio(next);
      setTransparentPercent(Math.round(transRatio * 100));
      onUpdateAsset({
        cutoutDataUrl: imageDataToDataUrl(next),
        transparentRatio: transRatio,
      });
    }
  };

  // Keyboard Shortcuts (Ctrl+Z, Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  // Reset to Original
  const handleResetToOriginal = () => {
    if (!originalImageDataRef.current) return;
    const orig = cloneImageData(originalImageDataRef.current);
    pushHistory(orig);
  };

  // Rerun Automatic Pass
  const handleRerunAutoCutout = () => {
    if (!originalImageDataRef.current) return;
    setIsBusy(true);
    setTimeout(() => {
      const autoCutout = runAutoCutout(originalImageDataRef.current!, {
        tolerance: wandTolerance,
        removeIslands,
        islandThresholdPercent: islandThreshold,
        featherAlpha: true,
        despillCyan,
        edgeDefringe,
      });
      pushHistory(autoCutout);
      setIsBusy(false);
    }, 20);
  };

  // Canvas Coordinate Helper
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: Math.floor((e.clientX - rect.left) * scaleX),
      y: Math.floor((e.clientY - rect.top) * scaleY),
    };
  };

  // Tool Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || e.altKey) {
      // Middle click or Alt -> Pan
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (!currentImageDataRef.current || !originalImageDataRef.current) return;
    setIsInteracting(true);
    const { x, y } = getCanvasCoords(e);

    if (activeTool === 'wand') {
      const updated = applyMagicWand(
        currentImageDataRef.current,
        x,
        y,
        wandTolerance,
        wandContiguous
      );
      pushHistory(updated);
    } else if (activeTool === 'erase' || activeTool === 'restore') {
      const updated = applyBrush(
        currentImageDataRef.current,
        originalImageDataRef.current,
        x,
        y,
        brushRadius,
        activeTool
      );
      currentImageDataRef.current = updated;
      renderToCanvas(updated);
    } else if (activeTool === 'rect_keep') {
      setRectStart({ x, y });
      setRectCurrent({ x, y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
      return;
    }

    if (!isInteracting || !currentImageDataRef.current || !originalImageDataRef.current) return;
    const { x, y } = getCanvasCoords(e);

    if (activeTool === 'erase' || activeTool === 'restore') {
      const updated = applyBrush(
        currentImageDataRef.current,
        originalImageDataRef.current,
        x,
        y,
        brushRadius,
        activeTool
      );
      currentImageDataRef.current = updated;
      renderToCanvas(updated);
    } else if (activeTool === 'rect_keep') {
      setRectCurrent({ x, y });
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (!isInteracting) return;
    setIsInteracting(false);

    if (activeTool === 'erase' || activeTool === 'restore') {
      if (currentImageDataRef.current) {
        pushHistory(currentImageDataRef.current);
      }
    } else if (activeTool === 'rect_keep' && rectStart && rectCurrent) {
      if (currentImageDataRef.current) {
        const updated = applyRectangleKeep(
          currentImageDataRef.current,
          rectStart.x,
          rectStart.y,
          rectCurrent.x,
          rectCurrent.y
        );
        pushHistory(updated);
      }
      setRectStart(null);
      setRectCurrent(null);
    }
  };

  const handleApplyEdgeAdjustments = (newDefringe: number, newDespill: boolean) => {
    if (!currentImageDataRef.current) return;
    const cloned = cloneImageData(currentImageDataRef.current);
    applyEdgeProcessing(cloned, newDefringe, newDespill);
    pushHistory(cloned);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0f172a] select-none">
      {/* Main Canvas Workspace */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden flex items-center justify-center p-4 bg-[#0a0f1d]"
        onMouseMove={(e) => {
          if (isPanning) {
            setPan({
              x: e.clientX - startPan.x,
              y: e.clientY - startPan.y,
            });
          }
        }}
        onMouseUp={() => setIsPanning(false)}
      >
        {/* Floating Top Stats / Shortcut Banner */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-3 bg-[#1e293b]/90 backdrop-blur-md border border-[#334155] px-3.5 py-2 rounded-xl text-xs shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#22d3ee]"></span>
            <span className="text-[#94a3b8]">Transparency:</span>
            <span className="font-mono font-bold text-[#22d3ee]">
              {transparentPercent}% of pixels cleared
            </span>
          </div>
          <div className="h-3 w-[1px] bg-[#334155]" />
          <span className="text-[11px] text-[#94a3b8] hidden sm:inline">
            Use <kbd className="px-1 py-0.5 rounded bg-[#0f172a] text-[#e2e8f0]">Ctrl+Z</kbd> to Undo, <kbd className="px-1 py-0.5 rounded bg-[#0f172a] text-[#e2e8f0]">Ctrl+Shift+Z</kbd> to Redo
          </span>
        </div>

        {/* Floating Zoom Controls */}
        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1 bg-[#1e293b]/90 backdrop-blur-md border border-[#334155] p-1 rounded-xl shadow-lg">
          <button
            onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
            className="p-1.5 rounded hover:bg-[#334155] text-[#94a3b8] hover:text-[#e2e8f0] transition"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-[#e2e8f0] px-2 min-w-[48px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
            className="p-1.5 rounded hover:bg-[#334155] text-[#94a3b8] hover:text-[#e2e8f0] transition"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="h-3 w-[1px] bg-[#334155] mx-0.5" />
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="p-1.5 rounded hover:bg-[#334155] text-[#94a3b8] hover:text-[#e2e8f0] text-xs transition"
            title="Reset Zoom & Pan"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Canvas Wrapper with Dark Mid-Grey Checkerboard */}
        <div
          className="relative transition-transform duration-75 shadow-2xl rounded border border-[#334155]"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            backgroundColor: '#1e293b',
            backgroundImage:
              'linear-gradient(45deg, #0f172a 25%, transparent 25%), linear-gradient(-45deg, #0f172a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #0f172a 75%), linear-gradient(-45deg, transparent 75%, #0f172a 75%)',
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
            cursor:
              activeTool === 'wand'
                ? 'crosshair'
                : activeTool === 'erase' || activeTool === 'restore'
                ? 'cell'
                : 'crosshair',
          }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="block pixelated max-w-none"
            style={{ width: `${asset.width || 1024}px`, height: `${asset.height || 1024}px` }}
          />

          {/* Selection Box Overlay for Rectangle Keep tool */}
          {activeTool === 'rect_keep' && rectStart && rectCurrent && (
            <div
              className="absolute border-2 border-dashed border-[#22d3ee] bg-[#22d3ee]/20 pointer-events-none"
              style={{
                left: `${Math.min(rectStart.x, rectCurrent.x)}px`,
                top: `${Math.min(rectStart.y, rectCurrent.y)}px`,
                width: `${Math.abs(rectCurrent.x - rectStart.x)}px`,
                height: `${Math.abs(rectCurrent.y - rectStart.y)}px`,
              }}
            />
          )}
        </div>
      </div>

      {/* Right-Hand Control & Manual Tools Panel */}
      <div className="w-80 bg-[#0f172a] border-l border-[#334155] flex flex-col shrink-0 h-full overflow-y-auto p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
          <div>
            <h2 className="text-sm font-bold text-[#e2e8f0]">Cutout & Background</h2>
            <p className="text-[11px] text-[#94a3b8]">Step 2: Isolate subject cleanly</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded bg-[#1e293b] hover:bg-[#334155] disabled:opacity-30 text-[#e2e8f0] transition"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 rounded bg-[#1e293b] hover:bg-[#334155] disabled:opacity-30 text-[#e2e8f0] transition"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetToOriginal}
              className="p-1.5 rounded bg-[#1e293b] hover:bg-red-900/50 text-[#94a3b8] hover:text-red-300 transition"
              title="Reset to Original Raw Image"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Auto Pass Quick Trigger */}
        <div className="bg-[#1e293b]/60 border border-[#334155] rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#e2e8f0] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#22d3ee]" />
              Automatic Pass
            </span>
            <button
              onClick={handleRerunAutoCutout}
              disabled={isBusy}
              className="px-2.5 py-1 bg-[#22d3ee]/10 hover:bg-[#22d3ee]/20 border border-[#22d3ee]/30 rounded text-[11px] text-[#22d3ee] font-medium transition"
            >
              {isBusy ? 'Running...' : 'Re-Run Auto Pass'}
            </button>
          </div>
          <p className="text-[11px] text-[#94a3b8] leading-relaxed">
            Auto-samples corner dungeon background, flood fills from border, and clears magenta keys.
          </p>
        </div>

        {/* Manual Tools Selection */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
            Manual Correction Tools
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setActiveTool('wand')}
              className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition ${
                activeTool === 'wand'
                  ? 'bg-[#22d3ee]/15 border-[#22d3ee] text-[#22d3ee]'
                  : 'bg-[#1e293b] border-[#334155] text-[#94a3b8] hover:text-[#e2e8f0]'
              }`}
            >
              <Wand2 className="w-4 h-4 shrink-0" />
              <div className="text-xs font-medium truncate">Magic Wand</div>
            </button>

            <button
              onClick={() => setActiveTool('erase')}
              className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition ${
                activeTool === 'erase'
                  ? 'bg-[#22d3ee]/15 border-[#22d3ee] text-[#22d3ee]'
                  : 'bg-[#1e293b] border-[#334155] text-[#94a3b8] hover:text-[#e2e8f0]'
              }`}
            >
              <Eraser className="w-4 h-4 shrink-0" />
              <div className="text-xs font-medium truncate">Erase Brush</div>
            </button>

            <button
              onClick={() => setActiveTool('restore')}
              className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition ${
                activeTool === 'restore'
                  ? 'bg-[#22d3ee]/15 border-[#22d3ee] text-[#22d3ee]'
                  : 'bg-[#1e293b] border-[#334155] text-[#94a3b8] hover:text-[#e2e8f0]'
              }`}
            >
              <Paintbrush className="w-4 h-4 shrink-0" />
              <div className="text-xs font-medium truncate">Restore Brush</div>
            </button>

            <button
              onClick={() => setActiveTool('rect_keep')}
              className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition ${
                activeTool === 'rect_keep'
                  ? 'bg-[#22d3ee]/15 border-[#22d3ee] text-[#22d3ee]'
                  : 'bg-[#1e293b] border-[#334155] text-[#94a3b8] hover:text-[#e2e8f0]'
              }`}
            >
              <Crop className="w-4 h-4 shrink-0" />
              <div className="text-xs font-medium truncate">Rectangle Keep</div>
            </button>
          </div>
        </div>

        {/* Active Tool Parameters */}
        <div className="bg-[#1e293b]/40 border border-[#334155] rounded-xl p-3.5 space-y-4">
          {activeTool === 'wand' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#e2e8f0] font-medium">Wand Tolerance:</span>
                <span className="font-mono text-[#22d3ee] font-bold">{wandTolerance}</span>
              </div>
              <input
                type="range"
                min="0"
                max="128"
                value={wandTolerance}
                onChange={(e) => setWandTolerance(Number(e.target.value))}
                className="w-full accent-[#22d3ee] cursor-pointer"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-[#94a3b8] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wandContiguous}
                    onChange={(e) => setWandContiguous(e.target.checked)}
                    className="rounded accent-[#22d3ee]"
                  />
                  <span>Contiguous only (flood fill)</span>
                </label>
                <button
                  onClick={() => setWandTolerance(32)}
                  className="text-[10px] text-[#94a3b8] hover:text-[#22d3ee] underline"
                >
                  Reset (32)
                </button>
              </div>
            </div>
          )}

          {(activeTool === 'erase' || activeTool === 'restore') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#e2e8f0] font-medium">
                  {activeTool === 'erase' ? 'Eraser' : 'Restore'} Radius:
                </span>
                <span className="font-mono text-[#22d3ee] font-bold">{brushRadius}px</span>
              </div>
              <input
                type="range"
                min="1"
                max="64"
                value={brushRadius}
                onChange={(e) => setBrushRadius(Number(e.target.value))}
                className="w-full accent-[#22d3ee] cursor-pointer"
              />
              <p className="text-[11px] text-[#94a3b8]">
                {activeTool === 'restore'
                  ? 'Paints back original untouched pixels from source artwork.'
                  : 'Paints transparency onto unwanted elements.'}
              </p>
            </div>
          )}

          {activeTool === 'rect_keep' && (
            <div className="text-xs text-[#94a3b8] space-y-1">
              <p className="font-medium text-[#e2e8f0]">Crop Box Inside</p>
              <p className="text-[11px]">
                Click and drag a box across the canvas. Everything outside the rectangle will be deleted.
              </p>
            </div>
          )}
        </div>

        {/* Edge & De-Fringe Refinements */}
        <div className="bg-[#1e293b]/40 border border-[#334155] rounded-xl p-3.5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#e2e8f0]">
            Edge De-Fringe & Despill
          </h3>

          {/* Despill Cyan Checkbox */}
          <div className="space-y-1">
            <label className="flex items-start gap-2 text-xs text-[#e2e8f0] cursor-pointer">
              <input
                type="checkbox"
                checked={despillCyan}
                onChange={(e) => {
                  setDespillCyan(e.target.checked);
                  handleApplyEdgeAdjustments(edgeDefringe, e.target.checked);
                }}
                className="mt-0.5 rounded accent-[#22d3ee]"
              />
              <div>
                <span className="font-medium">Despill Cyan Rim (#22d3ee)</span>
                <p className="text-[10px] text-[#94a3b8] mt-0.5 leading-normal">
                  Desaturates semi-transparent edge halo pixels without eating character's own rim-light.
                </p>
              </div>
            </label>
          </div>

          {/* Edge De-fringe Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#94a3b8]">Erode Alpha Edge:</span>
              <span className="font-mono text-[#22d3ee] font-bold">{edgeDefringe}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="3"
              step="1"
              value={edgeDefringe}
              onChange={(e) => {
                const val = Number(e.target.value);
                setEdgeDefringe(val);
                handleApplyEdgeAdjustments(val, despillCyan);
              }}
              className="w-full accent-[#22d3ee] cursor-pointer"
            />
          </div>

          {/* Island Cleanup Toggle */}
          <div className="pt-2 border-t border-[#334155] space-y-2">
            <label className="flex items-center justify-between text-xs text-[#e2e8f0] cursor-pointer">
              <span>Delete floating islands (&lt;0.5% area)</span>
              <input
                type="checkbox"
                checked={removeIslands}
                onChange={(e) => setRemoveIslands(e.target.checked)}
                className="rounded accent-[#22d3ee]"
              />
            </label>
          </div>
        </div>

        {/* Proceed Action Button */}
        <div className="pt-2">
          <button
            onClick={onProceedToPixelate}
            className="w-full py-3 px-4 bg-[#22d3ee] hover:bg-[#38bdf8] text-[#0f172a] font-bold text-xs rounded-xl shadow-lg shadow-[#22d3ee]/20 flex items-center justify-center gap-2 transition"
          >
            <span>Proceed to Step 3: Pixelate & Palette</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
