import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseMentions } from "../../src/server/services/notificationService";

/* ================================================================== */
/*  Shared schemas (mirrors router definitions for unit testing)       */
/* ================================================================== */

const contentSchema = z
  .string()
  .min(1, "Comment must not be empty")
  .max(10_000, "Comment must be at most 10 000 characters");

const emojiSchema = z
  .string()
  .min(1, "Emoji must not be empty")
  .max(32, "Emoji value is too long")
  .regex(
    /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D]+$/u,
    "Invalid emoji character",
  );

/* ================================================================== */
/*  @mention parsing                                                   */
/* ================================================================== */

describe("parseMentions", () => {
  it("extracts a single mention", () => {
    expect(parseMentions("Hello @alice, how are you?")).toEqual(["alice"]);
  });

  it("extracts multiple distinct mentions", () => {
    expect(parseMentions("@alice @bob please review")).toEqual(["alice", "bob"]);
  });

  it("deduplicates repeated mentions", () => {
    expect(parseMentions("@alice @alice @alice")).toEqual(["alice"]);
  });

  it("handles mentions at the start of the string", () => {
    expect(parseMentions("@admin check this")).toEqual(["admin"]);
  });

  it("handles mentions at the end of the string", () => {
    expect(parseMentions("Please check @admin")).toEqual(["admin"]);
  });

  it("handles mention as the only content", () => {
    expect(parseMentions("@solo")).toEqual(["solo"]);
  });

  it("ignores email-like patterns", () => {
    expect(parseMentions("Send to user@example.com")).toEqual([]);
  });

  it("returns empty for content without mentions", () => {
    expect(parseMentions("No mentions here!")).toEqual([]);
  });

  it("returns empty for empty string", () => {
    expect(parseMentions("")).toEqual([]);
  });

  it("handles mention with underscores", () => {
    expect(parseMentions("Hi @john_doe!")).toEqual(["john_doe"]);
  });

  it("handles mention with digits", () => {
    expect(parseMentions("CC @user123")).toEqual(["user123"]);
  });

  it("handles mentions after newlines", () => {
    expect(parseMentions("Line one\n@bob line two")).toEqual(["bob"]);
  });

  it("handles mentions after punctuation", () => {
    expect(parseMentions("Done!@alice look")).toEqual(["alice"]);
  });

  it("limits username length to 39 characters", () => {
    const long39 = "a".repeat(39);
    const long40 = "a".repeat(40);
    expect(parseMentions(`@${long39} text`)).toEqual([long39]);
    // 40-char string should only match the first 39 characters
    const result = parseMentions(`@${long40} text`);
    expect(result.length).toBeLessThanOrEqual(1);
  });
});

/* ================================================================== */
/*  Comment content validation                                         */
/* ================================================================== */

describe("Comment content validation", () => {
  it("accepts valid content", () => {
    const result = contentSchema.safeParse("Hello world");
    expect(result.success).toBe(true);
  });

  it("rejects empty content", () => {
    const result = contentSchema.safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Comment must not be empty");
    }
  });

  it("rejects content exceeding 10000 characters", () => {
    const long = "x".repeat(10_001);
    const result = contentSchema.safeParse(long);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Comment must be at most 10 000 characters",
      );
    }
  });

  it("accepts content at exactly 10000 characters", () => {
    const exact = "x".repeat(10_000);
    const result = contentSchema.safeParse(exact);
    expect(result.success).toBe(true);
  });

  it("accepts content at exactly 1 character", () => {
    const result = contentSchema.safeParse("a");
    expect(result.success).toBe(true);
  });
});

/* ================================================================== */
/*  Emoji validation                                                   */
/* ================================================================== */

describe("Emoji validation", () => {
  it("accepts a single emoji", () => {
    expect(emojiSchema.safeParse("\u{1F44D}").success).toBe(true); // thumbs up
  });

  it("accepts heart emoji", () => {
    expect(emojiSchema.safeParse("\u{2764}\u{FE0F}").success).toBe(true);
  });

  it("accepts rocket emoji", () => {
    expect(emojiSchema.safeParse("\u{1F680}").success).toBe(true);
  });

  it("rejects empty string", () => {
    const result = emojiSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("rejects plain text", () => {
    const result = emojiSchema.safeParse("hello");
    expect(result.success).toBe(false);
  });

  it("rejects numbers", () => {
    const result = emojiSchema.safeParse("123");
    expect(result.success).toBe(false);
  });

  it("rejects special characters that are not emoji", () => {
    const result = emojiSchema.safeParse("@#$");
    expect(result.success).toBe(false);
  });
});
