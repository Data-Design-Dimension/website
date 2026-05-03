<script lang="ts">
  import type { ScramblerCluster, ScramblerPosition } from '../lib/scrambler/types';
  import {
    createOrbitalPath,
    calculateOrbitalPosition,
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
      if (!isPaused) {
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
      const angle = i * angleStep + time + timeOffset + FOREGROUND_ANGLE;
      const pos = calculateOrbitalPosition(path, angle);
      return { card, position: pos };
    });
  });
</script>

<div
  class="scrambler-cluster"
  class:paused={isPaused}
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

  /* Hover/focus brings the card above all other UI (Knob, Avatar, etc.) */
  .card-wrapper:hover,
  .card-wrapper:has(:focus-visible) {
    z-index: 200 !important;
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
