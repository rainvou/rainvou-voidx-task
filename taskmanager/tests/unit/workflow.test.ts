import { describe, it, expect } from "vitest";
import { DEFAULT_WORKFLOW_STATUSES, statusNameSchema } from "@/server/trpc/workflow.constants";

describe("DEFAULT_WORKFLOW_STATUSES", () => {
  it("contains exactly 4 statuses", () => {
    expect(DEFAULT_WORKFLOW_STATUSES).toHaveLength(4);
  });

  it("has exactly 1 isStart status", () => {
    const startStatuses = DEFAULT_WORKFLOW_STATUSES.filter((s) => s.isStart);
    expect(startStatuses).toHaveLength(1);
  });

  it("has exactly 1 isDone status", () => {
    const doneStatuses = DEFAULT_WORKFLOW_STATUSES.filter((s) => s.isDone);
    expect(doneStatuses).toHaveLength(1);
  });

  it("contains the expected status names", () => {
    const names = DEFAULT_WORKFLOW_STATUSES.map((s) => s.name);
    expect(names).toEqual(["Todo", "InProgress", "Review", "Done"]);
  });

  it("has sequential displayOrder values starting from 0", () => {
    const orders = DEFAULT_WORKFLOW_STATUSES.map((s) => s.displayOrder);
    expect(orders).toEqual([0, 1, 2, 3]);
  });
});

describe("status name validation", () => {
  it("rejects empty name", () => {
    const result = statusNameSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("accepts valid name", () => {
    const result = statusNameSchema.safeParse("In Progress");
    expect(result.success).toBe(true);
  });

  it("rejects name exceeding 50 characters", () => {
    const longName = "A".repeat(51);
    const result = statusNameSchema.safeParse(longName);
    expect(result.success).toBe(false);
  });

  it("accepts name with exactly 50 characters", () => {
    const name50 = "A".repeat(50);
    const result = statusNameSchema.safeParse(name50);
    expect(result.success).toBe(true);
  });
});
