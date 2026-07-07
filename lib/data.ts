import { prisma } from "@/lib/prisma";
import type {
  ApplicationRecord,
  Artifacts,
  Profile,
  ResumeData,
} from "@/lib/types";
import { Prisma } from "@prisma/client";

/* --------------------------------------------------------------- Profile */

/** The single anchor resume (most recently saved). */
export async function getProfile(): Promise<Profile | null> {
  const row = await prisma.profile.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    rawText: row.rawText,
    structured: (row.structured as ResumeData | null) ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function saveProfile(input: {
  name?: string | null;
  email?: string | null;
  rawText: string;
  structured: ResumeData;
}): Promise<Profile> {
  // Single-user app: replace any existing profile so there's one anchor.
  const existing = await prisma.profile.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  const data = {
    name: input.name ?? null,
    email: input.email ?? null,
    rawText: input.rawText,
    structured: input.structured as unknown as Prisma.InputJsonValue,
  };
  const row = existing
    ? await prisma.profile.update({ where: { id: existing.id }, data })
    : await prisma.profile.create({ data });
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    rawText: row.rawText,
    structured: (row.structured as ResumeData | null) ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/* ----------------------------------------------------------- Applications */

export async function listApplications(): Promise<ApplicationRecord[]> {
  const rows = await prisma.application.findMany({
    orderBy: { appliedAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    company: r.company,
    role: r.role,
    url: r.url,
    status: r.status,
    fitScore: r.fitScore,
    notionPageId: r.notionPageId,
    appliedAt: r.appliedAt.toISOString(),
  }));
}

export async function createApplication(input: {
  company: string;
  role: string;
  url?: string | null;
  jdSnapshot: string;
  fitScore?: number | null;
  generated?: Artifacts | null;
  notionPageId?: string | null;
}) {
  return prisma.application.create({
    data: {
      company: input.company,
      role: input.role,
      url: input.url ?? null,
      jdSnapshot: input.jdSnapshot,
      fitScore: input.fitScore ?? null,
      generated: (input.generated as unknown as Prisma.InputJsonValue) ?? undefined,
      notionPageId: input.notionPageId ?? null,
    },
  });
}

export async function updateApplicationStatus(id: string, status: string) {
  return prisma.application.update({ where: { id }, data: { status } });
}

/** Look up a cached generation for a job URL (avoids re-billing the LLM). */
export async function findCachedByUrl(url: string) {
  if (!url) return null;
  const row = await prisma.application.findFirst({
    where: { url, NOT: { generated: { equals: Prisma.JsonNull } } },
    orderBy: { createdAt: "desc" },
  });
  return row;
}
