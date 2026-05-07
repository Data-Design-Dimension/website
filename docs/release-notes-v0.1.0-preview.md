# v0.1.0-preview — early access

First tagged release of dadeda.design, marking it ready for early-access user testing on the staging URL. Public apex (dadeda.design) cutover comes after the testing round closes.

**Staging URL**: <https://website.kathryn-89d.workers.dev/>
**Testing instructions**: [docs/early-access-testing.md](https://github.com/Data-Design-Dimension/website/blob/main/docs/early-access-testing.md)
**Submit feedback**: [tester-feedback issue template](https://github.com/Data-Design-Dimension/website/issues/new?template=tester-feedback.yml) or email `kathryn@dadeda.design`

---

## What's in this release

**Core surfaces**
- Scrambler orbital interaction with 16 portfolio cards across three clusters (See Work, Get to Know, Meta)
- Knob with three pads (See Work / Get to Know / Contact) plus central dial
- About-me Avatar with halftone treatment + expand-in-place card
- Five routes: `/`, `/design-system`, `/how-this-works`, `/writing`, `/review`

**WebMCP tool registry** (10 tools, exposed via `navigator.modelContext.registerTool` when available + `window.dadeda.callTool` as canonical fallback)
- Content navigation: `getSiteMap`, `getCard`, `searchCards`, `focusCard`, `setPrivacyPreferences`
- User actions: `getResume`, `sendEmail`, `openLinkedInProfile`, `openGitHubProfile`, `shareProfile`
- Reliability wrapper: param schema validation, per-tool timeout, up to 2 retries with exponential backoff, structured error envelope, never throws across the tool boundary
- Visual indicator: amber→green glow halo on the targeted control while a tool is in flight; control briefly non-interactive to manage tool interruption

**Inline video** for cards with Vimeo / YouTube CTAs (privacy-friendly embeds: `vimeo.com/video/{id}?dnt=1`, `youtube-nocookie.com`). Video player is visible in both collapsed and expanded states.

**Long-form case-study bodies** rendered inline in expanded cards via markdown (no navigation off-page). Migrated from the prior Flask version's `/work/*` templates with voice edits per the site's content rules.

**Design system** at `/design-system` with: Okabe-Ito-derived L-anchored categorical palette + grayscale check, vizCardSafe (avoids the green/amber hue bands that already mean See Work / GTK), sequential / multi-hue / diverging / cyclical scales rendered inline, AI Interaction Design principles, collapsible sections.

**Architecture diagram** at `/how-this-works`: Mermaid-rendered dual-audience system map (humans + agents), with color-coded subgraphs.

**`/review` interface** for content refinement: side-by-side collapsed + expanded card preview, tag editor, approve / archive / feature toggles, per-card feedback notes, one-click submit-as-GitHub-issue flow with prefilled body.

## Performance work in this release

- Orbital blur capped at 2.5px (was 4px) — blur is the most expensive CSS filter, cost roughly quadratic in radius
- `backdrop-filter` blur reduced 2px → 1px on `.card-backdrop` (`backdrop-filter` is the most expensive blur variant per web.dev)
- Sibling-card defocus blur reduced 6px → 3px when a card is expanded (14+ simultaneous blurs is meaningful GPU work)
- Orbital RAF loop guards on `document.hidden` to skip work in hidden tabs
- See `docs/perf-baseline.md` for the Lighthouse baseline scores and full optimization inventory.

## Test coverage

- 82 Vitest unit tests (orbital math, design tokens, viz palette, content pool, WebMCP reliability + tool schemas)
- 37 Playwright E2E tests across Chromium + iPhone-14 device profiles (homepage smoke, design-system, perf baseline, WebMCP smoke)

## Known scope for post-release iteration

- Three legacy `/work/*` case-study cards (sustain-our-soil, freedom-map, invest-as-one) have first-draft inline bodies; refining is post-launch.
- pycon-talk auto-expand-on-play (#34) needs YouTube IFrame API integration; deferred.
- Issue #32 backlog: Lighthouse CI, web-vitals RUM, optional CRT-style scanlines / flicker.

## Tag context

Pre-release flag: `--prerelease`. Tooling that auto-deploys "stable" tags should skip this one.

## Thank you

Specifically to early-access testers — your feedback in this round shapes the apex cutover. See [docs/early-access-testing.md](https://github.com/Data-Design-Dimension/website/blob/main/docs/early-access-testing.md) for the task list.
