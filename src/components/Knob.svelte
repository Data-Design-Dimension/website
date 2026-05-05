<script lang="ts">
  /**
   * The Knob — unified circular dashboard control.
   *
   * Three SEPARATED button-pads (Simon-game style) sit around a central
   * dial. Each pad has its own color: green (See Work), blue (Get to Know),
   * amber (Contact). Clear angular gaps between the pads make each button
   * read as a distinct, tappable target. Inactive pads are desaturated;
   * active pads light up.
   *
   * The Contact flyout is a RADIAL menu — items fan out from the Contact
   * pad as extensions of the dial, like labels on a retro car dashboard.
   */

  import { toolInFlight } from '../lib/webmcp/state.svelte';

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

  /**
   * Glow state — when a WebMCP tool is in flight, the targeted control
   * gets an ethereal amber→green halo and is briefly non-interactive
   * to prevent tool interruption. Recedes on completion.
   */
  const glow = $derived(toolInFlight.value);
  const seeWorkGlow = $derived(glow?.target === 'knob-see-work');
  const gtkGlow = $derived(glow?.target === 'knob-gtk');
  const contactGlow = $derived(glow?.target === 'knob-contact');
  const dialGlow = $derived(glow?.target === 'knob-dial');

  let contactOpen = $state(false);
  let dialAngle = $state(0);
  let isDragging = $state(false);
  let dialEl: HTMLDivElement | undefined = $state();

  // Grace-period timer for closing the contact flyout. Without this, a
  // brief cursor transit through the gap between two adjacent flyout
  // items fires mouseleave on the menu container and snaps it closed
  // before the user can land on a button. The 250ms delay swallows
  // those transient leaves; re-entering cancels the pending close.
  let closeTimer: ReturnType<typeof setTimeout> | undefined;

  function openContactNow() {
    if (closeTimer !== undefined) {
      clearTimeout(closeTimer);
      closeTimer = undefined;
    }
    contactOpen = true;
  }

  function scheduleClose() {
    if (closeTimer !== undefined) clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      contactOpen = false;
      closeTimer = undefined;
    }, 250);
  }

  function cancelClose() {
    if (closeTimer !== undefined) {
      clearTimeout(closeTimer);
      closeTimer = undefined;
    }
  }

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

  // Contact flyout: clean LEFT-ALIGNED vertical column to the upper-right
  // of the Knob. All items share the same x so their left edges line up;
  // y values are evenly stepped by 3rem so vertical gaps are uniform.
  // Reads as an intentional menu rather than an arbitrary fan.
  const contactItems = [
    { key: 'email', label: 'Email me', xRem: 8.5, yRem: -10.5 },
    { key: 'resume', label: 'Resume', xRem: 8.5, yRem: -7.5 },
    { key: 'share', label: 'Share', xRem: 8.5, yRem: -4.5 },
    { key: 'linkedin', label: 'LinkedIn', xRem: 8.5, yRem: -1.5 },
    { key: 'github', label: 'GitHub', xRem: 8.5, yRem: 1.5 },
  ] as const;

  function flyoutItemStyle(item: { xRem: number; yRem: number }): string {
    // CSS variables (instead of inline transform) let the keyframe
    // animation use the SAME transform-function shape as the resting
    // state, so interpolation is smooth instead of "popping" between
    // mismatched transform-function lists.
    return `--fx: ${item.xRem}rem; --fy: ${item.yRem}rem;`;
  }

  /**
   * Build a closed ring-sector path with FOUR small rounded fillets at
   * each corner (where the radial edge meets the inner/outer rim).
   *
   * Subtle 4-unit corner radius softens the right-angle corners just
   * enough to feel cushioned, without breaking the cohesive ring shape
   * the way fully-rounded pill caps would.
   *
   * Path traversal (CW): outer rim → fillet → end radial → fillet →
   * inner rim CCW → fillet → start radial → fillet → close.
   */
  function roundedSegment(
    cx: number,
    cy: number,
    r1: number,
    r2: number,
    startDeg: number,
    endDeg: number,
    rc: number,
  ): string {
    const a0 = (startDeg * Math.PI) / 180;
    const a1 = (endDeg * Math.PI) / 180;
    const dOuter = rc / r2;
    const dInner = rc / r1;

    const pt = (r: number, a: number) =>
      `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;

    const P0 = pt(r2, a0 + dOuter);
    const P1 = pt(r2, a1 - dOuter);
    const P2 = pt(r2 - rc, a1);
    const P3 = pt(r1 + rc, a1);
    const P4 = pt(r1, a1 - dInner);
    const P5 = pt(r1, a0 + dInner);
    const P6 = pt(r1 + rc, a0);
    const P7 = pt(r2 - rc, a0);

    const outerLargeArc = a1 - a0 - 2 * dOuter > Math.PI ? 1 : 0;
    const innerLargeArc = a1 - a0 - 2 * dInner > Math.PI ? 1 : 0;

    return [
      `M ${P0}`,
      `A ${r2} ${r2} 0 ${outerLargeArc} 1 ${P1}`,
      `A ${rc} ${rc} 0 0 1 ${P2}`,
      `L ${P3}`,
      `A ${rc} ${rc} 0 0 1 ${P4}`,
      `A ${r1} ${r1} 0 ${innerLargeArc} 0 ${P5}`,
      `A ${rc} ${rc} 0 0 1 ${P6}`,
      `L ${P7}`,
      `A ${rc} ${rc} 0 0 1 ${P0}`,
      'Z',
    ].join(' ');
  }

  // Three ring-sector pads with slim 4° angular gaps between them and
  // 4-unit corner radii. Pads cover radii 52 → 92 (40 thick), arrayed
  // around the dial like a Simon-game face — cohesive circular control
  // with subtle softness at every corner.
  const CORNER_R = 4;
  // Top pad centered at -90°: -148° → -32° (116° span)
  // BL pad centered at 150°:  92° → 208°
  // BR pad centered at 30°:  -28° →  88°
  const padTopPath = roundedSegment(100, 100, 52, 92, -148, -32, CORNER_R);
  const padBlPath = roundedSegment(100, 100, 52, 92, 92, 208, CORNER_R);
  const padBrPath = roundedSegment(100, 100, 52, 92, -28, 88, CORNER_R);
</script>

<div class="knob" role="group" aria-label="Site dashboard control">
  <svg class="knob-svg" viewBox="0 0 200 200" aria-hidden="true">
    <defs>
      <!-- Glossy bevel for each pad — light from upper-left, shadow lower-right -->
      <radialGradient id="pad-gloss" cx="35%" cy="28%" r="75%">
        <stop offset="0%" stop-color="oklch(1 0 0 / 0.55)" />
        <stop offset="38%" stop-color="oklch(1 0 0 / 0.10)" />
        <stop offset="100%" stop-color="oklch(0 0 0 / 0.15)" />
      </radialGradient>

      <!-- Per-pad fills: brand-rooted Simon palette.
           Each has an active and inactive state controlled via CSS class. -->
    </defs>

    <!-- Soft base disc behind everything (subtle housing shadow) -->
    <circle cx="100" cy="100" r="98" fill="oklch(0.86 0.008 155 / 0.35)" />

    <!-- Three ring-sector pads with subtly rounded corners. Drawn as
         filled paths (not stroked arcs) so each corner of every pad —
         where the radial edge meets the inner/outer rim — has a small
         4-unit fillet for cushioned-but-cohesive feel. -->
    <path
      class="pad pad-green"
      class:active={seeWorkActive}
      class:tool-active={seeWorkGlow}
      d={padTopPath}
    />
    <path
      class="pad pad-amber"
      class:active={getToKnowActive}
      class:tool-active={gtkGlow}
      d={padBlPath}
    />
    <path
      class="pad pad-neutral"
      class:active={contactOpen}
      class:tool-active={contactGlow}
      d={padBrPath}
    />

    <!-- Curved label paths.
         Path direction matters: text sits on the LEFT side of the path's
         travel direction (i.e., 90° counterclockwise from tangent). To get
         labels reading upright with their baseline on the OUTER edge of
         each pad and tops pointing AWAY from the dial center, we draw
         each label arc clockwise on the pad's outer rim (radius 70).

         Top pad: clockwise from upper-left to upper-right at the top of
         the circle — text appears upright ABOVE this arc on the outside
         of the dial.

         BL pad: clockwise sweep along the lower-left rim.
         BR pad: clockwise sweep along the lower-right rim. -->
    <defs>
      <!-- Label arc radii are OFFSET from the pad centerline (72) so
           glyph bodies render centered between the inner (52) and outer
           (92) rims:
           - Top pad uses tops-outward glyphs (extend toward the outer
             rim from baseline), so the baseline sits INWARD at r=66 —
             glyphs then occupy ≈[66,78], centered on 72.
           - BL/BR pads use tops-inward glyphs (extend toward the inner
             rim from baseline), so the baseline sits OUTWARD at r=78 —
             glyphs occupy ≈[66,78], also centered on 72.
           Each arc spans ~100° of the pad's 116°, leaving 8° margin. -->

      <!-- Top arc: -140° → -40° on radius 66 (θ-increasing, sweep=1) -->
      <path
        id="label-arc-top"
        d="M 49.44 57.56 A 66 66 0 0 1 150.56 57.56"
        fill="none"
      />

      <!-- BL arc: 200° → 100° on radius 78 (θ-decreasing, sweep=0) -->
      <path
        id="label-arc-bl"
        d="M 26.70 73.34 A 78 78 0 0 0 86.45 176.81"
        fill="none"
      />

      <!-- BR arc: 80° → -20° on radius 78 (θ-decreasing, sweep=0) -->
      <path
        id="label-arc-br"
        d="M 113.55 176.81 A 78 78 0 0 0 173.30 73.34"
        fill="none"
      />
    </defs>

    <!-- Curved labels following each pad arc. startOffset 50% places the
         text at the center of its arc; text-anchor middle balances it. -->
    <text class="pad-label">
      <textPath href="#label-arc-top" startOffset="50%" text-anchor="middle">SEE WORK</textPath>
    </text>
    <text class="pad-label">
      <textPath href="#label-arc-bl" startOffset="50%" text-anchor="middle">GET TO KNOW</textPath>
    </text>
    <text class="pad-label">
      <textPath href="#label-arc-br" startOffset="50%" text-anchor="middle">CONTACT</textPath>
    </text>

    <!-- Inner well around the dial (separates dial from pads) -->
    <circle cx="100" cy="100" r="46" fill="oklch(0.82 0.010 155 / 0.7)" />
    <circle cx="100" cy="100" r="46" fill="none" stroke="oklch(0.40 0.02 155 / 0.5)" stroke-width="1" />
  </svg>

  <!-- Click targets for the three pads (positioned over the SVG arcs) -->
  <button
    class="pad-target target-top"
    class:active={seeWorkActive}
    class:tool-active={seeWorkGlow}
    disabled={seeWorkGlow}
    aria-pressed={seeWorkActive}
    aria-label="Toggle See Work category — portfolio, repos, skills"
    onclick={onToggleSeeWork}
  ></button>

  <button
    class="pad-target target-bl"
    class:active={getToKnowActive}
    class:tool-active={gtkGlow}
    disabled={gtkGlow}
    aria-pressed={getToKnowActive}
    aria-label="Toggle Get to Know category — talks, writing, inspiration"
    onclick={onToggleGetToKnow}
  ></button>

  <button
    class="pad-target target-br"
    class:active={contactOpen}
    class:tool-active={contactGlow}
    disabled={contactGlow}
    aria-expanded={contactOpen}
    aria-haspopup="menu"
    aria-label="Open contact and share options"
    onclick={() => (contactOpen ? (contactOpen = false) : openContactNow())}
    onmouseenter={openContactNow}
    onmouseleave={scheduleClose}
    onfocus={openContactNow}
  ></button>

  <!-- Center dial -->
  <div
    class="knob-dial"
    class:tool-active={dialGlow}
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

  {#if contactOpen}
    <div
      class="contact-radial"
      role="menu"
      tabindex="-1"
      aria-label="Contact options"
      onmouseenter={cancelClose}
      onmouseleave={scheduleClose}
    >
      <!-- Invisible bridge: covers the area between the contact pad
           and the menu items, plus the gaps between items themselves,
           so the cursor stays "inside" the menu container while
           transiting between targets. Without this, mouseleave fires
           every time the cursor crosses an inter-item gap. -->
      <span class="contact-bridge" aria-hidden="true"></span>
      {#each contactItems as item (item.key)}
        <button
          class="radial-item"
          role="menuitem"
          style={flyoutItemStyle(item)}
          onmouseenter={cancelClose}
          onclick={() => {
            cancelClose();
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
    overflow: visible;
    filter: drop-shadow(8px 12px 22px oklch(0.2 0.01 155 / 0.22));
  }

  /* Pads are filled ring sectors with subtle 4-unit corner fillets.
     They share a single OKLCH-canvas-anchored treatment so the whole
     knob reads as one cohesive control divided into colored wedges.
     The fill transition is slow + smooth so toggling a category feels
     like the phosphor warming up / cooling down on a CRT, not a hard
     click between colors. */
  .pad {
    transition: fill var(--duration-slow) ease-in-out;
  }

  /* Pad palette — retro CRT phosphor colors (See Work green, Get to
     Know amber) plus a neutral Contact pad that reads as the calm
     "action" zone. Active state is the bright phosphor; inactive is a
     barely-tinted hint of that same hue against the canvas. */

  /* GREEN pad — See Work.
     Inactive: a light YELLOW-leaning green (hue 130) — reads as "green
     at low glow" rather than sage.
     Active: --color-accent-green, the same neon green used by .card-cta
     so the dial visually rhymes with the cards' call-to-action color. */
  .pad-green {
    fill: oklch(0.93 0.09 130);
  }
  .pad-green.active {
    fill: var(--color-accent-green);
  }

  /* AMBER pad — Get to Know, CRT amber text glow.
     Inactive: pale amber (lightness ≈ See Work's inactive) so the
     two off-state pads feel equally "quiet". Still clearly amber, not
     sage. Active brightens toward the full #FFCC00 phosphor glow. */
  .pad-amber {
    fill: oklch(0.92 0.10 85); /* pale amber pre-glow */
  }
  .pad-amber.active {
    fill: oklch(0.88 0.18 95); /* ≈ #FFCC00 — light CRT amber */
  }

  /* NEUTRAL pad — Contact, warm tan/gray range so it reads as quiet
     utility but still has enough warmth and contrast to stand out from
     the sage canvas. Hue 70 gives it a tan / khaki cast. */
  .pad-neutral {
    fill: oklch(0.76 0.03 70); /* warm light tan */
  }
  .pad-neutral.active {
    fill: oklch(0.55 0.025 70); /* deeper warm tan */
  }

  /* Hover preview — partway between inactive and active, staying in
     the same hue family so it reads as "warming up" toward the active
     state. A subtle drop-shadow filter also lifts the hovered pad
     off the dial to reinforce press affordance (filter works on SVG
     paths where CSS transform translateY can be flaky). */
  .knob:has(.target-top:hover) .pad-green:not(.active) {
    fill: oklch(0.84 0.15 138);
    filter: drop-shadow(0 -2px 3px oklch(0.45 0.10 145 / 0.35));
  }
  .knob:has(.target-bl:hover) .pad-amber:not(.active) {
    fill: oklch(0.90 0.14 90);
    filter: drop-shadow(0 -2px 3px oklch(0.55 0.12 90 / 0.35));
  }
  .knob:has(.target-br:hover) .pad-neutral:not(.active) {
    fill: oklch(0.66 0.028 70);
    filter: drop-shadow(0 -2px 3px oklch(0.40 0.02 70 / 0.30));
  }

  /* Pad labels — sized in SVG user units so text scales with the dial.
     16 user units fills the 40-thick pad comfortably; the wide arc span
     (~100°) means even at the smallest mobile viewport the text stays
     legible because it scales proportionally with the knob. */
  .pad-label {
    font-family: var(--font-mono);
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.04em;
    fill: oklch(0.20 0.012 155);
    pointer-events: none;
    text-shadow: 0 1px 0 oklch(0.99 0.004 155 / 0.5);
  }

  /* Click targets — hit areas matching each pad's angular range */
  .pad-target {
    position: absolute;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    border-radius: 9999px;
  }

  .pad-target:focus-visible {
    outline: 2px solid var(--color-accent-green);
    outline-offset: 2px;
  }

  .target-top {
    top: 4%;
    left: 18%;
    width: 64%;
    height: 30%;
  }

  .target-bl {
    bottom: 18%;
    left: 4%;
    width: 36%;
    height: 38%;
  }

  .target-br {
    bottom: 18%;
    right: 4%;
    width: 36%;
    height: 38%;
  }

  /* Center dial — vintage brushed-metal knob with a FLAT top.
     Reference: vintage-air automotive HVAC dials (cool aluminum).
     Three layers:
       1. Subtle radial gradient — top is nearly flat in tone
          (slight darkening at the rim only), so it reads as a
          machined flat surface, not a polished sphere.
       2. ::before brushed-metal texture — repeating diagonal
          micro-stripes at very low alpha mimic the milled finish.
       3. ::after thin bevel ring — a darker hairline at the very
          edge implies the elevated rim where the flat top meets
          the side wall.
     Dial sits proud of the inner well via an outer drop shadow. */
  .knob-dial {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 6.5rem;
    height: 6.5rem;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background:
      radial-gradient(
        circle at 50% 45%,
        oklch(0.86 0.008 250) 0%,
        oklch(0.82 0.010 250) 55%,
        oklch(0.74 0.012 250) 85%,
        oklch(0.62 0.014 250) 100%
      );
    box-shadow:
      /* Tight bright rim at top — subtle, not a sphere */
      inset 0 1px 0 oklch(0.95 0.005 250 / 0.70),
      /* Soft darker shadow at bottom rim */
      inset 0 -1.5px 2px oklch(0.42 0.015 250 / 0.45),
      /* Outer drop shadow — dial elevated above its well */
      0 3px 6px oklch(0.10 0.02 250 / 0.40),
      0 1px 2px oklch(0.08 0.02 250 / 0.30);
    cursor: grab;
    touch-action: none;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    transition:
      transform var(--duration-fast) ease,
      box-shadow var(--duration-fast) ease;
  }

  /* Brushed-metal milled finish — faint diagonal micro-stripes
     across the entire flat top. */
  .knob-dial::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background:
      repeating-linear-gradient(
        38deg,
        oklch(1 0 0 / 0.08) 0px,
        oklch(1 0 0 / 0.08) 0.5px,
        transparent 0.5px,
        transparent 1.5px,
        oklch(0 0 0 / 0.05) 1.5px,
        oklch(0 0 0 / 0.05) 2px,
        transparent 2px,
        transparent 3px
      );
    pointer-events: none;
    z-index: 0;
    mix-blend-mode: overlay;
  }

  /* Bevel ring at outer edge — the visible "rim" where the flat
     top meets the side wall. Subtle dark hairline + light highlight
     just inside it implies a chamfer. */
  .knob-dial::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    pointer-events: none;
    box-shadow:
      inset 0 0 0 1px oklch(0.45 0.010 250 / 0.55),
      inset 0 0 0 2px oklch(0.95 0.005 250 / 0.25);
    z-index: 1;
  }

  /* Hover: dial lifts slightly to imply press affordance */
  .knob-dial:hover {
    transform: translate(-50%, calc(-50% - 1px));
    box-shadow:
      inset 0 1px 0 oklch(0.97 0.005 250 / 0.80),
      inset 0 -1.5px 2px oklch(0.42 0.015 250 / 0.50),
      0 6px 12px oklch(0.10 0.02 250 / 0.50),
      0 2px 4px oklch(0.08 0.02 250 / 0.35);
  }

  /* Active drag: dial pushes into its well */
  .knob-dial:active {
    cursor: grabbing;
    transform: translate(-50%, calc(-50% + 1px));
    box-shadow:
      inset 0 2px 3px oklch(0.30 0.012 250 / 0.55),
      inset 0 -1px 1px oklch(0.85 0.008 250 / 0.40),
      0 1px 2px oklch(0.10 0.02 250 / 0.30);
  }

  .knob-dial:focus-visible {
    outline: 2px solid oklch(0.65 0.18 250);
    outline-offset: 4px;
  }

  /* Engraved indicator line on the brushed-metal dial top — a
     dark groove with a thin highlighted edge mimicking a milled
     mark. No glow (would look out of place on flat metal); just
     a clean engraved appearance. */
  .dial-indicator {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 3px;
    height: 38%;
    background: linear-gradient(to bottom,
      oklch(0.32 0.012 250) 0%,
      oklch(0.42 0.012 250) 50%,
      oklch(0.32 0.012 250) 100%
    );
    border-radius: 1.5px;
    transform-origin: bottom center;
    /* Engraved look: a thin light edge on one side, dark on the
       other, mimics how a milled groove catches light. */
    box-shadow:
      inset 1px 0 0 oklch(0.95 0.005 250 / 0.55),
      inset -1px 0 0 oklch(0.20 0.010 250 / 0.65),
      0 0 1px oklch(0.20 0.010 250 / 0.40);
    z-index: 2;
  }

  .dial-indicator::before {
    content: '';
    position: absolute;
    top: -1px;
    left: 50%;
    transform: translateX(-50%);
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: oklch(0.32 0.012 250);
    box-shadow:
      inset 1px 1px 0 oklch(0.95 0.005 250 / 0.45),
      inset -1px -1px 0 oklch(0.18 0.010 250 / 0.65);
  }

  /* Flyout container — anchored to knob center, but its hover bounds
     extend via the .contact-bridge child so cursor transit between
     items doesn't trigger a stray mouseleave. */
  .contact-radial {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    pointer-events: none;
    z-index: 40;
  }

  /* Invisible hit-area covering the entire flyout zone (from just
     above the contact pad up through all five items + their inter-item
     gaps). Lets the user move freely between items without crossing
     the menu's hover boundary. */
  .contact-bridge {
    position: absolute;
    /* Container origin is at knob-center; items live in xRem 8.4-10
       and yRem -10.5 to 1.5. Bridge spans a generous box around
       all of that. */
    top: -12rem;
    left: 4rem;
    width: 12rem;
    height: 16rem;
    pointer-events: auto;
  }

  .radial-item {
    position: absolute;
    top: 0;
    left: 0;
    /* Resting transform uses the SAME function shape (translate +
       scale) as the keyframe `from` state, so the browser interpolates
       smoothly instead of popping between mismatched shapes. */
    transform: translate(var(--fx, 0), var(--fy, 0)) scale(1);
    padding: 0.55rem 1.1rem;
    /* Neutral dark pill matching the new neutral Contact pad — no
       chroma, just calm grays with a soft cream label. */
    background: linear-gradient(135deg,
      oklch(0.32 0.005 155) 0%,
      oklch(0.22 0.005 155) 100%
    );
    color: oklch(0.96 0.02 80);
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
    border: 1px solid oklch(0.45 0.005 155 / 0.5);
    /* Rounded rectangle shape — matches card CTA buttons + tag pills
       so the contact flyout reads as part of the same UI family.
       Color stays dark neutral (cohesive with the system overall). */
    border-radius: 0.5rem;
    cursor: pointer;
    pointer-events: auto;
    transform-origin: center;
    box-shadow:
      0 4px 12px oklch(0.15 0.005 155 / 0.35),
      inset 1px 1px 0 oklch(0.55 0.005 155 / 0.5),
      inset -1px -1px 0 oklch(0.15 0.005 155 / 0.6);
    animation: radial-in var(--duration-normal) var(--ease-spring) backwards;
  }

  .radial-item:hover,
  .radial-item:focus-visible {
    background: linear-gradient(135deg,
      oklch(0.42 0.005 155) 0%,
      oklch(0.32 0.005 155) 100%
    );
    color: oklch(0.99 0.02 80);
    outline: 2px solid oklch(0.65 0.005 155);
    outline-offset: 2px;
    /* Lift on hover to imply press affordance — the transform var
       carries the item's resting translate position so the lift
       composes cleanly with it. */
    transform: translate(var(--fx, 0), calc(var(--fy, 0) - 2px)) scale(1);
    box-shadow:
      0 8px 16px oklch(0.15 0.005 155 / 0.45),
      inset 1px 1px 0 oklch(0.55 0.005 155 / 0.5),
      inset -1px -1px 0 oklch(0.15 0.005 155 / 0.6);
  }

  .radial-item:active {
    transform: translate(var(--fx, 0), calc(var(--fy, 0) + 1px)) scale(0.98);
    box-shadow:
      0 2px 4px oklch(0.15 0.005 155 / 0.30),
      inset 1px 1px 0 oklch(0.55 0.005 155 / 0.4),
      inset -1px -1px 0 oklch(0.15 0.005 155 / 0.55);
  }

  @keyframes radial-in {
    from {
      opacity: 0;
      transform: translate(0, 0) scale(0.7);
    }
    to {
      opacity: 1;
      transform: translate(var(--fx, 0), var(--fy, 0)) scale(1);
    }
  }

  @media (max-width: 640px) {
    .knob {
      width: 9rem;
      height: 9rem;
    }
    .knob-dial {
      width: 3.7rem;
      height: 3.7rem;
    }
    /* No font-size override on .pad-label — SVG user-unit sizing
       already scales the labels proportionally with the dial. */
    .radial-item {
      font-size: 0.6875rem;
      padding: 0.4rem 0.7rem;
      /* Pull the flyout column closer to the knob and shrink each
         item slightly so the menu fits on narrow phone viewports
         (Galaxy S, Pixel 7, ~360-412px wide). Without this scaling,
         the right edge of pills overflows past the screen. */
      transform: translate(calc(var(--fx, 0) * 0.55), calc(var(--fy, 0) * 0.55)) scale(0.88);
    }

    .radial-item:hover,
    .radial-item:focus-visible {
      transform: translate(calc(var(--fx, 0) * 0.55), calc(var(--fy, 0) * 0.55 - 2px)) scale(0.88);
    }

    .radial-item:active {
      transform: translate(calc(var(--fx, 0) * 0.55), calc(var(--fy, 0) * 0.55 + 1px)) scale(0.86);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .radial-item {
      animation: none;
    }
  }

  /* ─── Tool-in-flight glow ──────────────────────────────────────────
   * When a WebMCP tool is targeting this pad / dial, render an
   * ethereal amber→green halo around it. Pulse breathes in and out;
   * a slow drop-shadow color cycle reads as a clockwise drift around
   * the control. Max ~1cm spread. Recedes when the tool completes
   * (the class is removed and CSS transitions fade the filter).
   *
   * Animation: filter-based (no transform jitter on SVG paths).
   * Color cycle: amber → green → amber via @property-typed variable.
   * Reduced motion: opacity only, no breathing or color cycle.
   */
  @property --tool-glow-color {
    syntax: '<color>';
    inherits: true;
    initial-value: oklch(0.85 0.16 75);
  }

  .pad.tool-active,
  .knob-dial.tool-active {
    filter: drop-shadow(0 0 0.4cm var(--tool-glow-color))
            drop-shadow(0 0 0.8cm oklch(from var(--tool-glow-color) l c h / 0.5));
    animation: tool-glow-cycle 2.4s ease-in-out infinite;
    z-index: 100;
    transition: filter var(--duration-normal) ease;
  }

  .pad-target.tool-active,
  .pad-target:disabled.tool-active {
    cursor: progress;
    pointer-events: none;
  }

  @keyframes tool-glow-cycle {
    0%   { --tool-glow-color: oklch(0.85 0.16 75 / 0.85); }   /* amber */
    50%  { --tool-glow-color: oklch(0.78 0.18 130 / 0.85); }  /* green */
    100% { --tool-glow-color: oklch(0.85 0.16 75 / 0.85); }
  }

  @media (prefers-reduced-motion: reduce) {
    .pad.tool-active,
    .knob-dial.tool-active {
      animation: none;
      filter: drop-shadow(0 0 0.3cm oklch(0.82 0.17 100 / 0.7));
    }
  }
</style>
