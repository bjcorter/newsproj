import { ArticleCard } from "@/components/feed/article-card";
import type { ArticleWithSource } from "@/types/article";

export function ArticleList({
  articles,
  hasFilters = false,
}: {
  articles: ArticleWithSource[];
  hasFilters?: boolean;
}) {
  if (articles.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-white px-6 py-12 text-center">
        {hasFilters ? (
          <>
            <p className="text-lg font-medium">No articles match your filters</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try a different keyword, change the topic, or re-enable a hidden
              bias.
            </p>
          </>
        ) : (
          <>
            <p className="text-lg font-medium">No articles yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Run seed, then ingest RSS feeds to populate the database.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {articles.map((article) => (
        <li key={article.id}>
          <ArticleCard article={article} />
        </li>
      ))}
    </ul>
  );
}
