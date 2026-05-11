# [dadeda.design](https://dadeda.design)

Portfolio and professional brand site for [Kathryn Hurchla](https://www.linkedin.com/in/kathrynhurchla/) / [Data Design Dimension](https://github.com/Data-Design-Dimension).

## Setup

Requires **Node.js 24+** and **pnpm**.

```bash
# If Node 24 is installed via Homebrew as a keg:
export PATH="/usr/local/opt/node@24/bin:$PATH"

# Install dependencies
pnpm install
```

## Development

```bash
pnpm dev          # Start dev server at localhost:4321
pnpm build        # Production build
pnpm preview      # Preview production build locally
pnpm test         # Run tests
pnpm test:watch   # Run tests in watch mode
pnpm check        # TypeScript / Astro type checking
```

## Stack

- **Astro 6** — static-first, islands architecture
- **Svelte 5** — interactive components (no shadow DOM)
- **Tailwind v4** — layout and typography
- **Vanilla CSS + OKLCH** — animation, data viz, design tokens
- **Vitest** — testing (TDD)
- **Cloudflare Pages** — hosting ($0)

## Project Structure

```
src/
├── pages/           Astro page routes
├── components/      Svelte interactive components
├── layouts/         Astro layout templates
├── content/         Content collections (YAML cards, MD/MDX writing)
├── lib/             Shared utilities, tokens, Scrambler logic
└── styles/          Design tokens (tokens.css), global styles
docs/adr/            Architecture Decision Records
tests/               Test files
public/              Static assets
```

## Key Pages

- `/` — Home
- `/design-system` — Living design system documentation

## Previous Version

The Flask/Bootstrap version is preserved at tag `v1.0-flask` and branch `archive/flask-v1`.

## License

AGPL-3.0 — see [LICENSE](LICENSE).

Data, Design & Daughters LLC dba Data Design Dimension. All rights reserved.
