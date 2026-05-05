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
    media: {
      // Standardized: WebP at q=85 from the source PNG, resized to
      // 1600 wide. PRESERVES the source's 8:5 aspect (no crop) so
      // nothing is cut from the screenshot. The frame uses a custom
      // aspectRatio to match the image — avoids letterboxing or
      // cropping. PNG was 4.8MB; WebP is 85KB.
      src: '/img/do-websites-need-pages-demo.webp',
      alt: 'Demo screenshot of the Do Websites Need Pages? speculative web app prototype',
      aspectRatio: '8 / 5',
    },
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
    summary: 'Master\'s capstone in Data Analytics & Visualization at MICA. The academic showcase of my graduate research and project work.',
    tags: ['mica', 'mps', 'capstone', 'data-viz', 'academic'],
    cta: { label: 'View on MICA', url: 'https://www.mica.edu/about-mica/offices-divisions/school-of-creative-professional-studies/mps-programs/mps-capstones/student/kathryn-hurchla/', external: true },
    media: {
      src: 'https://assets.mica.edu/files/modules/screen-shot-2022-06-15-at-10200-pm.png',
      alt: 'Sustain Our Soil capstone project visualization screenshot from the MICA institutional page',
      position: 'top',
    },
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
    summary: 'Unformed thoughts in process. Why perceptually uniform color changes everything for data visualization.',
    tags: ['color', 'data-viz', 'css'],
    cta: { label: 'Read article', url: '/writing/oklch', external: false, disabled: true },
    order: 0,
  },
  {
    id: 'nightingale',
    type: 'writing',
    title: 'Nightingale Contributions',
    summary: 'Contributing author and editor for the Data Visualization Society journal.',
    tags: ['data-viz', 'writing', 'editing'],
    cta: { label: 'View on DVS', url: 'https://nightingaledvs.com/?s=hurchla', external: true },
    media: {
      src: 'https://i0.wp.com/nightingaledvs.com/wp-content/uploads/2023/06/DN_Raveling-11.png?fit=450%2C300&ssl=1',
      alt: 'Raveling data illustration from a Nightingale article — woven threads visualization',
    },
    order: 1,
  },
  {
    id: 'nightingale-issue-5-sustainability',
    type: 'writing',
    title: 'Spotlight on Noteworthy Sustainability Data Viz',
    summary: 'Five-page spread in the Special Section on sustainability of Nightingale Magazine Issue 5. A survey of noteworthy global data visualization projects and practitioners approaching sustainability through diverse lenses — from soil to satellite, climate to community.',
    tags: ['nightingale', 'dvs', 'sustainability', 'data-viz', 'print', 'editorial', 'survey'],
    cta: { label: 'Get the print issue', url: 'https://shop.datavisualizationsociety.org/products/nightingale-magazine-issue-5', external: true },
    media: {
      // Locally hosted Issue 5 cover. Source is 1946x2039. Using a
      // custom aspectRatio that exactly matches the source means the
      // frame sizes to the image — no crop, no letterbox, image
      // fills the space cleanly.
      src: '/img/writing/nightingale-issue-5-cover.png',
      alt: 'Nightingale Magazine Issue 5 print cover',
      aspectRatio: '1946 / 2039',
    },
    order: 2,
  },
  {
    id: 'github-repos',
    type: 'repo',
    title: 'Open Source Code',
    summary: 'Full-stack, web development, and data viz on GitHub.',
    tags: ['python', 'typescript', 'ai-engineering', 'data-viz', 'full-stack', 'open-source'],
    cta: { label: 'View repos', url: 'https://github.com/Data-Design-Dimension', external: true },
    media: {
      // Dynamic GitHub contributions heatmap (ghchart.rshah.org renders
      // the GitHub-style green grid for any user, refreshed daily).
      // Color hex matches our brand neon green token. Image is ~720×95
      // (year × week) — in a 16:9 frame with cover, only a horizontal
      // slice is visible; position: 'right' anchors it to the most
      // RECENT contributions on the right edge of the year.
      src: 'https://ghchart.rshah.org/5fc274/khurchla',
      alt: 'GitHub contributions heatmap for @khurchla — recent commit activity',
      aspect: 'wide',
      position: 'right',
    },
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
    type: 'inspiration',
    title: 'Styling Data, Design & Daughters',
    summary: 'Brand mood board: Philadelphia industrial typography, embossed cast iron, found vernacular signage. The visual research that grounds DADEDA.',
    tags: ['inspiration', 'brand', 'design-process', 'philadelphia', 'industrial-typography'],
    cta: { label: 'Open inspiration gallery', url: '#inspiration-styling-ddd', external: false },
    // 2×2 mood-board grid in the collapsed card. Sourced from the
    // original Behance gallery for "Styling Data, Design & Daughters
    // LLC" — downloaded and converted to WebP for performance.
    mediaGrid: [
      { src: '/img/inspiration/styling-ddd-1.webp', alt: 'Brand styling research from the Data, Design & Daughters mood board' },
      { src: '/img/inspiration/styling-ddd-2.webp', alt: 'Visual identity reference for the DADEDA brand' },
      { src: '/img/inspiration/styling-ddd-3.webp', alt: 'Typography and material study from the inspiration board' },
      { src: '/img/inspiration/styling-ddd-4.webp', alt: 'Found vernacular signage and industrial lettering reference' },
    ],
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
      ['talk', 'writing', 'inspiration'].includes(c.type),
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
