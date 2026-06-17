import { NextResponse } from "next/server";
import { ingestAllSources } from "@/services/rss-ingest";

export async function POST(request: Request) {
  const secret = request.headers.get("x-ingest-secret");
  if (secret !== process.env.INGEST_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await ingestAllSources();
  return NextResponse.json(result);
}