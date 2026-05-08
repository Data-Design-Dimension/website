<script lang="ts">
  import type { CardType, ScramblerCard, ScramblerPosition } from '../lib/scrambler/types';
  import { marked } from 'marked';
  import { parseVideo } from '../lib/scrambler/video';

  interface Props {
    card: ScramblerCard;
    position: ScramblerPosition;
    onSelect?: (card: ScramblerCard) => void;
    /** Drag callbacks — let the parent cluster freeze the orbit and
     *  update this card's per-card phase offset as the cursor moves. */
    onDragStart?: () => void;
    onDragMove?: (cardId: string, clientX: number, clientY: number) => void;
    onDragEnd?: () => void;
    /** Force initial state. Used by the /review interface to show
     *  collapsed + expanded side-by-side. Has no effect once the user
     *  toggles state via the + button. */
    initialExpanded?: boolean;
    /** Review-mode preview. When true, all CTAs (primary + secondary)
     *  open in a new tab so clicking a destination link doesn't
     *  navigate the reviewer away from the /review page (which would
     *  blow away their in-progress edits + feedback). */
    previewMode?: boolean;
  }

  let { card, position, onSelect, onDragStart, onDragMove, onDragEnd, initialExpanded = false, previewMode = false }: Props = $props();

  let isHovered = $state(false);
  // Two interaction states:
  //  - isFocused: clicked the card body. Orbit pauses, the card lifts
  //    forward (clears blur/opacity/scale to read at its current
  //    position), but stays its normal card size. Brief preview only.
  //  - isExpanded: clicked the + toggle. Card grows to fill more of
  //    the viewport (scrollable if content overflows) and shows full
  //    summary + tags + CTA. Expanded implies focused.
  let isFocused = $state(initialExpanded);
  let isExpanded = $state(initialExpanded);
  const isLifted = $derived(isFocused || isExpanded);
  let cardEl: HTMLDivElement | undefined = $state();

  const isForeground = $derived(position.z < 0.3);
  const isInteractive = $derived(position.z < 0.4);
  // Cards remain DRAGGABLE further into the back than they are
  // clickable — a fading card that catches your eye should still be
  // grabbable so you can pull it back into focus before reading.
  const isDraggable = $derived(position.z < 0.6);
  const phosphorIntensity = $derived(Math.max(0, 1 - position.z * 2));

  // Map card type → category. See Work uses the brand neon green;
  // Get to Know uses CRT amber tuned slightly toward gold (between
  // pure orange-amber #FFB000 and yellow-gold #FFCC00) so the card
  // accent rhymes with the GTK Knob pad without skewing too orange.
  const cardCategory = $derived.by(() => {
    if (['portfolio', 'repo', 'meta', 'skills'].includes(card.type)) return 'see-work';
    if (['talk', 'writing', 'inspiration'].includes(card.type)) return 'get-to-know';
    return 'default';
  });

  // Pick a media-type ICON based on the card's nature, not just its
  // type label. A 'talk' with a video URL gets the video icon; a
  // 'talk' tagged podcast gets the mic. Most modern talks have video
  // recordings, so 'talk' defaults to video unless tagged otherwise.
  type IconKind = 'video' | 'audio' | 'image' | 'writing' | 'repo' | 'page';

  const mediaIconKind = $derived.by((): IconKind => {
    const url = (card.cta?.url || '').toLowerCase();
    const tagStr = (card.tags || []).join(' ').toLowerCase();

    if (/youtube|youtu\.be|vimeo|fantasy\.co\/latest|\/video\/|\.mp4/.test(url)) return 'video';
    if (/\bvideo\b|\bdemo\b|\brecording\b/.test(tagStr)) return 'video';
    if (/\bpodcast\b|\baudio\b/.test(tagStr)) return 'audio';

    switch (card.type) {
      case 'writing':
        return 'writing';
      case 'inspiration':
        return 'image';
      case 'repo':
        return 'repo';
      case 'talk':
        return 'video';
      default:
        return 'page';
    }
  });

  // Single-stroke SVG paths per icon kind. Same drawing style across
  // all icons (Feather/Lucide-inspired, 24×24 viewBox, 2px stroke).
  function iconPaths(kind: IconKind): string[] {
    switch (kind) {
      case 'video':
        return [
          'M3 6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
          'M17 9l4-2v10l-4-2',
        ];
      case 'audio':
        return [
          'M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z',
          'M19 11v1a7 7 0 0 1-14 0v-1',
          'M12 19v3',
          'M8 22h8',
        ];
      case 'image':
        return [
          'M21 5H3v14h18z',
          'M8.5 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
          'M21 15l-5-5L5 19',
        ];
      case 'writing':
        return [
          'M12 20h9',
          'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
        ];
      case 'repo':
        return ['M16 6l6 6-6 6', 'M8 6l-6 6 6 6'];
      case 'page':
      default:
        return [
          'M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
          'M8 21h8',
          'M12 17v4',
        ];
    }
  }

  const paths = $derived(iconPaths(mediaIconKind));

  // Brief description = first sentence of summary; remainder shows
  // when expanded. Falls back to the full summary if the first
  // sentence isn't short enough.
  const briefAndRest = $derived.by(() => {
    const s = card.summary || '';
    const idx = s.indexOf('. ');
    if (idx > 0 && idx < 110) {
      return { brief: s.slice(0, idx + 1), rest: s.slice(idx + 1).trim() };
    }
    return { brief: s, rest: '' };
  });

  // Long-form body markdown rendered to HTML. Trusted-author content
  // (no user-submitted markdown reaches this), so marked's default
  // sanitization is sufficient. In previewMode (the /review page),
  // body links get target="_blank" so reviewing destinations doesn't
  // unload /review and lose in-progress edits.
  const bodyHtml = $derived.by(() => {
    if (!card.body) return '';
    let html = marked.parse(card.body, { async: false }) as string;
    if (previewMode) {
      html = html.replace(/<a (href=)/g, '<a target="_blank" rel="noopener noreferrer" $1');
    }
    return html;
  });

  // Detect a video CTA (Vimeo / YouTube). When present, the card
  // renders the iframe inline. Resolution order:
  //   1. card.videoUrl (explicit video source — used when the primary
  //      cta points elsewhere, e.g. a workshop's GitHub repo)
  //   2. card.cta.url (backwards compat — cards where the cta IS the
  //      video link)
  // Cards can opt out via `inlineVideo: false` (used when the source
  // video has privacy settings that block embedding; the card then
  // renders as a still-frame + cta card).
  const videoEmbed = $derived(
    card.inlineVideo === false ? null : parseVideo(card.videoUrl ?? card.cta?.url),
  );

  // ── Outside-tap closes whichever state is active (expanded first,
  //    then focused). Once both are collapsed the card re-enters
  //    orbital rotation. ESC steps down the same ladder.
  //
  //    We listen on POINTERDOWN (not click) for two reasons:
  //      1. iOS Safari's synthesized click after touchend can be
  //         delayed long enough to fire after our setTimeout(0) and
  //         catch the same tap that opened the card — collapsing it
  //         immediately.  pointerdown fires synchronously with the
  //         finger touch so our same-tap is already past.
  //      2. pointerdown lets us inspect pointerType and bail on
  //         non-input events.
  //
  //    A 300ms grace period after open swallows any pointerdown that
  //    raced past the setTimeout — defensive against the "tap a card,
  //    it disappears in a loop with another card" bug (#4).
  $effect(() => {
    if (!isFocused && !isExpanded) return;
    const openedAt = performance.now();
    function handleOutside(e: PointerEvent) {
      if (performance.now() - openedAt < 300) return;
      if (cardEl && !cardEl.contains(e.target as Node)) {
        isExpanded = false;
        isFocused = false;
      }
    }
    let attached = false;
    const t = setTimeout(() => {
      document.addEventListener('pointerdown', handleOutside, true);
      attached = true;
    }, 0);
    return () => {
      clearTimeout(t);
      if (attached) document.removeEventListener('pointerdown', handleOutside, true);
    };
  });

  // ── Viewport-clamp the EXPANDED card. If the card would extend
  //    off any side of the viewport, compute a shift that brings it
  //    fully visible (with a margin from each edge). The shift is
  //    applied via CSS variables on the card; transitions handle the
  //    smooth movement. Recomputes whenever the card transitions to
  //    expanded; resets to (0, 0) on collapse so the card is
  //    free to return to its orbital position smoothly.
  let expandedShiftX = $state(0);
  let expandedShiftY = $state(0);

  let cardScreenEl: HTMLDivElement | undefined = $state();

  // On expand, smooth-scroll the card-screen to its top so the user
  // sees header + title regardless of where they clicked. Per plan
  // §I 2026 scroll affordances.
  $effect(() => {
    if (isExpanded && cardScreenEl) {
      // Scroll to top after the next frame so the expanded layout
      // has settled before we measure / animate.
      requestAnimationFrame(() => {
        cardScreenEl?.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  });

  // Viewport clamp fires whenever the card is being engaged with
  // (hovered, focused, or expanded). A ResizeObserver watches the
  // card's size, so the moment expanded class flips and the card
  // gets larger, the clamp recomputes immediately. Window resize
  // listener handles the viewport changing too.
  //
  // CRITICAL: the recompute reads + writes expandedShiftX/Y. To
  // avoid an infinite effect loop, we keep the CURRENT shift in
  // module-local refs that the recompute reads directly (no Svelte
  // state read), and only WRITE the reactive shift state. This way
  // the effect doesn't subscribe to its own writes.
  let currentShiftX = 0;
  let currentShiftY = 0;

  $effect(() => {
    if (!isHovered && !isLifted) {
      currentShiftX = 0;
      currentShiftY = 0;
      expandedShiftX = 0;
      expandedShiftY = 0;
      return;
    }
    if (!cardEl) return;

    function recompute() {
      if (!cardEl) return;
      const rect = cardEl.getBoundingClientRect();
      const margin = 16;
      // Use the non-reactive refs so we don't trigger the effect by
      // reading our own state.
      const rawLeft = rect.left - currentShiftX;
      const rawRight = rect.right - currentShiftX;
      const rawTop = rect.top - currentShiftY;
      const rawBottom = rect.bottom - currentShiftY;
      const cardHeight = rawBottom - rawTop;
      const availableHeight = window.innerHeight - 2 * margin;
      let dx = 0;
      let dy = 0;
      if (rawRight > window.innerWidth - margin) {
        dx = window.innerWidth - margin - rawRight;
      }
      if (rawLeft + dx < margin) {
        dx = margin - rawLeft;
      }
      // Vertical clamp: when the card fits in the viewport, prefer
      // top-at-margin (standard clamp). When the card is TALLER than
      // the viewport (e.g., expanded card with long body content),
      // anchor the BOTTOM at margin so the toggle button is always
      // visible. The internal card-screen overflow-y:auto lets the
      // user scroll inside the card to reach the top content.
      if (cardHeight > availableHeight) {
        // Card too tall: bottom-anchor.
        dy = window.innerHeight - margin - rawBottom;
      } else {
        // Card fits: standard clamp, top-priority.
        if (rawBottom > window.innerHeight - margin) {
          dy = window.innerHeight - margin - rawBottom;
        }
        if (rawTop + dy < margin) {
          dy = margin - rawTop;
        }
      }
      // Skip the write if shift didn't actually change, to avoid
      // unnecessary re-renders / reactivity churn.
      if (dx === currentShiftX && dy === currentShiftY) return;
      currentShiftX = dx;
      currentShiftY = dy;
      expandedShiftX = dx;
      expandedShiftY = dy;
    }

    // Defer the initial compute one frame so it runs OUTSIDE the
    // effect's tracking scope — synchronous calls during the effect
    // body would otherwise still create dependencies on transitively-
    // read state (and write back to it = infinite loop).
    const initialRaf = requestAnimationFrame(recompute);

    const observer = new ResizeObserver(recompute);
    observer.observe(cardEl);

    /* Final recompute after the spring transition settles (#3).
     * Previously we sampled at 80/350/700ms guess timers, but
     * --duration-slow is 600ms with spring overshoot, so the 700ms
     * sample could still be mid-rebound — leaving the card visibly
     * past the viewport edge on first expand. transitionend fires
     * once when the transform transition truly completes, so the
     * rect read in recompute is the final, settled rect.
     *
     * Each recompute may apply a new shift, retriggering the
     * transition; the recompute's "if (dx === currentShiftX) return"
     * guard breaks the chain once the clamp converges. */
    const onTransitionEnd = (e: TransitionEvent) => {
      if (e.propertyName === 'transform' && e.target === cardEl) {
        recompute();
      }
    };
    cardEl.addEventListener('transitionend', onTransitionEnd);

    /* Debounce window-resize-driven recomputes. On iOS the address
     * bar collapses/expands during scroll, firing many resize
     * events with small height deltas. Each one re-ran the clamp
     * and could push the card sideways mid-scroll. Wait 120ms after
     * the last resize before recomputing. */
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const debouncedResize = () => {
      if (resizeTimer !== undefined) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        recompute();
        resizeTimer = undefined;
      }, 120);
    };
    window.addEventListener('resize', debouncedResize);
    return () => {
      cancelAnimationFrame(initialRaf);
      observer.disconnect();
      cardEl?.removeEventListener('transitionend', onTransitionEnd);
      if (resizeTimer !== undefined) clearTimeout(resizeTimer);
      window.removeEventListener('resize', debouncedResize);
    };
  });

  // ── DRAG: pointerdown/move/up handlers detect a drag (cursor moved
  //    > 5px from press point) vs a click (no movement). Pointer
  //    capture keeps the events flowing even if the cursor leaves
  //    the card, so dragging is smooth. A drag updates the cluster's
  //    per-card phase offset, repositioning this card on its orbit
  //    in real time; release leaves the offset in place so orbital
  //    rotation resumes from the dragged position.

  let isDragging = $state(false);
  let dragStartX = 0;
  let dragStartY = 0;
  let dragMoved = false;

  function handlePointerDown(e: PointerEvent) {
    if (!isDraggable) return;
    /* When the card is focused or expanded, the user's pointer
     * gesture is for reading / scrolling, not orbital repositioning.
     * Bailing here prevents setPointerCapture from hijacking iOS
     * scroll inside the expanded card-screen (#1). Drag stays
     * available on collapsed orbital cards. */
    if (isLifted) return;
    const target = e.target as Element;
    // Bail on any interactive child so its native click works without
    // the card's drag pointer-capture stealing the event. Previously
    // only .card-toggle and .card-cta-link were excepted, which broke
    // clicks on body markdown links, secondary CTAs, and iframes.
    if (target.closest('.card-toggle')) return;
    if (target.closest('a')) return;
    if (target.closest('button')) return;
    if (target.closest('iframe')) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragMoved = false;
    cardEl?.setPointerCapture(e.pointerId);
    if (onDragStart) onDragStart();
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    if (!dragMoved && Math.hypot(dx, dy) > 5) {
      dragMoved = true;
    }
    if (dragMoved && onDragMove) {
      onDragMove(card.id, e.clientX, e.clientY);
    }
  }

  function handlePointerUp(e: PointerEvent) {
    if (!isDragging) return;
    isDragging = false;
    cardEl?.releasePointerCapture(e.pointerId);
    if (onDragEnd) onDragEnd();
    if (!dragMoved && isInteractive && !isFocused) {
      // Pure click (no drag movement) → FOCUS the card. Orbit pauses,
      // the card lifts forward at its current size so you can read
      // the visible content. Click + to fully expand from there.
      isFocused = true;
      if (onSelect) onSelect(card);
    }
  }

  function handleCardKeydown(e: KeyboardEvent) {
    if (!isInteractive) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isFocused) {
        isFocused = true;
        if (onSelect) onSelect(card);
      }
    } else if (e.key === 'Escape') {
      // Step down: expanded → focused → orbital
      if (isExpanded) isExpanded = false;
      else if (isFocused) isFocused = false;
    }
  }

  function handleToggleClick(e: MouseEvent) {
    e.stopPropagation();
    if (isExpanded) {
      /* Tapping the – button is a "close" gesture: fully return to
       * orbital. Previously this only cleared isExpanded, leaving
       * isFocused true; the .focused class kept the cluster's
       * MutationObserver reading hasExpandedCard as true, which
       * pinned orbitPaused = true and the orbit never restarted (#6).
       * The intermediate focused state is reachable via single tap
       * (handlePointerUp); keyboard users still step down via ESC. */
      isExpanded = false;
      isFocused = false;
    } else {
      isExpanded = true;
      isFocused = true; // expanding implies focused
      if (onSelect) onSelect(card);
    }
  }
</script>

<div
  bind:this={cardEl}
  class="scrambler-card category-{cardCategory}"
  class:foreground={isForeground}
  class:interactive={isInteractive}
  class:hovered={isHovered}
  class:focused={isFocused}
  class:expanded={isExpanded}
  class:has-media={!!card.media || !!card.mediaGrid?.length || !!videoEmbed}
  style:--phosphor-intensity={isLifted ? 1 : phosphorIntensity}
  style:transform={
    isLifted
      ? `translate(${expandedShiftX}px, ${expandedShiftY}px) translateZ(0) scale(1)`
      : `translate(${expandedShiftX}px, ${expandedShiftY}px) translateZ(${position.z * -200}px) scale(${position.scale})`
  }
  style:opacity={isLifted ? 1 : position.opacity}
  style:filter={isLifted || position.opacity < 0.08 ? 'none' : `blur(${position.blur}px)`}
  style:visibility={!isLifted && !isInteractive && position.opacity < 0.04 ? 'hidden' : null}
  role="button"
  tabindex={isInteractive ? 0 : -1}
  aria-label={card.title}
  aria-expanded={isInteractive ? isExpanded : undefined}
  aria-disabled={!isInteractive ? true : undefined}
  aria-hidden={!isInteractive}
  aria-grabbed={isDraggable ? isDragging : undefined}
  onpointerenter={(e) => {
    /* Only real hover-pointers (mouse, pen) drive isHovered. Touch
     * never sets it: on iOS the synthesized mouseenter / pointerleave
     * pair was unreliable, and a card lifting under-finger fired
     * pointerleave → cleared isHovered → card shrank → finger over
     * card again → loop (#4). Touch interactions go straight from
     * tap → isFocused via handlePointerUp; no hover intermediate. */
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') isHovered = true;
  }}
  onpointerleave={(e) => {
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') isHovered = false;
  }}
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
  onpointercancel={handlePointerUp}
  onkeydown={handleCardKeydown}
  style:cursor={isDragging ? 'grabbing' : isDraggable ? 'grab' : 'default'}
>
  <div class="card-screen" bind:this={cardScreenEl}>
    <!-- HEADER ROW: type label on the left, type icon on the right.
         Both share the SAME accent color so the icon is "the visual
         echo" of the type label, with no background/border so it
         reads as part of the typography line. -->
    <div class="card-header">
      <span class="card-type">{card.type}</span>
      <span class="card-type-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          {#each paths as d}
            <path {d} stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
          {/each}
        </svg>
      </span>
    </div>

    <!-- TITLE + brief preview, with comfortable horizontal padding so
         text never crowds the rounded corners or the toggle button. -->
    <h3 class="card-title">{card.title}</h3>
    {#if isForeground || isLifted}
      <p class="card-preview">{briefAndRest.brief}</p>
    {/if}

    <!-- MEDIA: full-bleed beneath the heading. Three render modes:
         (1) mediaGrid → 2×2 mosaic for inspiration/lookbook cards
         (2) single media → standard image with aspect/position
         (3) neither → no media area, card stays text-focused -->
    {#if videoEmbed}
      <!-- Inline video player. Lives in the media slot so it's
           visible in both collapsed and expanded states (per #31).
           Iframe is privacy-friendly (vimeo dnt=1, youtube-nocookie)
           and provides its own "Watch on Provider" overlay when the
           user mouses into it. -->
      <div class="card-media card-media-video">
        <iframe
          src={videoEmbed.embedUrl}
          title={`${card.title} — video`}
          loading="lazy"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        ></iframe>
      </div>
    {:else if card.mediaGrid && card.mediaGrid.length > 0}
      <div class="card-media card-media-grid">
        {#each card.mediaGrid.slice(0, 4) as img, i (i)}
          <img src={img.src} alt={img.alt} loading="lazy" />
        {/each}
      </div>
    {:else if card.media}
      <div
        class="card-media"
        class:aspect-tall={card.media.aspect === 'tall'}
        class:aspect-square={card.media.aspect === 'square'}
        style:aspect-ratio={card.media.aspectRatio ?? null}
      >
        <img
          src={card.media.src}
          alt={card.media.alt}
          loading="lazy"
          style:object-position={card.media.position || 'center'}
        />
      </div>
    {/if}

    <!-- EXPANDED content: longer summary, tags, and the CTA link.
         Only renders when expanded. The toggle button at lower-right
         has its own bottom-padding reservation so this content never
         runs under it. -->
    {#if isExpanded}
      <div class="card-expanded-body">
        <!-- CTA group sits at the TOP of the expanded body, directly
             under the media / video iframe, so the "Watch demo" /
             "Read article" call to action is the first thing the
             reader sees rather than scrolling past the body to find
             it (per #31 review feedback). -->
        {#if card.cta && card.cta.disabled}
          <span class="card-cta-link disabled" aria-disabled="true">
            <span class="cta-label-text">{card.cta.label}</span>
            <span class="cta-disabled-hint" aria-hidden="true">— in progress</span>
          </span>
        {:else if card.cta}
          <a
            class="card-cta-link"
            class:external={card.cta.external}
            href={card.cta.url}
            target={card.cta.external || previewMode ? '_blank' : undefined}
            rel={card.cta.external || previewMode ? 'noopener noreferrer' : undefined}
            onclick={(e) => e.stopPropagation()}
          >
            <span class="cta-label-text">{card.cta.label}</span>
            {#if card.cta.external}
              <svg viewBox="0 0 24 24" class="cta-external-icon" aria-hidden="true">
                <path d="M15 3h6v6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" />
                <path d="M10 14L21 3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" />
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            {:else}
              <span aria-hidden="true">&rarr;</span>
            {/if}
          </a>
        {/if}
        {#if card.secondaryCta}
          <a
            class="card-cta-secondary"
            class:external={card.secondaryCta.external}
            href={card.secondaryCta.url}
            target={card.secondaryCta.external || previewMode ? '_blank' : undefined}
            rel={card.secondaryCta.external || previewMode ? 'noopener noreferrer' : undefined}
            onclick={(e) => e.stopPropagation()}
          >
            <span class="cta-label-text">{card.secondaryCta.label}</span>
            {#if card.secondaryCta.external}
              <svg viewBox="0 0 24 24" class="cta-external-icon" aria-hidden="true">
                <path d="M15 3h6v6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" />
                <path d="M10 14L21 3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" />
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            {/if}
          </a>
        {/if}
        {#if briefAndRest.rest}
          <p class="card-summary">{briefAndRest.rest}</p>
        {/if}
        {#if card.body && bodyHtml}
          <!-- Long-form case-study content. Rendered from card.body
               markdown via `marked` (trusted-author content). -->
          <div class="card-body">{@html bodyHtml}</div>
        {/if}
        {#if card.tags && card.tags.length > 0}
          <ul class="card-tags" aria-label="Tags">
            {#each card.tags as tag}
              <li class="card-tag">{tag}</li>
            {/each}
          </ul>
        {/if}
      </div>
    {/if}
  </div>

  <!-- TOGGLE BUTTON — lower-right corner. Slim gap from the card
       edge. Custom border-radius: TL + BR rounded (BR matches the
       card's pillow corner shape), TR + BL squared, so the shape
       reads as an intentional asymmetric tab keyed to the card's
       bottom-right corner. -->
  {#if isInteractive}
    <button
      class="card-toggle"
      class:expanded={isExpanded}
      aria-pressed={isExpanded}
      aria-label={isExpanded ? 'Collapse this card' : 'Expand to learn more'}
      onclick={handleToggleClick}
    >
      <svg viewBox="0 0 24 24" class="toggle-glyph" aria-hidden="true">
        <line x1="6" y1="12" x2="18" y2="12" stroke-width="2.5" stroke-linecap="round" class="glyph-stroke" />
        {#if !isExpanded}
          <line x1="12" y1="6" x2="12" y2="18" stroke-width="2.5" stroke-linecap="round" class="glyph-stroke" />
        {/if}
      </svg>
    </button>
  {/if}
</div>

<style>
  .scrambler-card {
    position: absolute;
    width: 400px;
    border-radius: 1.5rem / 2.25rem;
    transition:
      transform var(--duration-slow) var(--ease-spring),
      opacity var(--duration-normal) ease,
      filter var(--duration-normal) ease,
      box-shadow var(--duration-normal) ease,
      --phosphor-intensity var(--duration-slow) ease;
    will-change: transform, opacity, filter;
    pointer-events: none;
    cursor: default;
    /* Cast shadow uses the per-category shadow tone so GTK amber cards
       cast a warm shadow and See Work green cards cast a sage shadow. */
    box-shadow:
      10px 14px 28px oklch(from var(--card-shadow) l c h / 0.18),
      6px 8px 12px oklch(from var(--card-shadow) l c h / 0.12),
      2px 2px 4px oklch(from var(--card-shadow) l c h / 0.10),
      0 0 0 1px oklch(from var(--card-shadow-rim) l c h / 0.18);
  }

  /* CATEGORY PALETTES.
     - See Work green: brand neon green, hue 145.
     - Get to Know amber: hue 90 (between orange-amber 80 and
       yellow-gold 95) so the card amber rhymes with the GTK Knob
       pad without skewing too orange.
     - --card-shadow controls the BOX-SHADOW base color. For See Work
       it stays dark sage (matches the sage canvas). For Get to Know
       it shifts to a warm dark tone so the cast shadow and rim glow
       feel hue-coordinated with the amber accent — not green-tinged. */
  .category-see-work {
    --card-accent: var(--color-accent-green);
    --card-accent-dim: oklch(0.55 0.16 145);
    --card-accent-bg: oklch(0.93 0.09 130);
    --toggle-icon: oklch(0.18 0.012 155);
    --card-shadow: oklch(0.2 0.01 155);
    --card-shadow-rim: oklch(0.55 0.02 155);
    /* Rim/bevel colors for the glass-tube side wall + screen inset
       shadows. See Work cards keep the existing sage-greens. */
    --card-rim-light: oklch(0.96 0.04 145);
    --card-rim-mid: oklch(0.55 0.07 165);
    --card-rim-mid-deep: oklch(0.46 0.06 165);
    --card-rim-deep: oklch(0.42 0.03 155);
    --card-rim-screen-deep: oklch(0.50 0.06 165);
  }

  .category-get-to-know {
    --card-accent: oklch(0.82 0.18 90);
    --card-accent-dim: oklch(0.55 0.14 88);
    --card-accent-bg: oklch(0.92 0.10 90);
    --toggle-icon: oklch(0.18 0.012 80);
    --card-shadow: oklch(0.22 0.05 70);
    --card-shadow-rim: oklch(0.50 0.06 75);
    /* GTK cards: amber-tinted rim/bevel so the side wall and inner
       inset shadows feel hue-coordinated with the amber accent
       instead of inheriting sage green from the See Work palette. */
    --card-rim-light: oklch(0.94 0.06 90);
    --card-rim-mid: oklch(0.58 0.10 80);
    --card-rim-mid-deep: oklch(0.46 0.08 75);
    --card-rim-deep: oklch(0.40 0.06 75);
    --card-rim-screen-deep: oklch(0.50 0.08 80);
  }

  .category-default {
    --card-accent: oklch(0.55 0.005 155);
    --card-accent-dim: oklch(0.45 0.005 155);
    --card-accent-bg: oklch(0.86 0.008 155);
    --toggle-icon: oklch(0.96 0.02 80);
    --card-shadow: oklch(0.2 0.01 155);
    --card-shadow-rim: oklch(0.55 0.02 155);
    --card-rim-light: oklch(0.92 0.005 155);
    --card-rim-mid: oklch(0.55 0.005 155);
    --card-rim-mid-deep: oklch(0.46 0.005 155);
    --card-rim-deep: oklch(0.40 0.005 155);
    --card-rim-screen-deep: oklch(0.50 0.005 155);
  }

  /* Per-category TEXT SELECTION highlight. Selecting text inside a
     See Work card uses the green tint; inside a Get to Know card
     uses the amber tint. Color stays dark for legibility. */
  .category-see-work ::selection {
    background: oklch(0.93 0.09 130 / 0.85);
    color: oklch(0.18 0.012 155);
  }
  .category-get-to-know ::selection {
    background: oklch(0.92 0.10 90 / 0.85);
    color: oklch(0.18 0.012 80);
  }
  .category-default ::selection {
    background: oklch(0.86 0.008 155 / 0.85);
    color: oklch(0.18 0.012 155);
  }

  /* Glass-tube side wall — color-coordinates with the card category
     so GTK cards have amber-tinted rim glass and See Work cards
     have green-tinted rim glass. */
  .scrambler-card::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 1.5rem / 2.25rem;
    transform: translate(4px, 4px);
    background: linear-gradient(
      135deg,
      color-mix(in oklch, var(--glass-tint) 55%, var(--card-rim-mid) 45%) 0%,
      color-mix(in oklch, var(--glass-tint) 60%, var(--card-rim-mid-deep) 40%) 60%,
      color-mix(in oklch, var(--glass-tint) 65%, var(--card-rim-deep) 35%) 100%
    );
    box-shadow:
      inset 0 1px 0 oklch(from var(--card-rim-light) l c h / 0.6),
      inset 1px 0 0 oklch(from var(--card-rim-light) l c h / 0.45),
      0 0 0 1px oklch(from var(--card-rim-deep) l c h / 0.25);
    z-index: -1;
    pointer-events: none;
  }

  /* CARD-SCREEN: removed horizontal padding here. Each child now
     manages its own padding so the media element can be full-bleed
     while the text stays comfortably indented. */
  .card-screen {
    position: relative;
    background:
      radial-gradient(
        ellipse 130% 110% at 38% 32%,
        oklch(1 0 0 / 0.18) 0%,
        oklch(1 0 0 / 0.06) 35%,
        transparent 70%
      ),
      var(--glass-tint);
    border-radius: 1.25rem / 1.85rem;
    overflow: hidden;
    isolation: isolate;
    /* Reserve space at the bottom for the toggle button so text
       content never runs underneath it. Cards WITH media remove this
       reservation in their collapsed state — the image extends to
       the bottom of the card and the toggle overlays the image's
       lower-right corner instead. */
    padding-bottom: 3.25rem;
    box-shadow:
      inset 1px 1px 0 0.5px var(--glass-edge-light),
      inset 2px 2px 5px -1px oklch(0.99 0.02 155 / 0.6),
      inset -1px -1px 0 0.5px oklch(from var(--card-rim-screen-deep) l c h / 0.55),
      inset -3px -3px 8px -2px oklch(from var(--card-rim-screen-deep) l c h / 0.3);
  }

  /* All media cards in collapsed state extend their image edge-to-edge
     to the card's bottom — wide screenshots, tall covers, square
     avatars, and media grids. The image becomes the card's dominant
     visual with the +/- toggle overlaying its lower-right corner.
     Cards without media keep the toggle reservation since there's
     nothing for it to overlay. */
  .scrambler-card.has-media:not(.expanded) .card-screen {
    padding-bottom: 0;
  }
  .scrambler-card.has-media:not(.expanded) .card-media {
    margin-bottom: 0;
  }

  .card-screen::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(
      135deg,
      oklch(1 0 0 / 0.45) 0%,
      oklch(1 0 0 / 0.12) 18%,
      transparent 45%
    );
    mix-blend-mode: screen;
    z-index: 1;
  }

  .card-screen::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(
        ellipse 120% 120% at 50% 50%,
        transparent 60%,
        var(--glass-corner-vignette) 100%
      );
    box-shadow:
      inset 0 0 calc(var(--phosphor-intensity) * 32px)
        oklch(from var(--phosphor-color) l c h / calc(var(--phosphor-intensity) * 0.18));
    z-index: 2;
  }

  .scrambler-card.interactive { pointer-events: auto; cursor: pointer; }

  .scrambler-card.foreground {
    box-shadow:
      14px 18px 40px oklch(from var(--card-shadow) l c h / 0.20),
      8px 12px 18px oklch(from var(--card-shadow) l c h / 0.14),
      2px 4px 6px oklch(from var(--card-shadow) l c h / 0.10),
      0 0 0 1px oklch(from var(--card-shadow-rim) l c h / 0.20);
  }

  .scrambler-card.hovered.interactive {
    /* Lightened: dropped the outer 0 0 24px accent glow shadow that was
     * forcing a heavy paint on every hover state change. The rim
     * outline (0 0 0 1px) keeps the accent signal; the cast shadow
     * stays slightly stronger than the foreground rest state. */
    box-shadow:
      16px 22px 52px oklch(from var(--card-shadow) l c h / 0.26),
      8px 12px 18px oklch(from var(--card-shadow) l c h / 0.16),
      0 0 0 1px oklch(from var(--card-accent) l c h / 0.5);
  }

  .scrambler-card.hovered.interactive .card-screen::after {
    box-shadow:
      inset 0 0 48px oklch(from var(--card-accent) l c h / 0.22);
  }

  /* HEADER: type label + type icon on a single row at the top.
     The right padding is bumped beyond the toggle's right offset
     (0.4rem → 0.65rem) to compensate for the toggle's asymmetric
     pillow border-radius, which shifts the toggle's PERCEIVED visual
     center slightly inward from its geometric center. With the extra
     right padding, the type icon's visual center now sits directly
     above the toggle's PERCEIVED center, reading as a clean pair. */
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-6) 0.65rem 0 var(--space-6);
    position: relative;
    z-index: 0;
  }

  .card-type {
    font-size: 0.675rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--card-accent-dim);
    line-height: 1;
  }

  /* Type icon: container is the SAME width as the lower-right toggle
     button (2.4rem) so the icon centers on the same right-axis as
     the +/- below. The visible icon is bumped to 1.5rem so it's
     understandable at a glance — was 1.1rem and felt a bit small. */
  .card-type-icon {
    flex-shrink: 0;
    width: 2.4rem;
    height: 1.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--card-accent);
  }

  .card-type-icon svg {
    width: 1.5rem;
    height: 1.5rem;
    display: block;
  }

  .card-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin: var(--space-2) 0 0;
    padding: 0 var(--space-6);
    line-height: 1.3;
    color: var(--color-text-primary);
    position: relative;
    z-index: 0;
  }

  .card-preview {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    line-height: 1.45;
    margin: var(--space-2) 0 0;
    padding: 0 var(--space-6);
    /* 2-line clamp keeps the preview brief in collapsed state. */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    position: relative;
    z-index: 0;
  }

  /* Media: full-bleed below the heading/preview. The aspect ratio
     adapts to each asset's natural orientation so portrait covers
     (magazine spreads, book jackets) and squares (avatars, logos)
     aren't cropped by a forced 16:9 frame. WIDE images get a
     near-white surface beneath them so any PNG transparency reads
     as a clean illustrator's bg rather than category-tinted color. */
  .card-media {
    position: relative;
    margin-top: var(--space-4);
    width: 100%;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    background: oklch(0.98 0.005 155);
  }

  /* Tall portrait — magazine covers, book jackets, vertical poster
     formats. 3:4 frame matches standard print magazine ratios.
     Bottom + side padding gives the cover breathing room from the
     card edges. Bg is the same near-white as wide cards (not the
     category-tinted amber/green) so the surrounding strip reads as
     product-photography paper, not as a colored frame leaking into
     the image. */
  .card-media.aspect-tall {
    aspect-ratio: 3 / 4;
    max-height: 22rem;
    padding: 0 0.5rem 1.25rem;
    background: oklch(0.98 0.005 155);
  }

  /* Square — logos, org avatars, near-square covers. Near-white bg
     so any letterbox from `object-fit: contain` reads as clean
     surface rather than a category-tinted leak. */
  .card-media.aspect-square {
    aspect-ratio: 1 / 1;
    max-height: 18rem;
    background: oklch(0.98 0.005 155);
  }

  /* 2×2 mosaic for inspiration / mood-board cards. The grid is a
     square frame split into four equal tiles. Each tile uses
     object-fit: cover so the four images crop cleanly to fill their
     squares — reads as a curated lookbook at a glance. A thin gap
     between tiles separates them visually. */
  .card-media.card-media-grid {
    aspect-ratio: 1 / 1;
    max-height: 22rem;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 2px;
    padding: 0;
    background: oklch(0.98 0.005 155);
  }

  .card-media.card-media-grid img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .card-media img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  /* TALL frames now FILL their box (object-fit: cover) so portrait
     covers don't leave letterbox gaps on L/R. Slight top/bottom crop
     is acceptable on magazine covers — the title block is usually
     centered or at the top. Per-card `position` override still works
     to anchor at 'top' if needed.
     SQUARE frames keep `contain` because square assets (avatars,
     logos) often have a natural padding that's part of the design. */
  .card-media.aspect-tall img {
    object-fit: cover;
  }
  .card-media.aspect-square img {
    object-fit: contain;
    object-position: center;
  }

  /* When expanded, give the media a subtle inner shadow on the bottom
     edge so it integrates with the CRT card's recessed bezel feel. */
  .card-media::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    box-shadow:
      inset 0 -4px 12px -2px oklch(0.42 0.04 155 / 0.18),
      inset -2px 0 6px -2px oklch(0.42 0.04 155 / 0.12);
  }
  /* In expanded state, eliminate every decorative overlay on card-screen
   * that works on short collapsed cards but creates visible bands on
   * tall scroll content. Three rounds of trying to fix isolated causes
   * left the band visible because there's a fourth source I missed:
   *
   *   .card-screen::before and ::after are position:absolute children
   *   of an overflow:auto parent. Their inset:0 sizes them to the
   *   padding box (visible viewport ~100dvh), but they render as part
   *   of the SCROLLABLE CONTENT — so when card-screen has tall content
   *   and the user has scrolled (even briefly), the pseudo-elements
   *   scroll with the content. ::before's bottom edge then becomes
   *   visible mid-viewport as a horizontal seam where the gradient
   *   overlay ends and bare card-screen bg begins. Same for ::after.
   *
   * Solution for expanded state: kill ::before and ::after entirely,
   * use flat glass-tint background, drop card-media's bg + bottom
   * shadow. Visually flatter but uniform top-to-bottom regardless of
   * scroll position. Collapsed cards keep all the depth treatments. */
  .scrambler-card.expanded .card-screen {
    background: var(--glass-tint);
  }
  .scrambler-card.expanded .card-screen::before,
  .scrambler-card.expanded .card-screen::after {
    display: none;
  }
  .scrambler-card.expanded .card-media {
    background: transparent;
  }
  .scrambler-card.expanded .card-media::after {
    box-shadow: none;
  }

  .card-expanded-body {
    /* In expanded state, sit flush against card-media's bottom edge.
     * The previous 1rem margin-top exposed card-screen's glass-tint
     * background between media and body, which read as a green/amber
     * "band cutting through" the card. Internal padding keeps the
     * text breathing room without revealing the seam. */
    margin-top: 0;
    padding: var(--space-4) var(--space-6) 0;
    position: relative;
    z-index: 0;
  }

  .card-summary {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    margin: 0 0 var(--space-3);
    line-height: 1.55;
  }

  /*
   * Inline video embed (Vimeo / YouTube). Lives in the card-media slot
   * so it's visible in BOTH collapsed and expanded states. The iframe
   * loads lazy + privacy-friendly (vimeo dnt=1, youtube-nocookie) and
   * provides its own "Watch on Provider" overlay on hover. 16:9 fills
   * the same slot a card-media image would.
   */
  .card-media-video {
    aspect-ratio: 16 / 9;
    background: oklch(0.20 0.01 155);
  }
  .card-media-video iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
  }

  /*
   * Long-form case-study body (rendered from card.body markdown via
   * `marked`). Only present in the expanded card state. Typography
   * tuned for sustained reading inside the card frame.
   */
  .card-body {
    font-size: 0.95rem;
    color: var(--color-text-primary);
    line-height: 1.65;
    margin: 0 0 var(--space-4);
  }
  .card-body :global(h2) {
    font-size: 1.05rem;
    font-weight: 600;
    margin: var(--space-5) 0 var(--space-2);
    color: var(--color-text-primary);
  }
  .card-body :global(h2:first-child) {
    margin-top: 0;
  }
  .card-body :global(h3) {
    font-size: 0.95rem;
    font-weight: 600;
    margin: var(--space-4) 0 var(--space-2);
  }
  .card-body :global(p) {
    margin: 0 0 var(--space-3);
  }
  .card-body :global(ul),
  .card-body :global(ol) {
    margin: 0 0 var(--space-3);
    padding-left: 1.25rem;
  }
  .card-body :global(li) {
    margin-bottom: 0.4rem;
  }
  .card-body :global(a) {
    color: var(--color-accent-blue);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .card-body :global(a:hover),
  .card-body :global(a:focus-visible) {
    text-decoration-thickness: 2px;
  }
  .card-body :global(img) {
    width: 100%;
    height: auto;
    border-radius: 0.4rem;
    margin: var(--space-3) 0;
    display: block;
  }
  .card-body :global(blockquote) {
    border-left: 3px solid var(--card-accent-dim, var(--color-border));
    padding-left: 1rem;
    margin: 0 0 var(--space-3);
    color: var(--color-text-secondary);
    font-style: italic;
  }
  .card-body :global(code) {
    font-family: var(--font-mono);
    font-size: 0.85em;
    background: var(--color-canvas-light);
    padding: 0.05rem 0.3rem;
    border-radius: 0.2rem;
  }

  .card-tags {
    list-style: none;
    padding: 0;
    margin: 0 0 var(--space-3);
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .card-tag {
    font-size: 0.6875rem;
    font-family: var(--font-mono);
    color: var(--card-accent-dim);
    background: oklch(from var(--card-accent) l c h / 0.10);
    border: 1px solid oklch(from var(--card-accent) l c h / 0.25);
    border-radius: 0.4rem;
    padding: 0.15rem 0.45rem;
  }

  /*
   * SECONDARY CTA — small, understated text link below the primary CTA.
   * Used when one project has two legitimate destinations (e.g., merged
   * sustain-our-soil case study + MICA institutional page).
   */
  .card-cta-secondary {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    margin-top: 0.4rem;
    /* Match .card-cta-link's bottom-margin so the underline doesn't
     * sit flush against the next row of text below it. */
    margin-bottom: var(--space-3);
    font-size: 0.75rem;
    color: var(--card-accent-dim);
    text-decoration: none;
    align-self: flex-start;
    transition: color var(--duration-fast) ease, transform var(--duration-fast) ease;
  }
  .card-cta-secondary:hover,
  .card-cta-secondary:focus-visible {
    color: var(--card-accent-strong);
    transform: translateX(2px);
  }
  .card-cta-secondary .cta-label-text {
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 2px;
  }
  .card-cta-secondary .cta-external-icon {
    width: 0.75em;
    height: 0.75em;
  }

  /*
   * CTA LINK — two distinct treatments based on link destination.
   *
   * Internal links (no `card.cta.external`) render as a tinted button
   * with the per-category accent color — clear "navigate within site"
   * affordance, sits inside the card's content layer.
   *
   * External links render as an INLINE TEXT HYPERLINK in a uniform
   * dial-blue with a soft glow under the text in place of a
   * traditional underline. The visual distinction signals "this leaves
   * the site" so users instantly differentiate internal navigation
   * from outbound links — same treatment across all card categories
   * for consistency.
   */
  .card-cta-link {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: var(--space-1);
    /* Bottom margin gives the underline / external-icon breathing room
     * from the next row of body text. CTAs now render at the TOP of
     * the expanded body (above the prose), so they sit directly above
     * paragraph text — without this, the underline crowds the next
     * line. */
    margin-bottom: var(--space-3);
    margin-right: 3rem;
    font-size: 0.875rem;
    font-weight: 600;
    text-decoration: none;
    transition: filter var(--duration-fast) ease, transform var(--duration-fast) ease;
  }

  /* Internal link — brushed-silver chrome button matching the Knob's
     central dial. Same metallic treatment across every card category
     so internal CTAs feel like a unified system control. Category
     color still expresses through the type label, type icon, tag
     pill borders, toggle, and (for external links) the dial-blue
     marker line. */
  .card-cta-link:not(.external) {
    position: relative;
    padding: 0.5rem 0.9rem;
    color: oklch(0.20 0.012 250);
    background:
      linear-gradient(to bottom,
        oklch(0.88 0.008 250) 0%,
        oklch(0.82 0.010 250) 50%,
        oklch(0.74 0.012 250) 100%
      );
    border: 1px solid oklch(0.45 0.010 250 / 0.45);
    border-radius: 0.5rem;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    overflow: hidden;
    box-shadow:
      0 2px 4px oklch(0.15 0.02 250 / 0.25),
      inset 0 1px 0 oklch(0.96 0.005 250 / 0.7),
      inset 0 -1px 0 oklch(0.45 0.010 250 / 0.4);
  }

  /* Subtle brushed-metal milling overlay — same diagonal micro-stripes
     used on the dial, so the texture rhymes across the system. */
  .card-cta-link:not(.external)::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: repeating-linear-gradient(
      38deg,
      oklch(1 0 0 / 0.06) 0px 0.5px,
      transparent 0.5px 1.5px,
      oklch(0 0 0 / 0.04) 1.5px 2px,
      transparent 2px 3px
    );
    mix-blend-mode: overlay;
  }

  .card-cta-link:not(.external):hover,
  .card-cta-link:not(.external):focus-visible {
    background:
      linear-gradient(to bottom,
        oklch(0.92 0.008 250) 0%,
        oklch(0.86 0.010 250) 50%,
        oklch(0.78 0.012 250) 100%
      );
    transform: translateY(-1px);
    box-shadow:
      0 4px 8px oklch(0.15 0.02 250 / 0.30),
      inset 0 1px 0 oklch(0.97 0.005 250 / 0.8),
      inset 0 -1px 0 oklch(0.45 0.010 250 / 0.45);
  }

  .card-cta-link:not(.external):active {
    transform: translateY(1px);
    background:
      linear-gradient(to bottom,
        oklch(0.78 0.010 250) 0%,
        oklch(0.74 0.012 250) 50%,
        oklch(0.70 0.014 250) 100%
      );
    box-shadow:
      0 1px 2px oklch(0.15 0.02 250 / 0.20),
      inset 0 1px 2px oklch(0.40 0.012 250 / 0.45);
  }

  /* External link — inline text in dial blue with a glow under the
     label. The pseudo-element on .cta-label-text creates the soft
     blue glow stripe that replaces a traditional underline. */
  .card-cta-link.external {
    padding: 0.15rem 0.1rem 0.4rem;
    color: oklch(0.50 0.18 250);
    background: none;
    border-radius: 0.25rem;
  }

  .card-cta-link.external .cta-label-text {
    position: relative;
    display: inline-block;
  }

  /* Marker-line "underline" — looks like a chisel-tip highlighter
     stroke that's drying out: a thicker mid-section, scratchy
     uneven edges via repeating-linear-gradient stripes overlaid
     with a soft blur. More LINEAR than radial glow, so it reads as
     a deliberate hand-drawn ink mark, not a halo. */
  .card-cta-link.external .cta-label-text::after {
    content: '';
    position: absolute;
    left: -0.05em;
    right: -0.05em;
    bottom: -0.32rem;
    height: 0.28rem;
    pointer-events: none;
    /* Two stacked layers: a solid-ish core stripe + a frayed top
       edge made of vertical stripes so it reads as drying ink. */
    background:
      /* Core ink stripe — flat horizontal band */
      linear-gradient(
        to bottom,
        oklch(0.50 0.18 250 / 0.65) 0%,
        oklch(0.50 0.18 250 / 0.55) 60%,
        oklch(0.50 0.18 250 / 0.20) 100%
      ),
      /* Frayed/scratchy edge — vertical micro-stripes mimic ink
         dragging unevenly across paper */
      repeating-linear-gradient(
        90deg,
        oklch(0.50 0.18 250 / 0.45) 0px,
        oklch(0.50 0.18 250 / 0.45) 1px,
        oklch(0.50 0.18 250 / 0.20) 1px,
        oklch(0.50 0.18 250 / 0.20) 2px,
        oklch(0.50 0.18 250 / 0.45) 2px,
        oklch(0.50 0.18 250 / 0.45) 3px,
        oklch(0.50 0.18 250 / 0.10) 3px,
        oklch(0.50 0.18 250 / 0.10) 5px
      );
    background-blend-mode: multiply;
    filter: blur(0.4px);
    border-radius: 0.05rem;
    transition: opacity var(--duration-fast) ease, transform var(--duration-fast) ease, filter var(--duration-fast) ease;
  }

  .card-cta-link.external:hover,
  .card-cta-link.external:focus-visible {
    color: oklch(0.62 0.20 250);
  }

  .card-cta-link.external:hover .cta-label-text::after,
  .card-cta-link.external:focus-visible .cta-label-text::after {
    background:
      linear-gradient(
        to bottom,
        oklch(0.62 0.20 250 / 0.80) 0%,
        oklch(0.62 0.20 250 / 0.65) 60%,
        oklch(0.62 0.20 250 / 0.25) 100%
      ),
      repeating-linear-gradient(
        90deg,
        oklch(0.62 0.20 250 / 0.55) 0px,
        oklch(0.62 0.20 250 / 0.55) 1px,
        oklch(0.62 0.20 250 / 0.25) 1px,
        oklch(0.62 0.20 250 / 0.25) 2px,
        oklch(0.62 0.20 250 / 0.55) 2px,
        oklch(0.62 0.20 250 / 0.55) 3px,
        oklch(0.62 0.20 250 / 0.15) 3px,
        oklch(0.62 0.20 250 / 0.15) 5px
      );
    background-blend-mode: multiply;
    filter: blur(0.3px);
    transform: translateY(1px);
  }

  .card-cta-link.external:active {
    color: oklch(0.40 0.16 250);
  }

  .cta-external-icon { width: 0.95rem; height: 0.95rem; }

  /* Disabled CTA — drafts/in-progress entries. Looks like a button
     but is non-interactive: muted bg, no hover lift, no shimmer. */
  .card-cta-link.disabled {
    cursor: default;
    color: oklch(0.55 0.005 155);
    background: oklch(0.92 0.005 155);
    border: 1px dashed oklch(0.65 0.005 155 / 0.6);
    box-shadow: none;
    text-shadow: none;
    pointer-events: none;
    /* Override the brushed-silver gradient + bevel from the
       interactive button rules. */
  }
  .card-cta-link.disabled::before {
    display: none;
  }
  .card-cta-link.disabled .cta-disabled-hint {
    margin-left: 0.4rem;
    font-size: 0.7em;
    font-style: italic;
    opacity: 0.85;
  }

  /*
   * TOGGLE BUTTON — lower-right corner.
   *
   * Slim gap from the card edge (0.4rem inset) so the card's own
   * rounded corner is just barely visible behind it.
   *
   * Asymmetric border-radius: TOP-LEFT + BOTTOM-RIGHT rounded (BR
   * matches the card's pillow ratio for visual continuity), TOP-RIGHT
   * + BOTTOM-LEFT squared. The result reads as a deliberate tab keyed
   * to the card's lower-right corner.
   *
   * Same gloss + bevel + glass-tint treatment as the card-screen so
   * the button feels like part of the card surface. Hover lifts it
   * subtly (translateY -2px) to imply press affordance.
   */
  .card-toggle {
    position: absolute;
    bottom: 0.4rem;
    right: 0.4rem;
    width: 2.4rem;
    height: 2.4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: none;
    /* TL=0.55, TR=0, BR=0.95/1.4 (matches card pillow ratio), BL=0 */
    border-radius: 0.55rem 0 0.95rem 0 / 0.55rem 0 1.4rem 0;
    cursor: pointer;
    z-index: 5;
    pointer-events: auto;
    background:
      radial-gradient(
        ellipse 130% 110% at 38% 32%,
        oklch(1 0 0 / 0.30) 0%,
        oklch(1 0 0 / 0.08) 50%,
        transparent 90%
      ),
      var(--card-accent);
    box-shadow:
      inset 0 1px 0 oklch(1 0 0 / 0.4),
      inset 0 -1px 0 oklch(from var(--card-accent) calc(l - 0.15) c h / 0.5),
      0 1px 3px oklch(0.2 0.01 155 / 0.18),
      0 0 0 1px oklch(from var(--card-accent) calc(l - 0.10) c h / 0.4);
    transition:
      filter var(--duration-fast) ease,
      transform var(--duration-fast) ease,
      box-shadow var(--duration-fast) ease;
  }

  .card-toggle:hover,
  .card-toggle:focus-visible {
    filter: brightness(1.08);
    transform: translateY(-2px);
    box-shadow:
      inset 0 1px 0 oklch(1 0 0 / 0.45),
      inset 0 -1px 0 oklch(from var(--card-accent) calc(l - 0.15) c h / 0.55),
      0 4px 8px oklch(0.2 0.01 155 / 0.22),
      0 0 0 1px oklch(from var(--card-accent) calc(l - 0.10) c h / 0.5);
  }

  .card-toggle:active {
    transform: translateY(1px);
    filter: brightness(0.95);
    box-shadow:
      inset 0 1px 0 oklch(1 0 0 / 0.30),
      inset 0 -1px 0 oklch(from var(--card-accent) calc(l - 0.15) c h / 0.4),
      0 1px 2px oklch(0.2 0.01 155 / 0.15),
      0 0 0 1px oklch(from var(--card-accent) calc(l - 0.10) c h / 0.35);
  }

  .card-toggle:focus-visible {
    outline: 2px solid var(--card-accent);
    outline-offset: 2px;
  }

  .toggle-glyph { width: 1rem; height: 1rem; pointer-events: none; }
  .glyph-stroke { stroke: var(--toggle-icon); }

  /* FOCUSED: card is paused and lifted forward at its current size.
     Body click sets this. Browser-side overrides for inline opacity/
     filter/transform are already applied via the {isLifted}-driven
     style: directives — this class is for additional treatments
     (subtle accent ring, higher z within wrapper). */
  .scrambler-card.focused {
    z-index: 200 !important;
    box-shadow:
      18px 24px 56px oklch(from var(--card-shadow) l c h / 0.30),
      8px 12px 18px oklch(from var(--card-shadow) l c h / 0.18),
      0 0 0 1px oklch(from var(--card-accent) l c h / 0.55),
      0 0 32px oklch(from var(--card-accent) l c h / 0.20);
  }

  /* EXPANDED: card grows to fill MOST of the viewport (still leaves
     a slim margin so the background reads through, anchoring the
     card "in" the page rather than as a fullscreen modal). Width and
     max-height are viewport-clamped; if content overflows the
     constrained box, the card-screen scrolls. The viewport-clamp
     shift on transform still applies, so the card eases toward
     center only as much as needed for the bigger size to fit. */
  .scrambler-card.expanded {
    z-index: 250 !important;
    width: min(54rem, calc(100vw - 2rem));
    /* Promote viewport bound to the card itself so the transform
     * shift never lets the card extend past the viewport. The
     * card-screen handles internal scroll for overflow content. */
    max-height: calc(100dvh - 2.5rem);
    /* Strict clip to the rounded outer boundary. Earlier iteration
     * used overflow-clip-margin: 4px to let .scrambler-card::before's
     * 4px translate peek as a sidewall depth illusion, but on a large
     * expanded card that 4px peek reads as a white strip "jutting
     * out" past the rounded corner — the depth nuance isn't worth
     * the visual artifact. ::before is now hidden in expanded state
     * (see rule below), so no clip-margin allowance is needed. */
    overflow: clip;
    /* Per-spec, ancestor touch-action restricts every descendant's
     * effective gesture set, regardless of what the descendant
     * declares. Setting pan-y here means iOS will always honor a
     * vertical pan gesture started anywhere inside the expanded card
     * — even on text, images, or the toggle button — instead of
     * letting JS pointer handlers (drag, link, etc.) hijack the
     * gesture (#1). Tap and click still work; horizontal pan and
     * pinch-zoom are blocked. */
    touch-action: pan-y;
  }
  /* Hide the side-wall depth pseudo-element in expanded state. On
   * collapsed cards it gives subtle 3D weight; on expanded cards its
   * 4px translate creates a visible white sliver past the rounded
   * bottom edge that reads as a layout bug rather than depth. */
  .scrambler-card.expanded::before {
    display: none;
  }

  .scrambler-card.expanded .card-screen {
    max-height: calc(100dvh - 2.5rem);
    overflow-y: auto;
    /* iOS Safari touch scroll fix (#37). Without these, expanded
     * cards on iPhone don't scroll at all — taps land on the body
     * and pan gestures fall through to the page. touch-action:pan-y
     * tells the browser this element handles vertical pans (instead
     * of letting the parent's overflow:clip swallow them). The
     * -webkit prefix re-enables momentum scroll on older iOS WebKit. */
    touch-action: pan-y;
    -webkit-overflow-scrolling: touch;
    /* Sync the card-screen's rounded corners with the outer
     * scrambler-card (1.5rem / 2.25rem) when expanded. The base
     * card-screen radius (1.25rem / 1.85rem) is tighter and leaves a
     * visible rim of scrambler-card's tint at the bottom-right corner
     * where scrollable content meets the curve — looks like the
     * scrollable area extends past the rounded edge. Matching the
     * radius removes that mismatch. The "glass tube" depth illusion
     * still comes from .scrambler-card::before (the side-wall) which
     * renders behind card-screen and is unaffected. */
    border-radius: 1.5rem / 2.25rem;
    /* 2026 scroll affordances per plan §I:
     *   - overscroll-behavior contains the scroll inside the card
     *     so wheel doesn't bubble up to the page;
     *   - scroll-behavior smooth applies to programmatic scrollTo
     *     calls (e.g., the on-expand jump-to-top below);
     *   - thin OKLCH-tinted scrollbar matches brand;
     *   - scrollbar-gutter:stable reserves scrollbar space so
     *     content layout doesn't shift when scrollbar appears. */
    overscroll-behavior: contain;
    scroll-behavior: smooth;
    scrollbar-width: thin;
    scrollbar-color: oklch(0.55 0.05 90 / 0.6) transparent;
    scrollbar-gutter: stable;
    /* Bottom space reserves room for the toggle button (2.4rem +
     * 0.4rem offset = 2.8rem) AND adds breathing room above the
     * last row of content (especially when tags wrap to multiple
     * rows on tall scrolling cards). 5.5rem total: ~2.7rem of
     * actual breathing room above the toggle's top. */
    padding-bottom: 5.5rem;
  }
  .scrambler-card.expanded .card-screen::-webkit-scrollbar {
    width: 6px;
  }
  .scrambler-card.expanded .card-screen::-webkit-scrollbar-track {
    background: transparent;
    /* Inset the scrollbar track from top + bottom so its rectangular
     * end doesn't visually butt against card-screen's rounded
     * corners. ~1.5rem keeps the track entirely inside the curved
     * boundary on both ends. */
    margin: 1.5rem 0.25rem 1.5rem 0;
  }
  .scrambler-card.expanded .card-screen::-webkit-scrollbar-thumb {
    background: oklch(0.55 0.05 90 / 0.5);
    border-radius: 3px;
  }
  .scrambler-card.expanded .card-screen::-webkit-scrollbar-thumb:hover {
    background: oklch(0.55 0.05 90 / 0.8);
  }

  /* MAGAZINE-STYLE LAYOUT for expanded cards with TALL portrait
     media. The cover sits in a left column at full natural scale;
     title, preview, summary, tags, and CTA flow alongside it on the
     right. Removes the wasted horizontal whitespace that a centered
     contained image was leaving when the card grew large. */
  .scrambler-card.expanded:has(.card-media.aspect-tall) .card-screen {
    display: grid;
    grid-template-columns: minmax(13rem, 38%) 1fr;
    column-gap: var(--space-6);
    row-gap: var(--space-3);
    padding: var(--space-6) var(--space-6) 4rem;
  }

  /* Type label + icon span the full width at the top */
  .scrambler-card.expanded:has(.card-media.aspect-tall) .card-header {
    grid-column: 1 / -1;
    padding: 0;
  }

  /* Cover takes column 1 across all subsequent rows. Larger max-height
     so the cover can scale up to its own natural size in the bigger
     expanded card. */
  .scrambler-card.expanded:has(.card-media.aspect-tall) .card-media {
    grid-column: 1;
    grid-row: 2 / span 4;
    margin: 0;
    padding: 0;
    max-height: none;
    aspect-ratio: 3 / 4;
    align-self: start;
  }

  /* Title, preview, expanded body all stack in column 2 alongside
     the cover. Each gets reset padding so it aligns with the grid
     gap rather than its own pre-grid padding. */
  .scrambler-card.expanded:has(.card-media.aspect-tall) .card-title {
    grid-column: 2;
    grid-row: 2;
    padding: 0;
    font-size: 1.5rem;
    margin: 0;
  }

  .scrambler-card.expanded:has(.card-media.aspect-tall) .card-preview {
    grid-column: 2;
    grid-row: 3;
    padding: 0;
    font-size: 1rem;
    -webkit-line-clamp: unset;
    display: block;
  }

  .scrambler-card.expanded:has(.card-media.aspect-tall) .card-expanded-body {
    grid-column: 2;
    grid-row: 4;
    padding: 0;
    margin: 0;
  }

  /* On narrow viewports the magazine layout reverts to single-column
     (cover on top, text below) so it's still readable. */
  @media (max-width: 640px) {
    .scrambler-card.expanded:has(.card-media.aspect-tall) .card-screen {
      display: block;
      padding: var(--space-6);
      padding-bottom: 4rem;
    }
    .scrambler-card.expanded:has(.card-media.aspect-tall) .card-media {
      max-height: 60vh;
      margin-top: var(--space-3);
    }
  }

  /* Mobile: tight margin (0.75rem each side) so the card fills the
     narrow viewport while still showing a thin sliver of bg. */
  @media (max-width: 640px) {
    .scrambler-card.expanded {
      width: calc(100vw - 1.5rem);
    }
    .scrambler-card.expanded .card-screen {
      max-height: calc(100dvh - 1.5rem);
    }
  }

  @media (max-width: 1280px) {
    .scrambler-card { width: 340px; }
  }

  @media (max-width: 1024px) {
    .scrambler-card { width: 300px; }
  }

  @media (max-width: 640px) {
    .scrambler-card { width: 240px; }
    .card-toggle {
      width: 2rem;
      height: 2rem;
      bottom: 0.3rem;
      right: 0.3rem;
    }
    .toggle-glyph { width: 0.85rem; height: 0.85rem; }
    .card-screen { padding-bottom: 2.75rem; }
    /* Keep the type icon centered on the same right-axis as the
       (smaller) toggle on mobile. */
    .card-header { padding-right: 0.5rem; }
    .card-type-icon { width: 2rem; height: 1.4rem; }
    .card-type-icon svg { width: 1.25rem; height: 1.25rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .scrambler-card,
    .card-toggle,
    .card-cta-link {
      transition: none;
    }
    .card-toggle:hover,
    .card-toggle:active,
    .card-cta-link:hover,
    .card-cta-link:active {
      transform: none;
    }
  }
</style>
