import type { SimulatorConfig } from "./types";

export const CONSTANTS = {
  HISTOGRAM_SCALE_MAX: 0.25,
  MAX_LEVEL_WEIGHT: 0.4,
  ALLOCATION_TOLERANCE: 0.01,
  GRID_SIZE: 40,
  CHART_WIDTH: 600,
  CHART_HEIGHT: 280,
} as const;

export const DEFAULT_CONFIG: SimulatorConfig = {
  assetName: "BTC",
  assetUnit: "BTC",
  targetPrice: 126277,
  targetDate: "2025-10-06",
  priceLevels: [70000, 65000, 60000, 55000, 50000, 45000, 40000],
  totalSize: 1.0,
  reboundMin: 35000,
  reboundMax: 75000,
  reboundStep: 1000,
};
