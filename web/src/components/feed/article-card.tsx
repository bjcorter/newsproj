import { ArticleImage } from "@/components/feed/article-image";
import { RelativeTime } from "@/components/feed/relative-time";
import type { Bias } from "../../../../generated/prisma/client";
import type { ArticleWithSource } from "@/types/article";
import { TOPIC_LABELS } from "@/lib/topics";
import { cn } from "@/lib/utils";

const biasLabel: Record<Bias, string> = {
  LEFT: "Left",
  CENTER: "Center",
  RIGHT: "Right",
};

// Muted, vintage ink tones — keep the meaning, lose the candy-colored pill.
const biasDot: Record<Bias, string> = {
  LEFT: "bg-[#3a5570]",
  CENTER: "bg-[#7a736a]",
  RIGHT: "bg-[#7a3030]",
};

function BiasCue({ bias }: { bias: Bias }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn("inline-block size-2 shrink-0", biasDot[bias])}
        aria-hidden
      />
      {biasLabel[bias]}
    </span>
  );
}

export function ArticleCard({
  article,
  featured = false,
}: {
  article: ArticleWithSource;
  featured?: boolean;
}) {
  const kicker = TOPIC_LABELS[article.topic];
  const dateline = (
    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground">
      <span>{article.source.name}</span>
      <span aria-hidden>&middot;</span>
      <RelativeTime date={article.publishedAt} />
      <span aria-hidden>&middot;</span>
      <BiasCue bias={article.source.bias} />
    </p>
  );

  if (featured) {
    const featuredKicker = article.isTopStory ? "Top Story!" : kicker;
    return (
      <article className="border-b-2 border-foreground pb-6">
        <p className="text-center text-[0.7rem] font-bold uppercase tracking-[0.3em] text-muted-foreground">
          {featuredKicker}
        </p>
        <h2 className="mx-auto mt-2 max-w-3xl text-center font-heading text-3xl font-bold leading-tight sm:text-5xl">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {article.title}
          </a>
        </h2>
        <div className="flex justify-center">{dateline}</div>

        {article.imageUrl ? (
          <div className="mt-5">
            <ArticleImage
              src={article.imageUrl}
              alt={article.title}
              caption={article.source.name}
              className="aspect-[21/9]"
            />
          </div>
        ) : null}

        {article.summary ? (
          <p className="mt-5 text-justify text-base leading-relaxed text-foreground/85 first-letter:float-left first-letter:mr-2 first-letter:font-heading first-letter:text-6xl first-letter:font-bold first-letter:leading-[0.7] sm:columns-2 sm:gap-8">
            {article.summary}
          </p>
        ) : null}
      </article>
    );
  }

  return (
    <article>
      {article.imageUrl ? (
        <ArticleImage
          src={article.imageUrl}
          alt={article.title}
          className="mb-3 aspect-[16/9]"
        />
      ) : null}
      <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {kicker}
      </p>
      <h3 className="mt-1 font-heading text-lg font-bold leading-snug">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          {article.title}
        </a>
      </h3>
      {dateline}
      {article.summary ? (
        <p className="mt-2 line-clamp-4 text-justify text-sm leading-relaxed text-foreground/80">
          {article.summary}
        </p>
      ) : null}
    </article>
  );
}
