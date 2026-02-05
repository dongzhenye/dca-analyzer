"use client";

import { useState, useMemo } from "react";

// ============================================================================
// Configuration - All customizable values in one place
// ============================================================================

interface Config {
  // Asset
  assetName: string;
  assetUnit: string;

  // Target price
  ath: number;
  athDate: string;

  // Price levels for position building
  priceLevels: number[];

  // Rebound simulation range
  reboundMin: number;
  reboundMax: number;
  reboundStep: number;
  reboundDefault: number;
}

const DEFAULT_CONFIG: Config = {
  assetName: "BTC",
  assetUnit: "BTC",
  ath: 126277,
  athDate: "2025-10-06",
  priceLevels: [70000, 65000, 60000, 55000, 50000, 45000, 40000],
  reboundMin: 35000,
  reboundMax: 75000,
  reboundStep: 1000,
  reboundDefault: 55000,
};

// ============================================================================
// Strategy definitions
// ============================================================================

interface PriceLevel {
  price: number;
  position: number;
}

// Generate strategy allocations based on number of levels
function generateStrategies(levelCount: number) {
  // Pyramid: weights increase linearly (1, 2, 3, ...)
  const pyramidWeights = Array.from({ length: levelCount }, (_, i) => i + 1);
  const pyramidSum = pyramidWeights.reduce((a, b) => a + b, 0);
  const pyramid = pyramidWeights.map(w => w / pyramidSum);

  // Inverted: reverse of pyramid
  const inverted = [...pyramid].reverse();

  // Linear: equal allocation
  const linearBase = 1 / levelCount;
  const linear = Array(levelCount).fill(linearBase);
  // Adjust last one to ensure sum = 1
  linear[levelCount - 1] = 1 - linearBase * (levelCount - 1);

  return { pyramid, linear, inverted };
}

type StrategyName = "pyramid" | "linear" | "inverted";

const STRATEGY_ORDER: StrategyName[] = ["pyramid", "linear", "inverted"];

const STRATEGY_LABELS: Record<StrategyName, { name: string; tooltip: string }> = {
  pyramid: { name: "金字塔", tooltip: "越跌越买，低位重仓" },
  linear: { name: "线性", tooltip: "均匀分配，平均成本" },
  inverted: { name: "倒金字塔", tooltip: "越涨越买，追高策略" },
};

// ============================================================================
// Stats calculation
// ============================================================================

interface Stats {
  totalPosition: number;
  totalCost: number;
  avgCost: number;
  valueAtATH: number;
  profit: number;
  returnRate: number;
}

function calculateStats(
  levels: PriceLevel[],
  reboundPrice: number,
  ath: number
): Stats {
  const filledLevels = levels.filter((l) => l.price >= reboundPrice);

  if (filledLevels.length === 0) {
    return { totalPosition: 0, totalCost: 0, avgCost: 0, valueAtATH: 0, profit: 0, returnRate: 0 };
  }

  const totalPosition = filledLevels.reduce((sum, l) => sum + l.position, 0);
  const totalCost = filledLevels.reduce((sum, l) => sum + l.position * l.price, 0);
  const avgCost = totalCost / totalPosition;
  const valueAtATH = totalPosition * ath;
  const profit = valueAtATH - totalCost;
  const returnRate = (profit / totalCost) * 100;

  return { totalPosition, totalCost, avgCost, valueAtATH, profit, returnRate };
}

// ============================================================================
// Component
// ============================================================================

export default function Home() {
  // Config state
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [showConfig, setShowConfig] = useState(false);

  // Derived strategies based on config
  const strategies = useMemo(
    () => generateStrategies(config.priceLevels.length),
    [config.priceLevels.length]
  );

  // Position state
  const [levels, setLevels] = useState<PriceLevel[]>(() =>
    config.priceLevels.map((price, i) => ({
      price,
      position: strategies.pyramid[i],
    }))
  );
  const [reboundPrice, setReboundPrice] = useState(config.reboundDefault);
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Sync levels when config changes
  const syncLevelsToConfig = (newConfig: Config, strategy: StrategyName = "pyramid") => {
    const newStrategies = generateStrategies(newConfig.priceLevels.length);
    setLevels(
      newConfig.priceLevels.map((price, i) => ({
        price,
        position: newStrategies[strategy][i],
      }))
    );
    setReboundPrice(Math.max(newConfig.reboundMin, Math.min(newConfig.reboundMax, reboundPrice)));
  };

  // Calculate stats for all three preset strategies (for comparison visualization)
  const allStrategyStats = useMemo(() => {
    return STRATEGY_ORDER.map(strategy => {
      const strategyAlloc = strategies[strategy];
      const strategyLevels = config.priceLevels.map((price, i) => ({
        price,
        position: strategyAlloc[i] ?? 0,
      }));
      return {
        name: strategy,
        label: STRATEGY_LABELS[strategy].name,
        ...calculateStats(strategyLevels, reboundPrice, config.ath),
      };
    });
  }, [config.priceLevels, strategies, reboundPrice, config.ath]);

  // Check which preset strategy matches current levels
  const activeStrategy = useMemo((): StrategyName | null => {
    for (const strategy of STRATEGY_ORDER) {
      const strategyAlloc = strategies[strategy];
      // Length mismatch means it can't match any preset
      if (levels.length !== strategyAlloc.length) return null;
      if (levels.every((l, i) => Math.abs(l.position - (strategyAlloc[i] ?? 0)) < 0.001)) {
        return strategy;
      }
    }
    return null;
  }, [levels, strategies]);

  const applyStrategy = (strategy: StrategyName, keepCustomMode = false) => {
    const strategyAlloc = strategies[strategy];
    setLevels(
      config.priceLevels.map((price, i) => ({
        price,
        position: strategyAlloc[i] ?? 0,
      }))
    );
    if (!keepCustomMode) {
      setIsCustomMode(false);
    }
  };

  const updatePosition = (index: number, newPosition: number) => {
    const updated = [...levels];
    updated[index] = { ...updated[index], position: newPosition };
    setLevels(updated);
  };

  const resetToDefault = () => {
    setConfig(DEFAULT_CONFIG);
    syncLevelsToConfig(DEFAULT_CONFIG, "pyramid");
    setIsCustomMode(false);
    // Keep config panel open - don't call setShowConfig(false)
  };

  const totalAllocation = levels.reduce((sum, l) => sum + l.position, 0);

  const formatUSD = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">仓位模拟器</h1>
            <p className="text-zinc-400">
              设置仓位分布策略，模拟不同反弹价格下的收益
            </p>
          </div>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`p-2 rounded-lg transition-colors ${
              showConfig ? "bg-zinc-700 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
            title="配置"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Config Panel */}
        {showConfig && (
          <div className="bg-zinc-900 rounded-xl p-6 mb-6 border border-zinc-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">配置</h2>
              <button
                onClick={resetToDefault}
                className="text-xs px-2 py-1 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 rounded transition-colors"
              >
                恢复默认
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Asset Config */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-zinc-400">资产</h3>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-zinc-500">名称</label>
                    <input
                      type="text"
                      value={config.assetName}
                      onChange={(e) => setConfig({ ...config, assetName: e.target.value })}
                      className="w-full mt-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="w-20">
                    <label className="text-xs text-zinc-500">单位</label>
                    <input
                      type="text"
                      value={config.assetUnit}
                      onChange={(e) => setConfig({ ...config, assetUnit: e.target.value })}
                      className="w-full mt-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Target Config */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-zinc-400">目标价格 (ATH)</h3>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-zinc-500">价格</label>
                    <input
                      type="number"
                      value={config.ath}
                      onChange={(e) => setConfig({ ...config, ath: Number(e.target.value) })}
                      className="w-full mt-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="w-32">
                    <label className="text-xs text-zinc-500">日期</label>
                    <input
                      type="text"
                      value={config.athDate}
                      onChange={(e) => setConfig({ ...config, athDate: e.target.value })}
                      className="w-full mt-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Price Levels Config */}
              <div className="space-y-3 md:col-span-2">
                <h3 className="text-sm font-medium text-zinc-400">建仓价格档位</h3>
                <div className="flex flex-wrap gap-2">
                  {config.priceLevels.map((price, i) => (
                    <input
                      key={i}
                      type="number"
                      value={price}
                      onChange={(e) => {
                        const newLevels = [...config.priceLevels];
                        newLevels[i] = Number(e.target.value);
                        const newConfig = { ...config, priceLevels: newLevels };
                        setConfig(newConfig);
                        syncLevelsToConfig(newConfig, activeStrategy || "pyramid");
                      }}
                      className="w-24 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm font-mono focus:outline-none focus:border-emerald-500"
                    />
                  ))}
                </div>
                <p className="text-xs text-zinc-500">
                  修改价格档位后，仓位分配将自动重新计算
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Strategy Histogram */}
        <div className="bg-zinc-900 rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-medium text-zinc-400">仓位分布</h2>
            <div className="flex gap-2">
              {STRATEGY_ORDER.map((strategy) => {
                const isActive = activeStrategy === strategy && !isCustomMode;
                const label = STRATEGY_LABELS[strategy];
                return (
                  <button
                    key={strategy}
                    onClick={() => applyStrategy(strategy)}
                    title={label.tooltip}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      isActive
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    {label.name}
                  </button>
                );
              })}
              <button
                onClick={() => setIsCustomMode(true)}
                title="自由调整每个价位的仓位比例"
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  isCustomMode || activeStrategy === null
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                自定义
              </button>
            </div>
          </div>

          {/* Histogram with optional sliders */}
          <div className="space-y-2">
            {levels.map((level, index) => {
              const isFilled = level.price >= reboundPrice;
              const fixedMax = 0.25;
              const barWidth = Math.min((level.position / fixedMax) * 100, 100);
              const showSlider = isCustomMode || activeStrategy === null;

              return (
                <div key={level.price} className="flex items-center gap-3 h-7">
                  <div className="w-20 text-right font-mono text-sm text-zinc-400">
                    {formatUSD(level.price)}
                  </div>
                  {showSlider ? (
                    <>
                      <input
                        type="range"
                        min={0}
                        max={0.4}
                        step={0.01}
                        value={level.position}
                        onChange={(e) => updatePosition(index, Number(e.target.value))}
                        className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                      <input
                        type="number"
                        min={0}
                        max={40}
                        value={Math.round(level.position * 100)}
                        onChange={(e) => updatePosition(index, Math.min(0.4, Math.max(0, Number(e.target.value) / 100)))}
                        className={`w-14 h-6 text-right font-mono text-sm bg-zinc-800 border border-zinc-700 rounded px-1
                          ${isFilled ? "text-emerald-400" : "text-zinc-400"}
                          focus:outline-none focus:border-emerald-500`}
                      />
                      <span className="text-zinc-500 text-sm w-4">%</span>
                    </>
                  ) : (
                    <div className="flex-1 h-7 bg-zinc-800 rounded overflow-hidden relative">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isFilled ? "bg-emerald-600" : "bg-zinc-600"
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                      <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium ${
                        isFilled ? "text-emerald-300" : "text-zinc-400"
                      }`}>
                        {(level.position * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer - always reserve space for consistent height */}
          <div className={`flex justify-between items-center mt-3 h-5 ${isCustomMode || activeStrategy === null ? '' : 'invisible'}`}>
            <button
              onClick={() => applyStrategy("pyramid", true)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              重置
            </button>
            <span className={`text-sm ${Math.abs(totalAllocation - 1) < 0.001 ? 'text-emerald-400' : 'text-amber-400'}`}>
              总仓位: {(totalAllocation * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Rebound Price Slider */}
        <div className="bg-zinc-900 rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-zinc-400">反弹价格</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setReboundPrice(Math.max(config.reboundMin, reboundPrice - config.reboundStep))}
                className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors text-lg font-light"
              >
                −
              </button>
              <span className="text-2xl font-bold text-emerald-400 tabular-nums min-w-[7ch] text-center">
                {formatUSD(reboundPrice)}
              </span>
              <button
                onClick={() => setReboundPrice(Math.min(config.reboundMax, reboundPrice + config.reboundStep))}
                className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors text-lg font-light"
              >
                +
              </button>
            </div>
          </div>
          <input
            type="range"
            min={config.reboundMin}
            max={config.reboundMax}
            step={config.reboundStep}
            value={reboundPrice}
            onChange={(e) => setReboundPrice(Number(e.target.value))}
            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-xs text-zinc-500 mt-2">
            <span>{formatUSD(config.reboundMin)}</span>
            <span>{formatUSD(config.reboundMax)}</span>
          </div>
        </div>

        {/* Unified Profit Area Visualization */}
        <div className="bg-zinc-900 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-medium text-zinc-400 mb-4">策略收益对比</h2>

          {/* Shared Canvas */}
          {(() => {
            // Calculate shared coordinate system
            const maxGain = config.ath - config.reboundMin;
            const maxPosition = Math.max(...allStrategyStats.map(s => s.totalPosition), 0.01);

            // Calculate grid based on actual values
            // Total canvas represents: maxGain (height) × maxPosition (width) = max possible profit
            const maxProfit = maxGain * maxPosition;

            // Target: each cell ≈ $5000 profit
            const targetCellProfit = 5000;

            // Calculate grid dimensions
            // We want roughly square cells in terms of profit contribution
            // Cell height in $ × Cell width in BTC = $5000
            // Use geometric mean to balance the grid
            const numCellsTotal = Math.max(Math.round(maxProfit / targetCellProfit), 1);
            const gridCols = Math.max(Math.round(Math.sqrt(numCellsTotal * maxPosition / maxGain * 1.5)), 3);
            const gridRows = Math.max(Math.round(numCellsTotal / gridCols), 3);

            // Actual values per cell
            const cellGain = maxGain / gridRows;  // $ per cell height
            const cellPosition = maxPosition / gridCols;  // BTC per cell width
            const actualCellProfit = cellGain * cellPosition;

            // Determine current strategy for highlight
            const currentStrategy = isCustomMode ? null : activeStrategy;

            // Strategy colors
            const strategyColors: Record<StrategyName, { fill: string; stroke: string; text: string }> = {
              pyramid: { fill: 'rgba(16, 185, 129, 0.6)', stroke: '#10b981', text: 'text-emerald-400' },
              linear: { fill: 'rgba(59, 130, 246, 0.5)', stroke: '#3b82f6', text: 'text-blue-400' },
              inverted: { fill: 'rgba(168, 85, 247, 0.5)', stroke: '#a855f7', text: 'text-purple-400' },
            };

            return (
              <>
                {/* Canvas with overlapping rectangles - full width, 16:9 aspect ratio */}
                <div
                  className="relative w-full bg-zinc-800/50 rounded overflow-hidden"
                  style={{ aspectRatio: '16 / 9', maxHeight: '280px' }}
                >
                  {/* Grid background - calculated based on actual values */}
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.3) 1px, transparent 1px)',
                      backgroundSize: `${100 / gridCols}% ${100 / gridRows}%`,
                    }}
                  />

                  {/* Strategy rectangles - render from smallest to largest, use outlines + transparent fills */}
                  {[...allStrategyStats]
                    .sort((a, b) => a.profit - b.profit) // smallest first (drawn first, at bottom)
                    .map((s) => {
                      const gain = s.totalPosition > 0 ? config.ath - s.avgCost : 0;
                      const widthPercent = (s.totalPosition / maxPosition) * 100;
                      const heightPercent = maxGain > 0 ? (gain / maxGain) * 100 : 0;

                      // Calculate how many cells this strategy fills
                      const cellsFilled = Math.round(s.profit / actualCellProfit);

                      const isCurrent = s.name === currentStrategy;
                      const colors = strategyColors[s.name as StrategyName];

                      return (
                        <div
                          key={s.name}
                          className="absolute bottom-0 left-0 transition-all duration-500"
                          style={{
                            width: `${Math.max(widthPercent, 5)}%`,
                            height: `${Math.max(heightPercent, 5)}%`,
                            backgroundColor: isCurrent ? colors.fill : 'transparent',
                            border: `2px ${isCurrent ? 'solid' : 'dashed'} ${colors.stroke}`,
                            zIndex: isCurrent ? 30 : 10,
                          }}
                          title={`${s.label}: 涨幅 ${formatUSD(gain)} × 仓位 ${s.totalPosition.toFixed(2)} = 盈利 ${formatUSD(s.profit)} (≈${cellsFilled}格)`}
                        />
                      );
                    })}

                  {/* Axis labels */}
                  <div className="absolute bottom-1 right-2 text-[10px] text-zinc-500">持仓 →</div>
                  <div className="absolute top-1 left-2 text-[10px] text-zinc-500">↑ 涨幅</div>
                </div>

                {/* Strategy legend with stats */}
                <div className="flex justify-center gap-6 mt-4">
                  {allStrategyStats.map((s) => {
                    const isCurrent = s.name === currentStrategy;
                    const colors = strategyColors[s.name as StrategyName];
                    const gain = s.totalPosition > 0 ? config.ath - s.avgCost : 0;

                    return (
                      <div
                        key={s.name}
                        className={`text-center cursor-pointer transition-opacity ${isCurrent ? 'opacity-100' : 'opacity-60 hover:opacity-80'}`}
                        onClick={() => applyStrategy(s.name as StrategyName)}
                        title={`点击应用${s.label}策略`}
                      >
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <div
                            className="w-3 h-3 rounded-sm"
                            style={{
                              backgroundColor: colors.stroke,
                              opacity: isCurrent ? 1 : 0.5
                            }}
                          />
                          <span className={`text-xs font-medium ${isCurrent ? colors.text : 'text-zinc-400'}`}>
                            {s.label}
                          </span>
                        </div>
                        <div className={`text-lg font-bold ${isCurrent ? 'text-white' : 'text-zinc-400'}`}>
                          +{formatUSD(s.profit)}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          成本 {formatUSD(s.avgCost)} · {s.totalPosition.toFixed(2)} {config.assetUnit}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                <div className="text-center text-xs text-zinc-600 mt-3">
                  面积 = 盈利额（高度 = ATH - 成本，宽度 = 持仓量）· 每格 ≈ {formatUSD(actualCellProfit)}
                </div>
              </>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="text-center text-zinc-600 text-xs mt-8">
          © 2026 Zhenye Dong
        </div>
      </div>
    </div>
  );
}
