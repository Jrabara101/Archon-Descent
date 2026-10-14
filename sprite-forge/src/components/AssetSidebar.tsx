import React from 'react';
import {
  Trash2,
  Image as ImageIcon,
  Plus,
  Sparkles,
  Shield,
  Skull,
  Crown,
  HeartHandshake,
  Sword,
  Wand2,
  LayoutGrid,
  Box,
  HardDrive,
} from 'lucide-react';
import { AssetType, SpriteAsset } from '../types';

interface AssetSidebarProps {
  assets: SpriteAsset[];
  activeAssetId: string | null;
  onSelectAsset: (id: string) => void;
  onRemoveAsset: (id: string, e: React.MouseEvent) => void;
  onChangeAssetType: (id: string, newType: AssetType) => void;
  onOpenIntake: () => void;
  onAddDemo: () => void;
}

const ASSET_TYPE_ICONS: Record<AssetType, React.ElementType> = {
  character: Shield,
  enemy: Skull,
  boss: Crown,
  companion: HeartHandshake,
  weapon: Sword,
  skill_fx: Wand2,
  map_tile: LayoutGrid,
  prop: Box,
};

const ASSET_TYPE_OPTIONS: { value: AssetType; label: string }[] = [
  { value: 'character', label: 'Character' },
  { value: 'enemy', label: 'Enemy' },
  { value: 'boss', label: 'Boss (2x)' },
  { value: 'companion', label: 'Companion' },
  { value: 'weapon', label: 'Weapon' },
  { value: 'skill_fx', label: 'Skill FX' },
  { value: 'map_tile', label: 'Map Tile' },
  { value: 'prop', label: 'Prop' },
];

export const AssetSidebar: React.FC<AssetSidebarProps> = ({
  assets,
  activeAssetId,
  onSelectAsset,
  onRemoveAsset,
  onChangeAssetType,
  onOpenIntake,
  onAddDemo,
}) => {
  return (
    <aside className="w-64 bg-[#1e293b] border-r border-[#334155] flex flex-col shrink-0 h-full overflow-hidden select-none">
      {/* Sidebar Header */}
      <div className="p-3 bg-[#162030] border-b border-[#334155] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">
            PROJECT ASSETS
          </span>
          <span className="px-1.5 py-0.2 rounded bg-[#0f172a] text-[#22d3ee] font-mono text-[10px] font-bold border border-[#334155]">
            {assets.length}
          </span>
        </div>
        <button
          onClick={onOpenIntake}
          className="p-1 rounded hover:bg-[#1e293b] text-[#94a3b8] hover:text-[#22d3ee] transition"
          title="Import files"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Assets List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#334155]/40">
        {assets.length === 0 ? (
          <div className="p-4 text-center m-3 border border-dashed border-[#334155] rounded-md">
            <ImageIcon className="w-6 h-6 text-[#475569] mx-auto mb-2" />
            <p className="text-[11px] text-[#94a3b8] mb-3 font-mono">NO ASSETS LOADED</p>
            <div className="space-y-1.5">
              <button
                onClick={onAddDemo}
                className="w-full py-1 px-2 bg-[#22d3ee] hover:bg-[#38bdf8] text-[#0f172a] rounded text-[11px] font-bold flex items-center justify-center gap-1 transition"
              >
                <Sparkles className="w-3 h-3" />
                <span>LOAD DEMO ART</span>
              </button>
              <button
                onClick={onOpenIntake}
                className="w-full py-1 px-2 bg-[#0f172a] hover:bg-[#334155] rounded text-[11px] text-[#94a3b8] hover:text-[#e2e8f0] border border-[#334155] font-mono transition"
              >
                + UPLOAD PNGS
              </button>
            </div>
          </div>
        ) : (
          assets.map((asset) => {
            const isActive = asset.id === activeAssetId;
            const Icon = ASSET_TYPE_ICONS[asset.assetType] || Shield;

            return (
              <div
                key={asset.id}
                onClick={() => onSelectAsset(asset.id)}
                className={`group relative p-2.5 flex items-center gap-2.5 transition cursor-pointer ${
                  isActive
                    ? 'bg-[#0f172a] border-l-2 border-[#22d3ee]'
                    : 'border-l-2 border-transparent hover:bg-[#162030]'
                }`}
              >
                {/* Thumbnail with checkerboard */}
                <div
                  className="w-11 h-11 rounded border border-[#334155] shrink-0 overflow-hidden relative"
                  style={{
                    backgroundColor: '#0f172a',
                    backgroundImage:
                      'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                    backgroundSize: '8px 8px',
                    backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                  }}
                >
                  <img
                    src={asset.pixelatedDataUrl || asset.cutoutDataUrl || asset.rawImageSrc}
                    alt={asset.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain pixelated"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-[11px] font-bold uppercase truncate font-mono ${isActive ? 'text-[#22d3ee]' : 'text-[#e2e8f0]'}`} title={asset.name}>
                      {asset.name}
                    </p>
                    <button
                      onClick={(e) => onRemoveAsset(asset.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[#94a3b8] hover:text-red-400 hover:bg-[#334155] transition"
                      title="Remove asset"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-[#94a3b8] font-mono mt-0.5">
                    <span>{asset.width}×{asset.height}</span>
                    <span className="text-[#22d3ee] font-bold">{asset.pixelateConfig.cellSize}px</span>
                  </div>

                  {/* Asset Type Selector */}
                  <div className="mt-1.5 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Icon className="w-2.5 h-2.5 text-[#22d3ee] shrink-0" />
                    <select
                      value={asset.assetType}
                      onChange={(e) =>
                        onChangeAssetType(asset.id, e.target.value as AssetType)
                      }
                      className="w-full bg-[#1e293b] text-[#e2e8f0] text-[10px] font-medium py-0.5 px-1 rounded border border-[#334155] hover:border-[#22d3ee] focus:border-[#22d3ee] focus:outline-none cursor-pointer"
                    >
                      {ASSET_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* High-density Storage & Actions Footer */}
      <div className="p-3 bg-[#162030] border-t border-[#334155] space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono text-[#94a3b8]">
          <span className="flex items-center gap-1">
            <HardDrive className="w-3 h-3 text-[#22d3ee]" />
            <span>STORAGE</span>
          </span>
          <span className="text-[#e2e8f0] font-bold">14.2 MB / 50 MB</span>
        </div>
        <div className="h-1 bg-[#0f172a] rounded overflow-hidden">
          <div className="h-full bg-[#22d3ee] rounded" style={{ width: `${Math.min(100, Math.max(15, assets.length * 12))}%` }}></div>
        </div>

        <button
          onClick={onAddDemo}
          className="w-full py-1.5 px-2 bg-[#22d3ee] hover:bg-[#38bdf8] rounded text-[11px] font-bold text-[#0f172a] flex items-center justify-center gap-1.5 shadow-sm shadow-[#22d3ee]/20 transition"
        >
          <Sparkles className="w-3 h-3" />
          <span>ADD DEMO ARTWORK</span>
        </button>
      </div>
    </aside>
  );
};

