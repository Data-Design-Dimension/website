import type { Preview } from '@storybook/svelte-vite';
import '../src/styles/tokens.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'DADEDA Canvas',
      values: [
        { name: 'DADEDA Canvas', value: '#DADEDA' },
        { name: 'White', value: '#FFFFFF' },
        { name: 'Dark', value: '#1a1a1a' },
      ],
    },
  },
};

export default preview;
