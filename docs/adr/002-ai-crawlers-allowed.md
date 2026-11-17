# ADR 002: AI Crawlers Allowed; robots.txt Stays in Repo

## Status
Accepted (2026-05-11, during the Cloudflare apex cutover for dadeda.design)

## Context
The Cloudflare onboarding flow for `dadeda.design` presents two independent AI-bot controls:

1. **WAF-level** — *Control how AI crawlers scrape content for training*: hard-block at the edge (all pages / on pages with ads / do not block).
2. **robots.txt-level** — *Instruct AI bot traffic with robots.txt*: a toggle that injects `Disallow: /` directives for known AI training bots (GPTBot, ClaudeBot, Google-Extended, PerplexityBot, etc.) into the site's `robots.txt`.

The brand stance toward AI agents is already articulated elsewhere in the codebase:
- `public/llms.txt` exists and is structured specifically to communicate with LLM agents.
- The portfolio centers AI-enabled experiences (WebMCP work, Claude Code SDK content, talks on AI/data).
- The owner publishes writing intended to be discoverable through generative answer engines.

A deliberate, documented stance on AI crawlers is needed so future changes (e.g., a Cloudflare dashboard tweak by a contributor, or a new bot category) are evaluated against a known intent, not re-decided ad hoc.

## Decision
1. **WAF: Do not block (allow crawlers).** Cloudflare's edge does not interfere with AI bot traffic.
2. **Cloudflare's robots.txt toggle: OFF.** No edge-side injection of `Disallow` directives.
3. **`public/robots.txt` is the single source of truth** for crawler directives, kept in the repo and reviewed via PR like any other content.

## Alternatives Considered
- **Block AI crawlers via Cloudflare WAF.** Rejected — explicitly contradicts `public/llms.txt` and forecloses Answer Engine Optimization (AEO) and Generative Engine Optimization (GEO) channels. The portfolio's value to AI-aware audiences is partly that AI agents *can* find and reference it.
- **Allow at WAF, but inject opt-outs at robots.txt level.** Rejected as a half-measure. Well-behaved bots would skip the site (losing AEO/GEO) while bad actors who ignore `robots.txt` would still scrape — the worst of both. Also inconsistent with `llms.txt`.
- **Manage `robots.txt` via Cloudflare dashboard.** Rejected — splits crawler policy out of version control, makes it invisible to repo readers, and creates two surfaces (Cloudflare UI + repo file) that can drift. Keeping `robots.txt` in the repo means every change is reviewed in a PR and visible in git history.

## Consequences
- AI agents that ground responses in live web content (Perplexity, ChatGPT browse, Claude web search, Google AI Overviews via Google-Extended, etc.) can fetch `dadeda.design` and may cite it in generated answers.
- Discovery through generative answer engines becomes a viable channel alongside traditional search.
- `public/llms.txt` remains the canonical positive signal to AI agents; `public/robots.txt` remains the canonical control surface for any future fine-grained opt-outs or opt-ins.
- Traditional SEO (Googlebot, Bing, etc.) is unaffected — those crawlers are not AI training bots and would not be touched by the robots.txt AI directives in any case.
- If the brand stance changes later, the revisit path is: update `public/robots.txt` and `public/llms.txt` in the repo via PR; flip the Cloudflare WAF setting in the same change window so the policy is consistent across layers. This ADR becomes superseded.
