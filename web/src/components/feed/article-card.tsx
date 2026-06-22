import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArticleImage } from "@/components/feed/article-image";
import type { Bias } from "../../../../generated/prisma/client";
import type { ArticleWithSource } from "@/types/article";
import { TOPIC_LABELS } from "@/lib/topics";

const biasLabel: Record<Bias, string> = {
  LEFT: "Left",
  CENTER: "Center",
  RIGHT: "Right",
};

const biasClass: Record<Bias, string> = {
  LEFT: "bg-blue-100 text-blue-800",
  CENTER: "bg-zinc-200 text-zinc-800",
  RIGHT: "bg-red-100 text-red-800",
};

function formatRelativeTime(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ArticleCard({ article }: { article: ArticleWithSource }) {
  return (
    <Card>
      {article.imageUrl ? (
        <ArticleImage src={article.imageUrl} alt={article.title} />
      ) : null}
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="leading-snug">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {article.title}
            </a>
          </CardTitle>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge variant="outline">{TOPIC_LABELS[article.topic]}</Badge>
            <Badge className={biasClass[article.source.bias]}>
              {biasLabel[article.source.bias]}
            </Badge>
          </div>
        </div>
        <CardDescription>
          {article.source.name} · {formatRelativeTime(article.publishedAt)}
        </CardDescription>
      </CardHeader>
      {article.summary ? (
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {article.summary}
          </p>
        </CardContent>
      ) : null}
    </Card>
  );
}
