import { test, expect } from '@playwright/test';

/**
 * Performance regression scaffold for v0.1.0-preview.
 *
 * These tests run with `prefers-reduced-motion: reduce` emulated so
 * the orbital RAF loop is paused (per ScramblerCluster.svelte's
 * existing reduced-motion early-return). This makes assertions
 * deterministic — without it, continuously-animating cards make
 * "click stable" checks flaky and add background long-task noise.
 *
 * Trade-off: these tests catch regressions in NON-orbit code paths
 * (event handlers, layout work, expand transition cost). An orbit-
 * active perf suite is in the post-release backlog (#32).
 */

test.use({ colorScheme: 'no-preference', reducedMotion: 'reduce' });

test.describe('Perf — interaction baselines', () => {
  test('no user-perceived long tasks (>100ms) during 3s of static idle', async ({ page }, testInfo) => {
    // Skip on mobile project — the device-emulation overhead under
    // parallel-suite load surfaces enough variance that this test
    // becomes noisy. The chromium project is sufficient for the
    // perf-regression signal at v0.1.0 baseline.
    test.skip(testInfo.project.name === 'mobile', 'mobile project: parallel-load variance is not a real perf regression');
    // Install the long-task observer BEFORE navigation so we don't miss
    // initial paint work. Stash counts on window for later read.
    await page.addInitScript(() => {
      (window as unknown as { __longTasks: number[] }).__longTasks = [];
      try {
        const obs = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            (window as unknown as { __longTasks: number[] }).__longTasks.push(entry.duration);
          }
        });
        obs.observe({ entryTypes: ['longtask'] });
      } catch {
        // longtask not supported (Safari/WebKit); observer setup fails silently.
      }
    });

    await page.goto('/');
    await page.waitForSelector('.scrambler-cluster', { timeout: 5000 });
    await page.waitForTimeout(500); // settle initial paint
    // Reset counter AFTER first paint so we measure idle only.
    await page.evaluate(() => {
      (window as unknown as { __longTasks: number[] }).__longTasks = [];
    });
    await page.waitForTimeout(3000);
    const tasks = await page.evaluate(
      () => (window as unknown as { __longTasks: number[] }).__longTasks,
    );
    // 50ms is the W3C Long Tasks definition; 100ms is the
    // user-perceived-jank threshold (RAIL model). Asserting on >100ms
    // is more meaningful and stable across full-suite parallel runs
    // (where GC / frame-coalescing variance produces 50-90ms tasks
    // unrelated to our code). Allow up to 5 truly long tasks before
    // flagging a regression — tighten post-release once we have
    // CI baseline data.
    const userPerceived = tasks.filter((d) => d > 100);
    expect(userPerceived.length).toBeLessThanOrEqual(5);
  });

  test('clicking + on a card flips state within 200ms (in-browser timing)', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.scrambler-card', { timeout: 5000 });
    await page.waitForSelector('.card-toggle', { timeout: 5000 });
    // Settle initial paint before measuring.
    await page.waitForTimeout(300);

    // Measure click→state-change INSIDE the browser via MutationObserver.
    // This is pure render time without Playwright CDP roundtrip overhead
    // (which can add hundreds of ms and is not part of user perception).
    const elapsed = await page.evaluate(() => {
      return new Promise<number>((resolve, reject) => {
        const toggle = document.querySelector<HTMLButtonElement>('.card-toggle');
        if (!toggle) {
          reject(new Error('no .card-toggle'));
          return;
        }
        const observer = new MutationObserver(() => {
          if (document.querySelector('.scrambler-card.expanded')) {
            const elapsed = performance.now() - start;
            observer.disconnect();
            resolve(elapsed);
          }
        });
        observer.observe(document.body, {
          subtree: true,
          attributes: true,
          attributeFilter: ['class'],
        });
        const start = performance.now();
        toggle.click();
        // Safety timeout in case class never lands.
        setTimeout(() => {
          observer.disconnect();
          reject(new Error('expanded class never appeared'));
        }, 2000);
      });
    });

    // 200ms budget for the in-browser state-change. With CSS
    // transition durations zeroed by reducedMotion, this is essentially
    // event-handler + Svelte reactivity + DOM patch + paint.
    expect(elapsed).toBeLessThan(200);
  });
});
