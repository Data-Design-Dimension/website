import { describe, it, expect } from 'vitest';
import {
  calculateOrbitalPosition,
  depthToVisuals,
  createOrbitalPath,
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

    it('returns position on the ellipse at angle 0', () => {
      const pos = calculateOrbitalPosition(path, 0);
      expect(pos.x).toBeCloseTo(200, 0); // rightmost point
      expect(pos.y).toBeCloseTo(0, 0);
    });

    it('returns position on the ellipse at angle PI/2', () => {
      const pos = calculateOrbitalPosition(path, Math.PI / 2);
      expect(pos.x).toBeCloseTo(0, 0);
      expect(pos.y).toBeCloseTo(100, 0); // bottom of ellipse
    });

    it('z depth follows a sine wave (front at 0, back at PI)', () => {
      const front = calculateOrbitalPosition(path, 0);
      const back = calculateOrbitalPosition(path, Math.PI);
      // Front should have lower z (closer), back should have higher z (further)
      expect(front.z).toBeLessThan(back.z);
    });

    it('completes a full orbit back to the start', () => {
      const start = calculateOrbitalPosition(path, 0);
      const end = calculateOrbitalPosition(path, Math.PI * 2);
      expect(end.x).toBeCloseTo(start.x, 5);
      expect(end.y).toBeCloseTo(start.y, 5);
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
