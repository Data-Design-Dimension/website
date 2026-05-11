<script lang="ts">
  import type { ScramblerCard, ScramblerCluster } from '../lib/scrambler/types';
  import { isOrbitPaused } from '../lib/scrambler/pause';
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

  /*
   * SINGLE-SOURCE-OF-TRUTH PAUSE STATE.
   *
   * Every cluster reads the same `paused` derived. There is no
   * intentional UX reason for one cluster to pause while another
   * orbits — the prior per-cluster model produced asymmetric freezes
   * (one cluster's local hover/focus/drag flag could stick without
   * affecting siblings, and the user had no recovery path short of
   * very specific pointer choreography). Hoisting every reason here
   * removes that whole class of bugs at the root.
   *
   * Reasons:
   *   hovered            — pointer is anywhere inside the Scrambler
   *                        (mouse/pen only — touch never sets it)
   *   focusInside        — keyboard focus is inside the Scrambler
   *                        (gated by isKeyboardActive in the
   *                        derivation so click-driven focus on a
   *                        button doesn't pin the orbit)
   *   tapPaused          — sticky toggle from a background click
   *   openCards          — set of currently-lifted card IDs;
   *                        anyCardOpen = openCards.size > 0
   *   dragging           — a card is mid-drag anywhere
   *   recentlyCollapsed  — 800ms grace after a card-close so the
   *                        spring transitions settle visually before
   *                        orbital motion resumes
   */
  let hovered = $state(false);
  let focusInside = $state(false);
  let isKeyboardActive = $state(false);
  let tapPaused = $state(false);
  let openCards = $state<Set<string>>(new Set());
  let dragging = $state(false);
  let recentlyCollapsed = $state(false);
  let collapseTimer: ReturnType<typeof setTimeout> | undefined;

  const anyCardOpen = $derived(openCards.size > 0);

  const paused = $derived(
    isOrbitPaused({
      hover: hovered,
      focus: focusInside && isKeyboardActive,
      tap: tapPaused,
      anyCardOpen,
      dragging,
      recentlyCollapsed,
    }),
  );

  /* Card-close grace: when anyCardOpen transitions true→false, hold
   * every cluster's orbit for 800ms so any in-flight spring
   * transitions on the closing card finish settling. Also force-clear
   * hovered + focusInside on the same edge — the .scrambler div is
   * the outermost pause boundary and closing a card under the cursor
   * doesn't fire pointerleave on the scrambler itself, so without an
   * explicit reset the hover-pause would pin every cluster
   * indefinitely after a close gesture. The close is an explicit
   * "I'm done reading" signal; pointerenter re-engages hover-pause on
   * the next pointer-from-outside if the user wants it. */
  let prevAnyCardOpen = false;
  $effect(() => {
    const open = anyCardOpen;
    if (prevAnyCardOpen && !open) {
      recentlyCollapsed = true;
      if (collapseTimer !== undefined) clearTimeout(collapseTimer);
      collapseTimer = setTimeout(() => {
        recentlyCollapsed = false;
        collapseTimer = undefined;
      }, 800);
      hovered = false;
      focusInside = false;
    } else if (!prevAnyCardOpen && open) {
      if (collapseTimer !== undefined) {
        clearTimeout(collapseTimer);
        collapseTimer = undefined;
      }
      recentlyCollapsed = false;
    }
    prevAnyCardOpen = open;
  });

  $effect(() => {
    return () => {
      if (collapseTimer !== undefined) clearTimeout(collapseTimer);
    };
  });

  /* Global keyboard / pointer mode tracking. Keyboard activity gates
   * focusInside from contributing to pause (so a click-driven focus
   * doesn't pin the orbit). One listener pair for the whole
   * Scrambler — was duplicated per-cluster before. */
  $effect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === 'Tab' ||
        e.key === 'Enter' ||
        e.key === ' ' ||
        e.key.startsWith('Arrow')
      ) {
        isKeyboardActive = true;
      }
    };
    const onPointer = () => {
      isKeyboardActive = false;
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onPointer, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onPointer, true);
    };
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

  // ── Callbacks for descendants ────────────────────────────────────

  function toggleTapPause() {
    /* Guards: bg-tap that closes a card shouldn't also flip pause
     * (A1 from the v0.1.0 clarity review). And a release-after-drag
     * synthesized click shouldn't flip pause either. */
    if (anyCardOpen) return;
    if (dragging) return;
    tapPaused = !tapPaused;
  }

  function onCardLiftedChange(cardId: string, lifted: boolean) {
    /* Idempotent Set updates — robust against duplicate or missed
     * calls (a card unmounting while lifted, a re-render firing the
     * same transition twice). add/remove of an existing/missing key
     * is a no-op rather than a count drift. */
    if (lifted) {
      if (openCards.has(cardId)) return;
      openCards = new Set([...openCards, cardId]);
    } else {
      if (!openCards.has(cardId)) return;
      const next = new Set(openCards);
      next.delete(cardId);
      openCards = next;
    }
  }

  function onCardDragChange(isDragging: boolean) {
    /* Card-level pointer capture means at most one card drags at a
     * time, so a single boolean is sufficient. ScramblerCard also
     * listens for lostpointercapture so a system-preempted drag
     * doesn't strand this flag at true. */
    dragging = isDragging;
  }
</script>

<div
  class="scrambler"
  bind:this={containerEl}
  role="region"
  aria-label="Interactive content navigator — use Tab to focus on cards, Enter to select"
  aria-live="polite"
  onpointerenter={(e) => {
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') hovered = true;
  }}
  onpointerleave={(e) => {
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') hovered = false;
  }}
  onpointercancel={() => {
    hovered = false;
  }}
  onfocusin={() => {
    if (isKeyboardActive) focusInside = true;
  }}
  onfocusout={(e) => {
    /* Only clear when focus is actually leaving the Scrambler
     * entirely. Tab between sibling cards keeps focus inside; we
     * don't want each Tab to trip a false focusout-then-focusin. */
    if (e.relatedTarget instanceof Node && containerEl?.contains(e.relatedTarget)) return;
    focusInside = false;
  }}
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
      {paused}
      onToggleTapPause={toggleTapPause}
      onCardLiftedChange={onCardLiftedChange}
      onCardDragChange={onCardDragChange}
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
