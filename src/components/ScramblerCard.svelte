<script lang="ts">
  import type { ScramblerCard, ScramblerPosition } from '../lib/scrambler/types';

  interface Props {
    card: ScramblerCard;
    position: ScramblerPosition;
    onSelect?: (card: ScramblerCard) => void;
  }

  let { card, position, onSelect }: Props = $props();

  let isHovered = $state(false);

  const isForeground = $derived(position.z < 0.3);
  const isInteractive = $derived(position.z < 0.4);

  function handleClick() {
    if (isInteractive && onSelect) {
      onSelect(card);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && isInteractive && onSelect) {
      onSelect(card);
    }
  }
</script>

<div
  class="scrambler-card"
  class:foreground={isForeground}
  class:interactive={isInteractive}
  class:hovered={isHovered}
  style:transform="translateZ({position.z * -200}px) scale({position.scale})"
  style:opacity={position.opacity}
  style:filter="blur({position.blur}px)"
  role={isInteractive ? 'button' : 'presentation'}
  tabindex={isInteractive ? 0 : -1}
  aria-label={isInteractive ? card.title : undefined}
  aria-hidden={!isInteractive}
  onmouseenter={() => (isHovered = true)}
  onmouseleave={() => (isHovered = false)}
  onclick={handleClick}
  onkeydown={handleKeydown}
>
  {#if card.media}
    <div class="card-media">
      <img src={card.media.src} alt={card.media.alt} loading="lazy" />
    </div>
  {/if}

  <div class="card-content">
    <span class="card-type">{card.type}</span>
    <h3 class="card-title">{card.title}</h3>
    {#if isForeground}
      <p class="card-summary">{card.summary}</p>
      {#if card.cta}
        <span class="card-cta">{card.cta.label} &rarr;</span>
      {/if}
    {/if}
  </div>
</div>

<style>
  .scrambler-card {
    position: absolute;
    width: 280px;
    padding: var(--space-6);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    transition:
      transform var(--duration-slow) var(--ease-spring),
      opacity var(--duration-normal) ease,
      filter var(--duration-normal) ease,
      box-shadow var(--duration-fast) ease;
    will-change: transform, opacity, filter;
    pointer-events: none;
    cursor: default;
  }

  .scrambler-card.interactive {
    pointer-events: auto;
    cursor: pointer;
  }

  .scrambler-card.foreground {
    box-shadow: 0 8px 32px oklch(0.2 0.01 155 / 0.12);
  }

  .scrambler-card.hovered.interactive {
    box-shadow: 0 12px 48px oklch(0.2 0.01 155 / 0.2);
    border-color: var(--color-accent-green);
  }

  .card-media {
    width: 100%;
    aspect-ratio: 16 / 10;
    border-radius: 0.5rem;
    overflow: hidden;
    margin-bottom: var(--space-4);
  }

  .card-media img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .card-type {
    font-size: 0.675rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-accent-blue);
  }

  .card-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin: var(--space-1) 0 0;
    line-height: 1.3;
    color: var(--color-text-primary);
  }

  .card-summary {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    margin: var(--space-2) 0 0;
    line-height: 1.5;
  }

  .card-cta {
    display: inline-block;
    margin-top: var(--space-3);
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-accent-green);
  }

  @media (prefers-reduced-motion: reduce) {
    .scrambler-card {
      transition: none;
    }
  }
</style>
