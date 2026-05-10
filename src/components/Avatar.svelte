<script lang="ts">
  /**
   * Identity avatar in the top-right corner.
   *
   * AT REST: a small circular photo sits inside a slightly larger
   * rounded-square halftone "shell". The dot pattern is dense across
   * the photo (creating the tonal halftone effect) and bleeds out into
   * the rounded-square corners, fading to transparent at the outer
   * edge. This softly blends the circle (photo) and rounded-square
   * (dots) silhouettes — no hard rim, no hard square edge.
   *
   * ON HOVER/FOCUS: the avatar grows proportionally into a CRT-card-
   * shaped panel matching the Scrambler cards. The halftone over the
   * photo center fades back so the color photo reads cleanly, but the
   * dots at the rim stay (still subtle), and the bio blurb fades in
   * alongside.
   *
   * Click expands the full About Me overlay.
   */

  interface Props {
    onExpand?: () => void;
    /** Fires whenever the avatar opens or closes — Dashboard uses
     *  this to dim the Scrambler behind the expanded card. */
    onOpenChange?: (open: boolean) => void;
  }

  let { onExpand, onOpenChange }: Props = $props();

  let hovered = $state(false);
  let avatarBtn: HTMLButtonElement | undefined = $state();
  let closeBtn: HTMLButtonElement | undefined = $state();

  function setOpen(value: boolean) {
    if (value === hovered) return;
    hovered = value;
    onOpenChange?.(value);
  }

  // True when focus/pointer is moving to a sibling element that's part of
  // the avatar UI (avatar button ↔ close button). Without this, tabbing
  // from avatar to close button would fire blur → close, then re-focus
  // would never happen and the close button vanishes.
  function withinAvatarUi(target: EventTarget | null): boolean {
    if (!(target instanceof Node)) return false;
    return Boolean(avatarBtn?.contains(target) || closeBtn?.contains(target));
  }

  function handleLeave(e: MouseEvent) {
    if (withinAvatarUi(e.relatedTarget)) return;
    setOpen(false);
  }

  function handleBlur(e: FocusEvent) {
    if (withinAvatarUi(e.relatedTarget)) return;
    setOpen(false);
  }

  function handleClose() {
    setOpen(false);
  }

  function handleEscape(e: KeyboardEvent) {
    if (e.key === 'Escape' && hovered) {
      setOpen(false);
    }
  }
</script>

<svelte:window onkeydown={handleEscape} />

<button
  bind:this={avatarBtn}
  class="avatar"
  class:open={hovered}
  aria-label="About Kathryn Hurchla — click to open full bio"
  aria-expanded={hovered}
  onmouseenter={() => setOpen(true)}
  onmouseleave={handleLeave}
  onfocus={() => setOpen(true)}
  onblur={handleBlur}
  onclick={onExpand}
>
  <span class="avatar-shell" aria-hidden="true">
    <span class="avatar-photo-wrap">
      <img
        class="avatar-photo"
        src="/img/profile.jpeg"
        alt=""
        width="120"
        height="120"
        loading="eager"
        decoding="async"
      />
    </span>
    <!-- Single halftone layer covering the whole shell with a soft
         rounded-square outer shape. The radial mask creates a face-
         zone at center (no dots) ramping up to a peak halo at the
         photo rim, then fading to zero at the rounded-square edges. -->
    <span class="halftone halftone-dense" aria-hidden="true"></span>
  </span>

  <span class="avatar-bio" aria-hidden={!hovered}>
    <span class="bio-name">Kathryn Hurchla</span>
    <span class="bio-blurb">
      I make intelligent experiences where technology and design blur. Find me building AI-enabled moments of wonder through cross-disciplinary experience design &amp; engineering with clients who disrupt and lead industries.
    </span>
    <span class="bio-blurb">
      Data Design Dimension—DADEDA—is an ethos. A personal commitment to work that suits the technologist and creative in me, and a LLC for occasional passion projects and sharing thoughts, written and talks.
    </span>
  </span>
</button>

{#if hovered}
  <button
    bind:this={closeBtn}
    class="avatar-close"
    type="button"
    aria-label="Close about me"
    onmouseenter={() => setOpen(true)}
    onmouseleave={handleLeave}
    onfocus={() => setOpen(true)}
    onblur={handleBlur}
    onclick={handleClose}
  >
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <line x1="4" y1="8" x2="12" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>
  </button>
{/if}

<style>
  /*
   * The avatar is anchored to the top-right and grows DIAGONALLY (both
   * width and height). top-right transform-origin keeps the corner
   * fixed while the panel expands toward the lower-left, mirroring the
   * Scrambler card "expand-in-place" treatment.
   */
  .avatar {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 50;
    /* Block layout (not flex) so we can FLOAT the photo shell in the
       expanded state and have bio text flow around it like print
       publishing — text wraps to the right of the photo and continues
       UNDER it once the column extends past the image height. */
    display: block;
    width: 4.5rem;
    height: 4.5rem;
    padding: 0;
    border: none;
    background: transparent;
    border-radius: 1rem;
    cursor: pointer;
    /* overflow hidden in open state clips the rounded-square card so
       nothing peeks beyond the pillow edge AND establishes a block
       formatting context for the floated shell. */
    overflow: hidden;
    isolation: isolate;
    text-align: left;
    transition:
      width var(--duration-slow) var(--ease-spring),
      height var(--duration-slow) var(--ease-spring),
      padding var(--duration-slow) var(--ease-spring),
      border-radius var(--duration-slow) var(--ease-spring),
      background-color var(--duration-normal) ease,
      box-shadow var(--duration-normal) ease;
  }

  /* OPEN state: a card with TWO visual ties to the dashboard.
     - A green halo (See-Work-inactive yellow-green at oklch(0.93 0.09 130))
       wraps the photo area, blending invisibly into the avatar's own
       sage-grey portrait surround.
     - That green fades outward into an amber tone calibrated to the
       SAME perceived subtlety as the DADEDA phosphor wordmark in the
       upper-left of the windshield: lightness ≈ 0.90–0.92 (close to
       the canvas's 0.89), low chroma 0.04–0.05. So the card's amber
       reads as a very faint amber wash — visually rhyming with the
       wordmark's burned-in trace and with the GTK-inactive button —
       not as a bold amber surface.
     The gradient is centered on the photo's actual position (15%, 32%
     of the card) so the green crown surrounds the avatar and the
     subtle amber dominates the rest of the panel. This two-hue
     treatment is unique to the about card, distinguishing it from
     plain Scrambler cards.
     Height is sized to comfortably fit the two-paragraph bio without
     scrolling or clipping. */
  .avatar.open {
    width: 28rem;
    height: 18rem;
    padding: 1.25rem 1.5rem 1.25rem 1.25rem;
    border-radius: 1.5rem / 2.25rem;
    background:
      radial-gradient(
        ellipse 130% 110% at 38% 32%,
        oklch(1 0 0 / 0.18) 0%,
        oklch(1 0 0 / 0.06) 35%,
        transparent 70%
      ),
      radial-gradient(
        ellipse 80% 100% at 15% 32%,
        oklch(0.93 0.09 130) 0%,
        oklch(0.92 0.07 110) 25%,
        oklch(0.91 0.05 95) 55%,
        oklch(0.90 0.04 85) 100%
      );
    box-shadow:
      14px 18px 40px oklch(0.2 0.01 155 / 0.20),
      8px 12px 18px oklch(0.2 0.01 155 / 0.14),
      2px 4px 6px oklch(0.2 0.01 155 / 0.10);
  }

  .avatar:focus-visible {
    outline: 2px solid var(--color-accent-green);
    outline-offset: 4px;
  }

  /* Shell: the rounded-square container that holds both the circular
     photo and the halftone overlays. display: block so the span
     respects width/height and renders predictably. */
  .avatar-shell {
    display: block;
    position: relative;
    width: 4.5rem;
    height: 4.5rem;
    border-radius: 1rem;
    transition:
      width var(--duration-slow) var(--ease-spring),
      height var(--duration-slow) var(--ease-spring),
      border-radius var(--duration-slow) var(--ease-spring),
      margin var(--duration-slow) var(--ease-spring);
  }

  /* In expanded mode the shell:
     - matches the CARD's asymmetric pillow border-radius for visual
       continuity with the card edges nearby
     - FLOATS LEFT so the bio text flows to its right and wraps
       beneath it like a print-magazine layout
     - shape-outside follows the rounded-square so text hugs the
       pillow shape rather than a rectangular bounding box. */
  .avatar.open .avatar-shell {
    float: left;
    width: 7rem;
    height: 7rem;
    margin: 0 1rem 0.4rem 0;
    border-radius: 1.5rem / 2.25rem;
    shape-outside: inset(0 round 1.5rem 2.25rem);
  }

  /* Photo wrap: ROUNDED-SQUARE clip, mirroring the avatar / card
     pillow shape but sized smaller so it sits INSIDE the dot field's
     rounded-square form. The photo's corners therefore share the
     same shape language as the dots' outer edge. Softness still
     comes from the blur pseudo + halftone halo. */
  .avatar-photo-wrap {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 1rem;
    overflow: hidden;
    z-index: 1;
    transition:
      width var(--duration-slow) var(--ease-spring),
      height var(--duration-slow) var(--ease-spring),
      border-radius var(--duration-slow) var(--ease-spring),
      box-shadow var(--duration-slow) ease;
  }

  .avatar.open .avatar-photo-wrap {
    width: 6rem;
    height: 6rem;
    /* Open state photo takes the SAME pillow border-radius as the
       card and the shell (1.5rem / 2.25rem), so its corners visually
       echo the dot field's outer shape — just inset and smaller. */
    border-radius: 1.5rem / 2.25rem;
    /* Soft amber halo around the photo edge — a multi-stop outer
       glow that bleeds the photo's silhouette into the surrounding
       dotted amber field, so the rim doesn't read as a hard cut.
       The color mirrors the card's amber (oklch ≈ 0.91 0.05 95) at
       low alpha. */
    box-shadow:
      0 0 0 1px oklch(0.91 0.05 95 / 0.45),
      0 0 6px 3px oklch(0.91 0.05 95 / 0.55),
      0 0 14px 6px oklch(0.91 0.06 90 / 0.30),
      0 0 24px 10px oklch(0.91 0.06 90 / 0.15);
  }

  .avatar-photo {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    /* CRISP face — no blur on the base image. The face reads sharp
       and detailed. A pseudo-element below applies a heavy blur ONLY
       to the edges via a radial mask, so the rim dissolves softly
       without sacrificing facial clarity. */
    filter: grayscale(0.85) contrast(1.05) sepia(0.05);
    transition: filter var(--duration-slow) ease;
  }

  /* Open state: color photo, still crisp. Edge blur is handled by the
     ::after pseudo. */
  .avatar.open .avatar-photo {
    filter: grayscale(0) contrast(1.02) saturate(1.06);
  }

  /*
   * EDGE-ONLY BLUR layer.
   *
   * A pseudo-element renders a HEAVILY BLURRED copy of the same photo
   * stacked above the sharp .avatar-photo. A radial mask hides this
   * blurred copy in the center (where the face is) and fades it in
   * toward the photo's circular rim. Net effect: the face stays
   * crisp, while the silhouette edge — and especially the dark shirt
   * at the bottom — softly dissolves into the surrounding amber.
   */
  .avatar-photo-wrap::after {
    content: '';
    position: absolute;
    inset: 0;
    background: url('/img/profile.jpeg') center/cover no-repeat;
    filter: grayscale(0.85) contrast(1.05) sepia(0.05) blur(5px);
    -webkit-mask-image: radial-gradient(
      circle at 50% 50%,
      transparent 0%,
      transparent 35%,
      rgba(0, 0, 0, 0.40) 60%,
      rgba(0, 0, 0, 0.85) 100%
    );
    mask-image: radial-gradient(
      circle at 50% 50%,
      transparent 0%,
      transparent 35%,
      rgba(0, 0, 0, 0.40) 60%,
      rgba(0, 0, 0, 0.85) 100%
    );
    pointer-events: none;
    transition: filter var(--duration-slow) ease;
  }

  .avatar.open .avatar-photo-wrap::after {
    filter: grayscale(0) contrast(1.02) saturate(1.06) blur(4px);
  }

  /* Shared halftone-layer base. Each layer fills the shell and uses
     mix-blend-mode: multiply so dots darken what they sit over (the
     photo, the amber bg, the canvas). No border-radius/clip — masks
     fade to zero with soft edges so dots are never sliced. */
  .halftone {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 2;
    mix-blend-mode: multiply;
    transition:
      -webkit-mask-image var(--duration-slow) ease,
      mask-image var(--duration-slow) ease;
  }

  /* DENSE halftone — 3px dot grid laid uniformly across the shell.
     Three masks composited (intersect):
       1. RADIAL density — three-zone variation: LIGHT over the face
          (photo center), DARK around the photo's rim (halftone halo
          at ~55%), LIGHTER again as dots reach the squarish outer
          edge. Recreates the look of a printed halftone portrait.
       2 + 3. LINEAR gradients (right + bottom) — soft rounded-square
          boundary so the dot field reads as the card's pillow form
          and dots fade smoothly to zero at the edges (no clipping). */
  .halftone-dense {
    background-image: radial-gradient(
      oklch(0.18 0.012 155 / 0.7) 0.85px,
      transparent 1.2px
    );
    background-size: 3px 3px;
    -webkit-mask-image:
      radial-gradient(ellipse 50% 65% at 50% 50%,
        rgba(0, 0, 0, 0) 0%,
        rgba(0, 0, 0, 0) 58%,
        rgba(0, 0, 0, 0.30) 64%,
        rgba(0, 0, 0, 0.85) 75%,
        rgba(0, 0, 0, 0.65) 88%,
        rgba(0, 0, 0, 0.40) 100%),
      linear-gradient(to right,
        transparent 0%,
        rgba(0, 0, 0, 1) 10%,
        rgba(0, 0, 0, 1) 90%,
        transparent 100%),
      linear-gradient(to bottom,
        transparent 0%,
        rgba(0, 0, 0, 1) 8%,
        rgba(0, 0, 0, 1) 94%,
        transparent 100%);
    mask-image:
      radial-gradient(ellipse 50% 65% at 50% 50%,
        rgba(0, 0, 0, 0) 0%,
        rgba(0, 0, 0, 0) 58%,
        rgba(0, 0, 0, 0.30) 64%,
        rgba(0, 0, 0, 0.85) 75%,
        rgba(0, 0, 0, 0.65) 88%,
        rgba(0, 0, 0, 0.40) 100%),
      linear-gradient(to right,
        transparent 0%,
        rgba(0, 0, 0, 1) 10%,
        rgba(0, 0, 0, 1) 90%,
        transparent 100%),
      linear-gradient(to bottom,
        transparent 0%,
        rgba(0, 0, 0, 1) 8%,
        rgba(0, 0, 0, 1) 94%,
        transparent 100%);
    -webkit-mask-composite: source-in;
    mask-composite: intersect;
  }


  /* Bio panel — block layout. At rest, opacity:0 hides the content
     and the AVATAR's overflow:hidden + 4.5rem height clip whatever
     overflows. CRUCIALLY, we do NOT set overflow:hidden on the bio
     itself — that would create a Block Formatting Context, which
     prevents the text from wrapping around the floated image shell.
     With no BFC here, the text within bio's child blocks flows to
     the right of the float and continues UNDER the image once it
     extends past the image height — print-magazine layout. */
  .avatar-bio {
    display: block;
    opacity: 0;
    color: var(--color-text-primary);
    transition: opacity var(--duration-slow) ease 0.05s;
  }

  .avatar.open .avatar-bio {
    opacity: 1;
  }

  .bio-name {
    display: block;
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: oklch(0.30 0.04 155);
    margin-bottom: 0.5rem;
  }

  /* Two paragraphs of bio content, stacked. Both visible in the
     expanded card with comfortable line-height. */
  .bio-blurb {
    display: block;
    font-size: 0.8125rem;
    line-height: 1.5;
    color: var(--color-text-secondary);
    margin: 0 0 0.6rem 0;
  }

  .bio-blurb:last-child {
    margin-bottom: 0;
  }

  @media (max-width: 640px) {
    .avatar {
      top: 0.75rem;
      right: 0.75rem;
      width: 3.25rem;
      height: 3.25rem;
      border-radius: 0.75rem;
    }
    .avatar.open {
      width: min(20rem, calc(100vw - 1.5rem));
      /* Taller + bigger bottom padding so the bio text doesn't run
         right up to the card's lower rim on small viewports. */
      height: 19rem;
      padding: 1rem 1rem 1.5rem 1rem;
    }
    .avatar-shell {
      width: 3.25rem;
      height: 3.25rem;
      border-radius: 0.75rem;
    }
    .avatar.open .avatar-shell {
      width: 5.25rem;
      height: 5.25rem;
      border-radius: 1.125rem;
    }
    .avatar-photo-wrap {
      width: 2.5rem;
      height: 2.5rem;
    }
    .avatar.open .avatar-photo-wrap {
      width: 4.5rem;
      height: 4.5rem;
    }
    .bio-blurb {
      font-size: 0.8125rem;
      -webkit-line-clamp: 3;
    }
  }

  /*
   * Explicit close button for the expanded panel. Sits 0.4rem inside the
   * top-right corner of the open card — within the 1.5rem right padding
   * band, away from the floated photo (top-left) and bio text. Mirrors
   * the ScramblerCard `.card-toggle` shape language (asymmetric pillow
   * radius, hover lift) but simplified to a static minus glyph.
   * Positioned `fixed` to the same viewport anchor as the avatar so it
   * appears at the visual top-right of the open card without nesting a
   * second <button> inside the avatar's button (invalid HTML).
   */
  .avatar-close {
    position: fixed;
    top: 1.4rem;
    right: 1.4rem;
    z-index: 51;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    border: 1px solid oklch(0.30 0.04 155 / 0.25);
    background: oklch(0.96 0.005 155 / 0.92);
    color: oklch(0.30 0.04 155);
    border-radius: 0.55rem 0 0.95rem 0 / 0.55rem 0 1.4rem 0;
    cursor: pointer;
    backdrop-filter: blur(4px);
    box-shadow: 0 2px 6px oklch(0.2 0.01 155 / 0.18);
    transition:
      transform var(--duration-fast) ease,
      box-shadow var(--duration-fast) ease,
      background-color var(--duration-fast) ease;
  }

  .avatar-close:hover {
    transform: translateY(-2px);
    background: oklch(0.98 0.005 155 / 0.96);
    box-shadow: 0 4px 12px oklch(0.2 0.01 155 / 0.22);
  }

  .avatar-close:active {
    transform: translateY(0);
    box-shadow: 0 1px 3px oklch(0.2 0.01 155 / 0.18);
  }

  .avatar-close:focus-visible {
    outline: 2px solid var(--color-accent-green);
    outline-offset: 2px;
  }

  @media (max-width: 640px) {
    .avatar-close {
      top: 1.15rem;
      right: 1.15rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .avatar,
    .avatar-shell,
    .avatar-photo-wrap,
    .avatar-photo,
    .halftone,
    .avatar-bio,
    .avatar-close {
      transition: none;
    }
  }
</style>
