import type { SimulatorConfig } from "./types";

export function adjustBottomPrice(
  currentPrice: number,
  { bottomMin, bottomMax, bottomStep }: Pick<
    SimulatorConfig,
    "bottomMin" | "bottomMax" | "bottomStep"
  >
): number {
  if (bottomMin >= bottomMax || bottomStep <= 0) return currentPrice;

  const price = currentPrice < bottomMin || currentPrice > bottomMax
    ? (bottomMin + bottomMax) / 2
    : currentPrice;
  const alignedPrice =
    Math.round((price - bottomMin) / bottomStep) * bottomStep + bottomMin;
  return Math.max(bottomMin, Math.min(bottomMax, alignedPrice));
}
