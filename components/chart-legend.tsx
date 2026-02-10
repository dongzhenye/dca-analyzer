import type { ActiveStrategy, PresetStrategy } from "@/lib/types";
import { formatUSD } from "@/lib/formatting";

interface LegendItem {
  name: string;
  label: string;
  profit: number;
}

interface ChartLegendProps {
  items: LegendItem[];
  activeStrategy: ActiveStrategy;
  profitRankings: Map<string, number>;
  isValidCustom: boolean;
  onSelectPreset: (name: PresetStrategy) => void;
  onSelectCustom: () => void;
}

export function ChartLegend({
  items,
  activeStrategy,
  profitRankings,
  isValidCustom,
  onSelectPreset,
  onSelectCustom,
}: ChartLegendProps) {
  return (
    <div className="flex justify-center items-end gap-8 mt-4">
      {items
        .filter((p) => p.name !== "custom")
        .map((p) => {
          const isCurrent = p.name === activeStrategy;
          const rank = profitRankings.get(p.name) ?? 0;
          return (
            <div
              key={p.name}
              className={`text-center cursor-pointer transition-all ${isCurrent ? "" : "opacity-40 hover:opacity-60"}`}
              onClick={() => onSelectPreset(p.name as PresetStrategy)}
            >
              <div
                className={`text-sm ${isCurrent ? "text-emerald-400" : "text-zinc-500"}`}
              >
                {p.label}
                <sup className="ml-0.5 opacity-60">{rank}</sup>
              </div>
              <div
                className={`font-bold ${isCurrent ? "text-white text-xl" : "text-zinc-500 text-base"}`}
              >
                +{formatUSD(p.profit)}
              </div>
            </div>
          );
        })}
      {/* Custom strategy in legend */}
      {(() => {
        const customItem = items.find((p) => p.name === "custom");
        if (!customItem || !isValidCustom) return null;
        const isCurrent = activeStrategy === "custom";
        const rank = profitRankings.get("custom") ?? 0;
        return (
          <div
            className={`text-center cursor-pointer transition-all ${isCurrent ? "" : "opacity-40 hover:opacity-60"}`}
            onClick={onSelectCustom}
          >
            <div
              className={`text-sm ${isCurrent ? "text-emerald-400" : "text-zinc-500"}`}
            >
              自定义
              <sup className="ml-0.5 opacity-60">{rank}</sup>
            </div>
            <div
              className={`font-bold ${isCurrent ? "text-white text-xl" : "text-zinc-500 text-base"}`}
            >
              +{formatUSD(customItem.profit)}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
