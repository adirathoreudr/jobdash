"use client";

import { useState } from "react";
import type { JobData } from "@/lib/types";
import { Button, Spinner } from "@/components/ui";

type Props = {
  onJob: (job: JobData) => void;
};

export function JobInput({ onJob }: Props) {
  const [url, setUrl] = useState("");
  const [paste, setPaste] = useState("");
  const [needsPaste, setNeedsPaste] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(payload: { url?: string; text?: string }) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      if (data.needsPaste) {
        setNeedsPaste(true);
        setReason(
          data.reason ||
            "This site blocks automated reading. Paste the job description below."
        );
        return;
      }
      onJob(data.job as JobData);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fade-up">
      <p className="eyebrow mb-4">Step 02 — the job</p>
      <h2 className="display text-[clamp(1.9rem,5vw,2.75rem)]">
        Point at a{" "}
        <span className="text-[var(--color-accent)]">role</span>.
      </h2>
      <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-[var(--color-ink-soft)]">
        Paste a job link — a company careers page, Greenhouse, Lever, Ashby.
        JobDash reads the description and gets to work.
      </p>

      <form
        className="mt-8"
        onSubmit={(e) => {
          e.preventDefault();
          if (url.trim() && !busy) submit({ url: url.trim() });
        }}
      >
        <div className="flex items-end gap-3">
          <input
            type="url"
            inputMode="url"
            autoFocus
            value={url}
            disabled={busy}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://company.com/careers/senior-engineer"
            className="input-underline w-full text-[17px]"
          />
          <Button
            type="submit"
            variant="accent"
            disabled={busy || !url.trim()}
          >
            {busy && !needsPaste ? <Spinner /> : "Read"}
          </Button>
        </div>
      </form>

      {needsPaste && (
        <div className="fade-up mt-8">
          <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-accent-wash)] px-4 py-3 text-sm text-[var(--color-accent-ink)]">
            {reason}
          </div>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder="Paste the full job description here…"
            rows={10}
            className="thin-scroll mt-4 w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 text-[14px] leading-relaxed outline-none focus:border-[var(--color-ink)]"
          />
          <div className="mt-3 flex justify-end">
            <Button
              variant="accent"
              disabled={busy || paste.trim().length < 60}
              onClick={() => submit({ text: paste.trim() })}
            >
              {busy ? <Spinner /> : "Use this description"}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm text-[var(--color-accent)]">{error}</p>
      )}
    </div>
  );
}
