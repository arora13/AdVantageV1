import { loadEnv } from "vite";

/** Ensure .env is on process.env for all server handlers (SSR, API routes, server fns). */
export function ensureServerEnvLoaded(): void {
  const mode = process.env.NODE_ENV ?? "development";
  const root = process.cwd();
  Object.assign(process.env, loadEnv(mode, root, ""));
  Object.assign(process.env, loadEnv(mode, root, "VITE_"));
}

ensureServerEnvLoaded();
