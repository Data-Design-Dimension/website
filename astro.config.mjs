// @ts-check
import { EventEmitter } from 'node:events';
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Silence Node's MaxListenersExceededWarning from Vite's FSWatcher.
// Vite legitimately attaches > 10 listeners during dev; default of 10 is
// too tight for modern toolchains.
EventEmitter.defaultMaxListeners = 32;

// https://astro.build/config
export default defineConfig({
  site: 'https://dadeda.design',
  output: 'static',
  integrations: [svelte(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
