import { useMemo } from "react";
import type {
  SimulatorConfig,
  Allocation,
  PositionMetrics,
  ActiveStrategy,
  PresetStrategy,
} from "@/lib/types";
import { CONSTANTS } from "@/lib/constants";
import { formatUSD } from "@/lib/formatting";
import { calculatePositionStats } from "@/lib/calculations";
import { ChartLegend } from "./chart-legend";

interface AreaChartProps {
  config: SimulatorConfig;
  presetStats: (PositionMetrics & { name: string; label: string })[];
  customAllocations: Allocation[];
  activeStrategy: ActiveStrategy;
  reboundPrice: number;
  isCustomWeightValid: boolean;
  profitRankings: Map<string, number>;
  onSelectPreset: (name: PresetStrategy) => void;
  onSelectCustom: () => void;
}

export function AreaChart({
  config,
  presetStats,
  customAllocations,
  activeStrategy,
  reboundPrice,
  isCustomWeightValid,
  profitRankings,
  onSelectPreset,
  onSelectCustom,
}: AreaChartProps) {
  // Y-axis: price range from reboundMin to targetPrice
  const priceRange = config.targetPrice - config.reboundMin;
  const maxPos = config.totalSize;

  const customStats = useMemo(
    () =>
      calculatePositionStats(
        customAllocations.filter((l) => l.price > 0),
        reboundPrice,
        config.targetPrice,
        config.totalSize
      ),
    [customAllocations, reboundPrice, config.targetPrice, config.totalSize]
  );

  const currentStrategyName = activeStrategy;

  const allStats = [
    ...presetStats,
    {
      name: "custom" as const,
      label: "自定义",
      ...customStats,
    },
  ];

  const currentStats =
    currentStrategyName === "custom"
      ? { name: "custom", label: "自定义", ...customStats }
      : presetStats.find((s) => s.name === currentStrategyName) ||
        presetStats[0];

  const priceToY = (price: number) =>
    ((price - config.reboundMin) / priceRange) * 100;

  const currentCostY =
    currentStats.filledPosition > 0
      ? Math.round(priceToY(currentStats.avgCost) * 10000) / 10000
      : 0;

  // Legend items
  const legendItems = [
    ...presetStats.map((s) => ({
      name: s.name,
      label: s.label,
      profit: s.profit,
    })),
    ...(isCustomWeightValid && customStats.filledPosition > 0
      ? [{ name: "custom", label: "自定义", profit: customStats.profit }]
      : []),
  ];

  return (
    <>
      {/* Chart layout: Y-axis on left, canvas on right, X-axis below */}
      <div className="flex flex-col">
        {/* Main row: Y-axis title + Y-axis + Canvas */}
        <div className="flex">
          {/* Y-axis title */}
          <div
            className="flex items-center justify-center overflow-visible"
            style={{ width: "14px" }}
          >
            <span className="text-[10px] text-zinc-500 -rotate-90 whitespace-nowrap">
              价格 (USD)
            </span>
          </div>
          {/* Y-axis labels */}
          <div
            className="relative flex flex-col justify-between text-[10px] text-zinc-400 pr-2 py-1"
            style={{ minWidth: "60px" }}
          >
            <span className="text-right">
              {formatUSD(config.targetPrice)}
            </span>
            <span className="text-right">
              {formatUSD(config.reboundMin)}
            </span>
            {currentStats.filledPosition > 0 && (
              <span
                className="absolute right-2 text-emerald-400 font-medium"
                style={{
                  top: `${100 - currentCostY}%`,
                  transform: "translateY(-50%)",
                }}
              >
                {formatUSD(currentStats.avgCost)}
              </span>
            )}
          </div>

          {/* Canvas */}
          <div
            className="relative flex-1 bg-zinc-800/50 rounded overflow-hidden"
            style={{
              aspectRatio: "5 / 2",
              minHeight: `${CONSTANTS.CHART_HEIGHT}px`,
            }}
          >
            {/* Grid background */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.3) 1px, transparent 1px)",
                backgroundSize: `${CONSTANTS.GRID_SIZE}px ${CONSTANTS.GRID_SIZE}px`,
              }}
            />

            {/* Horizontal line at current cost level */}
            {currentStats.filledPosition > 0 && (
              <div
                className="absolute left-0 right-0 border-t border-dashed border-emerald-500/40"
                style={{ bottom: `${currentCostY}%` }}
              />
            )}

            {/* Vertical line at current position level */}
            {currentStats.filledPosition > 0 && (
              <div
                className="absolute top-0 bottom-0 border-l border-dashed border-emerald-500/40"
                style={{
                  left: `${Math.round((currentStats.filledPosition / maxPos) * 100 * 10000) / 10000}%`,
                }}
              />
            )}

            {/* Strategy rectangles */}
            {allStats
              .filter((s) => {
                if (s.name === "custom") {
                  return isCustomWeightValid && s.filledPosition > 0;
                }
                return s.filledPosition > 0;
              })
              .sort((a, b) => {
                if (a.name === currentStrategyName) return 1;
                if (b.name === currentStrategyName) return -1;
                return b.profit - a.profit;
              })
              .map((s) => {
                const costY =
                  Math.round(priceToY(s.avgCost) * 10000) / 10000;
                const heightPercent =
                  Math.round((100 - costY) * 10000) / 10000;
                const widthPercent =
                  Math.round(
                    (s.filledPosition / maxPos) * 100 * 10000
                  ) / 10000;
                const isCurrent = s.name === currentStrategyName;

                return (
                  <div
                    key={s.name}
                    className="absolute left-0 transition-all duration-500"
                    style={{
                      bottom: `${costY}%`,
                      height: `${heightPercent}%`,
                      width: `${Math.max(widthPercent, 2)}%`,
                      backgroundColor: isCurrent
                        ? "rgba(16, 185, 129, 0.35)"
                        : "transparent",
                      border: isCurrent
                        ? "2px solid #10b981"
                        : "2px solid rgba(113, 113, 122, 0.4)",
                      zIndex: isCurrent ? 30 : 10,
                    }}
                  >
                    {isCurrent && s.filledPosition > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-[11px] text-emerald-300/70 text-center leading-relaxed">
                          <div className="font-medium">
                            盈利额 {formatUSD(s.profit)}
                          </div>
                          <div className="text-[10px] text-emerald-300/50">
                            = ({formatUSD(config.targetPrice)} −{" "}
                            {formatUSD(s.avgCost)}) ×{" "}
                            {s.filledPosition.toFixed(2)} {config.assetUnit}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* X-axis labels */}
        <div className="flex">
          <div style={{ minWidth: "74px" }} />
          <div className="relative flex-1 text-[10px] text-zinc-500 mt-1 px-1">
            <div className="flex justify-between">
              <span>0 {config.assetUnit}</span>
              <span>
                {(maxPos / 2).toFixed(1)} {config.assetUnit}
              </span>
              <span>
                {maxPos} {config.assetUnit}
              </span>
            </div>
            {currentStats.filledPosition > 0 && (
              <span
                className="absolute text-emerald-400 font-medium"
                style={{
                  left: `${Math.round((currentStats.filledPosition / maxPos) * 100 * 10000) / 10000}%`,
                  transform: "translateX(-50%)",
                  top: 0,
                }}
              >
                {currentStats.filledPosition.toFixed(2)} {config.assetUnit}
              </span>
            )}
          </div>
        </div>
        {/* X-axis title */}
        <div className="flex">
          <div style={{ minWidth: "74px" }} />
          <div className="flex-1 text-right pr-1 mt-0.5">
            <span className="text-[10px] text-zinc-500 tracking-wider">
              仓位 ({config.assetUnit})
            </span>
          </div>
        </div>
      </div>

      <ChartLegend
        items={legendItems}
        activeStrategy={activeStrategy}
        profitRankings={profitRankings}
        isCustomWeightValid={isCustomWeightValid}
        onSelectPreset={onSelectPreset}
        onSelectCustom={onSelectCustom}
      />
    </>
  );
}
