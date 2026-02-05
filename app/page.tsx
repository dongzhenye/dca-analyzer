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

  const stats = useMemo(
    () => calculateStats(levels, reboundPrice, config.ath),
    [levels, reboundPrice, config.ath]
  );

  // Check which preset strategy matches current levels
  const activeStrategy = useMemo((): StrategyName | null => {
    for (const strategy of STRATEGY_ORDER) {
      if (levels.every((l, i) => Math.abs(l.position - strategies[strategy][i]) < 0.001)) {
        return strategy;
      }
    }
    return null;
  }, [levels, strategies]);

  const applyStrategy = (strategy: StrategyName, keepCustomMode = false) => {
    setLevels(
      config.priceLevels.map((price, i) => ({
        price,
        position: strategies[strategy][i],
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
    setShowConfig(false);
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
            <h2 className="text-lg font-semibold">仓位分布</h2>
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
                <div key={level.price} className="flex items-center gap-3">
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
                        className={`w-14 text-right font-mono text-sm bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5
                          ${isFilled ? "text-emerald-400" : "text-zinc-400"}
                          focus:outline-none focus:border-emerald-500`}
                      />
                      <span className="text-zinc-500 text-sm">%</span>
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

          {/* Custom mode footer */}
          {(isCustomMode || activeStrategy === null) && (
            <div className="flex justify-between items-center mt-3">
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
          )}
        </div>

        {/* Rebound Price Slider */}
        <div className="bg-zinc-900 rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-zinc-400">反弹价格</span>
            <span className="text-2xl font-bold text-emerald-400">
              {formatUSD(reboundPrice)}
            </span>
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

        {/* Compact Stats Row */}
        <div className="bg-zinc-900 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between gap-4">
            {/* Primary: Profit */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-emerald-400">+{formatUSD(stats.profit)}</span>
              <span className="text-zinc-500 text-sm">@ATH</span>
            </div>

            {/* Secondary stats */}
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-zinc-500">收益率 </span>
                <span className="text-emerald-400 font-semibold">+{stats.returnRate.toFixed(0)}%</span>
              </div>
              <div className="hidden sm:block">
                <span className="text-zinc-500">成本 </span>
                <span className="font-medium">{formatUSD(stats.avgCost)}</span>
              </div>
              <div className="hidden md:block">
                <span className="text-zinc-500">仓位 </span>
                <span className="font-medium">{stats.totalPosition.toFixed(2)} {config.assetUnit}</span>
              </div>
              <div className="hidden lg:block">
                <span className="text-zinc-500">投入 </span>
                <span className="font-medium">{formatUSD(stats.totalCost)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-zinc-600 text-sm mt-8">
          ATH: {formatUSD(config.ath)} ({config.athDate}) · 数据仅供参考
        </div>
      </div>
    </div>
  );
}
