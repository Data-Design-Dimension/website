import { test, expect } from '@playwright/test';

/**
 * #46 — the deselected See-Work / GTK pads need to read clearly as
 * "off". Use computed fill to confirm an inactive pad's effective
 * alpha sits low enough that the sage canvas dominates, while the
 * active pad stays at full opacity.
 *
 * We rely on the Knob's two pad-toggle buttons (See Work + GTK) being
 * toggled into opposite states so one pad is inactive and the other
 * active at the same moment, then sample both. We don't pixel-diff
 * here — Chromatic visual regression already covers the rendering;
 * this test guards the contract.
 */
test.describe('Knob pad contrast — inactive is transparent, active is solid (#46)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.pad-green', { timeout: 5000 });
  });

  test('inactive pad fill is alpha-bearing; active pad fill is solid', async ({ page }) => {
    // Initial state on / depends on first-load defaults; the simplest
    // way to guarantee one of each: click the See-Work target zone
    // once, then click GTK once, so they end up in opposite states.
    // The target zones are .target-top (See Work) and .target-bl (GTK).
    await page.locator('.target-top').click();
    await page.locator('.target-bl').click();

    const greenActive = await page.locator('.pad-green').evaluate((el) =>
      el.classList.contains('active'),
    );
    const amberActive = await page.locator('.pad-amber').evaluate((el) =>
      el.classList.contains('active'),
    );

    // Pick the inactive + the active pad for the sample.
    const inactiveSelector = greenActive ? '.pad-amber' : '.pad-green';
    const activeSelector = greenActive ? '.pad-green' : '.pad-amber';
    // Sanity: at least one of the two should be active and one not.
    expect(greenActive !== amberActive).toBeTruthy();

    const inactiveFill = await page.locator(inactiveSelector).evaluate(
      (el) => getComputedStyle(el).fill,
    );
    const activeFill = await page.locator(activeSelector).evaluate(
      (el) => getComputedStyle(el).fill,
    );

    // Either rgba(...) with alpha < 1 OR oklch(... / 0.x) — both are
    // acceptable representations from the browser's serializer.
    const hasAlpha = (s: string): boolean => {
      const rgbaMatch = s.match(/rgba?\(([^)]+)\)/);
      if (rgbaMatch) {
        const parts = rgbaMatch[1].split(',').map((p) => p.trim());
        if (parts.length === 4) return Number(parts[3]) < 1;
        return false;
      }
      const oklchMatch = s.match(/oklch\([^)]*\/\s*([\d.]+)\s*\)/);
      if (oklchMatch) return Number(oklchMatch[1]) < 1;
      return false;
    };

    expect(hasAlpha(inactiveFill)).toBeTruthy();
    expect(hasAlpha(activeFill)).toBeFalsy();
  });
});
