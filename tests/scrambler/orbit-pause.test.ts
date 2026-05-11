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

/* Models the openCards Set behavior on the Scrambler parent. The
 * Set is the new single source of truth for anyCardOpen after the
 * unified-pause refactor, replacing the MutationObserver. Add/delete
 * must be idempotent — a duplicate call for the same card id from
 * a flickery $effect or an unmount-while-lifted cleanup must not
 * cause a count drift. */
describe('openCards Set semantics (unified-pause refactor)', () => {
  function applyLifted(set: Set<string>, id: string, lifted: boolean): Set<string> {
    if (lifted) {
      if (set.has(id)) return set;
      return new Set([...set, id]);
    }
    if (!set.has(id)) return set;
    const next = new Set(set);
    next.delete(id);
    return next;
  }

  it('lifting a card adds its id; anyCardOpen flips true', () => {
    let s = new Set<string>();
    s = applyLifted(s, 'card-a', true);
    expect(s.has('card-a')).toBe(true);
    expect(s.size > 0).toBe(true);
  });

  it('unlifting the only lifted card empties the set', () => {
    let s = new Set<string>(['card-a']);
    s = applyLifted(s, 'card-a', false);
    expect(s.size).toBe(0);
  });

  it('duplicate lift of the same card is a no-op', () => {
    let s = new Set<string>(['card-a']);
    const before = s;
    s = applyLifted(s, 'card-a', true);
    // Idempotent: same reference, no new allocation, no count drift.
    expect(s).toBe(before);
    expect(s.size).toBe(1);
  });

  it('unlifting a card that was never lifted is a no-op', () => {
    let s = new Set<string>(['card-a']);
    const before = s;
    s = applyLifted(s, 'card-b', false);
    expect(s).toBe(before);
    expect(s.size).toBe(1);
  });

  it('two cards lifted then both unlifted clears the set', () => {
    let s = new Set<string>();
    s = applyLifted(s, 'card-a', true);
    s = applyLifted(s, 'card-b', true);
    expect(s.size).toBe(2);
    s = applyLifted(s, 'card-a', false);
    expect(s.size).toBe(1);
    s = applyLifted(s, 'card-b', false);
    expect(s.size).toBe(0);
  });
});
