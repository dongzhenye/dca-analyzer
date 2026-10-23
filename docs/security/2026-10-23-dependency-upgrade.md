---
lifecycle: snapshot
---

# Dependency security upgrade — 2026-10-23

## Scope

Base: `d218f3b7ab4db3810cd987e68c115f2c58607156` (`origin/main`).
Local candidate branch: `codex/security-upgrade-batch2`.

- Next.js and eslint-config-next: 16.1.6 → 16.4.3.
- Refresh Bun resolutions within existing major-version ranges, including next-intl 4.14.9, Tailwind CSS 4.3.3, and ESLint 9.39.5. React and React DOM remain 19.2.3.
- Add Bun test types so TypeScript checks include the existing tests.
- Repair existing lint failures: update bottom-price state during configuration changes instead of a synchronous effect, and remove an unused translation hook. The extracted adjustment retains step rounding, bounds, midpoint reset, and invalid-range behavior. Core calculations, presets, and comparison logic are unchanged.
- Ignore local worktrees. No dependency overrides or lifecycle-script trust expansion.

## Security evidence

The npm registry confirmed 16.4.3 is available. The updated lock resolves sharp 0.35.5 and PostCSS 8.5.23.

Relevant upstream advisories include [SVG image optimization RCE](https://github.com/advisories/GHSA-2464-fhr4-w9xw) and [typed-array cache RCE](https://github.com/advisories/GHSA-673q-mjm6-r5xr), both patched in Next.js 16.4.1. Package-level alerts do not establish that this application's configuration exposes every affected feature.

| Audit | Before | Candidate |
| --- | --- | --- |
| Full Bun lock, npm advisory service | 17 package names, 88 returned entries: 4 critical, 48 high, 30 moderate, 6 low | 0 returned advisories |
| Production dependency graph | Not separately measured | 0 returned advisories |

The production check traversed the Bun lock from runtime dependencies, including optional dependencies and required peers: 104 lock entries / 102 package names. Their resolved versions were submitted to npm's bulk advisory endpoint. Bun 1.3.11 does not document a production-only audit flag; the production result is this separate graph query. Counts include multiple versions/advisory entries and are not a count of distinct exploitable vulnerabilities. Results are a dated advisory snapshot.

## Verification

Environment: Bun 1.3.11; Node.js 22.23.4 for the production build and server.

- Baseline: frozen install and 26 tests / 77 assertions passed. Lint failed on synchronous effect state updates and warned about the missing effect dependency and unused translation hook. TypeScript failed because `bun:test` types were missing.
- Candidate: `bun install --frozen-lockfile`; `bun test` (31 tests / 86 assertions); `bun run lint`; `bunx tsc --noEmit`; `bun run build`; and `git diff --check` all passed.
- Production build generated `/en` and `/zh`, with the locale proxy present.
- Production browser checks on localhost: English/Chinese switching, Uniform strategy at bottom price 60,000 (displayed profit 26,262 in both locales), target-price editing, range shrink moving the simulated price to the aligned midpoint (60,000 → 43,000), reset, custom allocation editing, exclusion of an invalid 105% custom total, arrow-key adjustment, and profit-curve switching passed. Console warnings/errors were empty.
- Five additional tests cover aligned prices and boundaries, rounding, out-of-range midpoint reset, clamp after rounding, and temporarily invalid ranges.
- Self-review checked the dependency diff, all configuration setter callers, adjustment behavior, and unchanged calculation modules. Independent review is required separately before integration.

## Remaining boundaries

No push, PR, merge, tag, or deployment was performed. The primary checkout remains unchanged. Deployment requires explicit user confirmation, then a fresh Vercel build from the reviewed commit with the committed Bun lock and a supported Node runtime (tested on Node 22.23.4), followed by live route and interaction checks. Local success does not verify the deployed version or Vercel settings.

An existing advice label can show a degenerate interval such as “≤ $45,000 & > $45,000”. This was observed during browser checks; the underlying advice algorithm and translations were not changed in this dependency upgrade.
