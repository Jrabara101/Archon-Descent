import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Play,
  Pause,
  RotateCw,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Maximize2,
  Sliders,
  FlipHorizontal,
  Move,
  Layers,
  Palette,
  Eye,
  RefreshCw,
} from 'lucide-react';
import {
  ActionDefinition,
  Direction,
  FIXED_DIRECTIONS,
  FrameTransform,
  SpriteAsset,
} from '../types';
import {
  getDefaultTransform,
  renderCellToContext,
} from '../utils/sheetGenerator';

interface ActionLayoutScreenProps {
  asset: SpriteAsset;
  onUpdateAsset: (updated: Partial<SpriteAsset>) => void;
  onProceedToExport: () => void;
}

export const ActionLayoutScreen: React.FC<ActionLayoutScreenProps> = ({
  asset,
  onUpdateAsset,
  onProceedToExport,
}) => {
  const [actions, setActions] = useState<ActionDefinition[]>(asset.actions);
  const [selectedCellKey, setSelectedCellKey] = useState<string | null>('idle_down_0');
  const [selectedActionId, setSelectedActionId] = useState<string>('idle');
  const [previewDirection, setPreviewDirection] = useState<Direction>('down');
  const [previewFps, setPreviewFps] = useState<number>(8);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [previewZoom, setPreviewZoom] = useState<number>(3);

  const sourceImgRef = useRef<HTMLImageElement | null>(null);
  const [sourceLoaded, setSourceLoaded] = useState(false);

  // Load pixelated image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      sourceImgRef.current = img;
      setSourceLoaded(true);
    };
    img.src = asset.pixelatedDataUrl || asset.cutoutDataUrl || asset.rawImageSrc;
  }, [asset.pixelatedDataUrl, asset.cutoutDataUrl, asset.rawImageSrc]);

  // Sync actions changes to parent asset
  const updateActions = (newActions: ActionDefinition[]) => {
    setActions(newActions);
    onUpdateAsset({ actions: newActions });
  };

  // Parse currently selected cell key
  const parsedSelection = useMemo(() => {
    if (!selectedCellKey) return null;
    const parts = selectedCellKey.split('_');
    // Format: `${actionId}_${direction}_${frameIdx}`
    if (parts.length >= 3) {
      const frameIdx = parseInt(parts[parts.length - 1], 10);
      const direction = parts[parts.length - 2] as Direction;
      const actionId = parts.slice(0, parts.length - 2).join('_');
      return { actionId, direction, frameIdx };
    }
    return null;
  }, [selectedCellKey]);

  // Active Action object
  const currentAction = actions.find((a) => a.id === (parsedSelection?.actionId || selectedActionId)) || actions[0];

  // Active Transform object
  const activeTransform = useMemo<FrameTransform>(() => {
    if (!currentAction || !parsedSelection) {
      return getDefaultTransform('idle', 'down', 0);
    }
    const frameKey =
      currentAction.directionMode === '4-way'
        ? `${parsedSelection.direction}_${parsedSelection.frameIdx}`
        : `default_${parsedSelection.frameIdx}`;

    return (
      currentAction.frames[frameKey] ||
      getDefaultTransform(currentAction.name, parsedSelection.direction, parsedSelection.frameIdx, { frameCount: currentAction.frameCount, assetType: asset.assetType })
    );
  }, [currentAction, parsedSelection]);

  // Update a specific cell's transform
  const handleUpdateTransform = (changes: Partial<FrameTransform>) => {
    if (!currentAction || !parsedSelection) return;

    const frameKey =
      currentAction.directionMode === '4-way'
        ? `${parsedSelection.direction}_${parsedSelection.frameIdx}`
        : `default_${parsedSelection.frameIdx}`;

    const newActions = actions.map((act) => {
      if (act.id === currentAction.id) {
        return {
          ...act,
          frames: {
            ...act.frames,
            [frameKey]: {
              ...activeTransform,
              ...changes,
            },
          },
        };
      }
      return act;
    });

    updateActions(newActions);
  };

  // Add Action
  const handleAddAction = () => {
    const newId = `action_${Date.now().toString().slice(-4)}`;
    const newAction: ActionDefinition = {
      id: newId,
      name: `action_${actions.length + 1}`,
      directionMode: '4-way',
      frameCount: 2,
      fps: 8,
      loop: true,
      frames: {},
    };
    updateActions([...actions, newAction]);
    setSelectedActionId(newId);
    setSelectedCellKey(`${newId}_down_0`);
  };

  // Delete Action
  const handleDeleteAction = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (actions.length <= 1) return;
    const filtered = actions.filter((a) => a.id !== id);
    updateActions(filtered);
    if (selectedActionId === id) {
      setSelectedActionId(filtered[0].id);
      setSelectedCellKey(`${filtered[0].id}_down_0`);
    }
  };

  // Reorder Actions
  const handleMoveAction = (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= actions.length) return;

    const reordered = [...actions];
    const temp = reordered[index];
    reordered[index] = reordered[targetIdx];
    reordered[targetIdx] = temp;
    updateActions(reordered);
  };

  // Auto-Fill Generators
  /**
   * Rigged auto-fill: generate real internal motion for the ACTIVE action.
   *
   * Unlike the simple helpers below (which slide the whole sprite as one
   * block), this marks every cell as rig-driven. At render time the sprite is
   * sliced into head/torso/legs bands that move independently, so a walk
   * strides and a death topples. Motion is chosen from the action's NAME and
   * the asset's TYPE, so a renamed action still animates sensibly and a
   * floating elemental hovers instead of walking.
   */
  const handleRiggedFill = () => {
    if (!currentAction) return;
    const newFrames: typeof currentAction.frames = { ...currentAction.frames };
    const count = Math.max(1, currentAction.frameCount);

    const makeRigged = (dir: Direction, f: number) => ({
      sourceType: (dir === 'right' ? 'mirror' : 'source') as FrameTransform['sourceType'],
      offsetX: 0,
      offsetY: 0,
      squashX: 1,
      squashY: 1,
      rotation: 0 as const,
      tintColor: '#ffffff',
      tintOpacity: 0,
      isPlaceholder: true,
      rig: {
        action: currentAction.name,
        frame: f,
        frameCount: count,
        direction: dir,
        assetType: asset.assetType,
      },
    });

    if (currentAction.directionMode === '4-way') {
      for (const dir of FIXED_DIRECTIONS) {
        for (let f = 0; f < count; f++) newFrames[`${dir}_${f}`] = makeRigged(dir, f);
      }
    } else {
      for (let f = 0; f < count; f++) newFrames[`default_${f}`] = makeRigged('down', f);
    }

    updateActions(
      actions.map((a) =>
        a.id === currentAction.id ? { ...a, frames: newFrames } : a
      )
    );
  };

  /** Rig every action on this asset at once. */
  const handleRigAll = () => {
    const next = actions.map((action) => {
      const count = Math.max(1, action.frameCount);
      const frames: typeof action.frames = { ...action.frames };
      const mk = (dir: Direction, f: number) => ({
        sourceType: (dir === 'right' ? 'mirror' : 'source') as FrameTransform['sourceType'],
        offsetX: 0,
        offsetY: 0,
        squashX: 1,
        squashY: 1,
        rotation: 0 as const,
        tintColor: '#ffffff',
        tintOpacity: 0,
        isPlaceholder: true,
        rig: {
          action: action.name,
          frame: f,
          frameCount: count,
          direction: dir,
          assetType: asset.assetType,
        },
      });
      if (action.directionMode === '4-way') {
        for (const dir of FIXED_DIRECTIONS) {
          for (let f = 0; f < count; f++) frames[`${dir}_${f}`] = mk(dir, f);
        }
      } else {
        for (let f = 0; f < count; f++) frames[`default_${f}`] = mk('down', f);
      }
      return { ...action, frames };
    });
    updateActions(next);
  };

  const handleAutoFillWalk = () => {
    if (!currentAction) return;
    const newFrames = { ...currentAction.frames };

    if (currentAction.directionMode === '4-way') {
      for (const dir of FIXED_DIRECTIONS) {
        // Frame 0: bob up
        newFrames[`${dir}_0`] = {
          sourceType: dir === 'right' ? 'mirror' : 'source',
          offsetX: 0,
          offsetY: -1,
          squashX: 1,
          squashY: 1,
          rotation: 0,
          tintColor: '#ffffff',
          tintOpacity: 0,
          isPlaceholder: true,
        };
        // Frame 1: bob down / step
        newFrames[`${dir}_1`] = {
          sourceType: dir === 'right' ? 'mirror' : 'source',
          offsetX: 0,
          offsetY: 1,
          squashX: 1,
          squashY: 1,
          rotation: 0,
          tintColor: '#ffffff',
          tintOpacity: 0,
          isPlaceholder: true,
        };
      }
    }

    const newActions = actions.map((a) =>
      a.id === currentAction.id
        ? { ...a, frameCount: Math.max(2, a.frameCount), frames: newFrames }
        : a
    );
    updateActions(newActions);
  };

  const handleAutoFillHit = () => {
    if (!currentAction) return;
    const newFrames = { ...currentAction.frames };

    if (currentAction.directionMode === '4-way') {
      for (const dir of FIXED_DIRECTIONS) {
        newFrames[`${dir}_0`] = {
          sourceType: dir === 'right' ? 'mirror' : 'source',
          offsetX: 0,
          offsetY: 0,
          squashX: 1.1,
          squashY: 0.9,
          rotation: 0,
          tintColor: '#ffffff',
          tintOpacity: 0.7,
          isPlaceholder: true,
        };
      }
    } else {
      newFrames[`default_0`] = {
        sourceType: 'tint',
        offsetX: 0,
        offsetY: 0,
        squashX: 1.1,
        squashY: 0.9,
        rotation: 0,
        tintColor: '#ffffff',
        tintOpacity: 0.7,
        isPlaceholder: true,
      };
    }

    const newActions = actions.map((a) =>
      a.id === currentAction.id ? { ...a, frames: newFrames } : a
    );
    updateActions(newActions);
  };

  const handleAutoFillDeath = () => {
    if (!currentAction) return;
    const newFrames = { ...currentAction.frames };
    const frameCount = 3;

    for (let f = 0; f < frameCount; f++) {
      newFrames[`default_${f}`] = {
        sourceType: 'offset',
        offsetX: 0,
        offsetY: (f + 1) * 3,
        squashX: 1 + (f + 1) * 0.15,
        squashY: 1 - (f + 1) * 0.2,
        rotation: 0,
        tintColor: '#0f172a',
        tintOpacity: 0.2 + f * 0.3,
        isPlaceholder: true,
      };
    }

    const newActions = actions.map((a) =>
      a.id === currentAction.id
        ? {
            ...a,
            directionMode: '1-way' as const,
            frameCount: 3,
            fps: 6,
            loop: false,
            frames: newFrames,
          }
        : a
    );
    updateActions(newActions);
  };

  // Animation Loop for Preview
  useEffect(() => {
    if (!isPlaying) return;

    const activePreviewAction = actions.find((a) => a.id === selectedActionId) || actions[0];
    if (!activePreviewAction) return;

    const fps = activePreviewAction.fps || previewFps || 8;
    const interval = 1000 / fps;

    const timer = setInterval(() => {
      setCurrentFrameIndex((prev) => {
        const next = prev + 1;
        if (next >= activePreviewAction.frameCount) {
          return activePreviewAction.loop ? 0 : activePreviewAction.frameCount - 1;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, selectedActionId, previewFps, actions]);

  // Spacebar Play/Pause shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Grid max frames calculation
  const maxFramesAcrossActions = useMemo(() => {
    return Math.max(1, ...actions.map((a) => a.frameCount));
  }, [actions]);

  // Render a cell thumbnail helper
  const renderCellThumbnail = (
    action: ActionDefinition,
    dir: Direction,
    frameIdx: number
  ) => {
    if (!sourceImgRef.current) return null;

    const frameKey =
      action.directionMode === '4-way'
        ? `${dir}_${frameIdx}`
        : `default_${frameIdx}`;

    const transform =
      action.frames[frameKey] || getDefaultTransform(action.name, dir, frameIdx, { frameCount: action.frameCount, assetType: asset.assetType });

    const canvas = document.createElement('canvas');
    canvas.width = asset.pixelateConfig.cellSize;
    canvas.height = asset.pixelateConfig.cellSize;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      renderCellToContext(
        ctx,
        sourceImgRef.current,
        transform,
        0,
        0,
        asset.pixelateConfig.cellSize
      );
    }

    return (
      <img
        src={canvas.toDataURL()}
        alt=""
        referrerPolicy="no-referrer"
        className="w-full h-full object-contain pixelated"
      />
    );
  };

  // Preview Frame Canvas Renderer for Biome Floor
  const renderPreviewFrameOnCanvas = (canvas: HTMLCanvasElement | null) => {
    if (!canvas || !sourceImgRef.current) return;
    const cellSize = asset.pixelateConfig.cellSize;
    canvas.width = cellSize;
    canvas.height = cellSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cellSize, cellSize);

    const activePreviewAction = actions.find((a) => a.id === selectedActionId) || actions[0];
    if (!activePreviewAction) return;

    const frameKey =
      activePreviewAction.directionMode === '4-way'
        ? `${previewDirection}_${currentFrameIndex}`
        : `default_${currentFrameIndex}`;

    const transform =
      activePreviewAction.frames[frameKey] ||
      getDefaultTransform(activePreviewAction.name, previewDirection, currentFrameIndex, { frameCount: activePreviewAction.frameCount, assetType: asset.assetType });

    renderCellToContext(ctx, sourceImgRef.current, transform, 0, 0, cellSize);
  };

  const previewCatacombsRef = useRef<HTMLCanvasElement>(null);
  const previewForgesRef = useRef<HTMLCanvasElement>(null);
  const previewVoidRef = useRef<HTMLCanvasElement>(null);
  const previewCheckerRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    renderPreviewFrameOnCanvas(previewCatacombsRef.current);
    renderPreviewFrameOnCanvas(previewForgesRef.current);
    renderPreviewFrameOnCanvas(previewVoidRef.current);
    renderPreviewFrameOnCanvas(previewCheckerRef.current);
  }, [currentFrameIndex, selectedActionId, previewDirection, actions, sourceLoaded]);

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0f172a] select-none">
      {/* Left: Actions List Column */}
      <div className="w-72 bg-[#0f172a] border-r border-[#334155] flex flex-col shrink-0 h-full overflow-hidden">
        <div className="p-3 border-b border-[#334155] flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#e2e8f0]">
              Actions ({actions.length})
            </h3>
            <p className="text-[10px] text-[#94a3b8]">Rows in sprite sheet</p>
          </div>
          <button
            onClick={handleAddAction}
            className="flex items-center gap-1 px-2 py-1 bg-[#22d3ee]/10 hover:bg-[#22d3ee]/20 border border-[#22d3ee]/30 rounded text-xs text-[#22d3ee] font-medium transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </div>

        {/* Actions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {actions.map((act, index) => {
            const isSelected = selectedActionId === act.id;

            return (
              <div
                key={act.id}
                onClick={() => {
                  setSelectedActionId(act.id);
                  setSelectedCellKey(`${act.id}_down_0`);
                }}
                className={`p-2.5 rounded-lg border transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#1e293b] border-[#22d3ee] ring-1 ring-[#22d3ee]'
                    : 'bg-[#0f172a] border-[#334155] hover:border-[#475569] hover:bg-[#1e293b]/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-2">
                  <input
                    type="text"
                    value={act.name}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const newActions = actions.map((a) =>
                        a.id === act.id ? { ...a, name: e.target.value } : a
                      );
                      updateActions(newActions);
                    }}
                    className="bg-[#0f172a] border border-[#334155] text-xs font-bold text-[#e2e8f0] px-1.5 py-0.5 rounded focus:border-[#22d3ee] focus:outline-none w-28"
                  />

                  <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleMoveAction(index, 'up', e)}
                      disabled={index === 0}
                      className="p-1 rounded text-[#94a3b8] hover:text-[#e2e8f0] disabled:opacity-20"
                    >
                      <MoveUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleMoveAction(index, 'down', e)}
                      disabled={index === actions.length - 1}
                      className="p-1 rounded text-[#94a3b8] hover:text-[#e2e8f0] disabled:opacity-20"
                    >
                      <MoveDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteAction(act.id, e)}
                      disabled={actions.length <= 1}
                      className="p-1 rounded text-[#94a3b8] hover:text-red-400 disabled:opacity-20"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Mode & Frames config */}
                <div className="flex items-center justify-between text-[11px] text-[#94a3b8] pt-1 border-t border-[#334155]/60">
                  {/* 4-way vs 1-way */}
                  <select
                    value={act.directionMode}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const newMode = e.target.value as '4-way' | '1-way';
                      const newActions = actions.map((a) =>
                        a.id === act.id ? { ...a, directionMode: newMode } : a
                      );
                      updateActions(newActions);
                    }}
                    className="bg-[#0f172a] text-[#e2e8f0] py-0.5 px-1 rounded border border-[#334155] text-[10px]"
                  >
                    <option value="4-way">4-way (4 rows)</option>
                    <option value="1-way">1-way (1 row)</option>
                  </select>

                  {/* Frame count */}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <span>Frames:</span>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={act.frameCount}
                      onChange={(e) => {
                        const val = Math.max(1, Math.min(12, parseInt(e.target.value) || 1));
                        const newActions = actions.map((a) =>
                          a.id === act.id ? { ...a, frameCount: val } : a
                        );
                        updateActions(newActions);
                      }}
                      className="w-10 bg-[#0f172a] text-center text-[#22d3ee] font-mono font-bold py-0.5 rounded border border-[#334155] text-[11px]"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Auto-Fill Toolbar */}
        <div className="p-3 border-t border-[#334155] bg-[#0f172a] space-y-2">
          <div className="flex items-center gap-1 text-[11px] font-bold text-[#e2e8f0]">
            <Sparkles className="w-3.5 h-3.5 text-[#22d3ee]" />
            <span>Rigged Motion (Recommended)</span>
          </div>
          <p className="text-[9px] text-[#94a3b8] leading-snug">
            Slices the sprite into head / torso / legs and moves each part
            independently — strides, lunges and topples instead of sliding the
            whole image. Motion is picked from the action name and asset type.
          </p>

          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={handleRiggedFill}
              className="p-1.5 bg-[#22d3ee]/15 hover:bg-[#22d3ee]/25 border border-[#22d3ee]/50 rounded text-[10px] text-[#22d3ee] font-bold transition text-center"
              title="Generate rigged multi-part motion for the active action"
            >
              Rig This Action
            </button>
            <button
              onClick={handleRigAll}
              className="p-1.5 bg-[#22d3ee]/15 hover:bg-[#22d3ee]/25 border border-[#22d3ee]/50 rounded text-[10px] text-[#22d3ee] font-bold transition text-center"
              title="Generate rigged motion for every action on this asset"
            >
              Rig All Actions
            </button>
          </div>

          <div className="flex items-center gap-1 text-[10px] font-bold text-[#94a3b8] pt-1">
            <span>Simple (whole-sprite fallback)</span>
          </div>

          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={handleAutoFillWalk}
              className="p-1.5 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] rounded text-[10px] text-[#e2e8f0] font-medium transition text-center"
              title="Generate 2-frame bob walk cycle + mirror left to right"
            >
              Walk Cycle
            </button>
            <button
              onClick={handleAutoFillHit}
              className="p-1.5 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] rounded text-[10px] text-[#e2e8f0] font-medium transition text-center"
              title="Generate white 70% flash frame"
            >
              Hit Flash
            </button>
            <button
              onClick={handleAutoFillDeath}
              className="p-1.5 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] rounded text-[10px] text-[#e2e8f0] font-medium transition text-center"
              title="Generate 3-frame sink & fade death"
            >
              Death Fade
            </button>
          </div>
        </div>
      </div>

      {/* Middle: Full Sprite Sheet Layout Grid */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0f1d]">
        {/* Placeholder Warning Banner */}
        <div className="bg-amber-950/40 border-b border-amber-800/60 px-4 py-2 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Notice:</strong> One source pose provided. Mirrored, offset, and tinted frames are auto-generated placeholders. Replace with custom art for final shipping animations.
            </span>
          </div>
          <span className="text-[10px] font-mono uppercase bg-amber-900/50 px-2 py-0.5 rounded border border-amber-700/50">
            Placeholder Mode
          </span>
        </div>

        {/* Grid Area */}
        <div className="flex-1 overflow-auto p-6">
          <div className="inline-block min-w-full">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#e2e8f0] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#22d3ee]" />
                Sprite Sheet Grid ({asset.pixelateConfig.cellSize}×{asset.pixelateConfig.cellSize} px Cells)
              </h3>
              <span className="text-xs text-[#94a3b8] font-mono">
                Click any cell to inspect or edit its transform
              </span>
            </div>

            {/* Grid Table */}
            <div className="border border-[#334155] rounded-xl overflow-hidden bg-[#0f172a] shadow-xl">
              {actions.map((action) => {
                const directionsToRender: { dir: Direction; label: string }[] =
                  action.directionMode === '4-way'
                    ? FIXED_DIRECTIONS.map((d) => ({ dir: d, label: `${action.name} (${d})` }))
                    : [{ dir: 'down', label: `${action.name} (1-way)` }];

                return directionsToRender.map(({ dir, label }) => (
                  <div
                    key={`${action.id}_${dir}`}
                    className="flex items-center border-b border-[#334155]/60 hover:bg-[#1e293b]/30 transition last:border-b-0"
                  >
                    {/* Row Header Label */}
                    <div className="w-36 p-2.5 bg-[#0f172a] border-r border-[#334155] shrink-0">
                      <p className="text-xs font-semibold text-[#e2e8f0] truncate">{label}</p>
                      <p className="text-[10px] text-[#94a3b8] font-mono">
                        {action.frameCount} {action.frameCount === 1 ? 'frame' : 'frames'}
                      </p>
                    </div>

                    {/* Frame Cells */}
                    <div className="flex items-center p-2 gap-2 overflow-x-auto">
                      {Array.from({ length: maxFramesAcrossActions }).map((_, fIdx) => {
                        const cellKey = `${action.id}_${dir}_${fIdx}`;
                        const isSelected = selectedCellKey === cellKey;
                        const isAvailable = fIdx < action.frameCount;

                        if (!isAvailable) {
                          // Transparent / Empty trailing slot
                          return (
                            <div
                              key={fIdx}
                              className="w-14 h-14 rounded-lg border border-dashed border-[#334155]/40 flex items-center justify-center text-[10px] text-[#475569] font-mono select-none"
                            >
                              empty
                            </div>
                          );
                        }

                        const transform =
                          action.frames[
                            action.directionMode === '4-way'
                              ? `${dir}_${fIdx}`
                              : `default_${fIdx}`
                          ] || getDefaultTransform(action.name, dir, fIdx, { frameCount: action.frameCount, assetType: asset.assetType });

                        return (
                          <div
                            key={fIdx}
                            onClick={() => {
                              setSelectedActionId(action.id);
                              setSelectedCellKey(cellKey);
                              setPreviewDirection(dir);
                            }}
                            className={`w-14 h-14 rounded-lg border relative cursor-pointer overflow-hidden transition group shrink-0 ${
                              isSelected
                                ? 'border-[#22d3ee] ring-2 ring-[#22d3ee] shadow-lg shadow-[#22d3ee]/20'
                                : 'border-[#334155] hover:border-[#22d3ee]/60'
                            }`}
                            style={{
                              backgroundColor: '#1e293b',
                              backgroundImage:
                                'linear-gradient(45deg, #0f172a 25%, transparent 25%), linear-gradient(-45deg, #0f172a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #0f172a 75%), linear-gradient(-45deg, transparent 75%, #0f172a 75%)',
                              backgroundSize: '8px 8px',
                              backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                            }}
                          >
                            {sourceLoaded && renderCellThumbnail(action, dir, fIdx)}

                            {/* Frame Index Badge */}
                            <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 bg-[#0f172a]/80 text-[#94a3b8] text-[9px] font-mono rounded">
                              f{fIdx}
                            </span>

                            {/* Transform Tag */}
                            {transform.sourceType === 'mirror' && (
                              <span className="absolute top-0.5 left-0.5 px-1 py-0.2 bg-blue-900/80 text-blue-300 text-[8px] font-mono rounded">
                                flip
                              </span>
                            )}
                            {transform.isPlaceholder && (
                              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })}
            </div>
          </div>
        </div>

        {/* Bottom: Live 3-Biome Dungeon Preview */}
        <div className="h-44 bg-[#0f172a] border-t border-[#334155] p-3 flex items-center justify-between gap-6 shrink-0">
          {/* Player Controls */}
          <div className="space-y-2 min-w-[200px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#e2e8f0] flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-[#22d3ee]" />
                Animation Player
              </span>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition ${
                  isPlaying
                    ? 'bg-[#22d3ee] text-[#0f172a] border-[#22d3ee]'
                    : 'bg-[#1e293b] text-[#e2e8f0] border-[#334155]'
                }`}
                title="Spacebar to toggle"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>
            </div>

            {/* Direction Selector & FPS */}
            <div className="flex items-center gap-2">
              <select
                value={previewDirection}
                onChange={(e) => setPreviewDirection(e.target.value as Direction)}
                className="bg-[#1e293b] text-[#e2e8f0] text-xs py-1 px-2 rounded border border-[#334155] focus:outline-none"
              >
                {FIXED_DIRECTIONS.map((d) => (
                  <option key={d} value={d}>
                    Dir: {d.toUpperCase()}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 text-xs text-[#94a3b8]">
                <span>FPS:</span>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={previewFps}
                  onChange={(e) => setPreviewFps(Number(e.target.value))}
                  className="w-10 bg-[#1e293b] text-center text-[#22d3ee] font-mono py-0.5 rounded border border-[#334155] text-xs"
                />
              </div>
            </div>

            <p className="text-[10px] text-[#94a3b8] font-mono">
              Action: <span className="text-[#22d3ee]">{currentAction?.name}</span> | Frame:{' '}
              <span className="text-[#22d3ee]">{currentFrameIndex}</span>
            </p>
          </div>

          {/* 3 Biome Dungeon Floor Previews Side by Side */}
          <div className="flex items-center gap-4 overflow-x-auto">
            {/* 1. Catacombs Floor (#0f172a / #1e293b) */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-mono text-[#94a3b8]">Catacombs Floor</span>
              <div
                className="w-20 h-20 rounded-lg border border-[#334155] flex items-center justify-center shadow-lg relative overflow-hidden"
                style={{
                  backgroundColor: '#0f172a',
                  backgroundImage:
                    'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                  backgroundSize: '16px 16px',
                }}
              >
                <canvas
                  ref={previewCatacombsRef}
                  className="w-full h-full object-contain pixelated"
                />
              </div>
            </div>

            {/* 2. Forges Floor (#290b02 / #451a03) */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-mono text-[#94a3b8]">Forges Floor</span>
              <div
                className="w-20 h-20 rounded-lg border border-[#334155] flex items-center justify-center shadow-lg relative overflow-hidden"
                style={{
                  backgroundColor: '#290b02',
                  backgroundImage:
                    'linear-gradient(45deg, #451a03 25%, transparent 25%), linear-gradient(-45deg, #451a03 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #451a03 75%), linear-gradient(-45deg, transparent 75%, #451a03 75%)',
                  backgroundSize: '16px 16px',
                }}
              >
                <canvas
                  ref={previewForgesRef}
                  className="w-full h-full object-contain pixelated"
                />
              </div>
            </div>

            {/* 3. Void Floor (#17053b / #2e1065) */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-mono text-[#94a3b8]">Void Floor</span>
              <div
                className="w-20 h-20 rounded-lg border border-[#334155] flex items-center justify-center shadow-lg relative overflow-hidden"
                style={{
                  backgroundColor: '#17053b',
                  backgroundImage:
                    'linear-gradient(45deg, #2e1065 25%, transparent 25%), linear-gradient(-45deg, #2e1065 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2e1065 75%), linear-gradient(-45deg, transparent 75%, #2e1065 75%)',
                  backgroundSize: '16px 16px',
                }}
              >
                <canvas
                  ref={previewVoidRef}
                  className="w-full h-full object-contain pixelated"
                />
              </div>
            </div>

            {/* 4. Checkerboard Neutral */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-mono text-[#94a3b8]">Checkerboard</span>
              <div
                className="w-20 h-20 rounded-lg border border-[#334155] flex items-center justify-center shadow-lg relative overflow-hidden"
                style={{
                  backgroundColor: '#1e293b',
                  backgroundImage:
                    'linear-gradient(45deg, #0f172a 25%, transparent 25%), linear-gradient(-45deg, #0f172a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #0f172a 75%), linear-gradient(-45deg, transparent 75%, #0f172a 75%)',
                  backgroundSize: '8px 8px',
                }}
              >
                <canvas
                  ref={previewCheckerRef}
                  className="w-full h-full object-contain pixelated"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Cell Transform Inspector */}
      <div className="w-80 bg-[#0f172a] border-l border-[#334155] flex flex-col shrink-0 h-full overflow-y-auto p-4 space-y-5">
        <div className="pb-3 border-b border-[#334155]">
          <h2 className="text-sm font-bold text-[#e2e8f0]">Cell Transform Inspector</h2>
          <p className="text-[11px] text-[#94a3b8]">
            {parsedSelection
              ? `${parsedSelection.actionId} → ${parsedSelection.direction} (frame ${parsedSelection.frameIdx})`
              : 'Select a cell in the grid'}
          </p>
        </div>

        {/* Source Mode Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
            Cell Source Type
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'source', label: 'Source (As-Is)', icon: Eye },
              { id: 'mirror', label: 'Mirror (Flip H)', icon: FlipHorizontal },
              { id: 'offset', label: 'Offset / Nudge', icon: Move },
              { id: 'squash', label: 'Squash & Stretch', icon: Sliders },
              { id: 'rotate', label: 'Rotate 90°', icon: RotateCw },
              { id: 'tint', label: 'Tint Multiply', icon: Palette },
            ].map((mode) => {
              const Icon = mode.icon;
              const isActive = activeTransform.sourceType === mode.id;

              return (
                <button
                  key={mode.id}
                  onClick={() => handleUpdateTransform({ sourceType: mode.id as any })}
                  className={`p-2 rounded-lg border text-left flex items-center gap-2 transition ${
                    isActive
                      ? 'bg-[#22d3ee]/15 border-[#22d3ee] text-[#22d3ee] font-bold'
                      : 'bg-[#1e293b] border-[#334155] text-[#94a3b8] hover:text-[#e2e8f0]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px] truncate">{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Offset Controls */}
        <div className="bg-[#1e293b]/40 border border-[#334155] rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-[#e2e8f0]">
            <span>Position Offset (Bob & Nudge)</span>
            <button
              onClick={() => handleUpdateTransform({ offsetX: 0, offsetY: 0 })}
              className="text-[10px] text-[#94a3b8] hover:text-[#22d3ee] underline"
            >
              Reset
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#94a3b8]">X Nudge:</span>
              <span className="font-mono text-[#22d3ee] font-bold">{activeTransform.offsetX}px</span>
            </div>
            <input
              type="range"
              min="-16"
              max="16"
              value={activeTransform.offsetX}
              onChange={(e) => handleUpdateTransform({ offsetX: Number(e.target.value) })}
              className="w-full accent-[#22d3ee] cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#94a3b8]">Y Nudge:</span>
              <span className="font-mono text-[#22d3ee] font-bold">{activeTransform.offsetY}px</span>
            </div>
            <input
              type="range"
              min="-16"
              max="16"
              value={activeTransform.offsetY}
              onChange={(e) => handleUpdateTransform({ offsetY: Number(e.target.value) })}
              className="w-full accent-[#22d3ee] cursor-pointer"
            />
          </div>
        </div>

        {/* Squash & Stretch */}
        <div className="bg-[#1e293b]/40 border border-[#334155] rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-[#e2e8f0]">
            <span>Squash & Stretch</span>
            <button
              onClick={() => handleUpdateTransform({ squashX: 1, squashY: 1 })}
              className="text-[10px] text-[#94a3b8] hover:text-[#22d3ee] underline"
            >
              Reset (1.0x)
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#94a3b8]">Vertical Squash (Y):</span>
              <span className="font-mono text-[#22d3ee] font-bold">
                {Math.round(activeTransform.squashY * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.2"
              step="0.05"
              value={activeTransform.squashY}
              onChange={(e) => handleUpdateTransform({ squashY: Number(e.target.value) })}
              className="w-full accent-[#22d3ee] cursor-pointer"
            />
          </div>
        </div>

        {/* Rotation Steps (0, 90, 180, 270) */}
        <div className="bg-[#1e293b]/40 border border-[#334155] rounded-xl p-3.5 space-y-2">
          <span className="text-xs font-semibold text-[#e2e8f0]">Rotation (Pixel-Preserving)</span>
          <div className="grid grid-cols-4 gap-1">
            {[0, 90, 180, 270].map((deg) => (
              <button
                key={deg}
                onClick={() => handleUpdateTransform({ rotation: deg as any })}
                className={`py-1.5 rounded border text-xs font-mono font-medium transition ${
                  activeTransform.rotation === deg
                    ? 'bg-[#22d3ee] text-[#0f172a] font-bold border-[#22d3ee]'
                    : 'bg-[#0f172a] border-[#334155] text-[#94a3b8] hover:text-[#e2e8f0]'
                }`}
              >
                {deg}°
              </button>
            ))}
          </div>
        </div>

        {/* Tint Color & Opacity (Hit flash & Death fade) */}
        <div className="bg-[#1e293b]/40 border border-[#334155] rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-[#e2e8f0]">
            <span>Color Tint Multiply</span>
            <input
              type="color"
              value={activeTransform.tintColor || '#ffffff'}
              onChange={(e) => handleUpdateTransform({ tintColor: e.target.value })}
              className="w-5 h-5 rounded border border-[#334155] bg-transparent cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#94a3b8]">Tint Opacity:</span>
              <span className="font-mono text-[#22d3ee] font-bold">
                {Math.round((activeTransform.tintOpacity || 0) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={activeTransform.tintOpacity || 0}
              onChange={(e) => handleUpdateTransform({ tintOpacity: Number(e.target.value) })}
              className="w-full accent-[#22d3ee] cursor-pointer"
            />
          </div>
        </div>

        {/* Proceed Action Button */}
        <div className="pt-2">
          <button
            onClick={onProceedToExport}
            className="w-full py-3 px-4 bg-[#22d3ee] hover:bg-[#38bdf8] text-[#0f172a] font-bold text-xs rounded-xl shadow-lg shadow-[#22d3ee]/20 flex items-center justify-center gap-2 transition"
          >
            <span>Proceed to Step 5: Export Sheet & Atlas</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
