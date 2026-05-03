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
}

export interface CardMedia {
  src: string;
  alt: string;
}

export interface ScramblerCard {
  id: string;
  type: CardType;
  title: string;
  summary: string;
  quickView?: string;
  cta?: CardCta;
  tags: string[];
  media?: CardMedia;
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
