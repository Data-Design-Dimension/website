<script lang="ts">
  import type { ScramblerCluster, ScramblerPosition } from '../lib/scrambler/types';
  import {
    createOrbitalPath,
    calculateOrbitalPosition,
    warpPhaseToAngle,
    FOREGROUND_ANGLE,
  } from '../lib/scrambler/orbital-math';
  import ScramblerCardComponent from './ScramblerCard.svelte';

  interface Props {
    cluster: ScramblerCluster;
    containerWidth: number;
    containerHeight: number;
    timeOffset?: number;
    onCardSelect?: (card: import('../lib/scrambler/types').ScramblerCard) => void;
    /* Single-source pause state from the Scrambler parent. Every
     * cluster reads the same value, so pause / resume is always
     * synchronous across the whole Scrambler. There is intentionally
     * no local pause state on this component — the asymmetric-freeze
     * bug class the v0.1.0 → v0.1.1 fixes chased was a direct
     * consequence of per-cluster bookkeeping; lifting it to the
     * parent eliminates it at the root. */
    paused: boolean;
    /* Currently-selected card id (null when none). Drives the
     * single-selection invariant — a card whose id doesn't match
     * this prop force-collapses itself. Lives on the Scrambler
     * parent so multi-thumb taps converge to a single selection
     * regardless of which card's local pointerup fired first. */
    selectedCardId: string | null;
    onToggleTapPause: () => void;
    onCardLiftedChange: (cardId: string, lifted: boolean) => void;
    onCardDragChange: (isDragging: boolean) => void;
  }

  let {
    cluster,
    containerWidth,
    containerHeight,
    timeOffset = 0,
    onCardSelect,
    paused,
    selectedCardId,
    onToggleTapPause,
    onCardLiftedChange,
    onCardDragChange,
  }: Props = $props();

  let clusterEl: HTMLDivElement | undefined = $state();

  // Per-card phase offsets — added to a card's natural orbit phase so
  // the user can DRAG cards along the orbit. The offset persists after
  // release: the dragged card resumes orbital rotation from its new
  // phase position when the orbit resumes.
  let phaseOffsets = $state<Map<string, number>>(new Map());

  const orbitPaused = $derived(paused);

  // ── DRAG handlers ──────────────────────────────────────────────
  function handleCardDragStart() {
    onCardDragChange(true);
  }

  function handleCardDragEnd() {
    onCardDragChange(false);
  }

  function handleCardDragMove(cardId: string, clientX: number, clientY: number) {
    if (!clusterEl) return;
    const rect = clusterEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // Cursor angle relative to cluster center (the orbital center).
    const cursorAngle = Math.atan2(clientY - cy, clientX - cx);

    const count = cluster.cards.length;
    if (count === 0) return;
    const angleStep = (Math.PI * 2) / count;
    const i = cluster.cards.findIndex((c) => c.id === cardId);
    if (i < 0) return;

    // Natural phase (no offset). The orbital math warps this monotonically
    // into an actual angle, but for drag purposes we approximate
    // phase ≈ angle (warp is small enough that the inversion is close).
    const naturalPhase = i * angleStep + time + timeOffset + FOREGROUND_ANGLE;
    let offset = cursorAngle - naturalPhase;
    // Normalize to nearest equivalent rotation so we don't accumulate
    // huge multiples of 2π in the offset.
    while (offset > Math.PI) offset -= 2 * Math.PI;
    while (offset < -Math.PI) offset += 2 * Math.PI;

    // New Map reference so Svelte $state picks up the change.
    const next = new Map(phaseOffsets);
    next.set(cardId, offset);
    phaseOffsets = next;
  }

  // Orbit radii — wider to fill viewport space, but card width offset
  // is accounted for in the windshield overflow handling.
  const orbitConfig = {
    inner: { rxFactor: 0.22, ryFactor: 0.22, speed: 0.10 },
    middle: { rxFactor: 0.32, ryFactor: 0.30, speed: 0.07 },
    outer: { rxFactor: 0.40, ryFactor: 0.38, speed: 0.045 },
  } as const;

  // Tester #41 (Nicole, iPhone 15 Pro Max): cards overlapped on mobile
  // because rxFactor/ryFactor are viewport-fraction multipliers and the
  // viewport shrinks faster than the card width does. Boost the radii
  // on narrow viewports so cards spread out instead of crowding the
  // center. Inner orbit gets the largest boost (it's the tightest).
  // Cheap — derived once per resize, no extra animation work.
  const config = $derived.by(() => {
    const base = orbitConfig[cluster.orbit];
    if (containerWidth > 0 && containerWidth < 640) {
      const mobileScale =
        cluster.orbit === 'inner' ? 1.55 : cluster.orbit === 'middle' ? 1.25 : 1.10;
      return {
        ...base,
        rxFactor: base.rxFactor * mobileScale,
        ryFactor: base.ryFactor * mobileScale,
      };
    }
    return base;
  });

  const path = $derived(
    createOrbitalPath({
      centerX: containerWidth / 2,
      centerY: containerHeight / 2,
      radiusX: containerWidth * config.rxFactor,
      radiusY: containerHeight * config.ryFactor,
      speed: config.speed,
    }),
  );

  let time = $state(0);
  let animationId: number | undefined;
  let reducedMotion = $state(false);

  $effect(() => {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) return;

    let lastTime = performance.now();

    function tick(now: number) {
      // Skip orbital work when the tab is hidden. Browsers throttle
      // RAF in hidden tabs but don't always halt it (especially in
      // iframe / PiP contexts). Explicit guard saves the math + state
      // updates that would otherwise queue while invisible. lastTime
      // still advances so dt doesn't jump on re-foreground.
      if (document.hidden) {
        lastTime = now;
        animationId = requestAnimationFrame(tick);
        return;
      }
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      if (!orbitPaused) {
        time += dt * config.speed;
      }
      animationId = requestAnimationFrame(tick);
    }

    animationId = requestAnimationFrame(tick);

    return () => {
      if (animationId !== undefined) {
        cancelAnimationFrame(animationId);
      }
    };
  });

  // Distribute cards evenly around the orbit, anchored so card 0 starts
  // at the FOREGROUND_ANGLE (top-left). timeOffset lets parent stagger clusters.
  const cardPositions = $derived.by(() => {
    const count = cluster.cards.length;
    if (count === 0) return [];

    const angleStep = (Math.PI * 2) / count;

    return cluster.cards.map((card, i) => {
      // Phase is linear in time. Warp it into a non-uniform angle so
      // cards LINGER near the foreground (upper-left) and snap through
      // the back faster. Per-card phase OFFSETS are added on top so a
      // card the user dragged stays at its dragged position and
      // continues orbiting from there.
      const offset = phaseOffsets.get(card.id) ?? 0;
      const phase = i * angleStep + time + timeOffset + FOREGROUND_ANGLE + offset;
      const angle = warpPhaseToAngle(phase);
      const pos = calculateOrbitalPosition(path, angle);
      return { card, position: pos };
    });
  });
</script>

<div
  bind:this={clusterEl}
  class="scrambler-cluster"
  class:paused={orbitPaused}
  role="group"
  aria-label="{cluster.label} — {cluster.cards.length} items"
  onclick={(e) => {
    /* Tap on the cluster background (not on a card) requests the
     * SHARED tap-pause toggle from the parent. Parent applies the
     * cross-cutting guards (anyCardOpen, dragging) before flipping.
     * e.target === e.currentTarget filters bubbled clicks from cards
     * / labels. */
    if (e.target !== e.currentTarget) return;
    onToggleTapPause();
  }}
>
  <span class="cluster-label" style:opacity={cluster.orbit === 'inner' ? 0.7 : 0.3}>
    {cluster.label}
  </span>

  {#each cardPositions as { card, position } (card.id)}
    <div
      class="card-wrapper"
      style:transform="translate3d({position.x}px, {position.y}px, 0) translate(-50%, -50%)"
      style:z-index={
        /* Per-orbit z-index offset so the user's primary content
         * (See Work / inner orbit) always layers ABOVE secondary
         * content (Get to Know / middle, How This Works / outer)
         * when both clusters' FG cards land at the same visual
         * angle. Without this, GTK renders later in the DOM and
         * its FG card paints over See Work's FG card — burying
         * myagent2webmcp behind whatever GTK card was at FG.
         *
         * Ranges:
         *   inner:  200–300  (See Work — primary content)
         *   middle: 100–200  (Get to Know)
         *   outer:    0–100  (How This Works)
         * Tie-points (inner back vs middle FG at 200; middle back
         * vs outer FG at 100) only matter when an invisible deep-
         * back card stacks against a visible FG card; DOM order
         * paints the FG card on top, which is the desired result.
         *
         * Stays safely below Avatar.open (999), Knob (30), Avatar
         * (50), card-backdrop (40), phosphor wordmark (10).
         * Hover / focused / expanded bump above this in the CSS
         * rules below. */
        (cluster.orbit === 'inner' ? 200 : cluster.orbit === 'middle' ? 100 : 0)
        + Math.round((1 - position.z) * 100)
      }
    >
      <ScramblerCardComponent
        {card}
        {position}
        {selectedCardId}
        onSelect={onCardSelect}
        onDragStart={handleCardDragStart}
        onDragMove={handleCardDragMove}
        onDragEnd={handleCardDragEnd}
        onLiftedChange={(lifted) => onCardLiftedChange(card.id, lifted)}
      />
    </div>
  {/each}
</div>

<style>
  .scrambler-cluster {
    position: absolute;
    inset: 0;
  }

  /* Position cluster labels BELOW the DADEDA wordmark across all
     breakpoints. Wordmark uses font-size clamp(2.25rem, 4vw, 3.25rem)
     anchored at top: 1rem on desktop — its bottom edge can reach
     ~4.25rem on wide viewports. 4.5rem clears it with breathing room.
     Mobile keeps a tighter offset since the wordmark there is at the
     clamp floor (2.25rem) anchored at 0.75rem. */
  .cluster-label {
    position: absolute;
    top: 4.5rem;
    left: var(--space-4);
    font-size: 0.75rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
    pointer-events: none;
    /* Explicit z-index keeps the cluster label below the DADEDA
       phosphor wordmark (z-index 10) so a future positioning change
       can't accidentally stack it over the brand mark. */
    z-index: 5;
  }

  @media (max-width: 640px) {
    .cluster-label {
      top: 3.25rem;
      left: 0.75rem;
    }
  }

  .card-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    will-change: transform;
  }

  /* Hover/focus brings the card above all other UI (Knob, Avatar, etc.).
     Expanded cards are bumped even higher so they float over their
     orbital siblings while the user reads them.
     :global() needed because .scrambler-card is rendered by the child
     ScramblerCard component which has its own scope hash.
     These !important values must sit above the inline orbital
     z-index range (max 300 = inner FG), so hover/focused/expanded
     cards always layer above any orbital sibling regardless of
     orbit level. Stays below Avatar.open (999). */
  .card-wrapper:hover,
  .card-wrapper:has(:global(:focus-visible)) {
    z-index: 500 !important;
  }

  /* Focused or expanded card lifts above all orbital siblings. */
  .card-wrapper:has(:global(.scrambler-card.focused)),
  .card-wrapper:has(:global(.scrambler-card.expanded)) {
    z-index: 800 !important;
  }

  .paused .card-wrapper {
    animation: gentle-pulse 3s ease-in-out infinite;
  }

  @keyframes gentle-pulse {
    0%, 100% {
      filter: brightness(1);
    }
    50% {
      filter: brightness(1.04);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .paused .card-wrapper {
      animation: none;
    }
  }
</style>
