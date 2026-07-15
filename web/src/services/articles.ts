import { prisma } from "@/lib/db";
import type { Prisma } from "../../../generated/prisma/client";
import type {
  ArticleFilters,
  ArticleSort,
  ArticleWithSource,
} from "@/types/article";

const sortMap: Record<ArticleSort, Prisma.ArticleOrderByWithRelationInput> = {
  newest: { publishedAt: "desc" },
  oldest: { publishedAt: "asc" },
  title_asc: { title: "asc" },
  title_desc: { title: "desc" },
};

export async function getArticles(
  filters: ArticleFilters = {}
): Promise<ArticleWithSource[]> {
  const {
    q,
    topic,
    excludeBiases,
    sort = "newest",
    limit = 20,
    page = 1,
  } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.ArticleWhereInput = {
    ...(topic ? { topic } : {}),
    ...(excludeBiases && excludeBiases.length
      ? { source: { bias: { notIn: excludeBiases } } }
      : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { summary: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  return prisma.article.findMany({
    where,
    include: { source: true },
    orderBy: sortMap[sort],
    skip,
    take: limit,
  });
}
