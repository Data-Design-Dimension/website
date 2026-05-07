import { test, expect } from '@playwright/test';

/**
 * WebMCP smoke test — confirms the provider mounted, registered the
 * tools, and the canonical entry point (window.dadeda.callTool) works
 * end-to-end in a real browser.
 *
 * Tonight's minimum-viable scaffold; per-tool coverage grows post-
 * release (issue #32 backlog).
 */

test.describe('WebMCP — provider + getSiteMap smoke', () => {
  test('window.dadeda.callTool("getSiteMap") returns expected shape', async ({ page }) => {
    await page.goto('/');
    // Wait for Svelte hydration so WebMCPProvider has mounted and
    // exposed window.dadeda.
    await page.waitForFunction(
      () => typeof (window as unknown as { dadeda?: unknown }).dadeda !== 'undefined',
      undefined,
      { timeout: 5000 },
    );

    const result = await page.evaluate(async () => {
      const dadeda = (window as unknown as {
        dadeda: { callTool: (name: string, params?: unknown) => Promise<unknown> };
      }).dadeda;
      return dadeda.callTool('getSiteMap');
    });

    // Result envelope shape
    expect(result).toMatchObject({
      success: true,
      data: {
        clusters: expect.any(Array),
        cardCount: expect.any(Number),
      },
    });

    // Substantive content
    const r = result as {
      success: boolean;
      data: { clusters: unknown[]; cardCount: number };
    };
    expect(r.data.clusters.length).toBeGreaterThanOrEqual(3);
    expect(r.data.cardCount).toBeGreaterThan(0);
  });

  test('window.dadeda.tools lists every registered tool with name + description', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(
      () => typeof (window as unknown as { dadeda?: unknown }).dadeda !== 'undefined',
      undefined,
      { timeout: 5000 },
    );

    const tools = (await page.evaluate(() => {
      return (window as unknown as {
        dadeda: { tools: Array<{ name: string; description: string }> };
      }).dadeda.tools;
    })) as Array<{ name: string; description: string }>;

    expect(tools.length).toBeGreaterThanOrEqual(10);
    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description.length).toBeGreaterThan(20);
    }
  });
});
