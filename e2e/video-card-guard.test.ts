import { test, expect } from '@playwright/test';

/**
 * #45 — clicking a video card from the orbit must NOT immediately
 * play the embed or navigate to YouTube. The user expects to bring
 * the card forward on the first tap and only fire the play button on
 * the second, deliberate tap.
 *
 * We implement that by leaving the iframe pointer-events: none while
 * the card is still in the orbit (collapsed, not lifted). Pointer
 * events fall through to the card's existing two-stage tap state
 * machine, which sets isFocused on the first tap. Once focused, the
 * iframe becomes interactive (pointer-events: auto) and a tap on the
 * play button reaches the embed natively.
 */
test.describe('Video cards — first tap focuses, does not play (#45)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.scrambler-card', { timeout: 5000 });
  });

  test('iframe is non-interactive while the card is in the orbit', async ({ page }) => {
    const videoCard = page.locator('.scrambler-card:has(iframe)').first();
    await expect(videoCard).toBeVisible();

    const iframe = videoCard.locator('iframe');
    await expect(iframe).toBeAttached();
    // Inline style takes precedence over the stylesheet — assert the
    // gate is in place by reading computed pointer-events.
    const initial = await iframe.evaluate(
      (el) => getComputedStyle(el).pointerEvents,
    );
    expect(initial).toBe('none');
  });

  test('first tap lifts the card; iframe becomes interactive on lift', async ({ page }) => {
    const videoCard = page.locator('.scrambler-card:has(iframe)').first();
    await expect(videoCard).toBeVisible();

    // Use evaluate to dispatch a real pointerdown+up at the card center,
    // mirroring the gesture from #56ad484 ("tap-focused-card expands").
    await videoCard.evaluate((el) => {
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

    // After the first tap the card should be focused (lifted forward
    // at orbital size). The iframe gate releases on lift.
    await expect(videoCard).toHaveClass(/focused/);

    const iframe = videoCard.locator('iframe');
    const afterLift = await iframe.evaluate(
      (el) => getComputedStyle(el).pointerEvents,
    );
    expect(afterLift).toBe('auto');
  });
});
