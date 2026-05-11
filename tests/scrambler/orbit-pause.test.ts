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

/* Single-selection invariant on the Scrambler parent. Models the
 * combined openCards + selectedCardId state machine that's wired
 * into Scrambler.svelte's onCardLiftedChange.
 *
 * The fully-reactive flow (cards force-collapsing themselves via a
 * $effect when selectedCardId names someone else, which fires their
 * own onLiftedChange(false)) can't be unit-tested without mounting
 * the components, so we model the parent's bookkeeping directly:
 * given any sequence of lift / unlift calls, where does selectedCardId
 * land and is openCards consistent?
 */
describe('single-selection invariant — parent bookkeeping', () => {
  interface State {
    openCards: Set<string>;
    selectedCardId: string | null;
  }
  function applyLifted(state: State, cardId: string, lifted: boolean): State {
    const openCards = new Set(state.openCards);
    let selectedCardId = state.selectedCardId;
    if (lifted) {
      openCards.add(cardId);
      selectedCardId = cardId;
    } else {
      openCards.delete(cardId);
      if (selectedCardId === cardId) selectedCardId = null;
    }
    return { openCards, selectedCardId };
  }
  const empty: State = { openCards: new Set(), selectedCardId: null };

  it('lifting a card names it the active selection', () => {
    const next = applyLifted(empty, 'card-a', true);
    expect(next.selectedCardId).toBe('card-a');
    expect(next.openCards.has('card-a')).toBe(true);
  });

  it('lifting a second card REPLACES the active selection', () => {
    let s = applyLifted(empty, 'card-a', true);
    s = applyLifted(s, 'card-b', true);
    expect(s.selectedCardId).toBe('card-b');
    // Both still in openCards at this instant — the older one will
    // self-collapse via its selectedCardId-watching effect (modeled
    // below as the simulate-collapse step).
    expect(s.openCards.has('card-a')).toBe(true);
    expect(s.openCards.has('card-b')).toBe(true);
  });

  it('after force-collapse, openCards holds only the new selection', () => {
    /* Models the convergence after a two-thumb tap: B becomes the
     * selection, A's effect fires onLiftedChange(false). End state
     * is single-selected. */
    let s = applyLifted(empty, 'card-a', true);
    s = applyLifted(s, 'card-b', true);
    // Simulate card-a's selectedCardId effect → it fires onLifted(false).
    s = applyLifted(s, 'card-a', false);
    expect(s.selectedCardId).toBe('card-b');
    expect(s.openCards.size).toBe(1);
    expect(s.openCards.has('card-b')).toBe(true);
  });

  it('closing the active selection clears selectedCardId', () => {
    let s = applyLifted(empty, 'card-a', true);
    s = applyLifted(s, 'card-a', false);
    expect(s.selectedCardId).toBeNull();
    expect(s.openCards.size).toBe(0);
  });

  it('unlifting a stale card does NOT clobber the active selection', () => {
    /* The race during force-collapse: B is the new selection. A's
     * selectedCardId-watching effect runs and fires onLifted(A,
     * false). selectedCardId must remain B — the unlift of A must
     * only clear selectedCardId when A WAS the selection. */
    let s = applyLifted(empty, 'card-a', true);
    s = applyLifted(s, 'card-b', true);
    // selectedCardId is B; openCards has both.
    s = applyLifted(s, 'card-a', false); // stale unlift of A
    expect(s.selectedCardId).toBe('card-b');
  });

  it('three rapid taps converge to the most-recent selection', () => {
    let s = applyLifted(empty, 'card-a', true);
    s = applyLifted(s, 'card-b', true);
    s = applyLifted(s, 'card-c', true);
    // Two stale unlifts:
    s = applyLifted(s, 'card-a', false);
    s = applyLifted(s, 'card-b', false);
    expect(s.selectedCardId).toBe('card-c');
    expect([...s.openCards]).toEqual(['card-c']);
  });
});
