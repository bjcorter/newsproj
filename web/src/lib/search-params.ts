import type { Bias } from "../../../generated/prisma/client";
import {
  ARTICLE_PAGE_SIZE,
  isArticleSort,
  isBias,
  type ArticleFilters,
} from "@/types/article";
import { isTopic } from "@/lib/topics";

/**
 * Parse URL search params into a validated ArticleFilters object.
 * Invalid enum values (topic/sort/bias) are silently dropped so a malformed
 * URL never throws — it just falls back to defaults.
 *
 * Supports excludeBias as either repeated params (?excludeBias=LEFT&excludeBias=RIGHT)
 * or a comma-separated list (?excludeBias=LEFT,RIGHT).
 */
export function parseArticleFilters(params: URLSearchParams): ArticleFilters {
  const filters: ArticleFilters = {};

  const q = params.get("q")?.trim();
  if (q) filters.q = q;

  const topic = params.get("topic")?.toUpperCase();
  if (topic && isTopic(topic)) filters.topic = topic;

  const sort = params.get("sort")?.toLowerCase();
  if (sort && isArticleSort(sort)) filters.sort = sort;

  const rawBiases = params
    .getAll("excludeBias")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim().toUpperCase())
    .filter((value) => value.length > 0);

  const excludeBiases = Array.from(new Set(rawBiases)).filter(isBias) as Bias[];
  if (excludeBiases.length) filters.excludeBiases = excludeBiases;

  const pageRaw = params.get("page");
  if (pageRaw) {
    const page = Number.parseInt(pageRaw, 10);
    if (page > 0) filters.page = page;
  }

  const limitRaw = params.get("limit");
  if (limitRaw) {
    const limit = Number.parseInt(limitRaw, 10);
    if (limit > 0 && limit <= 100) filters.limit = limit;
  }

  return filters;
}

/** Search params for the next infinite-scroll fetch (preserves filters). */
export function buildArticlesApiParams(
  searchParams: URLSearchParams,
  page: number
): URLSearchParams {
  const filters = parseArticleFilters(searchParams);
  const params = buildArticleSearchParams(filters);
  params.set("page", String(page));
  params.set("limit", String(ARTICLE_PAGE_SIZE));
  return params;
}

/**
 * Build a URLSearchParams from filters — used by the client filter bar to push
 * a new URL. Omits empty/default values to keep URLs clean.
 */
export function buildArticleSearchParams(
  filters: ArticleFilters
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.topic) params.set("topic", filters.topic);
  if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.excludeBiases && filters.excludeBiases.length) {
    params.set("excludeBias", filters.excludeBiases.join(","));
  }

  return params;
}

/**
 * Convert the Next.js App Router `searchParams` record into URLSearchParams so
 * the same parser works for both server pages and the API route.
 */
export function recordToSearchParams(
  record: Record<string, string | string[] | undefined>
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, v);
    } else {
      params.append(key, value);
    }
  }
  return params;
}
