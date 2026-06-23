// Minimal Gemini client (no SDK dependency). Calls the Generative Language REST
// API for structured JSON output. Designed to fail soft: every error path
// returns null so callers can fall back to non-AI behavior. Used only at ingest
// time, never on the request path.

// gemini-2.0-flash was shut down 2026-06-01; override via GEMINI_MODEL if needed.
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const RETRYABLE = new Set([429, 503]);
const MAX_RETRIES = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Gemini's responseSchema is a subset of OpenAPI. Types are UPPERCASE strings.
export type GeminiSchema = {
  type: "STRING" | "NUMBER" | "INTEGER" | "BOOLEAN" | "ARRAY" | "OBJECT";
  enum?: string[];
  items?: GeminiSchema;
  properties?: Record<string, GeminiSchema>;
  required?: string[];
  nullable?: boolean;
};

/**
 * Send `prompt` to Gemini and parse the JSON response against `schema`.
 * Returns the parsed value, or null if the key is missing, the request fails,
 * times out, or the response can't be parsed.
 */
export async function generateJson<T>(
  prompt: string,
  schema: GeminiSchema,
  { timeoutMs = 60000 }: { timeoutMs?: number } = {}
): Promise<T | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        if (RETRYABLE.has(res.status) && attempt < MAX_RETRIES) {
          const delay = 1000 * 2 ** attempt;
          console.warn(
            `Gemini ${res.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
          );
          await sleep(delay);
          continue;
        }
        console.error(
          `Gemini request failed: ${res.status} ${res.statusText} ${body.slice(0, 600)}`
        );
        return null;
      }

      const data = await res.json();
      const text: string | undefined =
        data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return null;

      return JSON.parse(text) as T;
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        const delay = 1000 * 2 ** attempt;
        console.warn(`Gemini error, retrying in ${delay}ms:`, err);
        await sleep(delay);
        continue;
      }
      console.error("Gemini request error:", err);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}
