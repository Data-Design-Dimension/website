<script lang="ts">
  /**
   * Lazy-loaded Mermaid renderer. The mermaid bundle is ~600KB so we
   * only import it on mount, not at the top of the module — keeps the
   * route's initial JS lean and only pays the cost when this component
   * is actually shown.
   */
  interface Props {
    /** Raw Mermaid source. Use a `graph LR` / `graph TB` etc. */
    source: string;
    /** Optional id; auto-generated if omitted. */
    id?: string;
  }

  let { source, id }: Props = $props();

  let containerEl: HTMLDivElement | undefined = $state();
  let svgMarkup = $state<string | null>(null);
  let renderError = $state<string | null>(null);

  $effect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict', // sanitize HTML in nodes
          theme: 'base',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        });
        const renderId = id ?? `mermaid-${Math.random().toString(36).slice(2, 10)}`;
        const result = await mermaid.render(renderId, source);
        if (cancelled) return;
        svgMarkup = result.svg;
      } catch (err) {
        if (cancelled) return;
        renderError = err instanceof Error ? err.message : String(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  });
</script>

<div class="mermaid-host" bind:this={containerEl} role="img" aria-label="System architecture diagram">
  {#if svgMarkup}
    <!-- mermaid-rendered SVG; sanitized via securityLevel: strict above -->
    {@html svgMarkup}
  {:else if renderError}
    <pre class="mermaid-error">Failed to render diagram: {renderError}</pre>
  {:else}
    <p class="mermaid-loading">Rendering diagram…</p>
  {/if}
</div>

<style>
  .mermaid-host {
    display: flex;
    justify-content: center;
    width: 100%;
    overflow-x: auto;
    padding: 1rem 0;
  }
  .mermaid-host :global(svg) {
    max-width: 100%;
    height: auto;
  }
  .mermaid-loading {
    color: var(--color-text-muted);
    font-style: italic;
  }
  .mermaid-error {
    background: oklch(0.95 0.04 25);
    color: oklch(0.30 0.16 25);
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    font-family: var(--font-mono);
    font-size: 0.85rem;
    white-space: pre-wrap;
  }
</style>
