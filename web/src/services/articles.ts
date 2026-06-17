import { prisma } from "@/lib/db";
import type { Bias } from "../../../generated/prisma/client";

export async function getArticles(options?: {
  bias?: Bias;
  limit?: number;
}) {
  return prisma.article.findMany({
    where: options?.bias ? { source: { bias: options.bias } } : undefined,
    include: { source: true },
    orderBy: { publishedAt: "desc" },
    take: options?.limit ?? 20,
  });
}