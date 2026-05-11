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
