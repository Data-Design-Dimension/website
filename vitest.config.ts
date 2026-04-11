import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,js}', 'tests/**/*.test.{ts,js}'],
  },
});
