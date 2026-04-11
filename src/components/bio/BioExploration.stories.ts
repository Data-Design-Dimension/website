import type { Meta, StoryObj } from '@storybook/svelte';
import ModularBio from './ModularBio.svelte';
import WordRotateBio from './WordRotateBio.svelte';
import HyperBio from './HyperBio.svelte';
import TypingBio from './TypingBio.svelte';

// Bio content — Kathryn's voice
const bioPhrases = [
  'I make intelligent experiences',
  'where design and technology blur,',
  'using first principles thinking',
  'and core tenets,',
  'accelerated by AI-first',
  'engineering approaches.',
];

const bioRotateWords = [
  'intelligent experiences',
  'compelling data stories',
  'creative technology',
  'visual systems',
  'agent-ready interfaces',
];

const bioStatements = [
  'I make intelligent experiences where design and technology blur.',
  'First principles thinking, accelerated by AI-first engineering.',
  'Compel action with data science backed storytelling.',
  'Associate Principal Engineer. Creative technologist. Data designer.',
];

// ── Modular Reorder ──────────────────────────────────────
// The whiteboard vision: phrases rearrange on a timer

export const ModularReorder: StoryObj<typeof ModularBio> = {
  render: (args) => ({
    Component: ModularBio,
    props: args,
  }),
  args: {
    phrases: bioPhrases,
    interval: 4000,
  },
};

// ── Word Rotate ──────────────────────────────────────────
// Static frame with one rotating key phrase

export const WordRotate: StoryObj<typeof WordRotateBio> = {
  render: (args) => ({
    Component: WordRotateBio,
    props: args,
  }),
  args: {
    prefix: 'I make ',
    words: bioRotateWords,
    suffix: '.',
    duration: 2500,
  },
};

// ── Hyper/Scramble ───────────────────────────────────────
// Characters decode themselves — data coming into focus

export const HyperScramble: StoryObj<typeof HyperBio> = {
  render: (args) => ({
    Component: HyperBio,
    props: args,
  }),
  args: {
    text: 'I make intelligent experiences where design and technology blur.',
    duration: 1200,
    animateOnHover: true,
  },
};

// ── Typing ───────────────────────────────────────────────
// Typewriter cycling through statements

export const Typing: StoryObj<typeof TypingBio> = {
  render: (args) => ({
    Component: TypingBio,
    props: args,
  }),
  args: {
    statements: bioStatements,
    typeSpeed: 45,
    pauseDuration: 2500,
  },
};

const meta: Meta = {
  title: 'Bio/Text Animations',
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'DADEDA Canvas' },
  },
};

export default meta;
