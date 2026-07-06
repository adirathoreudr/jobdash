import { NextRequest, NextResponse } from "next/server";
import { createApplication } from "@/lib/data";
import { createApplicationPage, isNotionConfigured } from "@/lib/notion";
import { hasDatabase } from "@/lib/prisma";
import type { Artifacts } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let body: {
    company?: string;
    role?: string;
    url?: string | null;
    jdSnapshot?: string;
    fitScore?: number | null;
    generated?: Artifacts | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const company = (body.company || "").trim();
  const role = (body.role || "").trim();
  if (!company || !role) {
    return NextResponse.json(
      { error: "Company and role are required." },
      { status: 400 }
    );
  }

  // 1. Notion sync (best-effort, optional).
  const notion = await createApplicationPage({
    company,
    role,
    url: body.url ?? null,
    status: "Applied",
  });

  // 2. Persist locally (best-effort).
  let persisted = false;
  let id: string | null = null;
  if (hasDatabase) {
    try {
      const row = await createApplication({
        company,
        role,
        url: body.url ?? null,
        jdSnapshot: body.jdSnapshot || "",
        fitScore: body.fitScore ?? null,
        generated: body.generated ?? null,
        notionPageId: notion.pageId ?? null,
      });
      persisted = true;
      id = row.id;
    } catch {
      persisted = false;
    }
  }

  return NextResponse.json({
    id,
    persisted,
    notion: {
      configured: isNotionConfigured(),
      synced: notion.synced,
      reason: notion.reason,
    },
  });
}
