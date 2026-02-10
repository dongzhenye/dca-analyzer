import { useTranslations } from "next-intl";
import type { SimulatorConfig } from "@/lib/types";
import { formatUSD, sortPriceLevels } from "@/lib/formatting";

interface ConfigPanelProps {
  config: SimulatorConfig;
  onConfigChange: (config: SimulatorConfig) => void;
  onResetCustomAllocations: (config: SimulatorConfig) => void;
  onResetToDefault: () => void;
}

export function ConfigPanel({
  config,
  onConfigChange,
  onResetCustomAllocations,
  onResetToDefault,
}: ConfigPanelProps) {
  const t = useTranslations("config");
  const tv = useTranslations("validation");
  const tc = useTranslations("common");

  return (
    <div className="bg-zinc-900 rounded-xl p-6 mb-6 border border-zinc-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <button
          onClick={onResetToDefault}
          className="text-xs px-2 py-1 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 rounded transition-colors"
        >
          {tc("resetDefault")}
        </button>
      </div>

      <div className="space-y-6">
        {/* Section 1: Asset & Position */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-zinc-500">{t("assetName")}</label>
            <input
              type="text"
              value={config.assetName}
              onChange={(e) =>
                onConfigChange({ ...config, assetName: e.target.value })
              }
              className="w-full mt-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">{t("unit")}</label>
            <input
              type="text"
              value={config.assetUnit}
              onChange={(e) =>
                onConfigChange({ ...config, assetUnit: e.target.value })
              }
              className="w-full mt-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">
              {t("totalSize", { unit: config.assetUnit })}
            </label>
            <input
              type="number"
              step="0.1"
              value={config.totalSize || ""}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  totalSize: Number(e.target.value) || 0,
                })
              }
              onBlur={(e) => {
                const val = Number(e.target.value);
                if (!val || val < 0.01)
                  onConfigChange({ ...config, totalSize: 0.01 });
              }}
              className="w-full mt-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Section 2: Target Price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-500">{t("targetPrice")}</label>
            <input
              type="number"
              value={config.targetPrice || ""}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  targetPrice: Number(e.target.value) || 0,
                })
              }
              onBlur={(e) => {
                const val = Number(e.target.value);
                if (!val || val < 1)
                  onConfigChange({ ...config, targetPrice: 1 });
              }}
              className="w-full mt-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">{t("targetDate")}</label>
            <input
              type="date"
              value={config.targetDate}
              onChange={(e) =>
                onConfigChange({ ...config, targetDate: e.target.value })
              }
              className="w-full mt-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Section 3: Price Levels */}
        <div>
          <label className="text-xs text-zinc-500 block mb-2">
            {t("priceLevels")}
          </label>
          <div className="flex flex-wrap gap-2">
            {config.priceLevels.map((price, i) => (
              <input
                key={i}
                type="number"
                value={price || ""}
                placeholder={t("empty")}
                onChange={(e) => {
                  const newLevels = [...config.priceLevels];
                  newLevels[i] = Number(e.target.value) || 0;
                  const newConfig = { ...config, priceLevels: newLevels };
                  onConfigChange(newConfig);
                  onResetCustomAllocations(newConfig);
                }}
                onBlur={() => {
                  const sortedLevels = sortPriceLevels(config.priceLevels);
                  if (
                    sortedLevels.some((p, i) => p !== config.priceLevels[i])
                  ) {
                    const newConfig = {
                      ...config,
                      priceLevels: sortedLevels,
                    };
                    onConfigChange(newConfig);
                    onResetCustomAllocations(newConfig);
                  }
                }}
                className={`w-24 px-2 py-1.5 bg-zinc-800 border rounded text-sm font-mono focus:outline-none focus:border-emerald-500 ${
                  price > 0
                    ? "border-zinc-700"
                    : "border-zinc-800 text-zinc-600"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-zinc-600 mt-1">
            {t("priceLevelsHint")}
          </p>
        </div>

        {/* Section 4: Bottom Price Simulation Range */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs text-zinc-500">{t("bottomRange")}</label>
            <button
              onClick={() => {
                const activeLevels = config.priceLevels.filter((p) => p > 0);
                if (activeLevels.length === 0) return;

                const minLevel = Math.min(...activeLevels);
                const maxLevel = Math.max(...activeLevels);
                const targetStepCount = 40;

                const rawRange = maxLevel - minLevel;
                const rawStep = rawRange / (targetStepCount - 2);

                const magnitude = Math.pow(
                  10,
                  Math.floor(Math.log10(rawStep))
                );
                const normalized = rawStep / magnitude;
                let niceStep: number;
                if (normalized <= 1) niceStep = magnitude;
                else if (normalized <= 2) niceStep = 2 * magnitude;
                else if (normalized <= 5) niceStep = 5 * magnitude;
                else niceStep = 10 * magnitude;

                const alignedMin =
                  Math.floor(minLevel / niceStep) * niceStep;
                const alignedMax =
                  Math.ceil(maxLevel / niceStep) * niceStep;
                const newMin = alignedMin - niceStep;
                const newMax = alignedMax + niceStep;

                onConfigChange({
                  ...config,
                  bottomMin: newMin,
                  bottomMax: newMax,
                  bottomStep: niceStep,
                });
              }}
              className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors"
            >
              [{t("recommended")}]
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-zinc-600">{t("minPrice")}</label>
              <input
                type="number"
                value={config.bottomMin || ""}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    bottomMin: Number(e.target.value) || 0,
                  })
                }
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  if (!val || val < 1)
                    onConfigChange({ ...config, bottomMin: 1 });
                }}
                className="w-full mt-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-600">{t("maxPrice")}</label>
              <input
                type="number"
                value={config.bottomMax || ""}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    bottomMax: Number(e.target.value) || 0,
                  })
                }
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  if (!val || val < 1)
                    onConfigChange({ ...config, bottomMax: 1 });
                }}
                className="w-full mt-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-600">{t("step")}</label>
              <input
                type="number"
                value={config.bottomStep || ""}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    bottomStep: Number(e.target.value) || 0,
                  })
                }
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  if (!val || val < 1)
                    onConfigChange({ ...config, bottomStep: 1 });
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
            warnings.push(tv("needLevel"));
          } else {
            const maxLevel = Math.max(...activeLevels);
            const minLevel = Math.min(...activeLevels);

            if (config.targetPrice <= maxLevel) {
              warnings.push(
                tv("targetTooLow", { target: formatUSD(config.targetPrice), level: formatUSD(maxLevel) })
              );
            }
            if (config.bottomMax < minLevel) {
              warnings.push(
                tv("bottomTooHigh", { bottom: formatUSD(config.bottomMax), level: formatUSD(minLevel) })
              );
            }
          }
          if (config.bottomMin >= config.bottomMax) {
            warnings.push(tv("minAboveMax"));
          }

          if (warnings.length === 0) return null;

          return (
            <div className="mt-4 p-3 bg-amber-900/20 border border-amber-700/50 rounded-lg">
              <div className="text-xs text-amber-400 font-medium mb-1">
                {t("warning")}
              </div>
              <ul className="text-xs text-amber-300/80 space-y-1">
                {warnings.map((w, i) => (
                  <li key={i}>• {w}</li>
                ))}
              </ul>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
