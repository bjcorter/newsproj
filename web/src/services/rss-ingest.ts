import Parser from "rss-parser";
import { prisma } from "../lib/db";

const parser = new Parser();

export async function ingestAllSources() {
  const sources = await prisma.source.findMany();
  let articlesUpserted = 0;
  const failures: { name: string; rssUrl: string; error: string }[] = [];

  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.rssUrl);
      for (const item of feed.items ?? []) {
        if (!item.link || !item.title) continue;
        await prisma.article.upsert({
          where: { url: item.link },
          update: {},
          create: {
            title: item.title,
            url: item.link,
            summary: item.contentSnippet ?? item.content?.slice(0, 500) ?? null,
            publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
            sourceId: source.id,
          },
        });
        articlesUpserted++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Failed: ${source.name} (${source.rssUrl}) — ${message}`);
      failures.push({ name: source.name, rssUrl: source.rssUrl, error: message });
    }
  }

  return {
    sourcesProcessed: sources.length,
    sourcesSucceeded: sources.length - failures.length,
    articlesUpserted,
    failures,
  };
}
