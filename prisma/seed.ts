import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient, Bias } from "../generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const sources = [
  { name: "NPR", rssUrl: "https://feeds.npr.org/1001/rss.xml", homepageUrl: "https://www.npr.org", bias: Bias.LEFT },
  { name: "The Guardian US", rssUrl: "https://www.theguardian.com/us-news/rss", homepageUrl: "https://www.theguardian.com/us", bias: Bias.LEFT },
  { name: "PBS NewsHour", rssUrl: "https://www.pbs.org/newshour/feeds/rss/headlines", homepageUrl: "https://www.pbs.org/newshour", bias: Bias.CENTER },
  { name: "The Hill", rssUrl: "https://thehill.com/news/feed/", homepageUrl: "https://thehill.com", bias: Bias.CENTER },
  { name: "BBC News", rssUrl: "https://feeds.bbci.co.uk/news/rss.xml", homepageUrl: "https://www.bbc.com/news", bias: Bias.CENTER },
  { name: "Fox News", rssUrl: "https://moxie.foxnews.com/google-publisher/latest.xml", homepageUrl: "https://www.foxnews.com", bias: Bias.RIGHT },
  { name: "National Review", rssUrl: "https://www.nationalreview.com/feed/", homepageUrl: "https://www.nationalreview.com", bias: Bias.RIGHT },
];

async function main() {
  const rssUrls = sources.map((s) => s.rssUrl);

  for (const source of sources) {
    await prisma.source.upsert({
      where: { rssUrl: source.rssUrl },
      update: source,
      create: source,
    });
  }

  // Remove sources replaced by updated feed URLs (e.g. dead Reuters/AP links)
  const removed = await prisma.source.deleteMany({
    where: { rssUrl: { notIn: rssUrls } },
  });

  console.log(`Seeded ${sources.length} sources`);
  if (removed.count > 0) {
    console.log(`Removed ${removed.count} stale source(s)`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });