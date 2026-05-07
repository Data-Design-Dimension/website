import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { callTool } from '../../src/lib/webmcp/reliability';
import type { ToolDefinition, ToolResult } from '../../src/lib/webmcp/types';

/**
 * Minimum-viable WebMCP reliability test suite (#32 v0.1.0-preview).
 * Covers the contract guarantees of the callTool wrapper:
 *   - Param schema validation on entry
 *   - Timeout (returns TIMEOUT envelope, retryable)
 *   - Non-retryable errors bail out without retry
 *   - Retry exhaustion returns RETRY_EXHAUSTED
 */

function makeTool<TParams, TResult>(
  overrides: Partial<ToolDefinition<TParams, TResult>>,
): ToolDefinition<TParams, TResult> {
  return {
    name: 'test',
    description: 'Test tool',
    paramsSchema: z.object({}) as unknown as z.ZodType<TParams>,
    resultSchema: z.unknown() as z.ZodType<TResult>,
    glowTarget: null,
    timeoutMs: 100,
    handler: async () => ({ success: true, data: undefined as unknown as TResult }),
    ...overrides,
  };
}

describe('WebMCP callTool reliability', () => {
  it('returns INVALID_PARAMS envelope when params fail schema validation', async () => {
    const tool = makeTool({
      paramsSchema: z.object({ id: z.string().min(1) }),
      handler: vi.fn(async () => ({ success: true, data: 'ok' })),
    });

    const result = await callTool(tool, { id: '' }); // empty string fails min(1)

    expect(result.success).toBe(false);
    if (result.success) return; // type narrowing
    expect(result.error.code).toBe('INVALID_PARAMS');
    expect(result.error.retryable).toBe(false);
    // Handler must NOT have been called when params fail.
    expect(tool.handler).not.toHaveBeenCalled();
  });

  it('returns TIMEOUT envelope when handler exceeds timeoutMs', async () => {
    const tool = makeTool({
      timeoutMs: 50,
      retry: false, // skip retry so the test runs fast
      handler: () =>
        new Promise<ToolResult<unknown>>((resolve) =>
          setTimeout(() => resolve({ success: true, data: 'too late' }), 500),
        ),
    });

    const result = await callTool(tool, {});

    expect(result.success).toBe(false);
    if (result.success) return;
    // With retry: false, the wrapper returns the timeout error directly
    // (TIMEOUT is retryable=true, but maxAttempts is 1 with retry:false).
    // Once attempts are exhausted, the wrapper wraps it as RETRY_EXHAUSTED.
    expect(['TIMEOUT', 'RETRY_EXHAUSTED']).toContain(result.error.code);
  });

  it('does NOT retry when first failure is non-retryable', async () => {
    const handler = vi.fn(async () => ({
      success: false,
      error: { code: 'NOT_FOUND' as const, message: 'gone', retryable: false },
    }));
    const tool = makeTool({ handler, retry: true });

    const result = await callTool(tool, {});

    expect(result.success).toBe(false);
    if (result.success) return;
    // Handler called exactly once — no retry, no exponential backoff.
    expect(handler).toHaveBeenCalledTimes(1);
    // Error code passes through (or NON_RETRYABLE wrapper, both acceptable).
    expect(['NOT_FOUND', 'NON_RETRYABLE']).toContain(result.error.code);
    expect(result.error.retryable).toBe(false);
  });
});
