import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client";
import { classifyTopic } from "../web/src/services/classify-topic";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const articles = await prisma.article.findMany({
    select: { id: true, title: true, summary: true },
  });

  const counts: Record<string, number> = {};
  let updated = 0;

  for (const article of articles) {
    const topic = classifyTopic(article.title, article.summary);
    counts[topic] = (counts[topic] ?? 0) + 1;
    await prisma.article.update({
      where: { id: article.id },
      data: { topic },
    });
    updated++;
  }

  console.log(`Retagged ${updated} articles`);
  console.table(counts);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
