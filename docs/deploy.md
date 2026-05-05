# Deploy

The site is a static Astro build. Two paths to a Cloudflare Pages staging URL.

## Recommended: GitHub → Cloudflare Pages dashboard (auto-deploy on push)

One-time setup, ~5 minutes. After setup, every push to `main` triggers a fresh deploy.

1. Go to <https://dash.cloudflare.com/?to=/:account/workers-and-pages>.
2. **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
3. Authorize Cloudflare to access the `Data-Design-Dimension/website` repository.
4. Select the repo. Configure the build:
   - **Production branch**: `main`
   - **Framework preset**: Astro
   - **Build command**: `pnpm build`
   - **Build output directory**: `dist`
   - **Root directory**: (empty / repo root)
   - **Environment variables**:
     - `NODE_VERSION` = `22` (or `20` — both work; the `engines` field
       in package.json says `>=24` which is aspirational, but the build
       does not actually require Node 24-specific features. If Cloudflare's
       Node 22 build fails on the engines check, set `NPM_FLAGS=--ignore-engines`
       or relax the engines field in package.json to `>=20`.)
     - `PNPM_VERSION` = `10.33.0` (or whatever matches the `pnpm-lock.yaml`)
5. Save and deploy. First build takes ~3-5 minutes.
6. Cloudflare gives you a staging URL like `dadeda-design.pages.dev` — that's the staging preview.
7. Each PR / push gets its own preview URL automatically.

### Cutover to apex (when ready)

8. In Cloudflare Pages → **Custom domains** → **Set up a custom domain**.
9. Enter `dadeda.design`. Cloudflare guides you through the DNS step:
   - If `dadeda.design` is on Cloudflare DNS (recommended): one-click.
   - If on Porkbun (current): add the CNAME / A records Cloudflare specifies.
10. Apex now points to the latest production deploy on main.

The `*.pages.dev` URL stays active in parallel — useful for "look at it without affecting prod" review.

## Alternative: direct CLI deploy via wrangler

Faster for one-off deploys without touching the dashboard, but requires authenticating once.

```sh
# One-time: open browser, OAuth, save creds locally.
pnpm dlx wrangler login

# Build and deploy a specific dist:
pnpm build
pnpm dlx wrangler pages deploy dist --project-name=dadeda-design
```

Wrangler creates / uses a Pages project named `dadeda-design`. The first deploy provisions it; subsequent deploys go to the same project.

## Rollback

- Dashboard: Pages → project → Deployments → click any past deploy → **Rollback to this deployment**.
- CLI: `wrangler pages deployment list --project-name=dadeda-design` then `wrangler pages deployment rollback <id> --project-name=dadeda-design`.
