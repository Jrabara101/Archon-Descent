import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  FileJson,
  Image as ImageIcon,
  Layers,
  CheckCircle2,
  Copy,
  Check,
  AlertTriangle,
  FolderArchive,
  RefreshCw,
  ExternalLink,
  Code,
} from 'lucide-react';
import { AtlasJsonExport, SpriteAsset } from '../types';
import {
  buildSpriteSheetCanvas,
  downloadBlob,
  extractIndividualFrame,
} from '../utils/sheetGenerator';

interface ExportScreenProps {
  asset: SpriteAsset;
  allAssets: SpriteAsset[];
}

export const ExportScreen: React.FC<ExportScreenProps> = ({
  asset,
  allAssets,
}) => {
  const [sheetCanvas, setSheetCanvas] = useState<HTMLCanvasElement | null>(null);
  const [atlasJson, setAtlasJson] = useState<AtlasJsonExport | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [totalCols, setTotalCols] = useState(0);
  const [copiedJson, setCopiedJson] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [batchProgress, setBatchProgress] = useState<string | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Compile Sprite Sheet Canvas and Atlas JSON
  useEffect(() => {
    let isCancelled = false;

    const generate = async () => {
      setIsExporting(true);
      setValidationError(null);
      try {
        const { canvas, atlas, totalRows: rows, totalCols: cols } =
          await buildSpriteSheetCanvas(asset);

        if (isCancelled) return;

        setSheetCanvas(canvas);
        setAtlasJson(atlas);
        setTotalRows(rows);
        setTotalCols(cols);

        // Render preview canvas
        if (previewCanvasRef.current) {
          previewCanvasRef.current.width = canvas.width;
          previewCanvasRef.current.height = canvas.height;
          const ctx = previewCanvasRef.current.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(canvas, 0, 0);
          }
        }
      } catch (err: any) {
        console.error('Sheet generation error:', err);
        setValidationError(err.message || 'Error generating sprite sheet.');
      } finally {
        setIsExporting(false);
      }
    };

    generate();

    return () => {
      isCancelled = true;
    };
  }, [asset]);

  // Export 1: Download Sheet PNG
  const handleDownloadSheet = () => {
    if (!sheetCanvas || !atlasJson) return;
    if (validationError) {
      alert(`Cannot export: ${validationError}`);
      return;
    }

    sheetCanvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, atlasJson.sheet);
      } else {
        // Fallback open image in new window
        const win = window.open();
        if (win) {
          win.document.write(
            `<p>Right click and Save Image As "${atlasJson.sheet}":</p><img src="${sheetCanvas.toDataURL(
              'image/png'
            )}" />`
          );
        }
      }
    }, 'image/png');
  };

  // Export 2: Download Atlas JSON
  const handleDownloadAtlasJson = () => {
    if (!atlasJson) return;
    const jsonStr = JSON.stringify(atlasJson, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    downloadBlob(blob, `${atlasJson.id}_atlas.json`);
  };

  // Copy Atlas JSON to clipboard
  const handleCopyAtlasJson = () => {
    if (!atlasJson) return;
    navigator.clipboard.writeText(JSON.stringify(atlasJson, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Export 3: Download Individual Frames
  const handleDownloadAllFrames = async () => {
    if (!sheetCanvas || !atlasJson) return;
    setIsExporting(true);

    try {
      const cellSize = asset.pixelateConfig.cellSize;
      let currentRow = 0;

      for (const action of asset.actions) {
        if (action.directionMode === '4-way') {
          const dirs = ['down', 'up', 'left', 'right'];
          for (let d = 0; d < 4; d++) {
            const dir = dirs[d];
            for (let f = 0; f < action.frameCount; f++) {
              const frameBlob = await extractIndividualFrame(
                sheetCanvas,
                currentRow,
                f,
                cellSize
              );
              const filename = `${atlasJson.id}_${action.name}_${dir}_f${f}.png`;
              downloadBlob(frameBlob, filename);
            }
            currentRow++;
          }
        } else {
          for (let f = 0; f < action.frameCount; f++) {
            const frameBlob = await extractIndividualFrame(
              sheetCanvas,
              currentRow,
              f,
              cellSize
            );
            const filename = `${atlasJson.id}_${action.name}_f${f}.png`;
            downloadBlob(frameBlob, filename);
          }
          currentRow++;
        }
      }
    } catch (err) {
      console.error('Error downloading individual frames:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Export 4: Batch Export All Assets
  const handleBatchExport = async () => {
    if (allAssets.length === 0) return;
    setIsExporting(true);
    setBatchProgress(`Processing 0 / ${allAssets.length}...`);

    const combinedAtlas: Record<string, AtlasJsonExport> = {};

    try {
      for (let i = 0; i < allAssets.length; i++) {
        const item = allAssets[i];
        setBatchProgress(`Processing ${i + 1} / ${allAssets.length}: ${item.name}...`);

        const { canvas, atlas } = await buildSpriteSheetCanvas(item);
        combinedAtlas[atlas.id] = atlas;

        // Download sheet
        await new Promise<void>((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) {
              downloadBlob(blob, atlas.sheet);
            }
            setTimeout(resolve, 200);
          }, 'image/png');
        });
      }

      // Download Combined Atlas JSON
      const combinedBlob = new Blob([JSON.stringify(combinedAtlas, null, 2)], {
        type: 'application/json',
      });
      downloadBlob(combinedBlob, 'sprite_forge_combined_atlas.json');
      setBatchProgress('Batch export complete!');
    } catch (err: any) {
      console.error('Batch export failed:', err);
      alert('Batch export error: ' + err.message);
    } finally {
      setIsExporting(false);
      setTimeout(() => setBatchProgress(null), 3000);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0f172a] select-none">
      {/* Main Preview Area */}
      <div className="flex-1 flex flex-col overflow-y-auto p-6 bg-[#0a0f1d] space-y-6">
        {/* Header & Verification Badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#e2e8f0]">Export Sprite Sheet & Atlas</h2>
            <p className="text-xs text-[#94a3b8]">
              Ready for game engine integration (Phaser, Godot, Unity, Custom WebGL)
            </p>
          </div>

          {validationError ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-950/80 border border-red-800 text-red-300 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>{validationError}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Exact Atlas Row Indices & Alpha Validated</span>
            </div>
          )}
        </div>

        {/* Sheet Preview Card */}
        <div className="bg-[#1e293b]/60 border border-[#334155] rounded-xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#22d3ee]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#e2e8f0]">
                Compiled Sprite Sheet PNG ({totalCols * asset.pixelateConfig.cellSize}×
                {totalRows * asset.pixelateConfig.cellSize} px)
              </span>
            </div>

            <span className="text-[11px] font-mono text-[#94a3b8]">
              {totalRows} Rows × {totalCols} Cols • {asset.pixelateConfig.cellSize}px Cells
            </span>
          </div>

          {/* Canvas with Dark Checkerboard */}
          <div
            className="w-full min-h-[220px] max-h-[380px] rounded-lg border border-[#334155] overflow-auto flex items-center justify-center p-4 relative"
            style={{
              backgroundColor: '#1e293b',
              backgroundImage:
                'linear-gradient(45deg, #0f172a 25%, transparent 25%), linear-gradient(-45deg, #0f172a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #0f172a 75%), linear-gradient(-45deg, transparent 75%, #0f172a 75%)',
              backgroundSize: '16px 16px',
              backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
            }}
          >
            <canvas
              ref={previewCanvasRef}
              className="max-h-[340px] max-w-full object-contain pixelated shadow-lg"
            />
          </div>
        </div>

        {/* JSON Atlas Code Preview */}
        <div className="bg-[#1e293b]/60 border border-[#334155] rounded-xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4 text-[#22d3ee]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#e2e8f0]">
                JSON Atlas Metadata ({atlasJson?.sheet})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyAtlasJson}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0f172a] hover:bg-[#334155] border border-[#334155] text-xs text-[#e2e8f0] font-medium transition"
              >
                {copiedJson ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#22d3ee]" />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <pre className="bg-[#0f172a] p-4 rounded-lg border border-[#334155] text-[11px] font-mono text-[#22d3ee] overflow-x-auto max-h-60 leading-relaxed">
            {atlasJson ? JSON.stringify(atlasJson, null, 2) : '// Generating atlas...'}
          </pre>
        </div>
      </div>

      {/* Right: Export Actions Panel */}
      <div className="w-80 bg-[#0f172a] border-l border-[#334155] flex flex-col shrink-0 h-full overflow-y-auto p-4 space-y-5">
        <div className="pb-3 border-b border-[#334155]">
          <h2 className="text-sm font-bold text-[#e2e8f0]">Export Actions</h2>
          <p className="text-[11px] text-[#94a3b8]">Select target export package</p>
        </div>

        {/* Export 1: Sheet PNG */}
        <div className="bg-[#1e293b]/60 border border-[#334155] rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#e2e8f0] flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-[#22d3ee]" />
              1. Sprite Sheet PNG
            </span>
          </div>
          <p className="text-[11px] text-[#94a3b8]">
            Complete grid with real alpha transparency and pixel-precise cell boundaries.
          </p>
          <button
            onClick={handleDownloadSheet}
            disabled={isExporting}
            className="w-full py-2.5 px-3 bg-[#22d3ee] hover:bg-[#38bdf8] text-[#0f172a] font-bold text-xs rounded-lg shadow-md shadow-[#22d3ee]/20 flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            <span>Download {atlasJson?.sheet || 'Sheet.png'}</span>
          </button>
        </div>

        {/* Export 2: JSON Atlas */}
        <div className="bg-[#1e293b]/60 border border-[#334155] rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#e2e8f0] flex items-center gap-1.5">
              <FileJson className="w-4 h-4 text-[#22d3ee]" />
              2. JSON Atlas File
            </span>
          </div>
          <p className="text-[11px] text-[#94a3b8]">
            Row offset definitions, directions (down, up, left, right), and fps rates.
          </p>
          <button
            onClick={handleDownloadAtlasJson}
            disabled={isExporting}
            className="w-full py-2.5 px-3 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-[#e2e8f0] font-medium text-xs rounded-lg flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4 text-[#22d3ee]" />
            <span>Download {atlasJson?.id}_atlas.json</span>
          </button>
        </div>

        {/* Export 3: Individual Frame PNGs */}
        <div className="bg-[#1e293b]/60 border border-[#334155] rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#e2e8f0] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#22d3ee]" />
              3. Individual Frame PNGs
            </span>
          </div>
          <p className="text-[11px] text-[#94a3b8]">
            Exports each cell as a standalone PNG file with &lt;id&gt;_&lt;action&gt;_&lt;dir&gt;_&lt;frame&gt;.png naming.
          </p>
          <button
            onClick={handleDownloadAllFrames}
            disabled={isExporting}
            className="w-full py-2.5 px-3 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-[#e2e8f0] font-medium text-xs rounded-lg flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4 text-[#22d3ee]" />
            <span>Export Individual Frames</span>
          </button>
        </div>

        {/* Export 4: Batch Export All */}
        <div className="bg-[#1e293b]/80 border border-[#22d3ee]/40 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#e2e8f0] flex items-center gap-1.5">
              <FolderArchive className="w-4 h-4 text-[#22d3ee]" />
              4. Batch Export All ({allAssets.length} Assets)
            </span>
          </div>
          <p className="text-[11px] text-[#94a3b8]">
            Compiles every loaded asset in your session, downloading all sheet PNGs and a combined master JSON atlas.
          </p>
          <button
            onClick={handleBatchExport}
            disabled={isExporting}
            className="w-full py-2.5 px-3 bg-[#22d3ee]/20 hover:bg-[#22d3ee]/30 border border-[#22d3ee] text-[#22d3ee] font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition shadow-sm"
          >
            {isExporting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Batch Export All Sheets & Master Atlas</span>
          </button>
          {batchProgress && (
            <p className="text-[10px] text-center font-mono text-[#22d3ee]">
              {batchProgress}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
