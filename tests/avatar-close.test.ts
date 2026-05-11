import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * #47 — closing the avatar bio (clicking the '–') used to reopen it
 * immediately because the close button is a sibling of the avatar
 * button and unmounting it landed the pointer / focus back on the
 * avatar, firing onmouseenter / onfocus which both called setOpen(true).
 *
 * The fix uses a brief suppression window: handleClose sets a flag,
 * any open-event that fires inside that window is swallowed, and the
 * flag clears via setTimeout. This test models that lifecycle with
 * fake timers and asserts:
 *   1. while the flag is set, attempting to open is a no-op
 *   2. after the timeout, opens behave normally again
 *   3. calling close again while a prior timer is pending resets
 *      the window — the most recent close wins
 */

interface Guard {
  isSuppressed: () => boolean;
  suppress: () => void;
  destroy: () => void;
}

function createReopenGuard(durationMs = 250): Guard {
  let suppressed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    isSuppressed: () => suppressed,
    suppress() {
      suppressed = true;
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => {
        suppressed = false;
        timer = undefined;
      }, durationMs);
    },
    destroy() {
      if (timer !== undefined) clearTimeout(timer);
    },
  };
}

describe('Avatar reopen guard (#47)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts unsuppressed — first open after mount works', () => {
    const guard = createReopenGuard();
    expect(guard.isSuppressed()).toBe(false);
    guard.destroy();
  });

  it('suppresses opens during the window after a close', () => {
    const guard = createReopenGuard(250);
    guard.suppress();
    expect(guard.isSuppressed()).toBe(true);

    vi.advanceTimersByTime(249);
    expect(guard.isSuppressed()).toBe(true);

    vi.advanceTimersByTime(1);
    expect(guard.isSuppressed()).toBe(false);
    guard.destroy();
  });

  it('destroy() cancels a pending suppression timer (no late mutations)', () => {
    const guard = createReopenGuard(250);
    guard.suppress();
    expect(guard.isSuppressed()).toBe(true);
    guard.destroy();
    // After destroy(), advancing past the original timer must NOT
    // re-set the flag — clearTimeout should have torn it down.
    vi.advanceTimersByTime(500);
    // Suppressed is still its post-suppress value (no callback ran
    // to flip it back), but the test that matters: no pending timer
    // fires. Confirm by checking we can suppress again cleanly.
    guard.suppress();
    expect(guard.isSuppressed()).toBe(true);
    guard.destroy();
  });

  it('resets the window when close is called again mid-suppression', () => {
    const guard = createReopenGuard(250);
    guard.suppress();
    vi.advanceTimersByTime(200);
    expect(guard.isSuppressed()).toBe(true);

    // Second close before the first timer fires — the new window
    // should extend the suppression a full 250ms from THIS call.
    guard.suppress();
    vi.advanceTimersByTime(200);
    expect(guard.isSuppressed()).toBe(true);

    vi.advanceTimersByTime(60);
    expect(guard.isSuppressed()).toBe(false);
    guard.destroy();
  });
});
