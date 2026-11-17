import { test, expect } from '@playwright/test';

/**
 * #47 — clicking the avatar bio's '–' button used to reopen the
 * panel immediately because unmounting the close button landed the
 * pointer / focus back on the avatar underneath, firing its
 * mouseenter/focus handlers. After the fix, the close button
 * actually closes the panel and the bio stays closed even with the
 * cursor still over the avatar.
 *
 * Follow-up iOS bug (post-#47): on touch a tap fires onclick but
 * neither onmouseenter nor onfocus fired reliably on the avatar
 * button, so the bio panel never opened on iPhone/iPad. The fix
 * routes onclick through maybeOpen so a tap opens the panel.
 */
test.describe('Avatar — tap on touch opens the bio panel (iOS regression)', () => {
  test.use({ hasTouch: true });

  test('tap opens the panel even without hover/focus events', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.avatar', { timeout: 5000 });
    const avatar = page.locator('.avatar');
    await expect(avatar).not.toHaveClass(/open/);
    await avatar.tap();
    await expect(avatar).toHaveClass(/open/);
  });
});

test.describe('Avatar — "–" closes and stays closed (#47)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.avatar', { timeout: 5000 });
  });

  test('hover opens, then "–" closes and the panel does not reopen', async ({ page }) => {
    const avatar = page.locator('.avatar');

    await avatar.hover();
    await expect(avatar).toHaveClass(/open/);

    const closeBtn = page.locator('.avatar-close');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // After click, the panel must collapse. The close button itself
    // is conditionally rendered behind `hovered`, so it should also
    // unmount.
    await expect(avatar).not.toHaveClass(/open/);
    await expect(closeBtn).toHaveCount(0);

    // Pointer is still in the avatar region (we hovered, then
    // clicked, never moved away). Wait past the 250ms suppression
    // window — the panel must STILL be closed because the mouse
    // hasn't actually re-entered from outside.
    await page.waitForTimeout(300);
    await expect(avatar).not.toHaveClass(/open/);
  });

  test('after the suppression window, hovering still opens normally', async ({ page }) => {
    const avatar = page.locator('.avatar');
    await avatar.hover();
    await expect(avatar).toHaveClass(/open/);
    await page.locator('.avatar-close').click();
    await expect(avatar).not.toHaveClass(/open/);

    // Move pointer well away, wait past the suppression window,
    // then hover again. Should open normally.
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);
    await avatar.hover();
    await expect(avatar).toHaveClass(/open/);
  });
});
