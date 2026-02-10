// Strategy advice algorithm — see docs/strategy-advice-algorithm.md for detailed explanation.

import type { ComparableStrategy, StrategyAdvice } from "./types";
import { calculatePositionStats } from "./calculations";

export function analyzeStrategyAdvice(
  strategies: ComparableStrategy[],
  priceLevels: number[],
  targetPrice: number,
  totalSize: number,
  bottomMin: number,
  bottomMax: number,
  bottomStep: number
): StrategyAdvice | null {
  if (strategies.length === 0) return null;

  // Use price levels as natural boundaries.
  // Between two adjacent price levels, the set of filled positions is constant,
  // so strategy rankings only change at price level boundaries.
  const activeLevels = [...priceLevels.filter((p) => p > 0)].sort(
    (a, b) => b - a
  );

  if (activeLevels.length === 0) return null;

  const winCounts = new Map<string, number>();
  const highestLevel = activeLevels[0];

  // Zone above highest level: no positions filled, no profit
  const zeroZonePrice = highestLevel;

  interface LevelResult {
    price: number;
    winner: string;
  }
  const levelResults: LevelResult[] = [];

  for (let i = 0; i < activeLevels.length; i++) {
    const testPrice = activeLevels[i];
    const profits = strategies.map((s) => ({
      name: s.name,
      profit: calculatePositionStats(s.allocations, testPrice, targetPrice, totalSize)
        .profit,
    }));

    const maxProfit = Math.max(...profits.map((p) => p.profit));
    if (maxProfit <= 0) continue;

    // Prefer custom on tie (user hand-tuned > preset)
    const winners = profits.filter((p) => p.profit === maxProfit);
    const winner = winners.find((w) => w.name === "custom") ?? winners[0];
    if (!winner) continue;

    winCounts.set(winner.name, (winCounts.get(winner.name) || 0) + 1);
    levelResults.push({
      price: testPrice,
      winner: winner.name,
    });
  }

  // Merge consecutive levels with same winner into segments
  interface MergedSegment {
    highPrice: number;
    lowPrice: number;
    winner: string;
  }
  const mergedSegments: MergedSegment[] = [];

  for (const lr of levelResults) {
    const last = mergedSegments[mergedSegments.length - 1];
    if (last && last.winner === lr.winner) {
      last.lowPrice = lr.price;
    } else {
      mergedSegments.push({
        highPrice: lr.price,
        lowPrice: lr.price,
        winner: lr.winner,
      });
    }
  }

  // Find best strategy by coverage
  let bestStrategy = { name: "", count: 0 };
  winCounts.forEach((count, name) => {
    if (count > bestStrategy.count) {
      bestStrategy = { name, count };
    }
  });

  // Calculate coverage percentage
  let coveragePct = 0;
  if (bestStrategy.name) {
    let bestCoverage = 0;
    for (const seg of mergedSegments) {
      if (seg.winner !== bestStrategy.name) continue;
      const lowIdx = activeLevels.indexOf(seg.lowPrice);
      const isLastLevel = lowIdx === activeLevels.length - 1;
      const lowerBound = isLastLevel
        ? bottomMin
        : activeLevels[lowIdx + 1] + bottomStep;
      const clampedHigh = Math.min(seg.highPrice, bottomMax);
      const clampedLow = Math.max(lowerBound, bottomMin);
      bestCoverage += Math.max(
        0,
        (clampedHigh - clampedLow) / bottomStep + 1
      );
    }
    const totalSteps = (bottomMax - bottomMin) / bottomStep + 1;
    coveragePct = Math.round((bestCoverage / totalSteps) * 100);
  }

  return {
    zeroZonePrice,
    segments: mergedSegments.map((s, i) => ({
      rangeHigh: s.highPrice,
      rangeLow: s.lowPrice,
      isLast: i === mergedSegments.length - 1,
      winner: s.winner,
    })),
    bestStrategy: bestStrategy.name ? bestStrategy : null,
    coveragePct,
  };
}
