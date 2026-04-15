import { describe, it, expect } from "vitest";
import {
  taskTitleSchema,
  prioritySchema,
  taskTypeSchema,
  taskFilterSchema,
  dependencyTypeSchema,
} from "@/server/trpc/task";

describe("taskTitleSchema", () => {
  it("accepts a valid title", () => {
    expect(taskTitleSchema.safeParse("로그인 페이지 구현").success).toBe(true);
  });

  it("accepts a title with exactly 1 character", () => {
    expect(taskTitleSchema.safeParse("A").success).toBe(true);
  });

  it("accepts a title with exactly 500 characters", () => {
    const title500 = "A".repeat(500);
    expect(taskTitleSchema.safeParse(title500).success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = taskTitleSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("rejects a title exceeding 500 characters", () => {
    const title501 = "A".repeat(501);
    const result = taskTitleSchema.safeParse(title501);
    expect(result.success).toBe(false);
  });
});

describe("prioritySchema", () => {
  it("accepts all valid priority values", () => {
    const validPriorities = ["URGENT", "HIGH", "MEDIUM", "LOW", "NONE"];
    for (const priority of validPriorities) {
      expect(prioritySchema.safeParse(priority).success).toBe(true);
    }
  });

  it("rejects invalid priority value", () => {
    expect(prioritySchema.safeParse("CRITICAL").success).toBe(false);
    expect(prioritySchema.safeParse("").success).toBe(false);
    expect(prioritySchema.safeParse("medium").success).toBe(false);
  });
});

describe("taskTypeSchema", () => {
  it("accepts all valid task type values", () => {
    const validTypes = ["EPIC", "STORY", "SUBTASK"];
    for (const type of validTypes) {
      expect(taskTypeSchema.safeParse(type).success).toBe(true);
    }
  });

  it("rejects invalid task type value", () => {
    expect(taskTypeSchema.safeParse("BUG").success).toBe(false);
    expect(taskTypeSchema.safeParse("").success).toBe(false);
    expect(taskTypeSchema.safeParse("epic").success).toBe(false);
  });
});

describe("taskFilterSchema", () => {
  it("accepts minimal valid filter (projectId only)", () => {
    const result = taskFilterSchema.safeParse({ projectId: "proj-123" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.sortBy).toBe("createdAt");
      expect(result.data.sortOrder).toBe("desc");
    }
  });

  it("accepts full filter with all fields", () => {
    const result = taskFilterSchema.safeParse({
      projectId: "proj-123",
      statusId: "status-1",
      assigneeId: "user-1",
      priority: "HIGH",
      type: "STORY",
      parentId: null,
      page: 2,
      limit: 50,
      sortBy: "priority",
      sortOrder: "asc",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing projectId", () => {
    const result = taskFilterSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects page less than 1", () => {
    const result = taskFilterSchema.safeParse({ projectId: "p", page: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects limit greater than 100", () => {
    const result = taskFilterSchema.safeParse({ projectId: "p", limit: 101 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid sortBy value", () => {
    const result = taskFilterSchema.safeParse({ projectId: "p", sortBy: "name" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid sortOrder value", () => {
    const result = taskFilterSchema.safeParse({ projectId: "p", sortOrder: "random" });
    expect(result.success).toBe(false);
  });

  it("accepts null parentId for top-level tasks", () => {
    const result = taskFilterSchema.safeParse({ projectId: "p", parentId: null });
    expect(result.success).toBe(true);
  });
});

describe("dependencyTypeSchema", () => {
  it("accepts BLOCKS", () => {
    expect(dependencyTypeSchema.safeParse("BLOCKS").success).toBe(true);
  });

  it("accepts RELATES_TO", () => {
    expect(dependencyTypeSchema.safeParse("RELATES_TO").success).toBe(true);
  });

  it("rejects invalid dependency type", () => {
    expect(dependencyTypeSchema.safeParse("BLOCKED_BY").success).toBe(false);
    expect(dependencyTypeSchema.safeParse("").success).toBe(false);
  });
});
