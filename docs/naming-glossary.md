# Naming Glossary

> Core business concepts, their code names, and naming rationale.
> All names cross-referenced against IBKR, Binance, Coinbase, and standard financial terminology.

## Project Identity

| Aspect | Before | After | Notes |
|---|---|---|---|
| Repo name | `position-simulator` | `dca-analyzer` | DCA is the core domain; "analyzer" reflects comparison/analysis, not simulation |
| package.json `name` | `position-simulator` | `dca-analyzer` | Sync with repo |
| Page title (H1) | 仓位模拟器 | 仓位模拟器 | Keep — 中文标题独立意译，不需与英文 repo 名一一对应 |
| metadata `title` | 仓位模拟器 | 仓位模拟器 | Keep |
| metadata `description` | 对比不同建仓策略的收益表现 | 对比不同建仓策略的收益表现 | Keep — accurate |
| README title | Position Simulator | DCA Analyzer | Sync with repo |
| README description | Interactive BTC position simulator... | Interactive BTC DCA analyzer for comparing dollar-cost averaging strategies. | Sync with repo |
| Directory name | `position-simulator/` | `dca-analyzer/` | Local rename |

## Business Model

DCA (Dollar-Cost Averaging) strategy analyzer for buying crypto during a price downturn.

User sets **buy orders at different price levels**, each with a **weight** (proportion of total capital). The tool analyzes "what if the price drops to X?" — orders at prices >= X get **filled** (executed), then calculates profit when price recovers to a **target**.

## Concept → Code Name

| Concept (中文) | Concept (English) | Code Name | Location |
|---|---|---|---|
| 模拟器配置 | Simulator config | `SimulatorConfig` | `lib/types.ts` |
| 资产名称 / 单位 | Asset name / unit | `assetName`, `assetUnit` | `SimulatorConfig` |
| 目标价格 | Target price | `targetPrice` | `SimulatorConfig` |
| 目标日期 | Target date | `targetDate` | `SimulatorConfig` |
| 建仓价位 | Price levels | `priceLevels` | `SimulatorConfig` |
| 总仓位量 | Total size | `totalSize` | `SimulatorConfig` |
| 探底价格 | Bottom price | `bottomPrice` | Hook state |
| 探底范围 | Bottom range | `bottomMin` / `bottomMax` / `bottomStep` | `SimulatorConfig` |
| 仓位分配 | Allocation | `Allocation` | `lib/types.ts` |
| 权重 | Weight | `weight` | `Allocation.weight` |
| 仓位指标 | Position metrics | `PositionMetrics` | `lib/types.ts` |
| 已成交仓位 | Filled position | `filledPosition` | `PositionMetrics` |
| 总成本 | Total cost | `totalCost` | `PositionMetrics` |
| 均价 | Average cost | `avgCost` | `PositionMetrics` |
| 目标市值 | Value at target | `valueAtTarget` | `PositionMetrics` |
| 盈利 | Profit | `profit` | `PositionMetrics` |
| 投资回报率 | ROI | `roi` | `PositionMetrics` |
| 预设策略 | Preset strategy | `PresetStrategy` | `lib/types.ts` |
| 当前策略 | Active strategy | `ActiveStrategy` | `lib/types.ts` |
| 可比较策略 | Comparable strategy | `ComparableStrategy` | `lib/types.ts` |
| 自定义权重总和 | Custom weight sum | `customWeightSum` | Hook |
| 当前权重总和 | Active weight sum | `activeWeightSum` | Hook |
| 自定义权重有效 | Custom weight valid | `isCustomWeightValid` | Hook |
| 收益曲线 | Profit curves | `profitCurves` | Hook |
| 策略建议 | Strategy advice | `strategyAdvice` | Hook |
| 收益排名 | Profit rankings | `profitRankings` | Hook |

## Renames (this round)

### Data & State

#### 1. `StrategyStats` → `PositionMetrics`

| | Detail |
|---|---|
| **What it is** | Type containing filledPosition, totalCost, avgCost, valueAtTarget, profit, roi |
| **Why rename** | "Stats" is vague. These are specifically **position metrics** — quantitative indicators of a trading position's performance. "Metrics" is the standard term in finance for measurable performance indicators. |
| **Source** | Financial industry convention; "position metrics" is standard portfolio analysis terminology |

#### 2. `totalPosition` → `filledPosition`

| | Detail |
|---|---|
| **What it is** | Total asset quantity accumulated from executed (filled) buy orders |
| **Why rename** | "position" is correct per industry (IBKR: `position`, Binance: `positionAmt`). Adding "filled" clarifies this is only the executed portion, avoiding confusion with `totalSize` (the planned total). `totalPosition` reads too close to `totalSize` / `maxPosition`. |
| **Why not `filledQuantity`** | `executedQty` / `filled_size` are per-order fields on exchanges (Binance, Coinbase). Our value is an aggregate — an aggregate holding is a "position", not a "quantity". |
| **Source** | IBKR TWS API: `position` (aggregate holding); Binance Futures: `positionAmt` |

#### 3. `returnRate` → `roi`

| | Detail |
|---|---|
| **What it is** | Percentage return on investment: `(profit / totalCost) × 100` |
| **Why rename** | ROI is the universally recognized abbreviation. Binance UI displays "ROI %". `returnRate` has ambiguity — "rate" can imply "the rate at which returns happen" (a speed) rather than "percentage return" (a ratio). |
| **Source** | Binance Futures UI: "ROI %"; general finance convention |

#### 4. `ComparableStrategy.levels` → `.allocations`

| | Detail |
|---|---|
| **What it is** | `Allocation[]` — array of `{price, weight}` pairs for a strategy |
| **Why rename** | `levels` implies `number[]` of prices (like `priceLevels` in `SimulatorConfig`). The field actually holds `Allocation[]`. Renaming aligns with `activeAllocations`, `customAllocations`. |
| **Source** | Codebase consistency; "allocation" is standard portfolio management terminology |

#### 5. `customTotal` → `customWeightSum`

| | Detail |
|---|---|
| **What it is** | Sum of all custom allocation weights |
| **Why rename** | `customTotal` is indistinguishable from `totalWeight`. Adding "Sum" suffix clarifies it's a computed aggregate. "custom" prefix specifies scope. |

#### 6. `totalWeight` → `activeWeightSum`

| | Detail |
|---|---|
| **What it is** | Sum of the currently active strategy's allocation weights |
| **Why rename** | Distinguishes from `customWeightSum` — this is the active strategy's weight sum. |

#### 7. `isValidCustom` → `isCustomWeightValid`

| | Detail |
|---|---|
| **What it is** | Boolean: true when custom weights sum to ~100% (within tolerance) |
| **Why rename** | "Valid custom" is missing a subject. `isCustomWeightValid` explicitly states what is being validated. |

### Bottom Price (rebound → bottom)

#### 8. `reboundPrice` → `bottomPrice`

| | Detail |
|---|---|
| **What it is** | The simulated lowest price the asset drops to before recovering |
| **Why rename** | "Rebound" describes the bounce-back action AFTER the lowest point. The variable represents the trough. "Market bottom" is universal trading terminology. |
| **Why not `troughPrice`** | Less accessible than "bottom" in everyday trading language |
| **Why not `floorPrice`** | "Price floor" implies artificially enforced minimum (government intervention) |
| **Source** | Universal trading terminology |

#### 9. `reboundMin/Max/Step` → `bottomMin/Max/Step`

Consistency with `bottomPrice`.

#### 10. `ReboundSlider` → `BottomSlider` (+ file `rebound-slider.tsx` → `bottom-slider.tsx`)

Consistency with `bottomPrice`.

#### 11. `onReboundChange` → `onBottomChange`

Consistency with `bottomPrice`.

### Functions

#### 12. `generateStrategies()` → `generatePresetWeights()`

| | Detail |
|---|---|
| **What it is** | Returns `{ pyramid: number[], uniform: number[], inverted: number[] }` — weight arrays |
| **Why rename** | Returns weight arrays, not strategy objects. "PresetWeights" accurately describes the output. |

#### 13. `calculateStats()` → `calculatePositionStats()`

| | Detail |
|---|---|
| **What it is** | Core engine: `(allocations, bottomPrice, targetPrice, totalSize) → PositionMetrics` |
| **Why rename** | "Stats" is too generic. This calculates position-specific metrics (cost, profit, ROI). Aligns with `PositionMetrics` type rename. |

#### 14. `calculateStats(levels, ...)` parameter → `(allocations, ...)`

Same rationale as #4 — receives `Allocation[]`, not price levels.

## Unchanged (industry-validated)

| Name | Reason | Source |
|---|---|---|
| `totalSize` | "Size" is standard trading terminology. "What's your total size?" is idiomatic trader-speak. | IBKR, general trading |
| `Allocation` | Standard portfolio management term for capital distribution. `weight` field clarifies. | Portfolio management |
| `weight` | Universal finance term for allocation fractions. | Index funds, all portfolio tools |
| `avgCost` | IBKR convention: `averageCost` / `avgCost`. | IBKR TWS API |
| `valueAtTarget` | Simulator-specific projected value. Self-documenting. | — |
| `priceLevels` | Standard trading term for price points. | General trading |
| `formatUSD()` | Currently only formats USD. Name is accurate. | — |
| `CONSTANTS` | Generic but scoped by file (`constants.ts`). | — |
| `AreaChart` | Not a traditional area chart, but understood in project context. | — |
| `CurveChart` | Understood in context. | — |
| `AdvicePanel` / `strategyAdvice` / `analyzeStrategyAdvice()` | "Advice" is adequate. | — |
| `.name` on domain types | Machine-key field. Deferred `.key` rename. | — |
| `profitRankings` | Clear and descriptive. | — |
| `useSimulator()` | Standard hook naming. | — |
| `ConfigPanel` | Acceptable. | — |
| `ChartLegend` | Standard charting term. | — |
| `StrategySelector` | Accurately describes UI purpose. | — |
