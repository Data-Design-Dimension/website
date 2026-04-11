import type { ScramblerCard, ScramblerCluster } from './types';

/**
 * Sample data for development and Storybook.
 * Will be replaced by Content Collections data in production.
 */

export const sampleCards: ScramblerCard[] = [
  {
    id: 'sustain-our-soil',
    type: 'portfolio',
    title: 'Sustain Our Soil',
    summary: 'Interactive Python Plotly Dash app exploring soil health, food trade, and climate change.',
    tags: ['python', 'plotly-dash', 'geospatial', 'data-viz'],
    cta: { label: 'Read case study', url: '/work/sustain-our-soil', external: false },
    order: 0,
  },
  {
    id: 'freedom-map',
    type: 'portfolio',
    title: 'Freedom & Diplomacy Map',
    summary: 'QGIS static map for a diplomacy nonprofit fundraising appeal.',
    tags: ['qgis', 'geospatial', 'design', 'nonprofit'],
    cta: { label: 'Read case study', url: '/work/freedom-map', external: false },
    order: 1,
  },
  {
    id: 'invest-as-one',
    type: 'portfolio',
    title: 'Invest as One',
    summary: 'Tableau Story prototype for a city budget proposal — one dataset, two audiences.',
    tags: ['tableau', 'data-viz', 'storytelling'],
    cta: { label: 'Read case study', url: '/work/invest-as-one', external: false },
    order: 2,
  },
  {
    id: 'redistricting',
    type: 'portfolio',
    title: 'Redistricting Map',
    summary: 'Animated Plotly Dash choropleth exploring U.S. population change and redistricting.',
    tags: ['python', 'plotly-dash', 'geospatial'],
    cta: { label: 'View app', url: 'https://dadeda.pythonanywhere.com/', external: true },
    order: 3,
  },
  {
    id: 'pycon-talk',
    type: 'talk',
    title: 'PyCon Maintainers Summit',
    summary: 'Talk on open source community development and contribution models.',
    tags: ['python', 'open-source', 'speaking'],
    order: 0,
  },
  {
    id: 'plotly-workshop',
    type: 'talk',
    title: 'Customizing Plotly Styles',
    summary: 'Outlier Unconf workshop on visual customization in Plotly.',
    tags: ['plotly', 'data-viz', 'teaching'],
    order: 1,
  },
  {
    id: 'oklch-article',
    type: 'writing',
    title: 'Building with OKLCH',
    summary: 'Why perceptually uniform color changes everything for data visualization.',
    tags: ['color', 'data-viz', 'css'],
    cta: { label: 'Read article', url: '/writing/oklch', external: false },
    order: 0,
  },
  {
    id: 'nightingale',
    type: 'writing',
    title: 'Nightingale Contributions',
    summary: 'Contributing author and editor for the Data Visualization Society journal.',
    tags: ['data-viz', 'writing', 'editing'],
    cta: { label: 'View on DVS', url: 'https://nightingaledvs.com', external: true },
    order: 1,
  },
  {
    id: 'github-repos',
    type: 'repo',
    title: 'Open Source Code',
    summary: 'Python, data viz, and web development on GitHub.',
    tags: ['python', 'open-source', 'github'],
    cta: { label: 'View repos', url: 'https://github.com/Data-Design-Dimension', external: true },
    order: 0,
  },
  {
    id: 'how-this-works',
    type: 'meta',
    title: 'How This Site Works',
    summary: 'Astro + Svelte + CSS 3D. The architecture is the portfolio.',
    tags: ['meta', 'engineering', 'architecture'],
    cta: { label: 'Design system', url: '/design-system', external: false },
    order: 0,
  },
];

export const sampleClusters: ScramblerCluster[] = [
  {
    id: 'featured-work',
    label: 'Featured Work',
    orbit: 'inner',
    cards: sampleCards.filter((c) => c.type === 'portfolio'),
    order: 0,
  },
  {
    id: 'hear-me-speak',
    label: 'Hear Me Speak',
    orbit: 'middle',
    cards: sampleCards.filter((c) => c.type === 'talk'),
    order: 1,
  },
  {
    id: 'read-my-work',
    label: 'Read My Work',
    orbit: 'outer',
    cards: sampleCards.filter((c) => ['writing', 'repo', 'meta'].includes(c.type)),
    order: 2,
  },
];
