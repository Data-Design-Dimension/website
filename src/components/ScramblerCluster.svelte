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

  // Orbit radii based on orbit level — inner is closest/largest, outer is furthest
  const orbitConfig = {
    inner: { rxFactor: 0.30, ryFactor: 0.20, speed: 0.3 },
    middle: { rxFactor: 0.40, ryFactor: 0.28, speed: 0.2 },
    outer: { rxFactor: 0.48, ryFactor: 0.35, speed: 0.12 },
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
      time += dt * config.speed;
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
  role="group"
  aria-label="{cluster.label} — {cluster.cards.length} items"
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
</style>
