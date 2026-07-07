"use client";

import { useCallback, useRef, useState } from "react";
import type { Profile } from "@/lib/types";
import { Spinner } from "@/components/ui";

type Props = {
  onParsed: (profile: Profile, persisted: boolean) => void;
};

const STAGES = [
  "Reading the PDF…",
  "Extracting your experience…",
  "Structuring skills & impact…",
];

export function ResumeUpload({ onParsed }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      setFileName(file.name);
      setBusy(true);
      setStage(0);
      const ticker = setInterval(
        () => setStage((s) => Math.min(s + 1, STAGES.length - 1)),
        1600
      );
      try {
        const body = new FormData();
        body.append("resume", file);
        const res = await fetch("/api/parse-resume", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Something went wrong.");
        onParsed(data.profile as Profile, Boolean(data.persisted));
      } catch (e) {
        setError((e as Error).message);
        setFileName(null);
      } finally {
        clearInterval(ticker);
        setBusy(false);
      }
    },
    [onParsed]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) upload(file);
    },
    [upload]
  );

  return (
    <div className="fade-up">
      <p className="eyebrow mb-4">Step 01 — your resume</p>
      <h2 className="display text-[clamp(1.9rem,5vw,2.75rem)]">
        Start with your{" "}
        <span className="text-[var(--color-accent)]">baseline</span>.
      </h2>
      <p className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-[var(--color-ink-soft)]">
        Upload your resume once. It becomes the anchor for every tailored
        document JobDash writes. PDF only — nothing leaves your control.
      </p>

      <div
        role="button"
        tabIndex={0}
        aria-label="Upload your resume PDF"
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !busy)
            inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={[
          "transitionable mt-9 flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed px-6 text-center",
          dragging
            ? "border-[var(--color-accent)] bg-[var(--color-accent-wash)]"
            : "border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-ink)]",
          busy ? "pointer-events-none opacity-90" : "",
        ].join(" ")}
      >
        {busy ? (
          <>
            <Spinner className="text-[var(--color-accent)]" />
            <div className="text-sm font-medium">{STAGES[stage]}</div>
            <div className="font-mono text-xs text-[var(--color-faint)]">
              {fileName}
            </div>
          </>
        ) : (
          <>
            <UploadGlyph />
            <div className="text-[15px] font-medium">
              Drop your resume, or{" "}
              <span className="text-[var(--color-accent)]">browse</span>
            </div>
            <div className="text-xs text-[var(--color-muted)]">
              PDF · up to 8 MB
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p className="mt-4 text-sm text-[var(--color-accent)]">{error}</p>
      )}
    </div>
  );
}

function UploadGlyph() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-[var(--color-muted)]"
      aria-hidden
    >
      <path d="M12 15V3" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
    </svg>
  );
}
