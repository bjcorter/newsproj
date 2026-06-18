import { Suspense } from "react";
import { getArticles } from "@/services/articles";
import { parseArticleFilters, recordToSearchParams } from "@/lib/search-params";
import { Header } from "@/components/layout/header";
import { FeedFilters } from "@/components/feed/feed-filters";
import { ArticleList } from "@/components/feed/article-list";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const filters = parseArticleFilters(recordToSearchParams(resolved));
  const articles = await getArticles(filters);

  const hasFilters =
    Boolean(filters.q) ||
    Boolean(filters.topic) ||
    Boolean(filters.excludeBiases?.length);

  return (
    <div className="min-h-full bg-zinc-50">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Suspense fallback={null}>
          <FeedFilters />
        </Suspense>
        <ArticleList articles={articles} hasFilters={hasFilters} />
      </main>
    </div>
  );
}
