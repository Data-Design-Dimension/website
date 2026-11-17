import { test, expect } from '@playwright/test';

/**
 * #44 — the "Drag to rotate the orbit" tooltip should stay visible
 * while hovering / focusing the dial as an affordance hint, then GO
 * AWAY the moment the user actually starts dragging. They already
 * know what to do — the hint becomes noise during the gesture.
 */
test.describe('Knob — tooltip hides while dragging the dial (#44)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.knob-dial', { timeout: 5000 });
  });

  test('tooltip is visible on hover, hidden during drag, visible again on release', async ({
    page,
  }) => {
    const dial = page.locator('.knob-dial');
    const tooltip = page.locator('#knob-dial-tooltip');

    // Hover the dial: opacity transitions to 1.
    await dial.hover();
    await expect
      .poll(async () =>
        Number(await tooltip.evaluate((el) => getComputedStyle(el).opacity)),
      )
      .toBeGreaterThan(0.5);

    // Press + move = drag in flight. Tooltip must hide.
    const box = await dial.boundingBox();
    if (!box) throw new Error('dial not visible');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 10, cy + 10, { steps: 4 });
    await expect
      .poll(async () =>
        Number(await tooltip.evaluate((el) => getComputedStyle(el).opacity)),
      )
      .toBeLessThan(0.05);

    // Release. Pointer is still over the dial, so the hover rule
    // brings the tooltip back.
    await page.mouse.up();
    await expect
      .poll(async () =>
        Number(await tooltip.evaluate((el) => getComputedStyle(el).opacity)),
      )
      .toBeGreaterThan(0.5);
  });
});
