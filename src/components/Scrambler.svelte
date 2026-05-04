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

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        width = entry.contentRect.width;
        height = entry.contentRect.height;
      }
    });

    observer.observe(containerEl);
    return () => observer.disconnect();
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
