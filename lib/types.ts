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
  label: string;
  allocations: Allocation[];
}

export interface ProfitCurvePoint {
  x: number;
  y: number;
}

export interface ProfitCurve {
  name: string;
  label: string;
  points: ProfitCurvePoint[];
}

export interface AdviceSegment {
  range: string;
  winner: string;
  label: string;
}

export interface StrategyAdvice {
  zeroZoneLabel: string;
  segments: AdviceSegment[];
  bestStrategy: { name: string; label: string; count: number } | null;
  coveragePct: number;
}
