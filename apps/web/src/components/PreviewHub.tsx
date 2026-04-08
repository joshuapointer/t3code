import { type PreviewUrl } from "@t3tools/contracts";
import { ExternalLinkIcon, RefreshCwIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { usePreviewStore } from "../previewStore";
import { getWsRpcClient } from "../wsRpcClient";
import { useStore } from "../store";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncateUrl(url: string, maxLen = 48): string {
  if (url.length <= maxLen) return url;
  return `${url.slice(0, maxLen)}…`;
}

function formatTimestamp(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoDate;
  }
}

function groupByThread(previews: PreviewUrl[]): Map<string, PreviewUrl[]> {
  const map = new Map<string, PreviewUrl[]>();
  for (const preview of previews) {
    const threadId = preview.threadId as string;
    const existing = map.get(threadId);
    if (existing) {
      existing.push(preview);
    } else {
      map.set(threadId, [preview]);
    }
  }
  // Sort each lane chronologically
  for (const [, items] of map) {
    items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  return map;
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

type PreviewStatus = "active" | "expired" | "removed";

function StatusBadge({ status }: { status: PreviewStatus }) {
  if (status === "active") {
    return (
      <Badge variant="success" size="sm">
        active
      </Badge>
    );
  }
  if (status === "expired") {
    return (
      <Badge variant="warning" size="sm">
        expired
      </Badge>
    );
  }
  return (
    <Badge variant="error" size="sm">
      removed
    </Badge>
  );
}

function SpawnedByBadge({ spawnedBy }: { spawnedBy: "agent" | "user" }) {
  return (
    <Badge variant={spawnedBy === "agent" ? "info" : "secondary"} size="sm">
      {spawnedBy}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Preview node card
// ---------------------------------------------------------------------------

function PreviewNode({ preview }: { preview: PreviewUrl }) {
  return (
    <button
      type="button"
      className="group relative flex min-w-[200px] max-w-[280px] flex-col gap-1.5 rounded-md border border-border bg-card p-2.5 text-left shadow-xs transition-colors hover:border-ring/50 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => window.open(preview.url, "_blank", "noopener,noreferrer")}
      title={preview.url}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="truncate text-xs font-medium text-foreground">
          {preview.label ?? truncateUrl(preview.url)}
        </span>
        <ExternalLinkIcon className="size-3 shrink-0 text-muted-foreground/60 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      {preview.label && (
        <span className="truncate text-[10px] text-muted-foreground/70">
          {truncateUrl(preview.url)}
        </span>
      )}

      <div className="flex flex-wrap items-center gap-1">
        <StatusBadge status={preview.status} />
        <SpawnedByBadge spawnedBy={preview.spawnedBy} />
      </div>

      <span className="text-[10px] text-muted-foreground/60">
        {formatTimestamp(preview.createdAt)}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Thread lane
// ---------------------------------------------------------------------------

function ThreadLane({ threadId, previews }: { threadId: string; previews: PreviewUrl[] }) {
  const shortId = threadId.slice(0, 8);

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {shortId}
        </span>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      <div className="flex flex-row items-center gap-0 overflow-x-auto pb-1">
        {previews.map((preview, index) => (
          <div key={preview.id} className="flex flex-row items-center">
            {index > 0 && <div className="h-px w-6 shrink-0 bg-border/60" />}
            <PreviewNode preview={preview} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------

type StatusFilter = "all" | "active" | "expired" | "removed";

function FilterBar({
  activeFilter,
  onFilterChange,
  threadIds,
  activeThreadFilter,
  onThreadFilterChange,
  onRefresh,
  isLoading,
}: {
  activeFilter: StatusFilter;
  onFilterChange: (f: StatusFilter) => void;
  threadIds: string[];
  activeThreadFilter: string | null;
  onThreadFilterChange: (id: string | null) => void;
  onRefresh: () => void;
  isLoading: boolean;
}) {
  const filters: StatusFilter[] = ["all", "active", "expired", "removed"];

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
      <div className="flex items-center gap-1">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onFilterChange(f)}
            className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
              activeFilter === f
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {threadIds.length > 0 && (
        <select
          className="rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={activeThreadFilter ?? ""}
          onChange={(e) => onThreadFilterChange(e.target.value || null)}
        >
          <option value="">All threads</option>
          {threadIds.map((id) => (
            <option key={id} value={id}>
              {id.slice(0, 8)}
            </option>
          ))}
        </select>
      )}

      <div className="ml-auto">
        <Button size="xs" variant="outline" onClick={onRefresh} disabled={isLoading}>
          {isLoading ? <Spinner className="size-3" /> : <RefreshCwIcon className="size-3" />}
          Refresh
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PreviewHub() {
  const projectIdsKey = useStore((s) => s.projects.map((p) => p.id).join(","));

  const { previews, setPreviews, addPreview, updatePreviewStatus, removePreview } =
    usePreviewStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [threadFilter, setThreadFilter] = useState<string | null>(null);

  const fetchPreviews = useCallback(async () => {
    if (!projectIdsKey) return;
    const ids = projectIdsKey.split(",");
    setIsLoading(true);
    setError(null);
    try {
      const client = getWsRpcClient();
      const results = await Promise.all(
        ids.map((projectId) => client.previews.listByProject({ projectId: projectId as any })),
      );
      setPreviews(results.flat());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load previews");
    } finally {
      setIsLoading(false);
    }
  }, [projectIdsKey, setPreviews]);

  // Initial fetch
  useEffect(() => {
    void fetchPreviews();
  }, [fetchPreviews]);

  // Live subscription — null projectId means all projects
  useEffect(() => {
    const client = getWsRpcClient();
    const unsubscribe = client.previews.subscribeEvents({ projectId: null }, (event) => {
      if (event.type === "preview.registered") {
        addPreview(event.preview);
      } else if (event.type === "preview.statusUpdated") {
        updatePreviewStatus(event.id, event.status);
      } else if (event.type === "preview.deleted") {
        removePreview(event.id);
      }
    });
    return unsubscribe;
  }, [addPreview, updatePreviewStatus, removePreview]);

  // Filtered + grouped
  const filteredPreviews = useMemo(() => {
    let items = previews;
    if (statusFilter !== "all") {
      items = items.filter((p) => p.status === statusFilter);
    }
    if (threadFilter) {
      items = items.filter((p) => (p.threadId as string) === threadFilter);
    }
    return items;
  }, [previews, statusFilter, threadFilter]);

  const threadGroups = useMemo(() => groupByThread(filteredPreviews), [filteredPreviews]);

  // Sort lanes by earliest preview creation time
  const sortedThreadIds = useMemo(() => {
    return [...threadGroups.keys()].toSorted((a, b) => {
      const aFirst = threadGroups.get(a)?.[0]?.createdAt ?? "";
      const bFirst = threadGroups.get(b)?.[0]?.createdAt ?? "";
      return new Date(aFirst).getTime() - new Date(bFirst).getTime();
    });
  }, [threadGroups]);

  const allThreadIds = useMemo(
    () => [...new Set(previews.map((p) => p.threadId as string))],
    [previews],
  );

  if (!projectIdsKey) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Add a project to view preview URLs.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 py-3">
        <h1 className="text-base font-semibold text-foreground">Preview Hub</h1>
        <p className="text-xs text-muted-foreground/70">
          Track all agent-spawned preview URLs across threads
        </p>
      </header>

      {/* Toolbar */}
      <FilterBar
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
        threadIds={allThreadIds}
        activeThreadFilter={threadFilter}
        onThreadFilterChange={setThreadFilter}
        onRefresh={() => void fetchPreviews()}
        isLoading={isLoading}
      />

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {error && (
          <div className="mb-4 rounded-md border border-destructive/20 bg-destructive/8 px-3 py-2 text-xs text-destructive-foreground">
            {error}
          </div>
        )}

        {isLoading && previews.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            Loading previews…
          </div>
        )}

        {!isLoading && sortedThreadIds.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-muted-foreground">No preview URLs registered yet.</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Agents can register previews during sessions.
            </p>
          </div>
        )}

        {sortedThreadIds.length > 0 && (
          <div className="flex flex-col gap-6">
            {sortedThreadIds.map((threadId) => {
              const lane = threadGroups.get(threadId);
              if (!lane) return null;
              return <ThreadLane key={threadId} threadId={threadId} previews={lane} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
