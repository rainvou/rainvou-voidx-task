import { describe, it, expect, vi } from "vitest";

// Mock Prisma before importing aiService (which transitively imports @/lib/prisma)
vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

import {
  structuredTaskSchema,
  sanitizeInput,
  tokenize,
  jaccardSimilarity,
} from "@/server/services/aiService";

// ---------------------------------------------------------------------------
// Structured task output validation
// ---------------------------------------------------------------------------

describe("structuredTaskSchema", () => {
  const validTask = {
    title: "로그인 페이지 구현",
    description: "사용자가 이메일과 비밀번호로 로그인할 수 있는 페이지를 구현합니다",
    acceptanceCriteria: [
      "이메일 형식 검증이 동작해야 합니다",
      "비밀번호 최소 8자 검증이 포함되어야 합니다",
    ],
    labels: ["frontend", "auth"],
    priority: "HIGH" as const,
    estimatedPoints: 5,
  };

  it("accepts a valid structured task", () => {
    const result = structuredTaskSchema.safeParse(validTask);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("로그인 페이지 구현");
      expect(result.data.priority).toBe("HIGH");
      expect(result.data.estimatedPoints).toBe(5);
    }
  });

  it("accepts all valid priority values", () => {
    const priorities = ["URGENT", "HIGH", "MEDIUM", "LOW", "NONE"] as const;
    for (const priority of priorities) {
      const result = structuredTaskSchema.safeParse({ ...validTask, priority });
      expect(result.success).toBe(true);
    }
  });

  it("rejects empty title", () => {
    const result = structuredTaskSchema.safeParse({ ...validTask, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects title exceeding 500 characters", () => {
    const result = structuredTaskSchema.safeParse({
      ...validTask,
      title: "A".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty acceptanceCriteria array", () => {
    const result = structuredTaskSchema.safeParse({
      ...validTask,
      acceptanceCriteria: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects acceptanceCriteria with more than 20 items", () => {
    const result = structuredTaskSchema.safeParse({
      ...validTask,
      acceptanceCriteria: Array.from({ length: 21 }, (_, i) => `criteria-${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid priority value", () => {
    const result = structuredTaskSchema.safeParse({
      ...validTask,
      priority: "CRITICAL",
    });
    expect(result.success).toBe(false);
  });

  it("rejects estimatedPoints below 1", () => {
    const result = structuredTaskSchema.safeParse({
      ...validTask,
      estimatedPoints: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects estimatedPoints above 100", () => {
    const result = structuredTaskSchema.safeParse({
      ...validTask,
      estimatedPoints: 101,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer estimatedPoints", () => {
    const result = structuredTaskSchema.safeParse({
      ...validTask,
      estimatedPoints: 3.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects labels array with more than 10 items", () => {
    const result = structuredTaskSchema.safeParse({
      ...validTask,
      labels: Array.from({ length: 11 }, (_, i) => `label-${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = structuredTaskSchema.safeParse({
      title: "Only title",
    });
    expect(result.success).toBe(false);
  });

  it("rejects description exceeding 10000 characters", () => {
    const result = structuredTaskSchema.safeParse({
      ...validTask,
      description: "D".repeat(10001),
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Similarity score calculation (Jaccard)
// ---------------------------------------------------------------------------

describe("tokenize", () => {
  it("splits text into lowercase tokens", () => {
    const tokens = tokenize("Hello World");
    expect(tokens).toEqual(new Set(["hello", "world"]));
  });

  it("handles Korean text", () => {
    const tokens = tokenize("로그인 페이지 구현");
    expect(tokens).toEqual(new Set(["로그인", "페이지", "구현"]));
  });

  it("strips punctuation", () => {
    const tokens = tokenize("hello, world! (test)");
    expect(tokens).toEqual(new Set(["hello", "world", "test"]));
  });

  it("returns empty set for empty string", () => {
    expect(tokenize("").size).toBe(0);
  });

  it("deduplicates repeated words", () => {
    const tokens = tokenize("test test test");
    expect(tokens.size).toBe(1);
    expect(tokens.has("test")).toBe(true);
  });
});

describe("jaccardSimilarity", () => {
  it("returns 1 for identical strings", () => {
    expect(jaccardSimilarity("hello world", "hello world")).toBe(1);
  });

  it("returns 0 for completely different strings", () => {
    expect(jaccardSimilarity("hello world", "foo bar")).toBe(0);
  });

  it("returns value between 0 and 1 for partial overlap", () => {
    const score = jaccardSimilarity("login page", "login form");
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it("computes correct Jaccard for known overlap", () => {
    // "login page" = {login, page}
    // "login form page" = {login, form, page}
    // intersection = {login, page} = 2
    // union = {login, page, form} = 3
    // similarity = 2/3
    const score = jaccardSimilarity("login page", "login form page");
    expect(score).toBeCloseTo(2 / 3, 5);
  });

  it("returns 1 for two empty strings", () => {
    expect(jaccardSimilarity("", "")).toBe(1);
  });

  it("returns 0 when one string is empty", () => {
    expect(jaccardSimilarity("hello", "")).toBe(0);
    expect(jaccardSimilarity("", "world")).toBe(0);
  });

  it("is case insensitive", () => {
    expect(jaccardSimilarity("Hello World", "hello world")).toBe(1);
  });

  it("handles Korean text similarity", () => {
    const score = jaccardSimilarity(
      "로그인 페이지 구현",
      "로그인 페이지 디자인",
    );
    // {로그인, 페이지, 구현} vs {로그인, 페이지, 디자인}
    // intersection = 2, union = 4 => 0.5
    expect(score).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
// Natural language input sanitization
// ---------------------------------------------------------------------------

describe("sanitizeInput", () => {
  it("trims leading and trailing whitespace", () => {
    expect(sanitizeInput("  hello world  ")).toBe("hello world");
  });

  it("collapses multiple spaces into one", () => {
    expect(sanitizeInput("hello    world")).toBe("hello world");
  });

  it("replaces newlines with spaces", () => {
    expect(sanitizeInput("hello\nworld\r\nfoo")).toBe("hello world foo");
  });

  it("strips angle brackets", () => {
    expect(sanitizeInput("hello <script>alert</script> world")).toBe(
      "hello scriptalert/script world",
    );
  });

  it("strips backticks", () => {
    expect(sanitizeInput("hello `code` world")).toBe("hello code world");
  });

  it("caps length at 2000 characters", () => {
    const long = "A".repeat(3000);
    expect(sanitizeInput(long).length).toBe(2000);
  });

  it("returns empty string for whitespace-only input", () => {
    expect(sanitizeInput("   ")).toBe("");
  });

  it("handles mixed Korean and English", () => {
    const result = sanitizeInput("  로그인 페이지  구현하기  ");
    expect(result).toBe("로그인 페이지 구현하기");
  });
});
