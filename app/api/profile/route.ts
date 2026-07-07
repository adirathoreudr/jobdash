import { NextResponse } from "next/server";
import { getProfile } from "@/lib/data";
import { hasDatabase } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns the saved anchor resume, or null. Never throws on a missing/broken DB
// so the app still loads (the client falls back to its localStorage cache).
export async function GET() {
  if (!hasDatabase) {
    return NextResponse.json({ profile: null, persisted: false });
  }
  try {
    const profile = await getProfile();
    return NextResponse.json({ profile, persisted: true });
  } catch {
    return NextResponse.json({ profile: null, persisted: false });
  }
}
