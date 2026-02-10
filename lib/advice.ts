// Strategy advice algorithm — see docs/strategy-advice-algorithm.md for detailed explanation.

import type { ComparableStrategy, StrategyAdvice } from "./types";
import { calculateStats } from "./calculations";
import { formatUSD } from "./formatting";

export function analyzeStrategyAdvice(
  strategies: ComparableStrategy[],
  priceLevels: number[],
  targetPrice: number,
  totalSize: number,
  reboundMin: number,
  reboundMax: number,
  reboundStep: number
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
  const zeroZoneLabel = `> ${formatUSD(highestLevel)}`;

  interface LevelResult {
    price: number;
    winner: string;
    label: string;
  }
  const levelResults: LevelResult[] = [];

  for (let i = 0; i < activeLevels.length; i++) {
    const testPrice = activeLevels[i];
    const profits = strategies.map((s) => ({
      name: s.name,
      label: s.label,
      profit: calculateStats(s.levels, testPrice, targetPrice, totalSize)
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
      label: winner.label,
    });
  }

  // Merge consecutive levels with same winner into segments
  interface MergedSegment {
    highPrice: number;
    lowPrice: number;
    winner: string;
    label: string;
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
        label: lr.label,
      });
    }
  }

  const formatSegment = (seg: MergedSegment, idx: number): string => {
    const isLast = idx === mergedSegments.length - 1;
    const upper = `≤ ${formatUSD(seg.highPrice)}`;
    const lowIdx = activeLevels.indexOf(seg.lowPrice);
    if (isLast || lowIdx === activeLevels.length - 1) {
      return upper;
    }
    const lower = `> ${formatUSD(activeLevels[lowIdx + 1])}`;
    return `${upper} 且 ${lower}`;
  };

  // Find best strategy by coverage
  let bestStrategy = { name: "", label: "", count: 0 };
  winCounts.forEach((count, name) => {
    if (count > bestStrategy.count) {
      bestStrategy = {
        name,
        label: strategies.find((s) => s.name === name)?.label || name,
        count,
      };
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
        ? reboundMin
        : activeLevels[lowIdx + 1] + reboundStep;
      const clampedHigh = Math.min(seg.highPrice, reboundMax);
      const clampedLow = Math.max(lowerBound, reboundMin);
      bestCoverage += Math.max(
        0,
        (clampedHigh - clampedLow) / reboundStep + 1
      );
    }
    const totalSteps = (reboundMax - reboundMin) / reboundStep + 1;
    coveragePct = Math.round((bestCoverage / totalSteps) * 100);
  }

  return {
    zeroZoneLabel,
    segments: mergedSegments.map((s, i) => ({
      range: formatSegment(s, i),
      winner: s.winner,
      label: s.label,
    })),
    bestStrategy: bestStrategy.name ? bestStrategy : null,
    coveragePct,
  };
}
