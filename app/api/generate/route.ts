import { NextRequest, NextResponse } from "next/server";
import { chatJSON, isNvidiaConfigured } from "@/lib/nvidia";
import { findCachedByUrl } from "@/lib/data";
import { hasDatabase } from "@/lib/prisma";
import {
  TAILOR_SYSTEM,
  OUTREACH_SYSTEM,
  generationUser,
} from "@/lib/prompts";
import type {
  Artifacts,
  InterviewQuestion,
  JobData,
  ResumeData,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

type TailorOut = Pick<Artifacts, "tailoredResume" | "resumeChangeNotes" | "fit">;
type OutreachOut = Pick<
  Artifacts,
  "coverLetter" | "followUpEmail" | "interviewQuestions" | "uniquePitch"
>;

export async function POST(req: NextRequest) {
  if (!isNvidiaConfigured()) {
    return NextResponse.json(
      {
        error:
          "NVIDIA_API_KEY is not set. Add it to .env.local (free key at build.nvidia.com) and restart.",
      },
      { status: 503 }
    );
  }

  let resume: ResumeData;
  let job: JobData;
  let force = false;
  try {
    const body = await req.json();
    resume = body.resume;
    job = body.job;
    force = Boolean(body.force);
    if (!resume || !job) throw new Error("missing");
  } catch {
    return NextResponse.json(
      { error: "A resume and a job are both required." },
      { status: 400 }
    );
  }

  // Per-URL cache: if this job was already generated (and logged), reuse it
  // instead of re-billing the LLM. Pass { force: true } to regenerate.
  if (!force && job.sourceUrl && hasDatabase) {
    try {
      const cached = await findCachedByUrl(job.sourceUrl);
      if (cached?.generated) {
        return NextResponse.json({
          artifacts: cached.generated as unknown as Artifacts,
          cached: true,
        });
      }
    } catch {
      /* cache is best-effort */
    }
  }

  const user = generationUser(resume, job);

  try {
    // Two focused calls in parallel: (1) tailored resume + fit, (2) outreach.
    const [tailor, outreach] = await Promise.all([
      chatJSON<TailorOut>(TAILOR_SYSTEM, user, {
        temperature: 0.35,
        maxTokens: 4500,
      }),
      chatJSON<OutreachOut>(OUTREACH_SYSTEM, user, {
        temperature: 0.55,
        maxTokens: 3500,
      }),
    ]);

    const artifacts = normalise(tailor, outreach, resume, job);
    return NextResponse.json({ artifacts });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Generation failed. Please try again." },
      { status: 502 }
    );
  }
}

/** Harden the model output so the UI can rely on shapes. */
function normalise(
  tailor: TailorOut,
  outreach: OutreachOut,
  baseline: ResumeData,
  job: JobData
): Artifacts {
  const tailoredResume: ResumeData = {
    ...baseline,
    ...tailor.tailoredResume,
    skills: tailor.tailoredResume?.skills ?? baseline.skills ?? [],
    experience:
      tailor.tailoredResume?.experience ?? baseline.experience ?? [],
    education: tailor.tailoredResume?.education ?? baseline.education ?? [],
  };

  // Exactly 7 interview questions.
  let questions: InterviewQuestion[] = Array.isArray(outreach.interviewQuestions)
    ? outreach.interviewQuestions.filter((q) => q && q.question)
    : [];
  questions = questions.slice(0, 7).map((q) => ({
    question: q.question,
    strategy: Array.isArray(q.strategy) ? q.strategy : [],
  }));

  const score = clampScore(tailor.fit?.score);

  return {
    tailoredResume,
    resumeChangeNotes: Array.isArray(tailor.resumeChangeNotes)
      ? tailor.resumeChangeNotes
      : [],
    coverLetter: outreach.coverLetter ?? "",
    followUpEmail: {
      subject: outreach.followUpEmail?.subject ?? `Re: ${job.title}`,
      body: outreach.followUpEmail?.body ?? "",
    },
    interviewQuestions: questions,
    uniquePitch: outreach.uniquePitch ?? "",
    fit: {
      score,
      matchedSkills: tailor.fit?.matchedSkills ?? [],
      missingKeywords: tailor.fit?.missingKeywords ?? [],
      summary: tailor.fit?.summary ?? "",
    },
  };
}

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}
