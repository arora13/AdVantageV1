import type { LaunchContent, LaunchResult } from "@/lib/launch-data";

export type PostState = "recommended" | "approved" | "dismissed" | "scheduled" | "posted";

export interface MarketingPost {
  id: string;
  platform: string;
  title: string;
  body: string;
  state: PostState;
  scheduledAt?: string;
  postedAt?: string;
}

export interface MarketingWorkspace {
  launchId: string;
  businessName: string;
  tagline: string;
  icp: string;
  summary: string;
  posts: MarketingPost[];
  result: LaunchResult;
  updatedAt: number;
}

const STORAGE_KEY = "advantage:marketing-workspace";

function isInstagram(platform: string): boolean {
  return /instagram|ig/i.test(platform);
}

export function initWorkspaceFromLaunch(launchId: string, result: LaunchResult): MarketingWorkspace {
  const posts: MarketingPost[] = result.content.map((c) => ({
    id: c.id,
    platform: c.platform,
    title: c.title,
    body: c.body,
    state: c.status === "approved" ? "approved" : "recommended",
  }));

  return {
    launchId,
    businessName: result.productName,
    tagline: result.tagline,
    icp: result.icp,
    summary: result.summary,
    posts,
    result,
    updatedAt: Date.now(),
  };
}

export function loadWorkspace(): MarketingWorkspace | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MarketingWorkspace;
  } catch {
    return null;
  }
}

export function saveWorkspace(workspace: MarketingWorkspace): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...workspace, updatedAt: Date.now() }),
  );
}

export function postsByState(posts: MarketingPost[], state: PostState): MarketingPost[] {
  return posts.filter((p) => p.state === state);
}

export function approvePost(workspace: MarketingWorkspace, postId: string): MarketingWorkspace {
  return {
    ...workspace,
    posts: workspace.posts.map((p) =>
      p.id === postId ? { ...p, state: "approved" as const } : p,
    ),
  };
}

export function dismissPost(workspace: MarketingWorkspace, postId: string): MarketingWorkspace {
  return {
    ...workspace,
    posts: workspace.posts.map((p) =>
      p.id === postId ? { ...p, state: "dismissed" as const } : p,
    ),
  };
}

export function schedulePost(
  workspace: MarketingWorkspace,
  postId: string,
  scheduledAt: string,
): MarketingWorkspace {
  return {
    ...workspace,
    posts: workspace.posts.map((p) =>
      p.id === postId ? { ...p, state: "scheduled" as const, scheduledAt } : p,
    ),
  };
}

export function markPosted(workspace: MarketingWorkspace, postId: string): MarketingWorkspace {
  return {
    ...workspace,
    posts: workspace.posts.map((p) =>
      p.id === postId
        ? { ...p, state: "posted" as const, postedAt: new Date().toISOString() }
        : p,
    ),
  };
}

export function updatePostBody(
  workspace: MarketingWorkspace,
  postId: string,
  body: string,
): MarketingWorkspace {
  return {
    ...workspace,
    posts: workspace.posts.map((p) => (p.id === postId ? { ...p, body } : p)),
    result: {
      ...workspace.result,
      content: workspace.result.content.map((c: LaunchContent) =>
        c.id === postId ? { ...c, body } : c,
      ),
    },
  };
}

export { isInstagram };
