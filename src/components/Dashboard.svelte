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

  // Filter clusters based on active categories
  // For now, simple split: all clusters with cards of certain types
  // belong to "See Work" or "Get to Know" — refine when filter mapping is fully wired.
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
        // TODO: open in-place contact form overlay
        window.location.href = 'mailto:kathryn@dadeda.design?subject=Hi%20from%20dadeda.design';
        break;
      case 'resume':
        window.open('/Kathryn_Hurchla_resume.pdf', '_blank');
        break;
      case 'linkedin':
        window.open('https://www.linkedin.com/in/kathrynhurchla/', '_blank', 'noopener,noreferrer');
        break;
      case 'github':
        window.open('https://github.com/Data-Design-Dimension', '_blank', 'noopener,noreferrer');
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

  function handleDial(_delta: number) {
    // TODO: wire to Scrambler manual time control
  }

  function handleAvatarExpand() {
    // TODO: open About Me overlay
  }

  function handleCardSelect(_card: ScramblerCard) {
    // TODO: open card overlay (Mason-style expand-in-place)
  }
</script>

<div class="dashboard">
  <Avatar onExpand={handleAvatarExpand} />

  <section class="windshield" aria-label="Content navigator">
    <Scrambler clusters={visibleClusters} onCardSelect={handleCardSelect} />
  </section>

  <section class="dashboard-zone" aria-label="Site controls">
    <div class="knob-anchor">
      <Knob
        {seeWorkActive}
        {getToKnowActive}
        onToggleSeeWork={() => (seeWorkActive = !seeWorkActive)}
        onToggleGetToKnow={() => (getToKnowActive = !getToKnowActive)}
        onContactAction={handleContactAction}
        onDial={handleDial}
      />
    </div>
  </section>
</div>

<style>
  .dashboard {
    display: grid;
    grid-template-rows: 1fr auto;
    height: 100dvh;
    background: var(--color-canvas);
  }

  .windshield {
    position: relative;
    overflow: hidden;
    /* CRT cabinet edge — subtle line separating windshield from dashboard */
    border-bottom: 1px solid oklch(0.55 0.02 155 / 0.18);
    box-shadow: 0 4px 12px oklch(0.2 0.01 155 / 0.05);
  }

  .dashboard-zone {
    position: relative;
    height: 28dvh;
    min-height: 18rem;
    background: linear-gradient(to bottom,
      var(--color-canvas-dark),
      var(--color-canvas)
    );
    display: flex;
    align-items: center;
    padding: var(--space-4) var(--space-6);
  }

  .knob-anchor {
    /* Lower-left anchored on desktop, center on mobile */
    margin-left: 0;
  }

  /* Mobile: dashboard becomes thin bar, knob centers */
  @media (max-width: 768px) {
    .dashboard-zone {
      height: auto;
      min-height: 10rem;
      justify-content: center;
    }
    .knob-anchor {
      margin: 0 auto;
    }
  }
</style>
