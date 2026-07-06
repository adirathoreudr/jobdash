import { NextRequest, NextResponse } from "next/server";
import { listApplications, updateApplicationStatus } from "@/lib/data";
import { hasDatabase } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["Applied", "Interview", "Offer", "Rejected"];

export async function GET() {
  if (!hasDatabase) {
    return NextResponse.json({ applications: [], hasDatabase: false });
  }
  try {
    const applications = await listApplications();
    return NextResponse.json({ applications, hasDatabase: true });
  } catch {
    return NextResponse.json({ applications: [], hasDatabase: false });
  }
}

// Update an application's status (drives the pipeline in /history).
export async function PATCH(req: NextRequest) {
  if (!hasDatabase) {
    return NextResponse.json(
      { error: "No database configured." },
      { status: 503 }
    );
  }
  let body: { id?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.id || !body.status || !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }
  try {
    await updateApplicationStatus(body.id, body.status);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}
