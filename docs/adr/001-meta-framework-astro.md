# ADR 001: Astro as Meta-Framework

## Status
Accepted

## Context
Need a meta-framework for a content-driven portfolio site with interactive islands (Scrambler navigation, D3 visualizations, WebMCP tools). Must support TypeScript, Svelte components, static-first architecture, and Cloudflare Pages deployment. Budget: $0/month hosting.

## Decision
Use Astro 5/6 as the meta-framework.

## Alternatives Considered
- **Next.js**: React runtime overhead unnecessary for content site. Server Components add complexity without benefit.
- **SvelteKit**: App-centric routing, less suited to content collections. Would work but rebuilds what Astro provides.
- **Nuxt**: Vue ecosystem. Similar over-engineering argument as Next.js.
- **Plain Vite**: No content pipeline, no image optimization, no SSG/SSR hybrid.

## Consequences
- Zero JS by default — only interactive islands ship JavaScript
- Content Collections provide type-safe Markdown/MDX with schema validation
- Polyglot components: Svelte for interactive islands, `.astro` for static content
- First-class Cloudflare Pages integration (acquired Jan 2026)
- Islands architecture: `client:visible`, `client:only` for lazy hydration
