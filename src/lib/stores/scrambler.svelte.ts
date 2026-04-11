import type {
  ScramblerCard,
  ScramblerCluster,
  ClusterFilter,
  OrbitLevel,
} from '../scrambler/types';
import {
  createContentPool,
  filterCards,
  createDynamicCluster,
  rearrangeByFocus,
} from '../scrambler/content-pool';

/**
 * Reactive Scrambler store using Svelte 5 runes.
 *
 * This is the single source of truth for the Scrambler's state.
 * WebMCP tools, user interactions, and API responses all write here.
 * The Scrambler component reads from here and renders reactively.
 */

let allCards = $state<ScramblerCard[]>([]);
let clusters = $state<ScramblerCluster[]>([]);

export function initializePool(
  cards: ScramblerCard[],
  initialClusters: ScramblerCluster[],
) {
  const pool = createContentPool(cards, initialClusters);
  allCards = pool.cards;
  clusters = pool.clusters;
}

export function getClusters(): ScramblerCluster[] {
  return clusters;
}

export function getAllCards(): ScramblerCard[] {
  return allCards;
}

/**
 * Bring a cluster to the foreground.
 * Called by WebMCP `focus_content` tool or user interaction.
 */
export function focusCluster(clusterId: string) {
  clusters = rearrangeByFocus(clusters, clusterId);
}

/**
 * Create a new cluster dynamically from filtered cards.
 * Called by WebMCP `create_cluster` tool.
 */
export function addDynamicCluster(
  filter: ClusterFilter,
  options: { label: string; orbit?: OrbitLevel },
) {
  const newCluster = createDynamicCluster(allCards, filter, options);
  clusters = [...clusters, newCluster];
  return newCluster;
}

/**
 * Search across all cards.
 * Called by WebMCP `search_content` tool.
 */
export function searchCards(query: string): ScramblerCard[] {
  return filterCards(allCards, { search: query });
}

/**
 * Reset clusters to a given arrangement.
 * Used for restoring default state.
 */
export function resetClusters(newClusters: ScramblerCluster[]) {
  clusters = newClusters;
}
