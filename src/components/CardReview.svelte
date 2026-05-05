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

  // Per-card local edits — keyed by card id so flipping cards keeps
  // your edits intact. Reviewer copies the YAML output to clipboard
  // and pastes into the file.
  let edits = $state<Record<string, {
    tags?: string[];
    approved?: boolean;
    archived?: boolean;
    featured?: boolean;
  }>>({});

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
      (e) => e.approved !== undefined || e.archived !== undefined || e.tags !== undefined,
    ).length;
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
      <span class="reviewed-count">{reviewedCount()} edited</span>
    </div>
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
          <ScramblerCard_ card={card} position={collapsedPosition} />
        {/key}
      </div>
    </article>
    <article class="review-pane">
      <h2>Expanded</h2>
      <div class="card-frame card-frame-expanded">
        {#key card.id}
          <ScramblerCard_ card={card} position={expandedPosition} initialExpanded={true} />
        {/key}
      </div>
    </article>
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
