<script lang="ts">
  /**
   * Bio with character scramble/reveal effect.
   * Text appears to decode itself — characters cycle through random
   * alternatives before settling on the final letter. Triggers on
   * view or hover. Evokes data decoding, a nod to "data" in DADEDA.
   */

  interface Props {
    text: string;
    duration?: number;
    characterSet?: string;
    animateOnHover?: boolean;
    class?: string;
  }

  let {
    text,
    duration = 800,
    characterSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    animateOnHover = true,
    class: className = '',
  }: Props = $props();

  let displayText = $state(text);
  let isAnimating = $state(false);
  let reducedMotion = $state(false);

  $effect(() => {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reducedMotion) {
      scramble();
    }
  });

  function scramble() {
    if (isAnimating || reducedMotion) return;
    isAnimating = true;

    const chars = text.split('');
    const resolved = new Array(chars.length).fill(false);
    const stepDuration = duration / chars.length;

    let frame = 0;

    function tick() {
      // Resolve one more character each step
      const resolveIndex = Math.floor(frame / 2);
      if (resolveIndex < chars.length) {
        resolved[resolveIndex] = true;
      }

      // Build display string
      displayText = chars
        .map((char, i) => {
          if (resolved[i] || char === ' ') return char;
          return characterSet[Math.floor(Math.random() * characterSet.length)];
        })
        .join('');

      frame++;

      if (resolveIndex < chars.length) {
        setTimeout(tick, stepDuration);
      } else {
        displayText = text;
        isAnimating = false;
      }
    }

    // Start scrambled
    displayText = chars
      .map((c) => (c === ' ' ? ' ' : characterSet[Math.floor(Math.random() * characterSet.length)]))
      .join('');
    tick();
  }
</script>

<p
  class="hyper-bio {className}"
  aria-label={text}
  role="text"
  onmouseenter={animateOnHover ? scramble : undefined}
>
  <span aria-hidden="true" class="hyper-text">{displayText}</span>
</p>

<style>
  .hyper-bio {
    font-size: 1.25rem;
    line-height: 1.6;
    color: var(--color-text-primary);
  }

  .hyper-text {
    font-family: var(--font-mono);
    letter-spacing: 0.02em;
  }
</style>
