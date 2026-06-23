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
      <div className="border-y-2 border-foreground px-6 py-16 text-center">
        {hasFilters ? (
          <>
            <p className="font-heading text-2xl font-bold">
              No dispatches match your search.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try a different keyword, change the topic, or restore a hidden
              column.
            </p>
          </>
        ) : (
          <>
            <p className="font-heading text-2xl font-bold">
              The presses are warming up.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Run the seed, then ingest the wires to fill this edition.
            </p>
          </>
        )}
      </div>
    );
  }

  const [lead, ...rest] = articles;

  return (
    <div>
      <ArticleCard article={lead} featured />

      {rest.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((article) => (
            <div
              key={article.id}
              className="border-t border-foreground/30 py-5 md:px-5 lg:border-l lg:border-foreground/20 lg:[&:nth-child(3n+1)]:border-l-0 lg:[&:nth-child(3n+1)]:pl-0 lg:[&:nth-child(3n+1)]:pr-5"
            >
              <ArticleCard article={article} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
