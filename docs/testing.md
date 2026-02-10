# Testing Strategy

## What We Test

Only **`lib/` pure functions** — the calculation core that determines profit, ROI, and strategy recommendations. These functions are deterministic, side-effect-free, and critical to correctness.

| File | What it does | Why it matters |
|------|-------------|----------------|
| `lib/calculations.ts` | Position stats (profit, ROI, avg cost) | Wrong math → wrong investment decisions |
| `lib/strategies.ts` | Weight generation (pyramid, uniform, etc.) | Weights must sum to 1; ordering must be correct |
| `lib/advice.ts` | Strategy comparison & segment merging | Determines which strategy recommendation users see |

## What We Skip

| Category | Reason |
|----------|--------|
| **UI Components** | Change frequently, verified visually. Testing JSX structure provides low signal. |
| **Hooks** (`useSimulator`, etc.) | Tightly coupled to React state. Would require mocking that adds fragility, not confidence. |
| **Pages / Layouts** | Routing and layout are Next.js concerns, not our logic. |
| **Formatting utils** (`lib/format.ts`) | Thin wrappers around `Intl.NumberFormat`. If Intl is broken, we have bigger problems. |
| **E2E / Integration** | Out of scope for a client-side calculator. No backend, no async flows to test. |
| **Coverage targets** | No minimum coverage %. We test what matters, not what inflates metrics. |

## Tool Choice

**Bun's built-in test runner** — zero additional dependencies.

- `bun test` discovers `*.test.ts` files automatically
- Provides `describe`, `test`, `expect` (Jest-compatible API)
- Native TypeScript support, no compilation step
- Already in the project as package manager / runtime

## Adding New Tests

Add tests when:
- You add a new pure function to `lib/`
- You fix a calculation bug (regression test)
- You refactor logic that changes intermediate values

Don't add tests for:
- Component rendering or styling
- Wiring / glue code
- Anything that requires mocking React hooks or browser APIs
