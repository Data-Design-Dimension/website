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

  // Phosphor intensity scales with depth — foreground is "on", background is "off"
  // 1.0 at z=0, 0 at z=0.5+
  const phosphorIntensity = $derived(Math.max(0, 1 - position.z * 2));

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
  style:--phosphor-intensity={phosphorIntensity}
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
  <div class="card-screen">
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
</div>

<style>
  /*
   * CRT face plate effect — cards as convex glass screens.
   * Layered approach using OKLCH color-mix, registered properties,
   * and multi-layer box-shadows. No SVG filters (would distort text).
   */

  .scrambler-card {
    position: absolute;
    width: 340px;
    /* CRT tube-shape: asymmetric corner radii (horizontal 1.5rem /
       vertical 2.25rem) pulls the corners into a subtle pillow,
       making the top + sides bulge outward like a tube TV face. */
    border-radius: 1.5rem / 2.25rem;
    transition:
      transform var(--duration-slow) var(--ease-spring),
      opacity var(--duration-normal) ease,
      filter var(--duration-normal) ease,
      --phosphor-intensity var(--duration-slow) ease;
    will-change: transform, opacity, filter;
    pointer-events: none;
    cursor: default;

    /* Outer bezel shadow — directional light from upper-left */
    box-shadow:
      /* directional drop shadow (light source upper-left) */
      10px 14px 28px oklch(0.2 0.01 155 / 0.18),
      6px 8px 12px oklch(0.2 0.01 155 / 0.12),
      2px 2px 4px oklch(0.2 0.01 155 / 0.10),
      /* hairline outer rim — defines edge against canvas all around */
      0 0 0 1px oklch(0.55 0.02 155 / 0.18);
  }

  /*
   * ::before — Slim glass side wall on the bottom and right.
   * Positioned 4px behind the card, so a 4px sliver is visible — this
   * is the side wall of the curved glass tube. The face curves INTO this
   * side via matching dark-green rim shadow on the screen's bottom-right.
   */
  .scrambler-card::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 1.5rem / 2.25rem;
    transform: translate(4px, 4px);
    background: linear-gradient(
      135deg,
      color-mix(in oklch, var(--glass-tint) 55%, oklch(0.58 0.07 165) 45%) 0%,
      color-mix(in oklch, var(--glass-tint) 60%, oklch(0.46 0.06 165) 40%) 60%,
      color-mix(in oklch, var(--glass-tint) 65%, oklch(0.38 0.05 155) 35%) 100%
    );
    /* Refractive highlight on the inside top + left of the side wall —
       light catches the glass thickness where it meets the face */
    box-shadow:
      inset 0 1px 0 oklch(0.96 0.04 145 / 0.6),
      inset 1px 0 0 oklch(0.96 0.04 145 / 0.45),
      0 0 0 1px oklch(0.42 0.03 155 / 0.25);
    z-index: -1;
    pointer-events: none;
  }

  /* The curved glass face — pillow corners matching the outer card,
     radial luminosity gradient gives the bulge feel (center catches
     more light than edges, like a convex CRT face), and the bottom-
     right rim matches the side wall color so the corner curves
     continuously from face into the visible glass thickness. */
  .card-screen {
    position: relative;
    padding: var(--space-6);
    background:
      /* Bulge highlight — center of the face catches ambient light
         like a convex glass surface */
      radial-gradient(
        ellipse 130% 110% at 38% 32%,
        oklch(1 0 0 / 0.18) 0%,
        oklch(1 0 0 / 0.06) 35%,
        transparent 70%
      ),
      var(--glass-tint);
    border-radius: 1.25rem / 1.85rem;
    overflow: hidden;
    isolation: isolate;
    box-shadow:
      /* Bright top-left refractive rim */
      inset 1px 1px 0 0.5px var(--glass-edge-light),
      inset 2px 2px 5px -1px oklch(0.99 0.02 155 / 0.6),
      /* Bottom-right rim matches side wall color — face curves into side */
      inset -1px -1px 0 0.5px oklch(0.50 0.06 165 / 0.55),
      inset -3px -3px 8px -2px oklch(0.50 0.06 165 / 0.3);
  }

  /*
   * ::before — Ambient glass highlight from top-left
   * Simulates ambient light catching the convex face plate.
   * Linear gradient masked to the upper portion only.
   */
  .card-screen::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(
      135deg,
      oklch(1 0 0 / 0.45) 0%,
      oklch(1 0 0 / 0.12) 18%,
      transparent 45%
    );
    mix-blend-mode: screen;
    z-index: 1;
  }

  /*
   * ::after — Phosphor glow + corner vignette
   * Inner radial gradient creates the CRT corner darkening.
   * Phosphor glow tied to --phosphor-intensity (animatable property).
   * When phosphor-intensity is high (foreground), the screen is "on".
   * When low (background), the screen "powers down".
   */
  .card-screen::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      /* CRT corner vignette */
      radial-gradient(
        ellipse 120% 120% at 50% 50%,
        transparent 60%,
        var(--glass-corner-vignette) 100%
      );
    box-shadow:
      /* phosphor glow — green inner halo, intensity scales with depth */
      inset 0 0 calc(var(--phosphor-intensity) * 32px)
        oklch(from var(--phosphor-color) l c h / calc(var(--phosphor-intensity) * 0.18));
    z-index: 2;
  }

  .scrambler-card.interactive {
    pointer-events: auto;
    cursor: pointer;
  }

  /* Foreground — screen feels fully "powered on", lifted forward */
  .scrambler-card.foreground {
    box-shadow:
      14px 18px 40px oklch(0.2 0.01 155 / 0.20),
      8px 12px 18px oklch(0.2 0.01 155 / 0.14),
      2px 4px 6px oklch(0.2 0.01 155 / 0.10),
      0 0 0 1px oklch(0.55 0.02 155 / 0.20);
  }

  /* Hovered & interactive — phosphor glow brightens, accent green border */
  .scrambler-card.hovered.interactive {
    box-shadow:
      16px 22px 52px oklch(0.2 0.01 155 / 0.24),
      8px 12px 18px oklch(0.2 0.01 155 / 0.14),
      0 0 0 1px oklch(from var(--color-accent-green) l c h / 0.5);
  }

  .scrambler-card.hovered.interactive .card-screen::after {
    box-shadow:
      inset 0 0 48px oklch(from var(--color-accent-green) l c h / 0.22);
  }

  .card-media {
    width: 100%;
    aspect-ratio: 16 / 10;
    border-radius: 0.5rem;
    overflow: hidden;
    margin-bottom: var(--space-4);
    position: relative;
    z-index: 0;
  }

  .card-media img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .card-content {
    position: relative;
    z-index: 0;
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

  @media (max-width: 1024px) {
    .scrambler-card {
      width: 280px;
    }
  }

  @media (max-width: 640px) {
    .scrambler-card {
      width: 220px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .scrambler-card {
      transition: none;
    }
  }
</style>
