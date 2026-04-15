import { describe, it, expect } from "vitest";
import { parseTaskKey } from "@/lib/taskKeyParser";

describe("parseTaskKey", () => {
  it("extracts task keys from commit messages", () => {
    expect(parseTaskKey("feat(PROJ-42): add login page")).toEqual(["PROJ-42"]);
  });

  it("extracts multiple task keys", () => {
    expect(parseTaskKey("fix PROJ-1 and PROJ-2 issues")).toEqual(["PROJ-1", "PROJ-2"]);
  });

  it("returns empty array when no keys found", () => {
    expect(parseTaskKey("just a regular message")).toEqual([]);
  });

  it("handles keys with multi-digit numbers", () => {
    expect(parseTaskKey("TASK-1234")).toEqual(["TASK-1234"]);
  });
});
