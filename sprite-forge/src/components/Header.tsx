import React from 'react';
import {
  Layers,
  Scissors,
  Grid,
  Film,
  Download,
  Plus,
  Sparkles,
  RefreshCw,
  FolderOpen,
  CheckCircle2,
} from 'lucide-react';
import { SpriteAsset } from '../types';

interface HeaderProps {
  currentTab: number;
  onSelectTab: (tab: number) => void;
  activeAsset: SpriteAsset | null;
  assetCount: number;
  onOpenIntake: () => void;
  onAddDemo: () => void;
  onResetActiveAsset: () => void;
  isProcessing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  activeAsset,
  assetCount,
  onOpenIntake,
  onAddDemo,
  onResetActiveAsset,
  isProcessing,
}) => {
  const tabs = [
    { id: 1, label: '1. INTAKE', icon: FolderOpen },
    { id: 2, label: '2. CUTOUT', icon: Scissors },
    { id: 3, label: '3. PIXELATE', icon: Grid },
    { id: 4, label: '4. LAYOUT', icon: Film },
    { id: 5, label: '5. EXPORT', icon: Download },
  ];

  return (
    <header className="relative h-13 bg-[#1e293b] border-b border-[#334155] px-4 lg:px-6 flex items-center justify-between shadow-lg select-none z-30 shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 bg-[#22d3ee] flex items-center justify-center rounded shadow-[0_0_10px_rgba(34,211,238,0.4)]">
          <div className="w-3.5 h-3.5 bg-[#0f172a] rounded-[1px] flex items-center justify-center">
            <Layers className="w-2.5 h-2.5 text-[#22d3ee]" />
          </div>
        </div>
        <div className="flex items-baseline">
          <h1 className="text-base font-bold tracking-tight text-[#22d3ee]">
            SPRITE FORGE
          </h1>
          <span className="text-[10px] text-[#94a3b8] font-mono ml-2 hidden sm:inline">
            v1.0.4
          </span>
        </div>

        {/* Active Asset Pill */}
        {activeAsset && (
          <div className="hidden xl:flex items-center gap-2 ml-3 px-2 py-0.5 rounded bg-[#0f172a] border border-[#334155] text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] animate-pulse"></span>
            <span className="text-[#e2e8f0] font-semibold max-w-[120px] truncate text-[11px]">
              {activeAsset.name}
            </span>
            <span className="text-[9px] uppercase px-1 rounded bg-[#1e293b] text-[#94a3b8] font-bold">
              {activeAsset.assetType}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <nav className="flex items-center gap-1 bg-[#0f172a] p-1 rounded-md border border-[#334155]">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const isDisabled = !activeAsset && tab.id > 1;

          return (
            <button
              key={tab.id}
              onClick={() => !isDisabled && onSelectTab(tab.id)}
              disabled={isDisabled}
              className={`px-3 sm:px-4 py-1 text-[11px] font-bold tracking-wider rounded transition-all ${
                isActive
                  ? 'bg-[#22d3ee] text-[#0f172a] shadow-sm shadow-[#22d3ee]/30'
                  : isDisabled
                  ? 'text-[#475569] cursor-not-allowed'
                  : 'text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1e293b]'
              }`}
              title={`Press ${tab.id} on keyboard`}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right Controls & Indicators */}
      <div className="flex items-center gap-3 text-xs font-mono text-[#94a3b8]">
        {activeAsset && (
          <span className="hidden md:inline text-[11px] font-mono text-[#94a3b8]">
            CELL_SIZE:{' '}
            <strong className="text-[#22d3ee]">
              {activeAsset.pixelateConfig.cellSize}px
            </strong>
          </span>
        )}

        <div className="hidden lg:flex items-center gap-1 px-2 py-0.5 bg-[#334155] rounded text-[10px] font-bold text-white tracking-wider">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>AUTO-SAVED</span>
        </div>

        <button
          onClick={onAddDemo}
          className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-[11px] text-[#22d3ee] font-bold transition"
          title="Generate synthetic demo artwork"
        >
          <Sparkles className="w-3 h-3" />
          <span>DEMO</span>
        </button>

        <button
          onClick={onOpenIntake}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#22d3ee]/15 hover:bg-[#22d3ee]/25 border border-[#22d3ee]/40 text-[11px] text-[#22d3ee] font-bold transition"
        >
          <Plus className="w-3 h-3" />
          <span>LOAD</span>
        </button>

        {isProcessing && (
          <div className="flex items-center gap-1 text-[10px] text-[#22d3ee] animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span className="hidden xl:inline">SYNCING...</span>
          </div>
        )}
      </div>
    </header>
  );
};

