/**
 * GitHub network anonymizer — data-spike for the D1 / D2 viz cards.
 *
 * Pulls Kathryn's repos and contributors across personal + DADEDA +
 * Fantasy + other-client orgs, anonymizes everything, and writes a
 * snapshot to src/data/github-network.json.
 *
 * The snapshot is what the D1 force-directed graph and the D2 solar-
 * terminator timelapse will read at build time. Per plan, the long-term
 * version of this lives on a Cloudflare Worker; for the spike, this
 * Node script produces a pre-built data file we can iterate on.
 *
 * Privacy posture (mirrors the plan's D2 rules):
 * - Contributor identity: replaced with stable opaque hashes derived
 *   from `sha256(login + ANON_SALT)`. Salt MUST be set via env var so
 *   the same login hashes the same way across runs.
 * - Repo identity: stripped. Repos surface only as a category code
 *   (Personal / DADEDA / Fantasy / OtherClient) and a count.
 * - Commit messages: never read.
 * - Commit timestamps: bucketed to ISO week (YYYY-Www). Week resolution
 *   is enough to show acceleration without exposing privileged dates.
 * - Location: contributor public `location` text is geocoded once via
 *   a small built-in lookup table (extend manually as needed). Output
 *   coordinates rounded to 1° (≈110 km). Cities with fewer than k=3
 *   distinct contributors aggregate up to country.
 *
 * Threshold gate for D2 (solar-terminator viz): ships only if the
 * dataset clears ≥5 rolled-up locations across ≥3 UTC offset bands
 * AND ≥30 events with usable coarseLocation. Below threshold, D2
 * falls back to a transparency panel and only D1 ships.
 *
 * Run:
 *   GH_TOKEN=ghp_xxx ANON_SALT=somelongsecret pnpm dlx tsx scripts/github-anonymize.ts
 *
 * Or with a fixture file (no API calls, useful for testing the
 * anonymizer + threshold logic):
 *   pnpm dlx tsx scripts/github-anonymize.ts --dry-run
 */

import { createHash } from 'node:crypto';
import { writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';

// ============================================================================
// Configuration
// ============================================================================

const OWNERS: { login: string; category: OwnerCategory; isOrg: boolean }[] = [
  { login: 'khurchla', category: 'Personal', isOrg: false },
  { login: 'Data-Design-Dimension', category: 'DADEDA', isOrg: true },
  { login: 'fantasy-co', category: 'Fantasy', isOrg: true },
  // Add other client orgs as Kathryn confirms NDA-compatible inclusion:
  // { login: '<org>', category: 'OtherClient', isOrg: true },
];

const KATHRYN_LOGIN = 'khurchla';
const ANON_SALT = process.env.ANON_SALT;
const GH_TOKEN = process.env.GH_TOKEN;
const DRY_RUN = process.argv.includes('--dry-run');

const OUTPUT_PATH = join(process.cwd(), 'src/data/github-network.json');

// k for k-anonymity location aggregation: cities with fewer than k
// distinct contributors roll up to country (or larger region).
const K_ANONYMITY = 3;

// D2 threshold gates.
const D2_MIN_LOCATIONS = 5;
const D2_MIN_UTC_BANDS = 3;
const D2_MIN_EVENTS = 30;

// ============================================================================
// Types
// ============================================================================

type OwnerCategory = 'Personal' | 'DADEDA' | 'Fantasy' | 'OtherClient';

interface CoarseLocation {
  lat: number; // rounded to 1°
  lon: number; // rounded to 1°
  region: string; // city or country label
  utcOffset: number; // approximate UTC offset in hours
}

interface AnonContributor {
  id: string; // sha256 hash, prefix 12 chars
  category: OwnerCategory;
  isKathryn: boolean;
  coarseLocation: CoarseLocation | null;
}

interface AnonEvent {
  // ISO week bucket: YYYY-Www
  bucket: string;
  ownerCategory: OwnerCategory;
  contributorId: string;
  // Snapshot of the contributor's location at this event (in case it changes).
  coarseLocation: CoarseLocation | null;
}

interface AnonEdge {
  source: string;
  target: string;
  weight: number; // shared events
}

interface NetworkSnapshot {
  generatedAt: string;
  generatedFrom: 'live-api' | 'dry-run-fixture';
  categories: OwnerCategory[];
  thresholds: {
    eligibleLocations: number;
    eligibleUtcBands: number;
    eligibleEvents: number;
    d2GateClears: boolean;
    d2Recommendation: 'ship' | 'fall-back-to-d1-only';
  };
  contributors: AnonContributor[];
  events: AnonEvent[];
  edges: AnonEdge[];
}

// ============================================================================
// Anonymization helpers
// ============================================================================

function hashLogin(login: string): string {
  if (!ANON_SALT) {
    throw new Error(
      'ANON_SALT env var required. Use a long random string and keep it stable across runs so the same login hashes the same way.',
    );
  }
  return createHash('sha256').update(login + ANON_SALT).digest('hex').slice(0, 12);
}

/**
 * Geocode a free-text GitHub `location` profile field to coarse lat/lon
 * + UTC offset. This intentionally uses a small built-in lookup so we
 * don't depend on an external service for the spike. Extend manually as
 * needed; unrecognized locations return null and the contributor is
 * omitted from the geographic viz (still counted in the network graph).
 */
const LOCATION_LOOKUP: Record<string, CoarseLocation> = {
  // Lower-case keys; matched against the lowercased location string.
  philadelphia: { lat: 40, lon: -75, region: 'Philadelphia', utcOffset: -5 },
  philly: { lat: 40, lon: -75, region: 'Philadelphia', utcOffset: -5 },
  'new york': { lat: 41, lon: -74, region: 'New York', utcOffset: -5 },
  nyc: { lat: 41, lon: -74, region: 'New York', utcOffset: -5 },
  'los angeles': { lat: 34, lon: -118, region: 'Los Angeles', utcOffset: -8 },
  'san francisco': { lat: 38, lon: -122, region: 'San Francisco', utcOffset: -8 },
  seattle: { lat: 48, lon: -122, region: 'Seattle', utcOffset: -8 },
  london: { lat: 51, lon: 0, region: 'London', utcOffset: 0 },
  berlin: { lat: 52, lon: 13, region: 'Berlin', utcOffset: 1 },
  paris: { lat: 49, lon: 2, region: 'Paris', utcOffset: 1 },
  amsterdam: { lat: 52, lon: 5, region: 'Amsterdam', utcOffset: 1 },
  tokyo: { lat: 36, lon: 140, region: 'Tokyo', utcOffset: 9 },
  singapore: { lat: 1, lon: 104, region: 'Singapore', utcOffset: 8 },
  sydney: { lat: -34, lon: 151, region: 'Sydney', utcOffset: 10 },
  bangalore: { lat: 13, lon: 78, region: 'Bangalore', utcOffset: 5.5 },
  bengaluru: { lat: 13, lon: 78, region: 'Bangalore', utcOffset: 5.5 },
  // Country-level fallbacks.
  usa: { lat: 39, lon: -98, region: 'United States', utcOffset: -6 },
  'united states': { lat: 39, lon: -98, region: 'United States', utcOffset: -6 },
  uk: { lat: 54, lon: -2, region: 'United Kingdom', utcOffset: 0 },
  germany: { lat: 51, lon: 10, region: 'Germany', utcOffset: 1 },
  india: { lat: 21, lon: 78, region: 'India', utcOffset: 5.5 },
  brazil: { lat: -10, lon: -55, region: 'Brazil', utcOffset: -3 },
};

function geocode(rawLocation: string | null): CoarseLocation | null {
  if (!rawLocation) return null;
  const norm = rawLocation.trim().toLowerCase();
  // Direct match.
  if (LOCATION_LOOKUP[norm]) return LOCATION_LOOKUP[norm];
  // Substring scan (e.g., "Philly, PA" matches "philly").
  for (const key of Object.keys(LOCATION_LOOKUP)) {
    if (norm.includes(key)) return LOCATION_LOOKUP[key];
  }
  return null;
}

/**
 * k-anonymity rollup: any region with fewer than K_ANONYMITY distinct
 * contributors aggregates up to its country (using the LOCATION_LOOKUP
 * country fallbacks). Keeps the spike honest about who is identifiable.
 */
function applyKAnonymity(contributors: AnonContributor[]): AnonContributor[] {
  const regionCounts = new Map<string, number>();
  for (const c of contributors) {
    if (c.coarseLocation) {
      regionCounts.set(c.coarseLocation.region, (regionCounts.get(c.coarseLocation.region) ?? 0) + 1);
    }
  }

  const COUNTRY_FALLBACK: Record<string, CoarseLocation> = {
    Philadelphia: LOCATION_LOOKUP['united states'],
    'New York': LOCATION_LOOKUP['united states'],
    'Los Angeles': LOCATION_LOOKUP['united states'],
    'San Francisco': LOCATION_LOOKUP['united states'],
    Seattle: LOCATION_LOOKUP['united states'],
    London: LOCATION_LOOKUP['uk'],
    Paris: { ...LOCATION_LOOKUP['germany'], region: 'Western Europe' },
    Berlin: LOCATION_LOOKUP['germany'],
    Amsterdam: { ...LOCATION_LOOKUP['germany'], region: 'Western Europe' },
    Bangalore: LOCATION_LOOKUP['india'],
  };

  return contributors.map((c) => {
    if (!c.coarseLocation) return c;
    const count = regionCounts.get(c.coarseLocation.region) ?? 0;
    if (count >= K_ANONYMITY) return c;
    const fallback = COUNTRY_FALLBACK[c.coarseLocation.region];
    return fallback ? { ...c, coarseLocation: fallback } : c;
  });
}

function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// ============================================================================
// GitHub API client (plain fetch, no Octokit dependency)
// ============================================================================

interface GhRepo {
  name: string;
  owner: { login: string };
  private: boolean;
}

interface GhContributor {
  login: string;
  contributions: number;
}

interface GhUser {
  login: string;
  location: string | null;
}

interface GhCommit {
  author: { date: string } | null;
  committer: { date: string } | null;
  user: { login: string } | null;
}

async function ghFetch<T>(path: string): Promise<T> {
  if (!GH_TOKEN) throw new Error('GH_TOKEN required for live fetches.');
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${path}: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

async function listOwnerRepos(owner: { login: string; isOrg: boolean }): Promise<GhRepo[]> {
  const path = owner.isOrg ? `/orgs/${owner.login}/repos` : `/users/${owner.login}/repos`;
  const all: GhRepo[] = [];
  for (let page = 1; page < 20; page++) {
    const repos = await ghFetch<GhRepo[]>(`${path}?per_page=100&page=${page}&type=all`);
    all.push(...repos);
    if (repos.length < 100) break;
  }
  return all;
}

async function listRepoContributors(owner: string, repo: string): Promise<GhContributor[]> {
  return ghFetch<GhContributor[]>(`/repos/${owner}/${repo}/contributors?per_page=100&anon=false`);
}

async function getUser(login: string): Promise<GhUser> {
  return ghFetch<GhUser>(`/users/${login}`);
}

async function listRepoCommits(owner: string, repo: string, since: string): Promise<GhCommit[]> {
  const all: GhCommit[] = [];
  for (let page = 1; page < 10; page++) {
    const commits = await ghFetch<GhCommit[]>(
      `/repos/${owner}/${repo}/commits?per_page=100&page=${page}&since=${since}`,
    );
    all.push(...commits);
    if (commits.length < 100) break;
  }
  return all;
}

// ============================================================================
// Live data pipeline
// ============================================================================

async function buildSnapshotFromApi(): Promise<NetworkSnapshot> {
  const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(); // last year
  const userCache = new Map<string, GhUser>();
  const contributorMap = new Map<string, AnonContributor>();
  const events: AnonEvent[] = [];
  const coContributorPairs = new Map<string, number>();

  for (const owner of OWNERS) {
    console.log(`[scan] ${owner.login} (${owner.category})`);
    const repos = await listOwnerRepos(owner);
    for (const repo of repos) {
      console.log(`  - ${repo.name}`);
      // Pull contributors and commits in parallel.
      const [contributors, commits] = await Promise.all([
        listRepoContributors(owner.login, repo.name).catch(() => [] as GhContributor[]),
        listRepoCommits(owner.login, repo.name, since).catch(() => [] as GhCommit[]),
      ]);

      const repoContributorIds: string[] = [];
      for (const contrib of contributors) {
        if (!userCache.has(contrib.login)) {
          userCache.set(contrib.login, await getUser(contrib.login));
        }
        const user = userCache.get(contrib.login)!;
        const id = hashLogin(contrib.login);
        if (!contributorMap.has(id)) {
          contributorMap.set(id, {
            id,
            category: owner.category,
            isKathryn: contrib.login === KATHRYN_LOGIN,
            coarseLocation: geocode(user.location),
          });
        }
        repoContributorIds.push(id);
      }

      // Co-contribution edges within this repo (undirected).
      for (let i = 0; i < repoContributorIds.length; i++) {
        for (let j = i + 1; j < repoContributorIds.length; j++) {
          const key = [repoContributorIds[i], repoContributorIds[j]].sort().join('|');
          coContributorPairs.set(key, (coContributorPairs.get(key) ?? 0) + 1);
        }
      }

      // Events from commits.
      for (const commit of commits) {
        const ts = commit.author?.date ?? commit.committer?.date;
        const login = commit.user?.login;
        if (!ts || !login) continue;
        if (!userCache.has(login)) {
          userCache.set(login, await getUser(login).catch(() => ({ login, location: null })));
        }
        const user = userCache.get(login)!;
        const id = hashLogin(login);
        events.push({
          bucket: isoWeek(new Date(ts)),
          ownerCategory: owner.category,
          contributorId: id,
          coarseLocation: geocode(user.location),
        });
      }
    }
  }

  const contributors = applyKAnonymity(Array.from(contributorMap.values()));
  const edges: AnonEdge[] = Array.from(coContributorPairs.entries()).map(([key, weight]) => {
    const [source, target] = key.split('|');
    return { source, target, weight };
  });

  return finalize(contributors, events, edges, 'live-api');
}

// ============================================================================
// Dry-run fixture (so the threshold logic is testable without a token)
// ============================================================================

function buildSnapshotFromFixture(): NetworkSnapshot {
  const fixture: AnonContributor[] = [
    { id: 'k0000000', category: 'Personal', isKathryn: true, coarseLocation: LOCATION_LOOKUP['philadelphia'] },
    { id: 'a0000001', category: 'DADEDA', isKathryn: false, coarseLocation: LOCATION_LOOKUP['philadelphia'] },
    { id: 'b0000002', category: 'DADEDA', isKathryn: false, coarseLocation: LOCATION_LOOKUP['philadelphia'] },
    { id: 'c0000003', category: 'Fantasy', isKathryn: false, coarseLocation: LOCATION_LOOKUP['new york'] },
    { id: 'd0000004', category: 'Fantasy', isKathryn: false, coarseLocation: LOCATION_LOOKUP['london'] },
    { id: 'e0000005', category: 'Fantasy', isKathryn: false, coarseLocation: LOCATION_LOOKUP['london'] },
    { id: 'f0000006', category: 'Fantasy', isKathryn: false, coarseLocation: LOCATION_LOOKUP['berlin'] },
    { id: 'g0000007', category: 'OtherClient', isKathryn: false, coarseLocation: LOCATION_LOOKUP['tokyo'] },
    { id: 'h0000008', category: 'OtherClient', isKathryn: false, coarseLocation: LOCATION_LOOKUP['bangalore'] },
  ];
  const events: AnonEvent[] = [];
  for (let w = 1; w <= 52; w++) {
    const bucket = `2025-W${String(w).padStart(2, '0')}`;
    for (const c of fixture) {
      events.push({
        bucket,
        ownerCategory: c.category,
        contributorId: c.id,
        coarseLocation: c.coarseLocation,
      });
    }
  }
  const edges: AnonEdge[] = [
    { source: 'k0000000', target: 'a0000001', weight: 12 },
    { source: 'k0000000', target: 'c0000003', weight: 24 },
    { source: 'k0000000', target: 'd0000004', weight: 18 },
  ];
  const contributors = applyKAnonymity(fixture);
  return finalize(contributors, events, edges, 'dry-run-fixture');
}

// ============================================================================
// Threshold gate + finalize
// ============================================================================

function finalize(
  contributors: AnonContributor[],
  events: AnonEvent[],
  edges: AnonEdge[],
  source: 'live-api' | 'dry-run-fixture',
): NetworkSnapshot {
  const eligibleEvents = events.filter((e) => e.coarseLocation !== null);
  const regions = new Set(eligibleEvents.map((e) => e.coarseLocation!.region));
  const utcBands = new Set(eligibleEvents.map((e) => Math.floor(e.coarseLocation!.utcOffset / 4)));

  const eligibleLocations = regions.size;
  const eligibleUtcBands = utcBands.size;
  const eligibleEventsCount = eligibleEvents.length;

  const d2GateClears =
    eligibleLocations >= D2_MIN_LOCATIONS &&
    eligibleUtcBands >= D2_MIN_UTC_BANDS &&
    eligibleEventsCount >= D2_MIN_EVENTS;

  return {
    generatedAt: new Date().toISOString(),
    generatedFrom: source,
    categories: ['Personal', 'DADEDA', 'Fantasy', 'OtherClient'],
    thresholds: {
      eligibleLocations,
      eligibleUtcBands,
      eligibleEvents: eligibleEventsCount,
      d2GateClears,
      d2Recommendation: d2GateClears ? 'ship' : 'fall-back-to-d1-only',
    },
    contributors,
    events,
    edges,
  };
}

// ============================================================================
// Entry point
// ============================================================================

async function main() {
  const snapshot = DRY_RUN ? buildSnapshotFromFixture() : await buildSnapshotFromApi();
  await writeFile(OUTPUT_PATH, JSON.stringify(snapshot, null, 2));
  console.log(`\nWrote ${OUTPUT_PATH}`);
  console.log(`  contributors: ${snapshot.contributors.length}`);
  console.log(`  events:       ${snapshot.events.length}`);
  console.log(`  edges:        ${snapshot.edges.length}`);
  console.log(`\nD2 threshold gate:`);
  console.log(`  eligible locations: ${snapshot.thresholds.eligibleLocations} / ${D2_MIN_LOCATIONS} required`);
  console.log(`  UTC bands:          ${snapshot.thresholds.eligibleUtcBands} / ${D2_MIN_UTC_BANDS} required`);
  console.log(`  events with loc:    ${snapshot.thresholds.eligibleEvents} / ${D2_MIN_EVENTS} required`);
  console.log(`  → ${snapshot.thresholds.d2GateClears ? 'D2 SHIPS' : 'D2 falls back to transparency panel'}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
