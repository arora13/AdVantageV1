import type { AgentRunner } from "../types";

export interface KalibrRunResult<T> {
  data: T;
  attempts: number;
  recovered: boolean;
}

/**
 * Kalibr-inspired orchestration layer — wraps each agent with automatic
 * failure detection and recovery (retry + degraded fallback).
 */
export async function kalibrRunAgent<T>(
  agentName: string,
  fn: () => Promise<T>,
  fallback: () => Promise<T>,
  onLine: (line: string) => Promise<void>,
  maxAttempts = 2,
): Promise<KalibrRunResult<T>> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1) {
        await onLine(
          `Kalibr recovery: retrying ${agentName} (attempt ${attempt}/${maxAttempts})…`,
        );
      }
      const data = await fn();
      return { data, attempts: attempt, recovered: attempt > 1 };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      await onLine(
        `Kalibr detected failure in ${agentName}: ${lastError.message}`,
      );
    }
  }

  await onLine(
    `Kalibr fallback: ${agentName} using degraded mode after ${maxAttempts} attempts`,
  );
  return { data: await fallback(), attempts: maxAttempts, recovered: true };
}

export function wrapAgentWithKalibr(
  name: string,
  runner: AgentRunner,
  fallback: AgentRunner,
): AgentRunner {
  return async (ctx, onLine) => {
    const result = await kalibrRunAgent(
      name,
      () => runner(ctx, onLine),
      () => fallback(ctx, onLine),
      onLine,
    );
    if (result.recovered) {
      await onLine(`Kalibr orchestration recovered ${name} successfully`);
    }
    return result.data;
  };
}
