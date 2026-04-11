<script lang="ts">
  /**
   * Custom bio text component: modular sentence reordering.
   * Sentences are independent blocks that rearrange on a timer,
   * each sliding to its new position via CSS transitions.
   * Matches the whiteboard vision: "modular sentence/phrase
   * and order is dynamic."
   */

  interface Props {
    phrases: string[];
    interval?: number;
    class?: string;
  }

  let { phrases, interval = 4000, class: className = '' }: Props = $props();

  let currentOrder = $state<number[]>(phrases.map((_, i) => i));
  let reducedMotion = $state(false);

  $effect(() => {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const timer = setInterval(() => {
      // Fisher-Yates shuffle on a copy
      const newOrder = [...currentOrder];
      for (let i = newOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];
      }
      currentOrder = newOrder;
    }, interval);

    return () => clearInterval(timer);
  });

  const orderedPhrases = $derived(
    currentOrder.map((idx) => ({ text: phrases[idx], key: idx })),
  );
</script>

<div class="modular-bio {className}" aria-label={phrases.join(' ')}>
  {#each orderedPhrases as phrase, visualIdx (phrase.key)}
    <span
      class="bio-phrase"
      style:order={visualIdx}
      aria-hidden="true"
    >
      {phrase.text}
    </span>
  {/each}
</div>

<style>
  .modular-bio {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-3);
    align-items: baseline;
  }

  .bio-phrase {
    display: inline-block;
    font-size: 1.25rem;
    line-height: 1.6;
    color: var(--color-text-primary);
    transition:
      order var(--duration-slow) var(--ease-spring),
      opacity var(--duration-normal) ease;
  }

  @media (prefers-reduced-motion: reduce) {
    .bio-phrase {
      transition: none;
    }
  }
</style>
