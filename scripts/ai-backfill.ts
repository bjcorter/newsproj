import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client";
import {
  aiClassifyTopics,
  aiPickTopStory,
} from "../web/src/services/ai-classify";

// One-off backfill: AI-classify existing MISCELLANEOUS articles and pick an
// initial "story of the day", without waiting for the next ingest. Safe to
// re-run. Requires GEMINI_API_KEY; otherwise it no-ops gracefully.

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TOP_STORY_WINDOW_MS = 36 * 60 * 60 * 1000;
const TOP_STORY_CANDIDATES = 40;

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.log("GEMINI_API_KEY not set — nothing to backfill.");
    return;
  }

  // 1. Re-classify MISCELLANEOUS rows.
  const misc = await prisma.article.findMany({
    where: { topic: "MISCELLANEOUS" },
    select: { id: true, title: true, summary: true },
  });
  console.log(`Found ${misc.length} MISCELLANEOUS articles`);

  const aiTopics = await aiClassifyTopics(
    misc.map((a) => ({ id: a.id, title: a.title, summary: a.summary }))
  );

  let updated = 0;
  for (const [id, topic] of aiTopics) {
    await prisma.article.update({ where: { id }, data: { topic } });
    updated++;
  }
  console.log(`Reclassified ${updated} articles via AI`);

  // 2. Pick an initial top story from recent articles.
  const since = new Date(Date.now() - TOP_STORY_WINDOW_MS);
  let pool2 = await prisma.article.findMany({
    where: { publishedAt: { gte: since } },
    orderBy: { publishedAt: "desc" },
    take: TOP_STORY_CANDIDATES,
    include: { source: true },
  });
  if (!pool2.length) {
    pool2 = await prisma.article.findMany({
      orderBy: { publishedAt: "desc" },
      take: TOP_STORY_CANDIDATES,
      include: { source: true },
    });
  }

  const chosen = await aiPickTopStory(
    pool2.map((a) => ({
      id: a.id,
      title: a.title,
      summary: a.summary,
      source: a.source.name,
    }))
  );

  if (chosen) {
    await prisma.$transaction([
      prisma.article.updateMany({
        where: { isTopStory: true },
        data: { isTopStory: false },
      }),
      prisma.article.update({
        where: { id: chosen },
        data: { isTopStory: true },
      }),
    ]);
    const story = pool2.find((a) => a.id === chosen);
    console.log(`Top story set: ${story?.title ?? chosen}`);
  } else {
    console.log("No top story chosen (AI unavailable or declined).");
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
