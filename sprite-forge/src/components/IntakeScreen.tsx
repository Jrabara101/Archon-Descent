import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileArchive,
  Image as ImageIcon,
  Sparkles,
  Shield,
  Skull,
  Crown,
  HeartHandshake,
  Sword,
  Wand2,
  LayoutGrid,
  Box,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { AssetType } from '../types';
import { DEMO_PRESETS, generateDemoArtwork } from '../utils/demoAssets';
import { extractPngsFromZip } from '../utils/zipUtils';

interface IntakeScreenProps {
  onFilesLoaded: (
    files: { name: string; filename: string; dataUrl: string; assetType: AssetType }[]
  ) => void;
  onContinueToCutout: () => void;
  hasLoadedAssets: boolean;
}

export const IntakeScreen: React.FC<IntakeScreenProps> = ({
  onFilesLoaded,
  onContinueToCutout,
  hasLoadedAssets,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const processFileList = async (fileList: FileList | File[]) => {
    setErrorMessage(null);
    setLoadingStatus('Reading files...');
    const loaded: { name: string; filename: string; dataUrl: string; assetType: AssetType }[] = [];

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const lowerName = file.name.toLowerCase();

        if (lowerName.endsWith('.zip')) {
          setLoadingStatus(`Extracting ${file.name}...`);
          try {
            const zipFiles = await extractPngsFromZip(file);
            for (const zf of zipFiles) {
              const dataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(zf.blob);
              });
              const cleanName = zf.filename
                .replace(/^.*[\\/]/, '')
                .replace(/\.[^/.]+$/, '');
              loaded.push({
                name: cleanName,
                filename: zf.filename,
                dataUrl,
                assetType: guessAssetTypeFromName(cleanName),
              });
            }
          } catch (zipErr: any) {
            setErrorMessage(zipErr.message || 'Failed to extract .zip archive.');
          }
        } else if (file.type.startsWith('image/') || lowerName.endsWith('.png')) {
          setLoadingStatus(`Reading ${file.name}...`);
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          const cleanName = file.name.replace(/\.[^/.]+$/, '');
          loaded.push({
            name: cleanName,
            filename: file.name,
            dataUrl,
            assetType: guessAssetTypeFromName(cleanName),
          });
        } else {
          setErrorMessage(
            `Unsupported file: "${file.name}". Please provide PNG image files or a ZIP of PNGs.`
          );
        }
      }

      if (loaded.length > 0) {
        onFilesLoaded(loaded);
        setLoadingStatus(null);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error loading files.');
    } finally {
      setLoadingStatus(null);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFileList(e.dataTransfer.files);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFileList(e.target.files);
    }
  };

  const handleLoadDemo = (preset: (typeof DEMO_PRESETS)[0]) => {
    setLoadingStatus(`Generating high-res demo artwork: ${preset.name}...`);
    setTimeout(() => {
      const dataUrl = generateDemoArtwork(preset.type);
      onFilesLoaded([
        {
          name: preset.name,
          filename: `${preset.name}.png`,
          dataUrl,
          assetType: preset.type,
        },
      ]);
      setLoadingStatus(null);
    }, 50);
  };

  const handleLoadAllDemos = () => {
    setLoadingStatus('Generating all demo art assets...');
    setTimeout(() => {
      const all = DEMO_PRESETS.map((p) => ({
        name: p.name,
        filename: `${p.name}.png`,
        dataUrl: generateDemoArtwork(p.type),
        assetType: p.type,
      }));
      onFilesLoaded(all);
      setLoadingStatus(null);
    }, 100);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-start max-w-6xl mx-auto w-full space-y-8">
      {/* Title / Purpose */}
      <div className="text-center space-y-2 max-w-2xl">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#e2e8f0]">
          Intake High-Resolution Artwork
        </h1>
        <p className="text-sm text-[#94a3b8] leading-relaxed">
          Drop 1024×1024 AI-generated character & object renders with baked-in dungeon backgrounds.
          Sprite Forge will strip backgrounds, pixelate to 64×64 or custom sizes, snap to dark cyberpunk biome palettes, and assemble complete multi-action sprite sheets with JSON atlases.
        </p>
      </div>

      {/* Error / Status Alert */}
      {errorMessage && (
        <div className="w-full max-w-2xl bg-red-950/50 border border-red-800/80 rounded-lg p-3.5 flex items-start gap-3 text-red-200 text-xs">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Import Notice</p>
            <p className="mt-0.5 text-red-300">{errorMessage}</p>
          </div>
        </div>
      )}

      {loadingStatus && (
        <div className="w-full max-w-2xl bg-[#1e293b] border border-[#22d3ee]/40 rounded-lg p-3 flex items-center gap-3 text-[#22d3ee] text-xs">
          <div className="w-4 h-4 border-2 border-[#22d3ee] border-t-transparent rounded-full animate-spin shrink-0" />
          <span>{loadingStatus}</span>
        </div>
      )}

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full max-w-2xl rounded-2xl border-2 border-dashed p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-[#22d3ee] bg-[#22d3ee]/10 scale-[1.01]'
            : 'border-[#334155] bg-[#1e293b]/40 hover:border-[#22d3ee]/60 hover:bg-[#1e293b]/80'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,application/zip,.zip"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="w-16 h-16 rounded-2xl bg-[#0f172a] border border-[#334155] flex items-center justify-center mb-4 text-[#22d3ee] shadow-inner shadow-[#22d3ee]/10">
          <UploadCloud className="w-8 h-8 animate-bounce" />
        </div>

        <h3 className="text-base font-semibold text-[#e2e8f0]">
          Drag & Drop PNGs or .ZIP Archive Here
        </h3>
        <p className="text-xs text-[#94a3b8] mt-1.5 max-w-md">
          Supports loose 1024×1024 PNG files or a compressed zip folder. Processed 100% locally in your browser memory — files never leave your machine.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-[#22d3ee] hover:bg-[#38bdf8] text-[#0f172a] font-bold text-xs shadow-md shadow-[#22d3ee]/20 transition"
          >
            Browse PNG Files
          </button>
        </div>
      </div>

      {/* Quick Demo Art Loader */}
      <div className="w-full max-w-3xl bg-[#1e293b]/60 border border-[#334155] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#22d3ee]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#e2e8f0]">
              Don't have 1024×1024 artwork ready? Try Built-In Cyberpunk Demo Art
            </h3>
          </div>
          <button
            onClick={handleLoadAllDemos}
            className="text-[11px] text-[#22d3ee] hover:underline font-medium"
          >
            Load All (6 Presets)
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {DEMO_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handleLoadDemo(preset)}
              className="p-2 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] border border-[#334155] hover:border-[#22d3ee] text-left transition group flex flex-col justify-between"
            >
              <div className="w-full aspect-square rounded bg-[#1e293b] mb-2 flex items-center justify-center text-[#94a3b8] group-hover:text-[#22d3ee] transition border border-[#334155]">
                {preset.type === 'character' && <Shield className="w-6 h-6" />}
                {preset.type === 'enemy' && <Skull className="w-6 h-6" />}
                {preset.type === 'boss' && <Crown className="w-6 h-6" />}
                {preset.type === 'weapon' && <Sword className="w-6 h-6" />}
                {preset.type === 'skill_fx' && <Wand2 className="w-6 h-6" />}
                {preset.type === 'prop' && <Box className="w-6 h-6" />}
              </div>
              <p className="text-[11px] font-semibold text-[#e2e8f0] group-hover:text-[#22d3ee] truncate">
                {preset.label}
              </p>
              <p className="text-[9px] uppercase font-mono text-[#94a3b8] mt-0.5">
                {preset.type}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Asset Types Reference Table */}
      <div className="w-full max-w-3xl bg-[#1e293b]/40 border border-[#334155] rounded-xl p-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#94a3b8] mb-3">
          Asset Types & Auto-Configured Action Sets
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-2.5 rounded bg-[#0f172a]/60 border border-[#334155]/60 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-[#22d3ee] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#e2e8f0]">Character / Enemy / Companion</p>
              <p className="text-[#94a3b8] text-[11px] mt-0.5">
                Full 4-way walk set (down, up, left, right): idle, walk, attack, hit, death.
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded bg-[#0f172a]/60 border border-[#334155]/60 flex items-start gap-2.5">
            <Crown className="w-4 h-4 text-[#22d3ee] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#e2e8f0]">Boss (2× Scale)</p>
              <p className="text-[#94a3b8] text-[11px] mt-0.5">
                Same action set, but defaults to cell size 128 (occupies 2×2 game tiles).
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded bg-[#0f172a]/60 border border-[#334155]/60 flex items-start gap-2.5">
            <Sword className="w-4 h-4 text-[#22d3ee] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#e2e8f0]">Weapon / Prop</p>
              <p className="text-[#94a3b8] text-[11px] mt-0.5">
                Static item icon, 1-way single row (no direction rotation needed).
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded bg-[#0f172a]/60 border border-[#334155]/60 flex items-start gap-2.5">
            <Wand2 className="w-4 h-4 text-[#22d3ee] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#e2e8f0]">Skill FX & Map Tiles</p>
              <p className="text-[#94a3b8] text-[11px] mt-0.5">
                Multi-frame effect strips (cast, impact) or 4-way tile variants.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      {hasLoadedAssets && (
        <div className="pt-2">
          <button
            onClick={onContinueToCutout}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#22d3ee] hover:bg-[#38bdf8] text-[#0f172a] font-bold text-sm shadow-lg shadow-[#22d3ee]/25 transition"
          >
            <span>Proceed to Step 2: Cutout Background Removal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

function guessAssetTypeFromName(name: string): AssetType {
  const lower = name.toLowerCase();
  if (lower.includes('boss') || lower.includes('dragon') || lower.includes('behemoth')) {
    return 'boss';
  }
  if (lower.includes('enemy') || lower.includes('goblin') || lower.includes('skeleton') || lower.includes('monster')) {
    return 'enemy';
  }
  if (lower.includes('weapon') || lower.includes('sword') || lower.includes('blade') || lower.includes('axe') || lower.includes('bow')) {
    return 'weapon';
  }
  if (lower.includes('spell') || lower.includes('fx') || lower.includes('fireball') || lower.includes('slash') || lower.includes('cast')) {
    return 'skill_fx';
  }
  if (lower.includes('tile') || lower.includes('floor') || lower.includes('wall') || lower.includes('stairs')) {
    return 'map_tile';
  }
  if (lower.includes('prop') || lower.includes('chest') || lower.includes('barrel') || lower.includes('altar')) {
    return 'prop';
  }
  if (lower.includes('pet') || lower.includes('companion') || lower.includes('familiar')) {
    return 'companion';
  }
  return 'character';
}
