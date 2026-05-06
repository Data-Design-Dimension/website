<script lang="ts">
  import type { ScramblerCard, ScramblerPosition } from '../lib/scrambler/types';
  import ScramblerCard_ from './ScramblerCard.svelte';
  import { dump as yamlDump } from 'js-yaml';

  interface Props {
    cards: ScramblerCard[];
  }

  let { cards }: Props = $props();

  let index = $state(0);
  const card = $derived(cards[index]);

  type CardEdit = {
    tags?: string[];
    approved?: boolean;
    archived?: boolean;
    featured?: boolean;
    /** Free-text feedback the reviewer wants to send back as a GitHub
     *  issue when the review is submitted. */
    feedback?: string;
  };

  const STORAGE_KEY = 'dadeda:review:edits:v1';
  const REPO = 'Data-Design-Dimension/website';
  /** Conservative URL length to keep GitHub's prefilled issue URL safe
   *  across browsers. Above this, fall back to clipboard + simpler URL. */
  const SAFE_URL_LENGTH = 6000;

  // Restore any persisted edits on mount so a back-button or refresh
  // never loses review work mid-session.
  function loadEdits(): Record<string, CardEdit> {
    if (typeof localStorage === 'undefined') return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, CardEdit>) : {};
    } catch {
      return {};
    }
  }

  // Per-card local edits — keyed by card id so flipping cards keeps
  // your edits intact. Persisted to localStorage on every change.
  let edits = $state<Record<string, CardEdit>>(loadEdits());

  $effect(() => {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
    } catch {
      // Quota exceeded or storage disabled; in-memory edits remain valid.
    }
  });

  function resetAllEdits() {
    if (typeof window !== 'undefined') {
      const ok = window.confirm(
        'Clear ALL review edits and feedback for every card? This cannot be undone.',
      );
      if (!ok) return;
    }
    edits = {};
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  }

  function getEdit(id: string) {
    return edits[id] ?? {};
  }

  function getTags(c: ScramblerCard): string[] {
    return getEdit(c.id).tags ?? c.tags ?? [];
  }

  let newTagInput = $state('');

  function addTag() {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    const current = getTags(card);
    if (current.includes(trimmed)) {
      newTagInput = '';
      return;
    }
    edits[card.id] = { ...getEdit(card.id), tags: [...current, trimmed] };
    newTagInput = '';
  }

  function removeTag(tag: string) {
    const current = getTags(card);
    edits[card.id] = { ...getEdit(card.id), tags: current.filter((t) => t !== tag) };
  }

  function toggleApproved() {
    const e = getEdit(card.id);
    edits[card.id] = { ...e, approved: !(e.approved ?? card.approved ?? false) };
  }

  function toggleArchived() {
    const e = getEdit(card.id);
    edits[card.id] = { ...e, archived: !(e.archived ?? card.archived ?? false) };
  }

  function toggleFeatured() {
    const e = getEdit(card.id);
    edits[card.id] = { ...e, featured: !(e.featured ?? card.featured ?? false) };
  }

  function buildYaml(c: ScramblerCard): string {
    const e = getEdit(c.id);
    const merged: Record<string, unknown> = {
      type: c.type,
      title: c.title,
      summary: c.summary,
      tags: e.tags ?? c.tags ?? [],
      ...(c.cta ? { cta: c.cta } : {}),
      ...(c.secondaryCta ? { secondaryCta: c.secondaryCta } : {}),
      ...(c.media ? { media: c.media } : {}),
      ...(c.mediaGrid ? { mediaGrid: c.mediaGrid } : {}),
      order: c.order,
      ...(c.date ? { date: c.date } : {}),
      ...((e.archived ?? c.archived) ? { archived: true } : {}),
      ...((e.featured ?? c.featured) ? { featured: true } : {}),
      ...((e.approved ?? c.approved) ? { approved: true } : {}),
    };
    return yamlDump(merged, { lineWidth: 100 });
  }

  let copyState = $state<'idle' | 'copied'>('idle');
  let copyTimer: ReturnType<typeof setTimeout> | undefined;
  async function copyYaml() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(buildYaml(card));
    copyState = 'copied';
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => (copyState = 'idle'), 1800);
  }

  function reviewedCount(): number {
    return Object.values(edits).filter(
      (e) =>
        e.approved !== undefined ||
        e.archived !== undefined ||
        e.tags !== undefined ||
        (e.feedback && e.feedback.trim().length > 0),
    ).length;
  }

  function feedbackCount(): number {
    return Object.values(edits).filter((e) => e.feedback && e.feedback.trim().length > 0).length;
  }

  function buildIssueBody(): string {
    const today = new Date().toISOString().slice(0, 10);
    const lines: string[] = [];
    lines.push(`# Review feedback — ${today}`);
    lines.push('');
    lines.push(
      `Submitted via the \`/review\` interface. ${reviewedCount()} of ${cards.length} cards have edits or feedback.`,
    );
    lines.push('');

    // Edits summary table — only cards that have any edit
    const editedCards = cards.filter((c) => {
      const e = edits[c.id];
      if (!e) return false;
      return (
        e.approved !== undefined ||
        e.archived !== undefined ||
        e.featured !== undefined ||
        e.tags !== undefined
      );
    });
    if (editedCards.length > 0) {
      lines.push('## Status edits');
      lines.push('');
      lines.push('| Card | Approve | Feature | Archive | Tags changed |');
      lines.push('|---|---|---|---|---|');
      for (const c of editedCards) {
        const e = edits[c.id]!;
        const approved = e.approved ?? c.approved ?? false;
        const featured = e.featured ?? c.featured ?? false;
        const archived = e.archived ?? c.archived ?? false;
        const tagsChanged = e.tags !== undefined ? 'yes' : '';
        lines.push(
          `| \`${c.id}\` | ${approved ? '✓' : ''} | ${featured ? '★' : ''} | ${archived ? '✕' : ''} | ${tagsChanged} |`,
        );
      }
      lines.push('');
    }

    // Tag changes detail
    const tagChanges = cards.filter((c) => edits[c.id]?.tags !== undefined);
    if (tagChanges.length > 0) {
      lines.push('## Tag changes');
      lines.push('');
      for (const c of tagChanges) {
        const before = (c.tags ?? []).join(', ') || '(none)';
        const after = (edits[c.id]?.tags ?? []).join(', ') || '(none)';
        lines.push(`- \`${c.id}\`: ${before} → ${after}`);
      }
      lines.push('');
    }

    // Per-card feedback
    const cardsWithFeedback = cards.filter(
      (c) => (edits[c.id]?.feedback ?? '').trim().length > 0,
    );
    if (cardsWithFeedback.length > 0) {
      lines.push('## Per-card feedback');
      lines.push('');
      for (const c of cardsWithFeedback) {
        lines.push(`### \`${c.id}\` — ${c.title}`);
        lines.push('');
        const text = edits[c.id]!.feedback!.trim();
        for (const line of text.split('\n')) {
          lines.push(`> ${line}`);
        }
        lines.push('');
      }
    }

    if (editedCards.length === 0 && cardsWithFeedback.length === 0) {
      lines.push('_No edits or feedback recorded — submitted as a "no changes" review._');
    } else {
      lines.push('---');
      lines.push('');
      lines.push(
        '_When ready, ask Claude Code to address: `gh issue list --label review-feedback --state open` and walk through each item._',
      );
    }

    return lines.join('\n');
  }

  let submitState = $state<'idle' | 'opened' | 'copied' | 'error'>('idle');
  let submitMessage = $state<string>('');
  let submitTimer: ReturnType<typeof setTimeout> | undefined;

  async function submitReview() {
    const today = new Date().toISOString().slice(0, 10);
    const title = `Card review feedback — ${today}`;
    const body = buildIssueBody();
    const baseUrl = `https://github.com/${REPO}/issues/new`;

    // Try the prefilled URL first.
    const params = new URLSearchParams({
      title,
      body,
      labels: 'review-feedback',
    });
    const fullUrl = `${baseUrl}?${params.toString()}`;

    if (fullUrl.length <= SAFE_URL_LENGTH) {
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
      submitState = 'opened';
      submitMessage = 'GitHub issue page opened with your review prefilled. Click Submit on GitHub to create the issue.';
    } else {
      // Body too long for a safe prefill URL. Copy to clipboard and open
      // with title-only; reviewer pastes the body into the issue body.
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(body);
        }
        const fallbackParams = new URLSearchParams({
          title,
          body: '<!-- Review feedback was copied to your clipboard — paste here -->',
          labels: 'review-feedback',
        });
        window.open(`${baseUrl}?${fallbackParams.toString()}`, '_blank', 'noopener,noreferrer');
        submitState = 'copied';
        submitMessage = 'Review body was too long for a single URL — copied to clipboard. Paste it into the issue body on GitHub.';
      } catch {
        submitState = 'error';
        submitMessage = 'Could not copy to clipboard. Open DevTools → Console, run `copy(window.__lastReviewBody)` to grab it manually.';
        (window as unknown as { __lastReviewBody?: string }).__lastReviewBody = body;
      }
    }

    if (submitTimer) clearTimeout(submitTimer);
    submitTimer = setTimeout(() => {
      submitState = 'idle';
      submitMessage = '';
    }, 8000);
  }

  function clearFeedback() {
    if (!card) return;
    edits[card.id] = { ...getEdit(card.id), feedback: undefined };
  }

  function setFeedback(text: string) {
    edits[card.id] = { ...getEdit(card.id), feedback: text };
  }

  function jump(delta: number) {
    index = (index + delta + cards.length) % cards.length;
  }

  // Approximate the orbital "foreground" position for the collapsed view
  // so the side-by-side comparison shows the card as it would actually
  // render to a user.
  const collapsedPosition: ScramblerPosition = {
    x: 0,
    y: 0,
    z: 0.05,
    scale: 0.95,
    opacity: 1,
    blur: 0,
  };
  const expandedPosition: ScramblerPosition = {
    x: 0,
    y: 0,
    z: 0,
    scale: 1,
    opacity: 1,
    blur: 0,
  };

  const status = $derived.by(() => {
    const e = getEdit(card.id);
    const isApproved = e.approved ?? card.approved ?? false;
    const isArchived = e.archived ?? card.archived ?? false;
    const isFeatured = e.featured ?? card.featured ?? false;
    return { isApproved, isArchived, isFeatured };
  });
</script>

<div class="review-shell">
  <header class="review-header">
    <div class="review-nav">
      <button class="nav-btn" onclick={() => jump(-1)} aria-label="Previous card">←</button>
      <div class="card-meta">
        <span class="card-count">{index + 1} / {cards.length}</span>
        <span class="card-id"><code>{card.id}</code></span>
        <span class="card-type-pill">{card.type}</span>
      </div>
      <button class="nav-btn" onclick={() => jump(1)} aria-label="Next card">→</button>
    </div>
    <div class="review-status">
      <button
        class="status-btn"
        class:active={status.isApproved}
        onclick={toggleApproved}
        aria-pressed={status.isApproved}
      >
        {status.isApproved ? '✓ Approved' : 'Approve'}
      </button>
      <button
        class="status-btn"
        class:active={status.isFeatured}
        onclick={toggleFeatured}
        aria-pressed={status.isFeatured}
      >
        {status.isFeatured ? '★ Featured' : 'Feature'}
      </button>
      <button
        class="status-btn danger"
        class:active={status.isArchived}
        onclick={toggleArchived}
        aria-pressed={status.isArchived}
      >
        {status.isArchived ? '✕ Archived' : 'Archive'}
      </button>
      <span class="reviewed-count">
        {reviewedCount()} edited{feedbackCount() > 0 ? ` · ${feedbackCount()} with notes` : ''}
      </span>
      <button class="reset-btn" onclick={resetAllEdits} title="Clear all review edits + feedback (with confirmation)">
        Reset
      </button>
      <button class="submit-btn" onclick={submitReview}>
        Submit review →
      </button>
    </div>
    {#if submitState !== 'idle'}
      <p
        class="submit-status"
        class:error={submitState === 'error'}
        role="status"
        aria-live="polite"
      >
        {submitMessage}
      </p>
    {/if}
  </header>

  <section class="review-tags">
    <h3>Tags</h3>
    <ul class="tag-list" aria-label="Tags on this card">
      {#each getTags(card) as tag}
        <li class="tag-pill">
          <span>{tag}</span>
          <button
            class="tag-remove"
            onclick={() => removeTag(tag)}
            aria-label={`Remove tag ${tag}`}
          >×</button>
        </li>
      {/each}
    </ul>
    <form
      class="tag-add"
      onsubmit={(e) => {
        e.preventDefault();
        addTag();
      }}
    >
      <input
        type="text"
        placeholder="Add a tag…"
        bind:value={newTagInput}
        aria-label="New tag name"
      />
      <button type="submit">+ Add</button>
    </form>
  </section>

  <section class="review-grid">
    <article class="review-pane">
      <h2>Collapsed</h2>
      <div class="card-frame">
        {#key card.id}
          <ScramblerCard_ card={card} position={collapsedPosition} previewMode={true} />
        {/key}
      </div>
    </article>
    <article class="review-pane">
      <h2>Expanded</h2>
      <div class="card-frame card-frame-expanded">
        {#key card.id}
          <ScramblerCard_ card={card} position={expandedPosition} initialExpanded={true} previewMode={true} />
        {/key}
      </div>
    </article>
  </section>

  <section class="review-feedback">
    <header class="feedback-header">
      <h3>Feedback for this card <span class="feedback-hint">(included in the GitHub issue when you Submit Review)</span></h3>
      {#if (getEdit(card.id).feedback ?? '').length > 0}
        <button class="clear-btn" onclick={clearFeedback}>Clear</button>
      {/if}
    </header>
    <textarea
      class="feedback-textarea"
      rows="3"
      placeholder="Anything to flag about this card — wording, image, tags, ordering, missing context. Plain text."
      value={getEdit(card.id).feedback ?? ''}
      oninput={(e) => setFeedback((e.target as HTMLTextAreaElement).value)}
      aria-label="Feedback note for this card"
    ></textarea>
  </section>

  <section class="review-yaml">
    <header class="yaml-header">
      <h3>YAML output for <code>src/content/cards/{card.id}.yaml</code></h3>
      <button class="copy-btn" onclick={copyYaml}>
        {copyState === 'copied' ? '✓ Copied' : 'Copy YAML'}
      </button>
    </header>
    <pre class="yaml-block"><code>{buildYaml(card)}</code></pre>
  </section>
</div>

<style>
  .review-shell {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 1.5rem;
    font-family: var(--font-sans, system-ui);
    color: var(--color-text-primary);
    background: var(--color-canvas);
    min-height: 100vh;
  }
  .review-header {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--color-border);
  }
  .review-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .nav-btn {
    width: 2.4rem;
    height: 2.4rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-surface);
    cursor: pointer;
    font-size: 1.1rem;
  }
  .nav-btn:hover {
    background: var(--color-canvas-light);
  }
  .card-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    justify-content: center;
  }
  .card-count {
    font-family: var(--font-mono);
    color: var(--color-text-secondary);
    font-size: 0.875rem;
  }
  .card-id code {
    font-family: var(--font-mono);
    font-size: 1rem;
    background: var(--color-canvas-light);
    padding: 0.15rem 0.45rem;
    border-radius: 0.4rem;
  }
  .card-type-pill {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: var(--color-accent-blue);
    color: white;
    padding: 0.2rem 0.5rem;
    border-radius: 0.3rem;
  }
  .review-status {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .status-btn {
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    border-radius: 0.4rem;
    padding: 0.4rem 0.8rem;
    cursor: pointer;
    font-size: 0.85rem;
  }
  .status-btn:hover {
    background: var(--color-canvas-light);
  }
  .status-btn.active {
    background: oklch(0.78 0.12 145);
    border-color: oklch(0.65 0.16 145);
    color: oklch(0.20 0.05 145);
  }
  .status-btn.danger.active {
    background: oklch(0.78 0.12 25);
    border-color: oklch(0.65 0.16 25);
    color: oklch(0.20 0.05 25);
  }
  .reviewed-count {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    margin-left: auto;
  }
  .reset-btn {
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    border-radius: 0.4rem;
    padding: 0.5rem 0.8rem;
    cursor: pointer;
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }
  .reset-btn:hover {
    color: oklch(0.55 0.18 25);
    border-color: oklch(0.55 0.18 25);
  }
  .submit-btn {
    border: 1px solid oklch(0.55 0.16 145);
    background: oklch(0.78 0.12 145);
    color: oklch(0.18 0.05 145);
    border-radius: 0.4rem;
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 600;
    transition: transform var(--duration-fast) ease, background var(--duration-fast) ease;
  }
  .submit-btn:hover {
    background: oklch(0.82 0.14 145);
    transform: translateY(-1px);
  }
  .submit-btn:active {
    transform: translateY(0);
  }
  .submit-status {
    margin: 0.5rem 0 0;
    padding: 0.5rem 0.8rem;
    background: oklch(0.95 0.04 145);
    border: 1px solid oklch(0.65 0.10 145);
    border-radius: 0.4rem;
    font-size: 0.85rem;
    color: oklch(0.30 0.10 145);
  }
  .submit-status.error {
    background: oklch(0.95 0.04 25);
    border-color: oklch(0.65 0.16 25);
    color: oklch(0.30 0.16 25);
  }
  .review-feedback {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .feedback-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
  }
  .feedback-header h3 {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    margin: 0;
    font-weight: 500;
  }
  .feedback-hint {
    font-weight: 400;
    color: var(--color-text-muted);
    font-size: 0.78rem;
    font-style: italic;
  }
  .clear-btn {
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 0.4rem;
    padding: 0.25rem 0.6rem;
    font-size: 0.75rem;
    cursor: pointer;
    color: var(--color-text-muted);
  }
  .clear-btn:hover {
    color: oklch(0.55 0.18 25);
    border-color: oklch(0.55 0.18 25);
  }
  .feedback-textarea {
    width: 100%;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    padding: 0.6rem 0.8rem;
    font: inherit;
    font-size: 0.9rem;
    line-height: 1.5;
    background: var(--color-surface);
    color: var(--color-text-primary);
    resize: vertical;
    min-height: 4rem;
    box-sizing: border-box;
  }
  .feedback-textarea:focus {
    outline: 2px solid var(--color-accent-blue);
    outline-offset: 1px;
  }
  .review-tags {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: var(--color-canvas-light);
    border-radius: 0.5rem;
  }
  .review-tags h3 {
    margin: 0;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
  }
  .tag-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .tag-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.6rem;
    padding: 0.2rem 0.55rem;
    font-size: 0.8rem;
    font-family: var(--font-mono);
  }
  .tag-remove {
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    padding: 0;
  }
  .tag-remove:hover {
    color: oklch(0.55 0.18 25);
  }
  .tag-add {
    display: flex;
    gap: 0.4rem;
    margin-top: 0.25rem;
  }
  .tag-add input {
    flex: 1;
    padding: 0.35rem 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: 0.4rem;
    font: inherit;
    font-size: 0.85rem;
  }
  .tag-add button {
    padding: 0.35rem 0.8rem;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    border-radius: 0.4rem;
    cursor: pointer;
    font-size: 0.85rem;
  }
  .review-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }
  .review-pane h2 {
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
    margin: 0 0 0.75rem;
  }
  .card-frame {
    position: relative;
    background: var(--color-canvas);
    padding: 1rem;
    min-height: 22rem;
    border-radius: 0.6rem;
    border: 1px dashed var(--color-border);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .card-frame-expanded {
    min-height: 38rem;
  }
  .review-yaml {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .yaml-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }
  .yaml-header h3 {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    margin: 0;
    font-weight: 500;
  }
  .yaml-header code {
    font-family: var(--font-mono);
    color: var(--color-text-primary);
  }
  .copy-btn {
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    border-radius: 0.4rem;
    padding: 0.4rem 0.9rem;
    cursor: pointer;
    font-size: 0.85rem;
  }
  .copy-btn:hover {
    background: var(--color-canvas-light);
  }
  .yaml-block {
    background: oklch(0.18 0.01 155);
    color: oklch(0.92 0.005 155);
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    line-height: 1.5;
    margin: 0;
  }
  @media (max-width: 920px) {
    .review-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
