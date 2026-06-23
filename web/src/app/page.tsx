import { Suspense } from "react";
import { getArticles } from "@/services/articles";
import { parseArticleFilters, recordToSearchParams } from "@/lib/search-params";
import { Header } from "@/components/layout/header";
import { FeedFilters } from "@/components/feed/feed-filters";
import { ArticleList } from "@/components/feed/article-list";
import { RefreshButton } from "@/components/feed/refresh-button";
import { ARTICLE_PAGE_SIZE } from "@/types/article";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const filterParams = recordToSearchParams(resolved);
  const filters = parseArticleFilters(filterParams);
  const batch = await getArticles({
    ...filters,
    limit: ARTICLE_PAGE_SIZE + 1,
  });
  const hasMore = batch.length > ARTICLE_PAGE_SIZE;
  const articles = batch.slice(0, ARTICLE_PAGE_SIZE);

  const hasFilters =
    Boolean(filters.q) ||
    Boolean(filters.topic) ||
    Boolean(filters.excludeBiases?.length);

  return (
    <div className="min-h-full bg-background">
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-6">
        <Suspense fallback={null}>
          <FeedFilters />
        </Suspense>
        <div className="mb-6 flex justify-center">
          <RefreshButton />
        </div>
        <Suspense fallback={null}>
          <ArticleList
            key={filterParams.toString()}
            articles={articles}
            hasMore={hasMore}
            hasFilters={hasFilters}
          />
        </Suspense>
      </main>
    </div>
  );
}
