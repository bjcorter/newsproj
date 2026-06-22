import { NextResponse, type NextRequest } from "next/server";
import { ingestAllSources } from "@/services/rss-ingest";

// Ingest fetches 7 feeds, classifies, extracts images, and upserts ~160 rows,
// which can exceed the default serverless timeout.
export const maxDuration = 60;

// Manual trigger: POST with the shared secret header.
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-ingest-secret");
  if (secret !== process.env.INGEST_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await ingestAllSources());
}

// Scheduled trigger: Vercel Cron sends a GET with `Authorization: Bearer <CRON_SECRET>`.
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await ingestAllSources());
}
