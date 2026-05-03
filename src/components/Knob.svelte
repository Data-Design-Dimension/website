<script lang="ts">
  /**
   * The Knob — unified circular dashboard control.
   *
   * Replaces three separate UI elements (filter buttons + manual dial +
   * action menu) with one cohesive circular control echoing the vintage
   * tube-TV channel knob. CRT-glass styling matches the cards.
   *
   * Layout:
   *   - Center: rotating dial for manual card cycling (microfiche metaphor)
   *   - Top arc: "See Work" filter toggle
   *   - Bottom-left arc: "Get to Know" filter toggle
   *   - Bottom-right arc: "Contact Center" with hover/focus flyout
   */

  interface Props {
    seeWorkActive: boolean;
    getToKnowActive: boolean;
    onToggleSeeWork: () => void;
    onToggleGetToKnow: () => void;
    onContactAction: (action: 'email' | 'resume' | 'linkedin' | 'github' | 'share') => void;
    onDial: (delta: number) => void;
  }

  let {
    seeWorkActive,
    getToKnowActive,
    onToggleSeeWork,
    onToggleGetToKnow,
    onContactAction,
    onDial,
  }: Props = $props();

  let contactOpen = $state(false);
  let dialAngle = $state(0);
  let isDragging = $state(false);
  let dialEl: HTMLDivElement | undefined = $state();

  function handleDialPointerDown(e: PointerEvent) {
    if (!dialEl) return;
    isDragging = true;
    dialEl.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function handleDialPointerMove(e: PointerEvent) {
    if (!isDragging || !dialEl) return;
    const rect = dialEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
    const prevAngle = dialAngle;
    dialAngle = angle;
    let delta = angle - prevAngle;
    // Wrap delta to shortest path
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    onDial(delta);
  }

  function handleDialPointerUp(e: PointerEvent) {
    if (!dialEl) return;
    isDragging = false;
    dialEl.releasePointerCapture(e.pointerId);
  }

  function handleDialKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onDial(-Math.PI / 12);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onDial(Math.PI / 12);
    }
  }
</script>

<div class="knob" role="group" aria-label="Site dashboard control">
  <!-- Background ring with three arc segments -->
  <svg class="knob-ring" viewBox="0 0 200 200" aria-hidden="true">
    <defs>
      <filter id="knob-glow">
        <feGaussianBlur stdDeviation="2" />
      </filter>
    </defs>
    <!-- Outer ring -->
    <circle cx="100" cy="100" r="95" fill="var(--glass-tint)" stroke="var(--glass-edge-shadow)" stroke-width="1" />
    <!-- Inner concave ring -->
    <circle cx="100" cy="100" r="48" fill="none" stroke="var(--glass-edge-shadow)" stroke-width="0.5" />
  </svg>

  <!-- See Work segment (top) -->
  <button
    class="knob-segment seg-top"
    class:active={seeWorkActive}
    aria-pressed={seeWorkActive}
    aria-label="Toggle See Work category — portfolio, repos, skills, fantasy projects"
    onclick={onToggleSeeWork}
  >
    <span class="seg-label">See Work</span>
  </button>

  <!-- Get to Know segment (bottom-left) -->
  <button
    class="knob-segment seg-bl"
    class:active={getToKnowActive}
    aria-pressed={getToKnowActive}
    aria-label="Toggle Get to Know category — talks, writing, podcasts, interviews, inspiration"
    onclick={onToggleGetToKnow}
  >
    <span class="seg-label">Get to Know</span>
  </button>

  <!-- Contact Center segment (bottom-right) -->
  <div class="knob-segment seg-br contact-seg" class:open={contactOpen}>
    <button
      class="contact-trigger"
      aria-expanded={contactOpen}
      aria-haspopup="menu"
      aria-label="Open contact and share options"
      onclick={() => (contactOpen = !contactOpen)}
      onmouseenter={() => (contactOpen = true)}
      onfocus={() => (contactOpen = true)}
    >
      <span class="seg-label">Contact</span>
    </button>
    {#if contactOpen}
      <div
        class="contact-flyout"
        role="menu"
        onmouseleave={() => (contactOpen = false)}
      >
        <button role="menuitem" onclick={() => onContactAction('email')}>Email me</button>
        <button role="menuitem" onclick={() => onContactAction('resume')}>Download resume</button>
        <button role="menuitem" onclick={() => onContactAction('linkedin')}>LinkedIn</button>
        <button role="menuitem" onclick={() => onContactAction('github')}>GitHub</button>
        <button role="menuitem" onclick={() => onContactAction('share')}>Share site</button>
      </div>
    {/if}
  </div>

  <!-- Center dial (microfiche cycling control) -->
  <div
    class="knob-dial"
    bind:this={dialEl}
    role="slider"
    tabindex="0"
    aria-label="Manual card cycling dial — drag or use arrow keys to navigate"
    aria-valuemin="-180"
    aria-valuemax="180"
    aria-valuenow={Math.round((dialAngle * 180) / Math.PI)}
    onpointerdown={handleDialPointerDown}
    onpointermove={handleDialPointerMove}
    onpointerup={handleDialPointerUp}
    onpointercancel={handleDialPointerUp}
    onkeydown={handleDialKeydown}
  >
    <span
      class="dial-indicator"
      style:transform="rotate({dialAngle}rad)"
      aria-hidden="true"
    ></span>
  </div>
</div>

<style>
  .knob {
    position: relative;
    width: 16rem;
    height: 16rem;
    aspect-ratio: 1;
  }

  .knob-ring {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    filter: drop-shadow(6px 8px 16px oklch(0.2 0.01 155 / 0.18));
  }

  .knob-segment {
    position: absolute;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    transition: color var(--duration-fast) ease;
    padding: 0;
  }

  .knob-segment:hover,
  .knob-segment:focus-visible {
    color: var(--color-text-primary);
  }

  .knob-segment.active {
    color: var(--color-accent-green);
  }

  .seg-top {
    top: 8%;
    left: 50%;
    transform: translateX(-50%);
  }

  .seg-bl {
    bottom: 18%;
    left: 12%;
  }

  .seg-br {
    bottom: 18%;
    right: 12%;
  }

  .contact-trigger {
    background: transparent;
    border: none;
    color: inherit;
    font: inherit;
    text-transform: inherit;
    letter-spacing: inherit;
    cursor: pointer;
    padding: 0;
  }

  .contact-flyout {
    position: absolute;
    top: -2rem;
    right: -1rem;
    transform: translate(100%, -100%);
    background: var(--glass-tint);
    border: 1px solid var(--glass-edge-shadow);
    border-radius: 0.75rem;
    padding: var(--space-2);
    box-shadow: 0 8px 24px oklch(0.2 0.01 155 / 0.15);
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 12rem;
    z-index: 10;
  }

  .contact-flyout button {
    background: transparent;
    border: none;
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    font-size: 0.875rem;
    text-align: left;
    padding: var(--space-2) var(--space-3);
    border-radius: 0.375rem;
    cursor: pointer;
    text-transform: none;
    letter-spacing: normal;
  }

  .contact-flyout button:hover,
  .contact-flyout button:focus-visible {
    background: oklch(from var(--color-accent-green) l c h / 0.15);
    color: var(--color-text-primary);
  }

  .knob-dial {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 5.5rem;
    height: 5.5rem;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: linear-gradient(135deg,
      color-mix(in oklch, var(--glass-tint) 50%, oklch(0.62 0.07 165)),
      color-mix(in oklch, var(--glass-tint) 60%, oklch(0.46 0.06 165))
    );
    box-shadow:
      0 4px 12px oklch(0.2 0.01 155 / 0.2),
      inset 1px 1px 0 var(--glass-edge-light),
      inset -1px -1px 0 var(--glass-edge-shadow);
    cursor: grab;
    touch-action: none;
  }

  .knob-dial:active {
    cursor: grabbing;
  }

  .knob-dial:focus-visible {
    outline: 2px solid var(--color-accent-green);
    outline-offset: 4px;
  }

  .dial-indicator {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 2px;
    height: 35%;
    background: var(--color-accent-green);
    border-radius: 2px;
    transform-origin: top center;
    transform: translate(-50%, 0);
    box-shadow: 0 0 6px oklch(from var(--color-accent-green) l c h / 0.6);
  }

  @media (max-width: 640px) {
    .knob {
      width: 9rem;
      height: 9rem;
    }
    .knob-dial {
      width: 3.25rem;
      height: 3.25rem;
    }
    .seg-label {
      font-size: 0.625rem;
    }
  }
</style>
