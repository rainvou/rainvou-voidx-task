import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifyGitHubSignature } from "@/server/services/webhookService";
import { parseTaskKey } from "@/lib/taskKeyParser";

// ---------------------------------------------------------------------------
// Webhook signature verification
// ---------------------------------------------------------------------------
describe("verifyGitHubSignature", () => {
  const secret = "test-webhook-secret";
  const payload = JSON.stringify({ action: "opened" });

  function sign(body: string, key: string): string {
    const hmac = crypto.createHmac("sha256", key);
    hmac.update(body, "utf-8");
    return `sha256=${hmac.digest("hex")}`;
  }

  it("returns true for a valid signature", () => {
    const sig = sign(payload, secret);
    expect(verifyGitHubSignature(payload, sig, secret)).toBe(true);
  });

  it("returns false for an invalid signature", () => {
    expect(
      verifyGitHubSignature(payload, "sha256=invalid_hex", secret),
    ).toBe(false);
  });

  it("returns false when signature is empty", () => {
    expect(verifyGitHubSignature(payload, "", secret)).toBe(false);
  });

  it("returns false when secret is empty", () => {
    const sig = sign(payload, secret);
    expect(verifyGitHubSignature(payload, sig, "")).toBe(false);
  });

  it("returns false when payload differs", () => {
    const sig = sign(payload, secret);
    expect(
      verifyGitHubSignature('{"action":"closed"}', sig, secret),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Task key extraction from commit messages
// ---------------------------------------------------------------------------
describe("Task key extraction from commit messages", () => {
  it("extracts a single key from a conventional commit", () => {
    expect(parseTaskKey("fix(PROJ-99): resolve login bug")).toEqual([
      "PROJ-99",
    ]);
  });

  it("extracts multiple keys from a commit message", () => {
    expect(parseTaskKey("refs PROJ-1, DEV-42: combined fix")).toEqual([
      "PROJ-1",
      "DEV-42",
    ]);
  });

  it("returns empty array for messages without keys", () => {
    expect(parseTaskKey("chore: update dependencies")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Task key extraction from branch names
// ---------------------------------------------------------------------------
describe("Task key extraction from branch names", () => {
  it("extracts key from feature/PROJ-42 style branch", () => {
    expect(parseTaskKey("feature/PROJ-42")).toEqual(["PROJ-42"]);
  });

  it("extracts key from feature/PROJ-42-add-login style branch", () => {
    expect(parseTaskKey("feature/PROJ-42-add-login")).toEqual(["PROJ-42"]);
  });

  it("extracts key from fix/BUG-123-hotfix branch", () => {
    expect(parseTaskKey("fix/BUG-123-hotfix")).toEqual(["BUG-123"]);
  });

  it("extracts multiple keys from a branch name", () => {
    expect(parseTaskKey("feature/PROJ-1-PROJ-2")).toEqual([
      "PROJ-1",
      "PROJ-2",
    ]);
  });

  it("returns empty array for branches without keys", () => {
    expect(parseTaskKey("main")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Event type detection from headers
// ---------------------------------------------------------------------------
describe("Event type detection from headers", () => {
  it("detects push event from x-github-event header", () => {
    const headers = new Headers({ "x-github-event": "push" });
    const eventType = headers.get("x-github-event");
    expect(eventType).toBe("push");
  });

  it("detects pull_request event from x-github-event header", () => {
    const headers = new Headers({ "x-github-event": "pull_request" });
    const eventType = headers.get("x-github-event");
    expect(eventType).toBe("pull_request");
  });

  it("returns null when header is missing", () => {
    const headers = new Headers();
    const eventType = headers.get("x-github-event");
    expect(eventType).toBeNull();
  });

  it("handles ping event", () => {
    const headers = new Headers({ "x-github-event": "ping" });
    const eventType = headers.get("x-github-event");
    expect(eventType).toBe("ping");
  });
});
