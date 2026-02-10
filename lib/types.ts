// Types for the dca analyzer

export interface SimulatorConfig {
  assetName: string;
  assetUnit: string;
  targetPrice: number;
  targetDate: string;
  priceLevels: number[];
  totalSize: number;
  reboundMin: number;
  reboundMax: number;
  reboundStep: number;
}

export interface Allocation {
  price: number;
  weight: number;
}

export interface StrategyStats {
  totalPosition: number;
  totalCost: number;
  avgCost: number;
  valueAtTarget: number;
  profit: number;
  returnRate: number;
}

export type PresetStrategy = "pyramid" | "uniform" | "inverted";

export type ActiveStrategy = PresetStrategy | "custom";

export interface ComparableStrategy {
  name: string;
  label: string;
  levels: Allocation[];
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
