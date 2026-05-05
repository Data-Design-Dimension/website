<script lang="ts">
  import type { ScramblerCard, ScramblerCluster } from '../lib/scrambler/types';
  import { tools, setSiteContent } from '../lib/webmcp/registry';
  import { callTool } from '../lib/webmcp/reliability';
  import { setToolInFlight, clearToolInFlight } from '../lib/webmcp/state.svelte';
  import type { ToolResult } from '../lib/webmcp/types';

  interface Props {
    cards: ScramblerCard[];
    clusters: ScramblerCluster[];
  }

  let { cards, clusters }: Props = $props();

  /**
   * Mount-time wiring:
   *  1. Hand the site content to the registry (handlers read from there).
   *  2. Wrap each tool with the reliability layer + glow state, so every
   *     call path goes through validation, timeout, retry, structured
   *     error, and the visual glow indicator.
   *  3. Register with navigator.modelContext when available; otherwise
   *     expose window.dadeda.callTool(name, params) as the canonical
   *     entry point for in-page agents and dev tooling.
   *  4. Listen for `webmcp:focus-card` events from focusCard() so the
   *     Scrambler can pick them up (loose coupling for v1).
   */
  $effect(() => {
    setSiteContent({ cards, clusters });

    const wrapped = tools.map((tool) => ({
      tool,
      run: async (rawParams: unknown): Promise<ToolResult<unknown>> => {
        setToolInFlight(tool.name, tool.glowTarget);
        try {
          return await callTool(tool, rawParams);
        } finally {
          clearToolInFlight();
        }
      },
    }));

    // navigator.modelContext is an emerging proposal; guard everything.
    const mc = (navigator as unknown as { modelContext?: { registerTool?: (def: unknown) => void } }).modelContext;
    if (mc?.registerTool) {
      for (const { tool, run } of wrapped) {
        try {
          mc.registerTool({
            name: tool.name,
            description: tool.description,
            handler: run,
          });
        } catch {
          // Implementation differences between browsers; ignore and rely on
          // the window.dadeda fallback below.
        }
      }
    }

    // Always expose a canonical entry point for in-page agents that reach
    // in directly (no shared state, no cross-tool leakage).
    const callTable: Record<string, (params: unknown) => Promise<ToolResult<unknown>>> = {};
    for (const { tool, run } of wrapped) {
      callTable[tool.name] = run;
    }
    (window as unknown as { dadeda?: unknown }).dadeda = {
      callTool: (name: string, params?: unknown) => {
        const fn = callTable[name];
        if (!fn) {
          return Promise.resolve({
            success: false,
            error: {
              code: 'NOT_FOUND' as const,
              message: `No tool named "${name}". Available: ${Object.keys(callTable).join(', ')}`,
              retryable: false,
            },
          });
        }
        return fn(params);
      },
      tools: tools.map((t) => ({ name: t.name, description: t.description, glowTarget: t.glowTarget })),
    };

    return () => {
      delete (window as unknown as { dadeda?: unknown }).dadeda;
    };
  });
</script>

<!--
  No DOM. The provider is a behavioral mount — it registers tools and
  manages the in-flight indicator. The glow itself renders inside the
  Knob and Avatar components which read $state directly.
-->
