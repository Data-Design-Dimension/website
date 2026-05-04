<script lang="ts">
  import type { ScramblerCard, ScramblerCluster } from '../lib/scrambler/types';
  import Scrambler from './Scrambler.svelte';
  import Knob from './Knob.svelte';
  import Avatar from './Avatar.svelte';

  interface Props {
    initialClusters: ScramblerCluster[];
  }

  let { initialClusters }: Props = $props();

  let seeWorkActive = $state(true);
  let getToKnowActive = $state(true);
  let manualTimeOffset = $state(0);
  let lastDialUse = $state(0);
  // Shared "an expanded card is open" state. The about-me avatar is
  // the first source today; Scrambler card click-expansion will set
  // the same flag later. When true, a translucent backdrop dims the
  // windshield so the open card pops forward — the Mason-style
  // expand-in-place pattern.
  let cardExpanded = $state(false);

  const bothOff = $derived(!seeWorkActive && !getToKnowActive);

  const visibleClusters = $derived.by(() => {
    return initialClusters.filter((cluster) => {
      const seeWorkTypes = ['portfolio', 'repo', 'meta', 'skills'];
      const getToKnowTypes = ['talk', 'writing', 'inspiration'];
      const isSeeWork = cluster.cards.some((c) => seeWorkTypes.includes(c.type));
      const isGetToKnow = cluster.cards.some((c) => getToKnowTypes.includes(c.type));
      if (isSeeWork && !seeWorkActive) return false;
      if (isGetToKnow && !seeWorkActive === false && !getToKnowActive) return false;
      return seeWorkActive || getToKnowActive;
    });
  });

  function handleContactAction(action: 'email' | 'resume' | 'linkedin' | 'github' | 'share') {
    switch (action) {
      case 'email':
        window.location.href = 'mailto:kathryn@dadeda.design?subject=Hi%20from%20dadeda.design';
        break;
      case 'resume':
        window.open('/Kathryn_Hurchla_resume.pdf', '_blank');
        break;
      case 'linkedin':
        window.open('https://www.linkedin.com/in/kathrynhurchla/', '_blank', 'noopener,noreferrer');
        break;
      case 'github':
        window.open('https://github.com/khurchla', '_blank', 'noopener,noreferrer');
        break;
      case 'share':
        if (navigator.share) {
          navigator.share({
            title: 'DADEDA — Kathryn Hurchla',
            text: 'I make intelligent experiences where design and technology blur.',
            url: 'https://dadeda.design',
          }).catch(() => {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText('https://dadeda.design');
        }
        break;
    }
  }

  function handleDial(delta: number) {
    // Drag rotation maps directly to time offset.
    // 2π drag = 1 full orbit cycle, scaled down so it feels controlled.
    manualTimeOffset += delta * 0.6;
    lastDialUse = performance.now();
  }

  function handleAvatarExpand() {
    // TODO: open About Me overlay
  }

  function handleCardSelect(_card: ScramblerCard) {
    // TODO: open card overlay (Mason-style expand-in-place)
  }
</script>

<div class="stage" class:card-expanded={cardExpanded}>
  <Avatar
    onExpand={handleAvatarExpand}
    onOpenChange={(open) => (cardExpanded = open)}
  />

  <!-- Backdrop dim layer: appears whenever any card is in expanded
       state. Sits behind the open card but above the Scrambler /
       windshield content so the expanded card pops forward. -->
  <div class="card-backdrop" aria-hidden="true"></div>

  <section class="windshield" aria-label="Content navigator">
    <div class="phosphor-wordmark" aria-hidden="true">DADEDA</div>

    {#if bothOff}
      <div class="empty-state" role="status" aria-live="polite">
        <p class="empty-prompt">
          Both content categories are off. Toggle <strong>See Work</strong> or
          <strong>Get to Know</strong> on the dial to see content here.
        </p>
        <p class="empty-hint">Or open <strong>Contact</strong> to reach out directly.</p>
      </div>
    {:else}
      <Scrambler
        clusters={visibleClusters}
        manualTimeOffset={manualTimeOffset}
        onCardSelect={handleCardSelect}
      />
    {/if}
  </section>

  <div class="knob-overlay">
    <Knob
      {seeWorkActive}
      {getToKnowActive}
      onToggleSeeWork={() => (seeWorkActive = !seeWorkActive)}
      onToggleGetToKnow={() => (getToKnowActive = !getToKnowActive)}
      onContactAction={handleContactAction}
      onDial={handleDial}
    />
  </div>
</div>

<style>
  .stage {
    position: relative;
    width: 100%;
    height: 100dvh;
    background: var(--color-canvas);
    overflow: hidden;
  }

  .windshield {
    position: absolute;
    inset: 0;
  }

  /* Backdrop layer for expand-in-place card overlays.
     - At rest: invisible and click-through (pointer-events: none).
     - When .stage.card-expanded is set, the layer fades in to a soft
       canvas-tinted dim with a tiny backdrop blur, focusing attention
       on the expanded card and visually receding the Scrambler.
     - Sits at z-index 40 — above the Knob (z-30) and the Scrambler
       content but below the Avatar (z-50), so the open card pops
       forward over everything else. */
  .card-backdrop {
    position: absolute;
    inset: 0;
    background: oklch(0.72 0.01 155 / 0.30);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    opacity: 0;
    pointer-events: none;
    z-index: 40;
    transition: opacity var(--duration-normal) ease;
  }

  .stage.card-expanded .card-backdrop {
    opacity: 1;
    pointer-events: auto;
  }

  /* When a card is expanded, soften the Knob too — same visual
     recession the Scrambler gets. */
  .stage.card-expanded .knob-overlay {
    opacity: 0.6;
    transition: opacity var(--duration-normal) ease;
  }

  /* Retro-amber phosphor wordmark — small, receded teletext-style
     mark in the upper-left of the windshield, horizontally mirroring
     the Avatar on the upper-right. References: BBC MODE 7 / Bedstead
     teletext SAA5050 typography. We use VT323 (a free Google font with
     the same pixelated CRT-terminal feel) at low chroma + multiply
     blend so it reads as "text burned into a phosphor screen" rather
     than as foreground content. z-index 10 keeps it above the
     Scrambler vignette but below the Knob (z-30). */
  .phosphor-wordmark {
    position: absolute;
    top: 1rem;
    left: 1rem;
    font-family: 'VT323', 'Press Start 2P', ui-monospace, monospace;
    font-weight: 400;
    /* Sized to share a visual scale relationship with the at-rest
       Avatar height: avatar is 3.5rem on desktop / 2.5rem on mobile,
       and VT323's cap-height tracks its font-size closely, so the
       wordmark glyph height ≈ the avatar disc height across breakpoints. */
    font-size: clamp(2.25rem, 4vw, 3.25rem);
    letter-spacing: 0.18em;
    line-height: 1;
    /* Three levers tuned for "barely there phosphor trace":
       - Lightness raised (0.82) so the multiply blend darkens the
         backdrop only slightly — wordmark reads as a tint, not text.
       - Chroma cut roughly in half so the amber feels desaturated.
       - Alpha at 0.35 makes it nearly transparent on its own.
       Combined with a single very soft glow, it sits like the ghost
       of an old CRT image you'd see if a phosphor screen was idling. */
    color: oklch(0.82 0.10 75 / 0.35);
    text-shadow: 0 0 8px oklch(0.78 0.12 75 / 0.20);
    text-rendering: geometricPrecision;
    pointer-events: none;
    user-select: none;
    z-index: 10;
    white-space: nowrap;
    mix-blend-mode: multiply;
  }

  @media (max-width: 640px) {
    .phosphor-wordmark {
      top: 0.75rem;
      left: 0.75rem;
      letter-spacing: 0.14em;
    }
  }

  /* When any card is hovered or focused inside the windshield, pull the
     entire windshield above the Knob's stacking layer so the card can
     fully reveal even at small viewports. */
  .stage:has(.scrambler-card:hover, .scrambler-card:focus-visible) .windshield {
    z-index: 100;
  }

  /* Knob overlays the windshield in lower-left, no separate dashboard zone */
  .knob-overlay {
    position: absolute;
    bottom: 1.5rem;
    left: 1.5rem;
    z-index: 30;
    pointer-events: auto;
  }

  .empty-state {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: var(--space-8);
    color: var(--color-text-secondary);
  }

  .empty-prompt {
    font-size: 1.25rem;
    line-height: 1.5;
    max-width: 36rem;
    margin: 0 0 var(--space-3);
  }

  .empty-prompt strong {
    color: var(--color-accent-green);
    font-weight: 700;
  }

  .empty-hint {
    font-size: 0.9375rem;
    color: var(--color-text-muted);
    margin: 0;
  }

  .empty-hint strong {
    color: var(--color-text-primary);
  }

  /* Mobile portrait: Knob shifts to center-bottom for thumb reach */
  @media (max-width: 640px) {
    .knob-overlay {
      bottom: 1rem;
      left: 50%;
      transform: translateX(-50%);
    }
  }
</style>
