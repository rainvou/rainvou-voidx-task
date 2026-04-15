import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export interface ApiKeyInfo {
  keyId: string;
  projectId: string;
  projectKey: string;
}

/**
 * Validate an API key from the Authorization header.
 *
 * Expected format: `Bearer tm_<hex>`
 *
 * Returns project info if the key is valid and active, or null otherwise.
 */
export async function validateApiKey(
  authHeader: string | null,
): Promise<ApiKeyInfo | null> {
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;

  const rawKey = parts[1];
  if (!rawKey || !rawKey.startsWith("tm_")) return null;

  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: {
      project: {
        select: { id: true, key: true },
      },
    },
  });

  if (!apiKey) return null;
  if (!apiKey.active) return null;

  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null;
  }

  return {
    keyId: apiKey.id,
    projectId: apiKey.project.id,
    projectKey: apiKey.project.key,
  };
}
