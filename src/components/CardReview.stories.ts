import type { Meta, StoryObj } from '@storybook/svelte';
import { load as yamlLoad } from 'js-yaml';
import CardReview from './CardReview.svelte';
import type { ScramblerCard } from '../lib/scrambler/types';

/**
 * Side-by-side card review interface (plan §E).
 *
 * Loads every YAML file in src/content/cards/ via Vite's eager raw
 * glob, parses it, and shows collapsed + expanded states for each
 * card with tag editing, approve / archive / feature toggles, and a
 * one-click YAML output ready to paste back into the file.
 *
 * The reviewer's edits live in component-local state. Saving back to
 * disk happens via clipboard for now (full filesystem write requires
 * a server endpoint — Phase 8 follow-up if it proves slower than
 * paste-back in practice).
 */

const yamlModules = import.meta.glob('/src/content/cards/*.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const cards: ScramblerCard[] = Object.entries(yamlModules)
  .map(([path, raw]) => {
    const id = path.split('/').pop()!.replace(/\.yaml$/, '');
    const data = yamlLoad(raw) as Omit<ScramblerCard, 'id'>;
    return { id, ...data };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

const meta: Meta<typeof CardReview> = {
  title: 'Review/All Cards',
  component: CardReview,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

export const SideBySide: StoryObj<typeof CardReview> = {
  render: () => ({
    Component: CardReview,
    props: { cards },
  }),
};
