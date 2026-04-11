<script lang="ts">
  interface Props {
    name: string;
    value: string;
    label?: string;
  }

  let { name, value, label }: Props = $props();
</script>

<div class="swatch">
  <div class="swatch-color" style:background={value}></div>
  <div class="swatch-info">
    <code class="swatch-name">{name}</code>
    {#if label}
      <span class="swatch-label">{label}</span>
    {/if}
  </div>
</div>

<style>
  .swatch {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .swatch-color {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 0.5rem;
    border: 1px solid var(--color-border);
  }
  .swatch-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }
  .swatch-name {
    font-size: 0.75rem;
    font-family: var(--font-mono);
    color: var(--color-text-secondary);
  }
  .swatch-label {
    font-size: 0.675rem;
    color: var(--color-text-muted);
  }
</style>
