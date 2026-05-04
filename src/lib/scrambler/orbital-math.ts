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
 * The angle on the orbit where cards are in foreground (z = 0).
 * 5π/4 = 225° = top-left quadrant of the ellipse.
 * Cards orbit clockwise: TL (foreground) → TR → BR (background) → BL → TL.
 * Putting foreground at top-left places content in prime reading real
 * estate where Western readers look first.
 */
export const FOREGROUND_ANGLE = (5 * Math.PI) / 4;

/**
 * Strength of the foreground "linger" — how much wider the orbit gets
 * and how much slower angular velocity becomes when a card is near the
 * FOREGROUND_ANGLE. 0 = uniform ellipse, 0.4 = strong linger.
 */
export const FOREGROUND_WIDEN = 0.32;
export const FOREGROUND_SLOWDOWN = 0.35;

/**
 * Warp a phase value (linear time) into an orbit angle that lingers near
 * the foreground angle. The warp is monotonic so cards never reverse:
 *   angle(phase) = phase - k * sin(phase - FG)
 * Derivative dAngle/dPhase = 1 - k * cos(phase - FG):
 * at phase = FG, slowdown = 1 - k (slower); at the back, 1 + k (faster).
 */
export function warpPhaseToAngle(phase: number, k = FOREGROUND_SLOWDOWN): number {
  return phase - k * Math.sin(phase - FOREGROUND_ANGLE);
}

/**
 * Calculate position on a foreground-widened orbit at a given angle.
 * Returns x, y screen coordinates and z depth (0=front, 1=back).
 *
 * The z depth peaks at FOREGROUND_ANGLE (top-left) and is highest
 * (background) at the diametrically opposite point (bottom-right).
 *
 * Radius is modulated so the ellipse bulges outward in the foreground
 * direction — cards in the upper-left swing through more screen space.
 */
export function calculateOrbitalPosition(
  path: OrbitalPath,
  angle: number,
  widen = FOREGROUND_WIDEN,
): ScramblerPosition {
  // facing: 1 at FOREGROUND_ANGLE, -1 at the diametric back.
  const facing = Math.cos(angle - FOREGROUND_ANGLE);
  // 1 + widen at FG, 1 - widen at back. Always positive (widen < 1).
  const radiusScale = 1 + widen * facing;

  const x = path.centerX + path.radiusX * radiusScale * Math.cos(angle);
  const y = path.centerY + path.radiusY * radiusScale * Math.sin(angle);

  // z = 0 (foreground) at FOREGROUND_ANGLE, z = 1 (background) at the
  // diametrically opposite point.
  const z = (1 - facing) / 2;

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
