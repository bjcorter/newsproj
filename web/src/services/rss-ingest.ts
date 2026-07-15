import Parser from "rss-parser";
import { prisma } from "../lib/db";
import { classifyTopic } from "./classify-topic";

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

export async function ingestAllSources() {
  const sources = await prisma.source.findMany();
  let articlesUpserted = 0;
  const failures: { name: string; rssUrl: string; error: string }[] = [];

  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.rssUrl);
      for (const item of feed.items ?? []) {
        if (!item.link || !item.title) continue;
        const summary =
          item.contentSnippet ?? item.content?.slice(0, 500) ?? null;
        const topic = classifyTopic(item.title, summary);
        const imageUrl = extractImage(item);
        await prisma.article.upsert({
          where: { url: item.link },
          update: { topic, imageUrl },
          create: {
            title: item.title,
            url: item.link,
            summary,
            publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
            sourceId: source.id,
            topic,
            imageUrl,
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
