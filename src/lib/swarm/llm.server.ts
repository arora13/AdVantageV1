import {
  hasAiBackend,
  isAnthropicConfigured,
  isTokenRouterConfigured,
} from "@/lib/ai-config.server";
import {
  getTokenRouterApiKey,
  getTokenRouterBaseUrl,
  getTokenRouterModel,
} from "@/lib/tokenrouter.server";

export { isAnthropicConfigured };

async function anthropicChat(
  system: string,
  user: string,
  maxTokens: number,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = data.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new Error("Empty Anthropic response");
  return text.trim();
}

async function tokenRouterChat(
  system: string,
  user: string,
  maxTokens: number,
): Promise<string> {
  const apiKey = getTokenRouterApiKey();
  if (!apiKey) throw new Error("TokenRouter API key not set");

  const base = getTokenRouterBaseUrl();
  const model = getTokenRouterModel();

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: maxTokens,
      temperature: 0.35,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TokenRouter error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty TokenRouter response");
  return text.trim();
}

async function complete(
  system: string,
  user: string,
  maxTokens: number,
  onLine?: (line: string) => Promise<void>,
): Promise<string> {
  if (!hasAiBackend()) {
    throw new Error("No AI backend configured");
  }

  if (isAnthropicConfigured()) {
    await onLine?.("Claude (Anthropic): reasoning on your pitch…");
    return anthropicChat(system, user, maxTokens);
  }

  if (isTokenRouterConfigured()) {
    await onLine?.(`Claude via TokenRouter (${getTokenRouterModel()})…`);
    return tokenRouterChat(system, user, maxTokens);
  }

  throw new Error("No AI backend configured. Set ANTHROPIC_API_KEY (TokenRouter sk-… or Anthropic sk-ant-…).");
}

function parseJson<T>(raw: string): T {
  const jsonStart = raw.indexOf("{");
  const jsonArrStart = raw.indexOf("[");
  const start =
    jsonStart === -1
      ? jsonArrStart
      : jsonArrStart === -1
        ? jsonStart
        : Math.min(jsonStart, jsonArrStart);
  const slice = start >= 0 ? raw.slice(start) : raw;

  try {
    return JSON.parse(slice) as T;
  } catch {
    const end = Math.max(slice.lastIndexOf("}"), slice.lastIndexOf("]"));
    if (end > 0) return JSON.parse(slice.slice(0, end + 1)) as T;
    throw new Error("Failed to parse agent JSON response");
  }
}

export async function chatJson<T>(
  system: string,
  user: string,
  onLine?: (line: string) => Promise<void>,
  maxTokens = 4096,
): Promise<T> {
  const response = await complete(
    system + "\n\nRespond with valid JSON only. No markdown fences, no commentary.",
    user,
    maxTokens,
    onLine,
  );
  return parseJson<T>(response);
}

export async function chatText(
  system: string,
  user: string,
  onLine?: (line: string) => Promise<void>,
): Promise<string> {
  return complete(system, user, 6000, onLine);
}

/** Smoke-test AI credentials (Anthropic direct or TokenRouter). */
export async function verifyAiConnection(): Promise<{
  ok: boolean;
  message: string;
  model?: string;
  provider?: string;
}> {
  if (isAnthropicConfigured()) {
    try {
      const text = await anthropicChat(
        "You are a health check. Reply with exactly the word ok.",
        "ping",
        32,
      );
      const ok = /ok/i.test(text);
      return {
        ok,
        provider: "anthropic",
        message: ok ? "Anthropic API responded successfully." : `Unexpected: ${text.slice(0, 80)}`,
        model: "claude-sonnet-4-20250514",
      };
    } catch (err) {
      return {
        ok: false,
        provider: "anthropic",
        message: err instanceof Error ? err.message : "Anthropic API request failed",
      };
    }
  }

  if (isTokenRouterConfigured()) {
    try {
      const text = await tokenRouterChat(
        "You are a health check. Reply with exactly the word ok.",
        "ping",
        32,
      );
      const ok = /ok/i.test(text);
      return {
        ok,
        provider: "tokenrouter",
        message: ok ? "TokenRouter API responded successfully." : `Unexpected: ${text.slice(0, 80)}`,
        model: getTokenRouterModel(),
      };
    } catch (err) {
      return {
        ok: false,
        provider: "tokenrouter",
        message: err instanceof Error ? err.message : "TokenRouter API request failed",
      };
    }
  }

  return { ok: false, message: "No AI API key configured." };
}

export async function verifyAnthropicConnection() {
  return verifyAiConnection();
}
