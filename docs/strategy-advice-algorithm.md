# Strategy Advice Algorithm

## Problem

Given N strategies (each defining allocations across M price levels) and a target sell price,
determine which strategy yields the highest profit at each possible rebound price.

## Core Insight

Strategy rankings only change at price level boundaries.

Between two adjacent price levels, the set of filled buy orders is constant — no new orders
get filled until the rebound price drops to the next lower level. Therefore, we only need to
evaluate M test points (one per price level), not the entire continuous rebound range.

## Algorithm

### Step 1: Collect test points

Sort active price levels descending: `[70k, 65k, 60k, 55k, 50k, 45k, 40k]`.

### Step 2: Evaluate each test point

For each price level P (high to low):
1. Calculate profit for every comparable strategy at rebound price = P
2. Find the strategy with maximum profit
3. On tie, prefer `custom` (user hand-tuned > preset)

### Step 3: Merge consecutive segments

Adjacent price levels won by the same strategy are merged into segments:

```
Before: 70k→pyramid, 65k→pyramid, 60k→uniform, 55k→uniform, 50k→pyramid, 45k→pyramid, 40k→pyramid
After:  [70k-65k]→pyramid, [60k-55k]→uniform, [50k-40k]→pyramid
```

### Step 4: Format boundary notation

Each segment covers a rebound price range:

- **Upper bound**: `<= highPrice` (inclusive — at this price, this level IS filled)
- **Lower bound**: `> nextLowerLevel` (exclusive — at that level, a new order fills, changing the ranking)
- **Last segment**: No lower bound (covers all prices below)

Example output:
- `<= $70,000 且 > $60,000` — pyramid wins
- `<= $60,000` — uniform wins

## Coverage Calculation

"覆盖 X% 价格区间" measures what fraction of the total simulation range
(`reboundMin` to `reboundMax`) the best strategy covers.

For each segment owned by the best strategy:
1. Compute the effective price range within simulation bounds
2. Count discrete steps: `(clampedHigh - clampedLow) / reboundStep + 1`
3. Divide by total steps in the range

## Design Decisions

- **Custom wins ties**: A user who hand-tuned allocations likely wants to see their strategy
  preferred when it performs equally to a preset.
- **Zero zone**: Rebound prices above the highest level produce zero profit for all strategies
  (no buy orders filled). This is reported separately rather than attributed to any strategy.
