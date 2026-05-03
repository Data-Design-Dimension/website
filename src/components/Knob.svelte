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

  // Contact flyout items radiate UP and RIGHT from the Knob into the
  // windshield's available space (rather than down off-screen, since
  // the Knob is anchored in the lower-left of the viewport).
  // Angles are screen-space (0° = right, -90° = up).
  const contactItems = [
    { key: 'email', label: 'Email me', angle: -85 },
    { key: 'resume', label: 'Resume', angle: -60 },
    { key: 'share', label: 'Share', angle: -35 },
    { key: 'linkedin', label: 'LinkedIn', angle: -10 },
    { key: 'github', label: 'GitHub', angle: 15 },
  ] as const;

  function flyoutItemStyle(angleDeg: number): string {
    const angleRad = (angleDeg * Math.PI) / 180;
    const radius = 9.5;
    const x = Math.cos(angleRad) * radius;
    const y = Math.sin(angleRad) * radius;
    // Tilt items slightly off-perpendicular so labels remain readable.
    // Pure radial (perpendicular) would put labels at extreme angles;
    // we soften by 30° toward horizontal.
    const tilt = angleDeg + 30;
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

      <!-- Arc paths for textPath, sized to stay WITHIN each segment so
           labels never cross the divider lines. Each arc spans ~70° of
           its 120° segment, centered on the segment's midpoint. -->
      <!-- Top arc (See Work) at radius 72, centered at -90° (top) -->
      <path
        id="arc-top"
        d="M 56.6,42 A 72,72 0 0 1 143.4,42"
        fill="none"
      />
      <!-- BL arc (Get to Know) at radius 72, centered at 150° (lower-left) -->
      <path
        id="arc-bl"
        d="M 28,100 A 72,72 0 0 1 63,162.4"
        fill="none"
      />
      <!-- BR arc (Contact) at radius 72, centered at 30° (lower-right) -->
      <path
        id="arc-br"
        d="M 137,162.4 A 72,72 0 0 1 172,100"
        fill="none"
      />
    </defs>

    <!-- Outer body with glass gradient -->
    <circle cx="100" cy="100" r="95" fill="url(#knob-glass)" />
    <!-- Outer rim definition -->
    <circle cx="100" cy="100" r="95" fill="none" stroke="oklch(0.45 0.03 155 / 0.4)" stroke-width="1" />

    <!-- Segment dividers — three radial lines from the inner ring (44)
         to the outer rim (95) at -30° (upper-right), 90° (bottom),
         and -150° (upper-left). These split the dial into three clear
         segment buttons: top, bottom-left, bottom-right. -->
    <line x1="138.1" y1="78" x2="182.3" y2="52.5" stroke="oklch(0.42 0.03 155 / 0.65)" stroke-width="1.25" stroke-linecap="round" />
    <line x1="100" y1="144" x2="100" y2="195" stroke="oklch(0.42 0.03 155 / 0.65)" stroke-width="1.25" stroke-linecap="round" />
    <line x1="61.9" y1="78" x2="17.7" y2="52.5" stroke="oklch(0.42 0.03 155 / 0.65)" stroke-width="1.25" stroke-linecap="round" />

    <!-- Inner ring around the dial — covers the inner ends of the dividers -->
    <circle cx="100" cy="100" r="44" fill="url(#knob-glass)" />
    <circle cx="100" cy="100" r="44" fill="none" stroke="oklch(0.45 0.03 155 / 0.5)" stroke-width="1" />

    <!-- Horizontal text labels positioned at each segment's center.
         Far more readable than curved text on lower segments, where
         textPath rotates glyphs onto their sides. The arc shapes
         themselves still communicate the dial aesthetic. -->
    <text class="knob-label" class:active={seeWorkActive} x="100" y="35" text-anchor="middle">SEE WORK</text>
    <text class="knob-label" class:active={getToKnowActive} x="40" y="148" text-anchor="middle">GET TO</text>
    <text class="knob-label" class:active={getToKnowActive} x="40" y="160" text-anchor="middle">KNOW</text>
    <text class="knob-label" x="160" y="148" text-anchor="middle">CONTACT</text>
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

  /* Curved text labels — high contrast against the glass body itself, no halo.
     Weight 700 with a soft drop shadow gives depth without the white outline. */
  .knob-label {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.16em;
    fill: oklch(0.18 0.012 155);
    filter: drop-shadow(0 1px 0 oklch(0.99 0.004 155 / 0.6));
  }

  .knob-label.active {
    fill: oklch(0.32 0.12 250);
    filter: drop-shadow(0 1px 0 oklch(0.99 0.004 155 / 0.6));
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

  /* Center dial — blueprint blue for colorblind safety, distinct from sage */
  .knob-dial {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 5.5rem;
    height: 5.5rem;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: linear-gradient(135deg,
      oklch(0.32 0.10 250) 0%,
      oklch(0.22 0.08 250) 100%
    );
    box-shadow:
      0 4px 12px oklch(0.15 0.05 250 / 0.35),
      inset 1px 1px 0 oklch(0.65 0.10 250 / 0.6),
      inset -1px -1px 0 oklch(0.15 0.05 250 / 0.7),
      inset 0 0 12px oklch(0.45 0.10 250 / 0.3);
    cursor: grab;
    touch-action: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .knob-dial:active {
    cursor: grabbing;
  }

  .knob-dial:focus-visible {
    outline: 2px solid oklch(0.65 0.18 250);
    outline-offset: 4px;
  }

  /* High-visibility indicator: thicker line + tip dot, all in warm cream
     (high contrast against the dark blueprint dial bg, colorblind-safe) */
  .dial-indicator {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 4px;
    height: 38%;
    background: linear-gradient(to bottom,
      oklch(0.96 0.03 80) 0%,
      oklch(0.96 0.03 80) 70%,
      oklch(0.85 0.05 80) 100%
    );
    border-radius: 2px;
    transform-origin: bottom center;
    box-shadow:
      0 0 8px oklch(0.96 0.03 80 / 0.5),
      0 0 2px oklch(0.96 0.03 80 / 0.9);
  }

  .dial-indicator::before {
    /* Indicator tip — round dot for at-a-glance visibility */
    content: '';
    position: absolute;
    top: -2px;
    left: 50%;
    transform: translateX(-50%);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: oklch(0.96 0.03 80);
    box-shadow:
      0 0 8px oklch(0.96 0.03 80 / 0.7),
      0 0 4px oklch(0.96 0.03 80);
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
    /* Blueprint blue pill — colorblind-safe, ties to brand systems palette */
    padding: 0.55rem 1.1rem;
    background: linear-gradient(135deg,
      oklch(0.32 0.10 250) 0%,
      oklch(0.22 0.08 250) 100%
    );
    color: oklch(0.96 0.02 80);
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
    border: 1px solid oklch(0.45 0.10 250 / 0.5);
    border-radius: 9999px;
    cursor: pointer;
    pointer-events: auto;
    transform-origin: 0 50%;
    box-shadow:
      0 4px 12px oklch(0.15 0.05 250 / 0.35),
      inset 1px 1px 0 oklch(0.55 0.10 250 / 0.5),
      inset -1px -1px 0 oklch(0.15 0.05 250 / 0.6);
    animation: radial-in var(--duration-normal) var(--ease-spring) backwards;
  }

  .radial-item:hover,
  .radial-item:focus-visible {
    background: linear-gradient(135deg,
      oklch(0.42 0.13 250) 0%,
      oklch(0.32 0.11 250) 100%
    );
    color: oklch(0.99 0.02 80);
    outline: 2px solid oklch(0.65 0.18 250);
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
