"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Artifacts, JobData, ResumeData } from "@/lib/types";
import { ArtifactCard } from "@/components/ArtifactCard";
import { ResumePreview } from "@/components/ResumePreview";
import { CopyButton } from "@/components/CopyButton";
import { ApplyBar } from "@/components/ApplyBar";
import { Badge, Button, Card, Spinner } from "@/components/ui";

// @react-pdf/renderer is browser-only — load the download button client-side.
const DownloadResumeButton = dynamic(
  () => import("@/components/ResumeDoc").then((m) => m.DownloadResumeButton),
  { ssr: false, loading: () => <Button size="sm" variant="primary" disabled>PDF…</Button> }
);

const LOADING_CAPTIONS = [
  "Reading the role against your resume…",
  "Tailoring bullet points to the job…",
  "Mapping your achievements to their needs…",
  "Drafting your cover letter & outreach…",
  "Preparing interview questions…",
];

type Props = {
  resume: ResumeData;
  job: JobData;
  onArtifacts?: (a: Artifacts) => void;
  onStartAnother?: () => void;
};

export function GenerationDashboard({
  resume,
  job,
  onArtifacts,
  onStartAnother,
}: Props) {
  const [artifacts, setArtifacts] = useState<Artifacts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState(0);
  const started = useRef(false);

  async function generate() {
    setError(null);
    setArtifacts(null);
    setCaption(0);
    const ticker = setInterval(
      () => setCaption((c) => (c + 1) % LOADING_CAPTIONS.length),
      2200
    );
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, job }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed.");
      setArtifacts(data.artifacts as Artifacts);
      onArtifacts?.(data.artifacts as Artifacts);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      clearInterval(ticker);
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <Card className="fade-up p-6">
        <p className="text-sm text-[var(--color-accent)]">{error}</p>
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={generate}>
            Try again
          </Button>
        </div>
      </Card>
    );
  }

  if (!artifacts) {
    return <GeneratingState caption={LOADING_CAPTIONS[caption]} />;
  }

  const a = artifacts;
  return (
    <div className="space-y-5">
      <FitPanel fit={a.fit} />

      <ArtifactCard
        index="01"
        title="Tailored résumé"
        subtitle="Re-emphasised for this role — your facts, reordered and sharpened."
        actions={
          <>
            <DownloadResumeButton resume={a.tailoredResume} company={job.company} />
          </>
        }
      >
        <ResumePreview resume={a.tailoredResume} />
        {a.resumeChangeNotes.length > 0 && (
          <div className="mt-4">
            <div className="eyebrow mb-2">What changed</div>
            <ul className="space-y-1.5">
              {a.resumeChangeNotes.map((n, i) => (
                <li key={i} className="flex gap-2 text-sm text-[var(--color-ink-soft)]">
                  <span className="text-[var(--color-accent)]">—</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </ArtifactCard>

      <ArtifactCard
        index="02"
        title="Cover letter"
        actions={<CopyButton text={a.coverLetter} />}
      >
        <Prose text={a.coverLetter} />
      </ArtifactCard>

      <ArtifactCard
        index="03"
        title="Follow-up email"
        subtitle="For the founder or hiring manager."
        actions={
          <CopyButton
            text={`Subject: ${a.followUpEmail.subject}\n\n${a.followUpEmail.body}`}
            label="Copy email"
          />
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-line-soft)] px-3 py-2 text-sm">
          <span className="text-[var(--color-muted)]">Subject</span>
          <span className="font-medium">{a.followUpEmail.subject}</span>
        </div>
        <Prose text={a.followUpEmail.body} />
      </ArtifactCard>

      <ArtifactCard
        index="04"
        title="Interview prep"
        subtitle="Seven likely questions — with how to answer."
      >
        <ol className="space-y-4">
          {a.interviewQuestions.map((q, i) => (
            <li key={i}>
              <div className="flex gap-3">
                <span className="font-mono text-xs text-[var(--color-faint)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1">
                  <div className="font-medium">{q.question}</div>
                  <ul className="mt-1.5 space-y-1">
                    {q.strategy.map((str, j) => (
                      <li
                        key={j}
                        className="flex gap-2 text-sm text-[var(--color-ink-soft)]"
                      >
                        <span className="text-[var(--color-accent)]">→</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {i < a.interviewQuestions.length - 1 && (
                <hr className="rule mt-4" />
              )}
            </li>
          ))}
        </ol>
      </ArtifactCard>

      <ArtifactCard
        index="05"
        title="Your unique pitch"
        subtitle="Why you, for this role."
        actions={<CopyButton text={a.uniquePitch} />}
      >
        <p className="text-[15px] leading-relaxed text-[var(--color-ink)]">
          {a.uniquePitch}
        </p>
      </ArtifactCard>

      <ApplyBar job={job} artifacts={a} onStartAnother={onStartAnother} />
    </div>
  );
}

function FitPanel({ fit }: { fit: Artifacts["fit"] }) {
  return (
    <Card className="fade-up p-6">
      <div className="flex items-center gap-6">
        <ScoreRing score={fit.score} />
        <div className="min-w-0 flex-1">
          <div className="eyebrow">Fit analysis</div>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
            {fit.summary}
          </p>
        </div>
      </div>
      {(fit.matchedSkills.length > 0 || fit.missingKeywords.length > 0) && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {fit.matchedSkills.length > 0 && (
            <div>
              <div className="eyebrow mb-2">Strong matches</div>
              <div className="flex flex-wrap gap-1.5">
                {fit.matchedSkills.slice(0, 12).map((s) => (
                  <Badge key={s} tone="ok">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {fit.missingKeywords.length > 0 && (
            <div>
              <div className="eyebrow mb-2">Worth addressing</div>
              <div className="flex flex-wrap gap-1.5">
                {fit.missingKeywords.slice(0, 12).map((s) => (
                  <Badge key={s} tone="warn">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  const tone =
    score >= 75 ? "var(--color-ok)" : score >= 50 ? "var(--color-warn)" : "var(--color-accent)";
  return (
    <div className="relative h-[76px] w-[76px] shrink-0">
      <svg width="76" height="76" viewBox="0 0 76 76" className="-rotate-90">
        <circle cx="38" cy="38" r={r} fill="none" stroke="var(--color-line)" strokeWidth="6" />
        <circle
          cx="38"
          cy="38"
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.2,0.7,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold leading-none">{score}</span>
        <span className="text-[9px] text-[var(--color-faint)]">fit</span>
      </div>
    </div>
  );
}

function Prose({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-[var(--color-ink)]">
      {text
        .split(/\n{2,}/)
        .filter(Boolean)
        .map((para, i) => (
          <p key={i} className="whitespace-pre-wrap">
            {para}
          </p>
        ))}
    </div>
  );
}

function GeneratingState({ caption }: { caption: string }) {
  return (
    <div className="fade-up">
      <div className="flex items-center gap-3 text-sm text-[var(--color-ink-soft)]">
        <Spinner className="text-[var(--color-accent)]" />
        <span>{caption}</span>
      </div>
      <div className="mt-6 space-y-4">
        {[220, 120, 160, 200].map((h, i) => (
          <div
            key={i}
            className="skeleton rounded-[var(--radius-lg)]"
            style={{ height: h }}
          />
        ))}
      </div>
    </div>
  );
}
