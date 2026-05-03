import type { ScramblerCard, ScramblerCluster } from './types';

/**
 * Sample data for development and Storybook.
 * Will be replaced by Content Collections data in production.
 */

export const sampleCards: ScramblerCard[] = [
  {
    id: 'do-websites-need-pages',
    type: 'portfolio',
    title: 'Do Websites Need Pages?',
    summary: 'Speculative web app prototype demoed by Fantasy. I built the working application that explores what happens when AI agents drive the UI instead of static pages.',
    tags: ['fantasy', 'ai', 'agents', 'webmcp', 'prototype', 'speculative'],
    cta: { label: 'Watch demo (12:32)', url: 'https://fantasy.co/latest/do-websites-need-pages', external: true },
    order: 0,
  },
  {
    id: 'sustain-our-soil',
    type: 'portfolio',
    title: 'Sustain Our Soil',
    summary: 'Interactive Python Plotly Dash app exploring soil health, food trade, and climate change.',
    tags: ['python', 'plotly-dash', 'geospatial', 'data-viz'],
    cta: { label: 'Read case study', url: '/work/sustain-our-soil', external: false },
    order: 1,
  },
  {
    id: 'mica-capstone',
    type: 'portfolio',
    title: 'MICA MPS Capstone',
    summary: 'Master\'s capstone in Data Analytics & Visualization at MICA. The institutional showcase of my graduate research and project work.',
    tags: ['mica', 'mps', 'capstone', 'data-viz', 'academic'],
    cta: { label: 'View on MICA', url: 'https://www.mica.edu/about-mica/offices-divisions/school-of-creative-professional-studies/mps-programs/mps-capstones/student/kathryn-hurchla/', external: true },
    order: 2,
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
    id: 'nightingale-issue-5-sustainability',
    type: 'writing',
    title: 'Visualizing Sustainability — Nightingale Issue 5',
    summary: 'Four-page spread in the Special Section on sustainability of Nightingale Magazine Issue 5. A survey of noteworthy global data visualization projects and practitioners approaching sustainability through diverse lenses — from soil to satellite, climate to community.',
    tags: ['nightingale', 'dvs', 'sustainability', 'data-viz', 'print', 'editorial', 'survey'],
    cta: { label: 'Get the print issue', url: 'https://shop.datavisualizationsociety.org/products/nightingale-magazine-issue-5', external: true },
    order: 2,
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
  {
    id: 'tech-stack-skills',
    type: 'meta',
    title: 'Tech Stack & Recent Work',
    summary: 'Some of my deepest recent work is at Fantasy under NDA. The tech I work with shows breadth across the stack — for specifics on what I\'m building now, get in touch.',
    tags: ['skills', 'fantasy', 'ai', 'agents', 'typescript', 'python', 'webgl'],
    cta: { label: 'Tell me about recent work', url: '#contact-prefill', external: false },
    order: 1,
  },
  {
    id: 'styling-ddd-inspiration',
    type: 'link',
    title: 'Styling Data, Design & Daughters',
    summary: 'Brand mood board: Philadelphia industrial typography, embossed cast iron, found vernacular signage. The visual research that grounds DADEDA.',
    tags: ['inspiration', 'brand', 'design-process', 'philadelphia', 'industrial-typography'],
    cta: { label: 'View inspiration gallery', url: '/inspiration/styling-ddd', external: false },
    order: 1,
  },
];

export const sampleClusters: ScramblerCluster[] = [
  {
    id: 'featured-work',
    label: 'See Work',
    orbit: 'inner',
    cards: sampleCards.filter((c) =>
      ['portfolio', 'repo'].includes(c.type) ||
      (c.type === 'meta' && c.id === 'tech-stack-skills'),
    ),
    order: 0,
  },
  {
    id: 'get-to-know',
    label: 'Get to Know',
    orbit: 'middle',
    cards: sampleCards.filter((c) =>
      ['talk', 'writing'].includes(c.type) ||
      (c.type === 'link' && c.tags.includes('inspiration')),
    ),
    order: 1,
  },
  {
    id: 'meta-cluster',
    label: 'How This Works',
    orbit: 'outer',
    cards: sampleCards.filter((c) => c.type === 'meta' && c.id !== 'tech-stack-skills'),
    order: 2,
  },
];
