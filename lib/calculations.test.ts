import { describe, expect, test } from "bun:test";
import { calculatePositionStats } from "./calculations";
import type { Allocation } from "./types";

describe("calculatePositionStats", () => {
  const targetPrice = 100;
  const totalSize = 1000;

  test("normal case — partial fill", () => {
    // 3 levels, bottom price fills the 2 lower ones
    const allocations: Allocation[] = [
      { price: 90, weight: 0.2 },
      { price: 80, weight: 0.3 },
      { price: 70, weight: 0.5 },
    ];
    const bottomPrice = 75; // fills 90 and 80 (both >= 75)

    const result = calculatePositionStats(
      allocations,
      bottomPrice,
      targetPrice,
      totalSize
    );

    // filledPosition = (0.2 + 0.3) * 1000 = 500
    expect(result.filledPosition).toBe(500);
    // totalCost = (0.2*90 + 0.3*80) * 1000 = (18+24)*1000 = 42000
    expect(result.totalCost).toBe(42000);
    // avgCost = 42000 / 500 = 84
    expect(result.avgCost).toBe(84);
    // valueAtTarget = 500 * 100 = 50000
    expect(result.valueAtTarget).toBe(50000);
    // profit = 50000 - 42000 = 8000
    expect(result.profit).toBe(8000);
    // roi = (8000 / 42000) * 100 ≈ 19.047...
    expect(result.roi).toBeCloseTo(19.0476, 2);
  });

  test("all levels filled", () => {
    const allocations: Allocation[] = [
      { price: 90, weight: 0.4 },
      { price: 80, weight: 0.3 },
      { price: 70, weight: 0.3 },
    ];
    const bottomPrice = 60; // below all levels

    const result = calculatePositionStats(
      allocations,
      bottomPrice,
      targetPrice,
      totalSize
    );

    expect(result.filledPosition).toBe(1000);
    // totalCost = (0.4*90 + 0.3*80 + 0.3*70) * 1000 = (36+24+21)*1000 = 81000
    expect(result.totalCost).toBe(81000);
    expect(result.avgCost).toBe(81);
  });

  test("none filled — returns zero metrics", () => {
    const allocations: Allocation[] = [
      { price: 50, weight: 0.5 },
      { price: 40, weight: 0.5 },
    ];
    const bottomPrice = 60; // above all levels

    const result = calculatePositionStats(
      allocations,
      bottomPrice,
      targetPrice,
      totalSize
    );

    expect(result.filledPosition).toBe(0);
    expect(result.totalCost).toBe(0);
    expect(result.avgCost).toBe(0);
    expect(result.profit).toBe(0);
    expect(result.roi).toBe(0);
  });

  test("exact price match — level IS filled (>= boundary)", () => {
    const allocations: Allocation[] = [
      { price: 80, weight: 0.6 },
      { price: 70, weight: 0.4 },
    ];
    const bottomPrice = 80; // exactly matches top level

    const result = calculatePositionStats(
      allocations,
      bottomPrice,
      targetPrice,
      totalSize
    );

    // Only the 80 level is filled (80 >= 80), 70 is not (70 < 80)
    expect(result.filledPosition).toBe(600);
    expect(result.totalCost).toBe(48000); // 0.6 * 80 * 1000
    expect(result.avgCost).toBe(80);
  });

  test("single level", () => {
    const allocations: Allocation[] = [{ price: 50, weight: 1.0 }];
    const bottomPrice = 40;

    const result = calculatePositionStats(
      allocations,
      bottomPrice,
      targetPrice,
      totalSize
    );

    expect(result.filledPosition).toBe(1000);
    expect(result.totalCost).toBe(50000);
    expect(result.avgCost).toBe(50);
    expect(result.profit).toBe(50000); // (100-50)*1000
    expect(result.roi).toBe(100); // 50000/50000 * 100
  });
});
