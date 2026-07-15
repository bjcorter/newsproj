import type { Topic } from "../../../generated/prisma/client";

// Keyword rules for the 13 *scored* topics. MISCELLANEOUS has no keywords —
// it is assigned only when an article matches nothing else.
//
// Matching is case-insensitive and word-boundary aware. Text is normalized so
// hyphenated headlines (heat-wave) match space-separated keywords (heat wave).
const TOPIC_KEYWORDS: Record<Exclude<Topic, "MISCELLANEOUS">, string[]> = {
  POLITICS: [
    "election", "elections", "congress", "senate", "house of representatives",
    "president", "presidential", "white house", "democrat", "democrats",
    "republican", "republicans", "governor", "legislation", "campaign", "ballot",
    "vote", "voters", "voting", "primary", "filibuster", "impeachment",
    "lawmaker", "lawmakers", "policy", "administration", "capitol", "gop",
    "biden", "trump", "speaker", "supreme court", "executive order",
  ],
  ECONOMY: [
    "inflation", "stock", "stocks", "market", "markets", "gdp", "jobs report",
    "tariff", "tariffs", "fed", "federal reserve", "interest rate",
    "interest rates", "unemployment", "recession", "economy", "economic",
    "trade", "earnings", "nasdaq", "dow jones", "wall street", "layoffs",
    "wages", "consumer prices", "bankruptcy", "retail sales", "housing market",
    "mortgage", "cryptocurrency", "bitcoin",
  ],
  TECH: [
    "ai", "artificial intelligence", "software", "chip", "chips", "startup",
    "startups", "smartphone", "iphone", "android", "app", "gadget", "robot",
    "robotics", "semiconductor", "openai", "google", "microsoft", "apple",
    "nvidia", "cybersecurity", "data breach", "algorithm", "quantum",
    "chatgpt", "meta", "amazon", "cloud computing", "automation",
  ],
  INTERNET: [
    "tiktok", "twitter", "x.com", "social media", "influencer", "influencers",
    "meme", "memes", "viral", "reddit", "instagram", "facebook", "youtube",
    "streamer", "streaming", "online", "platform", "content creator", "hashtag",
    "subreddit", "moderation", "discord", "twitch",
  ],
  SPORTS: [
    "nfl", "nba", "mlb", "nhl", "touchdown", "championship", "playoffs",
    "olympics", "olympic", "world cup", "soccer", "football", "basketball",
    "baseball", "hockey", "tennis", "golf", "athlete", "athletes", "coach",
    "tournament", "match", "league", "super bowl", "world series", "stanley cup",
    "fifa", "uefa", "medal", "marathon", "quarterback", "playoff", "draft pick",
  ],
  WORLD: [
    "international", "foreign", "diplomacy", "diplomatic", "united nations",
    "european union", "summit", "embassy", "refugee", "refugees", "border",
    "global", "overseas", "ambassador", "sanctions", "treaty", "foreign policy",
    "ukraine", "russia", "china", "israel", "gaza", "middle east", "nato",
    "humanitarian", "ceasefire",
  ],
  HEALTH: [
    "health", "medicine", "medical", "hospital", "hospitals", "fda", "vaccine",
    "vaccines", "disease", "outbreak", "pandemic", "cdc", "doctor", "doctors",
    "patient", "patients", "mental health", "drug", "ozempic", "cancer",
    "covid", "flu", "medicare", "medicaid", "insurance", "who", "virus",
    "symptoms", "treatment", "clinical trial", "pharmaceutical",
  ],
  SCIENCE: [
    "research", "researchers", "study", "scientists", "space", "nasa",
    "telescope", "galaxy", "physics", "biology", "chemistry", "discovery",
    "experiment", "archaeology", "fossil", "rocket", "satellite", "asteroid",
    "spacex", "particle", "genome", "dna", "laboratory", "peer reviewed",
  ],
  CLIMATE: [
    "climate", "global warming", "emissions", "carbon", "hurricane", "wildfire",
    "wildfires", "heat wave", "heatwave", "heatwaves", "drought", "flood",
    "flooding", "renewable", "solar", "wind power", "fossil fuel", "epa",
    "pollution", "environment", "environmental", "greenhouse", "extinction",
    "temperatures", "record high", "storm", "tornado", "blizzard", "el nino",
    "sea level", "deforestation",
  ],
  CULTURE: [
    "movie", "movies", "film", "music", "album", "celebrity", "celebrities",
    "hollywood", "oscars", "grammys", "actor", "actress", "singer", "concert",
    "tour", "netflix", "tv show", "festival", "fashion", "art", "book",
    "author", "entertainment", "broadway", "documentary", "streaming series",
  ],
  CRIME: [
    "police", "arrest", "arrested", "charged", "court", "trial", "lawsuit",
    "verdict", "jury", "prison", "sentenced", "homicide", "murder", "shooting",
    "fraud", "robbery", "investigation", "prosecutor", "defendant", "indicted",
    "felony", "stabbing", "kidnapping", "fbi", "doj",
  ],
  EDUCATION: [
    "school", "schools", "student", "students", "university", "universities",
    "college", "colleges", "tuition", "teacher", "teachers", "curriculum",
    "classroom", "campus", "professor", "scholarship", "student loan",
    "student loans", "sat", "graduation", "school board", "debt relief",
  ],
  DEFENSE: [
    "pentagon", "military", "troops", "nato", "missile", "missiles", "army",
    "navy", "air force", "marines", "defense", "warship", "drone", "weapon",
    "weapons", "soldier", "soldiers", "veteran", "veterans", "warfare",
    "deployment", "arsenal", "airstrike", "invasion", "armed forces",
  ],
};

// Tie-breaker order applied when two or more topics share the highest score.
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

/** Normalize headline + summary for matching (hyphens, underscores, spacing). */
function normalizeText(title: string, summary?: string | null): string {
  return `${title} ${summary ?? ""}`
    .toLowerCase()
    .replace(/[-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const COMPILED_RULES: { topic: Exclude<Topic, "MISCELLANEOUS">; patterns: RegExp[] }[] =
  TOPIC_PRIORITY.map((topic) => ({
    topic,
    patterns: TOPIC_KEYWORDS[topic].map(
      (kw) => new RegExp(`\\b${escapeRegExp(kw)}\\b`, "i")
    ),
  }));

/**
 * Classify an article into exactly one Topic based on keyword matches in its
 * title + summary. Highest score wins; ties break by TOPIC_PRIORITY; no match
 * yields MISCELLANEOUS.
 */
export function classifyTopic(
  title: string,
  summary?: string | null
): Topic {
  const text = normalizeText(title, summary);

  let bestTopic: Topic = "MISCELLANEOUS";
  let bestScore = 0;

  for (const { topic, patterns } of COMPILED_RULES) {
    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(text)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  }

  return bestTopic;
}
