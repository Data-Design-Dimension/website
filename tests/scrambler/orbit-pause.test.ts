import { describe, it, expect } from 'vitest';
import { isOrbitPaused, type OrbitPauseReasons } from '../../src/lib/scrambler/pause';

const NONE: OrbitPauseReasons = {
  hover: false,
  focus: false,
  tap: false,
  anyCardOpen: false,
  dragging: false,
  recentlyCollapsed: false,
};

describe('isOrbitPaused', () => {
  it('returns false when no reason is active', () => {
    expect(isOrbitPaused(NONE)).toBe(false);
  });

  it.each([
    ['hover', { ...NONE, hover: true }],
    ['focus', { ...NONE, focus: true }],
    ['tap', { ...NONE, tap: true }],
    ['anyCardOpen', { ...NONE, anyCardOpen: true }],
    ['dragging', { ...NONE, dragging: true }],
    ['recentlyCollapsed', { ...NONE, recentlyCollapsed: true }],
  ])('returns true when only %s is set', (_label, reasons) => {
    expect(isOrbitPaused(reasons)).toBe(true);
  });

  it('returns true when multiple reasons are set', () => {
    expect(isOrbitPaused({ ...NONE, hover: true, tap: true })).toBe(true);
  });

  // #43: the shared tap-paused flag is what coordinates pause across
  // every cluster. The aggregation must treat it as a sufficient reason
  // exactly like the per-cluster signals so a parent toggling the
  // shared boolean freezes every cluster equally.
  it('treats the shared tap reason identically to per-cluster reasons', () => {
    const sharedTapOnly = { ...NONE, tap: true };
    const hoverOnly = { ...NONE, hover: true };
    expect(isOrbitPaused(sharedTapOnly)).toBe(isOrbitPaused(hoverOnly));
  });
});
