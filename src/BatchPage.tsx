import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Method } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BatchInfo {
  id: number;
  tag: string | null;
  total_count: number;
  completed_count: number;
  failed_count: number;
  created_at: string;
}

interface QueueStats {
  pending: number;
  processing: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BatchPage() {
  const [urlsText, setUrlsText] = useState("");
  const [tag, setTag] = useState("");
  const [method, setMethod] = useState<Method>("both");
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{
    batchId: number;
    accepted: number;
    skipped: number;
  } | null>(null);

  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    pending: 0,
    processing: 0,
  });

  const refresh = useCallback(async () => {
    try {
      const [batchRes, statsRes] = await Promise.all([
        fetch("/batch"),
        fetch("/queue/stats"),
      ]);
      const batchData = await batchRes.json();
      const statsData = await statsRes.json();
      setBatches(batchData.batches ?? []);
      setQueueStats(statsData);
    } catch {
      // Silently ignore polling errors
    }
  }, []);

  // Auto-refresh every 2 seconds
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, [refresh]);

  const onSubmit = async () => {
    const urls = urlsText
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);

    if (urls.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls,
          tag: tag.trim() || undefined,
          method,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert("Error: " + JSON.stringify(err));
        return;
      }

      const data = await res.json();
      setLastResult(data);
      setUrlsText("");
      setTag("");
      await refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const pendingUrls = urlsText
    .split("\n")
    .map((u) => u.trim())
    .filter(Boolean).length;

  return (
    <div className="container mx-auto p-0 md:p-8 w-screen max-w-4xl flex flex-col gap-4">
      {/* Submit form */}
      <Card>
        <CardHeader>
          <CardTitle>Submit Batch</CardTitle>
          <CardDescription>
            Paste URLs (one per line) to add them to the scraping queue. Items
            are automatically sorted to avoid hitting the same domain
            consecutively.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <Label htmlFor="urls" className="sr-only">
              URLs
            </Label>
            <Textarea
              id="urls"
              placeholder={"https://example.com/page-1\nhttps://other.com/page-2\n…"}
              value={urlsText}
              onChange={(e) => setUrlsText(e.target.value)}
              className="min-h-[180px] font-mono text-sm resize-y"
            />
            {pendingUrls > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {pendingUrls} URL{pendingUrls !== 1 ? "s" : ""} entered
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <Input
              placeholder="Tag (optional)"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="w-48"
            />
            <Select
              value={method}
              onValueChange={(v) => setMethod(v as Method)}
            >
              <SelectTrigger className="bg-primary/20 border-none w-48">
                method = {method}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Fetch or Playwright</SelectItem>
                <SelectItem value="fetch">Fetch only</SelectItem>
                <SelectItem value="playwright">Playwright only</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={onSubmit}
              disabled={submitting || pendingUrls === 0}
            >
              {submitting ? "Submitting…" : "Submit"}
            </Button>
          </div>

          {lastResult && (
            <p className="text-sm text-green-700">
              ✅ Batch #{lastResult.batchId} created —{" "}
              <strong>{lastResult.accepted}</strong> URL
              {lastResult.accepted !== 1 ? "s" : ""} accepted
              {lastResult.skipped > 0
                ? `, ${lastResult.skipped} skipped (invalid)`
                : ""}
              .
            </p>
          )}
        </CardContent>
      </Card>

      {/* Queue stats */}
      <Card>
        <CardContent className="pt-5 flex gap-6 text-sm">
          <Stat label="Pending" value={queueStats.pending} />
          <Stat label="Processing" value={queueStats.processing} />
        </CardContent>
      </Card>

      {/* Batch list */}
      <Card>
        <CardHeader>
          <CardTitle>Batches</CardTitle>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No batches yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {batches.map((b) => (
                <BatchRow key={b.id} batch={b} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function BatchRow({ batch }: { batch: BatchInfo }) {
  const done = batch.completed_count;
  const total = batch.total_count;
  const failed = batch.failed_count;
  const succeeded = done - failed;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const isComplete = done >= total && total > 0;

  return (
    <div className="rounded-lg border bg-card p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-mono text-xs text-muted-foreground">
            #{batch.id}
          </span>
          {batch.tag && (
            <span className="bg-primary/20 text-foreground rounded px-1.5 py-0.5 text-xs font-medium">
              {batch.tag}
            </span>
          )}
        </div>
        <span
          className={`text-xs font-medium ${isComplete ? "text-green-700" : "text-amber-700"}`}
        >
          {isComplete ? "Complete" : "Running"}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isComplete ? "bg-green-600" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>
          {done}/{total} done ({pct}%)
        </span>
        {succeeded > 0 && (
          <span className="text-green-700">{succeeded} ok</span>
        )}
        {failed > 0 && <span className="text-red-600">{failed} failed</span>}
        <span className="ml-auto">
          {new Date(batch.created_at).toLocaleString()}
        </span>
      </div>
    </div>
  );
}
