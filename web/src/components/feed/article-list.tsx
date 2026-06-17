import { ArticleCard } from "@/components/feed/article-card";
import type { Article, Source } from "../../../../generated/prisma/client";

type ArticleWithSource = Article & { source: Source };

export function ArticleList({ articles }: { articles: ArticleWithSource[] }) {
  if (articles.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-white px-6 py-12 text-center">
        <p className="text-lg font-medium">No articles yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Run seed, then ingest RSS feeds to populate the database.
        </p>
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
