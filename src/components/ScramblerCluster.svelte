<script lang="ts">
  import { untrack } from 'svelte';
  import type { ScramblerCluster, ScramblerPosition } from '../lib/scrambler/types';
  import { createOrbitalPath, calculateOrbitalPosition } from '../lib/scrambler/orbital-math';
  import ScramblerCardComponent from './ScramblerCard.svelte';

  interface Props {
    cluster: ScramblerCluster;
    containerWidth: number;
    containerHeight: number;
    onCardSelect?: (card: import('../lib/scrambler/types').ScramblerCard) => void;
  }

  let { cluster, containerWidth, containerHeight, onCardSelect }: Props = $props();

  let isPaused = $state(false);

  // Orbit radii — tighter to keep cards on screen
  // Account for card width (~280px) by reserving margin
  const orbitConfig = {
    inner: { rxFactor: 0.18, ryFactor: 0.15, speed: 0.12 },
    middle: { rxFactor: 0.26, ryFactor: 0.20, speed: 0.08 },
    outer: { rxFactor: 0.32, ryFactor: 0.25, speed: 0.05 },
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

  // Distribute cards evenly around the orbit
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

  // Calculate positions for each card in the cluster
  const cardPositions = $derived.by(() => {
    const count = cluster.cards.length;
    if (count === 0) return [];

    const angleStep = (Math.PI * 2) / count;

    return cluster.cards.map((card, i) => {
      const angle = i * angleStep + time;
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
>
  <span class="cluster-label" style:opacity={cluster.orbit === 'inner' ? 0.7 : 0.3}>
    {cluster.label}
  </span>

  {#each cardPositions as { card, position } (card.id)}
    <div
      class="card-wrapper"
      style:left="{position.x}px"
      style:top="{position.y}px"
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
    transform: translate(-50%, -50%);
  }

  .paused .card-wrapper {
    animation: gentle-pulse 3s ease-in-out infinite;
  }

  @keyframes gentle-pulse {
    0%, 100% { transform: translate(-50%, -50%) scale(1); }
    50% { transform: translate(-50%, -50%) scale(1.015); }
  }

  @media (prefers-reduced-motion: reduce) {
    .paused .card-wrapper {
      animation: none;
    }
  }
</style>
