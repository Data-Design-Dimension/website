import type { Meta, StoryObj } from '@storybook/svelte';
import ScramblerCard from './ScramblerCard.svelte';
import type { ScramblerPosition } from '../lib/scrambler/types';

const foregroundPosition: ScramblerPosition = {
  x: 0, y: 0, z: 0, scale: 1, opacity: 1, blur: 0,
};

const midPosition: ScramblerPosition = {
  x: 0, y: 0, z: 0.5, scale: 0.7, opacity: 0.65, blur: 2,
};

const backgroundPosition: ScramblerPosition = {
  x: 0, y: 0, z: 0.9, scale: 0.46, opacity: 0.37, blur: 3.6,
};

const sampleCard = {
  id: 'sustain-our-soil',
  type: 'portfolio' as const,
  title: 'Sustain Our Soil',
  summary: 'Interactive Python Plotly Dash app exploring soil health, food trade, and climate change.',
  tags: ['python', 'plotly-dash', 'data-viz'],
  cta: { label: 'Read case study', url: '/work/sustain-our-soil', external: false },
  order: 0,
};

export const Foreground: StoryObj<typeof ScramblerCard> = {
  render: (args) => ({
    Component: ScramblerCard,
    props: args,
  }),
  args: {
    card: sampleCard,
    position: foregroundPosition,
  },
};

export const MidDepth: StoryObj<typeof ScramblerCard> = {
  render: (args) => ({
    Component: ScramblerCard,
    props: args,
  }),
  args: {
    card: sampleCard,
    position: midPosition,
  },
};

export const Background: StoryObj<typeof ScramblerCard> = {
  render: (args) => ({
    Component: ScramblerCard,
    props: args,
  }),
  args: {
    card: sampleCard,
    position: backgroundPosition,
  },
};

const meta: Meta<typeof ScramblerCard> = {
  title: 'Scrambler/Card',
  component: ScramblerCard,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'DADEDA Canvas' },
  },
  decorators: [
    () => ({
      Component: undefined as any,
      template: '<div style="position: relative; width: 320px; height: 300px;"><slot /></div>',
    }),
  ],
};

export default meta;
