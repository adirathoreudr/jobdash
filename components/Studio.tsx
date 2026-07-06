"use client";

import { useEffect, useState } from "react";
import type { JobData, Profile } from "@/lib/types";
import { ResumeUpload } from "@/components/ResumeUpload";
import { JobInput } from "@/components/JobInput";
import { GenerationDashboard } from "@/components/GenerationDashboard";
import { Badge, Button, Card } from "@/components/ui";

const LS_KEY = "jobdash:profile";

type Step = "loading" | "onboarding" | "job";

export function Studio() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [step, setStep] = useState<Step>("loading");
  const [job, setJob] = useState<JobData | null>(null);

  // Load the anchor resume: prefer the DB, fall back to a local cache.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        if (cancelled) return;
        if (data.profile) {
          setProfile(data.profile);
          setStep("job");
          return;
        }
      } catch {
        /* ignore — fall through to local cache */
      }
      const cached = readCache();
      if (!cancelled) {
        if (cached) {
          setProfile(cached);
          setStep("job");
        } else {
          setStep("onboarding");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function onParsed(p: Profile) {
    setProfile(p);
    writeCache(p);
    setStep("job");
  }

  function resetResume() {
    setProfile(null);
    setJob(null);
    clearCache();
    setStep("onboarding");
  }

  if (step === "loading") {
    return (
      <div className="mx-auto max-w-[var(--page-max)] px-5 pt-24">
        <div className="skeleton h-8 w-40 rounded-md" />
        <div className="skeleton mt-6 h-52 w-full rounded-[var(--radius-lg)]" />
      </div>
    );
  }

  if (step === "onboarding" || !profile) {
    return (
      <div className="mx-auto max-w-[var(--page-max)] px-5 pt-20 pb-32">
        <ResumeUpload onParsed={onParsed} />
      </div>
    );
  }

  // Has a profile, no job yet → job input stage.
  if (!job) {
    return (
      <div className="mx-auto max-w-[var(--page-max)] px-5 pt-16 pb-32">
        <ProfileSummary profile={profile} onReset={resetResume} compact />
        <div className="mt-10">
          <JobInput onJob={setJob} />
        </div>
      </div>
    );
  }

  // Has a profile + a job → generation dashboard.
  return (
    <div className="mx-auto max-w-[var(--page-max)] px-5 pt-16 pb-32">
      <JobSummary job={job} onChange={() => setJob(null)} />
      <div className="mt-8">
        {profile.structured ? (
          <GenerationDashboard
            resume={profile.structured}
            job={job}
            onStartAnother={() => setJob(null)}
          />
        ) : (
          <Card className="p-6 text-sm text-[var(--color-muted)]">
            Your resume couldn&apos;t be structured. Try replacing it.
          </Card>
        )}
      </div>
    </div>
  );
}

function JobSummary({
  job,
  onChange,
}: {
  job: JobData;
  onChange: () => void;
}) {
  return (
    <Card className="fade-up p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Badge tone="accent">Job read</Badge>
          <h3 className="mt-3 truncate text-lg font-semibold tracking-tight">
            {job.title}
          </h3>
          <p className="text-sm text-[var(--color-muted)]">
            {job.company}
            {job.location ? ` · ${job.location}` : ""}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onChange}>
          Change
        </Button>
      </div>
      {job.skills?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {job.skills.slice(0, 10).map((s) => (
            <Badge key={s}>{s}</Badge>
          ))}
        </div>
      )}
    </Card>
  );
}

function ProfileSummary({
  profile,
  onReset,
  compact = false,
}: {
  profile: Profile;
  onReset: () => void;
  compact?: boolean;
}) {
  const r = profile.structured;
  const skills = r?.skills?.slice(0, 8) ?? [];
  const roles = r?.experience?.length ?? 0;

  if (compact) {
    return (
      <div className="fade-up flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Badge tone="ok">Resume</Badge>
          <span className="truncate text-sm font-medium">
            {r?.name || profile.name || "Your resume"}
          </span>
          <span className="hidden text-xs text-[var(--color-faint)] sm:inline">
            · {r?.skills?.length ?? 0} skills · {roles} role
            {roles === 1 ? "" : "s"}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onReset}>
          Replace
        </Button>
      </div>
    );
  }

  return (
    <Card className="fade-up p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone="ok">Resume loaded</Badge>
            {profile.id === "local" && <Badge tone="warn">not saved</Badge>}
          </div>
          <h3 className="mt-3 text-lg font-semibold tracking-tight">
            {r?.name || profile.name || "Your resume"}
          </h3>
          {r?.headline && (
            <p className="text-sm text-[var(--color-muted)]">{r.headline}</p>
          )}
          <p className="mt-1 text-xs text-[var(--color-faint)]">
            {roles} role{roles === 1 ? "" : "s"} · {r?.skills?.length ?? 0}{" "}
            skills detected
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onReset}>
          Replace
        </Button>
      </div>
      {skills.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {skills.map((s) => (
            <Badge key={s}>{s}</Badge>
          ))}
          {(r?.skills?.length ?? 0) > 8 && (
            <span className="text-xs text-[var(--color-faint)]">
              +{(r?.skills?.length ?? 0) - 8} more
            </span>
          )}
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------- local cache ---- */

function readCache(): Profile | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}
function writeCache(p: Profile) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(p));
  } catch {
    /* ignore quota / privacy mode */
  }
}
function clearCache() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}
