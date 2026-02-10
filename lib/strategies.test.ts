import { describe, expect, test } from "bun:test";
import {
  generatePresetWeights,
  generateExponentialWeights,
} from "./strategies";

function sumWeights(weights: number[]): number {
  return weights.reduce((a, b) => a + b, 0);
}

describe("generatePresetWeights", () => {
  test.each([1, 3, 5, 7])("all strategies sum to 1 (levels=%d)", (count) => {
    const { pyramid, uniform, inverted } = generatePresetWeights(count);
    expect(sumWeights(pyramid)).toBeCloseTo(1, 10);
    expect(sumWeights(uniform)).toBeCloseTo(1, 10);
    expect(sumWeights(inverted)).toBeCloseTo(1, 10);
  });

  test("pyramid weights are ascending", () => {
    const { pyramid } = generatePresetWeights(5);
    for (let i = 1; i < pyramid.length; i++) {
      expect(pyramid[i]).toBeGreaterThan(pyramid[i - 1]);
    }
  });

  test("inverted weights are descending", () => {
    const { inverted } = generatePresetWeights(5);
    for (let i = 1; i < inverted.length; i++) {
      expect(inverted[i]).toBeLessThan(inverted[i - 1]);
    }
  });

  test("inverted is exact reverse of pyramid", () => {
    const { pyramid, inverted } = generatePresetWeights(4);
    expect(inverted).toEqual([...pyramid].reverse());
  });

  test("uniform weights are equal", () => {
    const { uniform } = generatePresetWeights(4);
    for (const w of uniform) {
      expect(w).toBeCloseTo(0.25, 10);
    }
  });

  test("single level — all strategies give [1]", () => {
    const { pyramid, uniform, inverted } = generatePresetWeights(1);
    expect(pyramid).toEqual([1]);
    expect(uniform).toEqual([1]);
    expect(inverted).toEqual([1]);
  });
});

describe("generateExponentialWeights", () => {
  test("weights sum to 1", () => {
    const weights = generateExponentialWeights(7);
    expect(sumWeights(weights)).toBeCloseTo(1, 10);
  });

  test("first weight > last weight (descending trend)", () => {
    const weights = generateExponentialWeights(5);
    expect(weights[0]).toBeGreaterThan(weights[weights.length - 1]);
  });

  test("strictly descending", () => {
    const weights = generateExponentialWeights(5);
    for (let i = 1; i < weights.length; i++) {
      expect(weights[i]).toBeLessThan(weights[i - 1]);
    }
  });

  test("single level returns [1]", () => {
    const weights = generateExponentialWeights(1);
    expect(weights).toEqual([1]);
  });
});
