# ADR 003: Cloudflare Free Tier (Pro Deferred)

## Status
Accepted (2026-05-11, during the Cloudflare apex cutover for dadeda.design)

## Context
The Cloudflare apex zone setup for `dadeda.design` offered a choice between the **Free** plan and the **Pro** plan ($20/month, $240/year). The decision needed to be made at zone creation time and applies to features served at the zone (DNS) level — Workers-level features are unaffected by plan tier.

The site's architecture sets the relevant constraints:
- Fully static Astro build (`output: 'static'`) deployed via Cloudflare Workers with Static Assets — serves directly from edge, no origin server.
- No forms, no authentication, no database, no user-generated content. Attack surface is essentially the static asset list.
- Few raster images (avatar JPEG, a handful of card thumbnails). Astro's built-in `<Image>` component plus Sharp handles WebP/AVIF generation at build time.
- Target audience: AI-aware visitors, recruiters, fellow practitioners. No anonymous traffic patterns that would benefit from aggressive bot mitigation.

A documented stance is needed so future Pro upgrades (or downgrades from a future trial) are demand-driven rather than speculative.

## Decision
Use the **Free** plan for the `dadeda.design` zone.

## Alternatives Considered
- **Pro plan ($20/month).** Rejected. Feature-by-feature audit found no UX benefit for this specific site shape:
  - OWASP/zero-day WAF rules → no exploitable surface (no forms, no DB, no dynamic origin).
  - Easy-to-detect bot challenges → counter to ADR 002 (AI crawlers explicitly allowed); no observed scraper problem.
  - Prioritized asset loading → Astro already emits optimal resource hints; bundle is small.
  - WordPress intelligent caching → N/A.
  - One-click image optimization (Polish/Mirage) → duplicates work already done at build time by Astro + Sharp.
  - Cache analytics → operator-side; no visitor UX impact.
- **Business plan ($200/month).** Not on the table — features (PCI compliance, dedicated WAF, image resizing API) far exceed any plausible portfolio need.

## Consequences
- **All visitor-facing edge UX comes from the Free tier:** Cloudflare's 300+ PoP Anycast network, global CDN, HTTP/2 and HTTP/3 (QUIC), TLS 1.3, Universal SSL, Brotli compression, free DDoS protection, fast Anycast DNS.
- **WAF coverage is high-severity-only on Free.** Sufficient given the zero-attack-surface profile of a fully static site.
- **70 Cloudflare Rules + 5 WAF Rules quota.** Plenty for the planned use (one redirect rule for www → apex, future Always-HTTPS and a few edge config rules).
- **No edge image optimization (Polish/Mirage).** Image optimization is owned at build time by Astro `<Image>` + Sharp. If future content adds heavy image traffic, revisit either by introducing Cloudflare Images (pay-per-image, can be cheaper than Pro for low volume) or by upgrading to Pro at that point.
- **Upgrade is one-click in the Cloudflare dashboard** with no DNS or Worker changes required. Free → Pro is reversible.

## Revisit Triggers
This decision should be re-evaluated if any of the following become true:
- Real visitor mobile LCP regression on Search Console that resists build-time fixes.
- Traffic patterns or bot abuse exhausting the 5 WAF Rules quota.
- A new feature (forms, user auth, comments, dynamic content) introduces real attack surface.
- Image-heavy content (lookbooks, photo essays) ships and build-time optimization no longer scales.

Until one of those, Free is the right tier.
