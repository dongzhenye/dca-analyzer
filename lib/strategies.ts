import type { PresetStrategy } from "./types";

// Generate preset strategy allocations for a given number of levels.
// Each returns an array of weights that sum to 1.
export function generatePresetWeights(levelCount: number) {
  // Pyramid: weights increase linearly (1, 2, 3, ...)
  const pyramidWeights = Array.from({ length: levelCount }, (_, i) => i + 1);
  const pyramidSum = pyramidWeights.reduce((a, b) => a + b, 0);
  const pyramid = pyramidWeights.map((w) => w / pyramidSum);

  // Inverted: reverse of pyramid
  const inverted = [...pyramid].reverse();

  // Uniform: equal allocation
  const uniformBase = 1 / levelCount;
  const uniform = Array(levelCount).fill(uniformBase) as number[];
  // Adjust last one to ensure sum = 1
  uniform[levelCount - 1] = 1 - uniformBase * (levelCount - 1);

  return { pyramid, uniform, inverted };
}

// Exponential weighting: first level (highest price) gets highest weight.
// Produces a steep falloff (e.g. 35%, 20%, 11%, 6%, 3%, 2%, 1% for 7 levels).
const EXPONENTIAL_BASE = 1.8;

export function generateExponentialWeights(levelCount: number): number[] {
  const weights = Array.from({ length: levelCount }, (_, i) =>
    Math.pow(EXPONENTIAL_BASE, levelCount - 1 - i)
  );
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => w / sum);
}

export const STRATEGY_ORDER: PresetStrategy[] = [
  "pyramid",
  "uniform",
  "inverted",
];
