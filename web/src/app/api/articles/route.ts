import { NextResponse, type NextRequest } from "next/server";
import { getArticles } from "@/services/articles";
import { parseArticleFilters } from "@/lib/search-params";
import { ARTICLE_PAGE_SIZE } from "@/types/article";

export async function GET(request: NextRequest) {
  const filters = parseArticleFilters(request.nextUrl.searchParams);
  const limit = filters.limit ?? ARTICLE_PAGE_SIZE;
  const rows = await getArticles({ ...filters, limit: limit + 1 });
  const hasMore = rows.length > limit;

  return NextResponse.json({
    articles: rows.slice(0, limit),
    hasMore,
  });
}
