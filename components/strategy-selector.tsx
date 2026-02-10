import type {
  Allocation,
  ActiveStrategy,
  PresetStrategy,
  SimulatorConfig,
} from "@/lib/types";
import { CONSTANTS } from "@/lib/constants";
import { formatUSD } from "@/lib/formatting";
import { STRATEGY_ORDER, STRATEGY_LABELS } from "@/lib/strategies";

interface StrategySelectorProps {
  activeStrategy: ActiveStrategy;
  activeAllocations: Allocation[];
  reboundPrice: number;
  isCustomActive: boolean;
  activeWeightSum: number;
  onSelectPreset: (strategy: PresetStrategy) => void;
  onSelectCustom: () => void;
  onUpdateCustomWeight: (index: number, weight: number) => void;
  onResetCustomAllocations: (config: SimulatorConfig) => void;
  config: SimulatorConfig;
}

export function StrategySelector({
  activeStrategy,
  activeAllocations,
  reboundPrice,
  isCustomActive,
  activeWeightSum,
  onSelectPreset,
  onSelectCustom,
  onUpdateCustomWeight,
  onResetCustomAllocations,
  config,
}: StrategySelectorProps) {
  return (
    <div className="bg-zinc-900 rounded-xl p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-medium text-zinc-300">建仓策略</h2>
        <div className="flex gap-2">
          {STRATEGY_ORDER.map((strategy) => {
            const isActive = activeStrategy === strategy;
            const label = STRATEGY_LABELS[strategy];
            return (
              <button
                key={strategy}
                onClick={() => onSelectPreset(strategy)}
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
            onClick={onSelectCustom}
            title="自由调整每个价位的仓位比例"
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              isCustomActive
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
        {activeAllocations.map((level, index) => {
          const isFilled = level.price >= reboundPrice;
          const barWidth = Math.min(
            (level.weight / CONSTANTS.HISTOGRAM_SCALE_MAX) * 100,
            100
          );
          const showSlider = isCustomActive;

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
                    max={CONSTANTS.MAX_LEVEL_WEIGHT}
                    step={0.01}
                    value={level.weight}
                    onChange={(e) =>
                      onUpdateCustomWeight(index, Number(e.target.value))
                    }
                    className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <input
                    type="number"
                    min={0}
                    max={CONSTANTS.MAX_LEVEL_WEIGHT * 100}
                    value={Math.round(level.weight * 100)}
                    onChange={(e) =>
                      onUpdateCustomWeight(
                        index,
                        Math.min(
                          CONSTANTS.MAX_LEVEL_WEIGHT,
                          Math.max(0, Number(e.target.value) / 100)
                        )
                      )
                    }
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
                  <span
                    className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium ${
                      isFilled ? "text-emerald-300" : "text-zinc-400"
                    }`}
                  >
                    {(level.weight * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer - always reserve space for consistent height */}
      <div
        className={`flex justify-between items-center mt-3 h-5 ${isCustomActive ? "" : "invisible"}`}
      >
        <button
          onClick={() => onResetCustomAllocations(config)}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          重置自定义
        </button>
        <span
          className={`text-sm ${Math.abs(activeWeightSum - 1) < CONSTANTS.ALLOCATION_TOLERANCE ? "text-emerald-400" : "text-amber-400"}`}
        >
          总仓位: {(activeWeightSum * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
