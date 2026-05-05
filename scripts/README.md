# scripts

## github-anonymize.ts

Pulls Kathryn's GitHub network across personal + DADEDA + Fantasy + other-client orgs, anonymizes it, and writes a snapshot to `src/data/github-network.json`. The snapshot feeds the D1 (force-directed network) and D2 (solar-terminator timelapse) viz cards described in the project plan.

### Privacy posture

- Contributor logins replaced with `sha256(login + ANON_SALT)` truncated to 12 chars. The salt MUST be stable across runs so the same login hashes the same way (otherwise the network shape changes between snapshots for no reason).
- Repo names stripped. Surfaced only as owner-account category counts.
- Commit messages: never read.
- Commit timestamps bucketed to ISO week (e.g. `2025-W12`).
- Locations geocoded via a small built-in lookup, rounded to ~1° (≈ 110 km). Cities with fewer than k=3 distinct contributors aggregate up to country.
- The `LOCATION_LOOKUP` and `OWNERS` lists in the script are extended manually; nothing leaves the local machine.

### Run

```sh
GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
ANON_SALT=$(openssl rand -hex 32) \
pnpm dlx tsx scripts/github-anonymize.ts
```

`GH_TOKEN` needs `read:user` and `repo` scope (the latter so private Fantasy / client-org repos are visible — Kathryn is GitHub admin on Fantasy per the plan).

Save the `ANON_SALT` somewhere stable (1Password, .env.local) and reuse it on every run. Rotating the salt rebuilds the entire identity space; only do it intentionally.

### Dry run (no API calls, no token needed)

Validates the anonymizer + threshold logic against a built-in fixture:

```sh
pnpm dlx tsx scripts/github-anonymize.ts --dry-run
```

Useful when iterating on the script itself or showing the threshold gate's behavior without burning API quota.

### What the threshold gate decides

The script compares the snapshot against three D2 (solar-terminator viz) requirements:

| Threshold | Minimum |
|---|---|
| Distinct rolled-up locations | 5 |
| Distinct UTC offset bands | 3 |
| Commit events with usable `coarseLocation` | 30 |

If all three clear, `thresholds.d2GateClears` is `true` and the recommendation is `ship`. Otherwise the recommendation is `fall-back-to-d1-only` and D2 should render the transparency panel from the plan ("Global collaboration — insufficient public location data to map honestly") instead of a misleading sparse globe.

D1 (force-directed network) ships regardless — it doesn't depend on location data.

### Extending the location lookup

`LOCATION_LOOKUP` in the script is intentionally small. When a real run reports contributors whose `location` is unrecognized, add them to the lookup table by hand rather than calling out to a geocoding API. Keeps the spike dependency-free and the rounding rule explicit.

### Output shape

```ts
{
  generatedAt: '2026-05-04T...',
  generatedFrom: 'live-api' | 'dry-run-fixture',
  categories: ['Personal', 'DADEDA', 'Fantasy', 'OtherClient'],
  thresholds: { eligibleLocations, eligibleUtcBands, eligibleEvents, d2GateClears, d2Recommendation },
  contributors: AnonContributor[],   // hashed id, category, isKathryn, coarseLocation
  events: AnonEvent[],               // bucket (ISO week), ownerCategory, contributorId, coarseLocation
  edges: AnonEdge[],                 // source, target, weight (shared events)
}
```

Consumed by the D1 / D2 Svelte islands. The site's build step reads it directly; if it grows large, gzip + serve from R2 / KV per the plan.
