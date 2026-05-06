/**
 * Core types for the Scrambler interaction system.
 *
 * The Scrambler is an orbital navigation where clusters of cards
 * orbit on elliptical paths at different depths. Cards in the foreground
 * are large, sharp, and interactive. Cards receding are smaller, softer,
 * and dissolve into the #DADEDA canvas.
 */

export type CardType =
  | 'portfolio'
  | 'talk'
  | 'writing'
  | 'link'
  | 'repo'
  | 'meta'
  | 'inspiration'
  | 'skills';

export type OrbitLevel = 'inner' | 'middle' | 'outer';

export interface CardCta {
  label: string;
  url: string;
  external: boolean;
  /** Render the CTA as a disabled / inactive button (no link, no
   *  hover affordance). For drafts and in-progress entries. */
  disabled?: boolean;
}

export interface CardMedia {
  src: string;
  alt: string;
  /**
   * Frame orientation. Defaults to 'wide' (16:9) for landscape
   * screenshots/photos. Use 'tall' (3:4) for portrait covers like
   * magazine spreads, and 'square' (1:1) for logos / avatars.
   */
  aspect?: 'wide' | 'tall' | 'square';
  /**
   * Custom CSS aspect-ratio value (e.g. '8 / 5', '4 / 3') that
   * overrides the default for `aspect`. Use when the source image's
   * natural ratio doesn't match a standard preset — avoids cropping
   * by sizing the frame to the image instead of forcing the image
   * into the frame.
   */
  aspectRatio?: string;
  /**
   * Where to anchor the image inside its frame when cropped. Useful
   * for tall source images shown in a wide frame — set 'top' to
   * preserve the top portion (e.g. headline visualizations) instead
   * of center-cropping. Maps to CSS object-position.
   */
  position?: 'top' | 'center' | 'bottom' | 'left' | 'right' | 'right center';
}

export interface ScramblerCard {
  id: string;
  type: CardType;
  title: string;
  summary: string;
  quickView?: string;
  cta?: CardCta;
  /**
   * Optional secondary CTA. Used when one project has two legitimate
   * destinations of equal authority (e.g., a merged case-study card
   * that links both to the local case study and the institutional /
   * collaborator page). Renders as a smaller text link below the
   * primary CTA.
   */
  secondaryCta?: CardCta;
  tags: string[];
  media?: CardMedia;
  /**
   * Array of images rendered as a 2×2 grid in the card's collapsed
   * media area. Use for cards that surface a curated sample (mood
   * board, inspiration gallery, project lookbook). Mutually
   * exclusive with `media` — if both are set, mediaGrid wins.
   */
  mediaGrid?: CardMedia[];
  /**
   * Long-form case-study body, markdown. Renders only in the expanded
   * card state, below the summary. Use for cards whose full content
   * is meaningful enough to keep the user in-place rather than
   * navigating to a separate page (older portfolio works, process
   * write-ups). Headings, lists, links, blockquotes, and images all
   * supported. Trusted-author content; rendered via `marked` and
   * Svelte's `{@html}`.
   */
  body?: string;
  order: number;
}

export interface ScramblerCluster {
  id: string;
  label: string;
  orbit: OrbitLevel;
  cards: ScramblerCard[];
  order: number;
}

/**
 * Position of an element in 3D space for the Scrambler.
 * x, y are screen coordinates. z is depth (0 = foreground, 1 = background).
 * scale and opacity are derived from z for the foreground/background effect.
 */
export interface ScramblerPosition {
  x: number;
  y: number;
  z: number;
  scale: number;
  opacity: number;
  blur: number;
}

/**
 * Orbital path parameters for a cluster.
 * The cluster orbits on an ellipse defined by radiusX and radiusY,
 * centered at (centerX, centerY), with an angular offset and speed.
 */
export interface OrbitalPath {
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  angle: number;
  speed: number;
}

/**
 * Content pool: all available cards regardless of cluster assignment.
 * The clustering function groups these into clusters.
 * WebMCP tools operate on this pool to rearrange content.
 */
export interface ContentPool {
  cards: ScramblerCard[];
  clusters: ScramblerCluster[];
}

/**
 * Filter criteria for dynamically creating clusters
 * (e.g., via WebMCP tool calls).
 */
export interface ClusterFilter {
  tags?: string[];
  types?: CardType[];
  search?: string;
}
