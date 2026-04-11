import { describe, it, expect } from 'vitest';
import {
  createContentPool,
  filterCards,
  createDynamicCluster,
  rearrangeByFocus,
} from '../../src/lib/scrambler/content-pool';
import type { ScramblerCard, ScramblerCluster } from '../../src/lib/scrambler/types';

const mockCards: ScramblerCard[] = [
  {
    id: 'soil',
    type: 'portfolio',
    title: 'Sustain Our Soil',
    summary: 'Interactive data app',
    tags: ['python', 'plotly', 'data-viz', 'geospatial'],
    order: 0,
  },
  {
    id: 'freedom-map',
    type: 'portfolio',
    title: 'Freedom Map',
    summary: 'QGIS diplomacy map',
    tags: ['qgis', 'geospatial', 'design'],
    order: 1,
  },
  {
    id: 'pycon-talk',
    type: 'talk',
    title: 'PyCon Maintainers Summit',
    summary: 'Open source community',
    tags: ['python', 'open-source', 'speaking'],
    order: 0,
  },
  {
    id: 'oklch-article',
    type: 'writing',
    title: 'OKLCH for Data Viz',
    summary: 'Color science article',
    tags: ['color', 'data-viz', 'css'],
    order: 0,
  },
  {
    id: 'github-repos',
    type: 'repo',
    title: 'Open Source Code',
    summary: 'GitHub repositories',
    tags: ['python', 'open-source'],
    order: 0,
  },
];

const mockClusters: ScramblerCluster[] = [
  { id: 'featured', label: 'Featured Work', orbit: 'inner', cards: [mockCards[0], mockCards[1]], order: 0 },
  { id: 'speak', label: 'Hear Me Speak', orbit: 'middle', cards: [mockCards[2]], order: 1 },
  { id: 'read', label: 'Read My Work', orbit: 'outer', cards: [mockCards[3]], order: 2 },
];

describe('Content pool', () => {
  describe('createContentPool', () => {
    it('creates a pool from cards and clusters', () => {
      const pool = createContentPool(mockCards, mockClusters);
      expect(pool.cards).toHaveLength(5);
      expect(pool.clusters).toHaveLength(3);
    });
  });

  describe('filterCards', () => {
    it('filters by tags', () => {
      const result = filterCards(mockCards, { tags: ['python'] });
      expect(result).toHaveLength(3); // soil, pycon, repos
      expect(result.every((c) => c.tags.includes('python'))).toBe(true);
    });

    it('filters by type', () => {
      const result = filterCards(mockCards, { types: ['portfolio'] });
      expect(result).toHaveLength(2);
    });

    it('filters by search (title + summary)', () => {
      const result = filterCards(mockCards, { search: 'diplomacy' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('freedom-map');
    });

    it('combines multiple filters with AND logic', () => {
      const result = filterCards(mockCards, {
        tags: ['python'],
        types: ['portfolio'],
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('soil');
    });

    it('returns all cards with empty filter', () => {
      const result = filterCards(mockCards, {});
      expect(result).toHaveLength(5);
    });
  });

  describe('createDynamicCluster', () => {
    it('creates a new cluster from filtered cards', () => {
      const cluster = createDynamicCluster(
        mockCards,
        { tags: ['data-viz'] },
        { label: 'Data Visualization', orbit: 'inner' },
      );
      expect(cluster.label).toBe('Data Visualization');
      expect(cluster.orbit).toBe('inner');
      expect(cluster.cards).toHaveLength(2); // soil, oklch article
    });

    it('generates a unique id', () => {
      const c1 = createDynamicCluster(mockCards, {}, { label: 'A' });
      const c2 = createDynamicCluster(mockCards, {}, { label: 'B' });
      expect(c1.id).not.toBe(c2.id);
    });
  });

  describe('rearrangeByFocus', () => {
    it('moves matching cluster to inner orbit', () => {
      const result = rearrangeByFocus(mockClusters, 'speak');
      const focused = result.find((c) => c.id === 'speak');
      expect(focused?.orbit).toBe('inner');
    });

    it('pushes other clusters outward', () => {
      const result = rearrangeByFocus(mockClusters, 'speak');
      const featured = result.find((c) => c.id === 'featured');
      expect(featured?.orbit).not.toBe('inner');
    });

    it('preserves all clusters', () => {
      const result = rearrangeByFocus(mockClusters, 'speak');
      expect(result).toHaveLength(3);
    });
  });
});
