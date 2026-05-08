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
    /* Hoisted from Scrambler — true when ANY cluster has a focused
     * or expanded card. All clusters pause together so background
     * orbits don't compete with the user's reading focus. */
    anyCardOpen?: boolean;
  }

  let {
    cluster,
    containerWidth,
    containerHeight,
    timeOffset = 0,
    onCardSelect,
    anyCardOpen = false,
  }: Props = $props();

  /* Two distinct pause sources, kept separate so each can be cleared
   * independently — this is what fixes the "orbit doesn't restart"
   * bug on both mobile and desktop. Previously a single isPaused
   * flag was pinned true by focusin (clicking the toggle button
   * focuses it, focusout never fires because the button stays
   * rendered after collapse). Splitting the source lets pointer
   * activity override stale focus state without affecting hover.
   *
   *   hoverPaused — true while a mouse/pen is over the cluster.
   *                 Cleared by pointerleave. Touch never sets it.
   *   focusPaused — true ONLY when keyboard-driven focus enters a
   *                 descendant. Cleared by focusout OR any
   *                 pointerdown anywhere on the document. Touch /
   *                 mouse focus never sets it. */
  let hoverPaused = $state(false);
  let focusPaused = $state(false);
  let isKeyboardActive = $state(false);
  let clusterEl: HTMLDivElement | undefined = $state();
  let isDraggingCard = $state(false);
  // True for ~800ms after the last expanded/focused card closes (#39).
  // .scrambler-card has a spring CSS transition on `transform`, so when
  // `isLifted` flips off the scale interpolates from 1.0 back to the
  // card's orbital scale. The orbit's per-frame scale updates re-target
  // the spring constantly during that window — visible as two cards
  // jockeying for position. Holding the orbit while the spring settles
  // gives the card a stable target to land on.
  let recentlyCollapsed = $state(false);
  let collapseTimer: ReturnType<typeof setTimeout> | undefined;

  // Per-card phase offsets — added to a card's natural orbit phase so
  // the user can DRAG cards along the orbit. The offset persists after
  // release: the dragged card resumes orbital rotation from its new
  // phase position when the orbit resumes.
  let phaseOffsets = $state<Map<string, number>>(new Map());

  /* React to the global anyCardOpen signal: when it transitions
   * true → false, hold this cluster's orbit for 800ms so any
   * spring transitions inside this cluster's cards finish settling
   * before motion resumes. When it goes false → true we cancel
   * any pending grace (we're going back to a paused state anyway).
   *
   * prevAnyCardOpen is intentionally a plain variable, not $state —
   * we don't want writes to it to retrigger the effect. */
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
    } else if (!prevAnyCardOpen && open) {
      if (collapseTimer !== undefined) {
        clearTimeout(collapseTimer);
        collapseTimer = undefined;
      }
      recentlyCollapsed = false;
    }
    prevAnyCardOpen = open;
  });

  /* Separate unmount cleanup — runs only when the cluster unmounts,
   * not on every anyCardOpen change. */
  $effect(() => {
    return () => {
      if (collapseTimer !== undefined) clearTimeout(collapseTimer);
    };
  });

  // Pause the orbital animation if hovered/focused, if any card is
  // expanded, OR if a card is being dragged. Once the user finishes
  // (collapses the expanded card or releases the drag), the cluster
  // resumes orbital rotation — but with any drag-induced phase
  // offsets still applied, so cards stay where they were dragged.
  const orbitPaused = $derived(
    hoverPaused || focusPaused || anyCardOpen || isDraggingCard || recentlyCollapsed,
  );

  /* Track keyboard vs pointer mode globally so focusin can decide
   * whether it was triggered by a Tab (pause is desired UX so cards
   * don't move under keyboard nav) or by a click/tap on a button
   * (which also focuses the button on most browsers — but the user
   * doesn't expect a click to pin the orbit). */
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
      /* Pointer activity always overrides any stale focus pause —
       * defense against iOS/desktop browsers that don't reliably
       * fire focusout when focus stays on a still-rendered button
       * after a card collapses. */
      focusPaused = false;
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onPointer, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onPointer, true);
    };
  });

  // ── DRAG handlers ──────────────────────────────────────────────
  function handleCardDragStart() {
    isDraggingCard = true;
  }

  function handleCardDragEnd() {
    isDraggingCard = false;
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

  const config = $derived(orbitConfig[cluster.orbit]);

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
  onpointerenter={(e) => {
    /* Hover pause is a separate signal from focus pause so each can
     * be cleared independently. Touch is excluded — there's no
     * lingering hover state on touch. */
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') hoverPaused = true;
  }}
  onpointerleave={(e) => {
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') hoverPaused = false;
  }}
  onfocusin={() => {
    /* Only pause for keyboard-driven focus. A click or tap also
     * triggers focusin (on the focusable target, e.g. a button) but
     * the user doesn't expect that to pin the orbit. */
    if (isKeyboardActive) focusPaused = true;
  }}
  onfocusout={() => (focusPaused = false)}
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
        onSelect={onCardSelect}
        onDragStart={handleCardDragStart}
        onDragMove={handleCardDragMove}
        onDragEnd={handleCardDragEnd}
      />
    </div>
  {/each}
</div>

<style>
  .scrambler-cluster {
    position: absolute;
    inset: 0;
  }

  .cluster-label {
    position: absolute;
    top: var(--space-4);
    left: var(--space-4);
    font-size: 0.75rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
    pointer-events: none;
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
