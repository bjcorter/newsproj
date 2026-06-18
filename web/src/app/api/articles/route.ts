import { NextResponse, type NextRequest } from "next/server";
import { getArticles } from "@/services/articles";
import { parseArticleFilters } from "@/lib/search-params";

export async function GET(request: NextRequest) {
  const filters = parseArticleFilters(request.nextUrl.searchParams);
  const articles = await getArticles(filters);
  return NextResponse.json({ count: articles.length, filters, articles });
}
