import { NextRequest, NextResponse } from "next/server";
import { extractPdfText } from "@/lib/pdf";
import { chatJSON, isNvidiaConfigured } from "@/lib/nvidia";
import { RESUME_STRUCTURE_SYSTEM, resumeStructureUser } from "@/lib/prompts";
import { saveProfile } from "@/lib/data";
import { hasDatabase } from "@/lib/prisma";
import type { ResumeData } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

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

  let file: File | null = null;
  try {
    const form = await req.formData();
    const entry = form.get("resume");
    if (entry instanceof File) file = entry;
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json(
      { error: "No resume file was provided." },
      { status: 400 }
    );
  }
  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return NextResponse.json(
      { error: "Please upload a PDF file." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "That PDF is larger than 8 MB." },
      { status: 400 }
    );
  }

  // 1. Extract text.
  let rawText = "";
  try {
    rawText = await extractPdfText(await file.arrayBuffer());
  } catch {
    return NextResponse.json(
      { error: "Could not read that PDF. Is it a valid, text-based resume?" },
      { status: 422 }
    );
  }
  if (rawText.replace(/\s/g, "").length < 80) {
    return NextResponse.json(
      {
        error:
          "This PDF has almost no extractable text — it may be a scanned image. Please upload a text-based resume.",
      },
      { status: 422 }
    );
  }

  // 2. Structure it with Nemotron.
  let structured: ResumeData;
  try {
    structured = await chatJSON<ResumeData>(
      RESUME_STRUCTURE_SYSTEM,
      resumeStructureUser(rawText),
      { temperature: 0.1, maxTokens: 3500 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Failed to parse the resume." },
      { status: 502 }
    );
  }
  // Defensive defaults so the UI never crashes on a partial parse.
  structured.skills ??= [];
  structured.experience ??= [];
  structured.education ??= [];

  // 3. Persist (best-effort; app still works without a DB).
  let persisted = false;
  let profileId = "local";
  if (hasDatabase) {
    try {
      const saved = await saveProfile({
        name: structured.name ?? null,
        email: structured.email ?? null,
        rawText,
        structured,
      });
      persisted = true;
      profileId = saved.id;
    } catch {
      persisted = false;
    }
  }

  return NextResponse.json({
    persisted,
    profile: {
      id: profileId,
      name: structured.name ?? null,
      email: structured.email ?? null,
      rawText,
      structured,
      updatedAt: new Date().toISOString(),
    },
  });
}
