import { test, expect } from '@playwright/test';

test.describe('Design System page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/design-system');
  });

  test('page loads with correct heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Design System' })).toBeVisible();
  });

  test('shows #DADEDA brand canvas section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Brand Canvas' })).toBeVisible();
  });

  test('displays color swatches', async ({ page }) => {
    const swatches = page.locator('.swatch-color');
    await expect(swatches).not.toHaveCount(0);
  });

  test('has brand accents section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Brand Accents' })).toBeVisible();
  });

  test('has data viz palette section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Data Visualization Palette' })).toBeVisible();
  });

  test('has typography section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Typography' })).toBeVisible();
  });

  test('documents the design rationale', async ({ page }) => {
    await expect(page.getByText('Why OKLCH?')).toBeVisible();
    await expect(page.getByText('Why #DADEDA?')).toBeVisible();
  });

  test('is responsive at mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByRole('heading', { name: 'Design System' })).toBeVisible();
  });
});
