import type { StrategyAdvice } from "@/lib/types";

interface InsightPanelProps {
  advice: StrategyAdvice;
}

export function InsightPanel({ advice }: InsightPanelProps) {
  return (
    <div className="bg-zinc-900 rounded-xl p-5 mb-6">
      <h2 className="text-base font-medium text-zinc-300 mb-4">策略建议</h2>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: conclusion */}
        {advice.bestStrategy && (
          <div className="py-4 px-5 bg-zinc-800/50 rounded-lg border border-zinc-700/50 text-center">
            <div className="text-xs text-zinc-500 mb-1">推荐策略</div>
            <div className="text-2xl font-bold text-emerald-400">
              {advice.bestStrategy.label}
            </div>
            <div className="text-xs text-zinc-500 mt-2">
              覆盖 {advice.coveragePct}% 价格区间
            </div>
          </div>
        )}

        {/* Right: segment breakdown */}
        <div className="space-y-2 text-sm text-zinc-400">
          {advice.zeroZoneLabel && (
            <p>
              当反弹价格{" "}
              <span className="text-zinc-300 font-mono">
                {advice.zeroZoneLabel}
              </span>{" "}
              时，所有方案都无收益
            </p>
          )}
          {advice.segments.map((seg, i) => (
            <p key={i}>
              当反弹价格在{" "}
              <span className="text-zinc-300 font-mono">{seg.range}</span> 时，
              <span className="text-emerald-400 font-medium">{seg.label}</span>{" "}
              收益最高
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
