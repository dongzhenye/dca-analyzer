# 竞品分析 (Competitive Analysis)

> 调研时间：2026-02
> 目的：梳理 DCA 工具市场现状，明确 DCA Analyzer 的差异化定位

## 1. 市场概况 (Market Landscape)

DCA 工具市场可分为 4 类：

| 类型 | 代表产品 | 核心能力 | 局限 |
|------|----------|----------|------|
| **历史回测型 (Historical Backtesting)** | dcaBTC, CostAVG, LuxAlgo | 输入起止日期 + 金额，回测历史 DCA 收益 | 只看过去，不帮规划未来 |
| **DCA vs 一次性投入 (DCA vs Lump Sum)** | ApexCube, FincalFY, Curvo | 比较"分批买入"和"一把梭"哪个更好 | 这个问题已有定论（统计上 LS 赢，心理上 DCA 赢），实用价值有限 |
| **定投自动化 (Recurring Buy / Trading Bot)** | 3Commas, 交易所内置定投 | 自动执行定时定额买入 | 是执行工具不是分析工具，且需 API 授权 |
| **股票 + 分红再投资 (Stock DRIP)** | DRIPCalc, WhatIfInvested | 回测股票/ETF 的 DCA + 分红复投 | 股票专用，不覆盖加密货币 |

**核心观察**：市场充斥着"回头看"的工具，几乎没有"往前看"的策略规划器。

## 2. 竞品矩阵 (Competitor Matrix)

| 产品 | 类型 | 资产 | 时间方向 | 对比维度 | API 依赖 | 免费 |
|------|------|------|----------|----------|----------|------|
| [dcaBTC](https://dcabtc.com/) | 回测 | BTC only | 回顾 | 单策略收益 | CoinGecko | Yes |
| [CostAVG](https://costavg.com/) | 回测 | BTC/ETH/LTC/XMR/ADA | 回顾 | DCA vs LS + 交易所费率 | Coinpaprika | Yes |
| [LuxAlgo DCA](https://www.luxalgo.com/trading-calculators/bitcoin-dca/) | 回测 | BTC only | 回顾 | 单策略收益，支持 log 图 | CBOE/CME/CoinAPI | Yes |
| [ApexCube](https://apexcube.com/lump-sum-vs-dca) | DCA vs LS | S&P 500/Nasdaq/REITs/Gold/BTC | 回顾 | 6 种市场状态下 DCA vs LS 胜率 | Yahoo Finance | Yes |
| [FincalFY](https://www.fincalfy.com/in/en/investment/wealth/dca-vs-lumpsum-calculator/) | DCA vs LS | 通用（无真实数据） | 前瞻（模拟） | 波动率建模 + 风险调整收益 | None | Yes |
| [DRIPCalc](https://www.dripcalc.com/backtest/) | 股票 DRIP | US 股票/ETF | 回顾 | 分红再投资 + CAGR 预测 | Yahoo Finance | Freemium |
| [WhatIfInvested](https://whatifinvested.com/lump-sum-vs-dca-investment-strategy-comparison/) | DCA vs LS | 多资产组合 | 回顾 | 多资产组合 DCA vs LS | Yahoo Finance | Freemium |
| [3Commas](https://3commas.io/) | 交易机器人 | 加密货币（交易所联动） | 实时 | DCA Bot 回测 + 自动执行 | 交易所 API | Subscription |

## 3. 市场空白 (Feature Gaps)

以下能力在现有工具中**几乎无人涉及**：

1. **分配策略对比 (Allocation Strategy Comparison)** — 给定多个买入价位，如何分配资金？金字塔、均匀、倒金字塔哪个更好？没有工具回答这个问题
2. **探底价格模拟 (Bottom Price Simulation)** — "如果价格跌到 X 会怎样？" 的交互式模拟。现有工具要么用历史数据，要么用固定收益率假设
3. **分段策略建议 (Segmented Strategy Advice)** — "当底部在 $50k-$60k 时用金字塔，在 $40k-$50k 时用均匀" 这种分价格区间的建议。完全空白
4. **利润面积可视化 (Profit-as-Area Visualization)** — 利润 = 价格涨幅 x 持仓量 = 矩形面积。这种直觉性的可视化方式没有竞品使用
5. **纯客户端 (Pure Client-Side)** — 多数工具依赖价格 API。前瞻模拟器不需要历史价格，天然可以纯客户端运行

## 4. 我们的定位 (Our Positioning)

**一句话**：面向主动 DCA 投资者的前瞻性策略规划工具 (Forward-looking strategy planner for active DCA investors)

3 个核心定位选择：

### 4.1 前瞻模拟 vs 历史回测 (Forward Simulation vs Historical Backtesting)

**选择**：前瞻模拟 — 回答"接下来该怎么分配"，不回答"过去会怎样"

**理由**：DCA 历史回测的结论基本恒定 — "越早开始越好"。投资者在下跌行情中真正需要的不是确认 DCA 有效，而是**具体的分配方案**。

### 4.2 策略对比 vs 投入方式对比 (Strategy Comparison vs DCA-vs-Lump-Sum)

**选择**：比较不同的资金分配策略（金字塔 / 均匀 / 倒金字塔 / 自定义），不比较 DCA vs 一次性投入

**理由**：DCA vs LS 之争学术界已有定论（Vanguard 2012 研究：LS 约 2/3 时间跑赢 DCA）。但"既然选了 DCA，**怎么分配**"才是投资者的实际决策点 — 这个问题无人回答。

### 4.3 主动建仓 vs 被动定投 (Active DCA vs Passive Recurring Buy)

**选择**：模拟在特定价位挂单建仓，不模拟定时定额自动买入

**理由**：目标用户是在回调中主动布局的投资者 — 他们手动设置多个限价单（"$70k 买一点，$60k 多买，$50k 重仓"）。这与被动定投（每月自动买 $100）是完全不同的行为模式。

## 5. 关键差异化 (Key Differentiators)

| 差异化 | 说明 |
|--------|------|
| **分配策略对比 (Allocation Strategy Comparison)** | 并排比较金字塔/均匀/倒金字塔/自定义策略在同一场景下的表现 |
| **探底价格���拟 (Bottom Price Simulation)** | 拖动滑块模拟不同底部价格，实时查看各策略收益变化 |
| **分段策略建议 (Segmented Strategy Advice)** | 按价格区间给出最优策略建议，如"$50k-$60k 用金字塔" |
| **面积可视化 (Profit-as-Area Visualization)** | 利润 = 涨幅 x 仓位 = 矩形面积，直观展示不同策略的"形状" |
| **纯客户端 (Pure Client-Side)** | 无 API 依赖，无后端，无隐私顾虑，可离线使用 |
| **双语国际化 (Bilingual i18n)** | 英文 + 简体中文，意译风格，非机器翻译 |

## 6. 参考来源 (Sources)

- [dcaBTC](https://dcabtc.com/)
- [CostAVG](https://costavg.com/)
- [LuxAlgo Bitcoin DCA Calculator](https://www.luxalgo.com/trading-calculators/bitcoin-dca/)
- [ApexCube Lump Sum vs DCA](https://apexcube.com/lump-sum-vs-dca)
- [FincalFY DCA vs Lumpsum Calculator](https://www.fincalfy.com/in/en/investment/wealth/dca-vs-lumpsum-calculator/)
- [DRIPCalc Backtest](https://www.dripcalc.com/backtest/)
- [WhatIfInvested Strategy Comparison](https://whatifinvested.com/lump-sum-vs-dca-investment-strategy-comparison/)
- [3Commas DCA Bot Backtesting Guide](https://help.3commas.io/en/articles/11477934-dca-bot-backtesting-guide)
- [BitcoinDollarCostAverage](https://www.bitcoindollarcostaverage.com/)
- [Curvo DCA vs Lump Sum](https://curvo.eu/article/dca-vs-lump-sum)
- [Vanguard 2012: Dollar-cost averaging just means taking risk later](https://static.twentyoverten.com/5980d16bbfb1c93238ad9c24/rJpQmY8o7/Dollar-Cost-Averaging-Just-Means-Taking-Risk-Later-Vanguard.pdf)
