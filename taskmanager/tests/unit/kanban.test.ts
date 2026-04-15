import { describe, it, expect } from "vitest";
import {
  isColumnAtCapacity,
  groupTasksByStatus,
  groupTasksByAssignee,
  getInitials,
  type KanbanTask,
} from "@/types/kanban";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTask(overrides: Partial<KanbanTask> & { id: string; statusId: string }): KanbanTask {
  return {
    taskKey: `PROJ-${overrides.id}`,
    title: `Task ${overrides.id}`,
    priority: "MEDIUM",
    assignee: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// isColumnAtCapacity
// ---------------------------------------------------------------------------

describe("isColumnAtCapacity", () => {
  it("returns false when no WIP limit is set (undefined)", () => {
    expect(isColumnAtCapacity(5, undefined)).toBe(false);
  });

  it("returns false when WIP limit is 0 (disabled)", () => {
    expect(isColumnAtCapacity(5, 0)).toBe(false);
  });

  it("returns false when WIP limit is negative (treated as disabled)", () => {
    expect(isColumnAtCapacity(5, -1)).toBe(false);
  });

  it("returns false when task count is below WIP limit", () => {
    expect(isColumnAtCapacity(2, 5)).toBe(false);
  });

  it("returns true when task count equals WIP limit", () => {
    expect(isColumnAtCapacity(5, 5)).toBe(true);
  });

  it("returns true when task count exceeds WIP limit", () => {
    expect(isColumnAtCapacity(6, 5)).toBe(true);
  });

  it("works correctly with WIP limit of 1", () => {
    expect(isColumnAtCapacity(0, 1)).toBe(false);
    expect(isColumnAtCapacity(1, 1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// groupTasksByStatus
// ---------------------------------------------------------------------------

describe("groupTasksByStatus", () => {
  it("returns an empty object for empty task list", () => {
    expect(groupTasksByStatus([])).toEqual({});
  });

  it("groups tasks by their statusId", () => {
    const tasks: KanbanTask[] = [
      makeTask({ id: "1", statusId: "todo" }),
      makeTask({ id: "2", statusId: "in-progress" }),
      makeTask({ id: "3", statusId: "todo" }),
      makeTask({ id: "4", statusId: "done" }),
    ];

    const grouped = groupTasksByStatus(tasks);

    expect(Object.keys(grouped)).toHaveLength(3);
    expect(grouped["todo"]).toHaveLength(2);
    expect(grouped["in-progress"]).toHaveLength(1);
    expect(grouped["done"]).toHaveLength(1);
  });

  it("preserves task order within each group", () => {
    const tasks: KanbanTask[] = [
      makeTask({ id: "1", statusId: "todo", title: "First" }),
      makeTask({ id: "2", statusId: "todo", title: "Second" }),
      makeTask({ id: "3", statusId: "todo", title: "Third" }),
    ];

    const grouped = groupTasksByStatus(tasks);

    expect(grouped["todo"].map((t) => t.title)).toEqual(["First", "Second", "Third"]);
  });

  it("handles single-task groups", () => {
    const tasks: KanbanTask[] = [
      makeTask({ id: "1", statusId: "a" }),
      makeTask({ id: "2", statusId: "b" }),
      makeTask({ id: "3", statusId: "c" }),
    ];

    const grouped = groupTasksByStatus(tasks);

    expect(Object.keys(grouped)).toHaveLength(3);
    expect(grouped["a"]).toHaveLength(1);
    expect(grouped["b"]).toHaveLength(1);
    expect(grouped["c"]).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// groupTasksByAssignee
// ---------------------------------------------------------------------------

describe("groupTasksByAssignee", () => {
  it("returns an empty object for empty task list", () => {
    expect(groupTasksByAssignee([])).toEqual({});
  });

  it("groups unassigned tasks under 'unassigned'", () => {
    const tasks: KanbanTask[] = [
      makeTask({ id: "1", statusId: "todo", assignee: null }),
      makeTask({ id: "2", statusId: "todo", assignee: null }),
    ];

    const grouped = groupTasksByAssignee(tasks);

    expect(Object.keys(grouped)).toEqual(["unassigned"]);
    expect(grouped["unassigned"]).toHaveLength(2);
  });

  it("groups tasks by assignee id", () => {
    const tasks: KanbanTask[] = [
      makeTask({
        id: "1",
        statusId: "todo",
        assignee: { id: "u1", name: "Alice", email: "alice@test.com" },
      }),
      makeTask({
        id: "2",
        statusId: "todo",
        assignee: { id: "u2", name: "Bob", email: "bob@test.com" },
      }),
      makeTask({
        id: "3",
        statusId: "done",
        assignee: { id: "u1", name: "Alice", email: "alice@test.com" },
      }),
    ];

    const grouped = groupTasksByAssignee(tasks);

    expect(Object.keys(grouped).sort()).toEqual(["u1", "u2"]);
    expect(grouped["u1"]).toHaveLength(2);
    expect(grouped["u2"]).toHaveLength(1);
  });

  it("mixes assigned and unassigned tasks correctly", () => {
    const tasks: KanbanTask[] = [
      makeTask({
        id: "1",
        statusId: "todo",
        assignee: { id: "u1", name: "Alice", email: "alice@test.com" },
      }),
      makeTask({ id: "2", statusId: "todo", assignee: null }),
      makeTask({
        id: "3",
        statusId: "done",
        assignee: { id: "u1", name: "Alice", email: "alice@test.com" },
      }),
    ];

    const grouped = groupTasksByAssignee(tasks);

    expect(Object.keys(grouped).sort()).toEqual(["u1", "unassigned"]);
    expect(grouped["u1"]).toHaveLength(2);
    expect(grouped["unassigned"]).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// getInitials
// ---------------------------------------------------------------------------

describe("getInitials", () => {
  it("returns first and last initials for full name", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("returns first two chars for single-word name", () => {
    expect(getInitials("Alice")).toBe("AL");
  });

  it("handles triple names by using first and last", () => {
    expect(getInitials("John Michael Doe")).toBe("JD");
  });

  it("falls back to email when name is null", () => {
    expect(getInitials(null, "alice@example.com")).toBe("AL");
  });

  it("returns ?? when both name and email are missing", () => {
    expect(getInitials(null)).toBe("??");
  });
});
