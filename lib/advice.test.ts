import { describe, expect, test } from "bun:test";
import { analyzeStrategyAdvice } from "./advice";
import type { ComparableStrategy } from "./types";

describe("analyzeStrategyAdvice", () => {
  const targetPrice = 100;
  const totalSize = 1000;
  const bottomMin = 50;
  const bottomMax = 90;
  const bottomStep = 1;

  test("empty strategies — returns null", () => {
    const result = analyzeStrategyAdvice(
      [],
      [90, 80, 70],
      targetPrice,
      totalSize,
      bottomMin,
      bottomMax,
      bottomStep
    );
    expect(result).toBeNull();
  });

  test("empty price levels — returns null", () => {
    const strategies: ComparableStrategy[] = [
      {
        name: "pyramid",
        allocations: [{ price: 90, weight: 1 }],
      },
    ];
    const result = analyzeStrategyAdvice(
      strategies,
      [],
      targetPrice,
      totalSize,
      bottomMin,
      bottomMax,
      bottomStep
    );
    expect(result).toBeNull();
  });

  test("zero price levels filtered out", () => {
    const strategies: ComparableStrategy[] = [
      {
        name: "pyramid",
        allocations: [{ price: 90, weight: 1 }],
      },
    ];
    const result = analyzeStrategyAdvice(
      strategies,
      [0, 0, 0],
      targetPrice,
      totalSize,
      bottomMin,
      bottomMax,
      bottomStep
    );
    expect(result).toBeNull();
  });

  test("single strategy — always wins with 100% coverage", () => {
    const strategies: ComparableStrategy[] = [
      {
        name: "uniform",
        allocations: [
          { price: 90, weight: 0.5 },
          { price: 70, weight: 0.5 },
        ],
      },
    ];
    const result = analyzeStrategyAdvice(
      strategies,
      [90, 70],
      targetPrice,
      totalSize,
      bottomMin,
      bottomMax,
      bottomStep
    );

    expect(result).not.toBeNull();
    expect(result!.bestStrategy!.name).toBe("uniform");
    expect(result!.coveragePct).toBe(100);
    // All segments should have uniform as winner
    for (const seg of result!.segments) {
      expect(seg.winner).toBe("uniform");
    }
  });

  test("zeroZonePrice equals highest price level", () => {
    const strategies: ComparableStrategy[] = [
      {
        name: "test",
        allocations: [
          { price: 95, weight: 0.3 },
          { price: 85, weight: 0.7 },
        ],
      },
    ];
    const result = analyzeStrategyAdvice(
      strategies,
      [95, 85],
      targetPrice,
      totalSize,
      bottomMin,
      bottomMax,
      bottomStep
    );

    expect(result).not.toBeNull();
    expect(result!.zeroZonePrice).toBe(95);
  });

  test("two strategies — different winners at different levels", () => {
    // Strategy A: heavy weight on high price → wins when only top level filled
    // Strategy B: heavy weight on low price → wins when both filled (lower avg cost)
    const strategies: ComparableStrategy[] = [
      {
        name: "stratA",
        allocations: [
          { price: 90, weight: 0.9 },
          { price: 70, weight: 0.1 },
        ],
      },
      {
        name: "stratB",
        allocations: [
          { price: 90, weight: 0.1 },
          { price: 70, weight: 0.9 },
        ],
      },
    ];
    const result = analyzeStrategyAdvice(
      strategies,
      [90, 70],
      targetPrice,
      totalSize,
      bottomMin,
      bottomMax,
      bottomStep
    );

    expect(result).not.toBeNull();
    // At bottom=90, only 90 fills. stratA has 0.9 weight there → higher profit.
    // At bottom=70, both fill. stratB has 0.9 at 70 (cheaper) → higher profit.
    expect(result!.segments.length).toBe(2);
    expect(result!.segments[0].winner).toBe("stratA");
    expect(result!.segments[1].winner).toBe("stratB");
  });

  test("custom strategy wins on tie", () => {
    // Both strategies have identical allocations → same profit → tie
    // "custom" should win per line 51 logic
    const strategies: ComparableStrategy[] = [
      {
        name: "pyramid",
        allocations: [{ price: 80, weight: 1.0 }],
      },
      {
        name: "custom",
        allocations: [{ price: 80, weight: 1.0 }],
      },
    ];
    const result = analyzeStrategyAdvice(
      strategies,
      [80],
      targetPrice,
      totalSize,
      bottomMin,
      bottomMax,
      bottomStep
    );

    expect(result).not.toBeNull();
    expect(result!.bestStrategy!.name).toBe("custom");
  });

  test("segment merging — consecutive same winner merges", () => {
    // Single strategy across 3 levels → should merge into 1 segment
    const strategies: ComparableStrategy[] = [
      {
        name: "uniform",
        allocations: [
          { price: 90, weight: 1 / 3 },
          { price: 80, weight: 1 / 3 },
          { price: 70, weight: 1 / 3 },
        ],
      },
    ];
    const result = analyzeStrategyAdvice(
      strategies,
      [90, 80, 70],
      targetPrice,
      totalSize,
      bottomMin,
      bottomMax,
      bottomStep
    );

    expect(result).not.toBeNull();
    // All 3 levels won by same strategy → merged into 1 segment
    expect(result!.segments.length).toBe(1);
    expect(result!.segments[0].rangeHigh).toBe(90);
    expect(result!.segments[0].rangeLow).toBe(70);
    expect(result!.segments[0].isLast).toBe(true);
  });
});
