import { describe, it, expect } from "vitest";
import { projectKeySchema } from "@/server/trpc/project";

describe("projectKeySchema", () => {
  it("accepts valid uppercase keys", () => {
    expect(projectKeySchema.safeParse("AB").success).toBe(true);
    expect(projectKeySchema.safeParse("PROJ").success).toBe(true);
    expect(projectKeySchema.safeParse("MYPROJECT1").success).toBe(true);
  });

  it("accepts keys with digits", () => {
    expect(projectKeySchema.safeParse("A1").success).toBe(true);
    expect(projectKeySchema.safeParse("P2P").success).toBe(true);
    expect(projectKeySchema.safeParse("TASK123").success).toBe(true);
  });

  it("accepts maximum length key (10 chars)", () => {
    expect(projectKeySchema.safeParse("ABCDEFGH12").success).toBe(true);
  });

  it("rejects keys shorter than 2 characters", () => {
    expect(projectKeySchema.safeParse("A").success).toBe(false);
    expect(projectKeySchema.safeParse("").success).toBe(false);
  });

  it("rejects keys longer than 10 characters", () => {
    expect(projectKeySchema.safeParse("ABCDEFGHIJK").success).toBe(false);
  });

  it("rejects lowercase letters", () => {
    expect(projectKeySchema.safeParse("proj").success).toBe(false);
    expect(projectKeySchema.safeParse("Proj").success).toBe(false);
    expect(projectKeySchema.safeParse("PROj").success).toBe(false);
  });

  it("rejects keys starting with a digit", () => {
    expect(projectKeySchema.safeParse("1A").success).toBe(false);
    expect(projectKeySchema.safeParse("123").success).toBe(false);
  });

  it("rejects keys with special characters", () => {
    expect(projectKeySchema.safeParse("PR-OJ").success).toBe(false);
    expect(projectKeySchema.safeParse("PR_OJ").success).toBe(false);
    expect(projectKeySchema.safeParse("PR OJ").success).toBe(false);
  });
});
