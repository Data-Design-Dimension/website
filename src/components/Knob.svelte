<script lang="ts">
  /**
   * The Knob — unified circular dashboard control.
   *
   * Echoes a vintage tube-TV channel knob. Three arc segments (See Work,
   * Get to Know, Contact) wrap around a central rotating dial. Segment
   * labels are rendered as SVG textPath that follows the arc curve, so
   * text is never clipped and stays readable.
   *
   * The Contact flyout is a RADIAL menu — individual items fan out from
   * the Contact arc as extensions of the dial, like labels on a retro
   * car dashboard. They float over the windshield with translucent backing
   * and high-contrast text.
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

  // Contact flyout items, with radial position around the Contact arc
  // (which sits at ~135° / lower-right of the SVG viewBox). Each item
  // gets an angle (in degrees) measured from the Knob center.
  const contactItems = [
    { key: 'email', label: 'Email me', angle: 18 },
    { key: 'resume', label: 'Resume', angle: 36 },
    { key: 'share', label: 'Share', angle: 54 },
    { key: 'linkedin', label: 'LinkedIn', angle: 72 },
    { key: 'github', label: 'GitHub', angle: 90 },
  ] as const;

  function flyoutItemStyle(angleDeg: number): string {
    // Position items radiating from the Knob center.
    // The Knob is 16rem (256px), center at 128px.
    // Radial distance = 9rem (144px) keeps items just outside the rim.
    const angleRad = (angleDeg * Math.PI) / 180;
    const radius = 9.5; // rem
    const x = Math.cos(angleRad) * radius;
    const y = Math.sin(angleRad) * radius;
    // Slight tilt so items are 75% perpendicular to radial — more readable
    const tilt = angleDeg - 90 + 15;
    return `transform: translate(${x}rem, ${y}rem) rotate(${tilt}deg);`;
  }
</script>

<div class="knob" role="group" aria-label="Site dashboard control">
  <!-- SVG ring with arc paths and curved text labels -->
  <svg class="knob-svg" viewBox="0 0 200 200" aria-hidden="true">
    <defs>
      <!-- Glass gradient for the ring body -->
      <radialGradient id="knob-glass" cx="35%" cy="30%">
        <stop offset="0%" stop-color="oklch(0.95 0.005 155 / 0.92)" />
        <stop offset="60%" stop-color="oklch(0.86 0.012 165 / 0.88)" />
        <stop offset="100%" stop-color="oklch(0.78 0.015 155 / 0.85)" />
      </radialGradient>

      <!-- Arc paths for textPath. Drawn left-to-right so text reads naturally. -->
      <!-- Top arc (See Work): from upper-left to upper-right -->
      <path
        id="arc-top"
        d="M 50,55 A 70,70 0 0 1 150,55"
        fill="none"
      />
      <!-- Bottom-left arc (Get to Know): from lower-left to bottom -->
      <path
        id="arc-bl"
        d="M 30,120 A 70,70 0 0 0 100,170"
        fill="none"
      />
      <!-- Bottom-right arc (Contact): from bottom to lower-right -->
      <path
        id="arc-br"
        d="M 100,170 A 70,70 0 0 0 170,120"
        fill="none"
      />
    </defs>

    <!-- Outer body with glass gradient -->
    <circle cx="100" cy="100" r="95" fill="url(#knob-glass)" />
    <!-- Outer rim definition -->
    <circle cx="100" cy="100" r="95" fill="none" stroke="oklch(0.45 0.03 155 / 0.4)" stroke-width="1" />

    <!-- Segment dividers — three radial lines making each arc look distinct -->
    <!-- Three dividers at 270° (top-bottom split), 30°, and 150° -->
    <line x1="100" y1="100" x2="100" y2="13" stroke="oklch(0.45 0.03 155 / 0.55)" stroke-width="1" stroke-linecap="round" />
    <line x1="100" y1="100" x2="24.6" y2="143.5" stroke="oklch(0.45 0.03 155 / 0.55)" stroke-width="1" stroke-linecap="round" />
    <line x1="100" y1="100" x2="175.4" y2="143.5" stroke="oklch(0.45 0.03 155 / 0.55)" stroke-width="1" stroke-linecap="round" />

    <!-- Inner ring around the dial — covers the inner ends of the dividers -->
    <circle cx="100" cy="100" r="44" fill="url(#knob-glass)" />
    <circle cx="100" cy="100" r="44" fill="none" stroke="oklch(0.45 0.03 155 / 0.5)" stroke-width="1" />

    <!-- Curved text labels along the arc paths -->
    <text class="knob-label label-top" class:active={seeWorkActive}>
      <textPath href="#arc-top" startOffset="50%" text-anchor="middle">SEE WORK</textPath>
    </text>
    <text class="knob-label label-bl" class:active={getToKnowActive}>
      <textPath href="#arc-bl" startOffset="50%" text-anchor="middle">GET TO KNOW</textPath>
    </text>
    <text class="knob-label label-br">
      <textPath href="#arc-br" startOffset="50%" text-anchor="middle">CONTACT</textPath>
    </text>
  </svg>

  <!-- Invisible click targets for the three arc segments (positioned over SVG) -->
  <button
    class="knob-segment seg-top"
    class:active={seeWorkActive}
    aria-pressed={seeWorkActive}
    aria-label="Toggle See Work category — portfolio, repos, skills"
    onclick={onToggleSeeWork}
  ></button>

  <button
    class="knob-segment seg-bl"
    class:active={getToKnowActive}
    aria-pressed={getToKnowActive}
    aria-label="Toggle Get to Know category — talks, writing, inspiration"
    onclick={onToggleGetToKnow}
  ></button>

  <button
    class="knob-segment seg-br contact-seg"
    class:open={contactOpen}
    aria-expanded={contactOpen}
    aria-haspopup="menu"
    aria-label="Open contact and share options"
    onclick={() => (contactOpen = !contactOpen)}
    onmouseenter={() => (contactOpen = true)}
    onfocus={() => (contactOpen = true)}
  ></button>

  <!-- Center dial -->
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
      style:transform="translate(-50%, -100%) rotate({dialAngle}rad)"
      aria-hidden="true"
    ></span>
  </div>

  <!-- Radial flyout menu — items extend from Contact arc like dial spokes -->
  {#if contactOpen}
    <div
      class="contact-radial"
      role="menu"
      aria-label="Contact options"
      onmouseleave={() => (contactOpen = false)}
    >
      {#each contactItems as item (item.key)}
        <button
          class="radial-item"
          role="menuitem"
          style={flyoutItemStyle(item.angle)}
          onclick={() => {
            onContactAction(item.key);
            contactOpen = false;
          }}
        >
          {item.label}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .knob {
    position: relative;
    width: 16rem;
    height: 16rem;
  }

  .knob-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    /* Slight transparency over windshield content */
    opacity: 0.95;
    filter: drop-shadow(8px 12px 20px oklch(0.2 0.01 155 / 0.22));
  }

  /* Curved text labels — high weight + shadow for legibility over content */
  .knob-label {
    font-family: var(--font-mono);
    font-size: 9.5px;
    font-weight: 800;
    letter-spacing: 0.18em;
    fill: var(--color-text-primary);
    paint-order: stroke fill;
    stroke: oklch(0.95 0.005 155 / 0.85);
    stroke-width: 2.5px;
  }

  .knob-label.active {
    fill: oklch(from var(--color-accent-green) calc(l - 0.15) c h);
  }

  /* Click targets sit over the SVG arcs */
  .knob-segment {
    position: absolute;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .knob-segment:focus-visible {
    outline: 2px solid var(--color-accent-green);
    outline-offset: 2px;
    border-radius: 9999px;
  }

  .seg-top {
    top: 8%;
    left: 18%;
    width: 64%;
    height: 22%;
    border-radius: 12rem 12rem 0 0 / 8rem 8rem 0 0;
  }

  .seg-bl {
    bottom: 12%;
    left: 6%;
    width: 42%;
    height: 38%;
    border-radius: 8rem 0 0 12rem / 6rem 0 0 8rem;
  }

  .seg-br {
    bottom: 12%;
    right: 6%;
    width: 42%;
    height: 38%;
    border-radius: 0 8rem 12rem 0 / 0 6rem 8rem 0;
  }

  .knob-segment:hover ~ .knob-svg .knob-label {
    /* hover would brighten text — handled via :has at parent */
  }

  /* Center dial */
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
      0 4px 12px oklch(0.2 0.01 155 / 0.25),
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
    transform-origin: bottom center;
    box-shadow: 0 0 6px oklch(from var(--color-accent-green) l c h / 0.6);
  }

  /* Radial menu — items extend from Contact arc like spokes */
  .contact-radial {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    pointer-events: none;
    z-index: 40;
  }

  .radial-item {
    position: absolute;
    top: 0;
    left: 0;
    /* Pill-shaped extension matching dial glass aesthetic */
    padding: 0.5rem 1rem;
    background: linear-gradient(135deg,
      color-mix(in oklch, var(--glass-tint) 55%, oklch(0.62 0.07 165)) 0%,
      color-mix(in oklch, var(--glass-tint) 60%, oklch(0.50 0.06 165)) 100%
    );
    color: var(--color-text-primary);
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
    border: 1px solid oklch(0.55 0.04 155 / 0.4);
    border-radius: 9999px;
    cursor: pointer;
    pointer-events: auto;
    transform-origin: 0 50%;
    box-shadow:
      0 4px 12px oklch(0.2 0.01 155 / 0.25),
      0 0 0 1px oklch(0.95 0.01 155 / 0.5),
      inset 1px 1px 0 var(--glass-edge-light);
    /* Animate in from center */
    animation: radial-in var(--duration-normal) var(--ease-spring) backwards;
  }

  .radial-item:hover,
  .radial-item:focus-visible {
    background: linear-gradient(135deg,
      color-mix(in oklch, var(--color-accent-green) 25%, var(--glass-tint)) 0%,
      color-mix(in oklch, var(--color-accent-green) 18%, var(--glass-tint)) 100%
    );
    color: var(--color-text-primary);
    outline: 2px solid var(--color-accent-green);
    outline-offset: 2px;
  }

  @keyframes radial-in {
    from {
      opacity: 0;
      transform: translate(0, 0) rotate(0deg) scale(0.7);
    }
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
    .knob-label {
      font-size: 8.5px;
    }
    .radial-item {
      font-size: 0.6875rem;
      padding: 0.4rem 0.7rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .radial-item {
      animation: none;
    }
  }
</style>
