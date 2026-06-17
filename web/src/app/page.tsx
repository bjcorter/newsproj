import { getArticles } from "@/services/articles";
import { Header } from "@/components/layout/header";
import { ArticleList } from "@/components/feed/article-list";

export default async function Home() {
  const articles = await getArticles();

  return (
    <div className="min-h-full bg-zinc-50">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <ArticleList articles={articles} />
      </main>
    </div>
  );
}