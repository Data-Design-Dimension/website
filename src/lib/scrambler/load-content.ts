import { getCollection, type CollectionEntry } from 'astro:content';
import type { ScramblerCard, ScramblerCluster } from './types';

/**
 * Hydrate Astro Content Collection entries into the runtime shape the
 * Scrambler components consume. Cluster YAML stores `cardIds: string[]`;
 * this resolves them into embedded ScramblerCard objects, filters out
 * archived cards, and sorts within each cluster by `order`.
 */
export async function loadClusters(): Promise<ScramblerCluster[]> {
  const [cardEntries, clusterEntries] = await Promise.all([
    getCollection('cards'),
    getCollection('clusters'),
  ]);

  const cardsById = new Map<string, ScramblerCard>();
  for (const entry of cardEntries as CollectionEntry<'cards'>[]) {
    if (entry.data.archived) continue;
    cardsById.set(entry.id, { id: entry.id, ...entry.data } as ScramblerCard);
  }

  return (clusterEntries as CollectionEntry<'clusters'>[])
    .map((entry) => ({
      id: entry.id,
      label: entry.data.label,
      orbit: entry.data.orbit,
      order: entry.data.order,
      cards: entry.data.cardIds
        .map((id) => cardsById.get(id))
        .filter((c): c is ScramblerCard => c !== undefined)
        .sort((a, b) => a.order - b.order),
    }))
    .sort((a, b) => a.order - b.order);
}
