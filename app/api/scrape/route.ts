import { NextRequest, NextResponse } from "next/server";
import { scrapeJobPage, BlockedError, isLikelyBlockedHost } from "@/lib/scrape";
import { chatJSON, isNvidiaConfigured } from "@/lib/nvidia";
import { JD_EXTRACT_SYSTEM, jdExtractUser } from "@/lib/prompts";
import type { JobData } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  let url: string | undefined;
  let text: string | undefined;
  try {
    const body = await req.json();
    url = typeof body.url === "string" ? body.url.trim() : undefined;
    text = typeof body.text === "string" ? body.text.trim() : undefined;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  let pageText = text;
  let sourceUrl: string | undefined;

  // Path A: a pasted description. Path B: scrape a URL.
  if (!pageText) {
    if (!url) {
      return NextResponse.json(
        { error: "Enter a job URL or paste the description." },
        { status: 400 }
      );
    }
    try {
      const scraped = await scrapeJobPage(url);
      pageText = scraped.text;
      sourceUrl = url;
    } catch (e) {
      if (e instanceof BlockedError) {
        return NextResponse.json(
          {
            needsPaste: true,
            reason: e.message,
            knownBlocked: isLikelyBlockedHost(url),
          },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { error: (e as Error).message || "Could not read that URL." },
        { status: 422 }
      );
    }
  }

  if (!pageText || pageText.length < 60) {
    return NextResponse.json(
      { error: "That description is too short to work with." },
      { status: 400 }
    );
  }

  // Structure the JD with Nemotron.
  let job: JobData;
  try {
    job = await chatJSON<JobData>(
      JD_EXTRACT_SYSTEM,
      jdExtractUser(pageText, sourceUrl),
      { temperature: 0.2, maxTokens: 2500 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Failed to read the job description." },
      { status: 502 }
    );
  }

  job.sourceUrl = sourceUrl;
  job.skills ??= [];
  if (!job.title) job.title = "Role";
  if (!job.company) job.company = "Unknown";

  return NextResponse.json({ job });
}
