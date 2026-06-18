"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TOPIC_VALUES, TOPIC_LABELS } from "@/lib/topics";
import { ARTICLE_SORTS, BIAS_VALUES, BIAS_LABELS } from "@/types/article";

const ALL_TOPICS = "ALL";

export function FeedFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The search box is uncontrolled and the URL `q` param is the source of truth.
  // The `key={queryValue}` on the input resets it whenever the URL changes
  // (e.g. "Clear filters"), avoiding a setState-in-effect sync.
  const queryValue = searchParams.get("q") ?? "";

  const currentTopic = searchParams.get("topic")?.toUpperCase() ?? ALL_TOPICS;
  const currentSort = searchParams.get("sort")?.toLowerCase() ?? "newest";
  const excluded = new Set(
    searchParams
      .getAll("excludeBias")
      .flatMap((v) => v.split(","))
      .map((v) => v.trim().toUpperCase())
      .filter(Boolean)
  );

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }

  function onSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    pushParams((params) => {
      if (value) params.set("q", value);
      else params.delete("q");
    });
  }

  function onTopicChange(value: string) {
    pushParams((params) => {
      if (value === ALL_TOPICS) params.delete("topic");
      else params.set("topic", value);
    });
  }

  function onSortChange(value: string) {
    pushParams((params) => {
      if (value === "newest") params.delete("sort");
      else params.set("sort", value);
    });
  }

  function toggleBias(bias: string) {
    const next = new Set(excluded);
    if (next.has(bias)) next.delete(bias);
    else next.add(bias);
    pushParams((params) => {
      params.delete("excludeBias");
      if (next.size) params.set("excludeBias", Array.from(next).join(","));
    });
  }

  const hasActiveFilters =
    Boolean(searchParams.get("q")) ||
    Boolean(searchParams.get("topic")) ||
    Boolean(searchParams.get("sort")) ||
    excluded.size > 0;

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-xl border bg-white p-4">
      <form onSubmit={onSearchSubmit} className="flex gap-2">
        <Input
          key={queryValue}
          name="q"
          type="search"
          placeholder="Search articles by keyword..."
          defaultValue={queryValue}
        />
        <Button type="submit">Search</Button>
      </form>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Topic</span>
          <Select value={currentTopic} onValueChange={onTopicChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TOPICS}>All topics</SelectItem>
              {TOPIC_VALUES.map((topic) => (
                <SelectItem key={topic} value={topic}>
                  {TOPIC_LABELS[topic]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort</span>
          <Select value={currentSort} onValueChange={onSortChange}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ARTICLE_SORTS.map((sort) => (
                <SelectItem key={sort.value} value={sort.value}>
                  {sort.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show</span>
          {BIAS_VALUES.map((bias) => {
            const shown = !excluded.has(bias);
            return (
              <Button
                key={bias}
                type="button"
                size="sm"
                variant={shown ? "default" : "outline"}
                aria-pressed={shown}
                onClick={() => toggleBias(bias)}
                className={shown ? "" : "opacity-60 line-through"}
              >
                {BIAS_LABELS[bias]}
              </Button>
            );
          })}
        </div>

        {hasActiveFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push(pathname)}
          >
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
