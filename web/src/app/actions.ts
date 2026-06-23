"use server";

import { revalidatePath } from "next/cache";
import { ingestAllSources } from "@/services/rss-ingest";

// Minimum time between ingests. Authoritative guard lives here so direct action
// calls are throttled too, not just clicks through the UI button.
const COOLDOWN_MS = 10 * 60 * 1000;

// Module-level timestamp. Persists for the life of a server instance; on a cold
// start it resets, which at worst allows one extra run — acceptable for this use.
let lastRunAt = 0;

type RefreshResult =
  | {
      status: "ok";
      cooldownMs: number;
      sourcesProcessed: number;
      sourcesSucceeded: number;
      articlesUpserted: number;
    }
  | { status: "cooldown"; retryAfterMs: number };

/**
 * Server Action: pull the latest articles from every source, then revalidate the
 * home feed. Enforces a cooldown so ingestion can't be hammered. Runs entirely on
 * the server, so no ingest secret is exposed to the client.
 */
export async function refreshArticles(): Promise<RefreshResult> {
  const now = Date.now();
  const elapsed = now - lastRunAt;
  if (elapsed < COOLDOWN_MS) {
    return { status: "cooldown", retryAfterMs: COOLDOWN_MS - elapsed };
  }

  // Reserve the slot before the (slow) ingest so concurrent clicks can't both run.
  lastRunAt = now;
  try {
    const result = await ingestAllSources();
    revalidatePath("/");
    return {
      status: "ok",
      cooldownMs: COOLDOWN_MS,
      sourcesProcessed: result.sourcesProcessed,
      sourcesSucceeded: result.sourcesSucceeded,
      articlesUpserted: result.articlesUpserted,
    };
  } catch (err) {
    // Let the user retry promptly if the run failed.
    lastRunAt = 0;
    throw err;
  }
}
