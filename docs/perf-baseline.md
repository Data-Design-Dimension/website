# Performance Baseline — v0.1.0-preview

Establishes the comparison point for post-release perf iteration. Re-run on each subsequent release; track score deltas in commit messages.

## How to capture

```sh
# Desktop preset (default Lighthouse profile)
npx lighthouse https://website.kathryn-89d.workers.dev/ \
  --preset=desktop \
  --output=html \
  --output-path=./lighthouse-desktop.html \
  --chrome-flags="--headless"

# Mobile (default)
npx lighthouse https://website.kathryn-89d.workers.dev/ \
  --output=html \
  --output-path=./lighthouse-mobile.html \
  --chrome-flags="--headless"
```

Open the HTML reports in a browser, transcribe the four scores into the table below.

## Scores — v0.1.0-preview (TO FILL IN AT TAG TIME)

| Category | Desktop | Mobile |
| --- | --- | --- |
| Performance | _TBD_ | _TBD_ |
| Accessibility | _TBD_ | _TBD_ |
| Best Practices | _TBD_ | _TBD_ |
| SEO | _TBD_ | _TBD_ |

## Notable opportunities (from the most recent run)

_TBD — fill in any flagged items the audit surfaces. Common ones to watch for:_

- Largest Contentful Paint (LCP)
- Total Blocking Time (TBT)
- Cumulative Layout Shift (CLS)
- Interaction to Next Paint (INP)
- Image format / size opportunities
- JavaScript bundle size

## What's already optimized at v0.1.0-preview

- Orbital blur capped at 2.5px (blur cost is roughly quadratic in radius; previous max was 4px). See `src/lib/scrambler/orbital-math.ts:110`.
- Backdrop-filter blur on `.card-backdrop` reduced from 2px → 1px (per #32, backdrop-filter is the most expensive blur variant).
- Sibling-card filter blur reduced from 6px → 3px when a card is expanded (14+ simultaneous blurs is real GPU work).
- Orbital RAF loop guards on `document.hidden` to skip work in hidden tabs (see `src/components/ScramblerCluster.svelte`).
- All major images converted to webp; lazy on iframes + non-avatar images.
- Mermaid bundle (~600KB) lazy-loaded only on `/how-this-works`.
- `prefers-reduced-motion` honored throughout: orbital RAF early-returns; CSS transition durations zeroed out.
- Cards with computed opacity < 0.04 use `visibility: hidden` (browsers skip paint entirely); opacity < 0.08 skips the blur filter.

## Test scaffold (Playwright)

`e2e/perf.test.ts` asserts:
- No user-perceived long tasks (>100ms) during 3s of static idle on the homepage.
- Click→`.expanded`-class state-change completes within 200ms (in-browser `MutationObserver` timing, no CDP overhead).

Run via `pnpm test:e2e --project=chromium e2e/perf.test.ts`.

## Backlog

Tracked in #32 — apply post-release based on user-testing feedback:
- Full Lighthouse CI in GitHub Actions
- web-vitals runtime tracking (RUM)
- Image `srcset`/`sizes` if Lighthouse flags it
- Static-asset blur for backdrop (replace `backdrop-filter` with pre-blurred PNG) only if perf testing shows it's still a bottleneck
- Animation tier system (low-end-device detection beyond `prefers-reduced-motion`)
- CRT scanlines / flicker (only if user testing reports cards feel insufficiently CRT)
