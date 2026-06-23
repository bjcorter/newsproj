import type { Topic } from "../../../generated/prisma/client";
import { TOPIC_VALUES, TOPIC_LABELS, isTopic } from "../lib/topics";
import { generateJson, type GeminiSchema } from "../lib/gemini";

// Relative imports (not "@/..") so the standalone tsx scripts that import the
// ingest pipeline resolve these the same way Next.js does.

const TOPIC_BATCH_SIZE = 20;

export type AiClassifyItem = {
  id: string; // stable key (we use the article URL during ingest)
  title: string;
  summary: string | null;
};

const aiTopics = TOPIC_VALUES.filter((t) => t !== "MISCELLANEOUS");

const topicSchema: GeminiSchema = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      id: { type: "STRING" },
      topic: { type: "STRING", enum: aiTopics },
    },
    required: ["id", "topic"],
  },
};

function truncate(text: string | null, max = 240): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/**
 * Ask Gemini to assign a Topic to each item, in batches to limit API calls.
 * Returns a Map of id -> Topic for the items it could confidently classify;
 * callers should fall back to their keyword topic for any id not present.
 * Never throws — a failed batch simply contributes nothing to the map.
 */
export async function aiClassifyTopics(
  items: AiClassifyItem[]
): Promise<Map<string, Topic>> {
  const result = new Map<string, Topic>();
  if (!items.length) return result;

  const topicList = aiTopics
    .map((t) => `${t} (${TOPIC_LABELS[t]})`)
    .join(", ");

  for (let i = 0; i < items.length; i += TOPIC_BATCH_SIZE) {
    const batch = items.slice(i, i + TOPIC_BATCH_SIZE);
    const lines = batch
      .map(
        (item) =>
          `- id: ${item.id}\n  headline: ${item.title}\n  summary: ${truncate(item.summary)}`
      )
      .join("\n");

    const prompt = `You are a news desk editor. Assign each article below to exactly one topic from this list: ${topicList}.
Choose the single best fit based on the headline and summary. Respond with one entry per article using its exact id.

Articles:
${lines}`;

    const data = await generateJson<{ id: string; topic: string }[]>(
      prompt,
      topicSchema
    );
    if (!data) continue;

    for (const entry of data) {
      if (entry && isTopic(entry.topic) && entry.topic !== "MISCELLANEOUS") {
        result.set(entry.id, entry.topic);
      }
    }

    // Pace batch calls to avoid tripping RPM / overload 503s on free/busy tiers.
    if (i + TOPIC_BATCH_SIZE < items.length) {
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  return result;
}

export type TopStoryCandidate = {
  id: string;
  title: string;
  summary: string | null;
  source: string;
};

const topStorySchema: GeminiSchema = {
  type: "OBJECT",
  properties: { id: { type: "STRING" } },
  required: ["id"],
};

/**
 * Ask Gemini to pick the single most newsworthy "story of the day" from the
 * candidates. Returns the chosen id (validated against the candidate set), or
 * null on any failure or invalid response.
 */
export async function aiPickTopStory(
  candidates: TopStoryCandidate[]
): Promise<string | null> {
  if (!candidates.length) return null;

  const lines = candidates
    .map(
      (c) =>
        `- id: ${c.id}\n  source: ${c.source}\n  headline: ${c.title}\n  summary: ${truncate(c.summary)}`
    )
    .join("\n");

  const prompt = `You are the editor-in-chief choosing the lead "story of the day" for a general-audience newspaper.
Pick the single most significant, newsworthy story from the list below — prioritize broad impact and importance over novelty. Respond with only the id of your choice.

Candidates:
${lines}`;

  const data = await generateJson<{ id: string }>(prompt, topStorySchema);
  if (!data?.id) return null;

  return candidates.some((c) => c.id === data.id) ? data.id : null;
}
