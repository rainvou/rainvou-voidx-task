import { describe, it, expect } from "vitest";
import { hash, compare } from "bcryptjs";

describe("password hashing with bcryptjs", () => {
  it("should hash a password and produce a different string", async () => {
    const password = "mySecurePassword123";
    const hashed = await hash(password, 12);

    expect(hashed).not.toBe(password);
    expect(hashed).toBeDefined();
    expect(typeof hashed).toBe("string");
  });

  it("should verify a correct password against its hash", async () => {
    const password = "testPassword456!";
    const hashed = await hash(password, 12);

    const isValid = await compare(password, hashed);
    expect(isValid).toBe(true);
  });

  it("should reject an incorrect password against a hash", async () => {
    const password = "correctPassword";
    const wrongPassword = "wrongPassword";
    const hashed = await hash(password, 12);

    const isValid = await compare(wrongPassword, hashed);
    expect(isValid).toBe(false);
  });

  it("should generate different hashes for the same password", async () => {
    const password = "samePassword";
    const hash1 = await hash(password, 12);
    const hash2 = await hash(password, 12);

    expect(hash1).not.toBe(hash2);

    const isValid1 = await compare(password, hash1);
    const isValid2 = await compare(password, hash2);
    expect(isValid1).toBe(true);
    expect(isValid2).toBe(true);
  });
});
