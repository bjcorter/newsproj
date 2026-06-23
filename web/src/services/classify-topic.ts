import type { Topic } from "../../../generated/prisma/client";

// Keyword rules for the 13 *scored* topics. MISCELLANEOUS has no keywords —
// it is assigned only when an article matches nothing else.
//
// Matching is case-insensitive and word-boundary aware, so "ai" will match
// "AI breakthrough" but NOT "rain" or "said".
const TOPIC_KEYWORDS: Record<Exclude<Topic, "MISCELLANEOUS">, string[]> = {
  POLITICS: [
    "election", "elections", "congress", "senate", "house of representatives",
    "president", "white house", "democrat", "democrats", "republican",
    "republicans", "governor", "legislation", "campaign", "ballot", "vote",
    "voters", "primary", "filibuster", "impeachment", "lawmaker", "lawmakers",
    "policy", "administration", "capitol",
  ],
  ECONOMY: [
    "inflation", "stock", "stocks", "market", "markets", "gdp", "jobs report",
    "tariff", "tariffs", "fed", "federal reserve", "interest rate",
    "interest rates", "unemployment", "recession", "economy", "economic",
    "trade", "earnings", "nasdaq", "dow jones", "wall street", "layoffs",
    "wages", "consumer prices",
  ],
  TECH: [
    "ai", "artificial intelligence", "software", "chip", "chips", "startup",
    "startups", "smartphone", "iphone", "android", "app", "gadget", "robot",
    "robotics", "semiconductor", "openai", "google", "microsoft", "apple",
    "nvidia", "cybersecurity", "data breach", "algorithm", "quantum",
  ],
  INTERNET: [
    "tiktok", "twitter", "social media", "influencer", "influencers", "meme",
    "memes", "viral", "reddit", "instagram", "facebook", "youtube", "streamer",
    "streaming", "online", "platform", "content creator", "hashtag",
    "subreddit", "moderation",
  ],
  SPORTS: [
    "nfl", "nba", "mlb", "nhl", "touchdown", "championship", "playoffs",
    "olympics", "world cup", "soccer", "football", "basketball", "baseball",
    "hockey", "tennis", "golf", "athlete", "athletes", "coach", "tournament",
    "match", "league", "super bowl", "world series", "stanley cup", "fifa",
    "uefa", "medal", "marathon", "quarterback", "playoff",
  ],
  WORLD: [
    "international", "foreign", "diplomacy", "diplomatic", "united nations",
    "european union", "summit", "embassy", "refugee", "refugees", "border",
    "global", "overseas", "ambassador", "sanctions", "treaty", "foreign policy",
  ],
  HEALTH: [
    "health", "medicine", "medical", "hospital", "hospitals", "fda", "vaccine",
    "vaccines", "disease", "outbreak", "pandemic", "cdc", "doctor", "doctors",
    "patient", "patients", "mental health", "drug", "ozempic", "cancer",
    "covid", "flu", "medicare", "medicaid", "insurance",
  ],
  SCIENCE: [
    "research", "researchers", "study", "scientists", "space", "nasa",
    "telescope", "galaxy", "physics", "biology", "chemistry", "discovery",
    "experiment", "archaeology", "fossil", "rocket", "satellite", "asteroid",
    "spacex", "particle", "genome", "dna",
  ],
  CLIMATE: [
    "climate", "global warming", "emissions", "carbon", "hurricane", "wildfire",
    "wildfires", "heat wave", "drought", "flood", "flooding", "renewable",
    "solar", "wind power", "fossil fuel", "epa", "pollution", "environment",
    "environmental", "greenhouse", "extinction",
  ],
  CULTURE: [
    "movie", "movies", "film", "music", "album", "celebrity", "celebrities",
    "hollywood", "oscars", "grammys", "actor", "actress", "singer", "concert",
    "tour", "netflix", "tv show", "festival", "fashion", "art", "book",
    "author", "entertainment",
  ],
  CRIME: [
    "police", "arrest", "arrested", "charged", "court", "trial", "lawsuit",
    "verdict", "jury", "prison", "sentenced", "homicide", "murder", "shooting",
    "fraud", "robbery", "investigation", "prosecutor", "defendant", "indicted",
    "felony",
  ],
  EDUCATION: [
    "school", "schools", "student", "students", "university", "universities",
    "college", "colleges", "tuition", "teacher", "teachers", "curriculum",
    "classroom", "campus", "professor", "scholarship", "student loan",
    "student loans", "sat", "graduation",
  ],
  DEFENSE: [
    "pentagon", "military", "troops", "nato", "missile", "missiles", "army",
    "navy", "air force", "marines", "defense", "warship", "drone", "weapon",
    "weapons", "soldier", "soldiers", "veteran", "veterans", "warfare",
    "deployment", "arsenal",
  ],
};

// Tie-breaker order applied when two or more topics share the highest score.
// Specific/narrow topics win over broad ones (e.g. DEFENSE beats POLITICS,
// WORLD is the most general and loses most ties).
const TOPIC_PRIORITY: Exclude<Topic, "MISCELLANEOUS">[] = [
  "DEFENSE",
  "CRIME",
  "SPORTS",
  "CLIMATE",
  "HEALTH",
  "SCIENCE",
  "EDUCATION",
  "TECH",
  "INTERNET",
  "ECONOMY",
  "CULTURE",
  "POLITICS",
  "WORLD",
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Pre-compile one word-boundary regex per keyword for performance and accuracy.
const COMPILED_RULES: { topic: Exclude<Topic, "MISCELLANEOUS">; patterns: RegExp[] }[] =
  TOPIC_PRIORITY.map((topic) => ({
    topic,
    patterns: TOPIC_KEYWORDS[topic].map(
      (kw) => new RegExp(`\\b${escapeRegExp(kw)}\\b`, "i")
    ),
  }));

export type TopicScore = { topic: Exclude<Topic, "MISCELLANEOUS">; score: number };

/**
 * Score every content topic by how many of its keywords appear in the article
 * text, returned highest-first. COMPILED_RULES is in priority order and the
 * sort is stable, so ties keep their priority order. MISCELLANEOUS is never
 * scored here (it is the absence of any match).
 */
export function scoreTopics(
  title: string,
  summary?: string | null
): TopicScore[] {
  const text = `${title} ${summary ?? ""}`.toLowerCase();

  const scores: TopicScore[] = COMPILED_RULES.map(({ topic, patterns }) => {
    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(text)) score++;
    }
    return { topic, score };
  });

  return scores.sort((a, b) => b.score - a.score);
}

/**
 * Pick the single best topic from a ranked score list. Returns MISCELLANEOUS
 * when nothing matched.
 */
export function topTopic(scores: TopicScore[]): Topic {
  const best = scores[0];
  return best && best.score > 0 ? best.topic : "MISCELLANEOUS";
}

/**
 * Whether the keyword scorer is unsure enough that an LLM should weigh in:
 * either almost nothing matched (best < 2, which includes the MISCELLANEOUS
 * case) or the top two topics are tied.
 */
export function isLowConfidence(scores: TopicScore[]): boolean {
  const best = scores[0]?.score ?? 0;
  const second = scores[1]?.score ?? 0;
  return best < 2 || best - second < 1;
}

/**
 * Classify an article into exactly one Topic based on keyword matches in its
 * title + summary. Highest score wins; ties break by TOPIC_PRIORITY; no match
 * yields MISCELLANEOUS.
 */
export function classifyTopic(title: string, summary?: string | null): Topic {
  return topTopic(scoreTopics(title, summary));
}
