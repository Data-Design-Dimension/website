/**
 * Design tokens exported as TypeScript constants.
 * Source of truth is src/styles/tokens.css for brand + neutrals + categorical.
 * Sequential / diverging / cyclical scales live here only — too array-shaped
 * for CSS custom properties; consumed directly by D3 (scaleSequential, scaleDiverging).
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
 * Categorical palette — Okabe-Ito hue identity, re-anchored on a monotonic
 * lightness ladder so the palette also reads cleanly in grayscale (defends
 * against the Sky Blue ≈ Orange luminance collision in stock Okabe-Ito).
 *
 * L ladder: 0.32, 0.42, 0.52, 0.60, 0.68, 0.76, 0.84, 0.92 (≥8 units between adjacent).
 * Chroma at each stop is near max sustainable for its (L, H) coordinate so the
 * palette feels chromatic, not flat, while staying inside sRGB gamut.
 *
 * Index order is L-sorted (dark → light). For "use first N for N categories"
 * semantics with maximal visual separation, see vizPriorityOrder below.
 */
export const viz = [
  'oklch(0.32 0.10 155)', // 1: dark sage-black (Okabe-Ito "black", site-tinted)
  'oklch(0.42 0.18 250)', // 2: blue
  'oklch(0.52 0.18 40)',  // 3: vermillion
  'oklch(0.60 0.13 165)', // 4: bluish green
  'oklch(0.68 0.16 350)', // 5: reddish purple
  'oklch(0.76 0.16 70)',  // 6: orange
  'oklch(0.84 0.09 230)', // 7: sky blue
  'oklch(0.92 0.16 95)',  // 8: yellow
] as const;

export const vizLabels = [
  'dark sage',
  'blue',
  'vermillion',
  'bluish green',
  'reddish purple',
  'orange',
  'sky blue',
  'yellow',
] as const;

/**
 * Okabe-Ito's recommended ordering when fewer than 8 categories are needed.
 * Maps to indices in the L-sorted `viz` array. Use as:
 *   const palette = vizPriorityOrder.slice(0, n).map(i => viz[i]);
 */
export const vizPriorityOrder = [0, 5, 6, 3, 7, 1, 2, 4] as const;

/**
 * Card-safe categorical palette. 7 stops on a monotonic L ladder (0.30 → 0.92),
 * hues restricted to H zones that DON'T collide with the site's category-bearing
 * accents:
 *   - See Work cards = green (H ≈ 130–170)
 *   - Get to Know cards = amber (H ≈ 50–100)
 *
 * Use whenever viz renders inside a card overlay, on top of the Scrambler
 * background, or anywhere a green / amber data category would leak its
 * meaning out of the chart into the surrounding UI (or vice versa).
 *
 * Excluded hue bands: 50–100 (amber/orange) and 110–180 (yellow-green/green/teal).
 * Permitted: reds 0–40, blues 200–280, purples/magentas 290–350, plus low-chroma
 * neutrals.
 */
export const vizCardSafe = [
  'oklch(0.30 0.005 155)', // 1: near-black neutral
  'oklch(0.42 0.18 250)',  // 2: blue
  'oklch(0.52 0.18 25)',   // 3: vermillion
  'oklch(0.62 0.16 350)',  // 4: reddish purple
  'oklch(0.72 0.13 290)',  // 5: purple
  'oklch(0.82 0.08 220)',  // 6: sky blue
  'oklch(0.92 0.10 0)',    // 7: light coral
] as const;

/**
 * Which scales above are card-safe (no green / amber bleed) and which need a
 * non-card context to avoid contaminating See Work / GTK semantic meaning.
 *
 * Card-safe (use inside expanded cards, on Scrambler bg, near category UI):
 *   - viz palette: indices [0, 1, 2, 4] only (drops bluish green at 3, orange
 *     at 5, sky blue at 6 is borderline; full set requires neutral context).
 *     For categorical-in-card, prefer `vizCardSafe` over filtering `viz`.
 *   - vizSeq.blueprint, vizSeq.brown, vizSeq.gray
 *   - vizDiv.rdbu, vizDiv.gray
 *
 * Restricted (use ONLY in viz-only routes / non-card contexts):
 *   - vizSeq.sage      → green hue collides with See Work
 *   - vizSeq.amber     → amber hue collides with GTK
 *   - vizSeqMulti.dadeda  → green end collides with See Work
 *   - vizSeqMulti.cividis → yellow end (H 92) is borderline GTK-adjacent;
 *                           use cautiously inside GTK cards specifically
 *   - vizDiv.brbg      → teal-green end collides with See Work
 *   - vizDiv.puor      → orange end collides with GTK amber
 *   - vizCyc           → cycles through ALL hues including brand-meaning bands.
 *                        For cyclical data inside a card, use a brightness-only
 *                        cycle through vizSeq.gray + explicit hour/phase labels.
 */

/**
 * Sequential single-hue ramps. 7 stops, light → dark, perceptually-uniform L
 * progression with chroma peaking near mid-L (where each hue can hold most C).
 * Use with d3.scaleSequential(d3.interpolateRgbBasis(vizSeq.blueprint)) or
 * d3.scaleQuantize().range(vizSeq.blueprint).
 *
 * `gray` and `brown` are first-class members for the "color is distracting"
 * default — reach for these whenever color shouldn't compete with the data.
 */
export const vizSeq = {
  sage: [
    'oklch(0.95 0.02 155)',
    'oklch(0.85 0.05 155)',
    'oklch(0.72 0.10 155)',
    'oklch(0.58 0.13 155)',
    'oklch(0.45 0.13 155)',
    'oklch(0.32 0.10 155)',
    'oklch(0.20 0.06 155)',
  ],
  blueprint: [
    'oklch(0.95 0.03 250)',
    'oklch(0.85 0.07 250)',
    'oklch(0.72 0.12 250)',
    'oklch(0.58 0.18 250)',
    'oklch(0.45 0.20 250)',
    'oklch(0.32 0.18 250)',
    'oklch(0.20 0.12 250)',
  ],
  amber: [
    'oklch(0.95 0.05 75)',
    'oklch(0.85 0.12 75)',
    'oklch(0.75 0.15 75)',
    'oklch(0.62 0.16 75)',
    'oklch(0.48 0.13 75)',
    'oklch(0.35 0.10 75)',
    'oklch(0.22 0.06 75)',
  ],
  brown: [
    'oklch(0.95 0.02 50)',
    'oklch(0.83 0.05 50)',
    'oklch(0.70 0.07 50)',
    'oklch(0.56 0.08 50)',
    'oklch(0.42 0.07 50)',
    'oklch(0.30 0.05 50)',
    'oklch(0.18 0.03 50)',
  ],
  gray: [
    'oklch(0.95 0.003 155)',
    'oklch(0.83 0.003 155)',
    'oklch(0.70 0.003 155)',
    'oklch(0.56 0.003 155)',
    'oklch(0.42 0.003 155)',
    'oklch(0.30 0.003 155)',
    'oklch(0.18 0.003 155)',
  ],
} as const;

/**
 * Sequential multi-hue ramps. 7 stops. Use when data benefits from extra
 * perceptual range that a single hue can't provide (e.g. heatmaps).
 *
 * Default: `cividis`. CVD-verified by Nuñez et al. 2018; no green hues
 * to confuse protan/deutan. Dark navy = low, bright yellow = high.
 *
 * `dadeda` is a brand-flavored option (blueprint → sage → neon green) that
 * passes the necessary L-monotonicity test (see tests/viz-palettes.test.ts)
 * but has NOT been visually verified under deutan/protan/tritan simulators.
 * BEFORE using `dadeda` in any shipped viz, simulate under all three CVD
 * types (Stark / Sim Daltonism / Chrome rendering emulation) and confirm
 * the ramp still reads monotonically. If any simulation flattens the ramp
 * or introduces a perceived inversion, swap to `cividis`.
 */
export const vizSeqMulti = {
  dadeda: [
    'oklch(0.95 0.04 130)',
    'oklch(0.85 0.08 140)',
    'oklch(0.72 0.13 155)',
    'oklch(0.58 0.16 175)',
    'oklch(0.45 0.18 200)',
    'oklch(0.32 0.20 230)',
    'oklch(0.20 0.15 250)',
  ],
  cividis: [
    'oklch(0.20 0.10 265)',
    'oklch(0.32 0.08 250)',
    'oklch(0.45 0.05 240)',
    'oklch(0.58 0.06 200)',
    'oklch(0.70 0.10 110)',
    'oklch(0.83 0.14 95)',
    'oklch(0.95 0.16 92)',
  ],
} as const;

/**
 * Diverging palettes. 7 stops with a near-white neutral midpoint at index 3.
 * Symmetric L (0.30, 0.50, 0.75, 0.95, 0.75, 0.50, 0.30) so positive and
 * negative magnitudes encode equally — critical for honest divergence reading.
 *
 * - `brbg`: brown ↔ teal-green. Kathryn's preferred diverging.
 * - `rdbu`: classic red ↔ blue, CVD-safe.
 * - `puor`: purple ↔ orange, CVD-safe alternative to RdYlGn.
 * - `gray`: warm-cool diverging through light, very low chroma. The "data has
 *   direction but I don't want color attention" choice.
 */
export const vizDiv = {
  brbg: [
    'oklch(0.30 0.08 50)',
    'oklch(0.50 0.08 55)',
    'oklch(0.75 0.06 65)',
    'oklch(0.95 0.005 155)',
    'oklch(0.75 0.08 175)',
    'oklch(0.50 0.12 180)',
    'oklch(0.30 0.10 185)',
  ],
  rdbu: [
    'oklch(0.30 0.16 25)',
    'oklch(0.50 0.18 25)',
    'oklch(0.75 0.12 25)',
    'oklch(0.95 0.005 155)',
    'oklch(0.75 0.10 245)',
    'oklch(0.50 0.18 250)',
    'oklch(0.30 0.16 260)',
  ],
  puor: [
    'oklch(0.30 0.14 305)',
    'oklch(0.50 0.18 310)',
    'oklch(0.75 0.12 315)',
    'oklch(0.95 0.005 155)',
    'oklch(0.75 0.14 65)',
    'oklch(0.50 0.16 60)',
    'oklch(0.30 0.14 50)',
  ],
  gray: [
    'oklch(0.25 0.020 50)',
    'oklch(0.45 0.015 55)',
    'oklch(0.70 0.010 80)',
    'oklch(0.95 0.005 155)',
    'oklch(0.70 0.010 230)',
    'oklch(0.45 0.015 250)',
    'oklch(0.25 0.020 255)',
  ],
} as const;

/**
 * Cyclical palette. 12 stops at constant L and constant C, hue rotating
 * 30° per stop. By design the palette has no implied ordering — equal
 * lightness everywhere so position on the wheel is the only signal.
 *
 * Use for: time-of-day (D2 solar terminator viz), day-of-year, angles,
 * compass headings, phase. NEVER use a sequential ramp for cyclical data.
 *
 * C 0.09 stays in sRGB gamut for the cyan band (H 180) at L 0.65.
 */
export const vizCyc = [
  'oklch(0.65 0.09 0)',   // 0°   red
  'oklch(0.65 0.09 30)',  // 30°  orange
  'oklch(0.65 0.09 60)',  // 60°  gold
  'oklch(0.65 0.09 90)',  // 90°  yellow-green
  'oklch(0.65 0.09 120)', // 120° green
  'oklch(0.65 0.09 150)', // 150° sage
  'oklch(0.65 0.09 180)', // 180° teal
  'oklch(0.65 0.09 210)', // 210° cyan-blue
  'oklch(0.65 0.09 240)', // 240° blue
  'oklch(0.65 0.09 270)', // 270° indigo
  'oklch(0.65 0.09 300)', // 300° purple
  'oklch(0.65 0.09 330)', // 330° magenta
] as const;
