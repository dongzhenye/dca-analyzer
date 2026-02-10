# DCA Analyzer

Compare DCA allocation strategies before you buy the dip.

## What This Is (and Isn't)

Most DCA tools answer *"what would have happened if I started DCA-ing 3 years ago?"* — this one answers **"given a drawdown, how should I distribute my buy orders across price levels?"**

DCA Analyzer is a forward-looking strategy planner for active investors who set limit orders at multiple price levels during a correction. You define your entry prices, pick an allocation strategy (or build your own), then simulate different bottom prices to see which strategy yields the highest profit when the market recovers.

It is **not** a historical backtester, not a DCA-vs-lump-sum calculator, and not a trading bot.

## Who It's For

- Crypto investors who manually set limit orders during drawdowns ("$70k light, $60k medium, $50k heavy")
- Anyone comparing allocation patterns — should you go heavier at the bottom (pyramid) or spread evenly?
- Traders who want to stress-test their DCA plan against different "what-if" bottom scenarios

## Features

- **Strategy Comparison** — Compare 3 presets (Pyramid, Uniform, Inverted) and a fully custom allocation side by side
- **Dual Visualization** — Area chart shows profit as rectangle area (price gain x position size); curve chart shows profit across all bottom prices
- **Bottom Price Simulator** — Drag a slider or use arrow keys to simulate "what if the market drops to $X?"
- **Strategy Advice** — Algorithm recommends the best strategy per price range (e.g., "below $50k, Pyramid wins")
- **Bilingual** — Full English and Simplified Chinese support
- **Pure Client-Side** — No API calls, no backend, no data collection. Works offline

## How It Works

1. **Configure** — Set your entry price levels and target price
2. **Choose a strategy** — Pick a preset or drag sliders to customize capital allocation per level
3. **Simulate** — Drag the bottom price slider to explore "what if the price drops to X?"
4. **Compare** — Read the charts and advice panel to see which strategy performs best

## Tech Stack

- Next.js 16 / React 19
- Tailwind CSS 4
- TypeScript
- next-intl (i18n)

## Development

```bash
bun install
bun run dev
bun test
```

## License

MIT
