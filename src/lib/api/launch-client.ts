import type { LaunchResult } from "@/lib/launch-data";
import type { LaunchProgress } from "@/lib/gtm/types";

export type LaunchPayload = {
  productDescription: string;
  productName?: string;
  repoUrl?: string | null;
  launchGoal?: "waitlist" | "beta" | "paid";
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
        ? "Server error — restart dev server and try again"
        : text.slice(0, 200) || `Request failed (${res.status})`,
    );
  }
  const data = JSON.parse(text) as T & { error?: unknown };
  if (!res.ok) {
    const err = data.error;
    if (typeof err === "string") throw new Error(err);
    if (err && typeof err === "object") {
      const flat = err as Record<string, string[] | string | undefined>;
      const parts = Object.entries(flat).flatMap(([k, v]) =>
        Array.isArray(v) ? v.map((m) => `${k}: ${m}`) : v ? [`${k}: ${v}`] : [],
      );
      if (parts.length) throw new Error(parts.join(" · "));
    }
    throw new Error(`Request failed (${res.status})`);
  }
  return data;
}

export async function apiStartLaunch(payload: LaunchPayload): Promise<{ launchId: string }> {
  return postJson("/api/launch/start", payload);
}

export async function apiPollLaunchProgress(launchId: string): Promise<LaunchProgress> {
  return postJson("/api/launch/progress", { launchId });
}

export async function apiFetchLaunchResult(launchId: string): Promise<LaunchResult> {
  return postJson("/api/launch/result", { launchId });
}

export async function apiApproveLaunch(launchId: string): Promise<LaunchResult> {
  return postJson("/api/launch/approve", { launchId });
}
