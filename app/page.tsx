"use client";

import { useState, useMemo } from "react";

const ATH = 126277;

interface PriceLevel {
  price: number;
  position: number;
}

const DEFAULT_LEVELS: PriceLevel[] = [
  { price: 70000, position: 0.1 },
  { price: 65000, position: 0.12 },
  { price: 60000, position: 0.13 },
  { price: 55000, position: 0.15 },
  { price: 50000, position: 0.15 },
  { price: 45000, position: 0.15 },
  { price: 40000, position: 0.2 },
];

export default function Home() {
  const [levels, setLevels] = useState<PriceLevel[]>(DEFAULT_LEVELS);
  const [reboundPrice, setReboundPrice] = useState(55000);

  const filledLevels = useMemo(() => {
    return levels.filter((l) => l.price >= reboundPrice);
  }, [levels, reboundPrice]);

  const stats = useMemo(() => {
    if (filledLevels.length === 0) {
      return { totalPosition: 0, totalCost: 0, avgCost: 0, valueAtATH: 0, profit: 0, returnRate: 0 };
    }

    const totalPosition = filledLevels.reduce((sum, l) => sum + l.position, 0);
    const totalCost = filledLevels.reduce((sum, l) => sum + l.position * l.price, 0);
    const avgCost = totalCost / totalPosition;
    const valueAtATH = totalPosition * ATH;
    const profit = valueAtATH - totalCost;
    const returnRate = (profit / totalCost) * 100;

    return { totalPosition, totalCost, avgCost, valueAtATH, profit, returnRate };
  }, [filledLevels]);

  const updatePosition = (index: number, newPosition: number) => {
    const updated = [...levels];
    updated[index] = { ...updated[index], position: newPosition };
    setLevels(updated);
  };

  const totalAllocation = levels.reduce((sum, l) => sum + l.position, 0);

  const formatUSD = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  const formatBTC = (n: number) => `${n.toFixed(2)} BTC`;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">BTC 仓位模拟器</h1>
        <p className="text-zinc-400 mb-8">
          拖动滑块调整反弹价格，查看不同情景下的仓位和收益
        </p>

        {/* Rebound Price Slider */}
        <div className="bg-zinc-900 rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-zinc-400">反弹价格</span>
            <span className="text-2xl font-bold text-emerald-400">
              {formatUSD(reboundPrice)}
            </span>
          </div>
          <input
            type="range"
            min={35000}
            max={75000}
            step={1000}
            value={reboundPrice}
            onChange={(e) => setReboundPrice(Number(e.target.value))}
            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-xs text-zinc-500 mt-2">
            <span>$35,000</span>
            <span>$75,000</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-zinc-900 rounded-xl p-4">
            <div className="text-zinc-400 text-sm mb-1">建仓量</div>
            <div className="text-xl font-bold">{formatBTC(stats.totalPosition)}</div>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4">
            <div className="text-zinc-400 text-sm mb-1">平均成本</div>
            <div className="text-xl font-bold">{formatUSD(stats.avgCost)}</div>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4">
            <div className="text-zinc-400 text-sm mb-1">投入资金</div>
            <div className="text-xl font-bold">{formatUSD(stats.totalCost)}</div>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4">
            <div className="text-zinc-400 text-sm mb-1">收益率 @ATH</div>
            <div className="text-xl font-bold text-emerald-400">
              +{stats.returnRate.toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Profit Card */}
        <div className="bg-gradient-to-r from-emerald-900/50 to-zinc-900 rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-zinc-400 text-sm mb-1">若涨回 ATH ({formatUSD(ATH)})</div>
              <div className="text-3xl font-bold text-emerald-400">
                +{formatUSD(stats.profit)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-zinc-400 text-sm mb-1">终值</div>
              <div className="text-xl font-bold">{formatUSD(stats.valueAtATH)}</div>
            </div>
          </div>
        </div>

        {/* Price Levels Table */}
        <div className="bg-zinc-900 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">价格档位</h2>
            <span className={`text-sm ${Math.abs(totalAllocation - 1) < 0.001 ? 'text-emerald-400' : 'text-amber-400'}`}>
              总仓位: {(totalAllocation * 100).toFixed(0)}%
            </span>
          </div>

          <div className="space-y-3">
            {levels.map((level, index) => {
              const isFilled = level.price >= reboundPrice;
              const cumulative = levels
                .slice(0, index + 1)
                .filter((l) => l.price >= reboundPrice)
                .reduce((sum, l) => sum + l.position, 0);

              return (
                <div
                  key={level.price}
                  className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                    isFilled ? "bg-emerald-900/30 border border-emerald-800/50" : "bg-zinc-800/50"
                  }`}
                >
                  <div className="w-24 font-mono text-sm">
                    {formatUSD(level.price)}
                  </div>
                  <div className="flex-1">
                    <input
                      type="range"
                      min={0}
                      max={0.4}
                      step={0.01}
                      value={level.position}
                      onChange={(e) => updatePosition(index, Number(e.target.value))}
                      className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                  <div className="w-16 text-right font-mono text-sm">
                    {(level.position * 100).toFixed(0)}%
                  </div>
                  <div className="w-20 text-right text-sm text-zinc-400">
                    {level.position.toFixed(2)} BTC
                  </div>
                  {isFilled && (
                    <div className="w-20 text-right text-sm text-emerald-400">
                      累计 {cumulative.toFixed(2)}
                    </div>
                  )}
                  {!isFilled && (
                    <div className="w-20 text-right text-sm text-zinc-600">
                      未成交
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-zinc-600 text-sm mt-8">
          ATH: {formatUSD(ATH)} (2025-10-06) · 数据仅供参考
        </div>
      </div>
    </div>
  );
}
