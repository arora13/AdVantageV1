import { useCallback, useMemo, useState } from "react";
import type { LaunchResult } from "@/lib/launch-data";
import type { LaunchProgress } from "@/lib/gtm/types";
import {
  approvePost,
  dismissPost,
  initWorkspaceFromLaunch,
  isInstagram,
  loadWorkspace,
  markPosted,
  postsByState,
  saveWorkspace,
  schedulePost,
  updatePostBody,
  type MarketingPost,
  type MarketingWorkspace,
} from "@/lib/marketing-queue";
import {
  Calendar,
  Check,
  Code2,
  Copy,
  ExternalLink,
  Heart,
  Instagram,
  Megaphone,
  ThumbsDown,
  Send,
  Sparkles,
  Users,
  X,
} from "lucide-react";

interface MarketingDashboardProps {
  launchId: string;
  initialResult: LaunchResult;
  agentProgress?: LaunchProgress | null;
}

type BoardTab = "posts" | "contacts" | "plan" | "assets";

export function MarketingDashboard({ launchId, initialResult, agentProgress }: MarketingDashboardProps) {
  const [workspace, setWorkspace] = useState<MarketingWorkspace>(() => {
    const saved = loadWorkspace();
    if (saved?.launchId === launchId) return saved;
    const ws = initWorkspaceFromLaunch(launchId, initialResult);
    saveWorkspace(ws);
    return ws;
  });
  const [boardTab, setBoardTab] = useState<BoardTab>("posts");
  const [copied, setCopied] = useState<string | null>(null);
  const [postingId, setPostingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const igHandle = useMemo(() => {
    const slug = workspace.businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 24);
    return slug || "your_business";
  }, [workspace.businessName]);

  const persist = useCallback((next: MarketingWorkspace) => {
    setWorkspace(next);
    saveWorkspace(next);
  }, []);

  const recommended = useMemo(
    () => postsByState(workspace.posts, "recommended"),
    [workspace.posts],
  );
  const approved = useMemo(
    () =>
      workspace.posts.filter((p) =>
        ["approved", "scheduled"].includes(p.state),
      ),
    [workspace.posts],
  );
  const posted = useMemo(() => postsByState(workspace.posts, "posted"), [workspace.posts]);
  const dismissedCount = useMemo(
    () => postsByState(workspace.posts, "dismissed").length,
    [workspace.posts],
  );

  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleApprove = (id: string) => persist(approvePost(workspace, id));
  const handleDismiss = (id: string) => persist(dismissPost(workspace, id));

  const handleMarkDone = async (post: MarketingPost) => {
    setPostingId(post.id);
    await new Promise((r) => setTimeout(r, 400));
    persist(markPosted(workspace, post.id));
    setPostingId(null);
  };

  const handleSchedule = (post: MarketingPost) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    persist(schedulePost(workspace, post.id, tomorrow.toISOString()));
  };

  const startEdit = (post: MarketingPost) => {
    setEditingId(post.id);
    setEditDraft(post.body);
  };

  const saveEdit = (postId: string) => {
    persist(updatePostBody(workspace, postId, editDraft));
    setEditingId(null);
  };

  return (
    <div className="space-y-8">
      {/* Business header */}
      <div className="rounded-2xl border border-border/80 bg-zinc-950/50 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-emerald-400">
              <Sparkles size={12} /> Marketing dashboard
            </div>
            <h2 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
              {workspace.businessName}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{workspace.tagline}</p>
            <p className="mt-2 max-w-xl text-xs text-muted-foreground">
              Audience: {workspace.icp}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatPill label="Suggestions" value={recommended.length} accent />
            <StatPill label="Ready to publish" value={approved.length} />
            <StatPill label="Posted" value={posted.length} />
            {dismissedCount > 0 && (
              <StatPill label="Hidden" value={dismissedCount} muted />
            )}
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{workspace.summary}</p>
      </div>

      {agentProgress && (
        <section className="rounded-xl border border-border/70 bg-zinc-950/35 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs uppercase tracking-wider text-emerald-400">Agent run</div>
              <p className="mt-1 text-xs text-muted-foreground">
                This dashboard was generated by the completed launch pipeline.
              </p>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
              {agentProgress.agents.filter((agent) => agent.status === "complete").length} / {agentProgress.agents.length} complete
            </span>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-5">
            {agentProgress.agents.map((agent) => (
              <div key={agent.agentId} className="rounded-lg border border-border/60 bg-background/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium capitalize text-foreground">{agent.agentId}</span>
                  <span
                    className={`size-2 rounded-full ${
                      agent.status === "complete"
                        ? "bg-emerald-400"
                        : agent.status === "running"
                          ? "bg-amber-400"
                          : agent.status === "failed"
                            ? "bg-destructive"
                            : "bg-muted"
                    }`}
                  />
                </div>
                <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                  {agent.streamLines.at(-1) ?? agent.status}
                </p>
                {agent.sponsor && (
                  <div className="mt-2 text-[10px] text-emerald-400/80">{agent.sponsor}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Board tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        <BoardTabBtn active={boardTab === "posts"} onClick={() => setBoardTab("posts")} icon={Megaphone}>
          Posts & publishing
        </BoardTabBtn>
        <BoardTabBtn active={boardTab === "contacts"} onClick={() => setBoardTab("contacts")} icon={Users}>
          Contacts ({workspace.result.leads.length})
        </BoardTabBtn>
        <BoardTabBtn active={boardTab === "plan"} onClick={() => setBoardTab("plan")} icon={Calendar}>
          30-day plan
        </BoardTabBtn>
        <BoardTabBtn active={boardTab === "assets"} onClick={() => setBoardTab("assets")} icon={Code2}>
          Assets ({workspace.result.assets.length})
        </BoardTabBtn>
      </div>

      {boardTab === "posts" && (
        <div className="grid gap-8 xl:grid-cols-3">
          {/* Recommendations — only what marketing suggests; dismiss = gone from queue */}
          <section className="space-y-4">
            <SectionHeader
              title="Recommendations"
              subtitle="AI suggestions for your business. Approve to publish, or hide ones you don't want."
            />
            {recommended.length === 0 ? (
              <EmptyColumn text="No pending suggestions — you're caught up." />
            ) : (
              recommended.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  variant="recommend"
                  copied={copied}
                  onCopy={copy}
                  editingId={editingId}
                  editDraft={editDraft}
                  onEditDraft={setEditDraft}
                  onStartEdit={startEdit}
                  onSaveEdit={saveEdit}
                  onCancelEdit={() => setEditingId(null)}
                  onApprove={() => handleApprove(post.id)}
                  onDismiss={() => handleDismiss(post.id)}
                  igHandle={igHandle}
                />
              ))
            )}
          </section>

          {/* Approved — user controls what actually goes out */}
          <section className="space-y-4">
            <SectionHeader
              title="Approved — ready to publish"
              subtitle="Copy to your channels, then mark done. (Instagram API not connected — you post manually.)"
            />
            {approved.length === 0 ? (
              <EmptyColumn text="Approve suggestions from the left to build your publish queue." />
            ) : (
              approved.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  variant="approved"
                  copied={copied}
                  posting={postingId === post.id}
                  onCopy={copy}
                  editingId={editingId}
                  editDraft={editDraft}
                  onEditDraft={setEditDraft}
                  onStartEdit={startEdit}
                  onSaveEdit={saveEdit}
                  onCancelEdit={() => setEditingId(null)}
                  onSchedule={() => handleSchedule(post)}
                  onMarkDone={() => handleMarkDone(post)}
                  igHandle={igHandle}
                />
              ))
            )}
          </section>

          {/* Posted */}
          <section className="space-y-4">
            <SectionHeader
              title="Published"
              subtitle="Posts you've confirmed as published from your approved queue."
            />
            {posted.length === 0 ? (
              <EmptyColumn text="Published posts will show here after you post from the approved queue." />
            ) : (
              posted.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  variant="posted"
                  copied={copied}
                  onCopy={copy}
                  igHandle={igHandle}
                />
              ))
            )}
          </section>
        </div>
      )}

      {boardTab === "contacts" && (
        <div className="grid gap-3 md:grid-cols-2">
          {workspace.result.leads.map((lead, i) => (
            <div key={i} className="rounded-xl border border-border surface-elevated p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-foreground">{lead.name}</div>
                <a
                  href={lead.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-emerald-400"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
              <div className="text-xs text-emerald-400/90">
                {lead.platform} · {lead.handle}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{lead.painSnippet}</p>
              <p className="mt-2 text-xs text-foreground/85">{lead.hook}</p>
            </div>
          ))}
        </div>
      )}

      {boardTab === "assets" && (
        <section className="space-y-4">
          <SectionHeader
            title="Landing page & email assets"
            subtitle="Copy code into your site or email tool. Daytona verification runs when DAYTONA_API_KEY is set."
          />
          {workspace.result.assets.length === 0 ? (
            <EmptyColumn text="No assets generated for this launch." />
          ) : (
            workspace.result.assets.map((a) => (
              <div key={a.id} className="rounded-xl border border-border surface-elevated p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-foreground">{a.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.kind} · build {a.buildStatus}
                      {a.buildStatus === "verified" ? " · Daytona verified" : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copy(a.code, a.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-zinc-900/60"
                  >
                    {copied === a.id ? <Check size={12} /> : <Copy size={12} />}
                    {copied === a.id ? "Copied" : "Copy code"}
                  </button>
                </div>
                <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-background/60 p-3 font-mono text-xs text-foreground/90">
                  {a.code}
                </pre>
              </div>
            ))
          )}
        </section>
      )}

      {boardTab === "plan" && (
        <ol className="space-y-3">
          {workspace.result.strategyTimeline.map((step) => (
            <li
              key={step.day}
              className="flex gap-4 rounded-xl border border-border surface-elevated p-4"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-500/15 font-mono text-sm text-emerald-400">
                D{step.day}
              </span>
              <div>
                <div className="font-medium">{step.channel}</div>
                <p className="mt-1 text-sm text-muted-foreground">{step.action}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function PostCard({
  post,
  variant,
  copied,
  posting,
  editingId,
  editDraft,
  onCopy,
  onEditDraft,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onApprove,
  onDismiss,
  onSchedule,
  onMarkDone,
  igHandle = "your_business",
}: {
  post: MarketingPost;
  variant: "recommend" | "approved" | "posted";
  copied: string | null;
  posting?: boolean;
  editingId?: string | null;
  editDraft?: string;
  igHandle?: string;
  onCopy?: (text: string, id: string) => void;
  onEditDraft?: (v: string) => void;
  onStartEdit?: (p: MarketingPost) => void;
  onSaveEdit?: (id: string) => void;
  onCancelEdit?: () => void;
  onApprove?: () => void;
  onDismiss?: () => void;
  onSchedule?: () => void;
  onMarkDone?: () => void;
}) {
  const ig = isInstagram(post.platform);
  const isEditing = editingId === post.id;

  return (
    <article className="overflow-hidden rounded-xl border border-border/80 bg-zinc-950/40">
      {ig && (
        <div className="border-b border-border/60 bg-gradient-to-br from-purple-900/20 via-pink-900/10 to-zinc-950 p-4">
          <div className="mx-auto max-w-[220px] rounded-2xl border border-border/80 bg-zinc-950 p-3 shadow-lg">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
              <div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                <Instagram size={14} className="text-white" />
              </div>
              <div className="text-[10px]">
                <div className="font-medium text-foreground">{igHandle}</div>
                <div className="text-muted-foreground">Preview</div>
              </div>
            </div>
            <div className="mt-2 aspect-square rounded-lg bg-zinc-900/80 grid place-items-center text-[10px] text-muted-foreground">
              Photo / carousel
            </div>
            <p className="mt-2 line-clamp-4 text-[10px] leading-relaxed text-foreground/90">
              {((isEditing ? editDraft : post.body) ?? "").slice(0, 180)}
              {((isEditing ? editDraft : post.body) ?? "").length > 180 ? "…" : ""}
            </p>
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-emerald-400/90">
              {post.platform}
            </span>
            <h4 className="mt-0.5 font-medium text-foreground">{post.title}</h4>
          </div>
          {variant === "posted" && post.postedAt && (
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {new Date(post.postedAt).toLocaleDateString()}
            </span>
          )}
          {post.state === "scheduled" && post.scheduledAt && (
            <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300">
              Scheduled {new Date(post.scheduledAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
            </span>
          )}
        </div>

        {isEditing ? (
          <textarea
            value={editDraft}
            onChange={(e) => onEditDraft?.(e.target.value)}
            rows={6}
            className="mt-3 w-full rounded-lg border border-border bg-background/60 p-3 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          />
        ) : (
          <p className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {post.body}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {variant === "recommend" && (
            <>
              <ActionBtn primary onClick={onApprove} icon={Heart}>
                Approve
              </ActionBtn>
              <ActionBtn onClick={onDismiss} icon={ThumbsDown}>
                Not for me
              </ActionBtn>
            </>
          )}
          {variant === "approved" && (
            <>
              <ActionBtn
                primary
                onClick={onMarkDone}
                icon={Send}
                disabled={posting}
              >
                {posting ? "Saving…" : ig ? "Mark posted (IG)" : "Mark as done"}
              </ActionBtn>
              <ActionBtn onClick={onSchedule} icon={Calendar}>
                Schedule locally
              </ActionBtn>
            </>
          )}
          {onCopy && (
            <ActionBtn onClick={() => onCopy(post.body, post.id)} icon={copied === post.id ? Check : Copy}>
              {copied === post.id ? "Copied" : "Copy"}
            </ActionBtn>
          )}
          {variant !== "posted" && !isEditing && onStartEdit && (
            <ActionBtn onClick={() => onStartEdit(post)}>Edit</ActionBtn>
          )}
          {isEditing && onSaveEdit && onCancelEdit && (
            <>
              <ActionBtn primary onClick={() => onSaveEdit(post.id)} icon={Check}>
                Save
              </ActionBtn>
              <ActionBtn onClick={onCancelEdit} icon={X}>
                Cancel
              </ActionBtn>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h3 className="font-display text-lg text-foreground">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function EmptyColumn({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center text-xs text-muted-foreground">
      {text}
    </p>
  );
}

function StatPill({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: number;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-center ${
        accent
          ? "border-emerald-500/30 bg-emerald-500/10"
          : muted
            ? "border-border/40 bg-transparent opacity-60"
            : "border-border/60 bg-zinc-950/40"
      }`}
    >
      <div className="font-mono text-lg text-foreground">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function BoardTabBtn({
  active,
  onClick,
  children,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon: typeof Megaphone;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm transition ${
        active ? "border-emerald-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon size={14} />
      {children}
    </button>
  );
}

function ActionBtn({
  children,
  onClick,
  icon: Icon,
  primary,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: typeof Check;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
        primary
          ? "bg-emerald-500 text-zinc-950 hover:opacity-90"
          : "border border-border/80 text-foreground hover:bg-zinc-900/60"
      }`}
    >
      {Icon && <Icon size={12} />}
      {children}
    </button>
  );
}
