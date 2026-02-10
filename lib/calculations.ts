import type { Allocation, PositionMetrics } from "./types";

// When rebound price = X, all buy orders at prices >= X are "filled" (executed).
// Unfilled orders (price < X) remain pending — capital not deployed.
// Profit = (targetPrice - avgCost) * totalHolding
export function calculatePositionStats(
  allocations: Allocation[],
  reboundPrice: number,
  targetPrice: number,
  totalSize: number
): PositionMetrics {
  const filledLevels = allocations.filter((l) => l.price >= reboundPrice);

  if (filledLevels.length === 0) {
    return {
      filledPosition: 0,
      totalCost: 0,
      avgCost: 0,
      valueAtTarget: 0,
      profit: 0,
      roi: 0,
    };
  }

  // weight is a fraction (0-1), multiply by totalSize to get actual units
  const filledPosition =
    filledLevels.reduce((sum, l) => sum + l.weight, 0) * totalSize;
  const totalCost =
    filledLevels.reduce((sum, l) => sum + l.weight * l.price, 0) * totalSize;
  const avgCost = totalCost / filledPosition;
  const valueAtTarget = filledPosition * targetPrice;
  const profit = valueAtTarget - totalCost;
  const roi = (profit / totalCost) * 100;

  return { filledPosition, totalCost, avgCost, valueAtTarget, profit, roi };
}
