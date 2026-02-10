import { useTranslations } from "next-intl";
import type { StrategyAdvice } from "@/lib/types";
import { formatUSD } from "@/lib/formatting";

interface AdvicePanelProps {
  advice: StrategyAdvice;
}

export function AdvicePanel({ advice }: AdvicePanelProps) {
  const t = useTranslations("advice");
  const ts = useTranslations("strategy");

  const strategyName = (name: string) =>
    name === "custom" ? ts("custom.name") : ts(`${name}.name`);

  return (
    <div className="bg-zinc-900 rounded-xl p-5 mb-6">
      <h2 className="text-base font-medium text-zinc-300 mb-4">{t("title")}</h2>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: conclusion */}
        {advice.bestStrategy && (
          <div className="py-4 px-5 bg-zinc-800/50 rounded-lg border border-zinc-700/50 text-center">
            <div className="text-xs text-zinc-500 mb-1">{t("recommended")}</div>
            <div className="text-2xl font-bold text-emerald-400">
              {strategyName(advice.bestStrategy.name)}
            </div>
            <div className="text-xs text-zinc-500 mt-2">
              {t("coverage", { pct: advice.coveragePct })}
            </div>
          </div>
        )}

        {/* Right: segment breakdown */}
        <div className="space-y-2 text-sm text-zinc-400">
          {advice.zeroZonePrice > 0 && (
            <p>
              {t("noProfit", { range: `> ${formatUSD(advice.zeroZonePrice)}` })}
            </p>
          )}
          {advice.segments.map((seg, i) => {
            const rangeStr = seg.isLast
              ? `≤ ${formatUSD(seg.rangeHigh)}`
              : `≤ ${formatUSD(seg.rangeHigh)} & > ${formatUSD(seg.rangeLow)}`;
            return (
              <p key={i}>
                {t("bestIn", {
                  range: rangeStr,
                  strategy: strategyName(seg.winner),
                })}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
