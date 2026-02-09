"use client";

import { useState, useMemo, useEffect, useRef } from "react";

// ============================================================================
// Constants - Magic numbers extracted for maintainability
// ============================================================================

const CONSTANTS = {
  // Position limits
  HISTOGRAM_MAX_POSITION: 0.25,
  SLIDER_MAX_POSITION: 0.4,

  // Precision
  ALLOCATION_TOLERANCE: 0.01,
  PRECISION_MULTIPLIER: 10000,

  // Chart dimensions
  GRID_SIZE: 40,
  CHART_WIDTH: 600,
  CHART_HEIGHT: 280,
} as const;

// ============================================================================
// Utility functions
// ============================================================================

const formatUSD = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

// Sort price levels: non-zero descending, zeros at end
const sortPriceLevels = (levels: number[]) => {
  const nonZero = levels.filter((p) => p > 0).sort((a, b) => b - a);
  const zeros = levels.filter((p) => p === 0);
  return [...nonZero, ...zeros];
};

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

  // Maximum position (theoretical full position, e.g., 1 BTC)
  maxPosition: number;

  // Rebound simulation range
  reboundMin: number;
  reboundMax: number;
  reboundStep: number;
}

const DEFAULT_CONFIG: Config = {
  assetName: "BTC",
  assetUnit: "BTC",
  ath: 126277,
  athDate: "2025-10-06",
  priceLevels: [70000, 65000, 60000, 55000, 50000, 45000, 40000],
  maxPosition: 1.0,
  reboundMin: 35000,
  reboundMax: 75000,
  reboundStep: 1000,
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
  ath: number,
  maxPosition: number
): Stats {
  const filledLevels = levels.filter((l) => l.price >= reboundPrice);

  if (filledLevels.length === 0) {
    return { totalPosition: 0, totalCost: 0, avgCost: 0, valueAtATH: 0, profit: 0, returnRate: 0 };
  }

  // position is a fraction (0-1), multiply by maxPosition to get actual units
  const totalPosition = filledLevels.reduce((sum, l) => sum + l.position, 0) * maxPosition;
  const totalCost = filledLevels.reduce((sum, l) => sum + l.position * l.price, 0) * maxPosition;
  const avgCost = totalCost / totalPosition;
  const valueAtATH = totalPosition * ath;
  const profit = valueAtATH - totalCost;
  const returnRate = (profit / totalCost) * 100;

  return { totalPosition, totalCost, avgCost, valueAtATH, profit, returnRate };
}

// ============================================================================
// Component
// ============================================================================

// Generate aggressive inverted pyramid (more weight at higher prices)
// Example: 35%, 20%, 11%, 6%, 3%, 2%, 1% for 7 levels (high price = high weight)
function generateAggressiveInverted(levelCount: number): number[] {
  // Reverse exponential: first level (highest price) gets highest weight
  const weights = Array.from({ length: levelCount }, (_, i) => Math.pow(1.8, levelCount - 1 - i));
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map(w => w / sum);
}

export default function Home() {
  // Config state
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);

  // Drag state for curve chart
  const isDraggingRef = useRef(false);
  const [showConfig, setShowConfig] = useState(false);

  // Filter out empty price levels (price = 0)
  const activePriceLevels = useMemo(
    () => config.priceLevels.filter((p) => p > 0),
    [config.priceLevels]
  );

  // Derived strategies based on active levels count
  const strategies = useMemo(
    () => generateStrategies(activePriceLevels.length || 1),
    [activePriceLevels.length]
  );

  // Currently selected preset strategy (null = custom mode)
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyName>("pyramid");

  // Custom levels - persisted independently, initialized with aggressive inverted
  const [customLevels, setCustomLevels] = useState<PriceLevel[]>(() => {
    const aggressiveAlloc = generateAggressiveInverted(DEFAULT_CONFIG.priceLevels.length);
    return DEFAULT_CONFIG.priceLevels.map((price, i) => ({
      price,
      position: aggressiveAlloc[i],
    }));
  });

  // Is custom mode active?
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Chart view mode
  const [chartView, setChartView] = useState<'area' | 'curve'>('area');

  // Current active levels (derived from selected strategy or custom)
  const levels = useMemo(() => {
    if (isCustomMode) {
      // Filter out empty levels in custom mode too
      return customLevels.filter((l) => l.price > 0);
    }
    const strategyAlloc = strategies[selectedStrategy];
    return activePriceLevels.map((price, i) => ({
      price,
      position: strategyAlloc[i] ?? 0,
    }));
  }, [isCustomMode, customLevels, selectedStrategy, strategies, activePriceLevels]);

  const [reboundPrice, setReboundPrice] = useState(() => {
    // Initialize to middle of range
    const { reboundMin, reboundMax, reboundStep } = DEFAULT_CONFIG;
    const middle = (reboundMin + reboundMax) / 2;
    return Math.round((middle - reboundMin) / reboundStep) * reboundStep + reboundMin;
  });

  // Auto-adjust reboundPrice when rebound range changes
  useEffect(() => {
    const { reboundMin, reboundMax, reboundStep } = config;
    if (reboundMin >= reboundMax || reboundStep <= 0) return;

    // Calculate middle value aligned to step
    const middle = (reboundMin + reboundMax) / 2;
    const alignedMiddle = Math.round((middle - reboundMin) / reboundStep) * reboundStep + reboundMin;
    const clampedMiddle = Math.max(reboundMin, Math.min(reboundMax, alignedMiddle));

    // Use functional update to access current reboundPrice
    setReboundPrice((currentPrice) => {
      // Clamp current price to valid range and align to step
      const alignedPrice = Math.round((currentPrice - reboundMin) / reboundStep) * reboundStep + reboundMin;
      const clampedPrice = Math.max(reboundMin, Math.min(reboundMax, alignedPrice));

      // If current price is out of range or not aligned, reset to middle
      if (currentPrice < reboundMin || currentPrice > reboundMax) {
        return clampedMiddle;
      }
      // If just misaligned, use clamped aligned value
      if (clampedPrice !== currentPrice) {
        return clampedPrice;
      }
      return currentPrice;
    });
  }, [config.reboundMin, config.reboundMax, config.reboundStep]);

  // Keyboard arrow keys to adjust rebound price
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        setReboundPrice(prev => {
          const delta = e.key === 'ArrowRight' ? config.reboundStep : -config.reboundStep;
          const next = prev + delta;
          return Math.max(config.reboundMin, Math.min(config.reboundMax, next));
        });
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [config.reboundStep, config.reboundMin, config.reboundMax]);

  // Sync custom levels when config price levels change
  const syncCustomLevelsToConfig = (newConfig: Config) => {
    const activeLevels = newConfig.priceLevels.filter((p) => p > 0);
    const aggressiveAlloc = generateAggressiveInverted(activeLevels.length || 1);
    setCustomLevels(
      newConfig.priceLevels.map((price) => {
        // Find this price's position in the active levels
        const activeIndex = activeLevels.indexOf(price);
        return {
          price,
          position: activeIndex >= 0 ? aggressiveAlloc[activeIndex] : 0,
        };
      })
    );
    // Note: reboundPrice adjustment is handled by the useEffect above
  };

  // Calculate stats for all three preset strategies (for comparison visualization)
  const allStrategyStats = useMemo(() => {
    return STRATEGY_ORDER.map(strategy => {
      const strategyAlloc = strategies[strategy];
      const strategyLevels = activePriceLevels.map((price, i) => ({
        price,
        position: strategyAlloc[i] ?? 0,
      }));
      return {
        name: strategy,
        label: STRATEGY_LABELS[strategy].name,
        ...calculateStats(strategyLevels, reboundPrice, config.ath, config.maxPosition),
      };
    });
  }, [activePriceLevels, strategies, reboundPrice, config.ath]);

  // Active strategy for display purposes
  const activeStrategy = isCustomMode ? null : selectedStrategy;

  // Curve data: profit at each rebound price for each strategy
  const curveData = useMemo(() => {
    const prices: number[] = [];
    for (let p = config.reboundMin; p <= config.reboundMax; p += config.reboundStep) {
      prices.push(p);
    }

    type CurveStrategyName = StrategyName | 'custom';
    const strategyNames: CurveStrategyName[] = [...STRATEGY_ORDER, 'custom'];

    return strategyNames.map((strategyName) => {
      const strategyLevels =
        strategyName === 'custom'
          ? customLevels.filter((l) => l.price > 0)
          : activePriceLevels.map((price, i) => ({
              price,
              position: strategies[strategyName][i] ?? 0,
            }));

      return {
        name: strategyName,
        label: strategyName === 'custom' ? '自定义' : STRATEGY_LABELS[strategyName].name,
        points: prices.map((reboundP) => ({
          x: reboundP,
          y: calculateStats(strategyLevels, reboundP, config.ath, config.maxPosition).profit,
        })),
      };
    });
  }, [config, strategies, customLevels]);

  // Cache custom allocation total for reuse
  const customTotal = useMemo(
    () => customLevels.reduce((sum, l) => sum + l.position, 0),
    [customLevels]
  );

  const isValidCustom = Math.abs(customTotal - 1) < CONSTANTS.ALLOCATION_TOLERANCE;

  // Calculate profit rankings for legend display (shared between both chart views)
  const profitRankings = useMemo(() => {
    // Calculate custom stats inline
    const customStats = calculateStats(
      customLevels.filter((l) => l.price > 0),
      reboundPrice,
      config.ath,
      config.maxPosition
    );

    // Combine all strategies with their profits
    const allProfits: { name: string; profit: number }[] = [
      ...allStrategyStats.map(s => ({ name: s.name, profit: s.profit })),
    ];

    // Only include custom if valid
    if (isValidCustom) {
      allProfits.push({ name: 'custom', profit: customStats.profit });
    }

    // Sort by profit descending and assign ranks
    const sorted = [...allProfits].sort((a, b) => b.profit - a.profit);
    const rankings = new Map<string, number>();
    sorted.forEach((item, index) => {
      rankings.set(item.name, index + 1);
    });

    return rankings;
  }, [allStrategyStats, customLevels, reboundPrice, config.ath, config.maxPosition, isValidCustom]);

  // Curve insight: analyze which strategy wins at each price segment
  const curveInsight = useMemo(() => {

    const validCurves = curveData.filter(c => {
      if (c.name === 'custom') return isValidCustom;
      return true;
    });

    if (validCurves.length === 0) return null;

    // Use price levels as natural boundaries
    // Between two adjacent price levels, the set of filled positions is constant,
    // so strategy rankings only change at price level boundaries.
    const activeLevels = [...config.priceLevels.filter(p => p > 0)].sort((a, b) => b - a);

    if (activeLevels.length === 0) return null;

    const winCounts = new Map<string, number>();
    const highestLevel = activeLevels[0];

    // Zone above highest level: no positions filled, no profit
    // (rebound > highest level means price hasn't dropped to any buy level)
    const zeroZoneLabel = `> ${formatUSD(highestLevel)}`;

    // For each price level, test which strategy wins
    // activeLevels is sorted high→low: [70k, 65k, 60k, ...]
    interface LevelResult {
      price: number;
      winner: string;
      label: string;
    }
    const levelResults: LevelResult[] = [];

    for (let i = 0; i < activeLevels.length; i++) {
      const testPrice = activeLevels[i];
      const profits = validCurves.map(c => ({
        name: c.name,
        label: c.label,
        profit: c.points.find(p => p.x === testPrice)?.y ?? 0,
      }));

      const maxProfit = Math.max(...profits.map(p => p.profit));
      if (maxProfit <= 0) continue;

      const winner = profits.find(p => p.profit === maxProfit);
      if (!winner) continue;

      winCounts.set(winner.name, (winCounts.get(winner.name) || 0) + 1);
      levelResults.push({ price: testPrice, winner: winner.name, label: winner.label });
    }

    // Merge consecutive levels with same winner into segments
    interface MergedSegment {
      highPrice: number; // highest level price (inclusive)
      lowPrice: number;  // lowest level price (inclusive)
      winner: string;
      label: string;
    }
    const mergedSegments: MergedSegment[] = [];

    for (const lr of levelResults) {
      const last = mergedSegments[mergedSegments.length - 1];
      if (last && last.winner === lr.winner) {
        last.lowPrice = lr.price;
      } else {
        mergedSegments.push({
          highPrice: lr.price,
          lowPrice: lr.price,
          winner: lr.winner,
          label: lr.label,
        });
      }
    }

    // Format segment range:
    // Each level at price X covers rebound prices where X is the lowest newly-filled level.
    // That means: rebound in [X, level_above_X).
    // When merged: rebound in [lowPrice, level_above_highPrice).
    // We express this as: ≤ highPrice 且 > level_below_lowPrice
    const formatSegment = (seg: MergedSegment, idx: number): string => {
      const isLast = idx === mergedSegments.length - 1;

      // Upper bound: ≤ highPrice (inclusive, this level IS filled at this price)
      const upper = `≤ ${formatUSD(seg.highPrice)}`;

      // Lower bound: > next_lower_level (exclusive, because AT that level the filled set changes)
      // For the last segment (lowest levels), no lower bound needed — covers all prices below
      const lowIdx = activeLevels.indexOf(seg.lowPrice);
      if (isLast || lowIdx === activeLevels.length - 1) {
        return upper;
      }
      const lower = `> ${formatUSD(activeLevels[lowIdx + 1])}`;
      return `${upper} 且 ${lower}`;
    };

    // Find best strategy by coverage
    let bestStrategy = { name: '', label: '', count: 0 };
    winCounts.forEach((count, name) => {
      if (count > bestStrategy.count) {
        bestStrategy = {
          name,
          label: validCurves.find(c => c.name === name)?.label || name,
          count,
        };
      }
    });

    // Calculate best strategy coverage as percentage of total price range
    let coveragePct = 0;
    if (bestStrategy.name) {
      let bestCoverage = 0;
      for (const seg of mergedSegments) {
        if (seg.winner !== bestStrategy.name) continue;
        const lowIdx = activeLevels.indexOf(seg.lowPrice);
        const isLastLevel = lowIdx === activeLevels.length - 1;
        const lowerBound = isLastLevel ? config.reboundMin : activeLevels[lowIdx + 1] + config.reboundStep;
        bestCoverage += (seg.highPrice - lowerBound) / config.reboundStep + 1;
      }
      const totalSteps = (config.reboundMax - config.reboundMin) / config.reboundStep + 1;
      coveragePct = Math.round(bestCoverage / totalSteps * 100);
    }

    return {
      zeroZoneLabel,
      segments: mergedSegments.map((s, i) => ({
        range: formatSegment(s, i),
        winner: s.winner,
        label: s.label,
      })),
      bestStrategy: bestStrategy.name ? bestStrategy : null,
      coveragePct,
    };
  }, [curveData, isValidCustom, config.priceLevels, config.reboundStep, config.reboundMin, config.reboundMax]);

  const applyStrategy = (strategy: StrategyName) => {
    setSelectedStrategy(strategy);
    setIsCustomMode(false);
  };

  const enterCustomMode = () => {
    setIsCustomMode(true);
  };

  const updateCustomPosition = (index: number, newPosition: number) => {
    const updated = [...customLevels];
    updated[index] = { ...updated[index], position: newPosition };
    setCustomLevels(updated);
  };

  const resetToDefault = () => {
    setConfig(DEFAULT_CONFIG);
    syncCustomLevelsToConfig(DEFAULT_CONFIG);
    setSelectedStrategy("pyramid");
    setIsCustomMode(false);
    // Keep config panel open - don't call setShowConfig(false)
  };

  const totalAllocation = levels.reduce((sum, l) => sum + l.position, 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <svg className="w-7 h-7" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="6" fill="#18181b"/>
              <rect x="6" y="6" width="4" height="20" rx="1" fill="#22c55e"/>
              <rect x="14" y="12" width="4" height="14" rx="1" fill="#22c55e"/>
              <rect x="22" y="18" width="4" height="8" rx="1" fill="#22c55e"/>
            </svg>
            <h1 className="text-xl font-bold">仓位模拟器</h1>
            <span className="text-zinc-600">|</span>
            <p className="text-zinc-500 text-sm">对比不同建仓策略的收益表现</p>
          </div>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-sm ${
              showConfig ? "bg-zinc-700 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {showConfig ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                收起
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                设置
              </>
            )}
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

            <div className="space-y-6">
              {/* Section 1: Asset & Position */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-zinc-500">资产名称</label>
                  <input
                    type="text"
                    value={config.assetName}
                    onChange={(e) => setConfig({ ...config, assetName: e.target.value })}
                    className="w-full mt-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">单位</label>
                  <input
                    type="text"
                    value={config.assetUnit}
                    onChange={(e) => setConfig({ ...config, assetUnit: e.target.value })}
                    className="w-full mt-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">最大仓位 ({config.assetUnit})</label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.maxPosition || ""}
                    onChange={(e) => setConfig({ ...config, maxPosition: Number(e.target.value) || 0 })}
                    onBlur={(e) => {
                      const val = Number(e.target.value);
                      if (!val || val < 0.01) setConfig({ ...config, maxPosition: 0.01 });
                    }}
                    className="w-full mt-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Section 2: Target Price */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-500">目标价格 (ATH)</label>
                  <input
                    type="number"
                    value={config.ath || ""}
                    onChange={(e) => setConfig({ ...config, ath: Number(e.target.value) || 0 })}
                    onBlur={(e) => {
                      const val = Number(e.target.value);
                      if (!val || val < 1) setConfig({ ...config, ath: 1 });
                    }}
                    className="w-full mt-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">目标日期</label>
                  <input
                    type="date"
                    value={config.athDate}
                    onChange={(e) => setConfig({ ...config, athDate: e.target.value })}
                    className="w-full mt-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Section 3: Price Levels */}
              <div>
                <label className="text-xs text-zinc-500 block mb-2">建仓价格档位 (留空 = 不启用)</label>
                <div className="flex flex-wrap gap-2">
                  {config.priceLevels.map((price, i) => (
                    <input
                      key={i}
                      type="number"
                      value={price || ""}
                      placeholder="留空"
                      onChange={(e) => {
                        const newLevels = [...config.priceLevels];
                        newLevels[i] = Number(e.target.value) || 0;
                        const newConfig = { ...config, priceLevels: newLevels };
                        setConfig(newConfig);
                        syncCustomLevelsToConfig(newConfig);
                      }}
                      onBlur={() => {
                        const sortedLevels = sortPriceLevels(config.priceLevels);
                        // Only update if order changed
                        if (sortedLevels.some((p, i) => p !== config.priceLevels[i])) {
                          const newConfig = { ...config, priceLevels: sortedLevels };
                          setConfig(newConfig);
                          syncCustomLevelsToConfig(newConfig);
                        }
                      }}
                      className={`w-24 px-2 py-1.5 bg-zinc-800 border rounded text-sm font-mono focus:outline-none focus:border-emerald-500 ${
                        price > 0 ? "border-zinc-700" : "border-zinc-800 text-zinc-600"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-zinc-600 mt-1">
                  每个档位的仓位比例由策略决定，总和 = 最大仓位
                </p>
              </div>

              {/* Section 4: Rebound Simulation Range */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-xs text-zinc-500">反弹模拟范围</label>
                  <button
                    onClick={() => {
                      const activeLevels = config.priceLevels.filter((p) => p > 0);
                      if (activeLevels.length === 0) return;

                      const minLevel = Math.min(...activeLevels);
                      const maxLevel = Math.max(...activeLevels);
                      const targetStepCount = 40; // Aim for ~40 data points

                      // Calculate raw range: min-1step to max+1step
                      // First estimate step, then calculate final range
                      const rawRange = maxLevel - minLevel;
                      const rawStep = rawRange / (targetStepCount - 2); // Reserve 2 steps for margins

                      // Round step to nice number (1000, 2000, 5000, 10000, etc.)
                      const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
                      const normalized = rawStep / magnitude;
                      let niceStep: number;
                      if (normalized <= 1) niceStep = magnitude;
                      else if (normalized <= 2) niceStep = 2 * magnitude;
                      else if (normalized <= 5) niceStep = 5 * magnitude;
                      else niceStep = 10 * magnitude;

                      // Align min/max to step, then add 1 step margin
                      const alignedMin = Math.floor(minLevel / niceStep) * niceStep;
                      const alignedMax = Math.ceil(maxLevel / niceStep) * niceStep;
                      const newMin = alignedMin - niceStep;
                      const newMax = alignedMax + niceStep;

                      setConfig({
                        ...config,
                        reboundMin: newMin,
                        reboundMax: newMax,
                        reboundStep: niceStep,
                      });
                    }}
                    className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors"
                  >
                    [推荐值]
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-zinc-600">最低价</label>
                    <input
                      type="number"
                      value={config.reboundMin || ""}
                      onChange={(e) => setConfig({ ...config, reboundMin: Number(e.target.value) || 0 })}
                      onBlur={(e) => {
                        const val = Number(e.target.value);
                        if (!val || val < 1) setConfig({ ...config, reboundMin: 1 });
                      }}
                      className="w-full mt-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-600">最高价</label>
                    <input
                      type="number"
                      value={config.reboundMax || ""}
                      onChange={(e) => setConfig({ ...config, reboundMax: Number(e.target.value) || 0 })}
                      onBlur={(e) => {
                        const val = Number(e.target.value);
                        if (!val || val < 1) setConfig({ ...config, reboundMax: 1 });
                      }}
                      className="w-full mt-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-600">步长</label>
                    <input
                      type="number"
                      value={config.reboundStep || ""}
                      onChange={(e) => setConfig({ ...config, reboundStep: Number(e.target.value) || 0 })}
                      onBlur={(e) => {
                        const val = Number(e.target.value);
                        if (!val || val < 1) setConfig({ ...config, reboundStep: 1 });
                      }}
                      className="w-full mt-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Config Validation Warnings */}
              {(() => {
                const warnings: string[] = [];
                const activeLevels = config.priceLevels.filter((p) => p > 0);

                if (activeLevels.length === 0) {
                  warnings.push("至少需要一个有效的建仓价格档位");
                } else {
                  const maxLevel = Math.max(...activeLevels);
                  const minLevel = Math.min(...activeLevels);

                  if (config.ath <= maxLevel) {
                    warnings.push(`目标价 (${formatUSD(config.ath)}) 应高于最高建仓价 (${formatUSD(maxLevel)})`);
                  }
                  if (config.reboundMax < minLevel) {
                    warnings.push(`反弹最高价 (${formatUSD(config.reboundMax)}) 应不低于最低建仓价 (${formatUSD(minLevel)})`);
                  }
                }
                if (config.reboundMin >= config.reboundMax) {
                  warnings.push("反弹最低价应小于最高价");
                }

                if (warnings.length === 0) return null;

                return (
                  <div className="mt-4 p-3 bg-amber-900/20 border border-amber-700/50 rounded-lg">
                    <div className="text-xs text-amber-400 font-medium mb-1">配置警告</div>
                    <ul className="text-xs text-amber-300/80 space-y-1">
                      {warnings.map((w, i) => <li key={i}>• {w}</li>)}
                    </ul>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Strategy Histogram */}
        <div className="bg-zinc-900 rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-medium text-zinc-300">建仓策略</h2>
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
                onClick={() => enterCustomMode()}
                title="自由调整每个价位的仓位比例"
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  isCustomMode
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
              const barWidth = Math.min((level.position / CONSTANTS.HISTOGRAM_MAX_POSITION) * 100, 100);
              const showSlider = isCustomMode || activeStrategy === null;

              return (
                <div key={index} className="flex items-center gap-3 h-7">
                  <div className="w-20 text-right font-mono text-sm text-zinc-400">
                    {formatUSD(level.price)}
                  </div>
                  {showSlider ? (
                    <>
                      <input
                        type="range"
                        min={0}
                        max={CONSTANTS.SLIDER_MAX_POSITION}
                        step={0.01}
                        value={level.position}
                        onChange={(e) => updateCustomPosition(index, Number(e.target.value))}
                        className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                      <input
                        type="number"
                        min={0}
                        max={CONSTANTS.SLIDER_MAX_POSITION * 100}
                        value={Math.round(level.position * 100)}
                        onChange={(e) => updateCustomPosition(index, Math.min(CONSTANTS.SLIDER_MAX_POSITION, Math.max(0, Number(e.target.value) / 100)))}
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
          <div className={`flex justify-between items-center mt-3 h-5 ${isCustomMode ? '' : 'invisible'}`}>
            <button
              onClick={() => syncCustomLevelsToConfig(config)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              重置自定义
            </button>
            <span className={`text-sm ${Math.abs(totalAllocation - 1) < CONSTANTS.ALLOCATION_TOLERANCE ? 'text-emerald-400' : 'text-amber-400'}`}>
              总仓位: {(totalAllocation * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Rebound Price Slider */}
        <div className="bg-zinc-900 rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-base font-medium text-zinc-300">反弹价格</span>
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
            <span className="text-zinc-600">键盘左右微调</span>
            <span>{formatUSD(config.reboundMax)}</span>
          </div>
        </div>

        {/* Unified Profit Area Visualization */}
        <div className="bg-zinc-900 rounded-xl p-5 mb-6">
          {/* Header with tabs */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-medium text-zinc-300">收益对比</h2>
            <div className="flex gap-1">
              <button
                className={`px-3 py-1 text-xs rounded ${chartView === 'area' ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300 transition-colors'}`}
                onClick={() => setChartView('area')}
              >
                面积对比
              </button>
              <button
                className={`px-3 py-1 text-xs rounded ${chartView === 'curve' ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300 transition-colors'}`}
                onClick={() => setChartView('curve')}
              >
                收益曲线
              </button>
            </div>
          </div>

          {/* Chart content - conditional rendering */}
          {chartView === 'area' ? (
            /* Area comparison view */
            (() => {
              // Y-axis: price range from reboundMin to ATH
              const priceRange = config.ath - config.reboundMin;

              // X-axis: use config maxPosition
              const maxPos = config.maxPosition;

              // Calculate custom strategy stats from customLevels (not levels, which changes based on mode)
              const customStats = calculateStats(customLevels, reboundPrice, config.ath, config.maxPosition);

              // Determine current display strategy
              const currentStrategyName = isCustomMode || activeStrategy === null ? 'custom' : activeStrategy;

              // All strategies for visualization (always include custom, filter in render)
              const allStats = [
                ...allStrategyStats,
                {
                  name: 'custom' as const,
                  label: '自定义',
                  ...customStats,
                },
              ];

              // Get current stats for Y-axis label
              const currentStats = currentStrategyName === 'custom'
                ? { name: 'custom', label: '自定义', ...customStats }
                : allStrategyStats.find(s => s.name === currentStrategyName) || allStrategyStats[0];

              // Helper: convert price to Y percentage (0% = bottom = reboundMin, 100% = top = ATH)
              const priceToY = (price: number) => ((price - config.reboundMin) / priceRange) * 100;

              // Current cost position (rounded to avoid hydration mismatch)
              const currentCostY = currentStats.totalPosition > 0
                ? Math.round(priceToY(currentStats.avgCost) * 10000) / 10000
                : 0;

              return (
                <>
                  {/* Chart layout: Y-axis on left, canvas on right, X-axis below */}
                  <div className="flex flex-col">
                    {/* Main row: Y-axis title + Y-axis + Canvas */}
                    <div className="flex">
                      {/* Y-axis title */}
                      <div className="flex items-center justify-center overflow-visible" style={{ width: '14px' }}>
                        <span className="text-[10px] text-zinc-500 -rotate-90 whitespace-nowrap">价格 (USD)</span>
                      </div>
                      {/* Y-axis labels (outside canvas, left column) */}
                      <div className="relative flex flex-col justify-between text-[10px] text-zinc-400 pr-2 py-1" style={{ minWidth: '60px' }}>
                        <span className="text-right">{formatUSD(config.ath)}</span>
                        <span className="text-right">{formatUSD(config.reboundMin)}</span>
                        {/* Dynamic cost label - absolutely positioned */}
                        {currentStats.totalPosition > 0 && (
                          <span
                            className="absolute right-2 text-emerald-400 font-medium"
                            style={{
                              top: `${100 - currentCostY}%`,
                              transform: 'translateY(-50%)',
                            }}
                          >
                            {formatUSD(currentStats.avgCost)}
                          </span>
                        )}
                      </div>

                      {/* Canvas (chart area) */}
                      <div
                        className="relative flex-1 bg-zinc-800/50 rounded overflow-hidden"
                        style={{ aspectRatio: '5 / 2', minHeight: `${CONSTANTS.CHART_HEIGHT}px` }}
                      >
                        {/* Grid background */}
                        <div
                          className="absolute inset-0 opacity-20"
                          style={{
                            backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.3) 1px, transparent 1px)',
                            backgroundSize: `${CONSTANTS.GRID_SIZE}px ${CONSTANTS.GRID_SIZE}px`,
                          }}
                        />

                        {/* Horizontal line at current cost level */}
                        {currentStats.totalPosition > 0 && (
                          <div
                            className="absolute left-0 right-0 border-t border-dashed border-emerald-500/40"
                            style={{ bottom: `${currentCostY}%` }}
                          />
                        )}

                        {/* Vertical line at current position level */}
                        {currentStats.totalPosition > 0 && (
                          <div
                            className="absolute top-0 bottom-0 border-l border-dashed border-emerald-500/40"
                            style={{ left: `${Math.round((currentStats.totalPosition / maxPos) * 100 * 10000) / 10000}%` }}
                          />
                        )}

                        {/* Strategy rectangles - sorted so current is on top */}
                        {allStats
                          .filter(s => {
                            // Custom: only show if allocation is valid (~100%)
                            if (s.name === 'custom') {
                              return isValidCustom && s.totalPosition > 0;
                            }
                            return s.totalPosition > 0;
                          })
                          .sort((a, b) => {
                            // Current strategy always on top
                            if (a.name === currentStrategyName) return 1;
                            if (b.name === currentStrategyName) return -1;
                            return b.profit - a.profit;
                          })
                          .map((s) => {
                            // Rectangle: bottom at cost, top at ATH
                            // Round to 4 decimal places to avoid hydration mismatch
                            const costY = Math.round(priceToY(s.avgCost) * 10000) / 10000;
                            const heightPercent = Math.round((100 - costY) * 10000) / 10000;
                            const widthPercent = Math.round((s.totalPosition / maxPos) * 100 * 10000) / 10000;

                            const isCurrent = s.name === currentStrategyName;

                            return (
                              <div
                                key={s.name}
                                className="absolute left-0 transition-all duration-500"
                                style={{
                                  bottom: `${costY}%`,
                                  height: `${heightPercent}%`,
                                  width: `${Math.max(widthPercent, 2)}%`,
                                  backgroundColor: isCurrent ? 'rgba(16, 185, 129, 0.35)' : 'transparent',
                                  border: isCurrent
                                    ? '2px solid #10b981'
                                    : '2px solid rgba(113, 113, 122, 0.4)',
                                  zIndex: isCurrent ? 30 : 10,
                                }}
                              >
                                {/* Formula inside current rectangle */}
                                {isCurrent && s.totalPosition > 0 && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-[11px] text-emerald-300/70 text-center leading-relaxed">
                                      <div className="font-medium">盈利额 {formatUSD(s.profit)}</div>
                                      <div className="text-[10px] text-emerald-300/50">
                                        = ({formatUSD(config.ath)} − {formatUSD(s.avgCost)}) × {s.totalPosition.toFixed(2)} {config.assetUnit}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* X-axis labels (outside canvas, below) */}
                    <div className="flex">
                      {/* Spacer for Y-axis title + Y-axis column */}
                      <div style={{ minWidth: '74px' }} />
                      {/* X-axis labels aligned with canvas */}
                      <div className="relative flex-1 text-[10px] text-zinc-500 mt-1 px-1">
                        <div className="flex justify-between">
                          <span>0 {config.assetUnit}</span>
                          <span>{(maxPos / 2).toFixed(1)} {config.assetUnit}</span>
                          <span>{maxPos} {config.assetUnit}</span>
                        </div>
                        {/* Dynamic position label for current strategy */}
                        {currentStats.totalPosition > 0 && (
                          <span
                            className="absolute text-emerald-400 font-medium"
                            style={{
                              left: `${Math.round((currentStats.totalPosition / maxPos) * 100 * 10000) / 10000}%`,
                              transform: 'translateX(-50%)',
                              top: 0,
                            }}
                          >
                            {currentStats.totalPosition.toFixed(2)} {config.assetUnit}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* X-axis title */}
                    <div className="flex">
                      <div style={{ minWidth: '74px' }} />
                      <div className="flex-1 text-right pr-1 mt-0.5">
                        <span className="text-[10px] text-zinc-500 tracking-wider">仓位 ({config.assetUnit})</span>
                      </div>
                    </div>
                  </div>

                  {/* Simplified legend - just name + profit */}
                  <div className="flex justify-center items-end gap-8 mt-4">
                    {allStrategyStats.map((s) => {
                      const isCurrent = s.name === currentStrategyName;
                      const rank = profitRankings.get(s.name) ?? 0;
                      return (
                        <div
                          key={s.name}
                          className={`text-center cursor-pointer transition-all ${isCurrent ? '' : 'opacity-40 hover:opacity-60'}`}
                          onClick={() => applyStrategy(s.name as StrategyName)}
                        >
                          <div className={`text-sm ${isCurrent ? 'text-emerald-400' : 'text-zinc-500'}`}>
                            {s.label}<sup className="ml-0.5 opacity-60">{rank}</sup>
                          </div>
                          <div className={`font-bold ${isCurrent ? 'text-white text-xl' : 'text-zinc-500 text-base'}`}>
                            +{formatUSD(s.profit)}
                          </div>
                        </div>
                      );
                    })}
                    {/* Custom strategy in legend - show if allocation is valid (~100%) */}
                    {(() => {
                      const showCustomLegend = isValidCustom && customStats.totalPosition > 0;
                      if (!showCustomLegend) return null;
                      const isCurrent = isCustomMode;
                      const rank = profitRankings.get('custom') ?? 0;
                      return (
                        <div
                          className={`text-center cursor-pointer transition-all ${isCurrent ? '' : 'opacity-40 hover:opacity-60'}`}
                          onClick={() => setIsCustomMode(true)}
                        >
                          <div className={`text-sm ${isCurrent ? 'text-emerald-400' : 'text-zinc-500'}`}>
                            自定义<sup className="ml-0.5 opacity-60">{rank}</sup>
                          </div>
                          <div className={`font-bold ${isCurrent ? 'text-white text-xl' : 'text-zinc-500 text-base'}`}>
                            +{formatUSD(customStats.profit)}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </>
              );
            })()
          ) : (
            /* Profit curve view */
            (() => {
              // Determine current display strategy
              const currentStrategyName = isCustomMode || activeStrategy === null ? 'custom' : activeStrategy;

              // Filter curve data (use cached isValidCustom)
              const visibleCurves = curveData.filter(c => {
                if (c.name === 'custom') return isValidCustom;
                return true;
              });

              // Calculate Y-axis range (profit range)
              // Theoretical max: all maxPosition bought at lowest price level
              const lowestPrice = Math.min(...config.priceLevels.filter(p => p > 0));
              const theoreticalMax = (config.ath - lowestPrice) * config.maxPosition;
              const allProfits = visibleCurves.flatMap(c => c.points.map(p => p.y));
              const minProfit = Math.min(0, ...allProfits);
              const maxProfit = Math.max(theoreticalMax, ...allProfits);
              const profitRange = maxProfit - minProfit || 1;

              // X-axis range (rebound price)
              const xMin = config.reboundMin;
              const xMax = config.reboundMax;
              const xRange = xMax - xMin;

              // Chart dimensions
              const chartWidth = CONSTANTS.CHART_WIDTH;
              const chartHeight = CONSTANTS.CHART_HEIGHT;

              // Convert data to SVG coordinates
              const toSvgX = (price: number) => ((price - xMin) / xRange) * chartWidth;
              const toSvgY = (profit: number) => chartHeight - ((profit - minProfit) / profitRange) * chartHeight;

              // Generate path for a curve
              const generatePath = (points: { x: number; y: number }[]) => {
                if (points.length === 0) return '';
                const pathParts = points.map((p, i) => {
                  const svgX = toSvgX(p.x);
                  const svgY = toSvgY(p.y);
                  return i === 0 ? `M ${svgX} ${svgY}` : `L ${svgX} ${svgY}`;
                });
                return pathParts.join(' ');
              };

              // Current rebound price position
              const reboundX = toSvgX(reboundPrice);
              const zeroY = toSvgY(0);

              // Get profit at current rebound price for each strategy
              const currentProfits = visibleCurves.map(c => {
                const point = c.points.find(p => p.x === reboundPrice);
                return { name: c.name, label: c.label, profit: point?.y ?? 0 };
              });

              // Drag handlers for rebound price adjustment
              const updateReboundFromMouse = (e: React.MouseEvent<HTMLDivElement>) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const ratio = x / rect.width;
                const rawPrice = xMin + ratio * xRange;
                // Snap to step
                const snapped = Math.round((rawPrice - xMin) / config.reboundStep) * config.reboundStep + xMin;
                const clamped = Math.max(xMin, Math.min(xMax, snapped));
                setReboundPrice(clamped);
              };

              const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
                isDraggingRef.current = true;
                updateReboundFromMouse(e);
              };

              const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
                if (!isDraggingRef.current) return;
                updateReboundFromMouse(e);
              };

              const handleMouseUp = () => {
                isDraggingRef.current = false;
              };

              return (
                <>
                  {/* Chart layout */}
                  <div className="flex flex-col">
                    <div className="flex">
                      {/* Y-axis title */}
                      <div className="flex items-center justify-center overflow-visible" style={{ width: '14px' }}>
                        <span className="text-[10px] text-zinc-500 -rotate-90 whitespace-nowrap">盈利额 (USD)</span>
                      </div>
                      {/* Y-axis labels */}
                      <div className="relative flex flex-col justify-between text-[10px] text-zinc-400 pr-2 py-1" style={{ minWidth: '60px' }}>
                        <span className="text-right">{formatUSD(maxProfit)}</span>
                        {minProfit < 0 && (
                          <span
                            className="absolute right-2 text-zinc-500"
                            style={{ top: `${(zeroY / chartHeight) * 100}%`, transform: 'translateY(-50%)' }}
                          >
                            $0
                          </span>
                        )}
                        <span className="text-right">{formatUSD(minProfit)}</span>
                      </div>

                      {/* SVG Chart */}
                      <div
                        className="relative flex-1 bg-zinc-800/50 rounded overflow-hidden cursor-ew-resize"
                        style={{ aspectRatio: '5 / 2', minHeight: `${CONSTANTS.CHART_HEIGHT}px` }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                      >
                        <svg
                          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                          className="w-full h-full"
                          preserveAspectRatio="none"
                        >
                          {/* Grid */}
                          <defs>
                            <pattern id="grid" width={CONSTANTS.GRID_SIZE} height={CONSTANTS.GRID_SIZE} patternUnits="userSpaceOnUse">
                              <path d={`M ${CONSTANTS.GRID_SIZE} 0 L 0 0 0 ${CONSTANTS.GRID_SIZE}`} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                            </pattern>
                          </defs>
                          <rect width="100%" height="100%" fill="url(#grid)" />

                          {/* Zero line if visible */}
                          {minProfit < 0 && (
                            <line
                              x1="0"
                              y1={zeroY}
                              x2={chartWidth}
                              y2={zeroY}
                              stroke="rgba(255,255,255,0.2)"
                              strokeWidth="1"
                              strokeDasharray="4 4"
                            />
                          )}

                          {/* Strategy curves - non-current first */}
                          {visibleCurves
                            .filter(c => c.name !== currentStrategyName)
                            .map(c => (
                              <path
                                key={c.name}
                                d={generatePath(c.points)}
                                fill="none"
                                stroke="rgba(113, 113, 122, 0.5)"
                                strokeWidth="1.5"
                              />
                            ))}

                          {/* Current strategy curve - on top */}
                          {visibleCurves
                            .filter(c => c.name === currentStrategyName)
                            .map(c => (
                              <path
                                key={c.name}
                                d={generatePath(c.points)}
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="2.5"
                              />
                            ))}

                          {/* Vertical line at current rebound price */}
                          <line
                            x1={reboundX}
                            y1="0"
                            x2={reboundX}
                            y2={chartHeight}
                            stroke="rgba(16, 185, 129, 0.4)"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                          />

                          {/* Points at current rebound price */}
                          {visibleCurves.map(c => {
                            const point = c.points.find(p => p.x === reboundPrice);
                            if (!point) return null;
                            const isCurrent = c.name === currentStrategyName;
                            return (
                              <circle
                                key={c.name}
                                cx={reboundX}
                                cy={toSvgY(point.y)}
                                r={isCurrent ? 5 : 3}
                                fill={isCurrent ? '#10b981' : '#71717a'}
                              />
                            );
                          })}
                        </svg>

                        {/* Tooltip at current strategy point */}
                        {(() => {
                          const currentCurve = visibleCurves.find(c => c.name === currentStrategyName);
                          const point = currentCurve?.points.find(p => p.x === reboundPrice);
                          if (!point || !currentCurve) return null;
                          const pct = Math.round(point.y / theoreticalMax * 100);
                          const leftPct = ((reboundPrice - xMin) / xRange) * 100;
                          const topPct = ((point.y - minProfit) / profitRange) * 100;
                          const flipLeft = leftPct > 85;
                          return (
                            <div
                              className="absolute pointer-events-none"
                              style={{
                                left: `${leftPct}%`,
                                bottom: `${topPct}%`,
                                transform: flipLeft ? 'translate(calc(-100% - 8px), 50%)' : 'translate(8px, 50%)',
                              }}
                            >
                              <div className="bg-zinc-900/90 border border-zinc-700 rounded px-1.5 py-0.5 text-[11px] text-emerald-400 whitespace-nowrap">
                                {pct}% of max
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* X-axis labels */}
                    <div className="flex">
                      <div style={{ minWidth: '74px' }} />
                      <div className="relative flex-1 text-[10px] text-zinc-500 mt-1 px-1">
                        <div className="flex justify-between">
                          <span>{formatUSD(xMin)}</span>
                          <span>{formatUSD((xMin + xMax) / 2)}</span>
                          <span>{formatUSD(xMax)}</span>
                        </div>
                        {/* Current rebound price indicator */}
                        <span
                          className="absolute text-emerald-400 font-medium"
                          style={{
                            left: `${((reboundPrice - xMin) / xRange) * 100}%`,
                            transform: 'translateX(-50%)',
                            top: 0,
                          }}
                        >
                          {formatUSD(reboundPrice)}
                        </span>
                      </div>
                    </div>
                    {/* X-axis title */}
                    <div className="flex">
                      <div style={{ minWidth: '74px' }} />
                      <div className="flex-1 text-right pr-1 mt-0.5">
                        <span className="text-[10px] text-zinc-500 tracking-wider">反弹价格 (USD)</span>
                      </div>
                    </div>
                  </div>

                  {/* Legend with profits at current rebound price */}
                  <div className="flex justify-center items-end gap-8 mt-4">
                    {currentProfits
                      .filter(p => p.name !== 'custom')
                      .map((p) => {
                        const isCurrent = p.name === currentStrategyName;
                        const rank = profitRankings.get(p.name) ?? 0;
                        return (
                          <div
                            key={p.name}
                            className={`text-center cursor-pointer transition-all ${isCurrent ? '' : 'opacity-40 hover:opacity-60'}`}
                            onClick={() => applyStrategy(p.name as StrategyName)}
                          >
                            <div className={`text-sm ${isCurrent ? 'text-emerald-400' : 'text-zinc-500'}`}>
                            {p.label}<sup className="ml-0.5 opacity-60">{rank}</sup>
                          </div>
                            <div className={`font-bold ${isCurrent ? 'text-white text-xl' : 'text-zinc-500 text-base'}`}>
                              +{formatUSD(p.profit)}
                            </div>
                          </div>
                        );
                      })}
                    {/* Custom in legend */}
                    {isValidCustom && (() => {
                      const customProfit = currentProfits.find(p => p.name === 'custom');
                      if (!customProfit) return null;
                      const isCurrent = isCustomMode;
                      const rank = profitRankings.get('custom') ?? 0;
                      return (
                        <div
                          className={`text-center cursor-pointer transition-all ${isCurrent ? '' : 'opacity-40 hover:opacity-60'}`}
                          onClick={() => setIsCustomMode(true)}
                        >
                          <div className={`text-sm ${isCurrent ? 'text-emerald-400' : 'text-zinc-500'}`}>
                            自定义<sup className="ml-0.5 opacity-60">{rank}</sup>
                          </div>
                          <div className={`font-bold ${isCurrent ? 'text-white text-xl' : 'text-zinc-500 text-base'}`}>
                            +{formatUSD(customProfit.profit)}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </>
              );
            })()
          )}
        </div>

        {/* 策略建议 */}
        {curveInsight && (
          <div className="bg-zinc-900 rounded-xl p-5 mb-6">
            <h2 className="text-base font-medium text-zinc-300 mb-4">策略建议</h2>

            <div className="grid grid-cols-2 gap-6">
              {/* 左侧：结论 */}
              {curveInsight.bestStrategy && (
                <div className="py-4 px-5 bg-zinc-800/50 rounded-lg border border-zinc-700/50 text-center">
                  <div className="text-xs text-zinc-500 mb-1">推荐策略</div>
                  <div className="text-2xl font-bold text-emerald-400">
                    {curveInsight.bestStrategy.label}
                  </div>
                  <div className="text-xs text-zinc-500 mt-2">
                    覆盖 {curveInsight.coveragePct}% 价格区间
                  </div>
                </div>
              )}

              {/* 右侧：分情况讨论 */}
              <div className="space-y-2 text-sm text-zinc-400">
                {curveInsight.zeroZoneLabel && (
                  <p>
                    当反弹价格 <span className="text-zinc-300 font-mono">{curveInsight.zeroZoneLabel}</span> 时，所有方案都无收益
                  </p>
                )}
                {curveInsight.segments.map((seg, i) => (
                  <p key={i}>
                    当反弹价格在 <span className="text-zinc-300 font-mono">{seg.range}</span> 时，
                    <span className="text-emerald-400 font-medium">{seg.label}</span> 收益最高
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-zinc-600 text-xs mt-8">
          © 2026 Zhenye Dong
        </div>
      </div>
    </div>
  );
}
