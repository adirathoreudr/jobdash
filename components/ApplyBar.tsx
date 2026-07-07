"use client";

import { useState } from "react";
import type { Artifacts, JobData } from "@/lib/types";
import { Button, Card, Spinner } from "@/components/ui";

type Props = {
  job: JobData;
  artifacts: Artifacts;
  onStartAnother?: () => void;
};

type State =
  | { kind: "ask" }
  | { kind: "saving" }
  | { kind: "applied"; notion: NotionResult }
  | { kind: "declined" }
  | { kind: "error"; message: string };

type NotionResult = { configured: boolean; synced: boolean; reason?: string };

export function ApplyBar({ job, artifacts, onStartAnother }: Props) {
  const [state, setState] = useState<State>({ kind: "ask" });

  async function apply() {
    setState({ kind: "saving" });
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: job.company,
          role: job.title,
          url: job.sourceUrl ?? null,
          jdSnapshot: job.description ?? "",
          fitScore: artifacts.fit.score,
          generated: artifacts,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not log this.");
      setState({ kind: "applied", notion: data.notion as NotionResult });
    } catch (e) {
      setState({ kind: "error", message: (e as Error).message });
    }
  }

  return (
    <Card className="fade-up border-[var(--color-ink)] p-6">
      {state.kind === "ask" && (
        <div className="flex flex-col items-center gap-5 py-2 text-center">
          <div>
            <div className="eyebrow">Step 04 — track it</div>
            <h3 className="mt-2 text-xl font-semibold tracking-tight">
              Did you apply to this job?
            </h3>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {job.title} · {job.company}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="accent" size="lg" onClick={apply} className="min-w-[104px]">
              Yes
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setState({ kind: "declined" })}
              className="min-w-[104px]"
            >
              No
            </Button>
          </div>
        </div>
      )}

      {state.kind === "saving" && (
        <div className="flex items-center justify-center gap-3 py-6 text-sm text-[var(--color-ink-soft)]">
          <Spinner className="text-[var(--color-accent)]" />
          Logging your application…
        </div>
      )}

      {state.kind === "applied" && (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <SuccessMark />
          <div>
            <h3 className="text-lg font-semibold">Logged.</h3>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {notionLine(state.notion)}
            </p>
          </div>
          <div className="flex gap-3">
            <a href="/history">
              <Button variant="outline" size="sm">
                View history
              </Button>
            </a>
            {onStartAnother && (
              <Button variant="primary" size="sm" onClick={onStartAnother}>
                New application
              </Button>
            )}
          </div>
        </div>
      )}

      {state.kind === "declined" && (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <p className="text-sm text-[var(--color-ink-soft)]">
            No problem — nothing was logged. Your documents are still above.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={() => setState({ kind: "ask" })}>
              Actually, I applied
            </Button>
            {onStartAnother && (
              <Button variant="primary" size="sm" onClick={onStartAnother}>
                New application
              </Button>
            )}
          </div>
        </div>
      )}

      {state.kind === "error" && (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <p className="text-sm text-[var(--color-accent)]">{state.message}</p>
          <Button variant="outline" size="sm" onClick={() => setState({ kind: "ask" })}>
            Try again
          </Button>
        </div>
      )}
    </Card>
  );
}

function notionLine(n: NotionResult): string {
  if (!n.configured) return "Saved to your history. (Connect Notion to sync it there too.)";
  if (n.synced) return "Saved to your history and synced to Notion.";
  return "Saved to your history. Notion sync didn't complete — check your integration.";
}

function SuccessMark() {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-ok)] text-white">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </div>
  );
}
