/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { AssetSidebar } from './components/AssetSidebar';
import { IntakeScreen } from './components/IntakeScreen';
import { CutoutScreen } from './components/CutoutScreen';
import { PixelateScreen } from './components/PixelateScreen';
import { ActionLayoutScreen } from './components/ActionLayoutScreen';
import { ExportScreen } from './components/ExportScreen';
import { AssetType, SpriteAsset } from './types';
import { generateDemoArtwork } from './utils/demoAssets';
import { getDefaultActionsForType } from './utils/sheetGenerator';
import {
  computeTransparencyRatio,
  imageDataToDataUrl,
  loadImageData,
  runAutoCutout,
} from './utils/cutoutProcessor';
import { runPixelateProcess } from './utils/pixelateProcessor';

const STORAGE_KEY = 'sprite_forge_assets_meta_v1';

export default function App() {
  const [assets, setAssets] = useState<SpriteAsset[]>([]);
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Initialize with a high-res demo asset on first visit
  useEffect(() => {
    const initDefault = async () => {
      const demoUrl = generateDemoArtwork('character');
      const { imageData, width, height } = await loadImageData(demoUrl);

      const defaultCutoutConfig = {
        tolerance: 32,
        removeIslands: true,
        islandThresholdPercent: 0.5,
        featherAlpha: true,
        despillCyan: true,
        edgeDefringe: 0,
      };

      const cutoutData = runAutoCutout(imageData, defaultCutoutConfig);
      const cutoutUrl = imageDataToDataUrl(cutoutData);
      const transRatio = computeTransparencyRatio(cutoutData);

      const defaultPixelateConfig = {
        cellSize: 64 as const,
        downsampleMethod: 'dominant' as const,
        autoTrim: true,
        trimPadding: 4,
        quantizeMode: 'none' as const,
        medianCutColors: 16,
        biome: 'catacombs' as const,
        alphaThreshold: 128,
        outline: true,
        outlineColor: '#0f172a',
        rimLight: false,
        rimLightColor: '#22d3ee',
      };

      const pixelResult = runPixelateProcess(cutoutData, defaultPixelateConfig);
      const pixelatedUrl = imageDataToDataUrl(pixelResult.imageData);

      const newAsset: SpriteAsset = {
        id: 'paladin_operative',
        name: 'Paladin_Stitch_1024',
        filename: 'Paladin_Stitch_1024.png',
        width,
        height,
        assetType: 'character',
        scale: 1,
        rawImageSrc: demoUrl,
        cutoutDataUrl: cutoutUrl,
        pixelatedDataUrl: pixelatedUrl,
        cutoutConfig: defaultCutoutConfig,
        pixelateConfig: defaultPixelateConfig,
        actions: getDefaultActionsForType('character'),
        transparentRatio: transRatio,
        colorCount: pixelResult.colorCount,
        usedColors: pixelResult.usedColors,
        createdAt: Date.now(),
      };

      setAssets([newAsset]);
      setActiveAssetId(newAsset.id);
      setCurrentTab(1);
    };

    initDefault();
  }, []);

  // Keyboard navigation shortcuts: 1-5 for tabs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is typing in an input, do not intercept
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (['1', '2', '3', '4', '5'].includes(e.key)) {
        const tabNum = parseInt(e.key, 10);
        if (assets.length > 0 || tabNum === 1) {
          setCurrentTab(tabNum);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [assets.length]);

  // Active asset object
  const activeAsset = assets.find((a) => a.id === activeAssetId) || assets[0] || null;

  // Update active asset state
  const handleUpdateActiveAsset = useCallback(
    (changes: Partial<SpriteAsset>) => {
      if (!activeAssetId) return;
      setAssets((prev) =>
        prev.map((a) => (a.id === activeAssetId ? { ...a, ...changes } : a))
      );
    },
    [activeAssetId]
  );

  // Process and ingest new files from Intake
  const handleFilesLoaded = async (
    files: { name: string; filename: string; dataUrl: string; assetType: AssetType }[]
  ) => {
    setIsProcessing(true);
    const newCreatedAssets: SpriteAsset[] = [];

    try {
      for (const f of files) {
        const { imageData, width, height } = await loadImageData(f.dataUrl);

        const defaultCutoutConfig = {
          tolerance: 32,
          removeIslands: true,
          islandThresholdPercent: 0.5,
          featherAlpha: true,
          despillCyan: true,
          edgeDefringe: 0,
        };

        // Run automatic cutout pass immediately
        const cutoutData = runAutoCutout(imageData, defaultCutoutConfig);
        const cutoutUrl = imageDataToDataUrl(cutoutData);
        const transRatio = computeTransparencyRatio(cutoutData);

        const defaultCellSize = f.assetType === 'boss' ? (128 as const) : (64 as const);

        const defaultPixelateConfig = {
          cellSize: defaultCellSize,
          downsampleMethod: 'dominant' as const,
          autoTrim: true,
          trimPadding: 4,
          quantizeMode: 'none' as const,
          medianCutColors: 16,
          biome: 'catacombs' as const,
          alphaThreshold: 128,
          outline: true,
          outlineColor: '#0f172a',
          rimLight: false,
          rimLightColor: '#22d3ee',
        };

        const pixelResult = runPixelateProcess(cutoutData, defaultPixelateConfig);
        const pixelatedUrl = imageDataToDataUrl(pixelResult.imageData);

        const assetItem: SpriteAsset = {
          id: `${f.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_${Date.now().toString().slice(-4)}`,
          name: f.name,
          filename: f.filename,
          width,
          height,
          assetType: f.assetType,
          scale: f.assetType === 'boss' ? 2 : 1,
          rawImageSrc: f.dataUrl,
          cutoutDataUrl: cutoutUrl,
          pixelatedDataUrl: pixelatedUrl,
          cutoutConfig: defaultCutoutConfig,
          pixelateConfig: defaultPixelateConfig,
          actions: getDefaultActionsForType(f.assetType),
          transparentRatio: transRatio,
          colorCount: pixelResult.colorCount,
          usedColors: pixelResult.usedColors,
          createdAt: Date.now(),
        };

        newCreatedAssets.push(assetItem);
      }

      setAssets((prev) => [...newCreatedAssets, ...prev]);
      if (newCreatedAssets.length > 0) {
        setActiveAssetId(newCreatedAssets[0].id);
        setCurrentTab(2); // Jump straight to Cutout for review
      }
    } catch (err) {
      console.error('Error importing files:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Add a random demo preset
  const handleAddDemoAsset = async () => {
    const types: AssetType[] = ['character', 'enemy', 'boss', 'weapon', 'skill_fx', 'prop'];
    const randomType = types[assets.length % types.length];
    const name = `Demo_${randomType}_${Date.now().toString().slice(-3)}`;
    const demoUrl = generateDemoArtwork(randomType);
    await handleFilesLoaded([
      {
        name,
        filename: `${name}.png`,
        dataUrl: demoUrl,
        assetType: randomType,
      },
    ]);
  };

  // Remove an asset
  const handleRemoveAsset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = assets.filter((a) => a.id !== id);
    setAssets(filtered);
    if (activeAssetId === id) {
      if (filtered.length > 0) {
        setActiveAssetId(filtered[0].id);
      } else {
        setActiveAssetId(null);
        setCurrentTab(1);
      }
    }
  };

  // Change Asset Type from sidebar
  const handleChangeAssetType = (id: string, newType: AssetType) => {
    setAssets((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const newActions = getDefaultActionsForType(newType);
          const newCell =
            newType === 'boss' ? (128 as const) : a.pixelateConfig.cellSize;
          return {
            ...a,
            assetType: newType,
            scale: newType === 'boss' ? 2 : 1,
            actions: newActions,
            pixelateConfig: {
              ...a.pixelateConfig,
              cellSize: newCell,
            },
          };
        }
        return a;
      })
    );
  };

  // Reset active asset cutout to original
  const handleResetActiveAsset = () => {
    if (!activeAsset) return;
    handleUpdateActiveAsset({
      cutoutDataUrl: activeAsset.rawImageSrc,
    });
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0f172a] text-[#e2e8f0] overflow-hidden font-sans select-none">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activeAsset={activeAsset}
        assetCount={assets.length}
        onOpenIntake={() => setCurrentTab(1)}
        onAddDemo={handleAddDemoAsset}
        onResetActiveAsset={handleResetActiveAsset}
        isProcessing={isProcessing}
      />

      {/* Main Workspace with Left Sidebar & Screen Views */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Assets Sidebar */}
        <AssetSidebar
          assets={assets}
          activeAssetId={activeAssetId}
          onSelectAsset={(id) => {
            setActiveAssetId(id);
            if (currentTab === 1) {
              setCurrentTab(2);
            }
          }}
          onRemoveAsset={handleRemoveAsset}
          onChangeAssetType={handleChangeAssetType}
          onOpenIntake={() => setCurrentTab(1)}
          onAddDemo={handleAddDemoAsset}
        />

        {/* Dynamic Screen View */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {currentTab === 1 && (
            <IntakeScreen
              onFilesLoaded={handleFilesLoaded}
              onContinueToCutout={() => setCurrentTab(2)}
              hasLoadedAssets={assets.length > 0}
            />
          )}

          {currentTab === 2 && activeAsset && (
            <CutoutScreen
              key={activeAsset.id}
              asset={activeAsset}
              onUpdateAsset={handleUpdateActiveAsset}
              onProceedToPixelate={() => setCurrentTab(3)}
            />
          )}

          {currentTab === 3 && activeAsset && (
            <PixelateScreen
              key={activeAsset.id}
              asset={activeAsset}
              onUpdateAsset={handleUpdateActiveAsset}
              onProceedToLayout={() => setCurrentTab(4)}
            />
          )}

          {currentTab === 4 && activeAsset && (
            <ActionLayoutScreen
              key={activeAsset.id}
              asset={activeAsset}
              onUpdateAsset={handleUpdateActiveAsset}
              onProceedToExport={() => setCurrentTab(5)}
            />
          )}

          {currentTab === 5 && activeAsset && (
            <ExportScreen
              key={activeAsset.id}
              asset={activeAsset}
              allAssets={assets}
            />
          )}
        </main>
      </div>

      {/* Global High-Density Status Bar */}
      <footer className="relative h-6 bg-[#0a0f1d] border-t border-[#334155] px-4 flex items-center justify-between text-[10px] font-mono text-[#94a3b8] shrink-0 select-none z-20">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[#22d3ee] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] animate-ping"></span>
            {isProcessing ? 'PROCESSING CHUNK 14/64...' : 'ENGINE READY'}
          </span>
          <span className="text-[#475569]">|</span>
          <span className="hidden sm:inline">OFFLINE CLIENT-SIDE PROCESSING</span>
          <span className="text-[#475569] hidden sm:inline">|</span>
          <span className="hidden md:inline">2D CANVAS ACCELERATION</span>
        </div>

        <div className="flex items-center gap-3">
          {activeAsset && (
            <span className="text-[#e2e8f0]">
              TARGET: <strong className="text-[#22d3ee] font-bold">{activeAsset.name}</strong> ({activeAsset.pixelateConfig.cellSize}×{activeAsset.pixelateConfig.cellSize})
            </span>
          )}
          <span className="text-[#475569] hidden lg:inline">|</span>
          <span className="hidden lg:inline text-[#94a3b8]">
            SPRITE FORGE v1.0.4
          </span>
        </div>
      </footer>
    </div>
  );
}

