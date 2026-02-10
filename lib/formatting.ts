export const formatUSD = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

// Sort price levels: non-zero descending, zeros at end
export const sortPriceLevels = (levels: number[]) => {
  const nonZero = levels.filter((p) => p > 0).sort((a, b) => b - a);
  const zeros = levels.filter((p) => p === 0);
  return [...nonZero, ...zeros];
};
