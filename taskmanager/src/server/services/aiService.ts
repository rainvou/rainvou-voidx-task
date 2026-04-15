import { z } from "zod";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Structured task schema — validates AI-generated JSON
// ---------------------------------------------------------------------------

export const structuredTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000),
  acceptanceCriteria: z.array(z.string()).min(1).max(20),
  labels: z.array(z.string()).max(10),
  priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW", "NONE"]),
  estimatedPoints: z.number().int().min(1).max(100),
});

export type StructuredTask = z.infer<typeof structuredTaskSchema>;

// ---------------------------------------------------------------------------
// Anthropic API interface (mock when ANTHROPIC_API_KEY is absent)
// ---------------------------------------------------------------------------

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

interface AnthropicResponse {
  content: Array<{ type: "text"; text: string }>;
}

interface AnthropicClient {
  createMessage(params: {
    model: string;
    max_tokens: number;
    system: string;
    messages: AnthropicMessage[];
  }): Promise<AnthropicResponse>;
}

/**
 * Build an Anthropic client.
 * Returns a mock client when ANTHROPIC_API_KEY is not set.
 */
function getAnthropicClient(): AnthropicClient {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Mock client — returns deterministic structured JSON
    return {
      async createMessage({ messages }) {
        const userInput =
          messages.find((m) => m.role === "user")?.content ?? "";
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                title: sanitizeInput(userInput).slice(0, 100) || "새 태스크",
                description: `자동 생성된 태스크: ${sanitizeInput(userInput)}`,
                acceptanceCriteria: [
                  "기능이 정상 동작해야 합니다",
                  "테스트 코드가 포함되어야 합니다",
                ],
                labels: ["auto-generated"],
                priority: "MEDIUM",
                estimatedPoints: 3,
              }),
            },
          ],
        };
      },
    };
  }

  // Real client — wraps fetch calls to the Anthropic API
  return {
    async createMessage(params) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: params.model,
          max_tokens: params.max_tokens,
          system: params.system,
          messages: params.messages,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Anthropic API error (${res.status}): ${body}`);
      }

      return res.json() as Promise<AnthropicResponse>;
    },
  };
}

// ---------------------------------------------------------------------------
// Input sanitization
// ---------------------------------------------------------------------------

/**
 * Sanitise raw user input:
 * - trim whitespace
 * - collapse repeated whitespace / newlines
 * - strip characters that could break JSON / prompt injection (angle brackets, backticks)
 * - cap length to 2000 chars
 */
export function sanitizeInput(raw: string): string {
  return raw
    .trim()
    .replace(/[\r\n]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/[<>`]/g, "")
    .slice(0, 2000);
}

// ---------------------------------------------------------------------------
// Similarity utilities (Jaccard-like token overlap)
// ---------------------------------------------------------------------------

/**
 * Tokenise a string into a Set of lowercased word tokens.
 */
export function tokenize(text: string): Set<string> {
  const normalized = text.toLowerCase().replace(/[^a-z0-9가-힣\s]/g, " ");
  const words = normalized.split(/\s+/).filter((w) => w.length > 0);
  return new Set(words);
}

/**
 * Compute Jaccard similarity (|A ∩ B| / |A ∪ B|) between two strings.
 * Returns a number between 0 and 1.
 */
export function jaccardSimilarity(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);

  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a project management AI assistant. Convert the user's natural language description into a structured task JSON object.

The JSON must have exactly these fields:
- title (string, concise task title, max 100 chars)
- description (string, detailed description)
- acceptanceCriteria (array of strings, each describing a concrete acceptance criterion)
- labels (array of strings, relevant category labels)
- priority ("URGENT" | "HIGH" | "MEDIUM" | "LOW" | "NONE")
- estimatedPoints (integer 1-100, story point estimate)

Respond ONLY with valid JSON. No markdown, no explanation.`;

/**
 * Convert natural language input into a structured task using Claude AI.
 */
export async function generateStructuredTask(
  input: string,
  _projectId: string,
): Promise<StructuredTask> {
  const sanitized = sanitizeInput(input);

  if (sanitized.length === 0) {
    throw new Error("입력이 비어 있습니다");
  }

  const client = getAnthropicClient();

  const response = await client.createMessage({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: sanitized }],
  });

  const rawText = response.content[0]?.text ?? "";

  // Parse the JSON from the response
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error("AI 응답을 JSON으로 파싱할 수 없습니다");
  }

  // Validate with zod
  const result = structuredTaskSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `AI 응답 검증 실패: ${result.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  return result.data;
}

/**
 * Find existing tasks similar to the given title/description.
 * Uses SQL LIKE for basic matching (pg_trgm-ready for future upgrade).
 */
export async function findSimilarTasks(
  title: string,
  description: string,
  projectId: string,
): Promise<
  Array<{
    id: string;
    taskKey: string;
    title: string;
    description: string | null;
    similarity: number;
  }>
> {
  const sanitizedTitle = sanitizeInput(title);
  const sanitizedDesc = sanitizeInput(description);

  if (sanitizedTitle.length === 0) {
    return [];
  }

  // Build LIKE search terms from title words
  const titleWords = sanitizedTitle
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .slice(0, 10);

  if (titleWords.length === 0) {
    return [];
  }

  // Search using Prisma — OR across title words
  const candidates = await prisma.task.findMany({
    where: {
      projectId,
      OR: titleWords.map((word) => ({
        title: { contains: word, mode: "insensitive" as const },
      })),
    },
    select: {
      id: true,
      taskKey: true,
      title: true,
      description: true,
    },
    take: 20,
  });

  // Compute Jaccard similarity and filter
  const queryText = `${sanitizedTitle} ${sanitizedDesc}`;
  const SIMILARITY_THRESHOLD = 0.15;

  interface CandidateWithScore {
    id: string;
    taskKey: string;
    title: string;
    description: string | null;
    similarity: number;
  }

  const scored: CandidateWithScore[] = candidates.map(
    (task: { id: string; taskKey: string; title: string; description: string | null }) => {
      const taskText = `${task.title} ${task.description ?? ""}`;
      const similarity = jaccardSimilarity(queryText, taskText);
      return { ...task, similarity: Math.round(similarity * 100) / 100 };
    },
  );

  const results = scored
    .filter((task: CandidateWithScore) => task.similarity >= SIMILARITY_THRESHOLD)
    .sort((a: CandidateWithScore, b: CandidateWithScore) => b.similarity - a.similarity)
    .slice(0, 10);

  return results;
}
