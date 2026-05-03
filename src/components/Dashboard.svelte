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

  const bothOff = $derived(!seeWorkActive && !getToKnowActive);

  const visibleClusters = $derived.by(() => {
    return initialClusters.filter((cluster) => {
      const seeWorkTypes = ['portfolio', 'repo', 'meta', 'skills'];
      const getToKnowTypes = ['talk', 'writing', 'link', 'inspiration'];
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

<div class="stage">
  <Avatar onExpand={handleAvatarExpand} />

  <section class="windshield" aria-label="Content navigator">
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
