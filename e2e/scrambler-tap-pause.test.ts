import { test, expect } from '@playwright/test';

/**
 * #43 — clicking the Scrambler background must pause (or resume)
 * EVERY cluster together. Previously each cluster carried its own
 * tapPaused state, so a click only froze the cluster you happened to
 * hit; the other kept orbiting and the page read as broken.
 *
 * The cluster wrapper gets a `.paused` class when its orbit is held,
 * so we can assert coordination at the class level — independent of
 * animation timing, which would be flaky.
 */
test.describe('Scrambler — background tap pauses all clusters (#43)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.scrambler-cluster', { timeout: 5000 });
  });

  test('one background click freezes every cluster, next resumes every cluster', async ({
    page,
  }) => {
    const clusters = page.locator('.scrambler-cluster');
    const count = await clusters.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Baseline: no cluster should be paused right after load (no
    // hover, focus, or open card on a fresh visit).
    for (let i = 0; i < count; i++) {
      await expect(clusters.nth(i)).not.toHaveClass(/paused/);
    }

    /* Dispatch a click whose target IS the cluster background — not
     * a card. The component listener uses `e.target === e.currentTarget`
     * to filter bubbles, so we synthesize a click directly on the
     * cluster element to mimic an empty-space tap reliably across
     * viewport sizes / card positions. */
    await clusters.nth(0).evaluate((el) => {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    for (let i = 0; i < count; i++) {
      await expect(clusters.nth(i)).toHaveClass(/paused/);
    }

    await clusters.nth(0).evaluate((el) => {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    for (let i = 0; i < count; i++) {
      await expect(clusters.nth(i)).not.toHaveClass(/paused/);
    }
  });

  test('background tap that closes an open card does NOT flip tap-pause', async ({
    page,
  }) => {
    // Regression for the clarity-review bug (A1): when a card is
    // open and the user clicks the cluster background to close it,
    // that same gesture used to also flip the shared tap-pause —
    // silently freezing the orbit after the close.
    const clusters = page.locator('.scrambler-cluster');
    const firstCard = page.locator('.scrambler-card').first();
    await firstCard.scrollIntoViewIfNeeded();

    // Open a card via two pointerup taps on its center (orbital →
    // focused → expanded).
    for (let i = 0; i < 2; i++) {
      await firstCard.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const down = new PointerEvent('pointerdown', {
          bubbles: true,
          pointerType: 'mouse',
          clientX: cx,
          clientY: cy,
          pointerId: 1,
        });
        const up = new PointerEvent('pointerup', {
          bubbles: true,
          pointerType: 'mouse',
          clientX: cx,
          clientY: cy,
          pointerId: 1,
        });
        el.dispatchEvent(down);
        el.dispatchEvent(up);
      });
    }
    await expect(firstCard).toHaveClass(/expanded/);

    // Background click on the cluster — closes the card via the
    // outside-tap effect in ScramblerCard.
    await clusters.nth(0).evaluate((el) => {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await expect(firstCard).not.toHaveClass(/expanded/);

    // The close gesture must NOT have switched the orbit into
    // sticky-pause. After 1s (well past the 800ms recentlyCollapsed
    // grace window) no cluster should carry the .paused class.
    await page.waitForTimeout(1000);
    const count = await clusters.count();
    for (let i = 0; i < count; i++) {
      await expect(clusters.nth(i)).not.toHaveClass(/paused/);
    }
  });

  test('clicking a different cluster background still toggles every cluster', async ({
    page,
  }) => {
    const clusters = page.locator('.scrambler-cluster');
    const count = await clusters.count();
    expect(count).toBeGreaterThanOrEqual(2);

    await clusters.nth(1).evaluate((el) => {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    for (let i = 0; i < count; i++) {
      await expect(clusters.nth(i)).toHaveClass(/paused/);
    }
  });
});

/**
 * Critical post-v0.1.0 regression: after a user collapsed a card via
 * the – button, the cluster that owned that card stayed paused
 * indefinitely. Sibling clusters resumed normally, and bg-tap
 * unpause didn't unstick the affected cluster. Root cause:
 * .scrambler-cluster is inset: 0 so the cluster fills the entire
 * Scrambler; collapsing under-cursor never fires pointerleave, so
 * hoverPaused stays true forever after anyCardOpen flips false.
 */
test.describe('Scrambler — cluster resumes after collapse with pointer parked', () => {
  test('cluster orbit resumes after card collapses, pointer still over cluster', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForSelector('.scrambler-card', { timeout: 5000 });

    const firstCard = page.locator('.scrambler-card').first();
    const cluster = page.locator('.scrambler-cluster').first();

    // Mouse-hover the card so the cluster registers a mouse-pointer
    // hoverPaused (touch never sets it; the bug is desktop-only).
    await firstCard.hover();
    await expect(cluster).toHaveClass(/paused/);

    // Two pointerup taps to advance orbital → focused → expanded.
    for (let i = 0; i < 2; i++) {
      await firstCard.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const down = new PointerEvent('pointerdown', {
          bubbles: true,
          pointerType: 'mouse',
          clientX: cx,
          clientY: cy,
          pointerId: 1,
        });
        const up = new PointerEvent('pointerup', {
          bubbles: true,
          pointerType: 'mouse',
          clientX: cx,
          clientY: cy,
          pointerId: 1,
        });
        el.dispatchEvent(down);
        el.dispatchEvent(up);
      });
    }
    await expect(firstCard).toHaveClass(/expanded/);

    // Click the – toggle on the now-expanded card. The pointer ends
    // up at the – button screen position — still inside the cluster's
    // bounds — and the card shrinks under it. This is the exact
    // gesture that produces the stuck-pause bug.
    await page.locator('.scrambler-card.expanded .card-toggle').click();
    await expect(firstCard).not.toHaveClass(/expanded/);
    await expect(firstCard).not.toHaveClass(/focused/);

    // Past the 800ms recentlyCollapsed grace + margin. The cluster
    // must NOT carry .paused — that's the regression we're guarding.
    await page.waitForTimeout(1200);
    await expect(cluster).not.toHaveClass(/paused/);
  });

  test('cluster also resumes when card is dismissed via background tap', async ({
    page,
  }) => {
    // Same shape but with the outside-tap close path (the bg-tap
    // route from #43's A1 regression). Covers the second close
    // pathway end-to-end.
    await page.goto('/');
    await page.waitForSelector('.scrambler-card', { timeout: 5000 });

    const firstCard = page.locator('.scrambler-card').first();
    const cluster = page.locator('.scrambler-cluster').first();

    await firstCard.hover();
    await expect(cluster).toHaveClass(/paused/);

    for (let i = 0; i < 2; i++) {
      await firstCard.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        el.dispatchEvent(new PointerEvent('pointerdown', {
          bubbles: true, pointerType: 'mouse', clientX: cx, clientY: cy, pointerId: 1,
        }));
        el.dispatchEvent(new PointerEvent('pointerup', {
          bubbles: true, pointerType: 'mouse', clientX: cx, clientY: cy, pointerId: 1,
        }));
      });
    }
    await expect(firstCard).toHaveClass(/expanded/);

    // Bg-tap on cluster — closes the card via ScramblerCard's
    // outside-tap effect.
    await cluster.evaluate((el) => {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await expect(firstCard).not.toHaveClass(/expanded/);

    await page.waitForTimeout(1200);
    await expect(cluster).not.toHaveClass(/paused/);
  });
});
