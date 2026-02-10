import { useTranslations } from "next-intl";
import type { SimulatorConfig } from "@/lib/types";
import { formatUSD } from "@/lib/formatting";

interface BottomSliderProps {
  config: SimulatorConfig;
  bottomPrice: number;
  onBottomChange: (price: number) => void;
}

export function BottomSlider({
  config,
  bottomPrice,
  onBottomChange,
}: BottomSliderProps) {
  const t = useTranslations("slider");

  return (
    <div className="bg-zinc-900 rounded-xl p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <span className="text-base font-medium text-zinc-300">{t("title")}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              onBottomChange(
                Math.max(config.bottomMin, bottomPrice - config.bottomStep)
              )
            }
            className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors text-lg font-light"
          >
            −
          </button>
          <span className="text-2xl font-bold text-emerald-400 tabular-nums min-w-[7ch] text-center">
            {formatUSD(bottomPrice)}
          </span>
          <button
            onClick={() =>
              onBottomChange(
                Math.min(config.bottomMax, bottomPrice + config.bottomStep)
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
        min={config.bottomMin}
        max={config.bottomMax}
        step={config.bottomStep}
        value={bottomPrice}
        onChange={(e) => onBottomChange(Number(e.target.value))}
        className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
      />
      <div className="flex justify-between text-xs text-zinc-500 mt-2">
        <span>{formatUSD(config.bottomMin)}</span>
        <span className="text-zinc-600">{t("keyboardHint")}</span>
        <span>{formatUSD(config.bottomMax)}</span>
      </div>
    </div>
  );
}
