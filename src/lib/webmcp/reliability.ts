import type { ToolDefinition, ToolError, ToolResult } from './types';

/**
 * Reliability wrapper for tool handlers. Provides:
 *   - Param schema validation on entry
 *   - Per-tool timeout (rejects with TIMEOUT)
 *   - Up to 2 retries with exponential backoff (200ms, 600ms)
 *   - Skip retry if first failure is non-retryable (e.g., INVALID_PARAMS)
 *   - Result schema validation on exit
 *   - Always returns ToolResult; never throws
 */
export async function callTool<TParams, TResult>(
  tool: ToolDefinition<TParams, TResult>,
  rawParams: unknown,
): Promise<ToolResult<TResult>> {
  const parsed = tool.paramsSchema.safeParse(rawParams ?? {});
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: 'INVALID_PARAMS',
        message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
        retryable: false,
      },
    };
  }

  const params = parsed.data;
  const timeoutMs = tool.timeoutMs ?? 5000;
  const allowRetry = tool.retry !== false;
  const maxAttempts = allowRetry ? 3 : 1;

  let lastError: ToolError = {
    code: 'INTERNAL',
    message: 'No attempts made',
    retryable: false,
  };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 200ms, 600ms.
      await sleep(200 * 3 ** (attempt - 1));
    }

    const result = await runWithTimeout(tool.handler(params), timeoutMs);

    if (result.success) {
      const validated = tool.resultSchema.safeParse(result.data);
      if (!validated.success) {
        return {
          success: false,
          error: {
            code: 'INTERNAL',
            message: `Result schema validation failed: ${validated.error.issues
              .map((i) => `${i.path.join('.')}: ${i.message}`)
              .join('; ')}`,
            retryable: false,
          },
        };
      }
      return { success: true, data: validated.data };
    }

    lastError = result.error;
    if (!result.error.retryable) {
      // Structurally permanent — don't waste a retry.
      return {
        success: false,
        error: {
          ...result.error,
          code: result.error.code === 'INVALID_PARAMS' ? 'INVALID_PARAMS' : 'NON_RETRYABLE',
        },
      };
    }
  }

  return {
    success: false,
    error: {
      code: 'RETRY_EXHAUSTED',
      message: `${maxAttempts} attempt(s) failed; last error: ${lastError.message}`,
      retryable: false,
    },
  };
}

async function runWithTimeout<T>(
  promise: Promise<ToolResult<T>>,
  ms: number,
): Promise<ToolResult<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<ToolResult<T>>((resolve) => {
        timer = setTimeout(
          () =>
            resolve({
              success: false,
              error: {
                code: 'TIMEOUT',
                message: `Tool exceeded ${ms}ms`,
                retryable: true,
              },
            }),
          ms,
        );
      }),
    ]);
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'INTERNAL',
        message: err instanceof Error ? err.message : String(err),
        retryable: true,
      },
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
