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

  /* Single source of truth for "any card is open anywhere on the
   * Scrambler". Hoisted from each cluster so when one cluster has an
   * expanded card, ALL clusters pause — keeping the user's reading
   * focus on the open card rather than letting sibling clusters orbit
   * in the background. Also smooths a UX glitch where one cluster
   * frozen + another moving read as "broken state". */
  let anyCardOpen = $state(false);

  /* Single source of truth for the sticky background-tap pause (#43).
   * Hoisted so a click on ANY cluster's background freezes (or
   * resumes) every cluster together. Previously each cluster carried
   * its own tapPaused boolean and a click only flipped the one it
   * landed in — half the orbit kept moving, which read as a bug.
   * Tester also reported the inverse intent: "if clicking the
   * background pauses anything it must pause everything, otherwise
   * remove the behavior." A single shared boolean is the simplest
   * possible coordination. */
  let tapPaused = $state(false);
  function toggleTapPause() {
    tapPaused = !tapPaused;
  }

  $effect(() => {
    if (!containerEl || typeof MutationObserver === 'undefined') return;
    const update = () => {
      anyCardOpen = !!containerEl?.querySelector(
        '.scrambler-card.focused, .scrambler-card.expanded',
      );
    };
    update();
    const obs = new MutationObserver(update);
    obs.observe(containerEl, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => obs.disconnect();
  });

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
    <!--
      timeOffset staggers each cluster's phase so the same card index
      doesn't sit at the foreground angle in every orbit. CONSEQUENCE
      for content authoring: the card that lands at the FOREGROUND
      angle at time=0 is NOT always sorted index 0. It's whichever
      sorted index satisfies (i_card * angleStep + timeOffset) ≡ 0
      mod 2π, where i_card is the post-load-content sorted index.

      For the current setup with three clusters and N cards each:
        - See Work (cluster i=0, timeOffset=0): FG = sorted index 0.
        - Get to Know (cluster i=1, timeOffset≈0.838): with N=7,
          FG = sorted index 6 (closest to satisfying the equation).
        - How This Works (cluster i=2, timeOffset≈1.676): N=1,
          single card lives wherever its phase plus the offset puts it.

      Authors choosing which card to feature at each cluster's
      foreground should set per-card `order` so the desired card
      lands at THIS cluster's FG sorted index, not at index 0.
    -->
    <ScramblerClusterComponent
      {cluster}
      containerWidth={width}
      containerHeight={height}
      timeOffset={i * (Math.PI * 2 / 3) * 0.4 + manualTimeOffset}
      onCardSelect={onCardSelect}
      {anyCardOpen}
      {tapPaused}
      onToggleTapPause={toggleTapPause}
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
