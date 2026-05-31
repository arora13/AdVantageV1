import type { CaseResult } from "@/lib/verdict-data";

export type CasePayload = {
  situation: string;
  jurisdiction: string;
  mode: "client" | "lawyer";
  caseType?: string;
  kind?: "dispute" | "contract";
  fileName?: string | null;
  fileContent?: string | null;
};

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();

  if (!contentType.includes("application/json")) {
    throw new Error(
      text.startsWith("<!")
        ? "Server returned an HTML error page — restart the dev server and try again"
        : text.slice(0, 200) || `Request failed (${res.status})`,
    );
  }

  const data = JSON.parse(text) as T & { error?: unknown };
  if (!res.ok) {
    const msg =
      typeof data.error === "string"
        ? data.error
        : JSON.stringify(data.error ?? data);
    throw new Error(msg);
  }
  return data;
}

export async function apiStartCase(
  payload: CasePayload,
): Promise<{ caseId: string; result?: CaseResult }> {
  return postJson("/api/case/start", payload);
}

export async function apiQuickExplore(
  payload: CasePayload,
): Promise<{ caseId: string; result: CaseResult }> {
  return postJson("/api/case/quick", payload);
}

export async function apiFetchCaseResult(caseId: string): Promise<CaseResult> {
  return postJson("/api/case/result", { caseId });
}
