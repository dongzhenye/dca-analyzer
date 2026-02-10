# Architecture

This document describes the module structure, design decisions, and naming conventions established during the refactoring from a single 1569-line `page.tsx` into modular files.

## Module Map

```
lib/
  types.ts          — shared TypeScript interfaces and type aliases
  constants.ts      — magic numbers, default config, chart dimensions
  formatting.ts     — display formatting (USD, price sorting)
  strategies.ts     — preset strategy weight generation, labels
  calculations.ts   — core math: filled levels → stats (cost, profit, return)
  advice.ts         — strategy comparison across bottom price range → recommendation

hooks/
  use-simulator.ts  — all state + derived data, single hook consumed by page

components/
  config-panel.tsx      — collapsible settings: price levels, bottom price range, reset
  strategy-selector.tsx — preset buttons + custom sliders + weight total
  bottom-slider.tsx     — draggable bottom price selector
  area-chart.tsx        — SVG bar chart comparing strategies at current bottom price
  curve-chart.tsx       — SVG line chart showing profit across bottom price range
  chart-legend.tsx      — shared legend with rankings, click-to-switch (used by both charts)
  advice-panel.tsx      — strategy recommendation display with segment breakdown

app/
  page.tsx          — composition layer (~170 lines), wires hook to components
```

## Key Design Decisions

### Custom Hook vs Zustand
All state lives in `useSimulator()`. The app has a single page with a single state tree — Zustand would add a dependency for no benefit. The hook pattern keeps state colocated with its derivations (`useMemo`) and effects (`useEffect`).

### Flat Props vs Object Props
Components receive flat props rather than a single `sim` object. This makes each component's dependencies explicit in its interface, enables React's memoization to work correctly, and keeps components testable in isolation.

### Calculation Architecture
`calculations.ts` is a pure function: `(allocations, bottomPrice, targetPrice, totalSize) → PositionMetrics`. No side effects, no state. This is the core "engine" — everything else (advice, curves, rankings) calls it.

### Advice Decoupled from Curves
`analyzeStrategyAdvice()` computes its own data by testing at price-level boundaries rather than depending on `profitCurves`. This avoids a false dependency chain and lets advice update independently.

### Chart Legend as Shared Component
Both `AreaChart` and `CurveChart` display the same legend with rankings and click-to-switch behavior. Extracted once into `ChartLegend` to eliminate duplication.

## Naming Conventions

Renamed during refactoring for clarity and consistency:

| Old Name | New Name | Rationale |
|----------|----------|-----------|
| `Config` | `SimulatorConfig` | Avoid collision with generic `Config` |
| `ath` / `athDate` | `targetPrice` / `targetDate` | Domain-neutral — not always ATH |
| `maxPosition` | `totalSize` | "Position" overloaded; "size" is clearer |
| `PriceLevel` | `Allocation` | Describes what it is: a weight at a price |
| `PriceLevel.position` | `Allocation.weight` | Normalized 0–1 weight, not absolute position |
| `Stats` → `StrategyStats` | `PositionMetrics` | What's measured: position metrics at a price point |
| `StrategyName` | `PresetStrategy` | Only presets, not custom |
| `linear` (strategy) | `uniform` | Mathematically accurate — equal allocation |
| `线性` (UI label) | `均匀` | Chinese equivalent of "uniform" |
| `levels` | `activeAllocations` | Filtered allocations with price > 0 |
| `customLevels` | `customAllocations` | Consistent with `Allocation` type |
| `allStrategyStats` | `presetStats` | Only contains preset strategy stats |
| `insight` | `strategyAdvice` | "Advice" matches the algorithm's output |
| `curveData` | `profitCurves` | Descriptive — profit curves over bottom range |
| `totalAllocation` → `totalWeight` | `activeWeightSum` | Sum of active strategy weights |
| `generateAggressiveInverted` | `generateExponentialWeights` | Describes the math, not the trading sentiment |
| `generateStrategies` | `generatePresetWeights` | Generates preset weight arrays, not strategy objects |
| `calculateStats` | `calculatePositionStats` | Explicit: calculates position-level stats |
| `totalPosition` | `filledPosition` | Only filled (executed) orders, not total |
| `returnRate` | `roi` | Industry-standard abbreviation |
| `ComparableStrategy.levels` | `.allocations` | Consistent with `Allocation` type |
| `customTotal` | `customWeightSum` | Sum of custom weights |
| `isValidCustom` | `isCustomWeightValid` | Subject-first naming: what is being validated |
| `reboundPrice` | `bottomPrice` | The lowest price the asset reaches |
| `reboundMin/Max/Step` | `bottomMin/Max/Step` | Consistent with `bottomPrice` |
| `ReboundSlider` | `BottomSlider` | Component matches domain concept |
| `onReboundChange` | `onBottomChange` | Callback matches domain concept |
| `HISTOGRAM_MAX_POSITION` | `HISTOGRAM_SCALE_MAX` | Scale factor, not a position |
| `SLIDER_MAX_POSITION` | `MAX_LEVEL_WEIGHT` | Maximum allowed weight per level |
| `PRECISION_MULTIPLIER` | _(deleted)_ | Dead code |

## Dependency Graph

```
types.ts ← constants.ts ← formatting.ts
                         ← strategies.ts
                         ← calculations.ts ← advice.ts

                    All lib/ ← use-simulator.ts ← page.tsx
                    types.ts ← components/*.tsx  ← page.tsx
```

No circular dependencies. `types.ts` is the root; `page.tsx` is the leaf.
