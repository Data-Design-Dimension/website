<script lang="ts">
  /**
   * Bio with rotating key words.
   * Static frame text with one rotating slot that cycles through alternatives.
   * Uses CSS animation for the vertical rotation.
   */

  interface Props {
    prefix: string;
    words: string[];
    suffix?: string;
    duration?: number;
    class?: string;
  }

  let {
    prefix,
    words,
    suffix = '',
    duration = 2500,
    class: className = '',
  }: Props = $props();

  let currentIndex = $state(0);
  let reducedMotion = $state(false);

  $effect(() => {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const timer = setInterval(() => {
      currentIndex = (currentIndex + 1) % words.length;
    }, duration);

    return () => clearInterval(timer);
  });
</script>

<p class="word-rotate-bio {className}" aria-label="{prefix} {words.join(', ')} {suffix}">
  <span class="bio-static">{prefix}</span>
  <span class="bio-rotate-container">
    {#each words as word, i (word)}
      <span
        class="bio-rotate-word"
        class:active={i === currentIndex}
        aria-hidden={i !== currentIndex}
      >
        {word}
      </span>
    {/each}
  </span>
  {#if suffix}
    <span class="bio-static">{suffix}</span>
  {/if}
</p>

<style>
  .word-rotate-bio {
    font-size: 1.5rem;
    line-height: 1.5;
    color: var(--color-text-primary);
  }

  .bio-static {
    /* Static text stays put */
  }

  .bio-rotate-container {
    display: inline-block;
    position: relative;
    vertical-align: baseline;
    overflow: hidden;
    height: 1.5em;
    min-width: 8ch;
  }

  .bio-rotate-word {
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    font-weight: 600;
    color: var(--color-accent-green);
    transform: translateY(100%);
    opacity: 0;
    transition:
      transform var(--duration-normal) var(--ease-spring),
      opacity var(--duration-fast) ease;
  }

  .bio-rotate-word.active {
    transform: translateY(0);
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .bio-rotate-word {
      transition: none;
      transform: none;
    }
    .bio-rotate-word:not(.active) {
      display: none;
    }
  }
</style>
