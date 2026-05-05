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
  }

  let {
    cluster,
    containerWidth,
    containerHeight,
    timeOffset = 0,
    onCardSelect,
  }: Props = $props();

  let isPaused = $state(false);
  let clusterEl: HTMLDivElement | undefined = $state();
  let hasExpandedCard = $state(false);
  let isDraggingCard = $state(false);

  // Per-card phase offsets — added to a card's natural orbit phase so
  // the user can DRAG cards along the orbit. The offset persists after
  // release: the dragged card resumes orbital rotation from its new
  // phase position when the orbit resumes.
  let phaseOffsets = $state<Map<string, number>>(new Map());

  // While ANY card inside this cluster is FOCUSED (clicked to pause)
  // or EXPANDED (clicked + to fully open), freeze the orbit so the
  // active card stays put. Detected via a MutationObserver watching
  // for either class on any descendant.
  $effect(() => {
    if (!clusterEl || typeof MutationObserver === 'undefined') return;
    const update = () => {
      hasExpandedCard = !!clusterEl?.querySelector(
        '.scrambler-card.focused, .scrambler-card.expanded',
      );
    };
    update();
    const obs = new MutationObserver(update);
    obs.observe(clusterEl, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => obs.disconnect();
  });

  // Pause the orbital animation if hovered/focused, if any card is
  // expanded, OR if a card is being dragged. Once the user finishes
  // (collapses the expanded card or releases the drag), the cluster
  // resumes orbital rotation — but with any drag-induced phase
  // offsets still applied, so cards stay where they were dragged.
  const orbitPaused = $derived(isPaused || hasExpandedCard || isDraggingCard);

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
  onmouseenter={() => (isPaused = true)}
  onmouseleave={() => (isPaused = false)}
  onfocusin={() => (isPaused = true)}
  onfocusout={() => (isPaused = false)}
>
  <span class="cluster-label" style:opacity={cluster.orbit === 'inner' ? 0.7 : 0.3}>
    {cluster.label}
  </span>

  {#each cardPositions as { card, position } (card.id)}
    <div
      class="card-wrapper"
      style:transform="translate3d({position.x}px, {position.y}px, 0) translate(-50%, -50%)"
      style:z-index={Math.round((1 - position.z) * 100)}
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
     ScramblerCard component which has its own scope hash. */
  .card-wrapper:hover,
  .card-wrapper:has(:global(:focus-visible)) {
    z-index: 200 !important;
  }

  /* Focused or expanded card lifts above all orbital siblings. */
  .card-wrapper:has(:global(.scrambler-card.focused)),
  .card-wrapper:has(:global(.scrambler-card.expanded)) {
    z-index: 250 !important;
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
