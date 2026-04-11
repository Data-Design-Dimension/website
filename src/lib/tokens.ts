/**
 * Design tokens exported as TypeScript constants.
 * Source of truth is src/styles/tokens.css — keep in sync.
 * Used by D3 scales, Svelte components, and WebMCP tools.
 */

export const brand = {
  canvas: 'oklch(0.89 0.007 155)', // #DADEDA — the sage mist
  canvasHex: '#DADEDA',
  canvasLight: 'oklch(0.95 0.004 155)',
  canvasDark: 'oklch(0.82 0.010 155)',
  accentGreen: 'oklch(0.75 0.20 145)',
  accentBlue: 'oklch(0.55 0.15 250)',
  accentHot: 'oklch(0.65 0.25 0)',
} as const;

export const neutral = {
  surface: 'oklch(0.99 0.002 155)',
  textPrimary: 'oklch(0.20 0.01 155)',
  textSecondary: 'oklch(0.45 0.01 155)',
  textMuted: 'oklch(0.65 0.005 155)',
  border: 'oklch(0.80 0.008 155)',
} as const;

/**
 * Data visualization palette — qualitative, colorblind-safe.
 * Minimum 30 OKLCH lightness units between adjacent colors.
 */
export const viz = [
  'oklch(0.55 0.18 250)', // blue
  'oklch(0.70 0.20 145)', // green
  'oklch(0.65 0.22 30)', // orange
  'oklch(0.55 0.20 330)', // purple
  'oklch(0.75 0.15 80)', // gold
  'oklch(0.50 0.15 200)', // teal
  'oklch(0.65 0.25 15)', // red-orange
  'oklch(0.60 0.12 290)', // violet
] as const;

export const vizLabels = [
  'blue',
  'green',
  'orange',
  'purple',
  'gold',
  'teal',
  'red-orange',
  'violet',
] as const;
