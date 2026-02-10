import { useState, useMemo, useEffect } from "react";
import type {
  SimulatorConfig,
  Allocation,
  PresetStrategy,
  ActiveStrategy,
  ComparableStrategy,
  ProfitCurve,
  StrategyAdvice,
} from "@/lib/types";
import { CONSTANTS, DEFAULT_CONFIG } from "@/lib/constants";
import {
  generatePresetWeights,
  generateExponentialWeights,
  STRATEGY_ORDER,
} from "@/lib/strategies";
import { calculatePositionStats } from "@/lib/calculations";
import { analyzeStrategyAdvice } from "@/lib/advice";

export function useSimulator() {
  const [config, setConfig] = useState<SimulatorConfig>(DEFAULT_CONFIG);

  // Filter out empty price levels (price = 0)
  const activePriceLevels = useMemo(
    () => config.priceLevels.filter((p) => p > 0),
    [config.priceLevels]
  );

  // Derived strategies based on active levels count
  const strategies = useMemo(
    () => generatePresetWeights(activePriceLevels.length || 1),
    [activePriceLevels.length]
  );

  // Currently selected preset strategy
  const [selectedPreset, setSelectedPreset] =
    useState<PresetStrategy>("pyramid");

  // Custom allocations - persisted independently, initialized with exponential weights
  const [customAllocations, setCustomAllocations] = useState<Allocation[]>(
    () => {
      const weights = generateExponentialWeights(
        DEFAULT_CONFIG.priceLevels.length
      );
      return DEFAULT_CONFIG.priceLevels.map((price, i) => ({
        price,
        weight: weights[i],
      }));
    }
  );

  // Is custom mode active?
  const [isCustomActive, setIsCustomActive] = useState(false);

  const activeStrategy: ActiveStrategy = isCustomActive
    ? "custom"
    : selectedPreset;

  // Current active allocations (derived from selected strategy or custom)
  const activeAllocations = useMemo(() => {
    if (isCustomActive) {
      return customAllocations.filter((l) => l.price > 0);
    }
    const strategyAlloc = strategies[selectedPreset];
    return activePriceLevels.map((price, i) => ({
      price,
      weight: strategyAlloc[i] ?? 0,
    }));
  }, [
    isCustomActive,
    customAllocations,
    selectedPreset,
    strategies,
    activePriceLevels,
  ]);

  const [bottomPrice, setBottomPrice] = useState(() => {
    const { bottomMin, bottomMax, bottomStep } = DEFAULT_CONFIG;
    const middle = (bottomMin + bottomMax) / 2;
    return (
      Math.round((middle - bottomMin) / bottomStep) * bottomStep +
      bottomMin
    );
  });

  // Auto-adjust bottomPrice when bottom range changes
  useEffect(() => {
    const { bottomMin, bottomMax, bottomStep } = config;
    if (bottomMin >= bottomMax || bottomStep <= 0) return;

    const middle = (bottomMin + bottomMax) / 2;
    const alignedMiddle =
      Math.round((middle - bottomMin) / bottomStep) * bottomStep +
      bottomMin;
    const clampedMiddle = Math.max(
      bottomMin,
      Math.min(bottomMax, alignedMiddle)
    );

    setBottomPrice((currentPrice) => {
      const alignedPrice =
        Math.round((currentPrice - bottomMin) / bottomStep) * bottomStep +
        bottomMin;
      const clampedPrice = Math.max(
        bottomMin,
        Math.min(bottomMax, alignedPrice)
      );

      if (currentPrice < bottomMin || currentPrice > bottomMax) {
        return clampedMiddle;
      }
      if (clampedPrice !== currentPrice) {
        return clampedPrice;
      }
      return currentPrice;
    });
  }, [config.bottomMin, config.bottomMax, config.bottomStep]);

  // Keyboard arrow keys to adjust bottom price
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        setBottomPrice((prev) => {
          const delta =
            e.key === "ArrowRight" ? config.bottomStep : -config.bottomStep;
          const next = prev + delta;
          return Math.max(config.bottomMin, Math.min(config.bottomMax, next));
        });
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [config.bottomStep, config.bottomMin, config.bottomMax]);

  // Reset custom allocations when config price levels change
  const resetCustomAllocations = (newConfig: SimulatorConfig) => {
    const activeLevels = newConfig.priceLevels.filter((p) => p > 0);
    const weights = generateExponentialWeights(activeLevels.length || 1);
    setCustomAllocations(
      newConfig.priceLevels.map((price) => {
        const activeIndex = activeLevels.indexOf(price);
        return {
          price,
          weight: activeIndex >= 0 ? weights[activeIndex] : 0,
        };
      })
    );
  };

  // Calculate stats for all three preset strategies
  const presetStats = useMemo(() => {
    return STRATEGY_ORDER.map((strategy) => {
      const strategyAlloc = strategies[strategy];
      const strategyLevels = activePriceLevels.map((price, i) => ({
        price,
        weight: strategyAlloc[i] ?? 0,
      }));
      return {
        name: strategy,
        ...calculatePositionStats(
          strategyLevels,
          bottomPrice,
          config.targetPrice,
          config.totalSize
        ),
      };
    });
  }, [activePriceLevels, strategies, bottomPrice, config.targetPrice, config.totalSize]);

  // Profit curves: profit at each bottom price for each strategy
  const profitCurves = useMemo((): ProfitCurve[] => {
    const prices: number[] = [];
    for (
      let p = config.bottomMin;
      p <= config.bottomMax;
      p += config.bottomStep
    ) {
      prices.push(p);
    }

    type CurveStrategyName = PresetStrategy | "custom";
    const strategyNames: CurveStrategyName[] = [...STRATEGY_ORDER, "custom"];

    return strategyNames.map((strategyName) => {
      const strategyLevels =
        strategyName === "custom"
          ? customAllocations.filter((l) => l.price > 0)
          : activePriceLevels.map((price, i) => ({
              price,
              weight: strategies[strategyName][i] ?? 0,
            }));

      return {
        name: strategyName,
        points: prices.map((bottomP) => ({
          x: bottomP,
          y: calculatePositionStats(
            strategyLevels,
            bottomP,
            config.targetPrice,
            config.totalSize
          ).profit,
        })),
      };
    });
  }, [config, strategies, customAllocations, activePriceLevels]);

  // Cache custom allocation total for reuse
  const customWeightSum = useMemo(
    () => customAllocations.reduce((sum, l) => sum + l.weight, 0),
    [customAllocations]
  );

  const TOL = CONSTANTS.ALLOCATION_TOLERANCE;
  const isCustomWeightValid =
    customWeightSum > TOL && customWeightSum < 1 + TOL;

  // Comparable strategies: presets always included, custom only when allocation sums to ~100%
  const comparableStrategies = useMemo((): ComparableStrategy[] => {
    const list: ComparableStrategy[] = STRATEGY_ORDER.map((name) => ({
      name,
      allocations: activePriceLevels.map((price, i) => ({
        price,
        weight: strategies[name][i] ?? 0,
      })),
    }));
    if (isCustomWeightValid) {
      list.push({
        name: "custom",
        allocations: customAllocations.filter((l) => l.price > 0),
      });
    }
    return list;
  }, [activePriceLevels, strategies, isCustomWeightValid, customAllocations]);

  // Calculate profit rankings for legend display
  const profitRankings = useMemo(() => {
    const customStats = calculatePositionStats(
      customAllocations.filter((l) => l.price > 0),
      bottomPrice,
      config.targetPrice,
      config.totalSize
    );

    const allProfits: { name: string; profit: number }[] = [
      ...presetStats.map((s) => ({ name: s.name, profit: s.profit })),
    ];

    if (isCustomWeightValid) {
      allProfits.push({ name: "custom", profit: customStats.profit });
    }

    const sorted = [...allProfits].sort((a, b) => b.profit - a.profit);
    const rankings = new Map<string, number>();
    sorted.forEach((item, index) => {
      rankings.set(item.name, index + 1);
    });

    return rankings;
  }, [
    presetStats,
    customAllocations,
    bottomPrice,
    config.targetPrice,
    config.totalSize,
    isCustomWeightValid,
  ]);

  // Strategy advice
  const strategyAdvice = useMemo((): StrategyAdvice | null => {
    return analyzeStrategyAdvice(
      comparableStrategies,
      config.priceLevels,
      config.targetPrice,
      config.totalSize,
      config.bottomMin,
      config.bottomMax,
      config.bottomStep
    );
  }, [
    comparableStrategies,
    config.priceLevels,
    config.targetPrice,
    config.totalSize,
    config.bottomMin,
    config.bottomMax,
    config.bottomStep,
  ]);

  const selectPreset = (strategy: PresetStrategy) => {
    setSelectedPreset(strategy);
    setIsCustomActive(false);
  };

  const selectCustom = () => {
    setIsCustomActive(true);
  };

  const updateCustomWeight = (index: number, newWeight: number) => {
    const updated = [...customAllocations];
    updated[index] = { ...updated[index], weight: newWeight };
    setCustomAllocations(updated);
  };

  const resetToDefault = () => {
    setConfig(DEFAULT_CONFIG);
    resetCustomAllocations(DEFAULT_CONFIG);
    setSelectedPreset("pyramid");
    setIsCustomActive(false);
  };

  const activeWeightSum = activeAllocations.reduce(
    (sum, l) => sum + l.weight,
    0
  );

  return {
    // Config
    config,
    setConfig,
    resetToDefault,
    // Strategy selection
    activeStrategy,
    selectPreset,
    selectCustom,
    isCustomActive,
    // Allocations
    activeAllocations,
    customAllocations,
    updateCustomWeight,
    resetCustomAllocations,
    // Bottom price
    bottomPrice,
    setBottomPrice,
    // Derived data
    activePriceLevels,
    presetStats,
    profitCurves,
    comparableStrategies,
    profitRankings,
    strategyAdvice,
    // Computed flags
    isCustomWeightValid,
    activeWeightSum,
    customWeightSum,
  };
}
