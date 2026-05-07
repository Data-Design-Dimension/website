import { describe, it, expect, vi } from 'vitest';

/**
 * Param-schema sanity checks on the registered WebMCP tools.
 * Catches regressions where a schema is loosened by accident.
 *
 * The registry imports state.svelte.ts which uses Svelte 5 runes
 * ($state) at module scope — runes are a Svelte compiler construct
 * and can't run under raw Vitest. Stub the state module so the
 * registry import resolves with no-op privacy-pref helpers.
 */
vi.mock('../../src/lib/webmcp/state.svelte', () => ({
  toolInFlight: { value: null },
  setToolInFlight: () => {},
  clearToolInFlight: () => {},
  readPrivacyPreferences: () => ({ analytics: false, agentStorage: false, agentDiscovery: true }),
  writePrivacyPreferences: (p: Record<string, unknown>) => ({
    analytics: false,
    agentStorage: false,
    agentDiscovery: true,
    ...p,
  }),
}));

const { tools } = await import('../../src/lib/webmcp/registry');

function getTool(name: string) {
  const tool = tools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool not found: ${name}`);
  return tool;
}

describe('WebMCP tool param schemas', () => {
  it('getCard rejects empty id', () => {
    const tool = getTool('getCard');
    const result = tool.paramsSchema.safeParse({ id: '' });
    expect(result.success).toBe(false);
  });

  it('getCard accepts a normal id string', () => {
    const tool = getTool('getCard');
    const result = tool.paramsSchema.safeParse({ id: 'sustain-our-soil' });
    expect(result.success).toBe(true);
  });

  it('searchCards rejects an oversize query (>200 chars)', () => {
    const tool = getTool('searchCards');
    const oversize = 'a'.repeat(201);
    const result = tool.paramsSchema.safeParse({ query: oversize });
    expect(result.success).toBe(false);
  });

  it('searchCards accepts an empty params object (all fields optional)', () => {
    const tool = getTool('searchCards');
    const result = tool.paramsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('every registered tool has a non-empty name and description', () => {
    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.description.length).toBeGreaterThan(20);
    }
  });
});
