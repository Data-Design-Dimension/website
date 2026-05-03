import { test, expect } from '@playwright/test';

test.describe('Home page — Scrambler', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page loads and has correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/DADEDA/);
  });

  test('Scrambler region is present and accessible', async ({ page }) => {
    const scrambler = page.getByRole('region', { name: /Interactive content navigator/i });
    await expect(scrambler).toBeVisible();
  });

  test('Scrambler renders card groups', async ({ page }) => {
    // Wait for Svelte hydration
    await page.waitForSelector('.scrambler-cluster', { timeout: 5000 });
    const clusters = page.locator('.scrambler-cluster');
    await expect(clusters).not.toHaveCount(0);
  });

  test('foreground cards are keyboard focusable', async ({ page }) => {
    await page.waitForSelector('.scrambler-card', { timeout: 5000 });
    // Tab into the scrambler
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const focusedEl = page.locator(':focus');
    // Something should be focused (skip link or a card)
    await expect(focusedEl).not.toHaveCount(0);
  });

  test('has skip-to-content link', async ({ page }) => {
    const skipLink = page.getByText('Skip to content');
    await expect(skipLink).toBeAttached();
  });

  test('renders on the #DADEDA canvas color', async ({ page }) => {
    const bg = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).backgroundColor;
    });
    // Should not be pure white — should be the DADEDA canvas
    expect(bg).not.toBe('rgb(255, 255, 255)');
  });
});

test.describe('Home page — responsive', () => {
  test('renders without horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // +1 for rounding
  });
});
