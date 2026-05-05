import type { z } from 'zod';

/**
 * Where the visual glow indicator anchors when this tool is in flight.
 * Maps to a specific control on the Scrambler chrome:
 *   - 'knob-see-work'  → green pad (See Work cluster)
 *   - 'knob-gtk'       → amber pad (Get to Know cluster)
 *   - 'knob-contact'   → neutral pad (action happens WITHOUT flyout opening)
 *   - 'knob-dial'      → central dial
 *   - 'avatar'         → halftone portrait
 *   - null             → no glow (silent / structural tool)
 */
export type ToolGlowTarget =
  | 'knob-see-work'
  | 'knob-gtk'
  | 'knob-contact'
  | 'knob-dial'
  | 'avatar'
  | null;

export type ToolErrorCode =
  | 'INVALID_PARAMS' // schema validation failed
  | 'NOT_FOUND' // requested entity doesn't exist
  | 'TIMEOUT'
  | 'RETRY_EXHAUSTED'
  | 'NON_RETRYABLE' // error is structurally guaranteed to repeat (e.g., 4xx)
  | 'UNAVAILABLE' // browser API missing (e.g., navigator.share)
  | 'BLOCKED' // user denied / privacy preference forbids
  | 'INTERNAL';

export interface ToolError {
  code: ToolErrorCode;
  message: string;
  /** True if a retry might succeed; false if the error is structurally permanent. */
  retryable: boolean;
}

export type ToolResult<T> =
  | { success: true; data: T }
  | { success: false; error: ToolError };

export interface ToolDefinition<TParams = unknown, TResult = unknown> {
  name: string;
  description: string;
  /** Zod schema validating the params object. Pass z.object({}) for no-param tools. */
  paramsSchema: z.ZodType<TParams>;
  /** Zod schema validating the success result.data. */
  resultSchema: z.ZodType<TResult>;
  glowTarget: ToolGlowTarget;
  /** Per-tool timeout in ms. Default 5000. */
  timeoutMs?: number;
  /** Whether the reliability wrapper should attempt up to 2 retries. Default true. */
  retry?: boolean;
  /** Implementation. Always returns a ToolResult; never throws. */
  handler: (params: TParams) => Promise<ToolResult<TResult>>;
}
