import type { OrbitalPath, ScramblerPosition } from './types';

/**
 * Create an orbital path definition for a cluster.
 * Clusters orbit on ellipses — radiusX controls horizontal spread,
 * radiusY controls vertical spread. Speed controls angular velocity.
 */
export function createOrbitalPath(params: {
  centerX?: number;
  centerY?: number;
  radiusX: number;
  radiusY: number;
  angle?: number;
  speed?: number;
}): OrbitalPath {
  return {
    centerX: params.centerX ?? 0,
    centerY: params.centerY ?? 0,
    radiusX: params.radiusX,
    radiusY: params.radiusY,
    angle: params.angle ?? 0,
    speed: params.speed ?? 1,
  };
}

/**
 * Calculate position on an elliptical orbit at a given angle.
 * Returns x, y screen coordinates and z depth (0=front, 1=back).
 *
 * The z depth uses a cosine curve: angle 0 is front (z=0),
 * angle PI is back (z=1). This maps naturally to the Scrambler's
 * foreground/background visual model.
 */
export function calculateOrbitalPosition(
  path: OrbitalPath,
  angle: number,
): ScramblerPosition {
  const x = path.centerX + path.radiusX * Math.cos(angle);
  const y = path.centerY + path.radiusY * Math.sin(angle);

  // z depth: 0 at angle 0 (front), 1 at angle PI (back)
  // Using (1 - cos(angle)) / 2 maps [0, 2PI] to [0, 1, 0]
  const z = (1 - Math.cos(angle)) / 2;

  const visuals = depthToVisuals(z);

  return {
    x,
    y,
    z,
    ...visuals,
  };
}

/**
 * Map a z-depth value (0=foreground, 1=background) to visual properties.
 *
 * Foreground (z=0): scale 1.0, opacity 1.0, blur 0px
 * Background (z=1): scale 0.4, opacity 0.3, blur 4px
 *
 * These values create the Scrambler's cinematic depth:
 * cards in focus are large and sharp, receding cards dissolve
 * into the #DADEDA canvas.
 */
export function depthToVisuals(
  z: number,
): Pick<ScramblerPosition, 'scale' | 'opacity' | 'blur'> {
  // Clamp z to [0, 1]
  const depth = Math.max(0, Math.min(1, z));

  return {
    scale: 1 - depth * 0.6, // 1.0 → 0.4
    opacity: 1 - depth * 0.7, // 1.0 → 0.3
    blur: depth * 4, // 0px → 4px
  };
}
