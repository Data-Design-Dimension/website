import type {
  ScramblerCard,
  ScramblerCluster,
  ContentPool,
  ClusterFilter,
  OrbitLevel,
} from './types';

let clusterCounter = 0;

/**
 * Create a content pool from cards and clusters.
 * The pool is the single source of truth — clusters are views into it.
 */
export function createContentPool(
  cards: ScramblerCard[],
  clusters: ScramblerCluster[],
): ContentPool {
  return { cards, clusters };
}

/**
 * Filter cards by tags, types, and/or search query.
 * Multiple filters combine with AND logic.
 */
export function filterCards(
  cards: ScramblerCard[],
  filter: ClusterFilter,
): ScramblerCard[] {
  let result = cards;

  if (filter.tags && filter.tags.length > 0) {
    result = result.filter((card) =>
      filter.tags!.some((tag) => card.tags.includes(tag)),
    );
  }

  if (filter.types && filter.types.length > 0) {
    result = result.filter((card) => filter.types!.includes(card.type));
  }

  if (filter.search) {
    const query = filter.search.toLowerCase();
    result = result.filter(
      (card) =>
        card.title.toLowerCase().includes(query) ||
        card.summary.toLowerCase().includes(query),
    );
  }

  return result;
}

/**
 * Dynamically create a new cluster from the content pool.
 * Used by WebMCP tools to rearrange content at runtime.
 */
export function createDynamicCluster(
  cards: ScramblerCard[],
  filter: ClusterFilter,
  options: { label: string; orbit?: OrbitLevel },
): ScramblerCluster {
  const filtered = filterCards(cards, filter);
  clusterCounter++;

  return {
    id: `dynamic-${clusterCounter}-${Date.now()}`,
    label: options.label,
    orbit: options.orbit ?? 'inner',
    cards: filtered,
    order: 0,
  };
}

/**
 * Rearrange clusters by bringing one to the foreground.
 * The focused cluster moves to inner orbit.
 * Others shift outward (inner→middle, middle→outer, outer stays outer).
 *
 * This is the core of the WebMCP `focus_content` tool —
 * an agent says "show me the talks" and the Scrambler smoothly
 * reorders to bring talks forward.
 */
export function rearrangeByFocus(
  clusters: ScramblerCluster[],
  focusClusterId: string,
): ScramblerCluster[] {
  const orbitShift: Record<OrbitLevel, OrbitLevel> = {
    inner: 'middle',
    middle: 'outer',
    outer: 'outer',
  };

  return clusters.map((cluster) => {
    if (cluster.id === focusClusterId) {
      return { ...cluster, orbit: 'inner' as OrbitLevel };
    }
    return { ...cluster, orbit: orbitShift[cluster.orbit] };
  });
}
