import type {
  Article,
  Bias,
  Source,
  Topic,
} from "../../../generated/prisma/client";

// An article joined with its source — the shape the feed UI consumes.
export type ArticleWithSource = Article & { source: Source };

export type ArticleSort = "newest" | "oldest" | "title_asc" | "title_desc";

export type ArticleFilters = {
  q?: string; // free-text keyword (matches title or summary)
  topic?: Topic; // single topic filter
  excludeBiases?: Bias[]; // biases to hide from results
  sort?: ArticleSort; // result ordering
  limit?: number; // max rows
  page?: number; // reserved for future pagination
};

export const BIAS_VALUES: Bias[] = ["LEFT", "CENTER", "RIGHT"];

export const BIAS_LABELS: Record<Bias, string> = {
  LEFT: "Left",
  CENTER: "Center",
  RIGHT: "Right",
};

export const ARTICLE_SORTS: { value: ArticleSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "title_asc", label: "Title A–Z" },
  { value: "title_desc", label: "Title Z–A" },
];

export function isBias(value: string): value is Bias {
  return (BIAS_VALUES as string[]).includes(value);
}

export function isArticleSort(value: string): value is ArticleSort {
  return ARTICLE_SORTS.some((s) => s.value === value);
}
