# dadeda.design — Data Design Dimension

## Project Overview
Personal brand/portfolio site for Kathryn Hurchla. Domain: dadeda.design
Brand: Data, Design & Daughters LLC dba Data Design Dimension (DADEDA).
`#DADEDA` is both the brand name and a hex color (sage mist, oklch(0.89 0.007 155)).

## Stack
- **Framework**: Astro 6 (static-first, islands architecture)
- **Components**: Svelte 5 (runes, no shadow DOM)
- **Styling**: Tailwind v4 (layout/typography) + vanilla CSS (animation/D3 viz). OKLCH tokens.
- **Testing**: Vitest (TDD), Playwright (e2e), Chromatic (visual regression)
- **Component dev**: Storybook 8
- **Deployment**: Cloudflare Pages + Workers + KV + R2
- **Language**: TypeScript (strict)
- **Package manager**: pnpm

## Commands
- `pnpm dev` — start dev server
- `pnpm build` — production build
- `pnpm preview` — preview production build
- `pnpm check` — Astro type checking
- `pnpm test` — run Vitest tests
- `pnpm test:watch` — run tests in watch mode
- `pnpm storybook` — start Storybook dev server
- `pnpm storybook:build` — build Storybook

## Architecture
- `src/pages/` — Astro page routes
- `src/components/` — Svelte interactive components
- `src/layouts/` — Astro layout templates
- `src/content/` — Content collections (YAML cards, MD/MDX writing & pages)
- `src/lib/` — Shared utilities, Scrambler logic, GitHub API client
- `src/lib/webmcp/` — WebMCP tool registrations
- `src/styles/` — Design tokens (tokens.css), global styles
- `public/` — Static assets (favicons, robots.txt, llms.txt)
- `docs/adr/` — Architecture Decision Records
- `tests/` — Test files

## Development Methodology: TDD
Always test-first:
1. Write failing test
2. Confirm it fails
3. Implement until test passes
4. Refactor while green

## Code Style
- ES modules, never CommonJS
- Svelte 5 runes ($state, $derived, $effect), not legacy reactive syntax
- D3 components: use `client:only="svelte"` directive in Astro pages
- All images must have descriptive alt text
- Semantic HTML (nav, main, article, section, footer)
- Color tokens via CSS custom properties, never hardcoded hex
- Tailwind for layout/typography, vanilla CSS for animation + D3 viz

## Content
- Cards and clusters defined as YAML data files, not hardcoded in components
- Adding content = adding a YAML/MD file. No component code changes needed.
- Writing hub: `original` (full text), `syndicated` (excerpt + link), `note` (micro-post)

## Accessibility
- WCAG 2.1 AA minimum
- All interactive elements keyboard navigable
- Color contrast >= 4.5:1 normal text, >= 3:1 large text
- Skip navigation link on every page
- ARIA labels on icon-only buttons
- `prefers-reduced-motion`: disable all animations
- `prefers-color-scheme`: respect dark/light preference

## Git
- Branch naming: feature/, fix/, content/
- Conventional commits (feat:, fix:, docs:, style:, refactor:)
- Run `pnpm build` before committing
- Never commit .env files or API keys
