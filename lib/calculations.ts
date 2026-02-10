import type { Allocation, StrategyStats } from "./types";

// When rebound price = X, all buy orders at prices >= X are "filled" (executed).
// Unfilled orders (price < X) remain pending — capital not deployed.
// Profit = (targetPrice - avgCost) * totalHolding
export function calculateStats(
  levels: Allocation[],
  reboundPrice: number,
  targetPrice: number,
  totalSize: number
): StrategyStats {
  const filledLevels = levels.filter((l) => l.price >= reboundPrice);

  if (filledLevels.length === 0) {
    return {
      totalPosition: 0,
      totalCost: 0,
      avgCost: 0,
      valueAtTarget: 0,
      profit: 0,
      returnRate: 0,
    };
  }

  // weight is a fraction (0-1), multiply by totalSize to get actual units
  const totalPosition =
    filledLevels.reduce((sum, l) => sum + l.weight, 0) * totalSize;
  const totalCost =
    filledLevels.reduce((sum, l) => sum + l.weight * l.price, 0) * totalSize;
  const avgCost = totalCost / totalPosition;
  const valueAtTarget = totalPosition * targetPrice;
  const profit = valueAtTarget - totalCost;
  const returnRate = (profit / totalCost) * 100;

  return { totalPosition, totalCost, avgCost, valueAtTarget, profit, returnRate };
}
