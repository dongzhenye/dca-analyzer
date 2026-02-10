import { useRef } from "react";
import type {
  SimulatorConfig,
  ProfitCurve,
  ActiveStrategy,
  PresetStrategy,
} from "@/lib/types";
import { CONSTANTS } from "@/lib/constants";
import { formatUSD } from "@/lib/formatting";
import { ChartLegend } from "./chart-legend";

interface CurveChartProps {
  config: SimulatorConfig;
  profitCurves: ProfitCurve[];
  activeStrategy: ActiveStrategy;
  reboundPrice: number;
  isValidCustom: boolean;
  profitRankings: Map<string, number>;
  onReboundChange: (price: number) => void;
  onSelectPreset: (name: PresetStrategy) => void;
  onSelectCustom: () => void;
}

export function CurveChart({
  config,
  profitCurves,
  activeStrategy,
  reboundPrice,
  isValidCustom,
  profitRankings,
  onReboundChange,
  onSelectPreset,
  onSelectCustom,
}: CurveChartProps) {
  const isDraggingRef = useRef(false);

  const currentStrategyName = activeStrategy;

  // Filter curve data
  const visibleCurves = profitCurves.filter((c) => {
    if (c.name === "custom") return isValidCustom;
    return true;
  });

  // Calculate Y-axis range
  const lowestPrice = Math.min(
    ...config.priceLevels.filter((p) => p > 0)
  );
  const theoreticalMax =
    (config.targetPrice - lowestPrice) * config.totalSize;
  const allProfits = visibleCurves.flatMap((c) => c.points.map((p) => p.y));
  const minProfit = Math.min(0, ...allProfits);
  const maxProfit = Math.max(theoreticalMax, ...allProfits);
  const profitRange = maxProfit - minProfit || 1;

  // X-axis range
  const xMin = config.reboundMin;
  const xMax = config.reboundMax;
  const xRange = xMax - xMin;

  const chartWidth = CONSTANTS.CHART_WIDTH;
  const chartHeight = CONSTANTS.CHART_HEIGHT;

  const toSvgX = (price: number) =>
    ((price - xMin) / xRange) * chartWidth;
  const toSvgY = (profit: number) =>
    chartHeight - ((profit - minProfit) / profitRange) * chartHeight;

  const generatePath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return "";
    return points
      .map((p, i) => {
        const svgX = toSvgX(p.x);
        const svgY = toSvgY(p.y);
        return i === 0 ? `M ${svgX} ${svgY}` : `L ${svgX} ${svgY}`;
      })
      .join(" ");
  };

  const reboundX = toSvgX(reboundPrice);
  const zeroY = toSvgY(0);

  // Get profit at current rebound price for each strategy
  const currentProfits = visibleCurves.map((c) => {
    const point = c.points.find((p) => p.x === reboundPrice);
    return { name: c.name, label: c.label, profit: point?.y ?? 0 };
  });

  // Drag handlers
  const updateReboundFromMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    const rawPrice = xMin + ratio * xRange;
    const snapped =
      Math.round((rawPrice - xMin) / config.reboundStep) * config.reboundStep +
      xMin;
    const clamped = Math.max(xMin, Math.min(xMax, snapped));
    onReboundChange(clamped);
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
      <div className="flex flex-col">
        <div className="flex">
          {/* Y-axis title */}
          <div
            className="flex items-center justify-center overflow-visible"
            style={{ width: "14px" }}
          >
            <span className="text-[10px] text-zinc-500 -rotate-90 whitespace-nowrap">
              盈利额 (USD)
            </span>
          </div>
          {/* Y-axis labels */}
          <div
            className="relative flex flex-col justify-between text-[10px] text-zinc-400 pr-2 py-1"
            style={{ minWidth: "60px" }}
          >
            <span className="text-right">{formatUSD(maxProfit)}</span>
            {minProfit < 0 && (
              <span
                className="absolute right-2 text-zinc-500"
                style={{
                  top: `${(zeroY / chartHeight) * 100}%`,
                  transform: "translateY(-50%)",
                }}
              >
                $0
              </span>
            )}
            <span className="text-right">{formatUSD(minProfit)}</span>
          </div>

          {/* SVG Chart */}
          <div
            className="relative flex-1 bg-zinc-800/50 rounded overflow-hidden cursor-ew-resize"
            style={{
              aspectRatio: "5 / 2",
              minHeight: `${CONSTANTS.CHART_HEIGHT}px`,
            }}
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
                <pattern
                  id="grid"
                  width={CONSTANTS.GRID_SIZE}
                  height={CONSTANTS.GRID_SIZE}
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d={`M ${CONSTANTS.GRID_SIZE} 0 L 0 0 0 ${CONSTANTS.GRID_SIZE}`}
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Zero line */}
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

              {/* Non-current strategy curves */}
              {visibleCurves
                .filter((c) => c.name !== currentStrategyName)
                .map((c) => (
                  <path
                    key={c.name}
                    d={generatePath(c.points)}
                    fill="none"
                    stroke="rgba(113, 113, 122, 0.5)"
                    strokeWidth="1.5"
                  />
                ))}

              {/* Current strategy curve */}
              {visibleCurves
                .filter((c) => c.name === currentStrategyName)
                .map((c) => (
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
              {visibleCurves.map((c) => {
                const point = c.points.find((p) => p.x === reboundPrice);
                if (!point) return null;
                const isCurrent = c.name === currentStrategyName;
                return (
                  <circle
                    key={c.name}
                    cx={reboundX}
                    cy={toSvgY(point.y)}
                    r={isCurrent ? 5 : 3}
                    fill={isCurrent ? "#10b981" : "#71717a"}
                  />
                );
              })}
            </svg>

            {/* Tooltip at current strategy point */}
            {(() => {
              const currentCurve = visibleCurves.find(
                (c) => c.name === currentStrategyName
              );
              const point = currentCurve?.points.find(
                (p) => p.x === reboundPrice
              );
              if (!point || !currentCurve) return null;
              const pct = Math.round(
                (point.y / theoreticalMax) * 100
              );
              const leftPct =
                ((reboundPrice - xMin) / xRange) * 100;
              const topPct =
                ((point.y - minProfit) / profitRange) * 100;
              const flipLeft = leftPct > 85;
              return (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: `${leftPct}%`,
                    bottom: `${topPct}%`,
                    transform: flipLeft
                      ? "translate(calc(-100% - 8px), 50%)"
                      : "translate(8px, 50%)",
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
          <div style={{ minWidth: "74px" }} />
          <div className="relative flex-1 text-[10px] text-zinc-500 mt-1 px-1">
            <div className="flex justify-between">
              <span>{formatUSD(xMin)}</span>
              <span>{formatUSD((xMin + xMax) / 2)}</span>
              <span>{formatUSD(xMax)}</span>
            </div>
            <span
              className="absolute text-emerald-400 font-medium"
              style={{
                left: `${((reboundPrice - xMin) / xRange) * 100}%`,
                transform: "translateX(-50%)",
                top: 0,
              }}
            >
              {formatUSD(reboundPrice)}
            </span>
          </div>
        </div>
        {/* X-axis title */}
        <div className="flex">
          <div style={{ minWidth: "74px" }} />
          <div className="flex-1 text-right pr-1 mt-0.5">
            <span className="text-[10px] text-zinc-500 tracking-wider">
              反弹价格 (USD)
            </span>
          </div>
        </div>
      </div>

      <ChartLegend
        items={currentProfits}
        activeStrategy={activeStrategy}
        profitRankings={profitRankings}
        isValidCustom={isValidCustom}
        onSelectPreset={onSelectPreset}
        onSelectCustom={onSelectCustom}
      />
    </>
  );
}
