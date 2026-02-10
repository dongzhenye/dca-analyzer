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
  STRATEGY_LABELS,
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

  const [reboundPrice, setReboundPrice] = useState(() => {
    const { reboundMin, reboundMax, reboundStep } = DEFAULT_CONFIG;
    const middle = (reboundMin + reboundMax) / 2;
    return (
      Math.round((middle - reboundMin) / reboundStep) * reboundStep +
      reboundMin
    );
  });

  // Auto-adjust reboundPrice when rebound range changes
  useEffect(() => {
    const { reboundMin, reboundMax, reboundStep } = config;
    if (reboundMin >= reboundMax || reboundStep <= 0) return;

    const middle = (reboundMin + reboundMax) / 2;
    const alignedMiddle =
      Math.round((middle - reboundMin) / reboundStep) * reboundStep +
      reboundMin;
    const clampedMiddle = Math.max(
      reboundMin,
      Math.min(reboundMax, alignedMiddle)
    );

    setReboundPrice((currentPrice) => {
      const alignedPrice =
        Math.round((currentPrice - reboundMin) / reboundStep) * reboundStep +
        reboundMin;
      const clampedPrice = Math.max(
        reboundMin,
        Math.min(reboundMax, alignedPrice)
      );

      if (currentPrice < reboundMin || currentPrice > reboundMax) {
        return clampedMiddle;
      }
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
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        setReboundPrice((prev) => {
          const delta =
            e.key === "ArrowRight" ? config.reboundStep : -config.reboundStep;
          const next = prev + delta;
          return Math.max(config.reboundMin, Math.min(config.reboundMax, next));
        });
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [config.reboundStep, config.reboundMin, config.reboundMax]);

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
        label: STRATEGY_LABELS[strategy].name,
        ...calculatePositionStats(
          strategyLevels,
          reboundPrice,
          config.targetPrice,
          config.totalSize
        ),
      };
    });
  }, [activePriceLevels, strategies, reboundPrice, config.targetPrice, config.totalSize]);

  // Profit curves: profit at each rebound price for each strategy
  const profitCurves = useMemo((): ProfitCurve[] => {
    const prices: number[] = [];
    for (
      let p = config.reboundMin;
      p <= config.reboundMax;
      p += config.reboundStep
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
        label:
          strategyName === "custom"
            ? "自定义"
            : STRATEGY_LABELS[strategyName].name,
        points: prices.map((reboundP) => ({
          x: reboundP,
          y: calculatePositionStats(
            strategyLevels,
            reboundP,
            config.targetPrice,
            config.totalSize
          ).profit,
        })),
      };
    });
  }, [config, strategies, customAllocations, activePriceLevels]);

  // Cache custom allocation total for reuse
  const customTotal = useMemo(
    () => customAllocations.reduce((sum, l) => sum + l.weight, 0),
    [customAllocations]
  );

  const isValidCustom =
    Math.abs(customTotal - 1) < CONSTANTS.ALLOCATION_TOLERANCE;

  // Comparable strategies: presets always included, custom only when allocation sums to ~100%
  const comparableStrategies = useMemo((): ComparableStrategy[] => {
    const list: ComparableStrategy[] = STRATEGY_ORDER.map((name) => ({
      name,
      label: STRATEGY_LABELS[name].name,
      allocations: activePriceLevels.map((price, i) => ({
        price,
        weight: strategies[name][i] ?? 0,
      })),
    }));
    if (isValidCustom) {
      list.push({
        name: "custom",
        label: "自定义",
        allocations: customAllocations.filter((l) => l.price > 0),
      });
    }
    return list;
  }, [activePriceLevels, strategies, isValidCustom, customAllocations]);

  // Calculate profit rankings for legend display
  const profitRankings = useMemo(() => {
    const customStats = calculatePositionStats(
      customAllocations.filter((l) => l.price > 0),
      reboundPrice,
      config.targetPrice,
      config.totalSize
    );

    const allProfits: { name: string; profit: number }[] = [
      ...presetStats.map((s) => ({ name: s.name, profit: s.profit })),
    ];

    if (isValidCustom) {
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
    reboundPrice,
    config.targetPrice,
    config.totalSize,
    isValidCustom,
  ]);

  // Strategy advice
  const strategyAdvice = useMemo((): StrategyAdvice | null => {
    return analyzeStrategyAdvice(
      comparableStrategies,
      config.priceLevels,
      config.targetPrice,
      config.totalSize,
      config.reboundMin,
      config.reboundMax,
      config.reboundStep
    );
  }, [
    comparableStrategies,
    config.priceLevels,
    config.targetPrice,
    config.totalSize,
    config.reboundMin,
    config.reboundMax,
    config.reboundStep,
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

  const totalWeight = activeAllocations.reduce(
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
    // Rebound
    reboundPrice,
    setReboundPrice,
    // Derived data
    activePriceLevels,
    presetStats,
    profitCurves,
    comparableStrategies,
    profitRankings,
    strategyAdvice,
    // Computed flags
    isValidCustom,
    totalWeight,
    customTotal,
  };
}
