// Types for the dca analyzer

export interface SimulatorConfig {
  assetName: string;
  assetUnit: string;
  targetPrice: number;
  targetDate: string;
  priceLevels: number[];
  totalSize: number;
  bottomMin: number;
  bottomMax: number;
  bottomStep: number;
}

export interface Allocation {
  price: number;
  weight: number;
}

export interface PositionMetrics {
  filledPosition: number;
  totalCost: number;
  avgCost: number;
  valueAtTarget: number;
  profit: number;
  roi: number;
}

export type PresetStrategy = "pyramid" | "uniform" | "inverted";

export type ActiveStrategy = PresetStrategy | "custom";

export interface ComparableStrategy {
  name: string;
  allocations: Allocation[];
}

export interface ProfitCurvePoint {
  x: number;
  y: number;
}

export interface ProfitCurve {
  name: string;
  points: ProfitCurvePoint[];
}

export interface AdviceSegment {
  rangeHigh: number;
  rangeLow: number;
  isLast: boolean;
  winner: string;
}

export interface StrategyAdvice {
  zeroZonePrice: number;
  segments: AdviceSegment[];
  bestStrategy: { name: string; count: number } | null;
  coveragePct: number;
}
