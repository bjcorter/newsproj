import type { Topic } from "../../../generated/prisma/client";

// Ordered list of all topic enum values, used to populate filter dropdowns.
// Keep MISCELLANEOUS last since it is the catch-all bucket.
export const TOPIC_VALUES: Topic[] = [
  "POLITICS",
  "ECONOMY",
  "TECH",
  "INTERNET",
  "SPORTS",
  "WORLD",
  "HEALTH",
  "SCIENCE",
  "CLIMATE",
  "CULTURE",
  "CRIME",
  "EDUCATION",
  "DEFENSE",
  "MISCELLANEOUS",
];

// Human-readable labels for badges and dropdown options.
export const TOPIC_LABELS: Record<Topic, string> = {
  POLITICS: "Politics",
  ECONOMY: "Economy",
  TECH: "Tech",
  INTERNET: "Internet",
  SPORTS: "Sports",
  WORLD: "World",
  HEALTH: "Health",
  SCIENCE: "Science",
  CLIMATE: "Climate",
  CULTURE: "Culture",
  CRIME: "Crime",
  EDUCATION: "Education",
  DEFENSE: "Defense",
  MISCELLANEOUS: "Miscellaneous",
};

export function isTopic(value: string): value is Topic {
  return (TOPIC_VALUES as string[]).includes(value);
}
