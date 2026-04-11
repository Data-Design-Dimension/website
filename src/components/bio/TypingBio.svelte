<script lang="ts">
  /**
   * Typewriter bio — text types itself out character by character.
   * Can cycle through multiple statements, backspacing and retyping.
   * A classic effect done with restraint.
   */

  interface Props {
    statements: string[];
    typeSpeed?: number;
    deleteSpeed?: number;
    pauseDuration?: number;
    class?: string;
  }

  let {
    statements,
    typeSpeed = 50,
    deleteSpeed = 30,
    pauseDuration = 2000,
    class: className = '',
  }: Props = $props();

  let displayText = $state('');
  let currentStatement = $state(0);
  let isDeleting = $state(false);
  let reducedMotion = $state(false);

  $effect(() => {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      displayText = statements[0];
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout>;

    function tick() {
      const target = statements[currentStatement];

      if (!isDeleting) {
        // Typing forward
        if (displayText.length < target.length) {
          displayText = target.slice(0, displayText.length + 1);
          timeoutId = setTimeout(tick, typeSpeed);
        } else {
          // Pause at full text, then start deleting
          timeoutId = setTimeout(() => {
            isDeleting = true;
            tick();
          }, pauseDuration);
        }
      } else {
        // Deleting
        if (displayText.length > 0) {
          displayText = displayText.slice(0, -1);
          timeoutId = setTimeout(tick, deleteSpeed);
        } else {
          // Move to next statement
          isDeleting = false;
          currentStatement = (currentStatement + 1) % statements.length;
          timeoutId = setTimeout(tick, typeSpeed * 4);
        }
      }
    }

    tick();
    return () => clearTimeout(timeoutId);
  });
</script>

<p class="typing-bio {className}" aria-label={statements.join('. ')}>
  <span aria-hidden="true">{displayText}</span><span class="cursor" aria-hidden="true">|</span>
</p>

<style>
  .typing-bio {
    font-size: 1.25rem;
    line-height: 1.6;
    color: var(--color-text-primary);
    min-height: 2em;
  }

  .cursor {
    color: var(--color-accent-green);
    animation: blink 1s step-end infinite;
    font-weight: 200;
  }

  @keyframes blink {
    50% { opacity: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .cursor { animation: none; opacity: 0; }
  }
</style>
