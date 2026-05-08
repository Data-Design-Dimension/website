<script lang="ts">
  import type { ScramblerCard, ScramblerCluster } from '../lib/scrambler/types';
  import ScramblerClusterComponent from './ScramblerCluster.svelte';

  interface Props {
    clusters: ScramblerCluster[];
    manualTimeOffset?: number;
    onCardSelect?: (card: ScramblerCard) => void;
  }

  let { clusters, manualTimeOffset = 0, onCardSelect }: Props = $props();

  let containerEl: HTMLDivElement | undefined = $state();
  let width = $state(800);
  let height = $state(600);

  $effect(() => {
    if (!containerEl) return;

    /* Debounced + thresholded resize handling (#38). On iOS Safari,
     * the address bar collapses/expands during initial page load and
     * scroll, firing many ResizeObserver entries with small height
     * deltas — each one recomputes the orbital radii and visibly
     * jumps every card. We:
     *   1. Ignore height-only deltas under 80px (typical address-bar
     *      shifts are 60–80px; rotation changes are much larger).
     *   2. Debounce by 120ms so we settle on the final size after a
     *      transition completes rather than animating along with it. */
    let pending: ReturnType<typeof setTimeout> | undefined;
    let nextW = width;
    let nextH = height;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = entry.contentRect.width;
      const h = entry.contentRect.height;
      const widthChanged = Math.abs(w - width) > 1;
      const heightDelta = Math.abs(h - height);
      const heightChanged = heightDelta > 80;
      if (!widthChanged && !heightChanged) return;
      nextW = w;
      nextH = h;
      if (pending !== undefined) clearTimeout(pending);
      pending = setTimeout(() => {
        width = nextW;
        height = nextH;
        pending = undefined;
      }, 120);
    });

    observer.observe(containerEl);
    return () => {
      observer.disconnect();
      if (pending !== undefined) clearTimeout(pending);
    };
  });
</script>

<div
  class="scrambler"
  bind:this={containerEl}
  role="region"
  aria-label="Interactive content navigator — use Tab to focus on cards, Enter to select"
  aria-live="polite"
>
  {#each clusters as cluster, i (cluster.id)}
    <ScramblerClusterComponent
      {cluster}
      containerWidth={width}
      containerHeight={height}
      timeOffset={i * (Math.PI * 2 / 3) * 0.4 + manualTimeOffset}
      onCardSelect={onCardSelect}
    />
  {/each}

  <div class="scrambler-vignette" aria-hidden="true"></div>
</div>

<style>
  .scrambler {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    /* No solid background — the parent .stage already paints the canvas
       color, and a transparent base lets the windshield's phosphor
       wordmark (DADEDA) show through behind the orbiting cards. */
    perspective: 1200px;
    perspective-origin: 50% 50%;
  }

  /* Soft vignette that fades edges into the canvas color */
  .scrambler-vignette {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(
      ellipse at center,
      transparent 50%,
      var(--color-canvas) 100%
    );
  }

  @media (max-width: 768px) {
    .scrambler {
      perspective: 800px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .scrambler {
      perspective: none;
    }
  }
</style>
