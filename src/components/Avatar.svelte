<script lang="ts">
  /**
   * Identity avatar in the top-right corner.
   * Compact circular headshot with a CRT-screen treatment matching the
   * Scrambler cards: subtle duotone toward sage, refractive bevels,
   * corner vignette, phosphor glow that breathes 3-4s.
   * Click expands in-place to the About Me overlay.
   */

  interface Props {
    onExpand?: () => void;
  }

  let { onExpand }: Props = $props();
</script>

<button
  class="avatar"
  aria-label="About Kathryn Hurchla — click to expand bio"
  onclick={onExpand}
>
  <span class="avatar-frame">
    <img
      class="avatar-photo"
      src="/img/profile.jpeg"
      alt=""
      width="56"
      height="56"
      loading="eager"
      decoding="async"
    />
    <span class="avatar-tint" aria-hidden="true"></span>
    <span class="avatar-vignette" aria-hidden="true"></span>
    <span class="avatar-bevel" aria-hidden="true"></span>
  </span>
</button>

<style>
  .avatar {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 50;
    width: 3.5rem;
    height: 3.5rem;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    transition:
      transform var(--duration-fast) ease,
      filter var(--duration-fast) ease;
  }

  .avatar:hover,
  .avatar:focus-visible {
    transform: scale(1.06);
  }

  .avatar:focus-visible {
    outline: 2px solid var(--color-accent-green);
    outline-offset: 4px;
    border-radius: 50%;
  }

  /* Frame holds photo + overlays — CRT glass face plate */
  .avatar-frame {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    overflow: hidden;
    /* Dimensional drop shadow + outer rim */
    box-shadow:
      0 4px 12px oklch(0.2 0.01 155 / 0.18),
      0 0 0 1px oklch(0.55 0.02 155 / 0.25);
    animation: phosphor-breathe 4s ease-in-out infinite;
  }

  .avatar-photo {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    /* Duotone treatment toward sage: desaturate + slight contrast + hue shift */
    filter:
      grayscale(0.35)
      contrast(1.06)
      saturate(0.82)
      brightness(1.02);
  }

  /*
   * Tint overlay — softly washes the photo with sage-green via screen blend,
   * so faces still read clearly but the image lives in the brand palette.
   */
  .avatar-tint {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(
      135deg,
      oklch(0.85 0.06 145 / 0.22) 0%,
      oklch(0.75 0.04 165 / 0.18) 100%
    );
    mix-blend-mode: soft-light;
  }

  /* Corner vignette — same CRT face curvature darkening as cards */
  .avatar-vignette {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(
      circle at 38% 32%,
      oklch(1 0 0 / 0.18) 0%,
      transparent 35%,
      transparent 65%,
      oklch(0.45 0.02 155 / 0.22) 100%
    );
  }

  /* Inner refractive bevels — top-left highlight, bottom-right shadow */
  .avatar-bevel {
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: 50%;
    box-shadow:
      inset 1px 1px 0 oklch(0.96 0.04 145 / 0.55),
      inset -1px -1px 0 oklch(0.55 0.04 155 / 0.4),
      inset 0 0 12px oklch(from var(--color-accent-green) l c h / 0.08);
  }

  .avatar:hover .avatar-frame,
  .avatar:focus-visible .avatar-frame {
    box-shadow:
      0 6px 18px oklch(0.2 0.01 155 / 0.24),
      0 0 0 1px oklch(from var(--color-accent-green) l c h / 0.45);
  }

  .avatar:hover .avatar-bevel,
  .avatar:focus-visible .avatar-bevel {
    box-shadow:
      inset 1px 1px 0 oklch(0.96 0.04 145 / 0.7),
      inset -1px -1px 0 oklch(0.55 0.04 155 / 0.4),
      inset 0 0 16px oklch(from var(--color-accent-green) l c h / 0.18);
  }

  @keyframes phosphor-breathe {
    0%, 100% {
      filter: brightness(1);
    }
    50% {
      filter: brightness(1.04);
    }
  }

  @media (max-width: 640px) {
    .avatar {
      top: 0.75rem;
      right: 0.75rem;
      width: 2.5rem;
      height: 2.5rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .avatar-frame {
      animation: none;
    }
  }
</style>
