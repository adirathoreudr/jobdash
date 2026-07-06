"use client";

import { useEffect, useState } from "react";
import type { ApplicationRecord } from "@/lib/types";
import { Badge, Card } from "@/components/ui";

const STATUSES = ["Applied", "Interview", "Offer", "Rejected"] as const;

const STATUS_TONE: Record<string, "neutral" | "accent" | "ok" | "warn"> = {
  Applied: "neutral",
  Interview: "accent",
  Offer: "ok",
  Rejected: "warn",
};

export function HistoryView() {
  const [rows, setRows] = useState<ApplicationRecord[] | null>(null);
  const [hasDb, setHasDb] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/history");
        const data = await res.json();
        setRows(data.applications ?? []);
        setHasDb(Boolean(data.hasDatabase));
      } catch {
        setRows([]);
        setHasDb(false);
      }
    })();
  }, []);

  async function setStatus(id: string, status: string) {
    setRows((prev) =>
      prev ? prev.map((r) => (r.id === id ? { ...r, status } : r)) : prev
    );
    try {
      await fetch("/api/history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
    } catch {
      /* optimistic; ignore transient failure */
    }
  }

  if (rows === null) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-14 rounded-[var(--radius-md)]" />
        ))}
      </div>
    );
  }

  if (!hasDb) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-[var(--color-ink-soft)]">
          History needs a database. Add a{" "}
          <code className="rounded bg-[var(--color-line-soft)] px-1.5 py-0.5 text-xs">
            DATABASE_URL
          </code>{" "}
          to <code className="text-xs">.env.local</code> (free Postgres at
          neon.tech), then run <code className="text-xs">pnpm db:push</code>.
        </p>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="text-[15px] font-medium">No applications logged yet.</p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          When you answer “Yes, I applied,” it shows up here.
        </p>
        <a
          href="/"
          className="mt-5 inline-block text-sm font-medium text-[var(--color-accent)] hover:underline"
        >
          Start an application →
        </a>
      </Card>
    );
  }

  const stats = summarise(rows);

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-6">
        <Stat label="Total" value={stats.total} />
        <Stat label="Interviewing" value={stats.interview} />
        <Stat label="Offers" value={stats.offer} />
        <Stat label="Avg fit" value={stats.avgFit != null ? `${stats.avgFit}` : "—"} />
      </div>

      <Card className="overflow-hidden">
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-[var(--color-line)] text-left">
                <Th>Company</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Fit</Th>
                <Th>Applied</Th>
                <Th> </Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--color-line-soft)] last:border-0 hover:bg-[var(--color-line-soft)]"
                >
                  <td className="px-4 py-3 font-medium">
                    <span className="flex items-center gap-2">
                      {r.company}
                      {r.notionPageId && (
                        <span
                          title="Synced to Notion"
                          className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-ok)]"
                        />
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-ink-soft)]">
                    {r.role}
                  </td>
                  <td className="px-4 py-3">
                    <StatusSelect
                      value={r.status}
                      onChange={(s) => setStatus(r.id, s)}
                    />
                  </td>
                  <td className="px-4 py-3 tabular-nums text-[var(--color-ink-soft)]">
                    {r.fitScore != null ? r.fitScore : "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-muted)]">
                    {formatDate(r.appliedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.url && (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                        title="Open job posting"
                      >
                        ↗
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StatusSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (s: string) => void;
}) {
  const tone = STATUS_TONE[value] ?? "neutral";
  return (
    <label className="relative inline-flex">
      <Badge tone={tone} className="pr-5">
        {value}
      </Badge>
      <select
        value={STATUSES.includes(value as never) ? value : "Applied"}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label="Change status"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-2xl font-semibold tabular-nums tracking-tight">
        {value}
      </div>
      <div className="eyebrow mt-0.5">{label}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">
      {children}
    </th>
  );
}

function summarise(rows: ApplicationRecord[]) {
  const withFit = rows.filter((r) => r.fitScore != null);
  return {
    total: rows.length,
    interview: rows.filter((r) => r.status === "Interview").length,
    offer: rows.filter((r) => r.status === "Offer").length,
    avgFit: withFit.length
      ? Math.round(
          withFit.reduce((s, r) => s + (r.fitScore ?? 0), 0) / withFit.length
        )
      : null,
  };
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}
