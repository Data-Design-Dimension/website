import { describe, it, expect } from 'vitest';
import {
  calculateOrbitalPosition,
  depthToVisuals,
  createOrbitalPath,
  warpPhaseToAngle,
  FOREGROUND_ANGLE,
  FOREGROUND_WIDEN,
  FOREGROUND_SLOWDOWN,
} from '../../src/lib/scrambler/orbital-math';

describe('Orbital math', () => {
  describe('createOrbitalPath', () => {
    it('creates a path with default center at origin', () => {
      const path = createOrbitalPath({ radiusX: 200, radiusY: 100 });
      expect(path.centerX).toBe(0);
      expect(path.centerY).toBe(0);
      expect(path.radiusX).toBe(200);
      expect(path.radiusY).toBe(100);
    });

    it('accepts custom center and speed', () => {
      const path = createOrbitalPath({
        centerX: 500,
        centerY: 300,
        radiusX: 150,
        radiusY: 80,
        speed: 0.5,
      });
      expect(path.centerX).toBe(500);
      expect(path.centerY).toBe(300);
      expect(path.speed).toBe(0.5);
    });
  });

  describe('calculateOrbitalPosition', () => {
    const path = createOrbitalPath({ radiusX: 200, radiusY: 100 });

    it('returns position on the unmodulated ellipse at angle 0 (widen=0)', () => {
      const pos = calculateOrbitalPosition(path, 0, 0);
      expect(pos.x).toBeCloseTo(200, 0); // rightmost point
      expect(pos.y).toBeCloseTo(0, 0);
    });

    it('returns position on the unmodulated ellipse at angle PI/2 (widen=0)', () => {
      const pos = calculateOrbitalPosition(path, Math.PI / 2, 0);
      expect(pos.x).toBeCloseTo(0, 0);
      expect(pos.y).toBeCloseTo(100, 0); // bottom of ellipse
    });

    it('foreground occurs at FOREGROUND_ANGLE (top-left)', () => {
      const fg = calculateOrbitalPosition(path, FOREGROUND_ANGLE);
      expect(fg.z).toBeCloseTo(0, 2);
    });

    it('background occurs at the diametrically opposite point (bottom-right)', () => {
      const bg = calculateOrbitalPosition(path, FOREGROUND_ANGLE + Math.PI);
      expect(bg.z).toBeCloseTo(1, 2);
    });

    it('completes a full orbit back to the start', () => {
      const start = calculateOrbitalPosition(path, 0);
      const end = calculateOrbitalPosition(path, Math.PI * 2);
      expect(end.x).toBeCloseTo(start.x, 5);
      expect(end.y).toBeCloseTo(start.y, 5);
    });

    it('foreground orbit is wider than background orbit (radius modulation)', () => {
      const fg = calculateOrbitalPosition(path, FOREGROUND_ANGLE);
      const bg = calculateOrbitalPosition(path, FOREGROUND_ANGLE + Math.PI);
      const fgDist = Math.hypot(fg.x - path.centerX, fg.y - path.centerY);
      const bgDist = Math.hypot(bg.x - path.centerX, bg.y - path.centerY);
      expect(fgDist).toBeGreaterThan(bgDist);
    });

    it('foreground radius scales by 1 + FOREGROUND_WIDEN', () => {
      const fg = calculateOrbitalPosition(path, FOREGROUND_ANGLE);
      // The unit-circle distance to FG point on a (200,100) ellipse at 5π/4
      // is sqrt((200/√2)² + (100/√2)²). Widened by (1 + FOREGROUND_WIDEN).
      const baseDist = Math.hypot(200 * Math.cos(FOREGROUND_ANGLE), 100 * Math.sin(FOREGROUND_ANGLE));
      const expected = baseDist * (1 + FOREGROUND_WIDEN);
      const actual = Math.hypot(fg.x - path.centerX, fg.y - path.centerY);
      expect(actual).toBeCloseTo(expected, 1);
    });
  });

  describe('warpPhaseToAngle', () => {
    it('is identity at the foreground angle', () => {
      expect(warpPhaseToAngle(FOREGROUND_ANGLE)).toBeCloseTo(FOREGROUND_ANGLE, 5);
    });

    it('is monotonic — never reverses direction', () => {
      // For k = FOREGROUND_SLOWDOWN < 1, derivative 1 - k*cos(...) > 0.
      const samples = 200;
      let prev = warpPhaseToAngle(0);
      for (let i = 1; i <= samples; i++) {
        const phase = (i / samples) * Math.PI * 4;
        const angle = warpPhaseToAngle(phase);
        expect(angle).toBeGreaterThan(prev);
        prev = angle;
      }
    });

    it('lingers near foreground — smaller angle change for same phase delta', () => {
      const dPhase = 0.05;
      // Around foreground: derivative = 1 - k*cos(0) = 1 - k (slow).
      const fgRate =
        (warpPhaseToAngle(FOREGROUND_ANGLE + dPhase) - warpPhaseToAngle(FOREGROUND_ANGLE - dPhase)) /
        (2 * dPhase);
      // Around background: derivative = 1 - k*cos(π) = 1 + k (fast).
      const bgRate =
        (warpPhaseToAngle(FOREGROUND_ANGLE + Math.PI + dPhase) -
          warpPhaseToAngle(FOREGROUND_ANGLE + Math.PI - dPhase)) /
        (2 * dPhase);
      expect(fgRate).toBeLessThan(bgRate);
      expect(fgRate).toBeCloseTo(1 - FOREGROUND_SLOWDOWN, 2);
      expect(bgRate).toBeCloseTo(1 + FOREGROUND_SLOWDOWN, 2);
    });
  });

  describe('foreground placement', () => {
    const path = createOrbitalPath({ radiusX: 200, radiusY: 100 });

    it('top-left position has negative x and y offsets from center', () => {
      const fg = calculateOrbitalPosition(path, FOREGROUND_ANGLE);
      expect(fg.x).toBeLessThan(path.centerX);
      expect(fg.y).toBeLessThan(path.centerY);
    });
  });

  describe('depthToVisuals', () => {
    it('foreground (z=0) is fully visible and full scale', () => {
      const vis = depthToVisuals(0);
      expect(vis.scale).toBeCloseTo(1, 1);
      expect(vis.opacity).toBeCloseTo(1, 1);
      expect(vis.blur).toBeCloseTo(0, 1);
    });

    it('background (z=1) is small, faded, and blurred', () => {
      const vis = depthToVisuals(1);
      expect(vis.scale).toBeLessThan(0.6);
      expect(vis.opacity).toBeLessThan(0.5);
      expect(vis.blur).toBeGreaterThan(1);
    });

    it('mid-depth has intermediate values', () => {
      const vis = depthToVisuals(0.5);
      expect(vis.scale).toBeGreaterThan(0.5);
      expect(vis.scale).toBeLessThan(1);
      expect(vis.opacity).toBeGreaterThan(0.4);
      expect(vis.opacity).toBeLessThan(1);
    });

    it('clamps z to [0, 1] range', () => {
      const below = depthToVisuals(-0.5);
      const above = depthToVisuals(1.5);
      expect(below.scale).toBeCloseTo(1, 1);
      expect(above.scale).toBeLessThan(0.6);
    });
  });
});
