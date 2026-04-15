import { describe, it, expect } from "vitest";
import crypto from "crypto";
import {
  calculateBurndown,
  calculateVelocity,
  type BurndownTask,
  type SprintData,
} from "@/lib/dashboardUtils";
import { generateApiKey, hashApiKey } from "@/server/trpc/apikey";

// ===========================================================================
// calculateBurndown
// ===========================================================================

describe("calculateBurndown", () => {
  it("returns empty array when end <= start", () => {
    const tasks: BurndownTask[] = [
      { id: "1", statusIsDone: false, storyPoints: 5 },
    ];
    const result = calculateBurndown(tasks, "2026-04-10", "2026-04-10");
    expect(result).toEqual([]);
  });

  it("returns correct points for empty task list", () => {
    const result = calculateBurndown([], "2026-04-01", "2026-04-03");
    expect(result).toHaveLength(3); // 3 days inclusive
    // All ideal and actual values should be 0
    for (const point of result) {
      expect(point.ideal).toBe(0);
      expect(point.actual).toBe(0);
    }
  });

  it("calculates ideal as linear decrease from total to 0", () => {
    const tasks: BurndownTask[] = [
      { id: "1", statusIsDone: false, storyPoints: 10 },
    ];
    const result = calculateBurndown(tasks, "2026-04-01", "2026-04-05");

    // Apr 1-5 inclusive = 5 data points (4-day span)
    expect(result).toHaveLength(5);
    expect(result[0].ideal).toBe(10);
    expect(result[result.length - 1].ideal).toBe(0);

    // Should be monotonically decreasing
    for (let i = 1; i < result.length; i++) {
      expect(result[i].ideal).toBeLessThanOrEqual(result[i - 1].ideal);
    }
  });

  it("tracks actual progress when tasks are completed mid-sprint", () => {
    const tasks: BurndownTask[] = [
      { id: "1", statusIsDone: true, completedAt: "2026-04-02", storyPoints: 3 },
      { id: "2", statusIsDone: true, completedAt: "2026-04-04", storyPoints: 2 },
      { id: "3", statusIsDone: false, storyPoints: 5 },
    ];

    const result = calculateBurndown(tasks, "2026-04-01", "2026-04-05");

    // Total is 10, first day actual = 10 (nothing done yet)
    expect(result[0].actual).toBe(10);

    // After April 2 (index 1): 10 - 3 = 7
    expect(result[1].actual).toBe(7);

    // After April 4 (index 3): 7 - 2 = 5
    expect(result[3].actual).toBe(5);

    // End of sprint: 5 remains
    expect(result[result.length - 1].actual).toBe(5);
  });

  it("handles all tasks done", () => {
    const tasks: BurndownTask[] = [
      { id: "1", statusIsDone: true, completedAt: "2026-04-02", storyPoints: 3 },
      { id: "2", statusIsDone: true, completedAt: "2026-04-03", storyPoints: 2 },
    ];

    const result = calculateBurndown(tasks, "2026-04-01", "2026-04-04");

    // Last point actual should be 0
    expect(result[result.length - 1].actual).toBe(0);
  });

  it("defaults to 1 story point when storyPoints is undefined", () => {
    const tasks: BurndownTask[] = [
      { id: "1", statusIsDone: false },
      { id: "2", statusIsDone: true, completedAt: "2026-04-02" },
    ];

    const result = calculateBurndown(tasks, "2026-04-01", "2026-04-03");

    // Total should be 2 (1 per task)
    expect(result[0].actual).toBe(2);
    // After task 2 completes on Apr 2 (index 1), actual = 1
    expect(result[1].actual).toBe(1);
  });

  it("generates dates in YYYY-MM-DD format", () => {
    const result = calculateBurndown([], "2026-04-01", "2026-04-03");
    expect(result[0].date).toBe("2026-04-01");
    expect(result[1].date).toBe("2026-04-02");
    expect(result[2].date).toBe("2026-04-03");
  });
});

// ===========================================================================
// calculateVelocity
// ===========================================================================

describe("calculateVelocity", () => {
  it("returns empty array for empty sprint list", () => {
    expect(calculateVelocity([])).toEqual([]);
  });

  it("computes running average correctly", () => {
    const sprints: SprintData[] = [
      { sprintName: "S1", completedPoints: 10 },
      { sprintName: "S2", completedPoints: 20 },
      { sprintName: "S3", completedPoints: 30 },
    ];

    const result = calculateVelocity(sprints);

    expect(result).toHaveLength(3);
    expect(result[0].average).toBe(10);       // 10/1
    expect(result[1].average).toBe(15);       // 30/2
    expect(result[2].average).toBe(20);       // 60/3
  });

  it("preserves sprint names and completed points", () => {
    const sprints: SprintData[] = [
      { sprintName: "Sprint Alpha", completedPoints: 7 },
      { sprintName: "Sprint Beta", completedPoints: 14 },
    ];

    const result = calculateVelocity(sprints);

    expect(result[0].sprintName).toBe("Sprint Alpha");
    expect(result[0].completed).toBe(7);
    expect(result[1].sprintName).toBe("Sprint Beta");
    expect(result[1].completed).toBe(14);
  });

  it("handles single sprint", () => {
    const sprints: SprintData[] = [
      { sprintName: "S1", completedPoints: 42 },
    ];

    const result = calculateVelocity(sprints);

    expect(result).toHaveLength(1);
    expect(result[0].completed).toBe(42);
    expect(result[0].average).toBe(42);
  });

  it("shows trend when velocity increases", () => {
    const sprints: SprintData[] = [
      { sprintName: "S1", completedPoints: 10 },
      { sprintName: "S2", completedPoints: 15 },
      { sprintName: "S3", completedPoints: 20 },
      { sprintName: "S4", completedPoints: 25 },
    ];

    const result = calculateVelocity(sprints);

    // Average should be increasing
    for (let i = 1; i < result.length; i++) {
      expect(result[i].average).toBeGreaterThan(result[i - 1].average);
    }
  });

  it("rounds average to two decimal places", () => {
    const sprints: SprintData[] = [
      { sprintName: "S1", completedPoints: 10 },
      { sprintName: "S2", completedPoints: 11 },
      { sprintName: "S3", completedPoints: 10 },
    ];

    const result = calculateVelocity(sprints);

    // 31 / 3 = 10.333...
    expect(result[2].average).toBe(10.33);
  });
});

// ===========================================================================
// API Key hash generation
// ===========================================================================

describe("API key hash generation", () => {
  it("generateApiKey returns a string starting with tm_", () => {
    const key = generateApiKey();
    expect(key).toMatch(/^tm_[0-9a-f]{64}$/);
  });

  it("generateApiKey produces unique keys", () => {
    const keys = new Set(Array.from({ length: 20 }, () => generateApiKey()));
    expect(keys.size).toBe(20);
  });

  it("hashApiKey is deterministic", () => {
    const key = "tm_abcdef1234567890";
    const hash1 = hashApiKey(key);
    const hash2 = hashApiKey(key);
    expect(hash1).toBe(hash2);
  });

  it("hashApiKey produces different hashes for different keys", () => {
    const hash1 = hashApiKey("tm_key_one");
    const hash2 = hashApiKey("tm_key_two");
    expect(hash1).not.toBe(hash2);
  });

  it("hashApiKey produces a valid SHA-256 hex string", () => {
    const hash = hashApiKey("tm_testkey");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hashApiKey matches Node.js crypto directly", () => {
    const key = "tm_directcompare";
    const expected = crypto.createHash("sha256").update(key).digest("hex");
    expect(hashApiKey(key)).toBe(expected);
  });
});
