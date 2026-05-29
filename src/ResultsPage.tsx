import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ResultItem {
  id: number;
  batchId: number;
  url: string;
  tag: string | null;
  completedAt: string;
  meta: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PAGE_SIZE = 50;

export function ResultsPage() {
  const [tagFilter, setTagFilter] = useState("");
  const [batchIdFilter, setBatchIdFilter] = useState("");
  const [committedTag, setCommittedTag] = useState("");
  const [committedBatchId, setCommittedBatchId] = useState("");

  const [items, setItems] = useState<ResultItem[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState<number | null>(null);

  const buildParams = useCallback(
    (cursor?: number) => {
      const p = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (committedTag) p.set("tag", committedTag);
      if (committedBatchId) p.set("batchId", committedBatchId);
      if (cursor != null) p.set("after", String(cursor));
      return p;
    },
    [committedTag, committedBatchId],
  );

  const loadPage = useCallback(
    async (cursor?: number) => {
      setLoading(true);
      try {
        const res = await fetch(`/results?${buildParams(cursor)}`);
        const data = await res.json();
        const newItems: ResultItem[] = data.items ?? [];
        if (cursor == null) {
          setItems(newItems);
          setTotal(null); // reset total on fresh search
        } else {
          setItems((prev) => [...prev, ...newItems]);
        }
        setNextCursor(data.nextCursor ?? null);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    [buildParams],
  );

  // Load on filter commit
  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const onFilter = () => {
    setCommittedTag(tagFilter.trim());
    setCommittedBatchId(batchIdFilter.trim());
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onFilter();
  };

  const onDownload = async () => {
    const p = new URLSearchParams();
    if (committedTag) p.set("tag", committedTag);
    if (committedBatchId) p.set("batchId", committedBatchId);

    const res = await fetch(`/results/export?${p}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = committedTag ? `results-${committedTag}.json` : "results.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-0 md:p-8 w-screen max-w-4xl flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              placeholder="Filter by tag"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              onKeyDown={onKeyDown}
              className="w-40"
            />
            <Input
              placeholder="Batch ID"
              value={batchIdFilter}
              onChange={(e) => setBatchIdFilter(e.target.value)}
              onKeyDown={onKeyDown}
              className="w-28"
            />
            <Button onClick={onFilter} disabled={loading}>
              Search
            </Button>
            <Button variant="outline" onClick={onDownload} disabled={loading}>
              Download JSON
            </Button>
            {items.length > 0 && (
              <span className="text-sm text-muted-foreground ml-auto">
                {items.length} loaded
                {nextCursor != null ? "…" : " (all)"}
              </span>
            )}
          </div>

          {/* Results */}
          {items.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No results yet. Submit a batch to get started.
            </p>
          )}

          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <ResultCard key={item.id} item={item} />
            ))}
          </div>

          {nextCursor != null && (
            <Button
              variant="outline"
              onClick={() => loadPage(nextCursor)}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Loading…" : "Load more"}
            </Button>
          )}

          {loading && items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Loading…
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ResultCard
// ---------------------------------------------------------------------------

function ResultCard({ item }: { item: ResultItem }) {
  const [expanded, setExpanded] = useState(false);
  const m = item.meta;

  const title = m.title as string | undefined;
  const description = m.description as string | undefined;
  const image = m.image as string | undefined;
  const author = m.author as string | undefined;
  const publisher = m.publisher as string | undefined;

  return (
    <div className="rounded-lg border bg-card p-3 flex flex-col gap-2">
      <div className="flex gap-3">
        {image && (
          <img
            src={image}
            alt=""
            className="w-16 h-16 object-cover rounded flex-shrink-0 bg-muted"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-sm hover:underline line-clamp-1 text-foreground"
              title={title ?? item.url}
            >
              {title ?? item.url}
            </a>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {item.tag && (
                <span className="bg-primary/20 text-foreground rounded px-1.5 py-0.5 text-xs">
                  {item.tag}
                </span>
              )}
              <span className="text-xs text-muted-foreground font-mono">
                #{item.batchId}
              </span>
            </div>
          </div>

          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:underline truncate block"
          >
            {item.url}
          </a>

          {description && (
            <p className="text-xs text-foreground/80 mt-1 line-clamp-2">
              {description}
            </p>
          )}

          <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
            {author && <span>{author}</span>}
            {author && publisher && <span>·</span>}
            {publisher && <span>{publisher}</span>}
            <span className="ml-auto">
              {new Date(item.completedAt).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Expand raw JSON */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="text-xs text-muted-foreground hover:text-foreground text-left"
      >
        {expanded ? "▲ Hide raw" : "▼ Show raw metadata"}
      </button>
      {expanded && (
        <pre className="text-xs bg-muted/40 rounded p-2 overflow-x-auto max-h-64">
          {JSON.stringify(item.meta, null, 2)}
        </pre>
      )}
    </div>
  );
}
