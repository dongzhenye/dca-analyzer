"use client";

import { useState } from "react";
import { useSimulator } from "@/hooks/use-simulator";
import { ConfigPanel } from "@/components/config-panel";
import { StrategySelector } from "@/components/strategy-selector";
import { ReboundSlider } from "@/components/rebound-slider";
import { AreaChart } from "@/components/area-chart";
import { CurveChart } from "@/components/curve-chart";
import { AdvicePanel } from "@/components/advice-panel";

export default function Home() {
  const sim = useSimulator();
  const [showConfig, setShowConfig] = useState(false);
  const [chartView, setChartView] = useState<"area" | "curve">("area");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <svg className="w-7 h-7" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="6" fill="#18181b" />
              <rect x="6" y="6" width="4" height="20" rx="1" fill="#22c55e" />
              <rect x="14" y="12" width="4" height="14" rx="1" fill="#22c55e" />
              <rect x="22" y="18" width="4" height="8" rx="1" fill="#22c55e" />
            </svg>
            <h1 className="text-xl font-bold">仓位模拟器</h1>
            <span className="text-zinc-600">|</span>
            <p className="text-zinc-500 text-sm">对比不同建仓策略的收益表现</p>
          </div>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-sm ${
              showConfig
                ? "bg-zinc-700 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {showConfig ? (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                  />
                </svg>
                收起
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                设置
              </>
            )}
          </button>
        </div>

        {/* Config */}
        {showConfig && (
          <ConfigPanel
            config={sim.config}
            onConfigChange={sim.setConfig}
            onResetCustomAllocations={sim.resetCustomAllocations}
            onResetToDefault={sim.resetToDefault}
          />
        )}

        {/* Strategy */}
        <StrategySelector
          activeStrategy={sim.activeStrategy}
          activeAllocations={sim.activeAllocations}
          reboundPrice={sim.reboundPrice}
          isCustomActive={sim.isCustomActive}
          activeWeightSum={sim.activeWeightSum}
          onSelectPreset={sim.selectPreset}
          onSelectCustom={sim.selectCustom}
          onUpdateCustomWeight={sim.updateCustomWeight}
          onResetCustomAllocations={sim.resetCustomAllocations}
          config={sim.config}
        />

        {/* Rebound */}
        <ReboundSlider
          config={sim.config}
          reboundPrice={sim.reboundPrice}
          onReboundChange={sim.setReboundPrice}
        />

        {/* Charts */}
        <div className="bg-zinc-900 rounded-xl p-5 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-medium text-zinc-300">收益对比</h2>
            <div className="flex gap-1">
              <button
                className={`px-3 py-1 text-xs rounded ${chartView === "area" ? "bg-zinc-700 text-white" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300 transition-colors"}`}
                onClick={() => setChartView("area")}
              >
                面积对比
              </button>
              <button
                className={`px-3 py-1 text-xs rounded ${chartView === "curve" ? "bg-zinc-700 text-white" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300 transition-colors"}`}
                onClick={() => setChartView("curve")}
              >
                收益曲线
              </button>
            </div>
          </div>

          {chartView === "area" ? (
            <AreaChart
              config={sim.config}
              presetStats={sim.presetStats}
              customAllocations={sim.customAllocations}
              activeStrategy={sim.activeStrategy}
              reboundPrice={sim.reboundPrice}
              isCustomWeightValid={sim.isCustomWeightValid}
              profitRankings={sim.profitRankings}
              onSelectPreset={sim.selectPreset}
              onSelectCustom={sim.selectCustom}
            />
          ) : (
            <CurveChart
              config={sim.config}
              profitCurves={sim.profitCurves}
              activeStrategy={sim.activeStrategy}
              reboundPrice={sim.reboundPrice}
              isCustomWeightValid={sim.isCustomWeightValid}
              profitRankings={sim.profitRankings}
              onReboundChange={sim.setReboundPrice}
              onSelectPreset={sim.selectPreset}
              onSelectCustom={sim.selectCustom}
            />
          )}
        </div>

        {/* Advice */}
        {sim.strategyAdvice && <AdvicePanel advice={sim.strategyAdvice} />}

        {/* Footer */}
        <div className="text-center text-zinc-600 text-xs mt-8">
          © 2026 Zhenye Dong
        </div>
      </div>
    </div>
  );
}
