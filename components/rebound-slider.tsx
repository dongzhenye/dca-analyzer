import type { SimulatorConfig } from "@/lib/types";
import { formatUSD } from "@/lib/formatting";

interface ReboundSliderProps {
  config: SimulatorConfig;
  reboundPrice: number;
  onReboundChange: (price: number) => void;
}

export function ReboundSlider({
  config,
  reboundPrice,
  onReboundChange,
}: ReboundSliderProps) {
  return (
    <div className="bg-zinc-900 rounded-xl p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <span className="text-base font-medium text-zinc-300">反弹价格</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              onReboundChange(
                Math.max(config.reboundMin, reboundPrice - config.reboundStep)
              )
            }
            className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors text-lg font-light"
          >
            −
          </button>
          <span className="text-2xl font-bold text-emerald-400 tabular-nums min-w-[7ch] text-center">
            {formatUSD(reboundPrice)}
          </span>
          <button
            onClick={() =>
              onReboundChange(
                Math.min(config.reboundMax, reboundPrice + config.reboundStep)
              )
            }
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
        onChange={(e) => onReboundChange(Number(e.target.value))}
        className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
      />
      <div className="flex justify-between text-xs text-zinc-500 mt-2">
        <span>{formatUSD(config.reboundMin)}</span>
        <span className="text-zinc-600">键盘左右微调</span>
        <span>{formatUSD(config.reboundMax)}</span>
      </div>
    </div>
  );
}
