import type { StorybookConfig } from '@storybook/svelte-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|svelte)'],
  addons: [
    // addon-essentials was a v8 monolith; v10 splits its features into
    // built-ins. Removed to avoid the storybook 10 / addon 8 version
    // mismatch. Re-add specific v10-compatible addons (a11y, etc.) as
    // they are needed.
  ],
  framework: {
    name: '@storybook/svelte-vite',
    options: {},
  },
};

export default config;
