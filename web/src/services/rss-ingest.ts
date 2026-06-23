import Parser from "rss-parser";
import type { Topic } from "../../../generated/prisma/client";
import { prisma } from "../lib/db";
import { scoreTopics, topTopic, isLowConfidence } from "./classify-topic";
import { aiClassifyTopics, aiPickTopStory } from "./ai-classify";

// Image data lives in namespaced tags rss-parser ignores by default, so we map
// the common ones (Media RSS) onto plain item properties.
type MediaNode = { $?: { url?: string; medium?: string; type?: string } };

type FeedItem = Parser.Item & {
  mediaThumbnail?: MediaNode;
  mediaContent?: MediaNode | MediaNode[];
  "content:encoded"?: string;
};

const parser: Parser<unknown, FeedItem> = new Parser({
  customFields: {
    item: [
      ["media:thumbnail", "mediaThumbnail"],
      ["media:content", "mediaContent", { keepArray: true }],
    ],
  },
});

function isImageUrl(url: string | undefined): url is string {
  return Boolean(url) && /^https?:\/\//i.test(url as string);
}

/**
 * Pull the best available image for a feed item, trying the most reliable
 * sources first. Returns null when the item has no usable image.
 */
function extractImage(item: FeedItem): string | null {
  // 1. <enclosure> (NPR, PBS) — only when it's actually an image
  if (
    isImageUrl(item.enclosure?.url) &&
    (item.enclosure?.type?.startsWith("image") ?? true)
  ) {
    return item.enclosure!.url!;
  }

  // 2. <media:thumbnail> (BBC)
  if (isImageUrl(item.mediaThumbnail?.$?.url)) {
    return item.mediaThumbnail!.$!.url!;
  }

  // 3. <media:content> (Guardian, Fox) — may be a single node or an array
  const mediaNodes = Array.isArray(item.mediaContent)
    ? item.mediaContent
    : item.mediaContent
      ? [item.mediaContent]
      : [];
  const imageNode = mediaNodes.find(
    (node) =>
      node?.$?.medium === "image" ||
      node?.$?.type?.startsWith("image") ||
      isImageUrl(node?.$?.url)
  );
  if (isImageUrl(imageNode?.$?.url)) {
    return imageNode!.$!.url!;
  }

  // 4. First <img> in the HTML body (The Hill, National Review)
  const html = item["content:encoded"] ?? item.content ?? "";
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (isImageUrl(match?.[1])) {
    return match![1];
  }

  return null;
}

type ParsedItem = {
  url: string;
  title: string;
  summary: string | null;
  imageUrl: string | null;
  publishedAt: Date;
  sourceId: string;
  keywordTopic: Topic;
  uncertain: boolean;
};

// How far back to look for "story of the day" candidates.
const TOP_STORY_WINDOW_MS = 36 * 60 * 60 * 1000;
const TOP_STORY_CANDIDATES = 40;

export async function ingestAllSources() {
  const sources = await prisma.source.findMany();
  const failures: { name: string; rssUrl: string; error: string }[] = [];
  const parsed: ParsedItem[] = [];

  // 1. Parse every feed and score each item with the keyword classifier.
  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.rssUrl);
      for (const item of feed.items ?? []) {
        if (!item.link || !item.title) continue;
        const summary =
          item.contentSnippet ?? item.content?.slice(0, 500) ?? null;
        const scores = scoreTopics(item.title, summary);
        parsed.push({
          url: item.link,
          title: item.title,
          summary,
          imageUrl: extractImage(item),
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          sourceId: source.id,
          keywordTopic: topTopic(scores),
          uncertain: isLowConfidence(scores),
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Failed: ${source.name} (${source.rssUrl}) — ${message}`);
      failures.push({ name: source.name, rssUrl: source.rssUrl, error: message });
    }
  }

  // 2. Let the LLM resolve the items the keyword scorer was unsure about.
  // Keyed by URL since rows aren't created yet. Fails soft (empty map).
  const uncertain = parsed.filter((p) => p.uncertain);
  const aiTopics = await aiClassifyTopics(
    uncertain.map((p) => ({ id: p.url, title: p.title, summary: p.summary }))
  );

  // 3. Upsert everything with the final topic (URL-unique, so no duplicates).
  let articlesUpserted = 0;
  for (const p of parsed) {
    const topic = aiTopics.get(p.url) ?? p.keywordTopic;
    await prisma.article.upsert({
      where: { url: p.url },
      update: { topic, imageUrl: p.imageUrl },
      create: {
        title: p.title,
        url: p.url,
        summary: p.summary,
        publishedAt: p.publishedAt,
        sourceId: p.sourceId,
        topic,
        imageUrl: p.imageUrl,
      },
    });
    articlesUpserted++;
  }

  // 4. Pick the "story of the day" from recent articles and flag it.
  const topStoryId = await selectTopStory();

  return {
    sourcesProcessed: sources.length,
    sourcesSucceeded: sources.length - failures.length,
    articlesUpserted,
    aiClassified: aiTopics.size,
    topStoryId,
    failures,
  };
}

/**
 * Choose and flag the daily top story. Returns the chosen article id, or null
 * if AI is unavailable/declined (in which case the previous flag is left as-is).
 */
async function selectTopStory(): Promise<string | null> {
  try {
    const since = new Date(Date.now() - TOP_STORY_WINDOW_MS);
    let pool = await prisma.article.findMany({
      where: { publishedAt: { gte: since } },
      orderBy: { publishedAt: "desc" },
      take: TOP_STORY_CANDIDATES,
      include: { source: true },
    });
    // Fall back to the newest articles if nothing is recent enough.
    if (!pool.length) {
      pool = await prisma.article.findMany({
        orderBy: { publishedAt: "desc" },
        take: TOP_STORY_CANDIDATES,
        include: { source: true },
      });
    }
    if (!pool.length) return null;

    const chosen = await aiPickTopStory(
      pool.map((a) => ({
        id: a.id,
        title: a.title,
        summary: a.summary,
        source: a.source.name,
      }))
    );
    if (!chosen) return null;

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
    return chosen;
  } catch (err) {
    console.error("Top story selection failed:", err);
    return null;
  }
}
