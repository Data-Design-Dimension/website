# Architecture

dadeda.design is a dual-audience system: human-first UX paths AND agent-focused / WebMCP-enabled paths share the same content layer. The diagram below is the source of truth — rendered on the site at `/how-this-works` and consumable as Markdown by agents.

```mermaid
%%{init: {'theme':'base', 'themeVariables': {
  'primaryColor': '#fff8d4',
  'primaryTextColor': '#1a1a1a',
  'primaryBorderColor': '#a07a3a',
  'lineColor': '#5a6b5a',
  'secondaryColor': '#d4f0db',
  'tertiaryColor': '#f0f0f0'
}}}%%
graph LR
  classDef human fill:#d4f0db,stroke:#3a7a4a,color:#1a3a1a
  classDef agent fill:#fff8d4,stroke:#a07a3a,color:#3a2a1a
  classDef content fill:#f0f0f0,stroke:#666,color:#222
  classDef hosting fill:#e0e8f0,stroke:#3a5a8a,color:#1a2a4a

  subgraph Human["Human-first UX"]
    Scrambler["Scrambler<br/>orbital cards"]
    Knob["Knob<br/>filters + dial + contact"]
    Avatar["Avatar<br/>about-me halftone"]
    CardOverlay["Expand-in-place<br/>card overlay"]
    Writing["/writing<br/>chronological feed"]
    Review["/review<br/>side-by-side card review"]
    DesignSystem["/design-system<br/>tokens, viz scales, AI principles"]
  end
  class Scrambler,Knob,Avatar,CardOverlay,Writing,Review,DesignSystem human

  subgraph Agent["Agent-facing"]
    WebMCP["WebMCP tools<br/>getSiteMap / searchCards / focusCard<br/>getResume / sendEmail / shareProfile<br/>setPrivacyPreferences"]
    LlmsTxt["llms.txt<br/>+ planned per-page .md endpoints"]
    JsonLd["JSON-LD<br/>Person / Organization / WebSite"]
    AiPlugin[".well-known/ai-plugin.json<br/>(planned)"]
    Glow["Tool-in-flight glow<br/>amber → green halo<br/>+ controls disabled"]
    Anonymizer["GitHub anonymizer<br/>scripts/github-anonymize.ts"]
  end
  class WebMCP,LlmsTxt,JsonLd,AiPlugin,Glow,Anonymizer agent

  subgraph Content["Shared content layer"]
    Collections["Astro Content Collections<br/>cards / clusters / writing"]
    Tokens["OKLCH design tokens<br/>+ data-viz palette<br/>(L-anchored Okabe-Ito,<br/>vizCardSafe, BrBG, cividis,<br/>cyclic)"]
    GitHubApi["GitHub API<br/>(server island, planned)"]
    R2["Cloudflare R2<br/>media CDN"]
    KV["Cloudflare KV<br/>runtime overrides<br/>+ privacy prefs"]
  end
  class Collections,Tokens,GitHubApi,R2,KV content

  subgraph Hosting["Hosting + CI"]
    Pages["Cloudflare Pages<br/>static + auto-deploy"]
    Workers["Cloudflare Workers<br/>server islands<br/>contact form<br/>RSS monitor (planned)"]
    GHA["GitHub Actions<br/>build + a11y + Lighthouse + Chromatic"]
  end
  class Pages,Workers,GHA hosting

  Scrambler --> Collections
  Knob --> Scrambler
  Avatar --> Collections
  CardOverlay --> Collections
  Writing --> Collections
  Review --> Collections
  DesignSystem --> Tokens

  WebMCP --> Collections
  WebMCP --> Glow
  WebMCP -.exposes.-> JsonLd
  WebMCP -.consumes.-> Anonymizer

  Pages --> Collections
  Workers --> KV
  Workers --> R2
  GHA --> Pages

  Collections --> Pages
  Tokens --> Pages
```

## Encoding

- **Green** nodes: human-first UX surfaces. The Scrambler orbital interaction is the navigation; Knob, Avatar, expanded card overlays are interactive surfaces; `/writing`, `/review`, `/design-system` are companion routes.
- **Amber** nodes: agent-facing surfaces. WebMCP tools (10 registered), `llms.txt`, JSON-LD structured data, the planned ai-plugin.json manifest, the tool-in-flight glow, and the offline anonymizer that produces the post-launch D1 / D2 viz dataset.
- **Neutral grey** nodes: the shared content layer that both audiences read from. Astro Content Collections (cards / clusters / writing — typed YAML schema validated by Zod), the OKLCH design tokens (brand + viz palette), GitHub API, R2 media CDN, KV for runtime overrides + privacy preferences.
- **Blue** nodes: hosting + CI infrastructure. Cloudflare Pages for static delivery, Workers for server islands and form handling, GitHub Actions for build + a11y + Lighthouse + visual regression.

## Why dual-audience by design

A site that lists tools, shares a profile, and surfaces work should be just as legible to an agent acting on a human's behalf as it is directly to a human in a browser. The architecture treats both as first-class consumers — the same content collection feeds both, the same privacy preferences govern both, the same accessibility wins (semantic HTML, alt text, ARIA landmarks) help both. Agent transparency, cognitive amplification, taste-conducive interaction, privacy-by-design defaults, and progressive enhancement are the principles documented in `/design-system` under AI Interaction Design.
