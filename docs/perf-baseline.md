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

## Scores — v0.1.0-preview (captured 2026-05-07)

Run against staging URL `https://website.kathryn-89d.workers.dev/` via Lighthouse 13.3.0, headless Chrome.

| Category | Desktop | Mobile |
| --- | --- | --- |
| Performance | **61** | **43** |
| Accessibility | **100** | **100** |
| Best Practices | **96** | **96** |
| SEO | **100** | **100** |

A11y and SEO at 100 confirm the structural choices (semantic HTML, ARIA landmarks, OKLCH-anchored contrast, JSON-LD, llms.txt) are solid. Performance is the iteration target — see the metrics breakdown below.

## Web Vitals breakdown — v0.1.0-preview

| Metric | Desktop | Mobile |
| --- | --- | --- |
| First Contentful Paint (FCP) | 1.6 s | 4.8 s |
| Largest Contentful Paint (LCP) | 7.1 s | 38.7 s |
| Total Blocking Time (TBT) | 0 ms | 700 ms |
| Cumulative Layout Shift (CLS) | 0.003 | 0.006 |
| Speed Index | 4.8 s | 6.2 s |

CLS is excellent (≤0.006 vs Google "good" threshold of 0.1). TBT is 0 on desktop — main thread is unblocked. The two metrics to investigate post-release:

- **LCP is high**, especially on mobile (38.7s). Likely culprits to investigate:
  - The orbital cards keep moving and could be deferring "largest paint stable" detection.
  - Mermaid bundle on `/how-this-works` is 600KB lazy-loaded — verify the homepage isn't somehow including it.
  - WebP images load but `srcset` is absent; mobile bandwidth assumptions may not be optimal.
- **Mobile TBT 700ms** indicates the orbital animation + Svelte hydration are taxing the mobile main thread. Candidates: more aggressive `prefers-reduced-motion` detection on mobile, or animation-tier system that defaults to lower-fidelity orbital math on slow devices.

These are flagged for #32 post-release work — not blocking v0.1.0-preview tag.

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
